package com.emart.controller;

import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.emart.auth.security.CustomUserDetails;
import com.emart.dto.CheckoutRequestDTO;
import com.emart.dto.OrderResponseDTO;
import com.emart.service.OrderService;
import com.emart.service.PdfInvoiceService;

import jakarta.validation.Valid;

/**
 * Checkout + order/invoice endpoints. Every route requires an
 * authenticated user (falls through to SecurityConfig's
 * `anyRequest().authenticated()` default) and always operates on the
 * caller's own cart/orders - userId comes from the JWT principal.
 */
@RestController
@RequestMapping("/api/orders")
@CrossOrigin("*")
public class OrderController {

    private final OrderService orderService;
    private final PdfInvoiceService pdfInvoiceService;


    public OrderController(
            OrderService orderService,
            PdfInvoiceService pdfInvoiceService) {

        this.orderService = orderService;
        this.pdfInvoiceService = pdfInvoiceService;
    }


    // =========================
    // CHECKOUT (cart -> order)
    // POST /api/orders/checkout
    // =========================

    @PostMapping("/checkout")
    public ResponseEntity<OrderResponseDTO> checkout(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CheckoutRequestDTO request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                orderService.checkout(userDetails.getUserId(), request));
    }


    // =========================
    // ORDER HISTORY
    // GET /api/orders
    // =========================

    @GetMapping
    public ResponseEntity<List<OrderResponseDTO>> getOrderHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                orderService.getOrderHistory(userDetails.getUserId()));
    }


    // =========================
    // SINGLE ORDER / INVOICE
    // GET /api/orders/{orderId}
    // =========================

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponseDTO> getOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long orderId) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                orderService.getOrder(userDetails.getUserId(), orderId));
    }


    // =========================
    // DOWNLOAD INVOICE AS PDF
    // GET /api/orders/{orderId}/invoice/pdf
    // =========================

    @GetMapping("/{orderId}/invoice/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long orderId) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        OrderResponseDTO order = orderService.getOrder(userDetails.getUserId(), orderId);
        byte[] pdfBytes = pdfInvoiceService.generateInvoicePdf(order);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename("eMart-Invoice-" + orderId + ".pdf")
                        .build()
        );

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
