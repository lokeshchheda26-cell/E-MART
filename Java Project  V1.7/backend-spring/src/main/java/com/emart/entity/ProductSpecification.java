package com.emart.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Stores the specification value for a product against a
 * specific config (e.g. Product 10 -> RAM -> "8 GB").
 *
 * Table: prod_dtl_master
 *
 * Product_Master (1) ------ (*) Prod_Dtl_Master
 * Config_Master  (1) ------ (*) Prod_Dtl_Master
 */
@Entity
@Table(name = "prod_dtl_master")
public class ProductSpecification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prod_dtl_id")
    private Long prodDtlId;


    // =========================
    // PRODUCT (FK)
    // =========================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prod_id", nullable = false)
    @NotNull(message = "Product is required")
    private Product product;


    // =========================
    // CONFIG (FK)
    // =========================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false)
    @NotNull(message = "Config is required")
    private Config config;


    // =========================
    // CONFIG VALUE
    // =========================

    @NotBlank(message = "Config value is required")
    @Column(name = "config_value", nullable = false, length = 255)
    private String configValue;


    // =========================
    // DEFAULT CONSTRUCTOR
    // =========================

    public ProductSpecification() {
    }


    // =========================
    // GETTERS AND SETTERS
    // =========================

    public Long getProdDtlId() {
        return prodDtlId;
    }

    public void setProdDtlId(Long prodDtlId) {
        this.prodDtlId = prodDtlId;
    }


    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }


    public Config getConfig() {
        return config;
    }

    public void setConfig(Config config) {
        this.config = config;
    }


    public String getConfigValue() {
        return configValue;
    }

    public void setConfigValue(String configValue) {
        this.configValue = configValue;
    }
}
