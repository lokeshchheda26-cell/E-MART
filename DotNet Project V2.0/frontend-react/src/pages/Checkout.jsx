import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../utils/format";
import { getProductImage, getProductName } from "../utils/product";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import ProductImage from "../components/ui/ProductImage";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import QuantityStepper from "../components/ui/QuantityStepper";
import { Alert, EmptyState, LoadingBlock } from "../components/ui/Feedback";
import CheckoutSteps from "../components/CheckoutSteps";
import "../styles/checkout.css";

/**
 * Checkout.jsx
 * ------------------------------------------------------------------
 * Step 1 of Checkout -> Payment -> Confirmation.
 *
 * Reviews the persisted cart, collects delivery details, then hands off to
 * /payment with those details in router state. Payment is the step that
 * actually calls the checkout API, so refreshing THIS page can never place
 * an order twice. That separation is unchanged.
 *
 * The person does not type a point amount here. How much a product costs in
 * points is its PURCHASE MODE configuration, not user input:
 *
 *   Mode 1  cash only          no points, ever
 *   Mode 2  e-Mcard price      discounted cash, chosen on the product page
 *   Mode 3  full redemption    points only
 *   Mode 4  partial redemption cash AND points
 *
 * so each line states what its mode requires, and checkout is blocked with
 * the server's own reason if the balance does not cover it.
 *
 * WHAT CHANGED: presentation. A progress stepper so the shopper knows how
 * many steps remain, a sticky order summary that stays visible while the
 * line items scroll, an itemised total, and a confirmation before a line is
 * deleted. No pricing is calculated here - every figure comes from the
 * server-side purchase-decision engine, as before.
 * ------------------------------------------------------------------
 */
