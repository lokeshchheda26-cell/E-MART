using Emart.Domain.Entities;

namespace Emart.Domain.Purchase;

/// <summary>
/// Everything a purchase-mode strategy is allowed to look at when it prices ONE line. Immutable.
///
/// SellingUnitPrice is resolved ONCE by PurchaseDecisionEngine (sale price while a sale is
/// running, otherwise MRP) and handed to the strategy - so no strategy needs to know the sale
/// rules.
///
/// PointsAvailable is the balance still unspent by EARLIER lines in the same cart, not the raw
/// account balance - that is what makes "two lines that are each affordable but not affordable
/// together" fail correctly.
/// </summary>
public sealed class PurchaseContext
{
    public Product? Product { get; }
    public int Quantity { get; }
    public bool EmcardMember { get; }

    /// <summary>Mode 2 only: did the member tick the eMCard price checkbox?</summary>
    public bool OptedIn { get; }

    public int PointsAvailable { get; }
    public decimal SellingUnitPrice { get; }

    public PurchaseContext(
        Product? product,
        int quantity,
        bool emcardMember,
        bool optedIn,
        int pointsAvailable,
        decimal sellingUnitPrice)
    {
        Product = product;
        // Quantity is clamped rather than rejected: a 0/negative quantity is a client bug, and
        // charging for one unit is safer than dividing by it or shipping nothing silently.
        Quantity = Math.Max(1, quantity);
        EmcardMember = emcardMember;
        OptedIn = optedIn;
        PointsAvailable = Math.Max(0, pointsAvailable);
        SellingUnitPrice = sellingUnitPrice;
    }

    public string ProductName => Product?.ProductName ?? "this product";

    /// <summary>
    /// Cash the offer asks for per unit. cash_required is authoritative; cardholder_price is the
    /// fallback for a row written before that column existed.
    /// </summary>
    public decimal GetConfiguredCashRequired()
    {
        if (Product is null)
        {
            return 0m;
        }

        return Product.CashRequired ?? Product.CardholderPrice;
    }

    /// <summary>
    /// Points the offer asks for per unit - points_required, falling back to the legacy
    /// points_to_be_redeemed column for the same reason.
    /// </summary>
    public int GetConfiguredPointsRequired()
    {
        if (Product is null)
        {
            return 0;
        }

        if (Product.PointsRequired is not null)
        {
            return Math.Max(0, Product.PointsRequired.Value);
        }

        return Math.Max(0, Product.PointsToBeRedeemed);
    }
}
