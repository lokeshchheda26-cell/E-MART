namespace Emart.Application.Dtos;

public class OrderResponseDTO
{
    public long OrderId { get; set; }
    public DateTime OrderDate { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? DeliveryOption { get; set; }
    public string? ShippingAddress { get; set; }
    public string? StoreLocation { get; set; }
    public string? PaymentStatus { get; set; }
    public List<OrderItemResponseDTO> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal TotalSavings { get; set; }
    public decimal PayableTotal { get; set; }
    public int PointsRedeemed { get; set; }
    public int PointsEarned { get; set; }
    public int PointsBalanceBefore { get; set; }
    public int PointsBalanceAfter { get; set; }

    /// <summary>Deprecated - mirrors PointsBalanceAfter, kept for backward compatibility with older frontend code.</summary>
    public int EmcardBalanceAfter { get; set; }

    public string? EarnRatePercent { get; set; }

    /// <summary>
    /// The viewing user's CURRENT eMCard membership status (Users.IsEmcardMember), not derived
    /// from this order's point activity. Both the web invoice and the PDF invoice must gate their
    /// entire EMCard section on this flag - never on PointsRedeemed/PointsEarned being non-zero,
    /// since a member can place a cash-only order with zero point activity and still be a member.
    /// </summary>
    public bool IsEmcardMember { get; set; }
}
