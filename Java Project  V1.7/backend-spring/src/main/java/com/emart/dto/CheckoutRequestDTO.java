package com.emart.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * What the Checkout page submits. `deliveryOption` is a plain string
 * ("COURIER" or "PICKUP") rather than the enum type directly, so a
 * bad/unknown value fails with a clean validation-style message
 * instead of a Jackson deserialization stack trace.
 */
public class CheckoutRequestDTO {

    @NotBlank(message = "Delivery option is required")
    private String deliveryOption;

    // Required when deliveryOption = COURIER. Falls back to the
    // user's profile address if left blank.
    private String shippingAddress;

    // Only meaningful when deliveryOption = PICKUP (BRD: "Select
    // Store" - optional/low priority, kept as a free-text field
    // rather than a full store lookup).
    private String storeLocation;

    public CheckoutRequestDTO() {
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
}
