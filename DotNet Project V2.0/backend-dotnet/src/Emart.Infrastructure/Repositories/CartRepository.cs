using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class CartRepository : GenericRepository<Cart>, ICartRepository
{
    public CartRepository(EmartDbContext context) : base(context)
    {
    }

    public Task<Cart?> FindByUserIdAsync(long userId, CancellationToken ct = default) =>
        Set.FirstOrDefaultAsync(c => c.UserId == userId, ct);
}
