import { useCallback, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useEmcard } from "../context/EmcardContext";
import { getProductDetails } from "../services/productService";
import { formatCurrency } from "../utils/format";
import { getStockInfo } from "../utils/product";
import Button from "./ui/Button";
import Price from "./ui/Price";
import ProductImage from "./ui/ProductImage";
import Rating from "./ui/Rating";
import { OfferBlock } from "./ui/Loyalty";
import { Alert, ErrorState, Skeleton } from "./ui/Feedback";
import "./ProductDetails.css";

/**
 * ProductDetails.jsx
 * ------------------------------------------------------------------
 * The product detail page.
 *
 * PRICING LOGIC IS UNCHANGED. Every figure still comes from the backend's
 * own purchase-mode resolution (GET /api/product/{id}/details returns
 * purchaseMode, emcardCashPrice, pointsRequired, emcardSavings,
 * pointsOptional and earnRatePercent, already collapsed to CASH_ONLY for a
 * non-member). This page renders those values; it does not reconstruct the
 * offer from mrpPrice/cardholderPrice/points, and nothing here hardcodes an
 * earn rate.
 *
 *   CASH_ONLY           selling price only
 *   EMCARD_DISCOUNT     price + member price + saving + checkbox
 *   FULL_REDEMPTION     "redeem N e-Points", no cash
 *   PARTIAL_REDEMPTION  cash + N e-Points
 *
 * Every mode that HAS an offer is the shopper's choice: the page opens on
 * the regular price and the checkbox swaps in the offer terms.
 *
 * WHAT CHANGED: presentation only. A sticky buy panel beside the gallery, a
 * proper loading skeleton instead of the word "Loading...", the eMCard offer
 * expressed through the shared OfferBlock, and the eight props this
 * component used to receive replaced by EmcardContext.
 * ------------------------------------------------------------------
 */
