using Emart.Domain.Entities;

namespace Emart.Application.Services.Interfaces;

public interface ICategoryService
{
    Task<Category> SaveAsync(Category category, CancellationToken ct = default);

    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken ct = default);

    Task<Category?> GetByIdAsync(int id, CancellationToken ct = default);

    Task<Category?> UpdateAsync(int id, Category category, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);

    Task<IReadOnlyList<Category>> GetByCatIdAsync(string catId, CancellationToken ct = default);
}
