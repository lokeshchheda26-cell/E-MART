namespace Emart.Domain.Enums;

/// <summary>
/// How a product may be bought by an eMCard (loyalty card) holder.
///
/// The four values map 1:1 onto the four business conditions in the BRD / loyalty spec:
///
///   NORMAL              - Condition 1. No eMCard offer at all. Every customer, member or not,
///                          pays the regular price (MRP, or salePrice while on sale).
///   EMCARD_PRICE        - Condition 2. Cardholder pays a discounted cash price and no points.
///   FULL_REDEMPTION      - Condition 3. Cardholder pays no cash and redeems points only.
///   PARTIAL_REDEMPTION   - Condition 4. Cardholder pays part cash and part points.
/// </summary>
public enum ProductOfferType
{
    NORMAL,
    EMCARD_PRICE,
    FULL_REDEMPTION,
    PARTIAL_REDEMPTION
}

public static class ProductOfferTypeExtensions
{
    /// <summary>
    /// Derives the offer type from the legacy pricing columns. Used to backfill
    /// product_master.offer_type for rows created before this column existed, and as the
    /// fallback whenever offerType is somehow null on an existing row.
    /// </summary>
    public static ProductOfferType Derive(decimal? mrpPrice, decimal? cardholderPrice, int? pointsToBeRedeemed)
    {
        var mrp = mrpPrice ?? 0m;
        var cardholder = cardholderPrice ?? 0m;

        var hasCashDiscount = cardholder > 0m && cardholder < mrp;
        var hasPoints = pointsToBeRedeemed is > 0;

        if (hasCashDiscount && hasPoints)
        {
            return ProductOfferType.PARTIAL_REDEMPTION;
        }
        if (hasPoints)
        {
            return ProductOfferType.FULL_REDEMPTION;
        }
        if (hasCashDiscount)
        {
            return ProductOfferType.EMCARD_PRICE;
        }
        return ProductOfferType.NORMAL;
    }
}
