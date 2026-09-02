using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class ProductImageRepository : GenericRepository<ProductImage>, IProductImageRepository
{
    public ProductImageRepository(EmartDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<ProductImage>> FindByProductIdOrderByImageIdAscAsync(long productId, CancellationToken ct = default) =>
        await Set.AsNoTracking().Where(i => i.ProductId == productId).OrderBy(i => i.ImageId).ToListAsync(ct);
}
