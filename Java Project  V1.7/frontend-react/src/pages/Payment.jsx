import { useState } from "react";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { checkout } from "../services/orderService";
import { createRazorpayOrder, verifyRazorpayPayment } from "../services/razorpayService";
import useRazorpayScript from "../hooks/useRazorpayScript";
import { formatCurrency } from "../utils/format";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

function randomReceipt() {
  return `EMART-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Payment.jsx
 * ------------------------------------------------------------------
 * Step 2 of Checkout -> Payment -> Invoice.
 *
 * CARD / UPI open a real Razorpay Checkout popup: we create a
 * Razorpay order for the cart total, let the user pay, verify the
 * signature server-side, and only then call the real
 * POST /api/orders/checkout with the delivery details chosen on the
 * Checkout page (passed via router state so refreshing this page
 * doesn't silently resubmit). COD skips the gateway entirely and
 * goes straight to checkout, same as before.
 *
 * If someone lands here directly (no state - e.g. a bookmark or a
 * refresh) they're sent back to /checkout to choose delivery options
 * again, rather than risk placing an order with missing details.
 * ------------------------------------------------------------------
 */
export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    cartPayableTotal,
    cartItems,
    cartPointsToRedeem,
    refreshCart,
  } = useCart();
  const { user } = useAuth();
  const razorpayReady = useRazorpayScript();

  const [method, setMethod] = useState("CARD");
  const [placing, setPlacing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const checkoutDetails = location.state;

  if (!checkoutDetails || !checkoutDetails.deliveryOption) {
    return <Navigate to="/checkout" replace />;
  }

  // Finalizes the order in our own backend - shared by the COD path
  // and the post-payment-verified Razorpay path.
  const placeOrder = async () => {
    const response = await checkout(checkoutDetails);
    const order = response.data;

    // The backend already cleared the cart and any EMCard
    // reservations as part of checkout - refresh the shared
    // CartContext so the header badge/drawer reflect that
    // immediately instead of showing stale items.
    await refreshCart();

    navigate(`/orders/${order.orderId}`, { replace: true });
  };

  const payWithRazorpay = async () => {
    if (!razorpayReady) {
      throw new Error("Payment gateway is still loading. Please try again in a moment.");
    }
    if (!RAZORPAY_KEY_ID) {
      throw new Error("Payment gateway isn't configured. Please try again later.");
    }

    setStatusMessage("Creating order...");
    const razorpayOrder = await createRazorpayOrder({
      amount: Math.round(cartPayableTotal * 100), // paise
      currency: "INR",
      receipt: randomReceipt(),
    });

    setStatusMessage("Opening payment...");
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: "E-Mart",
      description: `Order ${razorpayOrder.receipt}`,
      order_id: razorpayOrder.orderId,
      prefill: {
        name: fullName,
        email: user?.email,
        contact: user?.phone,
      },
      theme: { color: "#4F46E5" },
      handler: async function (response) {
        try {
          setStatusMessage("Verifying payment...");
          await verifyRazorpayPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          setStatusMessage("Placing order...");
          await placeOrder();
        } catch (err) {
          console.error("Error finalizing order after payment:", err);
          // Surface the server's own reason (insufficient points, out of
          // stock, a schema problem...) instead of only "contact
          // support" - without it, a post-payment failure gave nobody
          // anything to act on.
          const reason =
            err?.response?.data?.message || err?.message || "";
          setError(
            "Payment succeeded but we couldn't finalize your order" +
              (reason ? `: ${reason}` : ".") +
              " Please contact support with your payment ID: " +
              response.razorpay_payment_id
          );
          setPlacing(false);
          setStatusMessage("");
        }
      },
      modal: {
        ondismiss: function () {
          setPlacing(false);
          setStatusMessage("");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (resp) {
      setError(resp?.error?.description || "Payment failed. Please try again.");
      setPlacing(false);
      setStatusMessage("");
    });
    rzp.open();
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");
    setPlacing(true);

    try {
      // Nothing to actually charge (e.g. order fully covered by a
      // free EMCard item) - Razorpay won't create a zero-amount
      // order and there's no card/UPI charge to make, so just place
      // the order directly no matter which method is selected.
      if (method === "COD" || cartPayableTotal <= 0) {
        await placeOrder();
      } else {
        // CARD / UPI both go through Razorpay Checkout, which itself
        // offers UPI/cards/netbanking/wallets once it opens.
        await payWithRazorpay();
      }
    } catch (err) {
      console.error("Error placing order:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "We couldn't place your order. Please try again."
      );
      setPlacing(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="em-auth-page">
      <header className="em-auth-topbar">
        <Link to="/" className="em-auth-topbar-brand">
          <i className="bi bi-shop"></i>
          <span>E-Mart</span>
        </Link>
        <Link to="/checkout" className="em-auth-topbar-back">
          <i className="bi bi-arrow-left"></i>
          <span>Back to checkout</span>
        </Link>
      </header>

      <div className="container py-5 em-fade-in" style={{ maxWidth: "560px" }}>
        <h3 className="mb-4">Payment</h3>

        <div className="card shadow-sm border-0 em-payment-card">
          <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted">Amount Payable</span>
            <span className="fs-4 fw-bold">{formatCurrency(cartPayableTotal)}</span>
          </div>

          {/* Points are the other half of the price for mode 3 and 4
              lines - they are redeemed at checkout, not charged here. */}
          {cartPointsToRedeem > 0 && (
            <div className="d-flex justify-content-between align-items-center mb-4 text-primary">
              <span>EMCard points redeemed</span>
              <span className="fw-semibold">{cartPointsToRedeem} pts</span>
            </div>
          )}

          <p className="small text-muted mb-3">
            {cartItems.length} item{cartItems.length === 1 ? "" : "s"} &middot;{" "}
            {checkoutDetails.deliveryOption === "PICKUP"
              ? "Store Pickup"
              : "Home Delivery"}
          </p>

          <form onSubmit={handlePay}>
            {cartPayableTotal > 0 ? (
              <>
                <label className="form-label small text-muted">Payment Method</label>
                <div className="d-flex flex-column gap-2 mb-4">
                  {[
                    { id: "CARD", label: "Credit / Debit Card", icon: "bi-credit-card" },
                    { id: "UPI", label: "UPI", icon: "bi-phone" },
                    { id: "COD", label: "Cash on Delivery", icon: "bi-cash-stack" },
                  ].map((option) => (
                    <div
                      key={option.id}
                      className={`em-payment-option form-check border rounded p-3 ${
                        method === option.id ? "border-primary bg-light" : ""
                      }`}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        name="paymentMethod"
                        id={`method-${option.id}`}
                        checked={method === option.id}
                        onChange={() => setMethod(option.id)}
                      />
                      <label
                        className="form-check-label d-flex align-items-center gap-2"
                        htmlFor={`method-${option.id}`}
                      >
                        <i className={`bi ${option.icon}`}></i>
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>

                <p className="small text-muted mb-3">
                  <i className="bi bi-shield-lock me-1"></i>
                  Secured by Razorpay &middot; UPI, cards, netbanking &amp; wallets
                </p>
              </>
            ) : (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-check-circle fs-5"></i>
                <span>
                  {cartPointsToRedeem > 0
                    ? `This order is paid entirely with ${cartPointsToRedeem} EMCard points - there is nothing to pay. Just confirm below.`
                    : "This order is fully covered - nothing to pay. Just confirm below."}
                </span>
              </div>
            )}

            {error && <div className="alert alert-danger py-2">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary fw-semibold w-100 em-pay-btn"
              disabled={placing}
            >
              {placing ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  ></span>
                  {statusMessage || "Placing Order..."}
                </>
              ) : cartPayableTotal > 0 ? (
                `Pay ${formatCurrency(cartPayableTotal)}`
              ) : (
                "Confirm Order"
              )}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

