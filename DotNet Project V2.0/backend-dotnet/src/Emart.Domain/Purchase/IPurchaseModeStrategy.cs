namespace Emart.Domain.Purchase;

/// <summary>
/// ONE purchase mode's rules, in one class. A fifth mode is a new class implementing this
/// interface plus a value on <see cref="PurchaseMode"/> - no service, controller or if-else chain
/// anywhere else changes, because <see cref="PurchaseModeRegistry"/> discovers implementations
/// from DI and <see cref="PurchaseDecisionEngine"/> only ever talks to this interface.
/// </summary>
public interface IPurchaseModeStrategy
{
    /// <summary>The mode this strategy owns. Exactly one strategy per mode.</summary>
    PurchaseMode Mode();

    /// <summary>
    /// Prices the line: cash per unit, points per unit, and whether the eMCard offer ended up
    /// applied. Must be side-effect free - no balance updates, no entity writes.
    /// </summary>
    LineDecision Decide(PurchaseContext context);

    /// <summary>
    /// Business validation for this mode (sufficient points, mandatory components present,
    /// configuration sane).
    /// </summary>
    /// <returns>
    /// Null when the line is valid, otherwise a customer-facing reason the line cannot be
    /// bought. Returning a message is NOT an exception: cart needs to render the reason next to
    /// the line, checkout is what turns it into a rejection.
    /// </returns>
    string? Validate(PurchaseContext context, LineDecision decision);

    /// <summary>
    /// Whether a member may explicitly opt in/out of this mode's offer. True for mode 2 only -
    /// mode 1 has no offer, and modes 3 and 4 are mandatory.
    /// </summary>
    bool AllowsOptIn() => Mode().IsOptional();
}
