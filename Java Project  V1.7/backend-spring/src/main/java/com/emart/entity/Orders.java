package com.emart.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

/**
 * A placed order (table: orders - matches the pre-existing table
 * name from the DB dump; named "Orders" in Java since "Order" would
 * collide with jakarta.persistence semantics/other framework types).
 *
 * Everything money/points related is snapshotted at checkout time
 * (see OrderServiceImpl#checkout) rather than recomputed later, so
 * an order's invoice never changes even if a product's price
 * changes afterwards - the BRD explicitly calls for a stable,
 * printable/emailable invoice.
 */
@Entity
@Table(name = "orders")
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Orders {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long orderId;

    @NotNull(message = "User id is required")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "customer_name", length = 150)
    private String customerName;

    @Column(name = "customer_email", length = 150)
    private String customerEmail;

    @NotNull(message = "Delivery option is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_option", nullable = false, length = 20)
    private DeliveryOption deliveryOption;

    @Column(name = "shipping_address", columnDefinition = "TEXT")
    private String shippingAddress;

    @Column(name = "store_location", length = 255)
    private String storeLocation;

    @NotNull
    @Column(name = "subtotal", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @NotNull
    @Column(name = "total_savings", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalSavings;

    @NotNull
    @Column(name = "payable_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal payableTotal;

    @NotNull
    @Column(name = "points_redeemed", nullable = false)
    private Integer pointsRedeemed = 0;

    @NotNull
    @Column(name = "points_earned", nullable = false)
    private Integer pointsEarned = 0;

    /**
     * eMCard balance immediately BEFORE this order settled.
     *
     * Snapshotted here rather than derived, because the invoice must
     * be able to show the opening balance for ANY past order. It used
     * to be back-calculated from the live balance, which only worked
     * on the checkout response itself - re-opening or re-downloading
     * an older invoice silently lost both balances.
     */
    @NotNull
    @Column(name = "points_balance_before", nullable = false)
    private Integer pointsBalanceBefore = 0;

    /**
     * eMCard balance immediately AFTER this order settled.
     * Invariant: after = before - pointsRedeemed + pointsEarned.
     */
    @NotNull
    @Column(name = "points_balance_after", nullable = false)
    private Integer pointsBalanceAfter = 0;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;


    public Orders() {
    }


    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
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

    public DeliveryOption getDeliveryOption() {
        return deliveryOption;
    }

    public void setDeliveryOption(DeliveryOption deliveryOption) {
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

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public LocalDateTime getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
