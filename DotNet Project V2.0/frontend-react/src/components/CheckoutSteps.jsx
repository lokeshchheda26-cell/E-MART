const STEPS = [
  { id: "cart", label: "Cart" },
  { id: "review", label: "Review & delivery" },
  { id: "payment", label: "Payment" },
  { id: "confirm", label: "Confirmation" },
];

/**
 * CheckoutSteps.jsx
 * ------------------------------------------------------------------
 * The Cart -> Review -> Payment -> Confirmation progress indicator, shown
 * on every step of the purchase flow.
 *
 * The flow already existed; nothing told the shopper where they were in it.
 * That matters most at the payment step, where "how much more of this is
 * there?" is exactly the question that makes people abandon a basket.
 *
 * aria-current="step" marks the active item for assistive technology, and
 * completed steps are announced as such rather than only being green.
 * ------------------------------------------------------------------
 */
export default function CheckoutSteps({ current = "review" }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav className="checkout-steps" aria-label="Checkout progress">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;

        return (
          <div key={step.id} style={{ display: "contents" }}>
            <span
              className={`checkout-step ${
                active
                  ? "checkout-step--active"
                  : done
                    ? "checkout-step--done"
                    : ""
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span className="checkout-step__dot" aria-hidden="true">
                {done ? <i className="bi bi-check-lg" /> : index + 1}
              </span>
              <span className="checkout-step__label">
                {step.label}
                {done && <span className="sr-only"> (completed)</span>}
              </span>
            </span>

            {index < STEPS.length - 1 && (
              <span className="checkout-step__line" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
