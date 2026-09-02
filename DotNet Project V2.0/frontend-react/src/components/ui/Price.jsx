import { formatCurrency } from "../../utils/format";

/**
 * Price.jsx
 * ------------------------------------------------------------------
 * One money display for the whole storefront.
 *
 * Price was previously rendered five different ways: "₹1,299.00" on the
 * invoice, "1,299" with no symbol on listing cards, "₹1299" rounded on the
 * product page, and a raw toLocaleString in the cart. That inconsistency
 * makes a shopper stop and re-read - the single most expensive thing a
 * price label can do.
 *
 * Rules, applied everywhere:
 *   - the payable amount is the loudest thing in the block;
 *   - MRP only appears when it is genuinely higher, struck through and quiet;
 *   - the saving is stated as a percentage, in the success colour;
 *   - points are violet, the reserved eMCard colour.
 *
 * `compact` drops the paise (₹1,299 rather than ₹1,299.00) for listing
 * cards, where two decimal places on every tile is just noise. Checkout,
 * payment and the invoice always show full precision.
 */
export default function Price({
  value,
  mrp = null,
  points = 0,
  size = "md",
  compact = false,
  className = "",
}) {
  const current = Number(value ?? 0);
  const listPrice = mrp == null ? null : Number(mrp);
  const showMrp = listPrice != null && listPrice > current;
  const discountPct = showMrp
    ? Math.round(((listPrice - current) / listPrice) * 100)
    : 0;

  const format = (amount) =>
    compact
      ? `₹${Math.round(amount).toLocaleString("en-IN")}`
      : formatCurrency(amount);

  const sizeClass =
    size === "lg" ? "ui-price--lg" : size === "sm" ? "ui-price--sm" : "";

  return (
    <span className={`ui-price ${sizeClass} ${className}`}>
      {/* A points-only line has no cash component at all - saying "₹0" there
          reads as an error, so it is phrased as points instead. */}
      {current <= 0 && points > 0 ? (
        <span className="ui-price__points">
          <i className="bi bi-gift-fill" aria-hidden="true" /> {points} e-Points
        </span>
      ) : (
        <>
          <span className="ui-price__current">{format(current)}</span>

          {showMrp && (
            <>
              <span className="ui-price__mrp">
                <span className="sr-only">Was </span>
                {format(listPrice)}
              </span>
              {discountPct > 0 && (
                <span className="ui-price__off">{discountPct}% off</span>
              )}
            </>
          )}

          {points > 0 && (
            <span className="ui-price__points">+ {points} e-Points</span>
          )}
        </>
      )}
    </span>
  );
}
