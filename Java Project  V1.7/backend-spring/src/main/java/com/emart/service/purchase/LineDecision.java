package com.emart.service.purchase;

import java.math.BigDecimal;

/**
 * The decision for ONE cart/order line: which mode applied, what is
 * payable in cash, what is payable in points, what was saved, and
 * whether the line may be bought at all.
 *
 * Immutable value object - no entity references, no Spring, no
 * database. Cart, checkout, the invoice and the tests all read the
 * same object, so what the shopper is shown and what they are charged
 * cannot drift apart.
 */
public final class LineDecision {

    private final PurchaseMode mode;
    private final int quantity;

    /** Regular price per unit (sale price while on sale, else MRP). */
    private final BigDecimal regularUnitPrice;

    /** Cash actually charged per unit under this mode. */
    private final BigDecimal cashUnitPrice;

    /** Points redeemed per unit under this mode. */
    private final int pointsPerUnit;

    private final boolean emcardApplied;
    private final boolean purchasable;
    private final String blockingReason;


    public LineDecision(
            PurchaseMode mode,
            int quantity,
            BigDecimal regularUnitPrice,
            BigDecimal cashUnitPrice,
            int pointsPerUnit,
            boolean emcardApplied,
            boolean purchasable,
            String blockingReason) {

        this.mode = mode;
        this.quantity = Math.max(1, quantity);
        this.regularUnitPrice = nvl(regularUnitPrice);
        this.cashUnitPrice = nvl(cashUnitPrice);
        this.pointsPerUnit = Math.max(0, pointsPerUnit);
        this.emcardApplied = emcardApplied;
        this.purchasable = purchasable;
        this.blockingReason = blockingReason;
    }


    /** Same decision, marked unbuyable with a reason. */
    public LineDecision blocked(String reason) {
        return new LineDecision(
                mode,
                quantity,
                regularUnitPrice,
                cashUnitPrice,
                pointsPerUnit,
                emcardApplied,
                false,
                reason);
    }


    public PurchaseMode getMode() {
        return mode;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getRegularUnitPrice() {
        return regularUnitPrice;
    }

    public BigDecimal getCashUnitPrice() {
        return cashUnitPrice;
    }

    public int getPointsPerUnit() {
        return pointsPerUnit;
    }

    public boolean isEmcardApplied() {
        return emcardApplied;
    }

    public boolean isPurchasable() {
        return purchasable;
    }

    public String getBlockingReason() {
        return blockingReason;
    }


    /** Cash for the whole line. */
    public BigDecimal getCashPayable() {
        return cashUnitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    /** What the line would have cost without any eMCard offer. */
    public BigDecimal getRegularLineTotal() {
        return regularUnitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    /** Cash saved on this line. */
    public BigDecimal getSavings() {
        return getRegularLineTotal().subtract(getCashPayable());
    }

    /**
     * Points the line redeems in total - scales with quantity exactly
     * like the cash side does, so 3 units of a 40-point item costs
     * 120 points rather than handing 2 of them over free.
     */
    public int getPointsRequired() {
        return pointsPerUnit * quantity;
    }


    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
