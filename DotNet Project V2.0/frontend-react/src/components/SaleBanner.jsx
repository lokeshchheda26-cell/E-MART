import { useEffect, useRef, useState } from "react";
import { getAllProducts } from "../services/productService";
import Price from "./ui/Price";
import ProductImage from "./ui/ProductImage";
import { Skeleton } from "./ui/Feedback";
import { getProductId, getProductImage, getProductName } from "../utils/product";

/**
 * SaleBanner.jsx - the hero deal card
 * ------------------------------------------------------------------
 * A rotating "deal of the moment", built from REAL catalogue products
 * (GET /api/product, already used elsewhere) so "Shop now" always has a
 * genuine productId to open. On-sale products are shown with their live
 * discount and a countdown to the sale's end; if nothing is on sale, the
 * biggest MRP-vs-eMCard-price savings take over so the card still has real
 * products to rotate through rather than going blank.
 *
 * The data logic below is unchanged. What changed is where it lives: this
 * used to be a thin full-width strip wedged between the navigation and the
 * page content, which meant the single most persuasive thing on the site -
 * a live discount - was rendered as a notification bar. It is now a card
 * inside the hero, next to the headline.
 *
 * Auto-advances on its own schedule, fading between promos. The arrows jump
 * on demand without resetting that timer. Both timers are cleared on
 * unmount, and the whole thing is skipped when only one promo exists.
 * ------------------------------------------------------------------
 */

const FADE_MS = 260;
const ROTATE_INTERVAL_MS = 6000;
const MAX_PROMOTIONS = 6;

function formatTimeLeft(ms) {
  if (ms == null || ms <= 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s left`;
  return `${minutes}m ${seconds}s left`;
}

function buildPromotions(products) {
  const onSale = products.filter((p) => p.onSale && p.salePrice != null);

  // Nothing on sale right now - fall back to the biggest MRP-vs-eMCard-price
  // savings, so the card still shows real products (with real ids).
  const pool = onSale.length > 0 ? onSale : products;

  return pool
    .map((product) => {
      const originalPrice = Number(product.mrpPrice ?? 0);
      const discountedPrice = Number(
        product.onSale && product.salePrice != null
          ? product.salePrice
          : (product.cardholderPrice ?? originalPrice)
      );
      const discountPercent =
        originalPrice > 0
          ? Math.round((1 - discountedPrice / originalPrice) * 100)
          : 0;

      return {
        product,
        productId: getProductId(product),
        name: getProductName(product),
        image: getProductImage(product),
        originalPrice,
        discountedPrice,
        discountPercent,
        saleEndDate: product.onSale ? product.saleEndDate : null,
      };
    })
    .filter((promo) => promo.discountPercent > 0)
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, MAX_PROMOTIONS);
}

/**
 * `products` is optional. The home page already loads the catalogue for its
 * product rails, so it hands the same array down rather than making this
 * component fire a second identical GET /api/product on every visit. Used
 * standalone (no prop), it still fetches for itself.
 */
function SaleBanner({ onViewProduct, products = null, productsLoading = false }) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [msLeft, setMsLeft] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Products supplied by the parent - no request needed.
    if (products) {
      setPromotions(buildPromotions(products));
      setLoading(productsLoading);
      return undefined;
    }

    getAllProducts()
      .then((response) => {
        if (!mountedRef.current) return;
        setPromotions(buildPromotions(response.data || []));
      })
      .catch((error) => {
        console.error("Error loading promo banner products:", error);
        if (!mountedRef.current) return;
        setPromotions([]);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [products, productsLoading]);

  // Fades the current promo out before swapping, so the change reads as a
  // transition rather than a hard cut. Shared by the timer and the arrows.
  const goTo = (computeNextIndex) => {
    setVisible(false);
    setTimeout(() => {
      if (!mountedRef.current) return;
      setActiveIndex(computeNextIndex);
      setVisible(true);
    }, FADE_MS);
  };

  // Auto-advance - runs on its own schedule, never reset by manual clicks.
  useEffect(() => {
    if (promotions.length <= 1) return undefined;

    const intervalId = setInterval(() => {
      goTo((prev) => (prev + 1) % promotions.length);
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotions.length]);

  // Live countdown for the currently displayed promo, when it has a real
  // sale end date.
  useEffect(() => {
    const endDateStr = promotions[activeIndex]?.saleEndDate;
    if (!endDateStr) {
      setMsLeft(null);
      return undefined;
    }

    const endTime = new Date(endDateStr).getTime();
    const tick = () => setMsLeft(Math.max(endTime - Date.now(), 0));

    tick();
    const tickId = setInterval(tick, 1000);
    return () => clearInterval(tickId);
  }, [promotions, activeIndex]);

  /* A placeholder while loading keeps the hero from collapsing and then
     jolting back open when the products arrive. */
  if (loading) {
    return (
      <div className="deal-card" aria-hidden="true">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="media" className="deal-card__media" />
        <Skeleton variant="title" width="70%" />
        <Skeleton variant="text" width="45%" />
      </div>
    );
  }

  if (promotions.length === 0) return null;

  const promo = promotions[activeIndex];
  const timeLeftLabel = formatTimeLeft(msLeft);
  const canNavigate = promotions.length > 1;

  return (
    <div
      className={`deal-card ${visible ? "" : "deal-card--fading"}`}
      aria-label="Featured deal"
    >
      <div className="deal-card__head">
        <span className="deal-card__flag">
          <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
          Deal of the moment
        </span>

        {canNavigate && (
          <div className="deal-card__nav">
            <button
              type="button"
              className="ui-icon-btn ui-icon-btn--sm ui-icon-btn--bordered"
              onClick={() =>
                goTo((prev) => (prev - 1 + promotions.length) % promotions.length)
              }
              aria-label="Previous deal"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ui-icon-btn ui-icon-btn--sm ui-icon-btn--bordered"
              onClick={() => goTo((prev) => (prev + 1) % promotions.length)}
              aria-label="Next deal"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="deal-card__media">
        <ProductImage
          src={promo.image}
          loading="eager"
          placeholderClassName="deal-card__placeholder"
        />

        {promo.discountPercent > 0 && (
          <span className="deal-card__off">{promo.discountPercent}% off</span>
        )}
      </div>

      {/* aria-live so the rotation is announced rather than silently
          swapping the content under a screen-reader user. */}
      <div aria-live="polite">
        <p className="deal-card__name line-clamp-2">{promo.name}</p>
        <Price
          value={promo.discountedPrice}
          mrp={promo.originalPrice}
          compact
        />
      </div>

      <div className="spread">
        {timeLeftLabel ? (
          <span className="deal-card__countdown">
            <i className="bi bi-clock-history" aria-hidden="true" />
            {timeLeftLabel}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={() => onViewProduct?.(promo.product)}
        >
          <span>Shop now</span>
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      </div>

      {canNavigate && (
        <div className="deal-card__dots" aria-hidden="true">
          {promotions.map((item, index) => (
            <span
              key={item.productId ?? index}
              className={`deal-card__dot ${
                index === activeIndex ? "deal-card__dot--active" : ""
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SaleBanner;
