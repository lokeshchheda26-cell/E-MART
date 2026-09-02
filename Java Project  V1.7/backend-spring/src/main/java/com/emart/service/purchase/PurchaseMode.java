package com.emart.service.purchase;

import com.emart.entity.ProductOfferType;

/**
 * How a product may be paid for - the ONE configuration value that
 * drives pricing, redemption, checkout validation, loyalty earning
 * and invoice rendering.
 *
 * WHY THIS EXISTS ALONGSIDE ProductOfferType
 * ------------------------------------------
 * {@link ProductOfferType} is the PERSISTED value
 * (product_master.offer_type). This enum is the business-facing view
 * of it, and the two map 1:1 - so no schema change was needed to
 * introduce purchase modes, and every existing row already carries a
 * valid one (see Product#normaliseOffer and OfferTypeBackfillRunner).
 *
 * Keeping the two separate means the vocabulary the business talks in
 * ("Mode 3 - Full Point Redemption") can gain a mode, a label or a
 * rule without touching the database enum, and vice versa.
 *
 * A product belongs to EXACTLY ONE mode. The mode - never a hardcoded
 * branch somewhere in a service - decides:
 *
 *   MODE 1  CASH_ONLY           money only, points may never be used
 *   MODE 2  EMCARD_DISCOUNT     discounted cash price for a member,
 *                               no points; the member opts in
 *   MODE 3  FULL_REDEMPTION     points only, cash is always zero
 *   MODE 4  PARTIAL_REDEMPTION  mandatory cash AND mandatory points
 */
public enum PurchaseMode {

    CASH_ONLY(
            1,
            "Cash Only",
            ProductOfferType.NORMAL),

    EMCARD_DISCOUNT(
            2,
            "EMCard Price",
            ProductOfferType.EMCARD_PRICE),

    FULL_REDEMPTION(
            3,
            "Redeem with EMCard Points",
            ProductOfferType.FULL_REDEMPTION),

    PARTIAL_REDEMPTION(
            4,
            "Cash + EMCard Points",
            ProductOfferType.PARTIAL_REDEMPTION);


    private final int modeNumber;
    private final String label;
    private final ProductOfferType offerType;


    PurchaseMode(int modeNumber, String label, ProductOfferType offerType) {
        this.modeNumber = modeNumber;
        this.label = label;
        this.offerType = offerType;
    }


    /** The BRD's "Mode N" number, for logs and support conversations. */
    public int getModeNumber() {
        return modeNumber;
    }

    /** Customer-facing label. The frontend renders this as given. */
    public String getLabel() {
        return label;
    }

    /** The persisted product_master.offer_type value for this mode. */
    public ProductOfferType toOfferType() {
        return offerType;
    }


    /**
     * The mode a stored offer type represents. Null (a row written
     * before offer_type existed and somehow never normalised) is the
     * safest possible default: cash only, no points at risk.
     */
    public static PurchaseMode from(ProductOfferType offerType) {

        if (offerType == null) {
            return CASH_ONLY;
        }

        return switch (offerType) {
            case NORMAL -> CASH_ONLY;
            case EMCARD_PRICE -> EMCARD_DISCOUNT;
            case FULL_REDEMPTION -> PurchaseMode.FULL_REDEMPTION;
            case PARTIAL_REDEMPTION -> PurchaseMode.PARTIAL_REDEMPTION;
        };
    }


    /** Modes 3 and 4 spend points; modes 1 and 2 never may. */
    public boolean redeemsPoints() {
        return this == FULL_REDEMPTION || this == PARTIAL_REDEMPTION;
    }

    /**
     * Whether the member chooses this offer with a checkbox.
     *
     * TRUE for every mode that HAS an offer (2, 3 and 4). The product
     * page always opens on the regular price, and ticking the box swaps
     * in that mode's terms:
     *
     *   MODE 2  regular price  ->  discounted eMCard price
     *   MODE 3  regular price  ->  "N e-Points, no cash to pay"
     *   MODE 4  regular price  ->  "cash + N e-Points"
     *
     * An un-ticked box always means the same thing: pay the regular
     * price, spend no points. Once ticked, the terms themselves are not
     * negotiable - the amounts are product configuration.
     *
     * FALSE only for MODE 1, which has no offer to show at all.
     */
    public boolean isOptional() {
        return this != CASH_ONLY;
    }

    /** Mode 3 pays no cash, ever. */
    public boolean requiresCash() {
        return this != FULL_REDEMPTION;
    }
}
