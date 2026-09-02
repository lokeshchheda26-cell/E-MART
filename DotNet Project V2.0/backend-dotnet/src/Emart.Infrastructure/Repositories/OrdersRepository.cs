using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class OrdersRepository : GenericRepository<Orders>, IOrdersRepository
{
    public OrdersRepository(EmartDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Orders>> FindByUserIdOrderByOrderDateDescAsync(long userId, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(o => o.UserId == userId).OrderByDescending(o => o.OrderDate).ToListAsync(ct);

    public Task<Orders?> FindByOrderIdAndUserIdAsync(long orderId, long userId, CancellationToken ct = default) =>
        Set.AsNoTracking().FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId, ct);
}
