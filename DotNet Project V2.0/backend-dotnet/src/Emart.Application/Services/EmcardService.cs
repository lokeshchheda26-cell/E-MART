using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Domain.Enums;
using Emart.Domain.Purchase;
using Microsoft.Extensions.Logging;

namespace Emart.Application.Services;

public class EmcardService : IEmcardService
{
    private const string InsufficientPointsMessage = "Insufficient EMCard Points";

    // A product that is already discounted by an active sale cannot also be paid for with eMcard
    // e-Points (no stacking of the two offers).
    private const string OnSaleMessage = "This product is on sale, you cannot use e-Card points on it";

    // MODE 1 - money only, by configuration.
    private const string CashOnlyMessage = "This product can only be purchased with cash. EMCard points cannot be redeemed on it.";

    private readonly IEmcardAccountRepository _accountRepository;
    private readonly IEmcardReservationRepository _reservationRepository;
    private readonly IEmcardTransactionRepository _transactionRepository;
    private readonly IProductRepository _productRepository;
    private readonly IUserRepository _userRepository;
    private readonly ICartRepository _cartRepository;
    private readonly ICartItemRepository _cartItemRepository;
    private readonly PurchaseDecisionEngine _purchaseEngine;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<EmcardService> _logger;

    public EmcardService(
        IEmcardAccountRepository accountRepository,
        IEmcardReservationRepository reservationRepository,
        IEmcardTransactionRepository transactionRepository,
        IProductRepository productRepository,
        IUserRepository userRepository,
        ICartRepository cartRepository,
        ICartItemRepository cartItemRepository,
        PurchaseDecisionEngine purchaseEngine,
        IUnitOfWork unitOfWork,
        ILogger<EmcardService> logger)
    {
        _accountRepository = accountRepository;
        _reservationRepository = reservationRepository;
        _transactionRepository = transactionRepository;
        _productRepository = productRepository;
        _userRepository = userRepository;
        _cartRepository = cartRepository;
        _cartItemRepository = cartItemRepository;
        _purchaseEngine = purchaseEngine;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<EmcardStatusDTO> GetSummaryAsync(long userId, CancellationToken ct = default)
    {
        // Condition 1: a non-member has no eMCard account and no points. Normal state, not an error.
        var account = await _accountRepository.FindByUserIdAsync(userId, ct);

        if (account is null)
        {
            return new EmcardStatusDTO(true, null, 0, 0, 0, new List<long>());
        }

        var reservations = await _reservationRepository.FindByUserIdAsync(userId, ct);
        return BuildStatus(true, null, account, reservations);
    }

    private const int JoinBonusPoints = 100;

    public async Task<EmcardStatusDTO> JoinMembershipAsync(long userId, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var result = await JoinMembershipInternalAsync(userId, ct);
            await _unitOfWork.CommitAsync(ct);
            return result;
        }
        catch
        {
            await _unitOfWork.RollbackAsync(ct);
            throw;
        }
    }

    private async Task<EmcardStatusDTO> JoinMembershipInternalAsync(long userId, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
            ?? throw new ResourceNotFoundException($"User not found with id: {userId}");

        if (user.IsEmcardMember)
        {
            throw new BusinessException("You are already an eMCard member.");
        }

        // An account row can already exist for this user (e.g. restored/seeded data) even though
        // IsEmcardMember was never flipped. In that case link membership to the existing account
        // instead of inserting a second row - emcard_account.user_id is unique.
        var existingAccount = await _accountRepository.FindByUserIdAsync(userId, ct);

        if (existingAccount is not null)
        {
            user.IsEmcardMember = true;
            user.EmcardPoints = existingAccount.TotalPoints;
            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync(ct);

            _logger.LogInformation(
                "EMCard: userId={UserId} joined membership, linked to existing account with {Points} points.",
                userId, existingAccount.TotalPoints);

            var reservations = await _reservationRepository.FindByUserIdAsync(userId, ct);
            return BuildStatus(true, null, existingAccount, reservations);
        }

        // Same bonus and same ledger shape as a fresh registration that opts into eMCard (see
        // AuthService.RegisterAsync) - joining later isn't a lesser path.
        user.IsEmcardMember = true;
        user.EmcardPoints = JoinBonusPoints;
        _userRepository.Update(user);

        await _accountRepository.AddAsync(new EmcardAccount(userId, JoinBonusPoints), ct);
        await _transactionRepository.AddAsync(
            new EmcardTransaction(userId, null, EmcardTransactionType.CREDIT_INITIAL, JoinBonusPoints, 0, JoinBonusPoints),
            ct);

        await _userRepository.SaveChangesAsync(ct);

        _logger.LogInformation("EMCard: userId={UserId} joined membership, granted {Bonus} bonus points.", userId, JoinBonusPoints);

        return new EmcardStatusDTO(true, null, JoinBonusPoints, 0, JoinBonusPoints, new List<long>());
    }

