package com.emart.service;

import com.emart.dto.PaymentVerificationRequestDTO;
import com.emart.dto.RazorpayOrderResponseDTO;
import com.razorpay.RazorpayException;

public interface RazorpayService {

    RazorpayOrderResponseDTO createOrder(int amount, String currency, String receipt)
            throws RazorpayException;

    boolean verifyPayment(PaymentVerificationRequestDTO request);
}
