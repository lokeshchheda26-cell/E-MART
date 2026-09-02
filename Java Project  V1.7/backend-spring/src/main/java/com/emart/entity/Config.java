package com.emart.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

/**
 * Master list of specification/configuration names
 * that can be attached to a product (RAM, Storage, Color, etc).
 *
 * Table: config_master
 */
@Entity
@Table(name = "config_master")
public class Config {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "config_id")
    private Integer configId;


    // =========================
    // CONFIG NAME
    // =========================

    @NotBlank(message = "Config name is required")
    @Column(name = "config_name", nullable = false, length = 100, unique = true)
    private String configName;


    // =========================
    // DEFAULT CONSTRUCTOR
    // =========================

    public Config() {
    }


    // =========================
    // GETTERS AND SETTERS
    // =========================

    public Integer getConfigId() {
        return configId;
    }

    public void setConfigId(Integer configId) {
        this.configId = configId;
    }


    public String getConfigName() {
        return configName;
    }

    public void setConfigName(String configName) {
        this.configName = configName;
    }
}
