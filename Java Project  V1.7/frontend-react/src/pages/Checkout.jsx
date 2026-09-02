import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../utils/format";

/**
 * Checkout.jsx
 * ------------------------------------------------------------------
 * Step 1 of Checkout -> Payment -> Invoice. Shows the persisted cart
 * (editable line items, same as the cart drawer) plus delivery
 * details, then hands off to /payment with the chosen options in
 * router state - Payment is the step that actually calls the
 * checkout API, so refreshing this page never double-charges/places
 * an order.
 *
 * EMCard points are shown as a full calculation (opening balance ->
 * points redeemed -> points earned -> closing balance), all of it
 * computed server-side by PurchaseDecisionEngine and read straight off
 * the cart response.
 *
 * The person no longer types a point amount here. How much a product
 * costs in points is its PURCHASE MODE configuration, not user input:
 *
 *   Mode 1  cash only            no points, ever
 *   Mode 2  eMCard price         discounted cash, chosen with the
 *                                checkbox on the product page
 *   Mode 3  full redemption      points only, mandatory
 *   Mode 4  partial redemption   cash AND points, both mandatory
 *
 * so each line just states what its mode requires, and checkout is
 * blocked with a reason if the balance does not cover it.
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
    cartPointsBalanceOpening,
    cartPointsBalanceClosing,
    cartPointsEarned,
    cartEarnRatePercent,
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

  // Whether there is any point activity worth showing. Every figure in
  // the EMCard block comes from the cart response (one
  // PurchaseDecisionEngine result), so there is no separate balance
  // call to keep in sync with it any more.
  const hasPointActivity =
    cartPointsBalanceOpening > 0 ||
    cartPointsToRedeem > 0 ||
    cartPointsEarned > 0;

  // Prefill the shipping address from the user's profile once, the
  // first time it becomes available - the person can still edit it.
  useEffect(() => {
    if (user?.address && !shippingAddress) {
      setShippingAddress(user.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * One line's price, phrased by its purchase mode. Both halves come
   * from the server - this only picks the wording.
   */
  const describeLine = (item) => {
    const points = Number(item.pointsRequired ?? item.pointsToRedeem ?? 0);
    const cash = formatCurrency(item.unitPrice);

    switch (item.purchaseMode) {
      case "FULL_REDEMPTION":
        // Optional offer: without it the line is plain cash.
        return item.emcardApplied ? `${points} e-Points (no cash)` : cash;
      case "PARTIAL_REDEMPTION":
        // Optional offer: without it the line is plain cash.
        return item.emcardApplied ? `${cash} + ${points} e-Points` : cash;
      case "EMCARD_DISCOUNT":
        return item.emcardApplied ? `${cash} (EMCard price)` : cash;
      default:
        return cash;
    }
  };

  // Quantity +/- and remove on this page go through the same cart
  // API as the cart drawer. The .catch here is what keeps a failed
  // call from becoming an unhandled promise rejection - CartContext
  // has already put the reason into `error`, which is rendered as a
  // banner above the line items, so the person can see why nothing
  // changed instead of the click appearing to do nothing.
  const changeQuantity = (item, nextQuantity) => {
    updateQuantity(item.cartItemId, nextQuantity).catch(() => {});
  };

  const deleteItem = (item) => {
    removeItem(item.cartItemId).catch(() => {});
  };

  const isEmpty = !loading && cartItems.length === 0;

  const handleContinue = (e) => {
    e.preventDefault();
    setFormError("");

    // A points-only or cash+points line the balance no longer covers -
    // the server already said so, and it would reject the checkout
    // anyway, so stop here with its own wording.
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
        shippingAddress: deliveryOption === "COURIER" ? shippingAddress.trim() : "",
        storeLocation: deliveryOption === "PICKUP" ? storeLocation.trim() : "",
      },
    });
  };

  if (loading && !cart) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: "500px" }}>
        <i className="bi bi-cart-x display-4 text-muted"></i>
        <h4 className="mt-3">Your cart is empty</h4>
        <p className="text-muted">Add a few products before checking out.</p>
        <Link to="/" className="btn btn-warning fw-semibold">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h3 className="mb-4">Checkout</h3>

      <div className="row g-4">
        {/* CART ITEMS */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title mb-3">Order Items ({cartItems.length})</h5>

              {cartError && (
                <div className="alert alert-danger py-2">{cartError}</div>
              )}

              {cartItems.map((item) => {

                return (
                  <div key={item.cartItemId} className="py-3 border-bottom">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="bg-light rounded d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 56, height: 56 }}
                      >
                        {item.productImagePath ? (
                          <img
                            src={item.productImagePath}
                            alt={item.productName}
                            className="w-100 h-100 rounded"
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          <i className="bi bi-box-seam text-muted"></i>
                        )}
                      </div>

                      <div className="flex-grow-1">
                        <div className="fw-semibold">{item.productName}</div>

                        {/* Priced by purchase mode server-side; this line
                            just words what that mode requires. */}
                        <div className="small text-muted">
                          <span
                            className={
                              (item.pointsRequired ?? 0) > 0 ? "text-success" : ""
                            }
                          >
                            {describeLine(item)}
                          </span>
                          {" "}&times; {item.quantity}
                        </div>

                        {item.purchaseModeLabel && (
                          <span className="badge bg-light text-secondary border mt-1">
                            {item.purchaseModeLabel}
                          </span>
                        )}

                        {item.purchasable === false && (
                          <div className="small text-danger mt-1">
                            ⚠ {item.blockingReason}
                          </div>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            changeQuantity(item, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            changeQuantity(item, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="fw-semibold" style={{ minWidth: 90, textAlign: "right" }}>
                        {formatCurrency(item.lineTotal)}
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger"
                        onClick={() => deleteItem(item)}
                        aria-label="Remove item"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* DELIVERY OPTIONS */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h5 className="card-title mb-3">Delivery Options</h5>

              <form onSubmit={handleContinue}>
                <div className="d-flex gap-4 mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="deliveryOption"
                      id="deliveryCourier"
                      checked={deliveryOption === "COURIER"}
                      onChange={() => setDeliveryOption("COURIER")}
                    />
                    <label className="form-check-label" htmlFor="deliveryCourier">
                      Home Delivery
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="deliveryOption"
                      id="deliveryPickup"
                      checked={deliveryOption === "PICKUP"}
                      onChange={() => setDeliveryOption("PICKUP")}
                    />
                    <label className="form-check-label" htmlFor="deliveryPickup">
                      Store Pickup
                    </label>
                  </div>
                </div>

                {deliveryOption === "COURIER" ? (
                  <div className="mb-3">
                    <label htmlFor="shippingAddress" className="form-label small text-muted">
                      Shipping Address
                    </label>
                    <textarea
                      id="shippingAddress"
                      className="form-control"
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Enter your full delivery address"
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <label htmlFor="storeLocation" className="form-label small text-muted">
                      Preferred Store (optional)
                    </label>
                    <input
                      id="storeLocation"
                      type="text"
                      className="form-control"
                      value={storeLocation}
                      onChange={(e) => setStoreLocation(e.target.value)}
                      placeholder="e.g. E-Mart Koramangala"
                    />
                  </div>
                )}

                {formError && (
                  <div className="alert alert-danger py-2">{formError}</div>
                )}

                <button
                  type="submit"
                  className="btn btn-warning fw-semibold w-100"
                  disabled={!cartPurchasable}
                >
                  Continue to Payment
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ORDER SUMMARY */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h5 className="card-title mb-3">Order Summary</h5>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal (MRP)</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-success">
                <span>Savings</span>
                <span>− {formatCurrency(cartTotalSavings)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5">
                <span>Cash Payable</span>
                <span>{formatCurrency(cartPayableTotal)}</span>
              </div>

              {cartPointsToRedeem > 0 && (
                <div className="d-flex justify-content-between fw-bold text-primary">
                  <span>EMCard Points Payable</span>
                  <span>{cartPointsToRedeem} pts</span>
                </div>
              )}

              {/* Full point calculation, every figure computed once by
                  PurchaseDecisionEngine and read off the cart response -
                  the same numbers the invoice will show. */}
              {hasPointActivity && (
                <div className="small mt-3 pt-3 border-top">
                  <div className="fw-semibold mb-1">🎁 EMCard Points</div>
                  <div className="d-flex justify-content-between text-muted">
                    <span>Opening balance</span>
                    <span>{cartPointsBalanceOpening} pts</span>
                  </div>
                  {cartPointsToRedeem > 0 && (
                    <div className="d-flex justify-content-between text-muted">
                      <span>Points redeemed this order</span>
                      <span>− {cartPointsToRedeem} pts</span>
                    </div>
                  )}
                  {cartPointsEarned > 0 && (
                    <div className="d-flex justify-content-between text-muted">
                      <span>
                        Points earned
                        {cartEarnRatePercent
                          ? ` (${cartEarnRatePercent}% of cash paid)`
                          : ""}
                      </span>
                      <span>+ {cartPointsEarned} pts</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-semibold">
                    <span>Closing balance</span>
                    <span>{cartPointsBalanceClosing} pts</span>
                  </div>
                </div>
              )}

              {!cartPurchasable && cartBlockingReason && (
                <div className="alert alert-danger py-2 small mt-3 mb-0">
                  ⚠ {cartBlockingReason}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
