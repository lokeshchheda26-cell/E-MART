using Emart.Application.Repositories;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Storage;

namespace Emart.Infrastructure.Repositories;

/// <summary>
/// Reentrant transaction wrapper: OrderService.Checkout opens a transaction and, inside it, calls
/// EmcardService.SettleCheckout which opens "its own" - both share the same scoped DbContext, so
/// this tracks a nesting depth and only the outermost Begin/Commit pair actually starts/commits
/// the real ADO.NET transaction. Any Rollback (at any depth) aborts the whole thing immediately,
/// matching how a Java @Transactional method calling another @Transactional method on the same
/// thread joins the existing transaction and a runtime exception unwinds all of it together.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly EmartDbContext _context;
    private IDbContextTransaction? _transaction;
    private int _depth;

    public UnitOfWork(EmartDbContext context)
    {
        _context = context;
    }

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction is null)
        {
            _transaction = await _context.Database.BeginTransactionAsync(ct);
        }

        _depth++;
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_transaction is null)
        {
            return;
        }

        _depth--;
        if (_depth > 0)
        {
            // Nested call - let the outermost Commit actually finish the transaction.
            return;
        }

        await _context.SaveChangesAsync(ct);
        await _transaction.CommitAsync(ct);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public async Task RollbackAsync(CancellationToken ct = default)
    {
        if (_transaction is null)
        {
            return;
        }

        _depth = 0;
        await _transaction.RollbackAsync(ct);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
}
