package com.emart.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response payload for GET /api/product/sale-random.
 *
 * Powers the homepage Sale Banner: a single randomly-picked product
 * that is currently on sale, along with everything the banner needs
 * to render without a second round-trip (image, name, discounted
 * price, original price for the strikethrough, sale end date for the
 * countdown, and a pre-computed discount percentage).
 */
public class ProductSaleResponseDTO {

    private Long productId;

    private String productName;

    private String productImagePath;

    // Original price, shown struck through (falls back to
    // cardholderPrice on the off chance mrpPrice is somehow blank).
    private BigDecimal originalPrice;

    // Discounted price shown during the sale (falls back to
    // cardholderPrice if a dedicated salePrice was never set).
    private BigDecimal discountedPrice;

    private Integer discountPercent;

    private LocalDateTime saleEndDate;


    // =========================
    // DEFAULT CONSTRUCTOR
    // =========================

    public ProductSaleResponseDTO() {
    }


    // =========================
    // ALL-ARGS CONSTRUCTOR
    // =========================

    public ProductSaleResponseDTO(
            Long productId,
            String productName,
            String productImagePath,
            BigDecimal originalPrice,
            BigDecimal discountedPrice,
            Integer discountPercent,
            LocalDateTime saleEndDate) {

        this.productId = productId;
        this.productName = productName;
        this.productImagePath = productImagePath;
        this.originalPrice = originalPrice;
        this.discountedPrice = discountedPrice;
        this.discountPercent = discountPercent;
        this.saleEndDate = saleEndDate;
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


    public String getProductImagePath() {
        return productImagePath;
    }

    public void setProductImagePath(String productImagePath) {
        this.productImagePath = productImagePath;
    }


    public BigDecimal getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(BigDecimal originalPrice) {
        this.originalPrice = originalPrice;
    }


    public BigDecimal getDiscountedPrice() {
        return discountedPrice;
    }

    public void setDiscountedPrice(BigDecimal discountedPrice) {
        this.discountedPrice = discountedPrice;
    }


    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Integer discountPercent) {
        this.discountPercent = discountPercent;
    }


    public LocalDateTime getSaleEndDate() {
        return saleEndDate;
    }

    public void setSaleEndDate(LocalDateTime saleEndDate) {
        this.saleEndDate = saleEndDate;
    }
}
