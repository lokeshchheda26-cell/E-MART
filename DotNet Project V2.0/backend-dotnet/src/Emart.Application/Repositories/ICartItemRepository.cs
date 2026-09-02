using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface ICartItemRepository : IGenericRepository<CartItem>
{
    Task<IReadOnlyList<CartItem>> FindByCartIdAsync(long cartId, CancellationToken ct = default);

    Task<CartItem?> FindByCartIdAndProductIdAsync(long cartId, long productId, CancellationToken ct = default);

    Task<CartItem?> FindByCartItemIdAndCartIdAsync(long cartItemId, long cartId, CancellationToken ct = default);

    Task DeleteByCartIdAsync(long cartId, CancellationToken ct = default);
}
