namespace Emart.Domain.Purchase.Strategy;

/// <summary>
/// MODE 3 - FULL POINT REDEMPTION.
///
/// MRP 300, required points 450 -> a member who takes the offer pays 0 in cash and redeems 450
/// points, and because no cash is paid the order earns nothing.
///
/// Purchase is blocked - with a reason the cart renders next to the line - when the balance does
/// not cover it. Combined with the row-locked re-check in EmcardService.SettleCheckout, that is
/// what makes a negative balance impossible.
/// </summary>
public sealed class FullRedemptionStrategy : IPurchaseModeStrategy
{
    public PurchaseMode Mode() => PurchaseMode.FULL_REDEMPTION;

    public LineDecision Decide(PurchaseContext context)
    {
        var regular = context.SellingUnitPrice;

        // Condition 1: a non-member has no points and no offer - they pay the shelf price. Same
        // shape for a member who has not ticked the box.
        if (!context.EmcardMember || !context.OptedIn)
        {
            return new LineDecision(
                PurchaseMode.FULL_REDEMPTION,
                context.Quantity,
                regular,
                regular,
                0,
                false,
                true,
                null);
        }

        return new LineDecision(
            PurchaseMode.FULL_REDEMPTION,
            context.Quantity,
            regular,
            // Cash is ALWAYS zero for this mode - never cash_required, never a remainder.
            0m,
            context.GetConfiguredPointsRequired(),
            true,
            true,
            null);
    }

    public string? Validate(PurchaseContext context, LineDecision decision)
    {
        // Nothing to validate for a non-member, or for a member who has not taken the offer.
        if (!context.EmcardMember || !decision.EmcardApplied)
        {
            return null;
        }

        var required = decision.PointsRequired;

        // Mis-configured product: mode says "points only" but no point cost was set.
        if (required <= 0)
        {
            return $"\"{context.ProductName}\" is a points-only product but has no point price " +
                   "configured. Please contact support.";
        }

        // Checked per-EMCard-unit (CashUnitPrice), not the blended line total (CashPayable) - a
        // line can legitimately mix EMCard-redeemed units with plain-cash units now, so the line
        // total is no longer 0 just because the redeemed units are correctly priced at 0.
        if (decision.CashUnitPrice != 0m)
        {
            return $"\"{context.ProductName}\" can only be purchased with EMCard points.";
        }

        if (required > context.PointsAvailable)
        {
            return $"\"{context.ProductName}\" needs {required} EMCard points; you have " +
                   $"{context.PointsAvailable} available.";
        }

        return null;
    }
}
