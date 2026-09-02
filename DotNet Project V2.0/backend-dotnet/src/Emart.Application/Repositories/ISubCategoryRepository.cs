using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface ISubCategoryRepository : IGenericRepository<SubCategory>
{
    Task<IReadOnlyList<SubCategory>> FindByCategoryIdAsync(int catmasterId, CancellationToken ct = default);
}
