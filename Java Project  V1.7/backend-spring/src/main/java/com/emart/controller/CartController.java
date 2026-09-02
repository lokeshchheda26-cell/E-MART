package com.emart.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.emart.auth.security.CustomUserDetails;
import com.emart.dto.AddCartItemRequestDTO;
import com.emart.dto.CartResponseDTO;
import com.emart.dto.UpdateCartItemRequestDTO;
import com.emart.service.CartService;

import jakarta.validation.Valid;

/**
 * Persisted cart endpoints. Every route requires an authenticated
 * user (falls through to SecurityConfig's `anyRequest().authenticated()`
 * default, same as /api/emcard/**) and always operates on the caller's
 * own cart - userId comes from the JWT principal, never from client
 * input.
 */
@RestController
@RequestMapping("/api/cart")
@CrossOrigin("*")
@Validated
public class CartController {

    private final CartService cartService;


    public CartController(CartService cartService) {
        this.cartService = cartService;
    }


    // =========================
    // GET CURRENT CART
    // GET /api/cart
    // =========================

    @GetMapping
    public ResponseEntity<CartResponseDTO> getCart(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(cartService.getCart(userDetails.getUserId()));
    }


    // =========================
    // ADD ITEM
    // POST /api/cart/items
    // =========================

    @PostMapping("/items")
    public ResponseEntity<CartResponseDTO> addItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AddCartItemRequestDTO request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                cartService.addItem(
                        userDetails.getUserId(),
                        request.getProductId(),
                        request.getQuantity()
                )
        );
    }


    // =========================
    // UPDATE ITEM QUANTITY
    // PUT /api/cart/items/{cartItemId}
    // =========================

    @PutMapping("/items/{cartItemId}")
    public ResponseEntity<CartResponseDTO> updateItemQuantity(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long cartItemId,
            @Valid @RequestBody UpdateCartItemRequestDTO request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                cartService.updateItemQuantity(
                        userDetails.getUserId(),
                        cartItemId,
                        request.getQuantity()
                )
        );
    }


    // =========================
    // REMOVE ITEM
    // DELETE /api/cart/items/{cartItemId}
    // =========================

    @DeleteMapping("/items/{cartItemId}")
    public ResponseEntity<CartResponseDTO> removeItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long cartItemId) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                cartService.removeItem(userDetails.getUserId(), cartItemId));
    }


    // =========================
    // CLEAR CART
    // DELETE /api/cart
    // =========================

    @DeleteMapping
    public ResponseEntity<CartResponseDTO> clearCart(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(cartService.clearCart(userDetails.getUserId()));
    }
}
