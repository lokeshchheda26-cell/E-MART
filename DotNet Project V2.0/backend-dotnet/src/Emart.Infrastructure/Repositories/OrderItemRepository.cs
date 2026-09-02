using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class OrderItemRepository : GenericRepository<OrderItem>, IOrderItemRepository
{
    public OrderItemRepository(EmartDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<OrderItem>> FindByOrderIdAsync(long orderId, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(oi => oi.OrderId == orderId).ToListAsync(ct);

    public async Task<int> SumPointsRedeemedByProductIdAsync(long productId, CancellationToken ct = default)
    {
        var sum = await Set.Where(oi => oi.ProductId == productId).SumAsync(oi => (int?)oi.PointsRedeemed, ct);
        return sum ?? 0;
    }
}
