package com.emart.dto;

/**
 * Represents a single specification (config name + value)
 * shown on the Product Details page.
 * e.g. { "configName": "RAM", "configValue": "8 GB" }
 */
public class ProductSpecificationDTO {

    private String configName;

    private String configValue;


    // =========================
    // CONSTRUCTORS
    // =========================

    public ProductSpecificationDTO() {
    }

    public ProductSpecificationDTO(
            String configName,
            String configValue) {

        this.configName = configName;
        this.configValue = configValue;
    }


    // =========================
    // GETTERS AND SETTERS
    // =========================

    public String getConfigName() {
        return configName;
    }

    public void setConfigName(String configName) {
        this.configName = configName;
    }


    public String getConfigValue() {
        return configValue;
    }

    public void setConfigValue(String configValue) {
        this.configValue = configValue;
    }
}
