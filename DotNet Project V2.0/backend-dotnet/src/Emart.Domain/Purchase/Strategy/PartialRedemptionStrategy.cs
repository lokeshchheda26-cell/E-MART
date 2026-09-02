namespace Emart.Domain.Purchase.Strategy;

/// <summary>
/// MODE 4 - PARTIAL REDEMPTION.
///
/// MRP 300, cash required 180, points required 120 -> a member who takes the offer pays BOTH
/// halves: 180 in cash and 120 points. Loyalty is earned on the cash component only.
///
/// Once the offer is on, BOTH halves are mandatory and neither can be varied.
/// </summary>
public sealed class PartialRedemptionStrategy : IPurchaseModeStrategy
{
    public PurchaseMode Mode() => PurchaseMode.PARTIAL_REDEMPTION;

    public LineDecision Decide(PurchaseContext context)
    {
        var regular = context.SellingUnitPrice;

        // Condition 1 - a non-member pays the shelf price and spends no points. Same shape for a
        // member who has NOT ticked the box.
        if (!context.EmcardMember || !context.OptedIn)
        {
            return new LineDecision(
                PurchaseMode.PARTIAL_REDEMPTION,
                context.Quantity,
                regular,
                regular,
                0,
                false,
                true,
                null);
        }

        var cash = context.GetConfiguredCashRequired();

        return new LineDecision(
            PurchaseMode.PARTIAL_REDEMPTION,
            context.Quantity,
            regular,
            cash,
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

        // Both components are mandatory for this mode - a missing one means the product is
        // mis-configured, not that the customer gets the other half free. Checked per-EMCard-unit
        // (CashUnitPrice) rather than the blended line total, since a line can now mix
        // EMCard-redeemed units with plain-cash units and the total is no longer a reliable signal
        // of how the offer itself is configured.
        if (required <= 0 || decision.CashUnitPrice <= 0m)
        {
            return $"\"{context.ProductName}\" is a cash + points product but is missing its " +
                   "cash or point price. Please contact support.";
        }

        if (required > context.PointsAvailable)
        {
            return $"\"{context.ProductName}\" needs {required} EMCard points; you have " +
                   $"{context.PointsAvailable} available.";
        }

        return null;
    }
}
