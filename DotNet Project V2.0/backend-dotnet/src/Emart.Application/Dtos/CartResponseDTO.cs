namespace Emart.Application.Dtos;

public class CartResponseDTO
{
    public long CartId { get; set; }
    public List<CartItemResponseDTO> Items { get; set; } = new();
    public int ItemCount { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TotalSavings { get; set; }
    public decimal PayableTotal { get; set; }
    public int TotalPointsToRedeem { get; set; }
    public int PointsBalanceOpening { get; set; }
    public int PointsBalanceClosing { get; set; }
    public int PointsEarned { get; set; }
    public string EarnRatePercent { get; set; } = null!;
    public bool Purchasable { get; set; }
    public string? BlockingReason { get; set; }
}
