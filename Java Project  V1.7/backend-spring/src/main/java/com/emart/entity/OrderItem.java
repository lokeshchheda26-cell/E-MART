package com.emart.entity;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * One line of a placed {@link Orders} (table: order_item).
 *
 * Snapshots the product's name/brand/prices at the moment of
 * checkout (productNameSnapshot etc.) in addition to keeping the FK
 * to the live Product row - so the invoice stays accurate even if
 * the product is later renamed, repriced, or deleted.
 */
@Entity
@Table(name = "order_item")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Long orderItemId;

    @NotNull(message = "Order is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Orders order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prod_id")
    private Product product;

    @Column(name = "product_name_snapshot", length = 150)
    private String productNameSnapshot;

    @Column(name = "brand_snapshot", length = 100)
    private String brandSnapshot;

    @NotNull
    @Column(name = "mrp_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal mrpPrice;

    @NotNull
    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @NotNull
    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @NotNull
    @Column(name = "emcard_applied", nullable = false)
    private Boolean emcardApplied = false;

    @NotNull
    @Column(name = "points_redeemed", nullable = false)
    private Integer pointsRedeemed = 0;

    @NotNull
    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;


    // =========================
    // PURCHASE MODE SNAPSHOT
    //
    // The purchase mode (CASH_ONLY / EMCARD_DISCOUNT /
    // FULL_REDEMPTION / PARTIAL_REDEMPTION) actually charged for this
    // line, captured at checkout.
    //
    // WHY IT IS SNAPSHOTTED rather than read back off the product: the
    // invoice has to be mode-driven for PAST orders too. If the
    // product's configuration changes later (or it goes on sale),
    // re-deriving the mode would make an old invoice print differently
    // than it did on the day it was issued.
    //
    // Nullable so rows written before this column existed keep
    // working - OrderServiceImpl derives their mode from the stored
    // (mrpPrice, unitPrice, pointsRedeemed) snapshot instead.
    // =========================

    @Column(name = "purchase_mode", length = 24)
    private String purchaseMode;


    public OrderItem() {
    }


    public Long getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(Long orderItemId) {
        this.orderItemId = orderItemId;
    }

    public Orders getOrder() {
        return order;
    }

    public void setOrder(Orders order) {
        this.order = order;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getProductNameSnapshot() {
        return productNameSnapshot;
    }

    public void setProductNameSnapshot(String productNameSnapshot) {
        this.productNameSnapshot = productNameSnapshot;
    }

    public String getBrandSnapshot() {
        return brandSnapshot;
    }

    public void setBrandSnapshot(String brandSnapshot) {
        this.brandSnapshot = brandSnapshot;
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

    public Boolean getEmcardApplied() {
        return emcardApplied;
    }

    public void setEmcardApplied(Boolean emcardApplied) {
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
}