function ProductDetails({ productId, onBack, onBuyNow }) {
  const {
    emcardSelectedIds,
    emcardError,
    isEmcardMember,
    handleEmcardToggle,
    addToCart,
  } = useEmcard();

  const [activeImage, setActiveImage] = useState(null);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  const fetchDetails = useCallback(
    () => getProductDetails(productId),
    [productId]
  );

  const {
    data: details,
    loading,
    error,
    refetch,
  } = useApi(fetchDetails, [productId], { skip: !productId });

  /* ------------------------------------------------------------- STATES */

  if (loading) {
    return (
      <div className="pdp">
        <div className="pdp__grid">
          <Skeleton variant="media" className="pdp__skeleton-gallery" />
          <div className="stack">
            <Skeleton variant="title" width="70%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="title" width="30%" height="2rem" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" height="48px" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="pdp">
        <ErrorState
          title="We couldn't load this product"
          message={error || "The product may have been removed from the catalogue."}
          onRetry={refetch}
        />
        <div style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          <Button variant="ghost" icon="bi-arrow-left" onClick={onBack}>
            Back to products
          </Button>
        </div>
      </div>
    );
  }

  const {
    productName,
    price,
    mrpPrice,
    cardholderPrice,
    description,
    brand,
    category,
    stock,
    points,
    images = [],
    specifications = [],
  } = details;

  const stockInfo = getStockInfo(details);
  const isEmcardApplied = emcardSelectedIds.has(String(productId));
  const gallery = images.length > 0 ? images : [];
  const shownImage = activeImage ?? gallery[0] ?? null;

  /* ------------------------------------------------- PURCHASE MODE ----
     Read straight off the API response, exactly as before. */

  const purchaseMode = details.purchaseMode || "CASH_ONLY";
  const modeLabel = details.purchaseModeLabel || "";
  const mrp = Number(mrpPrice ?? price ?? 0);
  const emcardCash = Number(details.emcardCashPrice ?? cardholderPrice ?? 0);
  const pointsRequired = Number(details.pointsRequired ?? points ?? 0);
  const emcardSavings = Number(details.emcardSavings ?? 0);

  // Every mode that HAS an offer (2, 3, 4) is the member's choice. The
  // backend says so; the fallback only covers an older response shape.
  const pointsOptional = details.pointsOptional ?? purchaseMode !== "CASH_ONLY";

  const isFullRedemption = purchaseMode === "FULL_REDEMPTION";
  const isPartialRedemption = purchaseMode === "PARTIAL_REDEMPTION";
  const isEmcardDiscount =
    purchaseMode === "EMCARD_DISCOUNT" || purchaseMode === "EMCARD_PRICE";
  const hasEmcardOffer =
    isEmcardDiscount || isFullRedemption || isPartialRedemption;

  let emcardLabel = null;
  if (isEmcardDiscount) {
    emcardLabel = `e-Mcard price ${formatCurrency(emcardCash)}`;
  } else if (isFullRedemption) {
    emcardLabel = `Redeem ${pointsRequired} e-Points — no cash to pay`;
  } else if (isPartialRedemption) {
    emcardLabel = `${formatCurrency(emcardCash)} + ${pointsRequired} e-Points`;
  }

  // What the shopper pays in cash right now. EVERY offer mode starts at the
  // regular price and only switches to the mode's terms once the box is
  // ticked:  mode 2 -> 100 becomes 90;  mode 3 -> paid in points;
  //          mode 4 -> 90 + 7 e-Points.
  const offerApplied = isEmcardApplied;
  const displayedPrice = offerApplied
    ? isFullRedemption
      ? 0
      : emcardCash > 0
        ? emcardCash
        : Number(price ?? 0)
    : Number(price ?? 0);

  const pointsPayable =
    offerApplied && (isFullRedemption || isPartialRedemption)
      ? pointsRequired
      : 0;

  // Points this purchase will EARN: the configured rate from the API applied
  // to the cash actually payable, rounded DOWN - the same arithmetic
  // LoyaltyPolicy applies at settlement, so this promise matches what gets
  // credited. Nothing here hardcodes a percentage.
  const earnRatePercent = details.earnRatePercent ?? null;
  const pointsToEarn = earnRatePercent
    ? Math.floor((Number(displayedPrice) * Number(earnRatePercent)) / 100)
    : 0;

  // While a sale is running, `price` above IS the sale price - show the
  // original MRP alongside it so the saving is visible.
  const showSalePricing =
    Boolean(details.onSale) && !isEmcardApplied && mrp > displayedPrice;

  const rating = details.rating
    ? { value: Number(details.rating), count: details.ratingCount ?? null }
    : null;

  /* ----------------------------------------------------------- ACTIONS */

  const runAction = (setBusy, after) => {
    if (adding || buying) return;
    setBusy(true);
    Promise.resolve(addToCart(details))
      .then(() => after?.())
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  /* ------------------------------------------------------------ RENDER */

  return (
    <div className="pdp">
      <Button
        variant="ghost"
        size="sm"
        icon="bi-arrow-left"
        onClick={onBack}
        className="pdp__back"
      >
        Back to products
      </Button>

      <div className="pdp__grid">
        {/* ------------------------------------------------- GALLERY --- */}
        <div className="pdp-gallery">
          <div className="pdp-gallery__main">
            {/* The only place an explicit alt is warranted: on this page
                the photograph carries information the heading does not. */}
            <ProductImage
              src={shownImage}
              alt={productName}
              loading="eager"
              placeholderClassName="pdp-gallery__placeholder"
            />

            {showSalePricing && (
              <span className="pdp-gallery__flag ui-badge ui-badge--danger">
                {Math.round(((mrp - displayedPrice) / mrp) * 100)}% off
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="pdp-gallery__thumbs" role="list">
              {gallery.map((image, index) => (
                <button
                  type="button"
                  role="listitem"
                  key={`thumb-${index}`}
                  className={`pdp-gallery__thumb ${
                    image === shownImage ? "pdp-gallery__thumb--active" : ""
                  }`}
                  onClick={() => setActiveImage(image)}
                  aria-label={`View image ${index + 1} of ${gallery.length}`}
                  aria-pressed={image === shownImage}
                >
                  <ProductImage src={image} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- INFO --- */}
        <div className="pdp-info">
          <div className="pdp-info__meta">
            {brand && <span className="ui-chip">{brand}</span>}
            {category && <span className="ui-chip">{category}</span>}
            {modeLabel && (
              <span
                className={`ui-badge ${
                  hasEmcardOffer ? "ui-badge--loyalty" : "ui-badge--neutral"
                }`}
              >
                {modeLabel}
              </span>
            )}
          </div>

          <h1 className="pdp-info__title">{productName}</h1>

          {rating && <Rating value={rating.value} count={rating.count} />}

          {/* ------------------------------------------------ PRICE --- */}
          <div className="pdp-info__price">
            <Price
              value={displayedPrice}
              mrp={showSalePricing ? mrp : null}
              points={pointsPayable}
              size="lg"
            />

            {emcardSavings > 0 && (
              <span className="pdp-info__savings">
                <i className="bi bi-tag-fill" aria-hidden="true" />
                {offerApplied ? "You save" : "Save"}{" "}
                {formatCurrency(emcardSavings)} with e-Mcard
              </span>
            )}

            <span className="pdp-info__tax-note">Inclusive of all taxes</span>
          </div>

          {/* ------------------------------------------------ OFFER --- */}
          {hasEmcardOffer && (
            <div className="pdp-info__offer">
              {pointsOptional ? (
                <OfferBlock
                  inputId={`pdp-emcard-${productId}`}
                  label={emcardLabel}
                  savings={emcardSavings}
                  checked={isEmcardApplied}
                  isMember={isEmcardMember}
                  error={
                    emcardError?.productId === String(productId)
                      ? emcardError.message
                      : null
                  }
                  onToggle={(checked) => handleEmcardToggle(details, checked)}
                />
              ) : (
                /* Fallback for a backend that reports an offer as
                   non-optional - applied automatically, nothing to tick. */
                <Alert variant="loyalty" title={emcardLabel}>
                  {isFullRedemption
                    ? "Redeemed using e-Mcard points"
                    : "Cash + e-Mcard points"}{" "}
                  · applied automatically at checkout
                </Alert>
              )}
            </div>
          )}

          {/* ---------------------------------------- POINTS EARNED --- */}
          {pointsToEarn > 0 && (
            <div className="pdp-info__earn">
              <i className="bi bi-stars" aria-hidden="true" />
              <span>
                Earn <strong>{pointsToEarn} e-Mcard points</strong> on this
                purchase
                {earnRatePercent
                  ? ` (${earnRatePercent}% of ${formatCurrency(displayedPrice)})`
                  : ""}
              </span>
            </div>
          )}

          {/* ------------------------------------------------ STOCK --- */}
          <div
            className={`pdp-info__stock ${
              stockInfo.inStock
                ? "pdp-info__stock--in"
                : "pdp-info__stock--out"
            }`}
          >
            <i
              className={`bi ${
                stockInfo.inStock ? "bi-check-circle-fill" : "bi-x-circle-fill"
              }`}
              aria-hidden="true"
            />
            {stockInfo.known
              ? stockInfo.inStock
                ? `In stock — ${stock} available`
                : "Out of stock"
              : "In stock"}
          </div>

          {/* ---------------------------------------------- ACTIONS --- */}
          <div className="pdp-info__actions">
            <Button
              variant="outline"
              size="lg"
              icon="bi-cart-plus"
              disabled={!stockInfo.inStock}
              loading={adding}
              loadingText="Adding..."
              onClick={() => runAction(setAdding)}
            >
              Add to cart
            </Button>

            <Button
              variant="accent"
              size="lg"
              icon="bi-lightning-charge-fill"
              disabled={!stockInfo.inStock}
              loading={buying}
              loadingText="Working..."
              onClick={() => runAction(setBuying, () => onBuyNow?.(details))}
            >
              Buy now
            </Button>
          </div>

          <ul className="pdp-info__assurances">
            <li>
              <i className="bi bi-truck" aria-hidden="true" /> Free delivery on
              orders above ₹499
            </li>
            <li>
              <i className="bi bi-shield-check" aria-hidden="true" /> Secure
              payment via Razorpay
            </li>
            <li>
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Easy
              returns on eligible items
            </li>
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------- DETAILS ----- */}
      <div className="pdp__panels">
        {description && (
          <section className="pdp-panel">
            <h2 className="pdp-panel__title">About this product</h2>
            <p className="pdp-panel__text">{description}</p>
          </section>
        )}

        {specifications.length > 0 && (
          <section className="pdp-panel">
            <h2 className="pdp-panel__title">Specifications</h2>
            <table className="pdp-specs">
              <caption className="sr-only">
                Technical specifications for {productName}
              </caption>
              <tbody>
                {specifications.map((spec, index) => (
                  <tr key={`spec-${index}`}>
                    <th scope="row">{spec.configName}</th>
                    <td>{spec.configValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProductDetails;
