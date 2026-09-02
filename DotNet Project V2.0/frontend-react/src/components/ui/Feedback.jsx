import Button from "./Button";

/**
 * Feedback.jsx
 * ------------------------------------------------------------------
 * The four states every data-driven region in the app can be in:
 * loading, empty, error, and (for lists) skeleton placeholders.
 *
 * They live together in one module on purpose - they are alternatives to
 * each other, and keeping them side by side makes it obvious when a screen
 * has forgotten to handle one of them. Before this, each page hand-rolled
 * its own spinner div and "nothing here" message, so the wording, spacing
 * and iconography differed on every screen.
 * ------------------------------------------------------------------
 */

/* ----------------------------------------------------------- SPINNER */

export function Spinner({ size = "md", label = "Loading" }) {
  const sizeClass = size === "sm" ? "ui-spinner--sm" : size === "lg" ? "ui-spinner--lg" : "";
  return (
    <span className={`ui-spinner ${sizeClass}`} role="status" aria-label={label} />
  );
}

/** Centred spinner + caption, for a region that has nothing to show yet. */
export function LoadingBlock({ children = "Loading..." }) {
  return (
    <div className="ui-loading-block">
      <Spinner size="lg" />
      <span>{children}</span>
    </div>
  );
}

/* --------------------------------------------------------- SKELETONS
   Shaped like the content they stand in for. A skeleton that does not match
   the real layout is worse than a spinner - the page still jumps when the
   data lands, it just jumps later. */

export function Skeleton({ variant = "text", width, height, className = "", style }) {
  return (
    <span
      className={`ui-skeleton ui-skeleton--${variant} ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

/** Matches ProductCard's proportions exactly: square media, then 4 rows. */
export function ProductCardSkeleton() {
  return (
    <div className="ui-skeleton-card">
      <Skeleton variant="media" className="ui-skeleton-card__media" />
      <div className="ui-skeleton-card__body">
        <Skeleton variant="title" width="85%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" height="34px" className="ui-skeleton--button" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={`product-skeleton-${index}`} />
      ))}
    </div>
  );
}

export function CategoryTilesSkeleton({ count = 6 }) {
  return (
    <div className="cat-tiles" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="cat-tile" key={`cat-skeleton-${index}`}>
          <Skeleton variant="circle" width="72px" height="72px" />
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="40%" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- EMPTY STATE
   An empty state should always say what happened, why, and what to do
   next - the third part is the one that usually gets left out. */

export function EmptyState({
  icon = "bi-inbox",
  title,
  message,
  action = null,
  secondaryAction = null,
  tone = "neutral",
}) {
  return (
    <div className={`ui-state ${tone === "danger" ? "ui-state--danger" : ""}`}>
      <span className="ui-state__icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <h3 className="ui-state__title">{title}</h3>
      {message && <p className="ui-state__message">{message}</p>}
      {(action || secondaryAction) && (
        <div className="ui-state__actions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/**
 * A failed request, phrased as something the shopper can act on. `onRetry`
 * re-runs the call in place rather than making them reload the whole page.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this right now. Please try again.",
  onRetry = null,
  retryLabel = "Try again",
}) {
  return (
    <EmptyState
      tone="danger"
      icon="bi-exclamation-triangle"
      title={title}
      message={message}
      action={
        onRetry ? (
          <Button variant="outline" icon="bi-arrow-clockwise" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null
      }
    />
  );
}

/* -------------------------------------------------------------- ALERT */

const ALERT_ICONS = {
  info: "bi-info-circle",
  success: "bi-check-circle",
  warning: "bi-exclamation-triangle",
  danger: "bi-exclamation-octagon",
  loyalty: "bi-gift",
};

export function Alert({ variant = "info", title, children, icon, className = "" }) {
  return (
    <div
      className={`ui-alert ui-alert--${variant} ${className}`}
      // Errors and warnings interrupt; confirmations and hints wait their
      // turn. Using the right role stops a screen reader talking over itself.
      role={variant === "danger" || variant === "warning" ? "alert" : "status"}
    >
      <i
        className={`bi ${icon || ALERT_ICONS[variant]} ui-alert__icon`}
        aria-hidden="true"
      />
      <div className="ui-alert__body">
        {title && <div className="ui-alert__title">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
