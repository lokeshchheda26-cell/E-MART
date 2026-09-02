using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Domain.Enums;
using Emart.Domain.Purchase;
using Microsoft.Extensions.Logging;

namespace Emart.Application.Services;

public class OrderService : IOrderService
{
    private readonly IOrdersRepository _ordersRepository;
    private readonly IOrderItemRepository _orderItemRepository;
    private readonly ICartRepository _cartRepository;
    private readonly ICartItemRepository _cartItemRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEmcardReservationRepository _reservationRepository;
    private readonly IEmcardAccountRepository _emcardAccountRepository;
    private readonly IEmcardService _emcardService;
    private readonly IEmailService _emailService;
    private readonly IPdfInvoiceService _pdfInvoiceService;
    private readonly PurchaseDecisionEngine _purchaseEngine;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrdersRepository ordersRepository,
        IOrderItemRepository orderItemRepository,
        ICartRepository cartRepository,
        ICartItemRepository cartItemRepository,
        IUserRepository userRepository,
        IEmcardReservationRepository reservationRepository,
        IEmcardAccountRepository emcardAccountRepository,
        IEmcardService emcardService,
        IEmailService emailService,
        IPdfInvoiceService pdfInvoiceService,
        PurchaseDecisionEngine purchaseEngine,
        IUnitOfWork unitOfWork,
        ILogger<OrderService> logger)
    {
        _ordersRepository = ordersRepository;
        _orderItemRepository = orderItemRepository;
        _cartRepository = cartRepository;
        _cartItemRepository = cartItemRepository;
        _userRepository = userRepository;
        _reservationRepository = reservationRepository;
        _emcardAccountRepository = emcardAccountRepository;
        _emcardService = emcardService;
        _emailService = emailService;
        _pdfInvoiceService = pdfInvoiceService;
        _purchaseEngine = purchaseEngine;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<OrderResponseDTO> CheckoutAsync(long userId, CheckoutRequestDTO request, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        OrderResponseDTO response;
        Orders order;
        List<OrderItem> orderItems;

        try
        {
            (response, order, orderItems) = await CheckoutInternalAsync(userId, request, ct);
            await _unitOfWork.CommitAsync(ct);
        }
        catch
        {
            await _unitOfWork.RollbackAsync(ct);
            throw;
        }

        // Reuse the exact same invoice the /invoice download endpoint serves. A failure here must
        // not cost the customer their confirmation email, so fall back to sending it unattached.
        byte[]? invoicePdf = null;
        try
        {
            invoicePdf = _pdfInvoiceService.GenerateInvoicePdf(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not generate invoice PDF for orderId={OrderId}: {Error}", order.OrderId, ex.ToString());
        }

        // Order + order items are fully committed at this point - safe to fire the confirmation
        // email now, with the PDF invoice attached.
        await _emailService.SendOrderConfirmationEmailAsync(order.CustomerEmail!, order.CustomerName!, order, orderItems, invoicePdf, ct);

        return response;
    }

    private async Task<(OrderResponseDTO Response, Orders Order, List<OrderItem> Items)> CheckoutInternalAsync(long userId, CheckoutRequestDTO request, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
            ?? throw new ResourceNotFoundException($"User not found with id: {userId}");

        var deliveryOption = ParseDeliveryOption(request.DeliveryOption);

        var cart = await _cartRepository.FindByUserIdAsync(userId, ct)
            ?? throw new InvalidOperationException("Your cart is empty. Add items before checking out.");

        var cartItems = await _cartItemRepository.FindByCartIdAsync(cart.CartId, ct);

        if (cartItems.Count == 0)
        {
            throw new InvalidOperationException("Your cart is empty. Add items before checking out.");
        }

        var shippingAddress = ResolveShippingAddress(deliveryOption, request.ShippingAddress, user.Address);

        // A reservation's PointsReserved encodes exactly how many of a line's units take the
        // eMCard offer (see PurchaseDecisionEngine.ResolveEmcardQuantity) - the SAME derivation
        // CartService uses, so the order can never charge something the cart didn't just show.
        var reservationsByProduct = (await _reservationRepository.FindByUserIdAsync(userId, ct))
            .ToDictionary(r => r.ProductId);

        var emcardMember = user.IsEmcardMember;

        var openingBalance = (await _emcardAccountRepository.FindByUserIdAsync(userId, ct))?.TotalPoints ?? 0;

        var decision = _purchaseEngine.DecideCart(
            cartItems.Select(ci =>
            {
                reservationsByProduct.TryGetValue(ci.ProductId, out var reservation);
                var emcardQuantity = _purchaseEngine.ResolveEmcardQuantity(ci.Product, ci.Quantity, reservation);
                return new PurchaseDecisionEngine.CartLine(ci.Product, ci.Quantity, emcardQuantity > 0, emcardQuantity);
            }).ToList(),
            emcardMember,
            openingBalance);

        if (!decision.Purchasable)
        {
            throw new InsufficientPointsException(decision.BlockingReason ?? "This order cannot be completed.");
        }

        var orderItems = new List<OrderItem>();

        for (var i = 0; i < cartItems.Count; i++)
        {
            var cartItem = cartItems[i];
            var product = cartItem.Product;
            var qty = cartItem.Quantity;
            var line = decision.Lines[i];

            var availableStock = product.Stock;
            if (availableStock < qty)
            {
                throw new InvalidOperationException($"Insufficient stock for \"{product.ProductName}\". Only {availableStock} left.");
            }

            // A line that genuinely mixes EMCard-redeemed and normally-priced units becomes TWO
            // order items - one per price - rather than forcing a single UnitPrice to lie about
            // either half. An un-mixed line (all-or-nothing, the pre-existing shape) still becomes
            // exactly one order item, unchanged.
            if (line.EmcardQuantity > 0 && line.NormalQuantity > 0)
            {
                orderItems.Add(new OrderItem
                {
                    Product = product,
                    ProductNameSnapshot = product.ProductName,
                    BrandSnapshot = product.Brand,
                    MrpPrice = product.MrpPrice,
                    UnitPrice = line.CashUnitPrice,
                    Quantity = line.EmcardQuantity,
                    EmcardApplied = true,
                    PointsRedeemed = line.PointsRequired,
                    LineTotal = line.CashUnitPrice * line.EmcardQuantity,
                    PurchaseMode = line.Mode.ToString()
                });

                orderItems.Add(new OrderItem
                {
                    Product = product,
                    ProductNameSnapshot = product.ProductName,
                    BrandSnapshot = product.Brand,
                    MrpPrice = product.MrpPrice,
                    UnitPrice = line.RegularUnitPrice,
                    Quantity = line.NormalQuantity,
                    EmcardApplied = false,
                    PointsRedeemed = 0,
                    LineTotal = line.RegularUnitPrice * line.NormalQuantity,
                    PurchaseMode = PurchaseMode.CASH_ONLY.ToString()
                });
            }
            else
            {
                // Not mixed (0 or all of `qty` took the offer) - CashUnitPrice is the OFFER's
                // price, which is only what actually applies when EmcardQuantity > 0. When
                // nothing was redeemed, the regular price is what was actually charged.
                var actualUnitPrice = line.EmcardQuantity > 0 ? line.CashUnitPrice : line.RegularUnitPrice;

                orderItems.Add(new OrderItem
                {
                    Product = product,
                    ProductNameSnapshot = product.ProductName,
                    BrandSnapshot = product.Brand,
                    MrpPrice = product.MrpPrice,
                    UnitPrice = actualUnitPrice,
                    Quantity = qty,
                    EmcardApplied = line.EmcardApplied,
                    PointsRedeemed = line.PointsRequired,
                    LineTotal = line.CashPayable,
                    PurchaseMode = line.Mode.ToString()
                });
            }

            product.Stock = availableStock - qty;
        }

        var subtotal = decision.Subtotal;
        var payableTotal = decision.PayableTotal;
        var totalPointsRedeemed = decision.TotalPointsRequired;
        var totalSavings = decision.TotalSavings;

        var order = new Orders
        {
            UserId = userId,
            CustomerName = $"{user.FirstName} {user.LastName}".Trim(),
            CustomerEmail = user.Email,
            DeliveryOption = deliveryOption,
            ShippingAddress = shippingAddress,
            StoreLocation = deliveryOption == DeliveryOption.PICKUP ? request.StoreLocation : null,
            Subtotal = subtotal,
            TotalSavings = totalSavings,
            PayableTotal = payableTotal,
            PaymentStatus = PaymentStatus.PAID,
            OrderDate = DateTime.UtcNow
        };

        await _ordersRepository.AddAsync(order, ct);
        await _ordersRepository.SaveChangesAsync(ct);

        // Permanently spend the redeemed points + credit the earn rate on what was actually paid,
        // atomically. Re-validates the balance inside a row lock and throws
        // InsufficientPointsException if it no longer covers the order.
        var settlement = await _emcardService.SettleCheckoutAsync(userId, order.OrderId, totalPointsRedeemed, payableTotal, ct);

        order.PointsRedeemed = settlement.PointsRedeemed;
        order.PointsEarned = settlement.PointsEarned;
        order.PointsBalanceBefore = settlement.TotalPointsBefore;
        order.PointsBalanceAfter = settlement.TotalPointsAfter;
        _ordersRepository.Update(order);

        foreach (var item in orderItems)
        {
            item.OrderId = order.OrderId;
            item.Order = order;
        }

        await _orderItemRepository.AddRangeAsync(orderItems, ct);
        await _cartItemRepository.DeleteByCartIdAsync(cart.CartId, ct);
        await _ordersRepository.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Order placed: orderId={OrderId} userId={UserId} items={Count} payableTotal={Payable} pointsRedeemed={Redeemed} pointsEarned={Earned}",
            order.OrderId, userId, orderItems.Count, payableTotal, settlement.PointsRedeemed, settlement.PointsEarned);

        var response = MapToResponse(order, orderItems, user.IsEmcardMember);

        return (response, order, orderItems);
    }

    public async Task<OrderResponseDTO> GetOrderAsync(long userId, long orderId, CancellationToken ct = default)
    {
        var order = await _ordersRepository.FindByOrderIdAndUserIdAsync(orderId, userId, ct)
            ?? throw new ResourceNotFoundException($"Order not found with id: {orderId}");

        var items = await _orderItemRepository.FindByOrderIdAsync(orderId, ct);
        var user = await _userRepository.GetByIdAsync(userId, ct);

        return MapToResponse(order, items, user?.IsEmcardMember ?? false);
    }

    public async Task<IReadOnlyList<OrderResponseDTO>> GetOrderHistoryAsync(long userId, CancellationToken ct = default)
    {
        var orders = await _ordersRepository.FindByUserIdOrderByOrderDateDescAsync(userId, ct);
        var user = await _userRepository.GetByIdAsync(userId, ct);
        var isEmcardMember = user?.IsEmcardMember ?? false;

        var result = new List<OrderResponseDTO>();
        foreach (var order in orders)
        {
            var items = await _orderItemRepository.FindByOrderIdAsync(order.OrderId, ct);
            result.Add(MapToResponse(order, items, isEmcardMember));
        }

        return result;
    }

    private static DeliveryOption ParseDeliveryOption(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new ArgumentException("Delivery option is required");
        }

        if (Enum.TryParse<DeliveryOption>(raw.Trim().ToUpperInvariant(), out var parsed))
        {
            return parsed;
        }

        throw new ArgumentException($"Invalid delivery option: {raw} (expected COURIER or PICKUP)");
    }

    private static string? ResolveShippingAddress(DeliveryOption deliveryOption, string? requestedAddress, string? profileAddress)
    {
        if (deliveryOption == DeliveryOption.PICKUP)
        {
            return null;
        }

        var address = !string.IsNullOrWhiteSpace(requestedAddress) ? requestedAddress.Trim() : profileAddress;

        if (string.IsNullOrWhiteSpace(address))
        {
            throw new InvalidOperationException("Shipping address is required for courier delivery.");
        }

        return address;
    }

    private OrderResponseDTO MapToResponse(Orders order, IReadOnlyList<OrderItem> items, bool isEmcardMember)
    {
        var dto = new OrderResponseDTO
        {
            IsEmcardMember = isEmcardMember,
            OrderId = order.OrderId,
            OrderDate = order.OrderDate,
            CustomerName = order.CustomerName,
            CustomerEmail = order.CustomerEmail,
            DeliveryOption = order.DeliveryOption.ToString(),
            ShippingAddress = order.ShippingAddress,
            StoreLocation = order.StoreLocation,
            PaymentStatus = order.PaymentStatus.ToString(),
            Subtotal = order.Subtotal,
            TotalSavings = order.TotalSavings,
            PayableTotal = order.PayableTotal,
            PointsRedeemed = order.PointsRedeemed,
            PointsEarned = order.PointsEarned,
            PointsBalanceBefore = order.PointsBalanceBefore,
            PointsBalanceAfter = order.PointsBalanceAfter,
            EmcardBalanceAfter = order.PointsBalanceAfter,
            EarnRatePercent = _purchaseEngine.LoyaltyPolicy.EarnRatePercentLabel(),
            Items = items.Select(MapItem).ToList()
        };

        return dto;
    }

    private static OrderItemResponseDTO MapItem(OrderItem item)
    {
        var dto = new OrderItemResponseDTO
        {
            OrderItemId = item.OrderItemId,
            ProductId = item.ProductId,
            ProductName = item.ProductNameSnapshot,
            Brand = item.BrandSnapshot,
            MrpPrice = item.MrpPrice,
            UnitPrice = item.UnitPrice,
            Quantity = item.Quantity,
            EmcardApplied = item.EmcardApplied,
            PointsRedeemed = item.PointsRedeemed,
            LineTotal = item.LineTotal
        };

        var mode = ResolveOrderItemMode(item);
        dto.PurchaseMode = mode.ToString();
        dto.PurchaseModeLabel = mode.Label();
        dto.PurchaseModeNumber = mode.ModeNumber();

        var qty = item.Quantity <= 0 ? 1 : item.Quantity;
        var regular = item.MrpPrice * qty;
        dto.Savings = regular - item.LineTotal;

        return dto;
    }

    /// <summary>
    /// The purchase mode this order line was billed under. Reads the snapshot written at
    /// checkout; for rows created before order_item.purchase_mode existed it reconstructs the
    /// mode from the stored figures, so an old invoice renders mode-driven too.
    /// </summary>
    private static PurchaseMode ResolveOrderItemMode(OrderItem item)
    {
        if (!string.IsNullOrWhiteSpace(item.PurchaseMode) && Enum.TryParse<PurchaseMode>(item.PurchaseMode, out var stored))
        {
            return stored;
        }

        var points = item.PointsRedeemed;
        var cash = item.LineTotal;
        var mrp = item.MrpPrice;
        var unit = item.UnitPrice;

        if (points > 0)
        {
            return cash > 0 ? PurchaseMode.PARTIAL_REDEMPTION : PurchaseMode.FULL_REDEMPTION;
        }

        if (mrp > 0 && unit < mrp && item.EmcardApplied)
        {
            return PurchaseMode.EMCARD_DISCOUNT;
        }

        return PurchaseMode.CASH_ONLY;
    }
}
