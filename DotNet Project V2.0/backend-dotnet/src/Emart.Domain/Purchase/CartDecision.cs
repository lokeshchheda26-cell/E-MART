namespace Emart.Domain.Purchase;

/// <summary>
/// The decision for a WHOLE cart: every line decided independently (they may each be a different
/// purchase mode), then aggregated. Immutable.
/// </summary>
public sealed class CartDecision
{
    public IReadOnlyList<LineDecision> Lines { get; }

    /// <summary>Sum of regular (pre-offer) line totals - the MRP subtotal.</summary>
    public decimal Subtotal { get; }

    /// <summary>Cash actually payable across the cart.</summary>
    public decimal PayableTotal { get; }

    /// <summary>Points redeemed across the cart.</summary>
    public int TotalPointsRequired { get; }

    /// <summary>Points earned on the cash actually paid.</summary>
    public int PointsEarned { get; }

    public int OpeningBalance { get; }

    public bool Purchasable { get; }
    public string? BlockingReason { get; }

    public CartDecision(
        IReadOnlyList<LineDecision>? lines,
        decimal subtotal,
        decimal payableTotal,
        int totalPointsRequired,
        int pointsEarned,
        int openingBalance,
        bool purchasable,
        string? blockingReason)
    {
        Lines = lines ?? Array.Empty<LineDecision>();
        Subtotal = subtotal;
        PayableTotal = payableTotal;
        TotalPointsRequired = Math.Max(0, totalPointsRequired);
        PointsEarned = Math.Max(0, pointsEarned);
        OpeningBalance = Math.Max(0, openingBalance);
        Purchasable = purchasable;
        BlockingReason = blockingReason;
    }

    /// <summary>subtotal - payableTotal, i.e. the cash saved across the cart.</summary>
    public decimal TotalSavings => Subtotal - PayableTotal;

    /// <summary>opening - redeemed + earned. Never negative by construction.</summary>
    public int ClosingBalance => Math.Max(0, OpeningBalance - TotalPointsRequired + PointsEarned);
}
