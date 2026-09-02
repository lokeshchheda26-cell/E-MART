package com.emart.dto;

import java.math.BigDecimal;
import java.util.List;

public class CartResponseDTO {

    private Long cartId;
    private List<CartItemResponseDTO> items;
    private int itemCount;
    // Sum of MRP * qty across all lines - what everything would have
    // cost without any cardholder discount or EMCard redemption.
    private BigDecimal subtotal;
    // subtotal - payableTotal - shown to cardholders as "Total Savings"
    // per the BRD.
    private BigDecimal totalSavings;
    // What will actually be charged (sum of unitPrice * qty).
    private BigDecimal payableTotal;
    private int totalPointsToRedeem;

    // ---- purchase-mode driven cart totals ----
    // Point balance before this order, and what it becomes after
    // (opening - redeemed + earned). Both come from the one
    // PurchaseDecisionEngine result, so the cart, the checkout page and
    // the invoice all quote the same figures.
    private int pointsBalanceOpening;
    private int pointsBalanceClosing;

    // Points this order will earn: the configured rate applied to the
    // cash actually payable (see LoyaltyPolicy - never a literal).
    private int pointsEarned;

    // The rate used above, as a percentage string ("10"), so the UI can
    // label it without hardcoding the number.
    private String earnRatePercent;

    // False when at least one line cannot be bought right now (e.g. a
    // points-only product the balance no longer covers). blockingReason
    // is the first reason, ready to render.
    private boolean purchasable = true;
    private String blockingReason;

    public CartResponseDTO() {
    }

    public Long getCartId() {
        return cartId;
    }

    public void setCartId(Long cartId) {
        this.cartId = cartId;
    }

    public List<CartItemResponseDTO> getItems() {
        return items;
    }

    public void setItems(List<CartItemResponseDTO> items) {
        this.items = items;
    }

    public int getItemCount() {
        return itemCount;
    }

    public void setItemCount(int itemCount) {
        this.itemCount = itemCount;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getTotalSavings() {
        return totalSavings;
    }

    public void setTotalSavings(BigDecimal totalSavings) {
        this.totalSavings = totalSavings;
    }

    public BigDecimal getPayableTotal() {
        return payableTotal;
    }

    public void setPayableTotal(BigDecimal payableTotal) {
        this.payableTotal = payableTotal;
    }

    public int getTotalPointsToRedeem() {
        return totalPointsToRedeem;
    }

    public void setTotalPointsToRedeem(int totalPointsToRedeem) {
        this.totalPointsToRedeem = totalPointsToRedeem;
    }

    public int getPointsBalanceOpening() {
        return pointsBalanceOpening;
    }

    public void setPointsBalanceOpening(int pointsBalanceOpening) {
        this.pointsBalanceOpening = pointsBalanceOpening;
    }

    public int getPointsBalanceClosing() {
        return pointsBalanceClosing;
    }

    public void setPointsBalanceClosing(int pointsBalanceClosing) {
        this.pointsBalanceClosing = pointsBalanceClosing;
    }

    public int getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(int pointsEarned) {
        this.pointsEarned = pointsEarned;
    }

    public String getEarnRatePercent() {
        return earnRatePercent;
    }

    public void setEarnRatePercent(String earnRatePercent) {
        this.earnRatePercent = earnRatePercent;
    }

    public boolean isPurchasable() {
        return purchasable;
    }

    public void setPurchasable(boolean purchasable) {
        this.purchasable = purchasable;
    }

    public String getBlockingReason() {
        return blockingReason;
    }

    public void setBlockingReason(String blockingReason) {
        this.blockingReason = blockingReason;
    }
}
