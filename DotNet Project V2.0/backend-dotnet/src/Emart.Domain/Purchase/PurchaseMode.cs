using Emart.Domain.Enums;

namespace Emart.Domain.Purchase;

/// <summary>
/// How a product may be paid for - the ONE configuration value that drives pricing, redemption,
/// checkout validation, loyalty earning and invoice rendering.
///
///   MODE 1  CASH_ONLY           money only, points may never be used
///   MODE 2  EMCARD_DISCOUNT     discounted cash price for a member, no points; member opts in
///   MODE 3  FULL_REDEMPTION     points only, cash is always zero
///   MODE 4  PARTIAL_REDEMPTION  mandatory cash AND mandatory points
/// </summary>
public enum PurchaseMode
{
    CASH_ONLY,
    EMCARD_DISCOUNT,
    FULL_REDEMPTION,
    PARTIAL_REDEMPTION
}

public static class PurchaseModeExtensions
{
    /// <summary>The BRD's "Mode N" number, for logs and support conversations.</summary>
    public static int ModeNumber(this PurchaseMode mode) => mode switch
    {
        PurchaseMode.CASH_ONLY => 1,
        PurchaseMode.EMCARD_DISCOUNT => 2,
        PurchaseMode.FULL_REDEMPTION => 3,
        PurchaseMode.PARTIAL_REDEMPTION => 4,
        _ => throw new ArgumentOutOfRangeException(nameof(mode))
    };

    /// <summary>Customer-facing label. The frontend renders this as given.</summary>
    public static string Label(this PurchaseMode mode) => mode switch
    {
        PurchaseMode.CASH_ONLY => "Cash Only",
        PurchaseMode.EMCARD_DISCOUNT => "EMCard Price",
        PurchaseMode.FULL_REDEMPTION => "Redeem with EMCard Points",
        PurchaseMode.PARTIAL_REDEMPTION => "Cash + EMCard Points",
        _ => throw new ArgumentOutOfRangeException(nameof(mode))
    };

    /// <summary>The persisted product_master.offer_type value for this mode.</summary>
    public static ProductOfferType ToOfferType(this PurchaseMode mode) => mode switch
    {
        PurchaseMode.CASH_ONLY => ProductOfferType.NORMAL,
        PurchaseMode.EMCARD_DISCOUNT => ProductOfferType.EMCARD_PRICE,
        PurchaseMode.FULL_REDEMPTION => ProductOfferType.FULL_REDEMPTION,
        PurchaseMode.PARTIAL_REDEMPTION => ProductOfferType.PARTIAL_REDEMPTION,
        _ => throw new ArgumentOutOfRangeException(nameof(mode))
    };

    /// <summary>
    /// The mode a stored offer type represents. Null (a row written before offer_type existed
    /// and somehow never normalised) is the safest possible default: cash only, no points at risk.
    /// </summary>
    public static PurchaseMode From(ProductOfferType? offerType) => offerType switch
    {
        null => PurchaseMode.CASH_ONLY,
        ProductOfferType.NORMAL => PurchaseMode.CASH_ONLY,
        ProductOfferType.EMCARD_PRICE => PurchaseMode.EMCARD_DISCOUNT,
        ProductOfferType.FULL_REDEMPTION => PurchaseMode.FULL_REDEMPTION,
        ProductOfferType.PARTIAL_REDEMPTION => PurchaseMode.PARTIAL_REDEMPTION,
        _ => PurchaseMode.CASH_ONLY
    };

    /// <summary>Modes 3 and 4 spend points; modes 1 and 2 never may.</summary>
    public static bool RedeemsPoints(this PurchaseMode mode) =>
        mode is PurchaseMode.FULL_REDEMPTION or PurchaseMode.PARTIAL_REDEMPTION;

    /// <summary>
    /// Whether the member chooses this offer with a checkbox. True for every mode that HAS an
    /// offer (2, 3 and 4). FALSE only for MODE 1, which has no offer to show at all.
    /// </summary>
    public static bool IsOptional(this PurchaseMode mode) => mode != PurchaseMode.CASH_ONLY;

    /// <summary>Mode 3 pays no cash, ever.</summary>
    public static bool RequiresCash(this PurchaseMode mode) => mode != PurchaseMode.FULL_REDEMPTION;
}
