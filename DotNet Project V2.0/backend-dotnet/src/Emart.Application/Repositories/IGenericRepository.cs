using System.Linq.Expressions;

namespace Emart.Application.Repositories;

/// <summary>
/// Generic CRUD abstraction shared by every entity repository - basic persistence operations
/// that don't carry entity-specific business queries (those live on the entity's own repository
/// interface, e.g. IProductRepository, layered on top of this one).
/// </summary>
public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(object id, CancellationToken ct = default);

    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);

    Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    /// <summary>Paged, optionally filtered and sorted listing.</summary>
    Task<(IReadOnlyList<T> Items, int TotalCount)> GetPagedAsync(
        int pageNumber,
        int pageSize,
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        CancellationToken ct = default);

    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    Task<T> AddAsync(T entity, CancellationToken ct = default);

    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default);

    void Update(T entity);

    void UpdateRange(IEnumerable<T> entities);

    void Remove(T entity);

    Task RemoveByIdAsync(object id, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
