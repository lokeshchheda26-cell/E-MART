namespace Emart.Application.Dtos;

public class OrderItemResponseDTO
{
    public long OrderItemId { get; set; }
    public long? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Brand { get; set; }
    public decimal MrpPrice { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public bool EmcardApplied { get; set; }
    public int PointsRedeemed { get; set; }
    public decimal LineTotal { get; set; }
    public string PurchaseMode { get; set; } = null!;
    public string PurchaseModeLabel { get; set; } = null!;
    public int PurchaseModeNumber { get; set; }
    public decimal Savings { get; set; }
}
