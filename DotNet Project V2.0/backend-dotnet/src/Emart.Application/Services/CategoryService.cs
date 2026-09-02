using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;

namespace Emart.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _repository;

    public CategoryService(ICategoryRepository repository)
    {
        _repository = repository;
    }

    public async Task<Category> SaveAsync(Category category, CancellationToken ct = default)
    {
        var saved = await _repository.AddAsync(category, ct);
        await _repository.SaveChangesAsync(ct);
        return saved;
    }

    public Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken ct = default) => _repository.GetAllAsync(ct);

    public Task<Category?> GetByIdAsync(int id, CancellationToken ct = default) => _repository.GetByIdAsync(id, ct);

    public async Task<Category?> UpdateAsync(int id, Category category, CancellationToken ct = default)
    {
        var old = await _repository.GetByIdAsync(id, ct);
        if (old is null)
        {
            return null;
        }

        old.CatId = category.CatId;
        old.SubcatId = category.SubcatId;
        old.CatName = category.CatName;
        old.CatImagePath = category.CatImagePath;
        old.Flag = category.Flag;

        _repository.Update(old);
        await _repository.SaveChangesAsync(ct);
        return old;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await _repository.RemoveByIdAsync(id, ct);
        await _repository.SaveChangesAsync(ct);
    }

    public Task<IReadOnlyList<Category>> GetByCatIdAsync(string catId, CancellationToken ct = default) => _repository.FindByCatIdAsync(catId, ct);
}
