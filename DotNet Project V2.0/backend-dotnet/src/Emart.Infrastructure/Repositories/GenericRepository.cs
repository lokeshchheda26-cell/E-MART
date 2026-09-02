using System.Linq.Expressions;
using Emart.Application.Repositories;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly EmartDbContext Context;
    protected readonly DbSet<T> Set;

    public GenericRepository(EmartDbContext context)
    {
        Context = context;
        Set = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(object id, CancellationToken ct = default) =>
        await Set.FindAsync([id], ct);

    public virtual async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default) =>
        await Set.AsNoTracking().ToListAsync(ct);

    public virtual async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(predicate).ToListAsync(ct);

    public virtual async Task<(IReadOnlyList<T> Items, int TotalCount)> GetPagedAsync(
        int pageNumber,
        int pageSize,
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        CancellationToken ct = default)
    {
        IQueryable<T> query = Set.AsNoTracking();

        if (filter is not null)
        {
            query = query.Where(filter);
        }

        var totalCount = await query.CountAsync(ct);

        if (orderBy is not null)
        {
            query = orderBy(query);
        }

        var items = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return (items, totalCount);
    }

    public virtual async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default) =>
        await Set.AnyAsync(predicate, ct);

    public virtual async Task<T> AddAsync(T entity, CancellationToken ct = default)
    {
        var entry = await Set.AddAsync(entity, ct);
        return entry.Entity;
    }

    public virtual async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default) =>
        await Set.AddRangeAsync(entities, ct);

    public virtual void Update(T entity) => Set.Update(entity);

    public virtual void UpdateRange(IEnumerable<T> entities) => Set.UpdateRange(entities);

    public virtual void Remove(T entity) => Set.Remove(entity);

    public virtual async Task RemoveByIdAsync(object id, CancellationToken ct = default)
    {
        var entity = await Set.FindAsync([id], ct);
        if (entity is not null)
        {
            Set.Remove(entity);
        }
    }

    public virtual Task<int> SaveChangesAsync(CancellationToken ct = default) => Context.SaveChangesAsync(ct);
}