export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    cart,
    cartItems,
    cartSubtotal,
    cartTotalSavings,
    cartPayableTotal,
    cartPointsToRedeem,
    cartPointsEarned,
    cartPointsBalanceClosing,
    cartPurchasable,
    cartBlockingReason,
    loading,
    error: cartError,
    updateQuantity,
    removeItem,
  } = useCart();

  const [deliveryOption, setDeliveryOption] = useState("COURIER");
  const [shippingAddress, setShippingAddress] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [formError, setFormError] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Prefill the shipping address from the profile once, the first time it
  // becomes available. Still editable.
  useEffect(() => {
    if (user?.address && !shippingAddress) {
      setShippingAddress(user.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * One line's price, phrased by its purchase mode. Both halves come from
   * the server - this only picks the wording.
   *
   * A line can mix eMCard-redeemed and normally-priced quantities, so that
   * split is stated explicitly rather than as a single blended figure.
   */
  const describeLine = (item) => {
    const points = Number(item.pointsRequired ?? item.pointsToRedeem ?? 0);
    const cash = formatCurrency(item.unitPrice);
    const emcardQty = Number(item.emcardQuantity ?? 0);
    const normalQty = Number(
      item.normalQuantity ?? Math.max(0, item.quantity - emcardQty)
    );

    if (emcardQty > 0 && normalQty > 0) {
      const emcardUnitPoints = Number(item.emcardUnitPoints ?? 0);
      const emcardUnitPrice = Number(item.emcardUnitPrice ?? 0);
      const emcardPart =
        emcardUnitPrice > 0
          ? `${formatCurrency(emcardUnitPrice)} + ${emcardUnitPoints} pts`
          : `${emcardUnitPoints} pts`;
      return `${emcardQty} × (${emcardPart}) + ${normalQty} × ${formatCurrency(
        item.regularUnitPrice ?? item.mrpPrice
      )}`;
    }

    switch (item.purchaseMode) {
      case "FULL_REDEMPTION":
        // Optional offer: without it the line is plain cash.
        return item.emcardApplied ? `${points} e-Points (no cash)` : cash;
      case "PARTIAL_REDEMPTION":
        return item.emcardApplied ? `${cash} + ${points} e-Points` : cash;
      case "EMCARD_DISCOUNT":
        return item.emcardApplied ? `${cash} (e-Mcard price)` : cash;
      default:
        return cash;
    }
  };

  // Quantity and removal go through the same cart API as the drawer. The
  // .catch stops a failed call becoming an unhandled rejection - the reason
  // is already in CartContext's `error` and rendered as a banner, so the
  // shopper sees why nothing changed rather than the click doing nothing.
  const changeQuantity = (item, nextQuantity) => {
    updateQuantity(item.cartItemId, nextQuantity).catch(() => {});
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    removeItem(pendingRemoval.cartItemId)
      .catch(() => {})
      .finally(() => {
        setRemoving(false);
        setPendingRemoval(null);
      });
  };

  const handleContinue = (event) => {
    event.preventDefault();
    setFormError("");

    // A points-based line the balance no longer covers: the server already
    // said so and would reject the checkout anyway, so stop here using its
    // own wording rather than inventing a second explanation.
    if (!cartPurchasable) {
      setFormError(cartBlockingReason || "This order cannot be placed yet.");
      return;
    }

    if (deliveryOption === "COURIER" && !shippingAddress.trim()) {
      setFormError("Please enter a shipping address for courier delivery.");
      return;
    }

    navigate("/payment", {
      state: {
        deliveryOption,
        shippingAddress:
          deliveryOption === "COURIER" ? shippingAddress.trim() : "",
        storeLocation: deliveryOption === "PICKUP" ? storeLocation.trim() : "",
      },
    });
  };

  /* --------------------------------------------------------- STATES --- */

  if (loading && !cart) {
    return (
      <div className="container-page page">
        <LoadingBlock>Loading your cart...</LoadingBlock>
      </div>
    );
  }

  if (!loading && cartItems.length === 0) {
    return (
      <div className="container-narrow page">
        <EmptyState
          icon="bi-cart-x"
          title="Your cart is empty"
          message="Add a few products and they'll show up here, ready to check out."
          action={
            <Button variant="accent" to="/" icon="bi-bag">
              Continue shopping
            </Button>
          }
        />
      </div>
    );
  }

  /* --------------------------------------------------------- RENDER --- */

  return (
    <div className="container-page page">
      <Breadcrumbs
        items={[{ label: "Home", to: "/" }, { label: "Checkout" }]}
      />

      <div className="page__header">
        <h1 className="page__title">Checkout</h1>
        <p className="page__subtitle">
          Review your order and choose how you'd like to receive it.
        </p>
      </div>

      <CheckoutSteps current="review" />

      <div className="checkout-layout">
        {/* ================================================== MAIN ==== */}
        <div className="checkout-main">
          <section className="ui-card">
            <header className="ui-card__header">
              <h2 className="ui-card__title">
                Order items ({cartItems.length})
              </h2>
              <Button variant="link" to="/" icon="bi-plus-lg">
                Add more
              </Button>
            </header>

            <div className="ui-card__body">
              {cartError && (
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <Alert variant="danger">{cartError}</Alert>
                </div>
              )}

              <ul className="checkout-lines">
                {cartItems.map((item) => {
                  // A mixed line's description already states both halves'
                  // quantities, so appending "× quantity" would double-count.
                  const emcardQty = Number(item.emcardQuantity ?? 0);
                  const normalQty = Number(
                    item.normalQuantity ??
                      Math.max(0, item.quantity - emcardQty)
                  );
                  const isMixedLine = emcardQty > 0 && normalQty > 0;
                  const image = getProductImage(item);

                  return (
                    <li className="checkout-line" key={item.cartItemId}>
                      <div className="checkout-line__media">
                        <ProductImage src={image} placeholderClassName="" />
                      </div>

                      <div className="checkout-line__info">
                        <h3 className="checkout-line__name">
                          {getProductName(item)}
                        </h3>

                        <p
                          className={`checkout-line__terms ${
                            (item.pointsRequired ?? 0) > 0
                              ? "checkout-line__terms--points"
                              : ""
                          }`}
                        >
                          {describeLine(item)}
                          {!isMixedLine && <> &times; {item.quantity}</>}
                        </p>

                        {item.purchaseModeLabel && (
                          <span className="ui-chip">
                            {item.purchaseModeLabel}
                          </span>
                        )}

                        {item.purchasable === false && (
                          <p className="checkout-line__blocked" role="alert">
                            <i
                              className="bi bi-exclamation-triangle-fill"
                              aria-hidden="true"
                            />{" "}
                            {item.blockingReason}
                          </p>
                        )}
                      </div>

                      <div className="checkout-line__controls">
                        <QuantityStepper
                          value={item.quantity}
                          min={1}
                          busy={loading}
                          onDecrease={() =>
                            changeQuantity(item, item.quantity - 1)
                          }
                          onIncrease={() =>
                            changeQuantity(item, item.quantity + 1)
                          }
                        />

                        <span className="checkout-line__total">
                          {formatCurrency(item.lineTotal)}
                        </span>

                        <button
                          type="button"
                          className="ui-icon-btn ui-icon-btn--sm ui-icon-btn--danger"
                          onClick={() =>
                            setPendingRemoval({
                              cartItemId: item.cartItemId,
                              name: getProductName(item),
                            })
                          }
                          aria-label={`Remove ${getProductName(item)}`}
                        >
                          <i className="bi bi-trash3" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* ---------------------------------------------- DELIVERY -- */}
          <section className="ui-card">
            <header className="ui-card__header">
              <h2 className="ui-card__title">Delivery</h2>
            </header>

            <div className="ui-card__body">
              <form onSubmit={handleContinue} id="checkout-form">
                <div className="checkout-delivery">
                  <label
                    className={`ui-option-card ${
                      deliveryOption === "COURIER"
                        ? "ui-option-card--selected"
                        : ""
                    }`}
                    htmlFor="deliveryCourier"
                  >
                    <input
                      type="radio"
                      name="deliveryOption"
                      id="deliveryCourier"
                      checked={deliveryOption === "COURIER"}
                      onChange={() => setDeliveryOption("COURIER")}
                    />
                    <span className="ui-option-card__icon" aria-hidden="true">
                      <i className="bi bi-truck" />
                    </span>
                    <span>
                      <span className="ui-option-card__label">
                        Home delivery
                      </span>
                      <span className="ui-option-card__hint">
                        Delivered to your address
                      </span>
                    </span>
                  </label>

                  <label
                    className={`ui-option-card ${
                      deliveryOption === "PICKUP"
                        ? "ui-option-card--selected"
                        : ""
                    }`}
                    htmlFor="deliveryPickup"
                  >
                    <input
                      type="radio"
                      name="deliveryOption"
                      id="deliveryPickup"
                      checked={deliveryOption === "PICKUP"}
                      onChange={() => setDeliveryOption("PICKUP")}
                    />
                    <span className="ui-option-card__icon" aria-hidden="true">
                      <i className="bi bi-shop" />
                    </span>
                    <span>
                      <span className="ui-option-card__label">
                        Store pickup
                      </span>
                      <span className="ui-option-card__hint">
                        Collect from an E-Mart store
                      </span>
                    </span>
                  </label>
                </div>

                {deliveryOption === "COURIER" ? (
                  <div className="ui-field">
                    <label htmlFor="shippingAddress" className="ui-label">
                      Shipping address
                    </label>
                    <textarea
                      id="shippingAddress"
                      className="ui-textarea"
                      rows={3}
                      value={shippingAddress}
                      onChange={(event) =>
                        setShippingAddress(event.target.value)
                      }
                      placeholder="House / flat, street, area, city, PIN code"
                      autoComplete="shipping street-address"
                    />
                    <span className="ui-field__hint">
                      Prefilled from your profile — edit it if this order goes
                      somewhere else.
                    </span>
                  </div>
                ) : (
                  <div className="ui-field">
                    <label htmlFor="storeLocation" className="ui-label">
                      Preferred store
                      <span className="ui-label__optional">(optional)</span>
                    </label>
                    <input
                      id="storeLocation"
                      type="text"
                      className="ui-input"
                      value={storeLocation}
                      onChange={(event) => setStoreLocation(event.target.value)}
                      placeholder="e.g. E-Mart Koramangala"
                    />
                  </div>
                )}

                {formError && <Alert variant="danger">{formError}</Alert>}
              </form>
            </div>
          </section>
        </div>

        {/* ============================================== SUMMARY ===== */}
        <aside className="checkout-summary">
          <div className="ui-card">
            <header className="ui-card__header">
              <h2 className="ui-card__title">Order summary</h2>
            </header>

            <div className="ui-card__body">
              <dl className="cart-summary">
                <div className="cart-summary__row">
                  <dt>Subtotal (MRP)</dt>
                  <dd>{formatCurrency(cartSubtotal)}</dd>
                </div>

                {cartTotalSavings > 0 && (
                  <div className="cart-summary__row cart-summary__row--save">
                    <dt>Savings</dt>
                    <dd>− {formatCurrency(cartTotalSavings)}</dd>
                  </div>
                )}

                <div className="cart-summary__row">
                  <dt>Delivery</dt>
                  <dd>
                    {deliveryOption === "PICKUP"
                      ? "Store pickup"
                      : cartPayableTotal >= 499
                        ? "Free"
                        : "Calculated at delivery"}
                  </dd>
                </div>

                {cartPointsToRedeem > 0 && (
                  <div className="cart-summary__row cart-summary__row--points">
                    <dt>e-Mcard points redeemed</dt>
                    <dd>{cartPointsToRedeem} pts</dd>
                  </div>
                )}

                <div className="cart-summary__row cart-summary__row--total">
                  <dt>Cash payable</dt>
                  <dd>{formatCurrency(cartPayableTotal)}</dd>
                </div>
              </dl>

              {/* The loyalty consequence of this order, stated before the
                  shopper commits rather than discovered on the invoice. */}
              {(cartPointsEarned > 0 || cartPointsToRedeem > 0) && (
                <div className="checkout-points">
                  <div className="checkout-points__head">
                    <i className="bi bi-gift-fill" aria-hidden="true" />
                    e-Mcard
                  </div>
                  {cartPointsEarned > 0 && (
                    <p>
                      You&apos;ll earn <strong>{cartPointsEarned} points</strong>{" "}
                      on this order.
                    </p>
                  )}
                  {cartPointsBalanceClosing > 0 && (
                    <p>
                      Balance afterwards:{" "}
                      <strong>{cartPointsBalanceClosing} pts</strong>
                    </p>
                  )}
                </div>
              )}

              {!cartPurchasable && cartBlockingReason && (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <Alert variant="danger">{cartBlockingReason}</Alert>
                </div>
              )}

              <Button
                type="submit"
                form="checkout-form"
                variant="accent"
                size="lg"
                block
                iconEnd="bi-arrow-right"
                disabled={!cartPurchasable}
                className="checkout-summary__cta"
              >
                Continue to payment
              </Button>

              <p className="checkout-summary__note">
                <i className="bi bi-shield-lock" aria-hidden="true" /> Payments
                are processed securely by Razorpay.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove this item?"
        message={
          pendingRemoval
            ? `"${pendingRemoval.name}" will be removed from your order, along with any e-Mcard points reserved for it.`
            : ""
        }
        confirmLabel="Remove"
        loading={removing}
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
