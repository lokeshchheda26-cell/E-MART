using Emart.Domain.Entities;
using Emart.Domain.Enums;

namespace Emart.Domain.Purchase;

/// <summary>
/// THE centralised purchase decision algorithm.
///
/// Every question about money or points - what mode is this product, what is payable in cash,
/// how many points does it cost, what was saved, what is earned, may this line be bought at all
/// - is answered here, once. Cart, checkout, the product page and the invoice all call this
/// class instead of carrying their own copy of the rules.
///
/// The per-mode rules themselves live in <see cref="IPurchaseModeStrategy"/> implementations
/// selected through <see cref="PurchaseModeRegistry"/>, so this class contains no per-mode
/// branching and a fifth mode needs no change here.
///
/// MODE RESOLUTION PRECEDENCE (the only "if"s in the algorithm, and they are about the VIEWER
/// and the CALENDAR, not about pricing):
///
///   1. not an eMCard member          -> CASH_ONLY   (Condition 1)
///   2. product is on an active sale  -> CASH_ONLY at the sale price
///      (a public sale discount and an eMCard offer never stack)
///   3. otherwise                     -> the product's configured mode
/// </summary>
public sealed class PurchaseDecisionEngine
{
    private readonly PurchaseModeRegistry _registry;
    private readonly LoyaltyPolicy _loyaltyPolicy;

    public PurchaseDecisionEngine(PurchaseModeRegistry registry, LoyaltyPolicy loyaltyPolicy)
    {
        _registry = registry;
        _loyaltyPolicy = loyaltyPolicy;
    }

    public LoyaltyPolicy LoyaltyPolicy => _loyaltyPolicy;

    // =========================================================
    // MODE RESOLUTION
    // =========================================================

    /// <summary>The mode that actually applies to this product for this viewer.</summary>
    public PurchaseMode ResolveMode(Product? product, bool emcardMember)
    {
        if (product is null || !emcardMember || IsSaleActive(product))
        {
            return PurchaseMode.CASH_ONLY;
        }

        return PurchaseModeExtensions.From(ResolveOfferType(product));
    }

    /// <summary>The product's own configured mode, ignoring viewer and sale.</summary>
    public PurchaseMode ConfiguredMode(Product? product)
    {
        if (product is null)
        {
            return PurchaseMode.CASH_ONLY;
        }

        return PurchaseModeExtensions.From(ResolveOfferType(product));
    }

    public bool IsSaleActive(Product? product) =>
        product is { OnSale: true, SaleEndDate: not null } && product.SaleEndDate > DateTime.UtcNow;

    /// <summary>
    /// Cash a shopper pays with no eMCard offer applied: the sale price while a sale is
    /// genuinely running, otherwise MRP.
    /// </summary>
    public decimal ResolveSellingPrice(Product? product)
    {
        if (product is null)
        {
            return 0m;
        }

        if (IsSaleActive(product) && product.SalePrice is not null)
        {
            return product.SalePrice.Value;
        }

        return product.MrpPrice;
    }

    /// <summary>
    /// Whether POST /api/emcard/reserve is meaningful for this product - true for mode 2 only.
    /// </summary>
    public bool AllowsOptIn(Product? product, bool emcardMember)
    {
        var mode = ResolveMode(product, emcardMember);
        return _registry.ForMode(mode).AllowsOptIn();
    }

    // =========================================================
    // ONE LINE
    // =========================================================

    /// <summary>
    /// EXISTING signature, unchanged - every current caller (unit tests, anything still passing a
    /// plain opt-in flag) keeps working exactly as before. Delegates to the emcardQuantity-aware
    /// overload with the whole line opted in or none of it, which is the all-or-nothing shape this
    /// method always had.
    /// </summary>
    public LineDecision DecideLine(Product? product, int quantity, bool emcardMember, bool optedIn, int pointsAvailable) =>
        DecideLine(product, quantity, emcardMember, optedIn ? Math.Max(1, quantity) : 0, pointsAvailable);

