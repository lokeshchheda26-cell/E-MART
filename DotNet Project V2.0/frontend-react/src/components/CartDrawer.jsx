import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useEmcard } from "../context/EmcardContext";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useDismissLayer from "../hooks/useDismissLayer";
import { formatCurrency } from "../utils/format";
import { getProductId, getProductImage, getProductName } from "../utils/product";
import Button from "./ui/Button";
import ProductImage from "./ui/ProductImage";
import QuantityStepper from "./ui/QuantityStepper";
import ConfirmDialog from "./ui/ConfirmDialog";
import { Alert, EmptyState } from "./ui/Feedback";
import { PointsPill } from "./ui/Loyalty";
import "./CartDrawer.css";

/**
 * CartDrawer.jsx
 * ------------------------------------------------------------------
 * The slide-over cart, mounted once at the app root so it can be opened
 * from the header on ANY route. It previously lived inside the home page
 * and took fourteen props; it now reads what it needs from CartContext and
 * EmcardContext directly.
 *
 * PRICING IS NOT CALCULATED HERE. Every figure - each line's unit price,
 * the cash payable, the points payable, whether the cart can be bought at
 * all and why not - is computed once server-side by the purchase-decision
 * engine and simply rendered. That is what guarantees the drawer, the
 * checkout summary and the final invoice all quote identical numbers.
 *
 * The split line is the subtle part, and its behaviour is unchanged: a
 * product with a points-based offer shows as TWO INDEPENDENT lines,
 * eMCard-redeemed and normal-priced. Adjusting one changes the cart total,
 * never the other line's count.
 *
 * What is new is the summary: subtotal, savings and payable total are now
 * itemised instead of a single "Cash payable" number, so it is obvious
 * where the price came from before the shopper commits to checkout.
 * ------------------------------------------------------------------
 */
