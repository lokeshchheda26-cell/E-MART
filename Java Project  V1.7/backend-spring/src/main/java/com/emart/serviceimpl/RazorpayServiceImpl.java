package com.emart.serviceimpl;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.emart.dto.PaymentVerificationRequestDTO;
import com.emart.dto.RazorpayOrderResponseDTO;
import com.emart.service.RazorpayService;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;

@Service
public class RazorpayServiceImpl implements RazorpayService {

    @Value("${razorpay.api.key}")
    private String apiKey;

    @Value("${razorpay.api.secret}")
    private String apiSecret;

    @Override
    public RazorpayOrderResponseDTO createOrder(int amount, String currency, String receipt)
            throws RazorpayException {

        RazorpayClient razorpayClient = new RazorpayClient(apiKey, apiSecret);

        JSONObject orderRequest = new JSONObject();
        // Amount must already be in the smallest currency unit (paise for INR).
        orderRequest.put("amount", amount);
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", receipt);

        Order order = razorpayClient.orders.create(orderRequest);

        RazorpayOrderResponseDTO response = new RazorpayOrderResponseDTO();
        response.setOrderId(order.get("id").toString());
        response.setAmount(Integer.parseInt(order.get("amount").toString()));
        response.setCurrency(order.get("currency").toString());
        response.setReceipt(order.get("receipt").toString());
        response.setStatus(order.get("status").toString());

        return response;
    }

    @Override
    public boolean verifyPayment(PaymentVerificationRequestDTO request) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getRazorpayOrderId());
            options.put("razorpay_payment_id", request.getRazorpayPaymentId());
            options.put("razorpay_signature", request.getRazorpaySignature());

            // Recomputes HMAC-SHA256(order_id + "|" + payment_id, key_secret) and
            // compares it to the signature Checkout.js returned - this is what
            // actually proves the payment came from Razorpay and wasn't spoofed
            // in the browser.
            return Utils.verifyPaymentSignature(options, apiSecret);
        } catch (RazorpayException e) {
            return false;
        }
    }
}
