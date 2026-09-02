namespace Emart.Domain.Enums;

/// <summary>
/// What the product card / product details page is allowed to show for this product.
///
/// Kept separate from <see cref="ProductOfferType"/> because "what offer exists" and "what this
/// particular viewer may see" are different questions: a PARTIAL_REDEMPTION product is still
/// displayed as MRP_ONLY to a customer who is not an eMCard holder (Condition 1).
/// </summary>
public enum ProductDisplayType
{
    /// <summary>Condition 1 - MRP only. No eMCard price, no point offer.</summary>
    MRP_ONLY,

    /// <summary>MRP struck through + discounted eMCard cash price.</summary>
    MRP_AND_EMCARD_PRICE,

    /// <summary>MRP + "redeem N e-Points" (no cash payable).</summary>
    MRP_AND_POINTS,

    /// <summary>MRP + "pay &lt;cash&gt; + N e-Points".</summary>
    MRP_AND_CASH_PLUS_POINTS
}

public static class ProductDisplayTypeExtensions
{
    /// <summary>
    /// The display type a product carries when the viewer IS an eMCard holder. Non-members
    /// always collapse to MRP_ONLY.
    /// </summary>
    public static ProductDisplayType ForOfferType(ProductOfferType? offerType)
    {
        return offerType switch
        {
            ProductOfferType.EMCARD_PRICE => ProductDisplayType.MRP_AND_EMCARD_PRICE,
            ProductOfferType.FULL_REDEMPTION => ProductDisplayType.MRP_AND_POINTS,
            ProductOfferType.PARTIAL_REDEMPTION => ProductDisplayType.MRP_AND_CASH_PLUS_POINTS,
            ProductOfferType.NORMAL => ProductDisplayType.MRP_ONLY,
            _ => ProductDisplayType.MRP_ONLY
        };
    }
}
