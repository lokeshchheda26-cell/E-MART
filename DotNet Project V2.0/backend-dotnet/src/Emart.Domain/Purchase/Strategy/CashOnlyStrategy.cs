namespace Emart.Domain.Purchase.Strategy;

/// <summary>
/// MODE 1 - CASH ONLY.
///
/// MRP 500 -> customer pays 500. Points can never be redeemed on this product. Loyalty points
/// are still EARNED, because cash was paid.
///
/// This is also the mode every line collapses to for a customer who is not an eMCard member
/// (Condition 1) and for any product on an active public sale - a sale discount and an eMCard
/// offer never stack.
/// </summary>
public sealed class CashOnlyStrategy : IPurchaseModeStrategy
{
    public PurchaseMode Mode() => PurchaseMode.CASH_ONLY;

    public LineDecision Decide(PurchaseContext context)
    {
        // Selling price, and nothing else. Deliberately ignores cash_required/points_required
        // even if some stale row carries them: mode 1 means money only.
        return new LineDecision(
            PurchaseMode.CASH_ONLY,
            context.Quantity,
            context.SellingUnitPrice,
            context.SellingUnitPrice,
            0,
            false,
            true,
            null);
    }

    public string? Validate(PurchaseContext context, LineDecision decision)
    {
        // Defensive: a cash-only line must never carry points.
        if (decision.PointsRequired > 0)
        {
            return $"\"{context.ProductName}\" can only be purchased with cash. " +
                   "EMCard points cannot be redeemed on it.";
        }

        return null;
    }
}
