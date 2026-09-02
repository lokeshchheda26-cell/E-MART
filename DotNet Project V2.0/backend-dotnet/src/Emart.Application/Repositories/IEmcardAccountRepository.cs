using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IEmcardAccountRepository : IGenericRepository<EmcardAccount>
{
    Task<EmcardAccount?> FindByUserIdAsync(long userId, CancellationToken ct = default);

    /// <summary>
    /// Locks the account row for the duration of the current transaction (SELECT ... FOR
    /// UPDATE), so a concurrent reserve/release/settle for the same user has to wait for this
    /// transaction to commit before it can read the (now up to date) balance.
    /// </summary>
    Task<EmcardAccount?> FindByUserIdForUpdateAsync(long userId, CancellationToken ct = default);
}
