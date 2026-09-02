using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class EmcardAccountRepository : GenericRepository<EmcardAccount>, IEmcardAccountRepository
{
    public EmcardAccountRepository(EmartDbContext context) : base(context)
    {
    }

    public Task<EmcardAccount?> FindByUserIdAsync(long userId, CancellationToken ct = default) =>
        Set.AsNoTracking().FirstOrDefaultAsync(a => a.UserId == userId, ct);

    public async Task<EmcardAccount?> FindByUserIdForUpdateAsync(long userId, CancellationToken ct = default)
    {
        // Only actually locks when called inside an open transaction (see IUnitOfWork) - mirrors
        // the Java @Lock(PESSIMISTIC_WRITE) query, which is likewise scoped to the surrounding
        // @Transactional method.
        return await Set
            .FromSqlInterpolated($"select * from emcard_account where user_id = {userId} for update")
            .AsTracking()
            .FirstOrDefaultAsync(ct);
    }
}
