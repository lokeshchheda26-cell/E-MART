namespace Emart.Application.Dtos;

/// <summary>
/// The three fields Razorpay Checkout.js hands back in its `handler` callback on a successful
/// payment. The signature is what actually proves the payment is genuine.
/// </summary>
public class PaymentVerificationRequestDTO
{
    public string RazorpayOrderId { get; set; } = null!;
    public string RazorpayPaymentId { get; set; } = null!;
    public string RazorpaySignature { get; set; } = null!;
}
