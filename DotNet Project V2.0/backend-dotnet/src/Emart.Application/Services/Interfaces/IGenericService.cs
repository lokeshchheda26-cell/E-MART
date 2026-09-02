namespace Emart.Application.Services.Interfaces;

/// <summary>
/// Generic CRUD service abstraction over <see cref="Repositories.IGenericRepository{T}"/>, reused
/// by the thinner business services (Category/SubCategory) for their plain CRUD operations so
/// those services contain only their own business logic (partial-field updates, lookups by
/// grouping code) rather than reimplementing basic persistence.
/// </summary>
public interface IGenericService<T> where T : class
{
    Task<T?> GetByIdAsync(object id, CancellationToken ct = default);

    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);

    Task<T> AddAsync(T entity, CancellationToken ct = default);

    Task DeleteAsync(object id, CancellationToken ct = default);
}