    /// <summary>
    /// NEW - lets a caller state exactly how many of the line's units take the product's eMCard
    /// offer (0..quantity); the rest pay the regular price in the SAME line. This is what makes a
    /// mixed-quantity purchase possible: quantity 4 with emcardQuantity 2 means 2 units at the
    /// offer's price/points and 2 units at the regular price.
    ///
    /// Reuses each IPurchaseModeStrategy completely unchanged: every strategy already prices
    /// exactly ONE unit regardless of what Quantity its context carries, so this asks for the
    /// per-unit "offer taken" figures once and blends them with the per-unit regular price itself,
    /// instead of teaching every strategy about a split.
    /// </summary>
    public LineDecision DecideLine(Product? product, int quantity, bool emcardMember, int emcardQuantity, int pointsAvailable)
    {
        var clampedQuantity = Math.Max(1, quantity);
        var mode = ResolveMode(product, emcardMember);
        var sellingPrice = ResolveSellingPrice(product);
        var strategy = _registry.ForMode(mode);

        // Per-unit "offer taken" figures - Quantity=1 on this context is irrelevant to the
        // per-unit math (see the class doc above); EmcardMember/PointsAvailable pass through
        // unchanged so a non-member or an insufficient balance still resolves to plain cash here.
        var emcardUnitContext = new PurchaseContext(product, 1, emcardMember, true, pointsAvailable, sellingPrice);
        var emcardUnit = strategy.Decide(emcardUnitContext);

        // The strategy itself has the final say on whether its offer actually applies (e.g.
        // CashOnlyStrategy never applies one regardless of what was requested, EmcardDiscountStrategy
        // refuses a non-member or a mis-configured non-discount) - a requested split can only ever
        // narrow that down to fewer eMCard units, never grant one the strategy itself refused.
        var effectiveEmcardQuantity = emcardUnit.EmcardApplied ? emcardQuantity : 0;

        var decision = new LineDecision(
            mode,
            clampedQuantity,
            sellingPrice,
            emcardUnit.CashUnitPrice,
            emcardUnit.PointsPerUnit,
            effectiveEmcardQuantity,
            true,
            null);

        var problem = strategy.Validate(emcardUnitContext, decision);

        return problem is null ? decision : decision.Blocked(problem);
    }

    /// <summary>
    /// How many units of a cart/order line an existing EmcardReservation represents, without any
    /// new column: points-bearing modes (3 and 4) encode it exactly as
    /// PointsReserved / (points required per unit), since per-unit points are a fixed, positive
    /// product constant and the division is therefore always exact. A mode with no per-unit
    /// points to redeem (mode 2, or a misconfigured product) has nothing in PointsReserved that
    /// can encode a partial split, so a reservation there still means "the whole line", same as
    /// before this feature existed.
    /// </summary>
    public int ResolveEmcardQuantity(Product? product, int cartQuantity, EmcardReservation? reservation)
    {
        if (reservation is null)
        {
            return 0;
        }

        var clampedQuantity = Math.Max(1, cartQuantity);
        var perUnitPoints = ConfiguredPoints(product);

        if (perUnitPoints > 0)
        {
            return Math.Clamp(reservation.PointsReserved / perUnitPoints, 0, clampedQuantity);
        }

        return clampedQuantity;
    }

    // =========================================================
    // WHOLE CART
    // =========================================================

    /// <summary>
    /// One cart line's inputs, so callers (cart, checkout) can build the list from their own
    /// entities without this class knowing about CartItem.
    ///
    /// EmcardQuantity is the new, precise input (how many of Quantity take the eMCard offer);
    /// it is optional and trailing so every existing 3-arg call site (unit tests included) still
    /// compiles unchanged. When omitted, OptedIn is used the old all-or-nothing way.
    /// </summary>
    public sealed record CartLine(Product? Product, int Quantity, bool OptedIn, int? EmcardQuantity = null);

