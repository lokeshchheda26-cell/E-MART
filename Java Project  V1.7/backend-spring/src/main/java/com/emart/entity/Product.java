package com.emart.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Transient;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "product_master")
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prod_id")
    private Long productId;


    // =========================
    // CATEGORY
    // =========================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catmaster_id", nullable = false)
    @NotNull(message = "Category is required")
    private Category category;


    // =========================
    // SUB CATEGORY
    // =========================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subcat_master_id")
    private SubCategory subCategory;


    // =========================
    // PRODUCT NAME
    // =========================

    @NotBlank(message = "Product name is required")
    @Size(
        min = 3,
        max = 150,
        message = "Product name must be between 3 and 150 characters"
    )
    @Column(
        name = "prod_name",
        nullable = false,
        length = 150,
        unique = true
    )
    private String productName;


    // =========================
    // SHORT DESCRIPTION
    // =========================

    @NotBlank(message = "Short description is required")
    @Size(
        max = 255,
        message = "Short description cannot exceed 255 characters"
    )
    @Column(
        name = "prod_short_desc",
        nullable = false,
        length = 255
    )
    private String shortDescription;


    // =========================
    // LONG DESCRIPTION
    // =========================

    @Lob
    @Column(name = "prod_long_desc")
    private String longDescription;


    // =========================
    // PRODUCT IMAGE
    // =========================

    @Column(name = "prod_image_path")
    private String productImagePath;


    // =========================
    // MRP PRICE
    // =========================

    @NotNull(message = "MRP Price is required")
    @DecimalMin(value = "0.0", inclusive = false)
    @Digits(integer = 8, fraction = 2)
    @Column(
        name = "mrp_price",
        nullable = false,
        precision = 10,
        scale = 2
    )
    private BigDecimal mrpPrice;


    // =========================
    // CARDHOLDER PRICE
    // =========================

    @NotNull(message = "Cardholder Price is required")
    @DecimalMin(value = "0.0", inclusive = false)
    @Digits(integer = 8, fraction = 2)
    @Column(
        name = "cardholder_price",
        nullable = false,
        precision = 10,
        scale = 2
    )
    private BigDecimal cardholderPrice;


    // =========================
    // BRAND
    // =========================

    @Size(
        max = 100,
        message = "Brand name cannot exceed 100 characters"
    )
    @Column(
        name = "brand",
        length = 100
    )
    private String brand;


    // =========================
    // STOCK
    // =========================

    @NotNull(message = "Available stock is required")
    @Min(
        value = 0,
        message = "Stock cannot be negative"
    )
    @Column(
        name = "stock",
        nullable = false
    )
    private Integer stock;


    // =========================
    // POINTS
    // =========================

    @NotNull(message = "Points to be redeemed are required")
    @Min(
        value = 0,
        message = "Points cannot be negative"
    )
    @Column(
        name = "points_to_be_redeemed",
        nullable = false
    )
    private Integer pointsToBeRedeemed;


    // =========================
    // OFFER TYPE
    //
    // Makes the eMCard offer EXPLICIT instead of leaving the pricing
    // code to infer it from (mrpPrice, cardholderPrice,
    // pointsToBeRedeemed) - which is how Cart, Checkout and the React
    // product card were each able to hold their own copy of the rule.
    // PricingEngine now reads this one field.
    //
    // Nullable in the DB so rows created before this column existed
    // keep working; normaliseOffer() below fills it in from the
    // legacy columns whenever it is null.
    // =========================

    @Enumerated(EnumType.STRING)
    @Column(
        name = "offer_type",
        length = 24
    )
    private ProductOfferType offerType;


    // =========================
    // POINTS REQUIRED
    //
    // Points a cardholder must redeem PER UNIT under the offer.
    // Authoritative for pricing; kept in sync with the legacy
    // pointsToBeRedeemed column (which the admin CRUD screens and
    // the existing product APIs still read/write) by
    // normaliseOffer().
    // =========================

    @Min(
        value = 0,
        message = "Points required cannot be negative"
    )
    @Column(name = "points_required")
    private Integer pointsRequired;


    // =========================
    // CASH REQUIRED
    //
    // Cash a cardholder must pay PER UNIT under the offer
    // (0 for a full redemption). Authoritative for pricing; kept in
    // sync with the legacy cardholderPrice column by
    // normaliseOffer().
    // =========================

    @DecimalMin(value = "0.0")
    @Digits(integer = 8, fraction = 2)
    @Column(
        name = "cash_required",
        precision = 10,
        scale = 2
    )
    private BigDecimal cashRequired;


    // =========================
    // DISPLAY TYPE
    //
    // What the product card is allowed to show for a cardholder.
    // Non-members always collapse to MRP_ONLY regardless of this
    // value - see com.emart.util.ProductVisibility, which is what
    // actually enforces Condition 1.
    // =========================

    @Enumerated(EnumType.STRING)
    @Column(
        name = "display_type",
        length = 32
    )
    private ProductDisplayType displayType;


    // =========================
    // STATUS
    // =========================

    @Column(
        name = "status",
        nullable = false
    )
    private Boolean status = Boolean.TRUE;


    // =========================
    // ON SALE FLAG
    // (drives the homepage Sale Banner - only products with
    // onSale = true AND a saleEndDate still in the future are
    // eligible to be picked)
    // =========================

    @Column(
        name = "on_sale",
        nullable = false
    )
    private Boolean onSale = Boolean.FALSE;


    // =========================
    // SALE PRICE
    // (discounted price shown on the Sale Banner while onSale
    // is true; mrpPrice continues to be shown alongside it,
    // struck through, as the "original" price)
    // =========================

    @DecimalMin(value = "0.0", inclusive = false)
    @Digits(integer = 8, fraction = 2)
    @Column(
        name = "sale_price",
        precision = 10,
        scale = 2
    )
    private BigDecimal salePrice;


    // =========================
    // SALE END DATE
    // (the Sale Banner's product query requires this to be in
    // the future - once it passes, the product stops being
    // eligible even if onSale is still true)
    // =========================

    @Column(name = "sale_end_date")
    private LocalDateTime saleEndDate;


    // =========================
    // CREATED AT
    // =========================

    @CreatedDate
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private LocalDateTime createdAt;


    // =========================
    // UPDATED AT
    // =========================

    @LastModifiedDate
    @Column(
        name = "updated_at",
        nullable = false
    )
    private LocalDateTime updatedAt;


    // =========================
    // DEFAULT CONSTRUCTOR
    // =========================

    public Product() {
    }


    // =========================
    // GETTERS AND SETTERS
    // =========================

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }


    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }


    public SubCategory getSubCategory() {
        return subCategory;
    }

    public void setSubCategory(SubCategory subCategory) {
        this.subCategory = subCategory;
    }


    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }


    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(
            String shortDescription) {

        this.shortDescription =
                shortDescription;
    }


    public String getLongDescription() {
        return longDescription;
    }

    public void setLongDescription(
            String longDescription) {

        this.longDescription =
                longDescription;
    }


    public String getProductImagePath() {
        return productImagePath;
    }

    public void setProductImagePath(
            String productImagePath) {

        this.productImagePath =
                productImagePath;
    }


    public String getBrand() {
        return brand;
    }

    public void setBrand(
            String brand) {

        this.brand =
                brand;
    }


    public Integer getStock() {
        return stock;
    }

    public void setStock(
            Integer stock) {

        this.stock =
                stock;
    }


    public BigDecimal getMrpPrice() {
        return mrpPrice;
    }

    public void setMrpPrice(
            BigDecimal mrpPrice) {

        this.mrpPrice =
                mrpPrice;
    }


    public BigDecimal getCardholderPrice() {
        return cardholderPrice;
    }

    public void setCardholderPrice(
            BigDecimal cardholderPrice) {

        this.cardholderPrice =
                cardholderPrice;
    }


    public Integer getPointsToBeRedeemed() {
        return pointsToBeRedeemed;
    }

    public void setPointsToBeRedeemed(
            Integer pointsToBeRedeemed) {

        this.pointsToBeRedeemed =
                pointsToBeRedeemed;
    }


    public Boolean getStatus() {
        return status;
    }

    public void setStatus(
            Boolean status) {

        this.status =
                status;
    }


    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(
            LocalDateTime createdAt) {

        this.createdAt =
                createdAt;
    }


    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(
            LocalDateTime updatedAt) {

        this.updatedAt =
                updatedAt;
    }


    public Boolean getOnSale() {
        return onSale;
    }

    public void setOnSale(
            Boolean onSale) {

        this.onSale =
                onSale;
    }


    public BigDecimal getSalePrice() {
        return salePrice;
    }

    public void setSalePrice(
            BigDecimal salePrice) {

        this.salePrice =
                salePrice;
    }


    public LocalDateTime getSaleEndDate() {
        return saleEndDate;
    }

    public void setSaleEndDate(
            LocalDateTime saleEndDate) {

        this.saleEndDate =
                saleEndDate;
    }


    public ProductOfferType getOfferType() {
        return offerType;
    }

    public void setOfferType(
            ProductOfferType offerType) {

        this.offerType =
                offerType;
    }


    public Integer getPointsRequired() {
        return pointsRequired;
    }

    public void setPointsRequired(
            Integer pointsRequired) {

        this.pointsRequired =
                pointsRequired;
    }


    public BigDecimal getCashRequired() {
        return cashRequired;
    }

    public void setCashRequired(
            BigDecimal cashRequired) {

        this.cashRequired =
                cashRequired;
    }


    public ProductDisplayType getDisplayType() {
        return displayType;
    }

    public void setDisplayType(
            ProductDisplayType displayType) {

        this.displayType =
                displayType;
    }


    // =========================
    // OFFER NORMALISATION
    //
    // The four offer columns above are the authoritative model, but
    // the pre-existing columns (cardholderPrice, pointsToBeRedeemed)
    // are still what the admin CRUD screens, the product APIs and the
    // React product card read and write. Keeping two representations
    // of the same fact is exactly how data drifts, so this runs on
    // every insert and update and makes them agree:
    //
    //   - offerType null  -> derived from the legacy columns
    //   - cashRequired /
    //     pointsRequired  -> filled from the legacy columns when the
    //                        caller did not set them (i.e. any
    //                        request coming through the existing
    //                        admin APIs, which know nothing about
    //                        the new fields)
    //   - legacy columns  -> written back from the new ones, so a
    //                        caller that DOES set the new fields
    //                        doesn't leave the old ones stale
    //   - displayType     -> always derived from offerType
    //
    // Net effect: existing callers keep working unchanged and cannot
    // produce an inconsistent row, and new callers get the explicit
    // model. There is no combination that leaves the two disagreeing.
    // =========================

    // =========================
    // RESOLVED OFFER (read-only, not a column)
    //
    // Every product-listing endpoint returns this entity as-is, and the
    // listing cards need to know which purchase mode a product is sold
    // under. offer_type alone is not enough: a row written before that
    // column existed still has it NULL, and the card would then fall
    // back to "cash only" and silently hide an offer the Product Details
    // page (which asks PurchaseDecisionEngine, and so derives it) does
    // show - exactly the mismatch this getter removes.
    //
    // Serialize-only, so a POST/PUT body containing it is ignored
    // rather than rejected, and @Transient keeps it out of the schema.
    // =========================

    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public ProductOfferType getResolvedOfferType() {

        if (offerType != null) {
            return offerType;
        }

        return ProductOfferType.derive(
                mrpPrice, cardholderPrice, pointsToBeRedeemed);
    }


    /** Cash per unit under the offer, legacy column as the fallback. */
    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public BigDecimal getResolvedCashRequired() {

        if (cashRequired != null) {
            return cashRequired;
        }

        return cardholderPrice != null ? cardholderPrice : mrpPrice;
    }


    /** Points per unit under the offer, legacy column as the fallback. */
    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public Integer getResolvedPointsRequired() {

        if (pointsRequired != null) {
            return pointsRequired;
        }

        return pointsToBeRedeemed != null ? pointsToBeRedeemed : 0;
    }


    @PrePersist
    @PreUpdate
    public void normaliseOffer() {

        if (offerType == null) {
            offerType = ProductOfferType.derive(
                    mrpPrice, cardholderPrice, pointsToBeRedeemed);
        }

        // Fill the new columns from the legacy ones on first touch.
        if (cashRequired == null) {
            cashRequired = switch (offerType) {
                case FULL_REDEMPTION -> BigDecimal.ZERO;
                case EMCARD_PRICE, PARTIAL_REDEMPTION ->
                        cardholderPrice != null ? cardholderPrice : BigDecimal.ZERO;
                case NORMAL -> mrpPrice != null ? mrpPrice : BigDecimal.ZERO;
            };
        }

        if (pointsRequired == null) {
            pointsRequired = switch (offerType) {
                case FULL_REDEMPTION, PARTIAL_REDEMPTION ->
                        pointsToBeRedeemed != null ? pointsToBeRedeemed : 0;
                case EMCARD_PRICE, NORMAL -> 0;
            };
        }

        // Write the authoritative values back onto the legacy
        // columns so nothing that still reads them goes stale.
        // cardholderPrice is NOT NULL with a positive-only check, so
        // a full redemption (cashRequired = 0) keeps MRP there
        // rather than 0 - which is also what makes
        // ProductOfferType.derive() classify it as points-only.
        if (offerType == ProductOfferType.EMCARD_PRICE
                || offerType == ProductOfferType.PARTIAL_REDEMPTION) {
            cardholderPrice = cashRequired;
        } else if (cardholderPrice == null) {
            cardholderPrice = mrpPrice;
        }

        pointsToBeRedeemed = pointsRequired;

        displayType = ProductDisplayType.forOfferType(offerType);
    }
}