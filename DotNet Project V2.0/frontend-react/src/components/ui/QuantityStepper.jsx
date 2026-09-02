/**
 * QuantityStepper.jsx
 * ------------------------------------------------------------------
 * The −/value/+ control used by the cart drawer, the checkout line items
 * and the split eMCard/normal lines.
 *
 * It is deliberately a group of real <button>s with a live value rather than
 * a number input: on a phone a number input opens the keypad and invites
 * free typing, which then needs its own validation for "0", "-3" and "12e4".
 *
 * `busy` disables the whole group while a cart request is in flight, which
 * is what stops an impatient double-tap from queueing two increments.
 * ------------------------------------------------------------------
 */
export default function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  min = 0,
  max = null,
  busy = false,
  label = "Quantity",
  size = "md",
}) {
  const atMin = value <= min;
  const atMax = max != null && value >= max;

  return (
    <div
      className={`ui-stepper ${busy ? "ui-stepper--busy" : ""}`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="ui-stepper__btn"
        onClick={onDecrease}
        disabled={atMin || busy}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <i className="bi bi-dash" aria-hidden="true" />
      </button>

      {/* aria-live so a screen reader hears the new quantity after a tap,
          rather than the shopper having to re-navigate to the value. */}
      <span className="ui-stepper__value" aria-live="polite">
        {value}
      </span>

      <button
        type="button"
        className="ui-stepper__btn"
        onClick={onIncrease}
        disabled={atMax || busy}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <i className="bi bi-plus" aria-hidden="true" />
      </button>

      {size === "sm" && <span className="sr-only">{label}</span>}
    </div>
  );
}
