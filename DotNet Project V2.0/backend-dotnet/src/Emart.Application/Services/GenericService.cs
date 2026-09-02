using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;

namespace Emart.Application.Services;

public class GenericService<T> : IGenericService<T> where T : class
{
    private readonly IGenericRepository<T> _repository;

    public GenericService(IGenericRepository<T> repository)
    {
        _repository = repository;
    }

    public Task<T?> GetByIdAsync(object id, CancellationToken ct = default) => _repository.GetByIdAsync(id, ct);

    public Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default) => _repository.GetAllAsync(ct);

    public async Task<T> AddAsync(T entity, CancellationToken ct = default)
    {
        var added = await _repository.AddAsync(entity, ct);
        await _repository.SaveChangesAsync(ct);
        return added;
    }

    public async Task DeleteAsync(object id, CancellationToken ct = default)
    {
        await _repository.RemoveByIdAsync(id, ct);
        await _repository.SaveChangesAsync(ct);
    }
}
