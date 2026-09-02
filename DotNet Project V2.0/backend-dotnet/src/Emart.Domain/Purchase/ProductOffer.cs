namespace Emart.Domain.Purchase;

/// <summary>
/// Everything the PRODUCT PAGE (and the listing card) needs in order to render a product without
/// guessing anything. The backend returns all necessary information; the frontend just prints it.
/// </summary>
public sealed class ProductOffer
{
    public PurchaseMode Mode { get; }

    /// <summary>Cash a non-opted-in shopper pays: sale price, or MRP.</summary>
    public decimal SellingPrice { get; }

    public decimal MrpPrice { get; }

    /// <summary>Cash under the eMCard offer (modes 2 and 4); 0 otherwise.</summary>
    public decimal EmcardCashPrice { get; }

    /// <summary>Points under the eMCard offer (modes 3 and 4); 0 otherwise.</summary>
    public int PointsRequired { get; }

    /// <summary>False only for mode 3, where no cash is paid.</summary>
    public bool EarnsPoints { get; }

    public bool SaleActive { get; }

    public ProductOffer(
        PurchaseMode mode,
        decimal sellingPrice,
        decimal mrpPrice,
        decimal emcardCashPrice,
        int pointsRequired,
        bool earnsPoints,
        bool saleActive)
    {
        Mode = mode;
        SellingPrice = sellingPrice;
        MrpPrice = mrpPrice;
        EmcardCashPrice = emcardCashPrice;
        PointsRequired = Math.Max(0, pointsRequired);
        EarnsPoints = earnsPoints;
        SaleActive = saleActive;
    }

    /// <summary>Mode 2 only - the one mode the shopper can opt in and out of.</summary>
    public bool PointsOptional => Mode.IsOptional();

    /// <summary>Cash saved by taking the eMCard offer (modes 2 and 4).</summary>
    public decimal EmcardSavings
    {
        get
        {
            if (!Mode.RequiresCash() || EmcardCashPrice <= 0m || EmcardCashPrice >= SellingPrice)
            {
                return 0m;
            }

            return SellingPrice - EmcardCashPrice;
        }
    }
}
