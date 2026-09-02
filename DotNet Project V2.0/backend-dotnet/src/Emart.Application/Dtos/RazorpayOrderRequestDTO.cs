namespace Emart.Application.Dtos;

/// <summary>
/// What the Payment page sends to open a Razorpay checkout. Amount must already be in the
/// smallest currency unit (paise for INR).
/// </summary>
public class RazorpayOrderRequestDTO
{
    public int? Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Receipt { get; set; } = null!;
}
