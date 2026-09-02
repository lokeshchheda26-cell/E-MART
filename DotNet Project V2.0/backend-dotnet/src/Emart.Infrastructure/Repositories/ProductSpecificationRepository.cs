using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class ProductSpecificationRepository : GenericRepository<ProductSpecification>, IProductSpecificationRepository
{
    public ProductSpecificationRepository(EmartDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<ProductSpecificationRow>> FindSpecificationsByProductIdAsync(long productId, CancellationToken ct = default) =>
        await Set.AsNoTracking()
            .Where(ps => ps.ProductId == productId)
            .OrderBy(ps => ps.ConfigId)
            .Select(ps => new ProductSpecificationRow(ps.Config.ConfigName, ps.ConfigValue))
            .ToListAsync(ct);
}
