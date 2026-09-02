package com.emart.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * The three fields Razorpay Checkout.js hands back in its `handler`
 * callback on a successful payment. The signature is what actually
 * proves the payment is genuine (see RazorpayService#verifyPayment) -
 * the order/payment ids alone are not trustworthy on their own since
 * they're visible in the browser.
 */
public class PaymentVerificationRequestDTO {

    @NotBlank(message = "razorpayOrderId is required")
    private String razorpayOrderId;

    @NotBlank(message = "razorpayPaymentId is required")
    private String razorpayPaymentId;

    @NotBlank(message = "razorpaySignature is required")
    private String razorpaySignature;

    public PaymentVerificationRequestDTO() {
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public void setRazorpayOrderId(String razorpayOrderId) {
        this.razorpayOrderId = razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(String razorpayPaymentId) {
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public String getRazorpaySignature() {
        return razorpaySignature;
    }

    public void setRazorpaySignature(String razorpaySignature) {
        this.razorpaySignature = razorpaySignature;
    }
}
