using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Domain.Purchase;

namespace Emart.Application.Services;

public class CartService : ICartService
{
    private readonly ICartRepository _cartRepository;
    private readonly ICartItemRepository _cartItemRepository;
    private readonly IProductRepository _productRepository;
    private readonly IEmcardReservationRepository _reservationRepository;
    private readonly IEmcardAccountRepository _emcardAccountRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEmcardService _emcardService;
    private readonly PurchaseDecisionEngine _purchaseEngine;

    public CartService(
        ICartRepository cartRepository,
        ICartItemRepository cartItemRepository,
        IProductRepository productRepository,
        IEmcardReservationRepository reservationRepository,
        IEmcardAccountRepository emcardAccountRepository,
        IUserRepository userRepository,
        IEmcardService emcardService,
        PurchaseDecisionEngine purchaseEngine)
    {
        _cartRepository = cartRepository;
        _cartItemRepository = cartItemRepository;
        _productRepository = productRepository;
        _reservationRepository = reservationRepository;
        _emcardAccountRepository = emcardAccountRepository;
        _userRepository = userRepository;
        _emcardService = emcardService;
        _purchaseEngine = purchaseEngine;
    }

    public async Task<CartResponseDTO> GetCartAsync(long userId, CancellationToken ct = default)
    {
        var cart = await GetOrCreateCartAsync(userId, ct);
        return await BuildCartResponseAsync(cart, ct);
    }

    public async Task<CartResponseDTO> AddItemAsync(long userId, long productId, int? quantity, CancellationToken ct = default)
    {
        var cart = await GetOrCreateCartAsync(userId, ct);

        var product = await _productRepository.GetByIdAsync(productId, ct)
            ?? throw new ResourceNotFoundException($"Product not found with id: {productId}");

        var qtyToAdd = quantity is null or < 1 ? 1 : quantity.Value;

        var existing = await _cartItemRepository.FindByCartIdAndProductIdAsync(cart.CartId, productId, ct);

        if (existing is not null)
        {
            existing.Quantity += qtyToAdd;
            _cartItemRepository.Update(existing);
        }
        else
        {
            await _cartItemRepository.AddAsync(new CartItem(cart, product, qtyToAdd), ct);
        }

        await _cartItemRepository.SaveChangesAsync(ct);

        return await BuildCartResponseAsync(cart, ct);
    }

    public async Task<CartResponseDTO> UpdateItemQuantityAsync(long userId, long cartItemId, int? quantity, CancellationToken ct = default)
    {
        var cart = await GetOrCreateCartAsync(userId, ct);

        var item = await _cartItemRepository.FindByCartItemIdAndCartIdAsync(cartItemId, cart.CartId, ct)
            ?? throw new ResourceNotFoundException($"Cart item not found with id: {cartItemId}");

        if (quantity is null or <= 0)
        {
            var productId = item.ProductId;
            _cartItemRepository.Remove(item);
            await _cartItemRepository.SaveChangesAsync(ct);

            // Dropping a line out of the cart makes any EMCard selection on it meaningless too.
            await _emcardService.ReleaseAsync(userId, productId, ct);
        }
        else
        {
            var oldQuantity = item.Quantity;
            item.Quantity = quantity.Value;
            _cartItemRepository.Update(item);
            await _cartItemRepository.SaveChangesAsync(ct);

            // Shrinking the line can leave an existing EMCard reservation covering more units
            // than now exist - clamp it down to the new quantity so the reserved balance never
            // overstates what this line could actually redeem.
            if (quantity.Value < oldQuantity)
            {
                var reservation = await _reservationRepository.FindByUserIdAndProductIdAsync(userId, item.ProductId, ct);
                if (reservation is not null)
                {
                    var emcardQuantity = _purchaseEngine.ResolveEmcardQuantity(item.Product, oldQuantity, reservation);
                    if (emcardQuantity > quantity.Value)
                    {
                        await _emcardService.ReserveAsync(userId, item.ProductId, quantity.Value, ct);
                    }
                }
            }
        }

        return await BuildCartResponseAsync(cart, ct);
    }

    public Task<CartResponseDTO> RemoveItemAsync(long userId, long cartItemId, CancellationToken ct = default) =>
        UpdateItemQuantityAsync(userId, cartItemId, 0, ct);

    public async Task<CartResponseDTO> ClearCartAsync(long userId, CancellationToken ct = default)
    {
        var cart = await GetOrCreateCartAsync(userId, ct);

        await _cartItemRepository.DeleteByCartIdAsync(cart.CartId, ct);
        await _emcardService.ReleaseAllAsync(userId, ct);

        return await BuildCartResponseAsync(cart, ct);
    }

    private async Task<Cart> GetOrCreateCartAsync(long userId, CancellationToken ct)
    {
        var cart = await _cartRepository.FindByUserIdAsync(userId, ct);
        if (cart is not null)
        {
            return cart;
        }

        var now = DateTime.UtcNow;
        var newCart = new Cart(userId) { CreatedAt = now, UpdatedAt = now };
        var saved = await _cartRepository.AddAsync(newCart, ct);
        await _cartRepository.SaveChangesAsync(ct);
        return saved;
    }

