package com.emart.serviceimpl;

import java.math.BigDecimal;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

import com.emart.entity.OrderItem;
import com.emart.entity.Orders;
import com.emart.service.EmailService;

/**
 * Sends the two transactional emails the app currently needs:
 * registration welcome mail and order confirmation mail.
 *
 * Both methods intentionally catch and log every exception instead
 * of letting it propagate - a missing/misconfigured SMTP account
 * (spring.mail.username/password are blank by default, see
 * application.properties) or a transient send failure must never
 * roll back registration or checkout, which are the real
 * transactions this is attached to.
 */
@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log =
            LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    // Real SMTP relays (Brevo, SendGrid, etc.) reject/bounce mail
    // sent with no "From" address - sandboxes like Mailtrap didn't
    // care, which is why this wasn't needed until now. Defaults to
    // the SMTP account's own username, which is what most providers
    // expect as the verified sender identity; override with
    // MAIL_FROM if a different verified "from" address is set up.
    @Value("${MAIL_FROM:${spring.mail.username:}}")
    private String fromAddress;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }


    // =========================
    // REGISTRATION WELCOME MAIL
    // =========================

    @Override
    public void sendWelcomeEmail(String toEmail, String firstName) {

        if (toEmail == null || toEmail.isBlank()) {
            return;
        }

        try {
            String name = (firstName != null && !firstName.isBlank())
                    ? firstName
                    : "there";

            SimpleMailMessage message = new SimpleMailMessage();
            if (fromAddress != null && !fromAddress.isBlank()) {
                message.setFrom(fromAddress);
            }
            message.setTo(toEmail);
            message.setSubject("Welcome to online e-Mart store");
            message.setText(
                    "Hi " + name + ",\n\n"
                    + "Welcome to online e-Mart store! Your account has been "
                    + "created successfully and you're all set to start "
                    + "shopping.\n\n"
                    + "Happy shopping!\n"
                    + "- The eMart Team"
            );

            mailSender.send(message);
            log.info("Welcome email sent to {}", toEmail);

        } catch (Exception ex) {
            // Log the full exception (incl. nested cause) - the top-
            // level message alone (e.g. "Authentication failed") hides
            // the actual SMTP server response needed to diagnose why.
            log.error(
                "Failed to send welcome email to {}: {}",
                toEmail, ex.toString(), ex
            );
        }
    }


    // =========================
    // FORGOT PASSWORD OTP MAIL
    // =========================

    // NOTE: unlike the welcome/order mails above, a failed send here
    // is NOT swallowed. Those two are best-effort notifications about
    // something that already succeeded (registration/checkout); this
    // one IS the deliverable - if it doesn't go out, the user has no
    // way to get their OTP, so the caller (AuthServiceImpl) needs to
    // know it failed instead of getting a false "OTP sent" response.
    @Override
    public void sendPasswordResetOtpEmail(String toEmail, String firstName, String otp) {

        if (toEmail == null || toEmail.isBlank()) {
            throw new RuntimeException("Cannot send OTP: no email address on file.");
        }

        try {
            String name = (firstName != null && !firstName.isBlank())
                    ? firstName
                    : "there";

            SimpleMailMessage message = new SimpleMailMessage();
            if (fromAddress != null && !fromAddress.isBlank()) {
                message.setFrom(fromAddress);
            }
            message.setTo(toEmail);
            message.setSubject("Your eMart password reset OTP");
            message.setText(
                    "Hi " + name + ",\n\n"
                    + "Use the OTP below to reset your eMart account password:\n\n"
                    + "    " + otp + "\n\n"
                    + "This OTP is valid for 10 minutes and can be used only "
                    + "once. If you didn't request a password reset, you can "
                    + "safely ignore this email.\n\n"
                    + "- The eMart Team"
            );

            mailSender.send(message);
            log.info("Password reset OTP email sent to {}", toEmail);

        } catch (Exception ex) {
            log.error(
                "Failed to send password reset OTP email to {}: {}",
                toEmail, ex.toString(), ex
            );
            throw new RuntimeException(
                    "Failed to send OTP email. Please try again in a moment.");
        }
    }


    // =========================
    // ORDER CONFIRMATION MAIL
    // =========================

    @Override
    public void sendOrderConfirmationEmail(
            String toEmail,
            String customerName,
            Orders order,
            List<OrderItem> orderItems,
            byte[] invoicePdf) {

        if (toEmail == null || toEmail.isBlank()) {
            return;
        }

        try {
            String name = (customerName != null && !customerName.isBlank())
                    ? customerName
                    : "there";

            StringBuilder body = new StringBuilder();
            body.append("Hi ").append(name).append(",\n\n");
            body.append("Thank you for your order! Here are your order details:\n\n");
            body.append("Order ID: ").append(order.getOrderId()).append("\n\n");

            if (orderItems != null) {
                for (OrderItem item : orderItems) {
                    BigDecimal lineTotal = item.getLineTotal() != null
                            ? item.getLineTotal()
                            : BigDecimal.ZERO;

                    body.append("- ")
                            .append(item.getProductNameSnapshot())
                            .append("  x")
                            .append(item.getQuantity())
                            .append("  @ Rs. ")
                            .append(item.getUnitPrice())
                            .append("  = Rs. ")
                            .append(lineTotal)
                            .append("\n");
                }
            }

            body.append("\nTotal Amount: Rs. ")
                    .append(order.getPayableTotal())
                    .append("\n\n");
            body.append("We'll notify you once your order is on its way.\n\n");
            body.append("Thank you for shopping with us!\n");
            body.append("- The eMart Team");

            String subject =
                    "Your eMart Order Confirmation - Order #" + order.getOrderId();

            if (invoicePdf != null && invoicePdf.length > 0) {
                // Attachments need a MIME message - SimpleMailMessage
                // is text-only. multipart=true is what lets the body
                // and the PDF part coexist.
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper =
                        new MimeMessageHelper(message, true, "UTF-8");

                if (fromAddress != null && !fromAddress.isBlank()) {
                    helper.setFrom(fromAddress);
                }
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(body.toString());
                helper.addAttachment(
                        "eMart-Invoice-" + order.getOrderId() + ".pdf",
                        new ByteArrayResource(invoicePdf),
                        "application/pdf"
                );

                mailSender.send(message);

            } else {
                SimpleMailMessage message = new SimpleMailMessage();
                if (fromAddress != null && !fromAddress.isBlank()) {
                    message.setFrom(fromAddress);
                }
                message.setTo(toEmail);
                message.setSubject(subject);
                message.setText(body.toString());

                mailSender.send(message);
            }

            log.info(
                "Order confirmation email sent to {} for order #{} (invoice attached: {})",
                toEmail, order.getOrderId(),
                invoicePdf != null && invoicePdf.length > 0
            );

        } catch (Exception ex) {
            log.error(
                "Failed to send order confirmation email to {}: {}",
                toEmail, ex.toString(), ex
            );
        }
    }
}
