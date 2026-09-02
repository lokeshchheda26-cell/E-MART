using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IProductImageRepository : IGenericRepository<ProductImage>
{
    /// <summary>Images belonging to a product, ordered by ImageId (the first uploaded is the "main" image).</summary>
    Task<IReadOnlyList<ProductImage>> FindByProductIdOrderByImageIdAscAsync(long productId, CancellationToken ct = default);
}
