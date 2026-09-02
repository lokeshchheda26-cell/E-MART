using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;

namespace Emart.Application.Services;

public class SubCategoryService : ISubCategoryService
{
    private readonly ISubCategoryRepository _repository;

    public SubCategoryService(ISubCategoryRepository repository)
    {
        _repository = repository;
    }

    public async Task<SubCategory> SaveAsync(SubCategory subCategory, CancellationToken ct = default)
    {
        var saved = await _repository.AddAsync(subCategory, ct);
        await _repository.SaveChangesAsync(ct);
        return saved;
    }

    public Task<IReadOnlyList<SubCategory>> GetAllAsync(CancellationToken ct = default) => _repository.GetAllAsync(ct);

    public Task<SubCategory?> GetByIdAsync(int id, CancellationToken ct = default) => _repository.GetByIdAsync(id, ct);

    public Task<IReadOnlyList<SubCategory>> GetByCategoryIdAsync(int catmasterId, CancellationToken ct = default) =>
        _repository.FindByCategoryIdAsync(catmasterId, ct);

    public async Task<SubCategory?> UpdateAsync(int id, SubCategory subCategory, CancellationToken ct = default)
    {
        var old = await _repository.GetByIdAsync(id, ct);
        if (old is null)
        {
            return null;
        }

        old.SubcatId = subCategory.SubcatId;
        old.SubcatName = subCategory.SubcatName;
        old.SubcatImagePath = subCategory.SubcatImagePath;
        old.Flag = subCategory.Flag;
        old.CatmasterId = subCategory.CatmasterId;

        _repository.Update(old);
        await _repository.SaveChangesAsync(ct);
        return old;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await _repository.RemoveByIdAsync(id, ct);
        await _repository.SaveChangesAsync(ct);
    }
}
