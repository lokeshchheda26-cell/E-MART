package com.emart.entity;

/**
 * What the product card / product details page is allowed to show
 * for this product.
 *
 * Kept separate from {@link ProductOfferType} because "what offer
 * exists" and "what this particular viewer may see" are different
 * questions: a PARTIAL_REDEMPTION product is still displayed as
 * MRP_ONLY to a customer who is not an eMCard holder (Condition 1).
 *
 * The resolved value for a given viewer is produced by
 * com.emart.util.ProductVisibility - this enum is the vocabulary,
 * not the decision.
 */
public enum ProductDisplayType {

    /** Condition 1 - MRP only. No eMCard price, no point offer. */
    MRP_ONLY,

    /** MRP struck through + discounted eMCard cash price. */
    MRP_AND_EMCARD_PRICE,

    /** MRP + "redeem N e-Points" (no cash payable). */
    MRP_AND_POINTS,

    /** MRP + "pay <cash> + N e-Points". */
    MRP_AND_CASH_PLUS_POINTS;


    /**
     * The display type a product carries when the viewer IS an
     * eMCard holder. Non-members always collapse to MRP_ONLY.
     */
    public static ProductDisplayType forOfferType(ProductOfferType offerType) {

        if (offerType == null) {
            return MRP_ONLY;
        }

        return switch (offerType) {
            case EMCARD_PRICE -> MRP_AND_EMCARD_PRICE;
            case FULL_REDEMPTION -> MRP_AND_POINTS;
            case PARTIAL_REDEMPTION -> MRP_AND_CASH_PLUS_POINTS;
            case NORMAL -> MRP_ONLY;
        };
    }
}
