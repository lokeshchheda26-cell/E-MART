package com.emart.service.purchase;

/**
 * ONE purchase mode's rules, in one class.
 *
 * This is the extension point the requirement asks for: a fifth mode
 * (say "subscription only") is a new {@code @Component} implementing
 * this interface plus a value on {@link PurchaseMode} - no service,
 * controller or if-else chain anywhere else changes, because
 * {@link PurchaseModeRegistry} discovers implementations from the
 * Spring context and {@link PurchaseDecisionEngine} only ever talks
 * to this interface.
 */
public interface PurchaseModeStrategy {

    /** The mode this strategy owns. Exactly one strategy per mode. */
    PurchaseMode mode();


    /**
     * Prices the line: cash per unit, points per unit, and whether the
     * eMCard offer ended up applied.
     *
     * Must be side-effect free - no balance updates, no entity writes.
     */
    LineDecision decide(PurchaseContext context);


    /**
     * Business validation for this mode (sufficient points, mandatory
     * components present, configuration sane).
     *
     * @return null when the line is valid, otherwise a customer-facing
     *         reason the line cannot be bought. Returning a message is
     *         NOT an exception: cart needs to render the reason next to
     *         the line, checkout is what turns it into a rejection.
     */
    String validate(PurchaseContext context, LineDecision decision);


    /**
     * Whether a member may explicitly opt in/out of this mode's offer
     * (i.e. whether an emcard_reservation row is meaningful for it).
     *
     * True for mode 2 only - mode 1 has no offer, and modes 3 and 4
     * are mandatory, so their points are applied automatically and
     * {@code POST /api/emcard/reserve} is rejected for them.
     */
    default boolean allowsOptIn() {
        return mode().isOptional();
    }
}