export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    cartTotalSavings,
    cartPayableTotal,
    cartPointsToRedeem,
    cartPointsEarned,
    cartPurchasable,
    cartBlockingReason,
    isCartOpen,
    closeCart,
    loading,
    updateQuantity,
    removeItem,
  } = useCart();

  const {
    isEmcardMember,
    increaseEmcardLine,
    decreaseEmcardLine,
    removeEmcardLine,
    decreaseNormalLine,
    removeNormalLine,
  } = useEmcard();

  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Escape closes the drawer, but only when nothing is stacked above it -
  // with the remove-confirmation open, Escape dismisses that first.
  useDismissLayer(isCartOpen, closeCart);
  useBodyScrollLock(isCartOpen);

  if (!isCartOpen) return null;

  // Prefer the backend's already-resolved unitPrice (it accounts for any
  // eMCard redemption on this line) over the raw price columns, so a line's
  // displayed price always matches what the total actually charges.
  const getUnitPrice = (item) =>
    Number(
      item.unitPrice ??
        item.cardholderPrice ??
        item.cardholdersPrice ??
        item.mrpPrice ??
        0
    );

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

  const handleCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <>
      {/* The backdrop IS "outside the drawer", so it owns the click that
          closes it. A layer opened on top renders its own backdrop above
          this one and captures its own clicks, which is what stops the
          confirmation dialog from closing the drawer out from under it. */}
      <div className="ui-overlay" onClick={closeCart} aria-hidden="true" />

      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        {/* ---------------------------------------------------- HEADER */}
        <header className="cart-drawer__header">
          <h2 className="cart-drawer__title" id="cart-drawer-title">
            <i className="bi bi-cart3" aria-hidden="true" />
            Your cart
            {cartCount > 0 && (
              <span className="cart-drawer__count">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
            )}
          </h2>

          <button
            type="button"
            className="ui-icon-btn"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        {/* ----------------------------------------------------- BODY */}
        {cartItems.length === 0 ? (
          <div className="cart-drawer__empty">
            <EmptyState
              icon="bi-cart-x"
              title="Your cart is empty"
              message="Browse the catalogue and add a few things — your cart is saved to your account, so it will still be here later."
              action={
                <Button variant="primary" onClick={closeCart}>
                  Start shopping
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="cart-drawer__items scroll-area">
              {cartItems.map((item) => {
                const lineId = item.cartItemId ?? getProductId(item);
                const productId = getProductId(item);
                const unitPrice = getUnitPrice(item);
                const image = getProductImage(item);

                // Points this line redeems in total, decided by the
                // product's purchase mode.
                const points = Number(
                  item.pointsRequired ?? item.pointsToRedeem ?? 0
                );

                const emcardUnitPoints = Number(item.emcardUnitPoints ?? 0);
                const emcardQty = Number(item.emcardQuantity ?? 0);
                const normalQty = Number(
                  item.normalQuantity ??
                    Math.max(0, item.quantity - emcardQty)
                );

                // A points-based offer (mode 3/4) is shown as two
                // independent lines rather than one blended price.
                const showTwoLines = emcardUnitPoints > 0 && isEmcardMember;

                return (
                  <article className="cart-line" key={lineId}>
                    <div className="cart-line__media">
                      <ProductImage src={image} placeholderClassName="" />
                    </div>

                    <div className="cart-line__body">
                      <div className="cart-line__top">
                        <h3 className="cart-line__name line-clamp-2">
                          {getProductName(item)}
                        </h3>
                        <button
                          type="button"
                          className="ui-icon-btn ui-icon-btn--sm ui-icon-btn--danger"
                          onClick={() =>
                            setPendingRemoval({
                              cartItemId: lineId,
                              name: getProductName(item),
                            })
                          }
                          aria-label={`Remove ${getProductName(item)} from cart`}
                          title="Remove from cart"
                        >
                          <i className="bi bi-trash3" aria-hidden="true" />
                        </button>
                      </div>

                      {item.purchaseModeLabel && (
                        <span className="ui-chip cart-line__mode">
                          {item.purchaseModeLabel}
                        </span>
                      )}

                      {showTwoLines ? (
                        <div className="cart-line__split">
                          {/* --- eMCard-redeemed units --- */}
                          <div className="cart-split-row cart-split-row--loyalty">
                            <span className="cart-split-row__label">
                              <i className="bi bi-gift-fill" aria-hidden="true" />
                              e-Mcard{" "}
                              <span className="cart-split-row__terms">
                                {Number(item.emcardUnitPrice ?? 0) > 0
                                  ? `${formatCurrency(item.emcardUnitPrice)} + `
                                  : ""}
                                {emcardUnitPoints} pts each
                              </span>
                            </span>

                            <div className="cart-split-row__controls">
                              <QuantityStepper
                                value={emcardQty}
                                label="e-Mcard quantity"
                                busy={loading}
                                onDecrease={() => decreaseEmcardLine(productId)}
                                onIncrease={() => increaseEmcardLine(productId)}
                              />
                              {emcardQty > 0 && (
                                <button
                                  type="button"
                                  className="ui-icon-btn ui-icon-btn--sm ui-icon-btn--danger"
                                  onClick={() => removeEmcardLine(productId)}
                                  aria-label="Remove the e-Mcard units"
                                >
                                  <i className="bi bi-x-lg" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* --- normally-priced units --- */}
                          <div className="cart-split-row">
                            <span className="cart-split-row__label">
                              <i className="bi bi-cash" aria-hidden="true" />
                              Regular{" "}
                              <span className="cart-split-row__terms">
                                {formatCurrency(
                                  item.regularUnitPrice ?? item.mrpPrice
                                )}{" "}
                                each
                              </span>
                            </span>

                            <div className="cart-split-row__controls">
                              <QuantityStepper
                                value={normalQty}
                                label="Regular quantity"
                                busy={loading}
                                onDecrease={() => decreaseNormalLine(productId)}
                                onIncrease={() =>
                                  updateQuantity(
                                    lineId,
                                    item.quantity + 1
                                  ).catch(() => {})
                                }
                              />
                              {normalQty > 0 && (
                                <button
                                  type="button"
                                  className="ui-icon-btn ui-icon-btn--sm ui-icon-btn--danger"
                                  onClick={() => removeNormalLine(productId)}
                                  aria-label="Remove the regular-priced units"
                                >
                                  <i className="bi bi-x-lg" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="cart-line__row">
                          <span className="cart-line__price">
                            {unitPrice === 0 && points > 0 ? (
                              <span className="cart-line__points">
                                <i className="bi bi-gift-fill" aria-hidden="true" />{" "}
                                {points} e-Points
                              </span>
                            ) : (
                              <>
                                {formatCurrency(unitPrice)}
                                {points > 0 && (
                                  <span className="cart-line__points">
                                    {" "}
                                    + {points} e-Points
                                  </span>
                                )}
                              </>
                            )}
                          </span>

                          <QuantityStepper
                            value={item.quantity}
                            label="Quantity"
                            busy={loading}
                            min={1}
                            onDecrease={() =>
                              updateQuantity(lineId, item.quantity - 1).catch(
                                () => {}
                              )
                            }
                            onIncrease={() =>
                              updateQuantity(lineId, item.quantity + 1).catch(
                                () => {}
                              )
                            }
                          />
                        </div>
                      )}

                      <div className="cart-line__total">
                        {formatCurrency(item.lineTotal ?? unitPrice * item.quantity)}
                      </div>

                      {item.purchasable === false && (
                        <p className="cart-line__blocked" role="alert">
                          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />{" "}
                          {item.blockingReason}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* -------------------------------------------------- FOOTER
                Itemised rather than a single number, so the shopper can see
                exactly how the payable total was arrived at. */}
            <footer className="cart-drawer__footer">
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

              {cartPointsEarned > 0 && (
                <div className="cart-drawer__earn">
                  <PointsPill points={cartPointsEarned} label="You'll earn" />
                </div>
              )}

              {cartBlockingReason && (
                <Alert variant="danger">{cartBlockingReason}</Alert>
              )}

              <Button
                variant="accent"
                size="lg"
                block
                iconEnd="bi-arrow-right"
                disabled={!cartPurchasable}
                onClick={handleCheckout}
              >
                Proceed to checkout
              </Button>

              <button
                type="button"
                className="ui-btn ui-btn--link cart-drawer__continue"
                onClick={closeCart}
              >
                Continue shopping
              </button>
            </footer>
          </>
        )}
      </aside>

      {/* Destructive actions get a confirmation - removing a line is not
          undoable from the UI. */}
      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove this item?"
        message={
          pendingRemoval
            ? `"${pendingRemoval.name}" will be removed from your cart, along with any e-Mcard points reserved for it.`
            : ""
        }
        confirmLabel="Remove"
        loading={removing}
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}
