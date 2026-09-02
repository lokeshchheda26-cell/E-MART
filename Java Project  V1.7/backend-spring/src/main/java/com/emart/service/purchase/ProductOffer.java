package com.emart.service.purchase;

import java.math.BigDecimal;

/**
 * Everything the PRODUCT PAGE (and the listing card) needs in order to
 * render a product without guessing anything.
 *
 * "The frontend should never guess the purchase mode. The backend must
 * return all necessary information through the API." - so this is what
 * the backend returns, and React just prints it:
 *
 *   CASH_ONLY           sellingPrice
 *   EMCARD_DISCOUNT     mrp, emcardCashPrice, savings, checkbox
 *   FULL_REDEMPTION     pointsRequired ("Redeem using EMCard Points")
 *   PARTIAL_REDEMPTION  emcardCashPrice + pointsRequired ("Cash + Points")
 */
public final class ProductOffer {

    private final PurchaseMode mode;
    private final BigDecimal sellingPrice;
    private final BigDecimal mrpPrice;
    private final BigDecimal emcardCashPrice;
    private final int pointsRequired;
    private final boolean earnsPoints;
    private final boolean saleActive;


    public ProductOffer(
            PurchaseMode mode,
            BigDecimal sellingPrice,
            BigDecimal mrpPrice,
            BigDecimal emcardCashPrice,
            int pointsRequired,
            boolean earnsPoints,
            boolean saleActive) {

        this.mode = mode;
        this.sellingPrice = nvl(sellingPrice);
        this.mrpPrice = nvl(mrpPrice);
        this.emcardCashPrice = nvl(emcardCashPrice);
        this.pointsRequired = Math.max(0, pointsRequired);
        this.earnsPoints = earnsPoints;
        this.saleActive = saleActive;
    }


    public PurchaseMode getMode() {
        return mode;
    }

    /** Cash a non-opted-in shopper pays: sale price, or MRP. */
    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }

    public BigDecimal getMrpPrice() {
        return mrpPrice;
    }

    /** Cash under the eMCard offer (modes 2 and 4); 0 otherwise. */
    public BigDecimal getEmcardCashPrice() {
        return emcardCashPrice;
    }

    /** Points under the eMCard offer (modes 3 and 4); 0 otherwise. */
    public int getPointsRequired() {
        return pointsRequired;
    }

    /** False only for mode 3, where no cash is paid. */
    public boolean isEarnsPoints() {
        return earnsPoints;
    }

    public boolean isSaleActive() {
        return saleActive;
    }

    /** Mode 2 only - the one mode the shopper can opt in and out of. */
    public boolean isPointsOptional() {
        return mode != null && mode.isOptional();
    }

    /** Cash saved by taking the eMCard offer (modes 2 and 4). */
    public BigDecimal getEmcardSavings() {

        if (mode == null || !mode.requiresCash()
                || emcardCashPrice.signum() <= 0
                || emcardCashPrice.compareTo(sellingPrice) >= 0) {
            return BigDecimal.ZERO;
        }

        return sellingPrice.subtract(emcardCashPrice);
    }


    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
