package com.emart.serviceimpl;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.emart.dto.ForgotPasswordRequestDTO;
import com.emart.dto.LoginRequestDTO;
import com.emart.dto.LoginResponseDTO;
import com.emart.dto.ResetPasswordRequestDTO;
import com.emart.dto.UserRequestDTO;
import com.emart.dto.UserResponseDTO;
import com.emart.entity.EmcardAccount;
import com.emart.entity.EmcardTransaction;
import com.emart.entity.EmcardTransactionType;
import com.emart.entity.PasswordResetOtp;
import com.emart.entity.Role;
import com.emart.entity.User;
import com.emart.repository.EmcardAccountRepository;
import com.emart.repository.EmcardTransactionRepository;
import com.emart.repository.PasswordResetOtpRepository;
import com.emart.repository.UserRepository;
import com.emart.auth.security.JwtService;
import com.emart.service.AuthService;
import com.emart.service.EmailService;

@Service
public class AuthServiceImpl implements AuthService {

    // OTP is a 6-digit code, valid for 10 minutes from issue.
    private static final int OTP_VALID_MINUTES = 10;

    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private EmcardAccountRepository emcardAccountRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordResetOtpRepository passwordResetOtpRepository;

    @Autowired
    private EmcardTransactionRepository emcardTransactionRepository;

    @Override
    public UserResponseDTO register(UserRequestDTO request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists.");
        }

        User user = new User();

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());

        // Encrypt Password
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        user.setGender(request.getGender());
        user.setDob(request.getDob());

        user.setRole(Role.CUSTOMER);

        user.setIsEmcardMember(request.getIsEmcardMember());

        if (Boolean.TRUE.equals(request.getIsEmcardMember())) {
            user.setEmcardPoints(100);
        } else {
            user.setEmcardPoints(0);
        }

        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);

        // MERGE: wire the new EMCard redemption ledger (EmcardAccount)
        // to real user registration instead of the prototype's
        // hard-coded demo seed. EmcardAccount.totalPoints becomes the
        // authoritative redeemable balance checked by EmcardService;
        // user.emcardPoints above is left untouched for backward
        // compatibility with existing profile/registration display.
        if (Boolean.TRUE.equals(savedUser.getIsEmcardMember())) {
            emcardAccountRepository.save(
                    new EmcardAccount(
                            savedUser.getUserId(),
                            savedUser.getEmcardPoints()));

            // Open the points ledger with the joining credit, so the
            // customer's history starts from a real record instead of
            // an unexplained opening balance.
            emcardTransactionRepository.save(
                    new EmcardTransaction(
                            savedUser.getUserId(),
                            null,
                            EmcardTransactionType.CREDIT_INITIAL,
                            savedUser.getEmcardPoints(),
                            0,
                            savedUser.getEmcardPoints()));
        }

        // Registration is fully committed at this point (user row +
        // EMCard account, if applicable, both saved) - safe to fire
        // the welcome email now.
        emailService.sendWelcomeEmail(
                savedUser.getEmail(), savedUser.getFirstName());

        UserResponseDTO response = new UserResponseDTO();

        response.setUserId(savedUser.getUserId());
        response.setFirstName(savedUser.getFirstName());
        response.setLastName(savedUser.getLastName());
        response.setEmail(savedUser.getEmail());
        response.setPhone(savedUser.getPhone());
        response.setAddress(savedUser.getAddress());
        response.setGender(savedUser.getGender());
        response.setDob(savedUser.getDob());
        response.setRole(savedUser.getRole());
        response.setIsEmcardMember(savedUser.getIsEmcardMember());
        response.setEmcardPoints(savedUser.getEmcardPoints());
        response.setCreatedAt(savedUser.getCreatedAt());

        return response;
    }

    @Override
    public LoginResponseDTO login(LoginRequestDTO request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtService.generateToken(user.getEmail());

        LoginResponseDTO response = new LoginResponseDTO();

        response.setToken(token);
        response.setType("Bearer");
        response.setUserId(user.getUserId());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole().name());
        response.setIsEmcardMember(
                Boolean.TRUE.equals(user.getIsEmcardMember()));

        return response;
    }


    // =========================
    // FORGOT PASSWORD (send OTP)
    // =========================

    @Override
    public void forgotPassword(ForgotPasswordRequestDTO request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found with this email."));

        // Invalidate any OTP(s) already issued for this email - only
        // the newest one should ever be usable.
        passwordResetOtpRepository.deleteByEmail(user.getEmail());

        String otp = generateOtp();

        PasswordResetOtp resetOtp = new PasswordResetOtp(
                user.getEmail(),
                passwordEncoder.encode(otp),
                LocalDateTime.now().plusMinutes(OTP_VALID_MINUTES));

        passwordResetOtpRepository.save(resetOtp);

        emailService.sendPasswordResetOtpEmail(
                user.getEmail(), user.getFirstName(), otp);
    }


    // =========================
    // RESET PASSWORD (verify OTP)
    // =========================

    @Override
    public void resetPassword(ResetPasswordRequestDTO request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found with this email."));

        PasswordResetOtp resetOtp = passwordResetOtpRepository
                .findTopByEmailOrderByCreatedAtDesc(user.getEmail())
                .orElseThrow(() -> new RuntimeException(
                        "No OTP request found. Please request a new OTP."));

        if (Boolean.TRUE.equals(resetOtp.getUsed())) {
            throw new RuntimeException(
                    "This OTP has already been used. Please request a new one.");
        }

        if (resetOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException(
                    "OTP has expired. Please request a new one.");
        }

        if (request.getOtp() == null
                || !passwordEncoder.matches(request.getOtp(), resetOtp.getOtpHash())) {
            throw new RuntimeException("Invalid OTP.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Single-use: mark it spent so it cannot be replayed.
        resetOtp.setUsed(true);
        passwordResetOtpRepository.save(resetOtp);
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }
}