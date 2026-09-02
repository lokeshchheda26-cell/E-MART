package com.emart.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response payload for GET /api/product/{id}/details
 *
 * Combines Product_Master + Product_Image_Master +
 * (Prod_Dtl_Master joined with Config_Master) into a
 * single object for the Product Details page.
 */
public class ProductDetailsResponseDTO {

    private Long productId;

    private String productName;

    private BigDecimal price;

    // Raw MRP + cardholder/member price, exposed alongside the
    // computed "price" (Regular Price) above so the frontend can
    // show the same eMcard price/checkbox breakdown as the product
    // listing page (CategoryList.jsx) - which price line to label
    // "eMcard" and whether to show it at all depends on both of
    // these, not just the single already-selected "price" value.
    private BigDecimal mrpPrice;

    private BigDecimal cardholderPrice;

    private String description;

    private String brand;

    private String category;

    private Integer stock;

    private Integer points;

    /**
     * NORMAL / EMCARD_PRICE / FULL_REDEMPTION / PARTIAL_REDEMPTION.
     * Collapsed to NORMAL for non-members (Condition 1).
     */
    private String offerType;

    /**
     * What the page may render: MRP_ONLY / MRP_AND_EMCARD_PRICE /
     * MRP_AND_POINTS / MRP_AND_CASH_PLUS_POINTS.
     */
    private String displayType;

    // Total points redeemed against this product across every past
    // order (sum of OrderItem.pointsRedeemed), shown on the Product
    // Details page alongside "Points to Redeem".
    private Integer totalPointsRedeemed;

    // True while this product is on an ACTIVE sale (onSale = true and
    // saleEndDate still in the future - the same rule the homepage
    // Sale Banner uses). eMcard points cannot be redeemed on a
    // product that is already discounted by a sale, so the Product
    // Details page uses this to disable the eMcard checkbox.
    private Boolean onSale;

    // =========================
    // PURCHASE MODE (Mode 1..4)
    //
    // The mode that applies to THIS viewer, resolved server-side by
    // PurchaseDecisionEngine, plus every figure the page needs to render
    // it. "The frontend should never guess the purchase mode" - so it
    // does not: it prints these.
    //
    //   CASH_ONLY           -> price only
    //   EMCARD_DISCOUNT     -> mrpPrice, emcardCashPrice, emcardSavings, checkbox
    //   FULL_REDEMPTION     -> pointsRequired ("Redeem using EMCard Points")
    //   PARTIAL_REDEMPTION  -> emcardCashPrice + pointsRequired
    // =========================

    private String purchaseMode;

    private String purchaseModeLabel;

    private Integer purchaseModeNumber;

    /** Cash under the eMCard offer (modes 2 and 4); 0 otherwise. */
    private BigDecimal emcardCashPrice;

    /** Points under the eMCard offer (modes 3 and 4); 0 otherwise. */
    private Integer pointsRequired;

    /** price - emcardCashPrice, when the mode has a cash discount. */
    private BigDecimal emcardSavings;

    /** True for mode 2 only - the one mode with an opt-in checkbox. */
    private Boolean pointsOptional;

    /** False for mode 3 (no cash paid, so nothing to earn on). */
    private Boolean earnsPoints;

    /**
     * The loyalty earn rate as a percentage string ("10"), straight from
     * LoyaltyPolicy, so the product page can show how many points THIS
     * purchase will earn without hardcoding the rate. Null for a
     * non-member, who earns nothing (Condition 1).
     */
    private String earnRatePercent;

    private List<String> images;

    private List<ProductSpecificationDTO> specifications;


    // =========================
    // DEFAULT CONSTRUCTOR
    // =========================

    public ProductDetailsResponseDTO() {
    }


    // =========================
    // ALL-ARGS CONSTRUCTOR
    // =========================

    public ProductDetailsResponseDTO(
            Long productId,
            String productName,
            BigDecimal price,
            String description,
            String brand,
            String category,
            Integer stock,
            Integer points,
            List<String> images,
            List<ProductSpecificationDTO> specifications) {

        this.productId = productId;
        this.productName = productName;
        this.price = price;
        this.description = description;
        this.brand = brand;
        this.category = category;
        this.stock = stock;
        this.points = points;
        this.images = images;
        this.specifications = specifications;
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


    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }


    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
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


    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }


    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }


    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }


    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }


    public String getOfferType() {
        return offerType;
    }

    public void setOfferType(String offerType) {
        this.offerType = offerType;
    }

    public String getDisplayType() {
        return displayType;
    }

    public void setDisplayType(String displayType) {
        this.displayType = displayType;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }


    public Integer getTotalPointsRedeemed() {
        return totalPointsRedeemed;
    }

    public void setTotalPointsRedeemed(Integer totalPointsRedeemed) {
        this.totalPointsRedeemed = totalPointsRedeemed;
    }


    public Boolean getOnSale() {
        return onSale;
    }

    public void setOnSale(Boolean onSale) {
        this.onSale = onSale;
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

    public BigDecimal getEmcardCashPrice() {
        return emcardCashPrice;
    }

    public void setEmcardCashPrice(BigDecimal emcardCashPrice) {
        this.emcardCashPrice = emcardCashPrice;
    }

    public Integer getPointsRequired() {
        return pointsRequired;
    }

    public void setPointsRequired(Integer pointsRequired) {
        this.pointsRequired = pointsRequired;
    }

    public BigDecimal getEmcardSavings() {
        return emcardSavings;
    }

    public void setEmcardSavings(BigDecimal emcardSavings) {
        this.emcardSavings = emcardSavings;
    }

    public Boolean getPointsOptional() {
        return pointsOptional;
    }

    public void setPointsOptional(Boolean pointsOptional) {
        this.pointsOptional = pointsOptional;
    }

    public Boolean getEarnsPoints() {
        return earnsPoints;
    }

    public void setEarnsPoints(Boolean earnsPoints) {
        this.earnsPoints = earnsPoints;
    }

    public String getEarnRatePercent() {
        return earnRatePercent;
    }

    public void setEarnRatePercent(String earnRatePercent) {
        this.earnRatePercent = earnRatePercent;
    }


    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }


    public List<ProductSpecificationDTO> getSpecifications() {
        return specifications;
    }

    public void setSpecifications(
            List<ProductSpecificationDTO> specifications) {

        this.specifications = specifications;
    }
}
