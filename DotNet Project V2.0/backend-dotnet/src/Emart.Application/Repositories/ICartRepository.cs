using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface ICartRepository : IGenericRepository<Cart>
{
    Task<Cart?> FindByUserIdAsync(long userId, CancellationToken ct = default);
}
