package com.emart.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.emart.auth.security.CustomUserDetails;
import com.emart.dto.PaymentVerificationRequestDTO;
import com.emart.dto.RazorpayOrderRequestDTO;
import com.emart.dto.RazorpayOrderResponseDTO;
import com.emart.service.RazorpayService;
import com.razorpay.RazorpayException;

import jakarta.validation.Valid;

/**
 * Razorpay integration for the Payment page's "Card / UPI" methods.
 * Every route requires an authenticated user (falls through to
 * SecurityConfig's `anyRequest().authenticated()` default, same as
 * /api/orders/**) - this only creates/verifies a payment for the
 * caller's own checkout, it never touches the orders table directly.
 * Once verifyPayment returns true, the frontend calls the existing
 * POST /api/orders/checkout to actually place the order.
 */
@RestController
@RequestMapping("/api/payments")
@CrossOrigin("*")
public class PaymentController {

    private final RazorpayService razorpayService;

    public PaymentController(RazorpayService razorpayService) {
        this.razorpayService = razorpayService;
    }


    // =========================
    // CREATE RAZORPAY ORDER
    // POST /api/payments/create-order
    // =========================

    @PostMapping("/create-order")
    public ResponseEntity<RazorpayOrderResponseDTO> createOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody RazorpayOrderRequestDTO request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            RazorpayOrderResponseDTO response = razorpayService.createOrder(
                    request.getAmount(),
                    request.getCurrency(),
                    request.getReceipt());

            return ResponseEntity.ok(response);
        } catch (RazorpayException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    // =========================
    // VERIFY RAZORPAY PAYMENT
    // POST /api/payments/verify
    // =========================

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PaymentVerificationRequestDTO request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean verified = razorpayService.verifyPayment(request);

        if (verified) {
            return ResponseEntity.ok().body("{\"verified\":true}");
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("{\"verified\":false,\"message\":\"Payment verification failed\"}");
    }
}
