using Emart.Domain.Entities;

namespace Emart.Application.Services.Interfaces;

public interface ISubCategoryService
{
    Task<SubCategory> SaveAsync(SubCategory subCategory, CancellationToken ct = default);

    Task<IReadOnlyList<SubCategory>> GetAllAsync(CancellationToken ct = default);

    Task<SubCategory?> GetByIdAsync(int id, CancellationToken ct = default);

    Task<IReadOnlyList<SubCategory>> GetByCategoryIdAsync(int catmasterId, CancellationToken ct = default);

    Task<SubCategory?> UpdateAsync(int id, SubCategory subCategory, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);
}
