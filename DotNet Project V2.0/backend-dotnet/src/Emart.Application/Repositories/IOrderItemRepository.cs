using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IOrderItemRepository : IGenericRepository<OrderItem>
{
    Task<IReadOnlyList<OrderItem>> FindByOrderIdAsync(long orderId, CancellationToken ct = default);

    /// <summary>Sum of points redeemed (across every past order) for a single product. Never null.</summary>
    Task<int> SumPointsRedeemedByProductIdAsync(long productId, CancellationToken ct = default);
}
