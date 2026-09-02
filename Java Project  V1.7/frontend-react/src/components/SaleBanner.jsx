import { useEffect, useRef, useState } from "react";
import { getRandomSaleProduct } from "../services/productService";
import { formatCurrency } from "../utils/format";

/**
 * SaleBanner.jsx
 * ------------------------------------------------------------------
 * Homepage promo banner, rendered directly below the top navigation
 * (see App.jsx's <Home /> - it sits between the .navigation nav and
 * .main-container).
 *
 * On mount (and on every REFRESH_INTERVAL_MS afterwards, so a sale
 * that starts/ends while the tab is left open is picked up without
 * a manual reload) it asks the backend for one random, currently
 * active on-sale product via GET /api/product/sale-random. The
 * randomization happens server-side (DB-level ORDER BY RAND() LIMIT
 * 1) - this component never fetches a list and picks client-side.
 *
 * Behavior when there's nothing to show (BRD point 5): the banner
 * hides itself completely (renders null) rather than showing an
 * empty/fallback box - a 204 response, a network error, and "user
 * dismissed it" all collapse to the same "render nothing" outcome so
 * the rest of the homepage never has to reserve space for it.
 *
 * Clicking anywhere on the banner opens that product's detail view.
 * This app doesn't route product details through a URL
 * (/product/:id) - Home already shows product details by setting
 * local `selectedProductId` state (see ProductCard's onViewProduct/
 * handleViewProduct in App.jsx). onViewProduct here plugs into that
 * exact same mechanism so the banner behaves identically to clicking
 * any other product card in the app.
 */

const REFRESH_INTERVAL_MS = 60_000;

function formatTimeLeft(ms) {
  if (ms == null || ms <= 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m left`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s left`;
  return `${minutes}m ${seconds}s left`;
}

function SaleBanner({ onViewProduct }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [msLeft, setMsLeft] = useState(null);

  const mountedRef = useRef(true);

  // ==================================================
  // FETCH (initial load + periodic refresh)
  // ==================================================

  useEffect(() => {
    mountedRef.current = true;

    const fetchSaleProduct = () => {
      setFailed(false);

      getRandomSaleProduct()
        .then((response) => {
          if (!mountedRef.current) return;
          // 204 -> response.data is null (see axiosConfig.js) -
          // that's a legitimate "nothing on sale" result, not an
          // error, so it flows straight into setProduct(null).
          setProduct(response.data || null);
        })
        .catch((error) => {
          console.error("Error loading sale banner product:", error);
          if (!mountedRef.current) return;
          setProduct(null);
          setFailed(true);
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
    };

    setLoading(true);
    fetchSaleProduct();

    const intervalId = setInterval(fetchSaleProduct, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, []);

  // ==================================================
  // COUNTDOWN (ticks every second while a sale end date exists)
  // ==================================================

  useEffect(() => {
    if (!product?.saleEndDate) {
      setMsLeft(null);
      return;
    }

    const endTime = new Date(product.saleEndDate).getTime();

    const tick = () => {
      const diff = endTime - Date.now();
      setMsLeft(diff > 0 ? diff : 0);
    };

    tick();
    const tickId = setInterval(tick, 1000);

    return () => clearInterval(tickId);
  }, [product]);

  // Sale expired while the tab was open (countdown hit 0) - hide
  // gracefully instead of showing a stale/expired offer. The next
  // periodic refresh will replace it with whatever is on sale next.
  const expired = product?.saleEndDate != null && msLeft === 0;

  if (dismissed || failed || (!loading && !product) || expired) {
    return null;
  }

  if (loading) {
    return (
      <div className="sale-banner sale-banner-loading" aria-hidden="true">
        <div className="sale-banner-skeleton-media" />
        <div className="sale-banner-skeleton-lines">
          <div className="sale-banner-skeleton-line sale-banner-skeleton-line-wide" />
          <div className="sale-banner-skeleton-line sale-banner-skeleton-line-narrow" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const timeLeftLabel = formatTimeLeft(msLeft);

  const handleActivate = () => {
    onViewProduct && onViewProduct(product);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      className="sale-banner"
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      aria-label={`Limited time offer on ${product.productName}. View product.`}
    >
      <button
        type="button"
        className="sale-banner-close"
        aria-label="Dismiss offer"
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
      >
        ✕
      </button>

      <div className="sale-banner-message">
        <span className="sale-banner-flame" aria-hidden="true">
          🔥
        </span>
        Limited Time Offer! Grab it before it's gone
      </div>

      <div className="sale-banner-product">
        <div className="sale-banner-image">
          {product.productImagePath ? (
            <img src={product.productImagePath} alt={product.productName} />
          ) : (
            <span className="sale-banner-placeholder" aria-hidden="true">
              📦
            </span>
          )}
        </div>

        <div className="sale-banner-details">
          <span className="sale-banner-name">{product.productName}</span>

          <span className="sale-banner-price-row">
            <span className="sale-banner-discounted-price">
              {formatCurrency(product.discountedPrice)}
            </span>

            {product.originalPrice != null &&
              Number(product.originalPrice) >
                Number(product.discountedPrice) && (
                <span className="sale-banner-original-price">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}

            {product.discountPercent != null &&
              product.discountPercent > 0 && (
                <span className="sale-banner-discount-pct">
                  {product.discountPercent}% OFF
                </span>
              )}
          </span>
        </div>

        {timeLeftLabel && (
          <div className="sale-banner-countdown">
            <span className="sale-banner-countdown-icon" aria-hidden="true">
              ⏱
            </span>
            {timeLeftLabel}
          </div>
        )}

        <span className="sale-banner-cta">Shop Now →</span>
      </div>
    </div>
  );
}

export default SaleBanner;
