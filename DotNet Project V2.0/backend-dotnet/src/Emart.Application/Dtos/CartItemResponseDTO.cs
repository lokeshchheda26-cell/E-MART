namespace Emart.Application.Dtos;

public class CartItemResponseDTO
{
    public long CartItemId { get; set; }
    public long ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string? ProductImagePath { get; set; }
    public string? Brand { get; set; }
    public decimal MrpPrice { get; set; }
    public decimal CardholderPrice { get; set; }
    public int Quantity { get; set; }
    public bool EmcardApplied { get; set; }
    public int PointsToRedeem { get; set; }
    public int? PointsMax { get; set; }
    public string OfferType { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string PurchaseMode { get; set; } = null!;
    public string PurchaseModeLabel { get; set; } = null!;
    public int PurchaseModeNumber { get; set; }
    public decimal CashPayable { get; set; }
    public int PointsRequired { get; set; }
    public decimal Savings { get; set; }
    public bool PointsOptional { get; set; }
    public bool Purchasable { get; set; }
    public string? BlockingReason { get; set; }

    /// <summary>Of Quantity, how many units take the eMCard offer below.</summary>
    public int EmcardQuantity { get; set; }

    /// <summary>Of Quantity, how many units pay RegularUnitPrice in plain cash.</summary>
    public int NormalQuantity { get; set; }

    /// <summary>Cash per unit for the EmcardQuantity portion of this line.</summary>
    public decimal EmcardUnitPrice { get; set; }

    /// <summary>Points per unit for the EmcardQuantity portion of this line.</summary>
    public int EmcardUnitPoints { get; set; }

    /// <summary>Cash per unit for the NormalQuantity portion of this line.</summary>
    public decimal RegularUnitPrice { get; set; }
}
