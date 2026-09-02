package com.emart.entity;

/**
 * How a product may be bought by an eMCard (loyalty card) holder.
 *
 * This makes explicit what the pricing code previously had to INFER
 * from the combination of (mrpPrice, cardholderPrice,
 * pointsToBeRedeemed) in three different places (CartServiceImpl,
 * OrderServiceImpl and the React product card) - which is how those
 * three copies were able to drift apart.
 *
 * The four values map 1:1 onto the four business conditions in the
 * BRD / loyalty spec:
 *
 *   NORMAL              - Condition 1. No eMCard offer at all. Every
 *                         customer, member or not, pays the regular
 *                         price (MRP, or salePrice while on sale).
 *
 *   EMCARD_PRICE        - Condition 2. Cardholder pays a discounted
 *                         cash price and no points. e.g. MRP 169,
 *                         cardholder pays 160, earns 16.
 *
 *   FULL_REDEMPTION     - Condition 3. Cardholder pays no cash and
 *                         redeems points only. e.g. MRP 27 for 40
 *                         points. Earns nothing (no cash paid).
 *
 *   PARTIAL_REDEMPTION  - Condition 4. Cardholder pays part cash and
 *                         part points. e.g. MRP 120 for 80 cash +
 *                         50 points. Earns 10% of the 80 = 8.
 */
public enum ProductOfferType {

    NORMAL,
    EMCARD_PRICE,
    FULL_REDEMPTION,
    PARTIAL_REDEMPTION;


    /**
     * Derives the offer type from the legacy pricing columns.
     *
     * Used to backfill {@code product_master.offer_type} for rows
     * created before this column existed, and as the fallback
     * whenever offerType is somehow null on an existing row - so the
     * system behaves identically to how it did before this column
     * was introduced.
     */
    public static ProductOfferType derive(
            java.math.BigDecimal mrpPrice,
            java.math.BigDecimal cardholderPrice,
            Integer pointsToBeRedeemed) {

        java.math.BigDecimal mrp =
                mrpPrice == null ? java.math.BigDecimal.ZERO : mrpPrice;
        java.math.BigDecimal cardholder =
                cardholderPrice == null ? java.math.BigDecimal.ZERO : cardholderPrice;

        boolean hasCashDiscount =
                cardholder.compareTo(java.math.BigDecimal.ZERO) > 0
                        && cardholder.compareTo(mrp) < 0;

        boolean hasPoints =
                pointsToBeRedeemed != null && pointsToBeRedeemed > 0;

        if (hasCashDiscount && hasPoints) {
            return PARTIAL_REDEMPTION;
        }
        if (hasPoints) {
            return FULL_REDEMPTION;
        }
        if (hasCashDiscount) {
            return EMCARD_PRICE;
        }
        return NORMAL;
    }
}
