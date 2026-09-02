namespace Emart.Domain.Purchase;

/// <summary>
/// The decision for ONE cart/order line: which mode applied, what is payable in cash, what is
/// payable in points, what was saved, and whether the line may be bought at all. Immutable value
/// object.
/// </summary>
public sealed class LineDecision
{
    public PurchaseMode Mode { get; }
    public int Quantity { get; }

    /// <summary>Regular price per unit (sale price while on sale, else MRP).</summary>
    public decimal RegularUnitPrice { get; }

    /// <summary>Cash charged per unit for the units that take the eMCard offer.</summary>
    public decimal CashUnitPrice { get; }

    /// <summary>Points redeemed per unit for the units that take the eMCard offer.</summary>
    public int PointsPerUnit { get; }

    /// <summary>
    /// How many of <see cref="Quantity"/> take the eMCard offer - the rest (<see
    /// cref="NormalQuantity"/>) pay <see cref="RegularUnitPrice"/> in plain cash. A single line can
    /// mix both: e.g. quantity 4 with EmcardQuantity 2 means 2 units at the offer price/points and
    /// 2 units at the regular price, in the SAME line.
    /// </summary>
    public int EmcardQuantity { get; }

    public bool Purchasable { get; }
    public string? BlockingReason { get; }

    /// <summary>
    /// EXISTING shape, unchanged - every <see cref="IPurchaseModeStrategy"/> still builds its
    /// per-unit decision this way. emcardApplied=true means the whole quantity takes the offer
    /// (EmcardQuantity = Quantity), which is exactly the all-or-nothing behaviour every strategy
    /// and every existing caller already expects.
    /// </summary>
    public LineDecision(
        PurchaseMode mode,
        int quantity,
        decimal regularUnitPrice,
        decimal cashUnitPrice,
        int pointsPerUnit,
        bool emcardApplied,
        bool purchasable,
        string? blockingReason)
        : this(
            mode,
            quantity,
            regularUnitPrice,
            cashUnitPrice,
            pointsPerUnit,
            emcardApplied ? Math.Max(1, quantity) : 0,
            purchasable,
            blockingReason)
    {
    }

    /// <summary>
    /// NEW shape - lets <see cref="PurchaseDecisionEngine"/> state exactly how many of the line's
    /// units take the eMCard offer, so a line is no longer all-or-nothing.
    /// </summary>
    public LineDecision(
        PurchaseMode mode,
        int quantity,
        decimal regularUnitPrice,
        decimal cashUnitPrice,
        int pointsPerUnit,
        int emcardQuantity,
        bool purchasable,
        string? blockingReason)
    {
        Mode = mode;
        Quantity = Math.Max(1, quantity);
        RegularUnitPrice = regularUnitPrice;
        CashUnitPrice = cashUnitPrice;
        PointsPerUnit = Math.Max(0, pointsPerUnit);
        EmcardQuantity = Math.Clamp(emcardQuantity, 0, Quantity);
        Purchasable = purchasable;
        BlockingReason = blockingReason;
    }

    /// <summary>Units in this line paying the plain regular price.</summary>
    public int NormalQuantity => Quantity - EmcardQuantity;

    /// <summary>At least one unit of this line takes the eMCard offer.</summary>
    public bool EmcardApplied => EmcardQuantity > 0;

    /// <summary>Same decision, marked unbuyable with a reason.</summary>
    public LineDecision Blocked(string reason) =>
        new(Mode, Quantity, RegularUnitPrice, CashUnitPrice, PointsPerUnit, EmcardQuantity, false, reason);

    /// <summary>Cash for the whole line: eMCard-priced units plus regularly-priced units.</summary>
    public decimal CashPayable => (CashUnitPrice * EmcardQuantity) + (RegularUnitPrice * NormalQuantity);

    /// <summary>What the line would have cost without any eMCard offer.</summary>
    public decimal RegularLineTotal => RegularUnitPrice * Quantity;

    /// <summary>Cash saved on this line.</summary>
    public decimal Savings => RegularLineTotal - CashPayable;

    /// <summary>
    /// Points the line redeems in total - only the eMCard-selected units spend points.
    /// </summary>
    public int PointsRequired => PointsPerUnit * EmcardQuantity;
}
