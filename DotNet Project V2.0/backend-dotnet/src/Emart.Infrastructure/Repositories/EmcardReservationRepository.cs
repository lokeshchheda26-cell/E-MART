using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class EmcardReservationRepository : GenericRepository<EmcardReservation>, IEmcardReservationRepository
{
    public EmcardReservationRepository(EmartDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<EmcardReservation>> FindByUserIdAsync(long userId, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(r => r.UserId == userId).ToListAsync(ct);

    public Task<EmcardReservation?> FindByUserIdAndProductIdAsync(long userId, long productId, CancellationToken ct = default) =>
        Set.FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == productId, ct);

    public async Task<int> SumReservedPointsByUserIdAsync(long userId, CancellationToken ct = default)
    {
        var sum = await Set.Where(r => r.UserId == userId).SumAsync(r => (int?)r.PointsReserved, ct);
        return sum ?? 0;
    }

    public async Task DeleteByUserIdAndProductIdAsync(long userId, long productId, CancellationToken ct = default) =>
        await Set.Where(r => r.UserId == userId && r.ProductId == productId).ExecuteDeleteAsync(ct);

    public async Task DeleteAllByUserIdAsync(long userId, CancellationToken ct = default) =>
        await Set.Where(r => r.UserId == userId).ExecuteDeleteAsync(ct);
}
