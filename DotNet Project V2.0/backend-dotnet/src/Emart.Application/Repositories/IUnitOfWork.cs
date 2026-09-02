namespace Emart.Application.Repositories;

/// <summary>
/// Explicit transaction control for the handful of flows that need a real database transaction
/// spanning several repository calls - most importantly EmcardService's row-locked
/// reserve/release/settleCheckout, which mirror the Java @Transactional + SELECT ... FOR UPDATE
/// pattern: the pessimistic lock taken by IEmcardAccountRepository.FindByUserIdForUpdateAsync
/// only holds for the lifetime of an open transaction.
/// </summary>
public interface IUnitOfWork
{
    Task BeginTransactionAsync(CancellationToken ct = default);

    Task CommitAsync(CancellationToken ct = default);

    Task RollbackAsync(CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