    /// <summary>
    /// Builds the cart response entirely from ONE PurchaseDecisionEngine.DecideCart result. Every
    /// line is decided independently (a single cart can mix all four purchase modes), then the
    /// totals are aggregated - and the exact same call is made by OrderService.Checkout, so what
    /// the cart shows and what the till charges cannot diverge.
    /// </summary>
    private async Task<CartResponseDTO> BuildCartResponseAsync(Cart cart, CancellationToken ct)
    {
        var userId = cart.UserId;

        var items = await _cartItemRepository.FindByCartIdAsync(cart.CartId, ct);

        var emcardMember = await IsEmcardMemberAsync(userId, ct);
        var openingBalance = await PointsBalanceAsync(userId, ct);

        // A reservation row is the opt-in marker for this product. How many of the line's units
        // it actually covers is derived from PointsReserved, not just row existence - see
        // PurchaseDecisionEngine.ResolveEmcardQuantity - so a line can mix EMCard-priced and
        // normally-priced quantities instead of being all-or-nothing.
        var reservationsByProduct = (await _reservationRepository.FindByUserIdAsync(userId, ct))
            .ToDictionary(r => r.ProductId);

        var lines = items
            .Select(item =>
            {
                reservationsByProduct.TryGetValue(item.ProductId, out var reservation);
                var emcardQuantity = _purchaseEngine.ResolveEmcardQuantity(item.Product, item.Quantity, reservation);
                return new PurchaseDecisionEngine.CartLine(item.Product, item.Quantity, emcardQuantity > 0, emcardQuantity);
            })
            .ToList();

        var decision = _purchaseEngine.DecideCart(lines, emcardMember, openingBalance);

        var itemDtos = new List<CartItemResponseDTO>();
        var itemCount = 0;

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var product = item.Product;
            var line = decision.Lines[i];

            var dto = new CartItemResponseDTO
            {
                CartItemId = item.CartItemId,
                ProductId = product.ProductId,
                ProductName = product.ProductName,
                ProductImagePath = product.ProductImagePath,
                Brand = product.Brand,
                MrpPrice = product.MrpPrice,
                CardholderPrice = product.CardholderPrice,
                Quantity = item.Quantity,
                EmcardApplied = line.EmcardApplied,
                // Blended average per unit for callers that only want a single display price
                // (e.g. an un-mixed line, which is the common case and equals CashUnitPrice
                // exactly). A genuinely mixed line should read EmcardQuantity/NormalQuantity
                // below instead of assuming one uniform per-unit price.
                UnitPrice = item.Quantity > 0 ? line.CashPayable / item.Quantity : line.CashUnitPrice,
                LineTotal = line.CashPayable,
                PurchaseMode = line.Mode.ToString(),
                PurchaseModeLabel = line.Mode.Label(),
                PurchaseModeNumber = line.Mode.ModeNumber(),
                CashPayable = line.CashPayable,
                PointsRequired = line.PointsRequired,
                Savings = line.Savings,
                PointsOptional = line.Mode.IsOptional(),
                Purchasable = line.Purchasable,
                BlockingReason = line.BlockingReason,
                OfferType = line.Mode.ToOfferType().ToString(),
                PointsToRedeem = line.PointsRequired,
                PointsMax = product.PointsToBeRedeemed,
                // The mixed-quantity split: EmcardQuantity of Quantity take the offer below
                // (EmcardUnitPrice + EmcardUnitPoints each), the rest (NormalQuantity) pay
                // RegularUnitPrice in plain cash.
                EmcardQuantity = line.EmcardQuantity,
                NormalQuantity = line.NormalQuantity,
                EmcardUnitPrice = line.CashUnitPrice,
                EmcardUnitPoints = line.PointsPerUnit,
                RegularUnitPrice = line.RegularUnitPrice
            };

            itemDtos.Add(dto);
            itemCount += item.Quantity;
        }

        return new CartResponseDTO
        {
            CartId = cart.CartId,
            Items = itemDtos,
            ItemCount = itemCount,
            Subtotal = decision.Subtotal,
            PayableTotal = decision.PayableTotal,
            TotalSavings = decision.TotalSavings,
            TotalPointsToRedeem = decision.TotalPointsRequired,
            PointsBalanceOpening = decision.OpeningBalance,
            PointsBalanceClosing = decision.ClosingBalance,
            PointsEarned = decision.PointsEarned,
            EarnRatePercent = _purchaseEngine.LoyaltyPolicy.EarnRatePercentLabel(),
            Purchasable = decision.Purchasable,
            BlockingReason = decision.BlockingReason
        };
    }

    /// <summary>Condition 1 gate. A non-member's every line is priced cash-only.</summary>
    private async Task<bool> IsEmcardMemberAsync(long userId, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct);
        return user?.IsEmcardMember ?? false;
    }

    /// <summary>Authoritative point balance (emcard_account), 0 when there is no account.</summary>
    private async Task<int> PointsBalanceAsync(long userId, CancellationToken ct)
    {
        var account = await _emcardAccountRepository.FindByUserIdAsync(userId, ct);
        return account?.TotalPoints ?? 0;
    }
}
