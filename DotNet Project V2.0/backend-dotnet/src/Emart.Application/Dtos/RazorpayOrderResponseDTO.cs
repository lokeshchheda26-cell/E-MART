namespace Emart.Application.Dtos;

public class RazorpayOrderResponseDTO
{
    public string OrderId { get; set; } = null!;
    public int Amount { get; set; }
    public string Currency { get; set; } = null!;
    public string Receipt { get; set; } = null!;
    public string Status { get; set; } = null!;
}
