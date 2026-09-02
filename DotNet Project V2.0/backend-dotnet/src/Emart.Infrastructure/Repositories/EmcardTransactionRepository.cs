using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class EmcardTransactionRepository : GenericRepository<EmcardTransaction>, IEmcardTransactionRepository
{
    public EmcardTransactionRepository(EmartDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<EmcardTransaction>> FindByUserIdOrderByTxnIdDescAsync(long userId, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(t => t.UserId == userId).OrderByDescending(t => t.TxnId).ToListAsync(ct);

    public async Task<IReadOnlyList<EmcardTransaction>> FindByOrderIdOrderByTxnIdAscAsync(long orderId, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(t => t.OrderId == orderId).OrderBy(t => t.TxnId).ToListAsync(ct);
}
