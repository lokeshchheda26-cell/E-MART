package com.emart.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

/**
 * One row per forgot-password OTP request.
 *
 * The OTP itself is never stored in plain text - only a bcrypt hash of
 * it (via the existing PasswordEncoder bean), mirroring how user
 * passwords are stored. Each row is single-use (see {@link #used}) and
 * time-boxed (see {@link #expiryTime}); AuthServiceImpl deletes any
 * older rows for the same email before issuing a new OTP so only the
 * most recent request is ever valid.
 */
@Entity
@Table(name = "password_reset_otp")
public class PasswordResetOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "expiry_time", nullable = false)
    private LocalDateTime expiryTime;

    @Column(name = "used", nullable = false)
    private Boolean used = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public PasswordResetOtp() {
    }

    public PasswordResetOtp(String email, String otpHash, LocalDateTime expiryTime) {
        this.email = email;
        this.otpHash = otpHash;
        this.expiryTime = expiryTime;
        this.used = false;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public void setOtpHash(String otpHash) {
        this.otpHash = otpHash;
    }

    public LocalDateTime getExpiryTime() {
        return expiryTime;
    }

    public void setExpiryTime(LocalDateTime expiryTime) {
        this.expiryTime = expiryTime;
    }

    public Boolean getUsed() {
        return used;
    }

    public void setUsed(Boolean used) {
        this.used = used;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
