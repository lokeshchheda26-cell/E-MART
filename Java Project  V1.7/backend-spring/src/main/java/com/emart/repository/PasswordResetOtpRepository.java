package com.emart.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.emart.entity.PasswordResetOtp;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    // Most recent OTP issued for this email - the only one that
    // resetPassword() ever needs to check against.
    Optional<PasswordResetOtp> findTopByEmailOrderByCreatedAtDesc(String email);

    // Wipes any previously-issued OTP(s) for this email so a fresh
    // "forgot password" request always invalidates older, unused OTPs.
    @Modifying
    @Transactional
    void deleteByEmail(String email);
}