    public async Task<EmcardStatusDTO> ReserveAsync(long userId, long productId, int? emcardQuantity, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var result = await ReserveInternalAsync(userId, productId, emcardQuantity, ct);
            await _unitOfWork.CommitAsync(ct);
            return result;
        }
        catch
        {
            await _unitOfWork.RollbackAsync(ct);
            throw;
        }
    }

    private async Task<EmcardStatusDTO> ReserveInternalAsync(long userId, long productId, int? requestedEmcardQuantity, CancellationToken ct)
    {
        // Locks the account row for the rest of this transaction - any other reserve()/release()
        // call for the SAME user has to wait here until this transaction commits or rolls back.
        var account = await _accountRepository.FindByUserIdForUpdateAsync(userId, ct)
            ?? throw new InsufficientPointsException("eMCard offers are only available to eMCard members.");

        var product = await _productRepository.GetByIdAsync(productId, ct)
            ?? throw new ResourceNotFoundException($"Product not found with id: {productId}");

        // ---- PURCHASE MODE GUARD ----
        // Sale price and e-Points never stack, so an active sale is refused first.
        if (_purchaseEngine.IsSaleActive(product))
        {
            return BuildStatus(false, OnSaleMessage, account, await _reservationRepository.FindByUserIdAsync(userId, ct));
        }

        var mode = _purchaseEngine.ConfiguredMode(product);

        // MODE 1 is the only mode with no offer to take.
        if (!mode.IsOptional())
        {
            return BuildStatus(false, CashOnlyMessage, account, await _reservationRepository.FindByUserIdAsync(userId, ct));
        }

        // How many units of this product are actually in the cart - the eMCard/normal split can
        // never exceed that. A product not yet in any cart (e.g. the product-page checkbox, opted
        // in before "Add to Cart") is treated as 1 unit, same as before this feature existed.
        var cart = await _cartRepository.FindByUserIdAsync(userId, ct);
        var cartItem = cart is null ? null : await _cartItemRepository.FindByCartIdAndProductIdAsync(cart.CartId, productId, ct);
        var cartQuantity = Math.Max(1, cartItem?.Quantity ?? 1);

        // Per-unit points the offer costs (0 for MODE 2, which spends no points at all). MODES 3
        // and 4 refuse up front when the balance doesn't cover even one unit.
        var offerCheck = _purchaseEngine.DecideLine(product, 1, true, true, account.TotalPoints);
        var perUnitPoints = offerCheck.PointsRequired;

        if (!offerCheck.Purchasable)
        {
            return BuildStatus(false, offerCheck.BlockingReason, account, await _reservationRepository.FindByUserIdAsync(userId, ct));
        }

        int requestedEmcardQty;
        if (requestedEmcardQuantity.HasValue)
        {
            requestedEmcardQty = Math.Clamp(requestedEmcardQuantity.Value, 0, cartQuantity);
        }
        else
        {
            // No explicit split given (a plain checkbox click) - opt in for the full cart
            // quantity, exactly the all-or-nothing behaviour this endpoint always had.
            requestedEmcardQty = cartQuantity;
        }

        // MODE 2 spends no points per unit, so there is nothing in the existing points_reserved
        // column that can encode a PARTIAL split without a schema change - it stays all-or-nothing,
        // same as before this feature existed. MODES 3/4 encode the split exactly, because
        // points_reserved / perUnitPoints always divides evenly back out (see
        // PurchaseDecisionEngine.ResolveEmcardQuantity).
        if (perUnitPoints <= 0)
        {
            requestedEmcardQty = requestedEmcardQty > 0 ? cartQuantity : 0;
        }

        // Holding the points the split actually costs so the eMCard balance shown to the shopper
        // reflects reality the instant they choose it, not only after checkout.
        var requestedPoints = requestedEmcardQty * perUnitPoints;

        var existing = await _reservationRepository.FindByUserIdAndProductIdAsync(userId, productId, ct);
        var reservedSoFar = await _reservationRepository.SumReservedPointsByUserIdAsync(userId, ct);
        var alreadyHeldForThisProduct = existing?.PointsReserved ?? 0;

        if (existing is not null && alreadyHeldForThisProduct == requestedPoints)
        {
            // No-op: idempotent success (duplicate click/request).
            return BuildStatus(true, null, account, await _reservationRepository.FindByUserIdAsync(userId, ct));
        }

        var availableExcludingThisProduct = account.TotalPoints - (reservedSoFar - alreadyHeldForThisProduct);

        if (availableExcludingThisProduct < requestedPoints)
        {
            var currentReservations = await _reservationRepository.FindByUserIdAsync(userId, ct);
            return BuildStatus(false, InsufficientPointsMessage, account, currentReservations);
        }

        if (requestedEmcardQty <= 0)
        {
            // Dropped to zero units - same end state as Release().
            await _reservationRepository.DeleteByUserIdAndProductIdAsync(userId, productId, ct);
        }
        else if (existing is not null)
        {
            existing.PointsReserved = requestedPoints;
            _reservationRepository.Update(existing);
        }
        else
        {
            await _reservationRepository.AddAsync(new EmcardReservation(userId, productId, requestedPoints), ct);
        }

        await _reservationRepository.SaveChangesAsync(ct);

        return BuildStatus(true, null, account, await _reservationRepository.FindByUserIdAsync(userId, ct));
    }

    public async Task<EmcardStatusDTO> ReleaseAsync(long userId, long productId, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var result = await ReleaseInternalAsync(userId, productId, ct);
            await _unitOfWork.CommitAsync(ct);
            return result;
        }
        catch
        {
            await _unitOfWork.RollbackAsync(ct);
            throw;
        }
    }

    private async Task<EmcardStatusDTO> ReleaseInternalAsync(long userId, long productId, CancellationToken ct)
    {
        // Non-EMCard shoppers have no EmcardAccount row - releasing is a no-op for them (must stay
        // tolerant: CartService calls Release() whenever a line is removed from the cart).
        var account = await _accountRepository.FindByUserIdForUpdateAsync(userId, ct);

        if (account is null)
        {
            await _reservationRepository.DeleteByUserIdAndProductIdAsync(userId, productId, ct);
            return new EmcardStatusDTO(true, null, 0, 0, 0, new List<long>());
        }

        // No-op if nothing was reserved for this product - keeps repeated/duplicate calls harmless.
        await _reservationRepository.DeleteByUserIdAndProductIdAsync(userId, productId, ct);

        return BuildStatus(true, null, account, await _reservationRepository.FindByUserIdAsync(userId, ct));
    }

    public async Task<EmcardStatusDTO> ReleaseAllAsync(long userId, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var result = await ReleaseAllInternalAsync(userId, ct);
            await _unitOfWork.CommitAsync(ct);
            return result;
        }
        catch
        {
            await _unitOfWork.RollbackAsync(ct);
            throw;
        }
    }

    private async Task<EmcardStatusDTO> ReleaseAllInternalAsync(long userId, CancellationToken ct)
    {
        var account = await _accountRepository.FindByUserIdForUpdateAsync(userId, ct);

        if (account is null)
        {
            await _reservationRepository.DeleteAllByUserIdAsync(userId, ct);
            return new EmcardStatusDTO(true, null, 0, 0, 0, new List<long>());
        }

        await _reservationRepository.DeleteAllByUserIdAsync(userId, ct);

        return BuildStatus(true, null, account, new List<EmcardReservation>());
    }

    public async Task<EmcardSettlementDTO> SettleCheckoutAsync(long userId, long? orderId, int pointsToRedeem, decimal paidAmount, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var result = await SettleCheckoutInternalAsync(userId, orderId, pointsToRedeem, paidAmount, ct);
            await _unitOfWork.CommitAsync(ct);
            return result;
        }
        catch
        {
            await _unitOfWork.RollbackAsync(ct);
            throw;
        }
    }

    private async Task<EmcardSettlementDTO> SettleCheckoutInternalAsync(long userId, long? orderId, int pointsToRedeem, decimal paidAmount, CancellationToken ct)
    {
        // Non-EMCard shoppers never get an EmcardAccount row created at registration - nothing to
        // settle for them. Treat that as a no-op instead of throwing.
        var account = await _accountRepository.FindByUserIdForUpdateAsync(userId, ct);

        if (account is null)
        {
            // A non-member must never be able to redeem.
            if (pointsToRedeem > 0)
            {
                throw new InsufficientPointsException("This account is not an eMCard member, so points cannot be redeemed.");
            }

            // BUT: a member with no account row must still EARN on this order (membership toggled
            // on afterwards). Open the account at zero and carry on crediting.
            var user = await _userRepository.GetByIdAsync(userId, ct);
            var member = user?.IsEmcardMember ?? false;

            if (!member)
            {
                await _reservationRepository.DeleteAllByUserIdAsync(userId, ct);
                return new EmcardSettlementDTO(0, 0, 0, 0);
            }

            account = await _accountRepository.AddAsync(new EmcardAccount(userId, 0), ct);
            await _accountRepository.SaveChangesAsync(ct);

            _logger.LogInformation(
                "EMCard: opened a points account for member userId={UserId} at settlement - it had none, so earlier orders earned nothing.",
                userId);
        }

        var currentTotal = account.TotalPoints;

        // Points were validated at Reserve() time, but the balance can legitimately have moved
        // since. Re-validate INSIDE the row lock and fail loudly if it no longer covers the order.
        if (pointsToRedeem > currentTotal)
        {
            throw new InsufficientPointsException(
                $"You do not have enough eMCard points to complete this order. Required: {pointsToRedeem}, available: {currentTotal}.");
        }

        var redeemed = Math.Max(0, pointsToRedeem);

        // ONE owner of the earn rule (LoyaltyPolicy), shared with the cart preview and the invoice label.
        var earned = _purchaseEngine.LoyaltyPolicy.EarnedPoints(paidAmount);

        var newTotal = currentTotal - redeemed + earned;

        account.TotalPoints = newTotal;
        account.Version += 1;
        _accountRepository.Update(account);

        // Ledger: one row per reason, so "why is my balance this number?" is answerable.
        var running = currentTotal;
        if (redeemed > 0)
        {
            await _transactionRepository.AddAsync(
                new EmcardTransaction(userId, orderId, EmcardTransactionType.REDEEM, redeemed, running, running - redeemed), ct);
            running -= redeemed;
        }
        if (earned > 0)
        {
            await _transactionRepository.AddAsync(
                new EmcardTransaction(userId, orderId, EmcardTransactionType.EARN, earned, running, running + earned), ct);
        }

        // users.emcard_points was written once at registration and never again - stop it lying.
        var settlingUser = await _userRepository.GetByIdAsync(userId, ct);
        if (settlingUser is not null)
        {
            settlingUser.EmcardPoints = newTotal;
            _userRepository.Update(settlingUser);
        }

        // The cart this checkout came from is gone either way - every reservation for this user is now stale.
        await _reservationRepository.DeleteAllByUserIdAsync(userId, ct);

        await _accountRepository.SaveChangesAsync(ct);

        _logger.LogInformation(
            "EMCard SettleCheckout: userId={UserId} redeemed={Redeemed} earned={Earned} totalBefore={Before} totalAfter={After}",
            userId, redeemed, earned, currentTotal, newTotal);

        return new EmcardSettlementDTO(redeemed, earned, currentTotal, newTotal);
    }

    public async Task<IReadOnlyList<EmcardTransactionResponseDTO>> GetTransactionsAsync(long userId, CancellationToken ct = default)
    {
        var transactions = await _transactionRepository.FindByUserIdOrderByTxnIdDescAsync(userId, ct);

        return transactions.Select(txn => new EmcardTransactionResponseDTO(
            txn.TxnId, txn.OrderId, txn.TxnType.ToString(), txn.Points, txn.BalanceBefore, txn.BalanceAfter, txn.CreatedAt)).ToList();
    }

    private static EmcardStatusDTO BuildStatus(bool success, string? message, EmcardAccount account, IReadOnlyList<EmcardReservation> reservations)
    {
        var reservedPoints = reservations.Sum(r => r.PointsReserved);
        var availablePoints = account.TotalPoints - reservedPoints;
        var reservedProductIds = reservations.Select(r => r.ProductId).ToList();

        return new EmcardStatusDTO(success, message, account.TotalPoints, reservedPoints, availablePoints, reservedProductIds);
    }
}
