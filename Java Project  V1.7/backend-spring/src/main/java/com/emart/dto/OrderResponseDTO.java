package com.emart.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full invoice shape: everything the Invoice page (and PDF export)
 * needs in one response.
 */
public class OrderResponseDTO {

    private Long orderId;
    private LocalDateTime orderDate;
    private String customerName;
    private String customerEmail;
    private String deliveryOption;
    private String shippingAddress;
    private String storeLocation;
    private String paymentStatus;

    private List<OrderItemResponseDTO> items;

    private BigDecimal subtotal;
    private BigDecimal totalSavings;
    private BigDecimal payableTotal;
    private Integer pointsRedeemed;
    private Integer pointsEarned;
    /** Opening eMCard balance for this order (BRD: bill must show it). */
    private Integer pointsBalanceBefore;
    /** Closing eMCard balance for this order. */
    private Integer pointsBalanceAfter;
    /**
     * @deprecated superseded by {@link #pointsBalanceAfter}. Kept so
     * existing callers (Invoice page, PDF service) keep working; it
     * now carries the same stored closing balance.
     */
    @Deprecated
    private Integer emcardBalanceAfter;

    /**
     * The loyalty earn rate used for this order, as a percentage string
     * ("10"), straight from LoyaltyPolicy. The invoice labels the earned
     * points with this instead of hardcoding "10%", so a configured
     * promotion rate can never disagree with the label.
     */
    private String earnRatePercent;

    public OrderResponseDTO() {
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public LocalDateTime getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getDeliveryOption() {
        return deliveryOption;
    }

    public void setDeliveryOption(String deliveryOption) {
        this.deliveryOption = deliveryOption;
    }

    public String getShippingAddress() {
        return shippingAddress;
    }

    public void setShippingAddress(String shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public String getStoreLocation() {
        return storeLocation;
    }

    public void setStoreLocation(String storeLocation) {
        this.storeLocation = storeLocation;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public List<OrderItemResponseDTO> getItems() {
        return items;
    }

    public void setItems(List<OrderItemResponseDTO> items) {
        this.items = items;
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

    public Integer getPointsRedeemed() {
        return pointsRedeemed;
    }

    public void setPointsRedeemed(Integer pointsRedeemed) {
        this.pointsRedeemed = pointsRedeemed;
    }

    public Integer getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(Integer pointsEarned) {
        this.pointsEarned = pointsEarned;
    }

    public Integer getPointsBalanceBefore() {
        return pointsBalanceBefore;
    }

    public void setPointsBalanceBefore(Integer pointsBalanceBefore) {
        this.pointsBalanceBefore = pointsBalanceBefore;
    }

    public Integer getPointsBalanceAfter() {
        return pointsBalanceAfter;
    }

    public void setPointsBalanceAfter(Integer pointsBalanceAfter) {
        this.pointsBalanceAfter = pointsBalanceAfter;
    }

    public Integer getEmcardBalanceAfter() {
        return emcardBalanceAfter;
    }

    public void setEmcardBalanceAfter(Integer emcardBalanceAfter) {
        this.emcardBalanceAfter = emcardBalanceAfter;
    }

    public String getEarnRatePercent() {
        return earnRatePercent;
    }

    public void setEarnRatePercent(String earnRatePercent) {
        this.earnRatePercent = earnRatePercent;
    }
}
