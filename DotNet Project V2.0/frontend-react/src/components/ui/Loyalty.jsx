import { Link } from "react-router-dom";

/**
 * Loyalty.jsx
 * ------------------------------------------------------------------
 * The eMCard programme's visual vocabulary, kept together so loyalty always
 * looks like loyalty wherever it appears.
 *
 * Violet is reserved for these components and used nowhere else in the app,
 * which is what lets a member spot their benefit on a busy product grid
 * without reading the label first.
 *
 * None of these components decide anything. Eligibility, pricing and point
 * arithmetic are all resolved server-side by the purchase-mode engine; this
 * module only renders the figures it is handed.
 * ------------------------------------------------------------------
 */

/** Compact points balance - header, cart summary, order rows. */
export function PointsPill({ points, solid = false, label = "eMCard", icon = true }) {
  return (
    <span className={`ui-points-pill ${solid ? "ui-points-pill--solid" : ""}`}>
      {icon && <i className="bi bi-gift-fill" aria-hidden="true" />}
      <span>{label}</span>
      <span className="ui-points-pill__value">
        {Number(points ?? 0).toLocaleString("en-IN")}
      </span>
      <span className="sr-only">points available</span>
      <span aria-hidden="true">pts</span>
    </span>
  );
}

/**
 * The membership card itself. Shown on the home page's loyalty band, the
 * profile page and the join page - so the programme reads as something the
 * shopper HAS, rather than a number in a corner of the header.
 */
export function EmcardVisual({
  points = 0,
  holderName,
  isMember = true,
  earnRatePercent = null,
}) {
  return (
    <div className="ui-emcard">
      <div className="ui-emcard__header">
        <span className="ui-emcard__brand">
          <i className="bi bi-gift-fill" aria-hidden="true" />
          e-Mcard
        </span>
        <span className="ui-emcard__chip" aria-hidden="true" />
      </div>

      <div className="ui-emcard__balance">
        <div className="ui-emcard__balance-label">
          {isMember ? "Available balance" : "Join to start earning"}
        </div>
        <div className="ui-emcard__balance-value">
          {isMember ? Number(points ?? 0).toLocaleString("en-IN") : "100"}
          <span className="ui-emcard__balance-unit">pts</span>
        </div>
        {!isMember && (
          <div className="ui-emcard__balance-label" style={{ marginTop: 4 }}>
            Welcome bonus on sign-up
          </div>
        )}
      </div>

      <div className="ui-emcard__holder">
        {holderName || "E-Mart member"}
        {earnRatePercent ? ` · earns ${earnRatePercent}%` : ""}
      </div>
    </div>
  );
}

/**
 * The offer block on a product card / product page.
 *
 * Four purchase modes have to be explained in the same slot:
 *   CASH_ONLY          - no offer, this component is not rendered at all
 *   EMCARD_DISCOUNT    - a lower cash price for members
 *   FULL_REDEMPTION    - paid entirely in points
 *   PARTIAL_REDEMPTION - cash AND points
 *
 * Every offer is the shopper's CHOICE: the price shown stays the regular
 * price until the box is ticked. A non-member sees the same real terms with
 * the control disabled and a route to join - the backend sends the terms to
 * every viewer, and enforcement of who may actually redeem is server-side
 * regardless of what is rendered here.
 */
export function OfferBlock({
  label,
  savings = 0,
  checked = false,
  onToggle,
  isMember,
  error = null,
  inputId,
}) {
  if (!label) return null;

  if (!isMember) {
    return (
      <div className="ui-offer ui-offer--locked">
        <span className="ui-offer__label">
          <input type="checkbox" checked={false} disabled readOnly tabIndex={-1} />
          <span>{label}</span>
        </span>
        <span className="ui-offer__join">
          <span>Members save on this item.</span>
          <Link to="/emcard/join" className="ui-offer__join-link">
            Join e-Mcard free <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="ui-offer">
      <label className="ui-offer__label" htmlFor={inputId}>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(event) => onToggle?.(event.target.checked)}
        />
        <span>{label}</span>
      </label>

      {savings > 0 && (
        <span className="ui-offer__note">
          {checked ? "You save" : "Save"} ₹
          {Math.round(savings).toLocaleString("en-IN")} with e-Mcard
        </span>
      )}

      {error && (
        <span className="ui-offer__error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" /> {error}
        </span>
      )}
    </div>
  );
}
