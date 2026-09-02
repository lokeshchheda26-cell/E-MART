package com.emart.service;

import com.emart.dto.ForgotPasswordRequestDTO;
import com.emart.dto.LoginRequestDTO;
import com.emart.dto.LoginResponseDTO;
import com.emart.dto.ResetPasswordRequestDTO;
import com.emart.dto.UserRequestDTO;
import com.emart.dto.UserResponseDTO;

public interface AuthService {

    // Register a new user
    UserResponseDTO register(UserRequestDTO request);

    // Login user and return JWT token
    LoginResponseDTO login(LoginRequestDTO request);

    // Generate an OTP, store it (hashed) and email it to the account
    // holder, so they can prove ownership of the email and reset
    // their password.
    void forgotPassword(ForgotPasswordRequestDTO request);

    // Verify the OTP issued by forgotPassword() and, if it is valid
    // and unexpired, set the account's new password.
    void resetPassword(ResetPasswordRequestDTO request);

}