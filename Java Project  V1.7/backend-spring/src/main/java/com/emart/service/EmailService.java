package com.emart.service;

import java.util.List;

import com.emart.entity.OrderItem;
import com.emart.entity.Orders;

/**
 * Transactional email notifications.
 *
 * Currently covers:
 *  - Registration welcome mail (sent once, right after a new account
 *    is created).
 *  - Order confirmation mail (sent once, right after checkout
 *    completes), listing every product/price/quantity on the order
 *    plus the final payable total, with the PDF invoice attached.
 *  - Forgot-password OTP mail (sent once per forgot-password request),
 *    carrying the one-time code needed to reset the account password.
 */
public interface EmailService {

    void sendWelcomeEmail(String toEmail, String firstName);

    /**
     * @param otp the plain 6-digit one-time code (never persisted in
     *            plain text - only its hash is stored server-side).
     */
    void sendPasswordResetOtpEmail(String toEmail, String firstName, String otp);

    /**
     * @param invoicePdf rendered PDF invoice to attach, or null to
     *                   send the plain-text summary on its own (e.g.
     *                   if invoice generation failed - a broken PDF
     *                   must not cost the customer their receipt).
     */
    void sendOrderConfirmationEmail(
            String toEmail,
            String customerName,
            Orders order,
            List<OrderItem> orderItems,
            byte[] invoicePdf);
}
