using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

/// <summary>Config name (e.g. "RAM") alongside its value (e.g. "8 GB") for one specification row.</summary>
public sealed record ProductSpecificationRow(string ConfigName, string ConfigValue);

public interface IProductSpecificationRepository : IGenericRepository<ProductSpecification>
{
    Task<IReadOnlyList<ProductSpecificationRow>> FindSpecificationsByProductIdAsync(long productId, CancellationToken ct = default);
}
