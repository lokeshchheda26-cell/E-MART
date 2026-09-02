package com.emart.service.purchase;

import java.math.BigDecimal;
import java.util.List;

/**
 * The decision for a WHOLE cart: every line decided independently
 * (they may each be a different purchase mode), then aggregated.
 *
 * Immutable. Cart responses, the checkout guard and the invoice totals
 * all read this one object, which is what keeps "what the cart showed"
 * and "what checkout charged" identical.
 */
public final class CartDecision {

    private final List<LineDecision> lines;

    /** Sum of regular (pre-offer) line totals - the MRP subtotal. */
    private final BigDecimal subtotal;

    /** Cash actually payable across the cart. */
    private final BigDecimal payableTotal;

    /** Points redeemed across the cart. */
    private final int totalPointsRequired;

    /** Points earned on the cash actually paid. */
    private final int pointsEarned;

    private final int openingBalance;

    private final boolean purchasable;
    private final String blockingReason;


    public CartDecision(
            List<LineDecision> lines,
            BigDecimal subtotal,
            BigDecimal payableTotal,
            int totalPointsRequired,
            int pointsEarned,
            int openingBalance,
            boolean purchasable,
            String blockingReason) {

        this.lines = lines == null ? List.of() : List.copyOf(lines);
        this.subtotal = nvl(subtotal);
        this.payableTotal = nvl(payableTotal);
        this.totalPointsRequired = Math.max(0, totalPointsRequired);
        this.pointsEarned = Math.max(0, pointsEarned);
        this.openingBalance = Math.max(0, openingBalance);
        this.purchasable = purchasable;
        this.blockingReason = blockingReason;
    }


    public List<LineDecision> getLines() {
        return lines;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getPayableTotal() {
        return payableTotal;
    }

    public int getTotalPointsRequired() {
        return totalPointsRequired;
    }

    public int getPointsEarned() {
        return pointsEarned;
    }

    public int getOpeningBalance() {
        return openingBalance;
    }

    public boolean isPurchasable() {
        return purchasable;
    }

    public String getBlockingReason() {
        return blockingReason;
    }


    /** subtotal - payableTotal, i.e. the cash saved across the cart. */
    public BigDecimal getTotalSavings() {
        return subtotal.subtract(payableTotal);
    }

    /** opening - redeemed + earned. Never negative by construction. */
    public int getClosingBalance() {
        return Math.max(0, openingBalance - totalPointsRequired + pointsEarned);
    }


    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
