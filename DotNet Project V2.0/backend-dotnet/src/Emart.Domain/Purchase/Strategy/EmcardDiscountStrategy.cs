namespace Emart.Domain.Purchase.Strategy;

/// <summary>
/// MODE 2 - EMCARD DISCOUNT.
///
/// MRP 500, eMCard price 450 -> a member who opts in pays 450 in cash and redeems NO points;
/// loyalty is earned on the 450 actually paid.
///
/// The only mode with a choice in it: the member picks Regular Price or eMCard Price with one
/// checkbox. Without the opt-in the line is simply charged the regular price.
/// </summary>
public sealed class EmcardDiscountStrategy : IPurchaseModeStrategy
{
    public PurchaseMode Mode() => PurchaseMode.EMCARD_DISCOUNT;

    public LineDecision Decide(PurchaseContext context)
    {
        var regular = context.SellingUnitPrice;

        // Not a member, or member who did not opt in -> regular price.
        if (!context.EmcardMember || !context.OptedIn)
        {
            return new LineDecision(
                PurchaseMode.EMCARD_DISCOUNT,
                context.Quantity,
                regular,
                regular,
                0,
                false,
                true,
                null);
        }

        var emcardCash = context.GetConfiguredCashRequired();

        // A configured price of 0 (or above the regular price) is not a discount - fall back to
        // the regular price rather than giving the item away or charging more than shelf price.
        var cash = emcardCash > 0m && emcardCash < regular ? emcardCash : regular;

        return new LineDecision(
            PurchaseMode.EMCARD_DISCOUNT,
            context.Quantity,
            regular,
            cash,
            // Mode 2 never spends points, whatever the row says.
            0,
            cash < regular,
            true,
            null);
    }

    public string? Validate(PurchaseContext context, LineDecision decision)
    {
        if (decision.PointsRequired > 0)
        {
            return $"\"{context.ProductName}\" is sold at an EMCard price. " +
                   "EMCard points cannot be redeemed on it.";
        }

        return null;
    }
}
