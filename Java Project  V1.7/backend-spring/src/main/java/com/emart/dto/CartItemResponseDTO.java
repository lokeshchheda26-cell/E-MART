package com.emart.dto;

import java.math.BigDecimal;

/**
 * One line of the cart, with pricing/EMCard status already resolved
 * server-side (current product price, whether EMCard is applied for
 * this product) so the frontend never has to re-derive it.
 */
public class CartItemResponseDTO {

    private Long cartItemId;
    private Long productId;
    private String productName;
    private String productImagePath;
    private String brand;
    private BigDecimal mrpPrice;
    private BigDecimal cardholderPrice;
    private Integer quantity;
    private boolean emcardApplied;
    private Integer pointsToRedeem;
    // The most points this product can ever be redeemed for (its
    // full pointsToBeRedeemed) - the upper bound for a partial-
    // redemption input, regardless of how many are currently applied.
    private Integer pointsMax;
    // Which of the four eMCard offer shapes this product carries:
    // NORMAL / EMCARD_PRICE / FULL_REDEMPTION / PARTIAL_REDEMPTION.
    // Lets the UI label the line without re-deriving the rule.
    private String offerType;
    // unitPrice already accounts for emcardApplied (proportionally
    // discounted for a partial redemption, 0 for a full one).
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;

    // ---- purchase mode (Mode 1..4) ----
    // The mode that ACTUALLY applied to this line, resolved by
    // PurchaseDecisionEngine (so a non-member, or a product on an
    // active sale, reads CASH_ONLY here). The UI renders from these
    // fields instead of re-deriving anything from the price columns.
    private String purchaseMode;
    private String purchaseModeLabel;
    private Integer purchaseModeNumber;

    // Cash this line contributes (same value as lineTotal - named for
    // the invoice/cart vocabulary the requirement uses).
    private BigDecimal cashPayable;

    // Points this line redeems in total (per unit x quantity). 0 for
    // modes 1 and 2, which may never redeem.
    private Integer pointsRequired;

    // regularLineTotal - cashPayable, i.e. cash saved on this line.
    private BigDecimal savings;

    // True only for mode 2, the one mode with a checkbox: the member
    // chooses regular price vs eMCard price. Modes 3/4 are mandatory
    // and mode 1 has no offer, so the UI shows no control for them.
    private boolean pointsOptional;

    // Whether this line can be bought right now, and if not, why -
    // e.g. "needs 450 EMCard points; you have 300 available".
    private boolean purchasable = true;
    private String blockingReason;

    public CartItemResponseDTO() {
    }

    public Long getCartItemId() {
        return cartItemId;
    }

    public void setCartItemId(Long cartItemId) {
        this.cartItemId = cartItemId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductImagePath() {
        return productImagePath;
    }

    public void setProductImagePath(String productImagePath) {
        this.productImagePath = productImagePath;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public BigDecimal getMrpPrice() {
        return mrpPrice;
    }

    public void setMrpPrice(BigDecimal mrpPrice) {
        this.mrpPrice = mrpPrice;
    }

    public BigDecimal getCardholderPrice() {
        return cardholderPrice;
    }

    public void setCardholderPrice(BigDecimal cardholderPrice) {
        this.cardholderPrice = cardholderPrice;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public boolean isEmcardApplied() {
        return emcardApplied;
    }

    public void setEmcardApplied(boolean emcardApplied) {
        this.emcardApplied = emcardApplied;
    }

    public Integer getPointsToRedeem() {
        return pointsToRedeem;
    }

    public void setPointsToRedeem(Integer pointsToRedeem) {
        this.pointsToRedeem = pointsToRedeem;
    }

    public Integer getPointsMax() {
        return pointsMax;
    }

    public void setPointsMax(Integer pointsMax) {
        this.pointsMax = pointsMax;
    }

    public String getOfferType() {
        return offerType;
    }

    public void setOfferType(String offerType) {
        this.offerType = offerType;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }

    public void setLineTotal(BigDecimal lineTotal) {
        this.lineTotal = lineTotal;
    }

    public String getPurchaseMode() {
        return purchaseMode;
    }

    public void setPurchaseMode(String purchaseMode) {
        this.purchaseMode = purchaseMode;
    }

    public String getPurchaseModeLabel() {
        return purchaseModeLabel;
    }

    public void setPurchaseModeLabel(String purchaseModeLabel) {
        this.purchaseModeLabel = purchaseModeLabel;
    }

    public Integer getPurchaseModeNumber() {
        return purchaseModeNumber;
    }

    public void setPurchaseModeNumber(Integer purchaseModeNumber) {
        this.purchaseModeNumber = purchaseModeNumber;
    }

    public BigDecimal getCashPayable() {
        return cashPayable;
    }

    public void setCashPayable(BigDecimal cashPayable) {
        this.cashPayable = cashPayable;
    }

    public Integer getPointsRequired() {
        return pointsRequired;
    }

    public void setPointsRequired(Integer pointsRequired) {
        this.pointsRequired = pointsRequired;
    }

    public BigDecimal getSavings() {
        return savings;
    }

    public void setSavings(BigDecimal savings) {
        this.savings = savings;
    }

    public boolean isPointsOptional() {
        return pointsOptional;
    }

    public void setPointsOptional(boolean pointsOptional) {
        this.pointsOptional = pointsOptional;
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
