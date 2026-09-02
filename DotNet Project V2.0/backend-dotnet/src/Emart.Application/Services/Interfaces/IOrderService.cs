using Emart.Application.Dtos;

namespace Emart.Application.Services.Interfaces;

public interface IOrderService
{
    Task<OrderResponseDTO> CheckoutAsync(long userId, CheckoutRequestDTO request, CancellationToken ct = default);

    Task<OrderResponseDTO> GetOrderAsync(long userId, long orderId, CancellationToken ct = default);

    Task<IReadOnlyList<OrderResponseDTO>> GetOrderHistoryAsync(long userId, CancellationToken ct = default);
}
