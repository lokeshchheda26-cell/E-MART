package com.emart.dto;

/**
 * Result of settling EMCard points at checkout: how many points were
 * spent on redeemed line items, how many were freshly earned (10% of
 * the amount actually paid, per the BRD), and the account's resulting
 * total balance - all computed atomically inside the same locked
 * transaction as the order itself (see EmcardServiceImpl#settleCheckout).
 */
public class EmcardSettlementDTO {

    private int pointsRedeemed;
    private int pointsEarned;
    /**
     * Balance immediately before settling - the invoice's "opening
     * balance". Returned so OrderServiceImpl can snapshot it onto the
     * order rather than back-calculating it later.
     */
    private int totalPointsBefore;
    private int totalPointsAfter;

    public EmcardSettlementDTO() {
    }

    public EmcardSettlementDTO(
            int pointsRedeemed,
            int pointsEarned,
            int totalPointsBefore,
            int totalPointsAfter) {

        this.pointsRedeemed = pointsRedeemed;
        this.pointsEarned = pointsEarned;
        this.totalPointsBefore = totalPointsBefore;
        this.totalPointsAfter = totalPointsAfter;
    }

    public int getTotalPointsBefore() {
        return totalPointsBefore;
    }

    public void setTotalPointsBefore(int totalPointsBefore) {
        this.totalPointsBefore = totalPointsBefore;
    }

    public int getPointsRedeemed() {
        return pointsRedeemed;
    }

    public void setPointsRedeemed(int pointsRedeemed) {
        this.pointsRedeemed = pointsRedeemed;
    }

    public int getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(int pointsEarned) {
        this.pointsEarned = pointsEarned;
    }

    public int getTotalPointsAfter() {
        return totalPointsAfter;
    }

    public void setTotalPointsAfter(int totalPointsAfter) {
        this.totalPointsAfter = totalPointsAfter;
    }
}
