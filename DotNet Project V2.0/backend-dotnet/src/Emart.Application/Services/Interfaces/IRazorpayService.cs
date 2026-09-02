using Emart.Application.Dtos;

namespace Emart.Application.Services.Interfaces;

public interface IRazorpayService
{
    Task<RazorpayOrderResponseDTO> CreateOrderAsync(int amount, string currency, string receipt, CancellationToken ct = default);

    Task<bool> VerifyPaymentAsync(PaymentVerificationRequestDTO request, CancellationToken ct = default);
}
