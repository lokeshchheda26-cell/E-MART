namespace Emart.Application.Dtos;

public class ProductDetailsResponseDTO
{
    public long ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public decimal Price { get; set; }
    public decimal MrpPrice { get; set; }
    public decimal CardholderPrice { get; set; }
    public string? Description { get; set; }
    public string? Brand { get; set; }
    public string? Category { get; set; }
    public int? Stock { get; set; }
    public int? Points { get; set; }
    public string OfferType { get; set; } = null!;
    public string DisplayType { get; set; } = null!;
    public int TotalPointsRedeemed { get; set; }
    public bool OnSale { get; set; }
    public string PurchaseMode { get; set; } = null!;
    public string PurchaseModeLabel { get; set; } = null!;
    public int PurchaseModeNumber { get; set; }
    public decimal EmcardCashPrice { get; set; }
    public int PointsRequired { get; set; }
    public decimal EmcardSavings { get; set; }
    public bool PointsOptional { get; set; }
    public bool EarnsPoints { get; set; }
    public string? EarnRatePercent { get; set; }
    public List<string> Images { get; set; } = new();
    public List<ProductSpecificationDTO> Specifications { get; set; } = new();
}
