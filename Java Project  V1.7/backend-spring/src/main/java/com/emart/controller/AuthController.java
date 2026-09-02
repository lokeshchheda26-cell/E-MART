package com.emart.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.emart.dto.ForgotPasswordRequestDTO;
import com.emart.dto.LoginRequestDTO;
import com.emart.dto.LoginResponseDTO;
import com.emart.dto.ResetPasswordRequestDTO;
import com.emart.dto.UserRequestDTO;
import com.emart.dto.UserResponseDTO;
import com.emart.auth.security.CustomUserDetails;
import com.emart.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * Register a new customer
     * POST: /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> register(
            @Valid @RequestBody UserRequestDTO request) {

        UserResponseDTO response = authService.register(request);

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Login user
     * POST: /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(
            @Valid @RequestBody LoginRequestDTO request) {

        LoginResponseDTO response = authService.login(request);

        return ResponseEntity.ok(response);
    }

    /**
     * Get current logged-in user's info.
     * Works for both normal login and Google login, since both
     * produce the same JWT format.
     * GET: /api/auth/me   (needs "Authorization: Bearer <token>" header)
     */
    @GetMapping("/me")
    public ResponseEntity<LoginResponseDTO> me(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        LoginResponseDTO response = new LoginResponseDTO();

        response.setUserId(userDetails.getUserId());
        response.setFirstName(userDetails.getFirstName());
        response.setLastName(userDetails.getLastName());
        response.setEmail(userDetails.getEmail());
        response.setRole(userDetails.getUser().getRole().name());
        response.setIsEmcardMember(
                Boolean.TRUE.equals(userDetails.getUser().getIsEmcardMember()));

        return ResponseEntity.ok(response);
    }

    /**
     * Step 1 of forgot-password: send an OTP to the account's email.
     * POST: /api/auth/forgot-password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {

        authService.forgotPassword(request);

        Map<String, String> response = new HashMap<>();
        response.put("message", "An OTP has been sent to your email address.");

        return ResponseEntity.ok(response);
    }

    /**
     * Step 2 of forgot-password: verify the OTP and set a new password.
     * POST: /api/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO request) {

        authService.resetPassword(request);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Your password has been reset successfully.");

        return ResponseEntity.ok(response);
    }

}