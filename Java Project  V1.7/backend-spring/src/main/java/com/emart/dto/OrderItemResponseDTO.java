package com.emart.dto;

import java.math.BigDecimal;

public class OrderItemResponseDTO {

    private Long orderItemId;
    private Long productId;
    private String productName;
    private String brand;
    private BigDecimal mrpPrice;
    private BigDecimal unitPrice;
    private Integer quantity;
    private boolean emcardApplied;
    private Integer pointsRedeemed;
    private BigDecimal lineTotal;

    // ---- purchase mode this line was charged under ----
    // Read from the order_item snapshot (derived from the stored
    // prices/points for rows written before that column existed), so an
    // old invoice always prints the mode it was actually billed with.
    private String purchaseMode;
    private String purchaseModeLabel;
    private Integer purchaseModeNumber;

    // mrp x qty - lineTotal. Cash saved on this line.
    private BigDecimal savings;

    public OrderItemResponseDTO() {
    }

    public Long getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(Long orderItemId) {
        this.orderItemId = orderItemId;
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

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
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

    public Integer getPointsRedeemed() {
        return pointsRedeemed;
    }

    public void setPointsRedeemed(Integer pointsRedeemed) {
        this.pointsRedeemed = pointsRedeemed;
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

    public BigDecimal getSavings() {
        return savings;
    }

    public void setSavings(BigDecimal savings) {
        this.savings = savings;
    }
}
