package com.emart.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.emart.auth.security.CustomUserDetails;
import com.emart.dto.EmcardStatusDTO;
import com.emart.dto.EmcardTransactionResponseDTO;
import com.emart.service.EmcardService;

/**
 * EMCard (loyalty points) endpoints.
 *
 * MERGE NOTE: the original prototype accepted userId as a
 * @PathVariable because it had no auth layer yet, with an explicit
 * comment to switch to the authenticated principal once real auth
 * existed. This project already has JWT auth (see AuthController /
 * JwtAuthenticationFilter), so that switch is made here: userId is
 * taken from the authenticated CustomUserDetails principal, never
 * from client input. This satisfies the "no client-side
 * manipulation" requirement - a user can no longer pass another
 * user's id in the URL to read or spend their points. The service
 * layer underneath is unchanged.
 */
@RestController
@RequestMapping("/api/emcard")
@CrossOrigin("*")
public class EmcardController {

    private final EmcardService service;


    public EmcardController(EmcardService service) {
        this.service = service;
    }


    // =========================
    // GET CURRENT BALANCE + SELECTED PRODUCTS
    // GET /api/emcard/summary
    // =========================

    @GetMapping("/summary")
    public ResponseEntity<EmcardStatusDTO> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(service.getSummary(userDetails.getUserId()));
    }


    // =========================
    // CHECK THE EMCARD BOX FOR A PRODUCT
    // (reserve its points, if enough are available)
    // POST /api/emcard/reserve/{productId}
    // =========================

    @PostMapping("/reserve/{productId}")
    public ResponseEntity<EmcardStatusDTO> reserve(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productId,
            @RequestParam(required = false) Integer points) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                service.reserve(userDetails.getUserId(), productId, points));
    }


    // =========================
    // UNCHECK THE EMCARD BOX FOR A PRODUCT
    // (release its reserved points)
    // POST /api/emcard/release/{productId}
    // =========================

    @PostMapping("/release/{productId}")
    public ResponseEntity<EmcardStatusDTO> release(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productId) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
                service.release(userDetails.getUserId(), productId));
    }


    // =========================
    // RELEASE EVERYTHING FOR THIS USER
    // (cart cleared / order placed / resync on page load)
    // POST /api/emcard/reset
    // =========================

    @PostMapping("/reset")
    public ResponseEntity<EmcardStatusDTO> releaseAll(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(service.releaseAll(userDetails.getUserId()));
    }


    // =========================
    // POINTS HISTORY
    // GET /api/emcard/transactions
    //
    // One row per reason the balance changed (redeemed at checkout,
    // earned at checkout, joining credit), each with the balance
    // before and after that movement and the order it belongs to.
    // =========================

    @GetMapping("/transactions")
    public ResponseEntity<List<EmcardTransactionResponseDTO>> getTransactions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(service.getTransactions(userDetails.getUserId()));
    }
}
