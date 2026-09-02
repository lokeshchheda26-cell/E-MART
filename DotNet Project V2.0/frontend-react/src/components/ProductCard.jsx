import { useState } from "react";
import { useEmcard } from "../context/EmcardContext";
import Price from "./ui/Price";
import ProductImage from "./ui/ProductImage";
import Rating from "./ui/Rating";
import { OfferBlock } from "./ui/Loyalty";
import {
  getProductBrand,
  getProductDescription,
  getProductId,
  getProductImage,
  getProductName,
  getRating,
  getStockInfo,
} from "../utils/product";
import {
  MODE,
  getEmcardCash,
  getMrp,
  getPointsRequired,
  getRegularPrice,
  isSaleActive,
  resolvePurchaseMode,
} from "../utils/purchaseMode";

/**
 * ProductCard.jsx
 * ------------------------------------------------------------------
 * THE product card. One implementation, used by the home page's product
 * rails, category listings and search results alike.
 *
 * There were previously two: a standalone ProductCard.jsx that nothing
 * imported (and which read the wrong price fields), and a second copy
 * written inline inside CategoryList.jsx that was the one actually on
 * screen. This file is now the only one, and CategoryList renders it.
 *
 * Layout decisions that matter on a grid:
 *   - the image sits in a fixed 1:1 box with object-fit: contain, so a tall
 *     bottle and a wide television occupy identical space and the grid never
 *     reflows as images load;
 *   - the title is clamped to two lines and the offer row reserves its slot,
 *     so cards in a row stay the same height regardless of name length;
 *   - the whole card is clickable via a pseudo-element on the title link,
 *     which keeps a single, correctly-labelled tab stop for the product
 *     instead of a <div onClick> that keyboard users cannot reach at all.
 *
 * PRICING is not decided here. Mode, cash price and points all come from
 * utils/purchaseMode.js - the same helper the eMCard toggle handler uses -
 * so a card can never advertise an offer the handler would then refuse.
 * ------------------------------------------------------------------
 */

/** Compact money for a dense grid: no paise, Indian digit grouping. */
const plain = (value) => Math.round(Number(value ?? 0)).toLocaleString("en-IN");

/**
 * The eMCard offer line for this product, or null when the mode has no
 * offer to show. Mirrors the four purchase modes exactly.
 */
function buildOffer(product) {
  const mode = resolvePurchaseMode(product);
  const regular = Number(getRegularPrice(product));
  const cash = getEmcardCash(product);
  const points = getPointsRequired(product);

  switch (mode) {
    case MODE.EMCARD_DISCOUNT:
      if (!(cash > 0 && cash < regular)) return null;
      return { label: `e-Mcard price ₹${plain(cash)}`, savings: regular - cash };

    case MODE.FULL_REDEMPTION:
      if (points <= 0) return null;
      return { label: `Redeem ${points} e-Points`, savings: 0 };

    case MODE.PARTIAL_REDEMPTION:
      if (points <= 0 || cash <= 0) return null;
      return {
        label: `₹${plain(cash)} + ${points} e-Points`,
        savings: regular - cash,
      };

    default:
      // MODE 1 - cash only. No offer row at all.
      return null;
  }
}

export default function ProductCard({ product, onView }) {
  const {
    emcardSelectedIds,
    emcardError,
    isEmcardMember,
    handleEmcardToggle,
    addToCart,
  } = useEmcard();

  const [adding, setAdding] = useState(false);

  const productId = getProductId(product);
  const key = String(productId);
  const name = getProductName(product);
  const image = getProductImage(product);
  const description = getProductDescription(product);
  const brand = getProductBrand(product);
  const rating = getRating(product);
  const stock = getStockInfo(product);

  const price = getRegularPrice(product);
  const mrp = getMrp(product);
  const onSale = isSaleActive(product) && mrp > price;
  const discountPct = onSale ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const offer = buildOffer(product);
  const offerChecked = emcardSelectedIds.has(key);
  const offerError =
    emcardError?.productId === key ? emcardError.message : null;

  const handleAdd = () => {
    // Guards against a double-click placing two units in the cart while the
    // first request is still in flight.
    if (adding) return;
    setAdding(true);
    Promise.resolve(addToCart(product))
      .catch(() => {})
      .finally(() => setAdding(false));
  };

  return (
    <article className="product-card">
      <div className="product-card__media">
        <ProductImage
          src={image}
          className="product-card__img"
          placeholderClassName="product-card__placeholder"
        />

        <div className="product-card__flags">
          {onSale && discountPct > 0 && (
            <span className="ui-badge ui-badge--danger">{discountPct}% off</span>
          )}
          {offer && isEmcardMember && (
            <span className="ui-badge ui-badge--loyalty">
              <i className="bi bi-gift-fill" aria-hidden="true" /> Member price
            </span>
          )}
        </div>

        {!stock.inStock && (
          <div className="product-card__soldout">Out of stock</div>
        )}
      </div>

      <div className="product-card__body">
        {brand && <span className="product-card__brand">{brand}</span>}

        <h3 className="product-card__title">
          {/* The ::after on this button covers the whole card, so a click
              anywhere opens the product - while the accessible name stays
              the product name rather than "card". */}
          <button
            type="button"
            className="product-card__link"
            onClick={() => onView?.(product)}
          >
            <span className="line-clamp-2">{name}</span>
          </button>
        </h3>

        {rating ? (
          <Rating value={rating.value} count={rating.count} size="sm" />
        ) : (
          description && (
            <p className="product-card__desc line-clamp-1">{description}</p>
          )
        )}

        <Price value={price} mrp={onSale ? mrp : null} compact />

        {/* The offer slot is always reserved, even when a product has no
            offer, so neighbouring cards in the grid stay aligned. */}
        <div className="product-card__offer-slot">
          {offer && (
            <OfferBlock
              inputId={`emcard-offer-${key}`}
              label={offer.label}
              savings={offer.savings}
              checked={offerChecked}
              isMember={isEmcardMember}
              error={offerError}
              onToggle={(checked) => handleEmcardToggle(product, checked)}
            />
          )}
        </div>

        <div className="product-card__actions">
          <button
            type="button"
            className="ui-btn ui-btn--accent ui-btn--block product-card__cta"
            onClick={handleAdd}
            disabled={!stock.inStock || adding}
            aria-busy={adding || undefined}
          >
            {adding ? (
              <span className="ui-btn__spinner" aria-hidden="true" />
            ) : (
              <i className="bi bi-cart-plus" aria-hidden="true" />
            )}
            <span>
              {!stock.inStock
                ? "Out of stock"
                : adding
                  ? "Adding..."
                  : "Add to cart"}
            </span>
          </button>
        </div>

        {stock.lowStock && (
          <p className="product-card__stock-warning">
            <i className="bi bi-exclamation-circle" aria-hidden="true" /> Only{" "}
            {stock.quantity} left
          </p>
        )}
      </div>
    </article>
  );
}