    /// <summary>
    /// Decides EVERY line independently, then totals.
    ///
    /// The point balance is spent line by line: remaining drops as each redeeming line is
    /// decided, so two lines that are each individually affordable but not affordable together
    /// correctly fail - which a per-line check against the raw balance would miss.
    /// </summary>
    public CartDecision DecideCart(IReadOnlyList<CartLine>? lines, bool emcardMember, int openingBalance)
    {
        var decisions = new List<LineDecision>();

        var subtotal = 0m;
        var payableTotal = 0m;
        var totalPoints = 0;
        var remainingPoints = Math.Max(0, openingBalance);

        string? blockingReason = null;

        foreach (var line in lines ?? Array.Empty<CartLine>())
        {
            var emcardQuantity = line.EmcardQuantity ?? (line.OptedIn ? Math.Max(1, line.Quantity) : 0);
            var decision = DecideLine(line.Product, line.Quantity, emcardMember, emcardQuantity, remainingPoints);

            decisions.Add(decision);

            subtotal += decision.RegularLineTotal;
            payableTotal += decision.CashPayable;
            totalPoints += decision.PointsRequired;
            remainingPoints = Math.Max(0, remainingPoints - decision.PointsRequired);

            if (!decision.Purchasable && blockingReason is null)
            {
                blockingReason = decision.BlockingReason;
            }
        }

        // Belt and braces: even if every line passed its own check, the cart as a whole must fit
        // inside the balance.
        if (blockingReason is null && totalPoints > Math.Max(0, openingBalance))
        {
            blockingReason = $"This order needs {totalPoints} EMCard points but your balance is " +
                              $"{Math.Max(0, openingBalance)}.";
        }

        return new CartDecision(
            decisions,
            subtotal,
            payableTotal,
            totalPoints,
            _loyaltyPolicy.EarnedPoints(payableTotal),
            openingBalance,
            blockingReason is null,
            blockingReason);
    }

    // =========================================================
    // PRODUCT PAGE
    // =========================================================

    /// <summary>Mode + every display figure the product page needs.</summary>
    public ProductOffer DescribeOffer(Product? product, bool emcardMember)
    {
        var mode = ResolveMode(product, emcardMember);
        var selling = ResolveSellingPrice(product);

        // cash_required / points_required are the authoritative columns, with the legacy pair as
        // a fallback so a row written before they existed still describes its offer correctly.
        var emcardCash = mode switch
        {
            PurchaseMode.EMCARD_DISCOUNT or PurchaseMode.PARTIAL_REDEMPTION => ConfiguredCash(product),
            PurchaseMode.CASH_ONLY or PurchaseMode.FULL_REDEMPTION => 0m,
            _ => 0m
        };

        var points = mode switch
        {
            PurchaseMode.FULL_REDEMPTION or PurchaseMode.PARTIAL_REDEMPTION => ConfiguredPoints(product),
            PurchaseMode.CASH_ONLY or PurchaseMode.EMCARD_DISCOUNT => 0,
            _ => 0
        };

        return new ProductOffer(
            mode,
            selling,
            product?.MrpPrice ?? 0m,
            emcardCash,
            points,
            // Mode 3 pays no cash, so it can never earn.
            mode != PurchaseMode.FULL_REDEMPTION,
            IsSaleActive(product));
    }

    // =========================================================
    // HELPERS
    // =========================================================

    /// <summary>
    /// offer_type from the explicit column, falling back to deriving it from the legacy (mrp,
    /// cardholder, points) trio for any row written before that column existed.
    /// </summary>
    private static ProductOfferType ResolveOfferType(Product product) =>
        product.OfferType ?? ProductOfferTypeExtensions.Derive(product.MrpPrice, product.CardholderPrice, product.PointsToBeRedeemed);

    /// <summary>cash_required, falling back to the legacy cardholder_price.</summary>
    private static decimal ConfiguredCash(Product? product)
    {
        if (product is null)
        {
            return 0m;
        }

        return product.CashRequired ?? product.CardholderPrice;
    }

    /// <summary>points_required, falling back to the legacy points column.</summary>
    private static int ConfiguredPoints(Product? product)
    {
        if (product is null)
        {
            return 0;
        }

        if (product.PointsRequired is not null)
        {
            return Math.Max(0, product.PointsRequired.Value);
        }

        return Math.Max(0, product.PointsToBeRedeemed);
    }
}
