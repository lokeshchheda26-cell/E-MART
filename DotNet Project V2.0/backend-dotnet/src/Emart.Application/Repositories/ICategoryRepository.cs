using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface ICategoryRepository : IGenericRepository<Category>
{
    Task<IReadOnlyList<Category>> FindByCatIdAsync(string catId, CancellationToken ct = default);
}
