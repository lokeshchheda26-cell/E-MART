using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IOrdersRepository : IGenericRepository<Orders>
{
    Task<IReadOnlyList<Orders>> FindByUserIdOrderByOrderDateDescAsync(long userId, CancellationToken ct = default);

    Task<Orders?> FindByOrderIdAndUserIdAsync(long orderId, long userId, CancellationToken ct = default);
}
