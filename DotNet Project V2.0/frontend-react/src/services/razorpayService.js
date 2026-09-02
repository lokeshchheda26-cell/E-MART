import api from "../api/axiosConfig";

// POST /api/payments/create-order
// amount must be in the smallest currency unit (paise for INR) -
// callers should pass Math.round(rupees * 100).
export const createRazorpayOrder = ({ amount, currency = "INR", receipt }) =>
  api
    .post("/api/payments/create-order", { amount, currency, receipt })
    .then((res) => res.data);

// POST /api/payments/verify
// body shape matches Razorpay Checkout.js's `handler` callback payload.
export const verifyRazorpayPayment = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) =>
  api
    .post("/api/payments/verify", {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    })
    .then((res) => res.data);
