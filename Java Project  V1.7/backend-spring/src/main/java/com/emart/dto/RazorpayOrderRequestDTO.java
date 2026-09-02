package com.emart.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * What the Payment page sends to open a Razorpay checkout for the
 * current cart. `amount` must already be in the smallest currency
 * unit (paise for INR) - the frontend multiplies the rupee total by
 * 100 before calling this endpoint.
 */
public class RazorpayOrderRequestDTO {

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    private Integer amount;

    @NotBlank(message = "Currency is required")
    private String currency = "INR";

    @NotBlank(message = "Receipt is required")
    private String receipt;

    public RazorpayOrderRequestDTO() {
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReceipt() {
        return receipt;
    }

    public void setReceipt(String receipt) {
        this.receipt = receipt;
    }
}
