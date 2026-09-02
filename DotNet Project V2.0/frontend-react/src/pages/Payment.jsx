import { useState } from "react";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { checkout } from "../services/orderService";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../services/razorpayService";
import useRazorpayScript from "../hooks/useRazorpayScript";
import { formatCurrency } from "../utils/format";
import Button from "../components/ui/Button";
import CheckoutSteps from "../components/CheckoutSteps";
import { Alert } from "../components/ui/Feedback";
import "../styles/checkout.css";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

function randomReceipt() {
  return `EMART-${Date.now().toString(36).toUpperCase()}`;
}

const PAYMENT_METHODS = [
  {
    id: "CARD",
    label: "Credit / debit card",
    hint: "Visa, Mastercard, RuPay and more",
    icon: "bi-credit-card-2-front",
  },
  {
    id: "UPI",
    label: "UPI",
    hint: "Pay from any UPI app",
    icon: "bi-phone",
  },
  {
    id: "COD",
    label: "Cash on delivery",
    hint: "Pay when your order arrives",
    icon: "bi-cash-stack",
  },
];

/**
 * Payment.jsx
 * ------------------------------------------------------------------
 * Step 3 of Cart -> Review -> Payment -> Confirmation.
 *
 * THE PAYMENT INTEGRATION IS UNCHANGED. Card and UPI still open the real
 * Razorpay Checkout popup: create a Razorpay order for the cart total, let
 * the shopper pay, verify the signature server-side, and only then call
 * POST /api/orders/checkout with the delivery details passed in router
 * state. COD skips the gateway and goes straight to checkout. A zero-value
 * order (fully covered by points) also skips the gateway, because Razorpay
 * will not create a zero-amount order and there is nothing to charge.
 *
 * No key or secret is introduced here: the publishable key id still comes
 * from VITE_RAZORPAY_KEY_ID, and the signature is verified on the server.
 *
 * Landing here directly with no router state (a bookmark or a refresh)
 * still sends the shopper back to /checkout rather than risking an order
 * with missing delivery details.
 *
 * WHAT CHANGED: the screen now shows where it sits in the flow, states the
 * amount prominently, presents the methods as selectable cards, and reports
 * progress ("Verifying payment...") through the button rather than a line of
 * grey text. The page keeps the focused shell - no header, no nav, no cart -
 * because every one of those is a way to wander off mid-payment.
 * ------------------------------------------------------------------
 */
export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartPayableTotal, cartItems, cartPointsToRedeem, refreshCart } =
    useCart();
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

  // Finalises the order in our own backend - shared by the COD path and the
  // post-verification Razorpay path.
  const placeOrder = async () => {
    const response = await checkout(checkoutDetails);
    const order = response.data;

    // The backend already cleared the cart and any eMCard reservations as
    // part of checkout - refresh the shared CartContext so the header badge
    // and drawer reflect that immediately instead of showing stale items.
    await refreshCart();

    navigate(`/orders/${order.orderId}`, { replace: true });
  };

  const payWithRazorpay = async () => {
    if (!razorpayReady) {
      throw new Error(
        "Payment gateway is still loading. Please try again in a moment."
      );
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
      // Matches the storefront's brand indigo, so the gateway popup does not
      // look like it belongs to a different site.
      theme: { color: "#4f46e5" },
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
          // stock, a schema problem) instead of only "contact support" -
          // without it, a post-payment failure gives nobody anything to act
          // on.
          const reason = err?.response?.data?.message || err?.message || "";
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

  const handlePay = async (event) => {
    event.preventDefault();
    setError("");
    setPlacing(true);

    try {
      // Nothing to actually charge (e.g. an order fully covered by points) -
      // Razorpay won't create a zero-amount order and there is no card/UPI
      // charge to make, so place the order directly whatever the selection.
      if (method === "COD" || cartPayableTotal <= 0) {
        await placeOrder();
      } else {
        // Card and UPI both go through Razorpay Checkout, which itself
        // offers UPI, cards, netbanking and wallets once it opens.
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
    <div className="focus-shell">
      <header className="focus-shell__topbar">
        <Link to="/" className="brand" aria-label="E-Mart home">
          <span className="brand__mark" aria-hidden="true">
            E
          </span>
          <span className="brand__text">
            <span className="brand__name">
              <em>E</em>-Mart
            </span>
          </span>
        </Link>

        <Link to="/checkout" className="focus-shell__back">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span>Back to checkout</span>
        </Link>
      </header>

      <div className="payment-shell em-fade-in">
        <CheckoutSteps current="payment" />

        <div className="payment-amount">
          <span className="payment-amount__label">Amount payable</span>
          <span className="payment-amount__value">
            {formatCurrency(cartPayableTotal)}
          </span>

          <div className="payment-amount__meta">
            <span>
              <i className="bi bi-bag" aria-hidden="true" /> {cartItems.length}{" "}
              item{cartItems.length === 1 ? "" : "s"}
            </span>
            <span>
              <i
                className={`bi ${
                  checkoutDetails.deliveryOption === "PICKUP"
                    ? "bi-shop"
                    : "bi-truck"
                }`}
                aria-hidden="true"
              />{" "}
              {checkoutDetails.deliveryOption === "PICKUP"
                ? "Store pickup"
                : "Home delivery"}
            </span>
            {/* Points are the other half of the price for mode 3 and 4
                lines - redeemed at checkout, not charged here. */}
            {cartPointsToRedeem > 0 && (
              <span>
                <i className="bi bi-gift-fill" aria-hidden="true" />{" "}
                {cartPointsToRedeem} e-Mcard points redeemed
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handlePay} style={{ marginTop: "var(--space-6)" }}>
          {cartPayableTotal > 0 ? (
            <>
              <h1
                className="ui-section-head__title"
                style={{ marginBottom: "var(--space-4)", fontSize: "var(--text-lg)" }}
              >
                Choose a payment method
              </h1>

              <div className="payment-methods">
                {PAYMENT_METHODS.map((option) => (
                  <label
                    key={option.id}
                    htmlFor={`method-${option.id}`}
                    className={`ui-option-card ${
                      method === option.id ? "ui-option-card--selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      id={`method-${option.id}`}
                      checked={method === option.id}
                      onChange={() => setMethod(option.id)}
                    />
                    <span className="ui-option-card__icon" aria-hidden="true">
                      <i className={`bi ${option.icon}`} />
                    </span>
                    <span>
                      <span className="ui-option-card__label">{option.label}</span>
                      <span className="ui-option-card__hint">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginBottom: "var(--space-5)" }}>
              <Alert variant="success" title="Nothing left to pay">
                {cartPointsToRedeem > 0
                  ? `This order is covered entirely by ${cartPointsToRedeem} e-Mcard points. Just confirm below.`
                  : "This order is fully covered. Just confirm below."}
              </Alert>
            </div>
          )}

          {error && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <Alert variant="danger" title="Payment problem">
                {error}
              </Alert>
            </div>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            block
            loading={placing}
            loadingText={statusMessage || "Placing order..."}
            icon={cartPayableTotal > 0 ? "bi-shield-lock" : "bi-check-lg"}
          >
            {cartPayableTotal > 0
              ? `Pay ${formatCurrency(cartPayableTotal)}`
              : "Confirm order"}
          </Button>

          {cartPayableTotal > 0 && (
            <p className="payment-secure">
              <i className="bi bi-shield-lock-fill" aria-hidden="true" />
              Secured by Razorpay · UPI, cards, netbanking &amp; wallets
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
