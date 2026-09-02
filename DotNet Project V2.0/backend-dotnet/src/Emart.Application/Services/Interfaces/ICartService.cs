using Emart.Application.Dtos;

namespace Emart.Application.Services.Interfaces;

public interface ICartService
{
    Task<CartResponseDTO> GetCartAsync(long userId, CancellationToken ct = default);

    Task<CartResponseDTO> AddItemAsync(long userId, long productId, int? quantity, CancellationToken ct = default);

    Task<CartResponseDTO> UpdateItemQuantityAsync(long userId, long cartItemId, int? quantity, CancellationToken ct = default);

    Task<CartResponseDTO> RemoveItemAsync(long userId, long cartItemId, CancellationToken ct = default);

    Task<CartResponseDTO> ClearCartAsync(long userId, CancellationToken ct = default);
}
