import { Link } from "react-router-dom";

/**
 * Button.jsx
 * ------------------------------------------------------------------
 * The one button in the app. Renders a <button>, an <a> or a react-router
 * <Link> depending on what it is given, so a "Continue shopping" link and a
 * "Add to cart" action look identical without one of them being a styled
 * anchor pretending to be a button (or vice versa).
 *
 * Variants encode INTENT, not colour, which is what keeps the call-to-action
 * hierarchy consistent across pages:
 *   accent  - the buying action. At most one per decision.
 *   primary - move forward (checkout, submit, save).
 *   outline - a real but secondary choice.
 *   ghost   - tertiary / low-emphasis.
 *   danger  - destructive.
 *   link    - inline text action.
 *
 * `loading` both shows a spinner AND disables the control, which is the
 * app's guard against double submission - a second click on a submitting
 * button can otherwise place two orders.
 * ------------------------------------------------------------------
 */
export default function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  loadingText,
  icon = null,
  iconEnd = null,
  to = null,
  href = null,
  className = "",
  children,
  disabled = false,
  type = "button",
  ...rest
}) {
  const classes = [
    "ui-btn",
    `ui-btn--${variant}`,
    size !== "md" ? `ui-btn--${size}` : "",
    block ? "ui-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? (
        <span className="ui-btn__spinner" aria-hidden="true" />
      ) : (
        icon && <i className={`bi ${icon}`} aria-hidden="true" />
      )}
      <span>{loading ? loadingText || "Please wait..." : children}</span>
      {!loading && iconEnd && <i className={`bi ${iconEnd}`} aria-hidden="true" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      // Screen readers announce the state change; sighted users see the
      // spinner. Both know the click was received.
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
