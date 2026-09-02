using Emart.Application.Repositories;
using Emart.Domain.Entities;
using Emart.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Emart.Infrastructure.Repositories;

public class ProductRepository : GenericRepository<Product>, IProductRepository
{
    public ProductRepository(EmartDbContext context) : base(context)
    {
    }

    private IQueryable<Product> WithGraph() => Set.Include(p => p.Category).Include(p => p.SubCategory);

    public override async Task<Product?> GetByIdAsync(object id, CancellationToken ct = default) =>
        await WithGraph().FirstOrDefaultAsync(p => p.ProductId == (long)id, ct);

    public override async Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken ct = default) =>
        await WithGraph().AsNoTracking().ToListAsync(ct);

    public async Task<IReadOnlyList<Product>> FindBySubCategoryIdAsync(int subcatMasterId, CancellationToken ct = default) =>
        await WithGraph().AsNoTracking().Where(p => p.SubCategoryId == subcatMasterId).ToListAsync(ct);

    public async Task<IReadOnlyList<Product>> FindByCategoryIdActiveAsync(int catmasterId, CancellationToken ct = default) =>
        await WithGraph().AsNoTracking().Where(p => p.CategoryId == catmasterId && p.Status).ToListAsync(ct);

    public async Task<IReadOnlyList<string>> FindDistinctActiveBrandsByCategoryAsync(int catmasterId, CancellationToken ct = default) =>
        await Set.AsNoTracking()
            .Where(p => p.CategoryId == catmasterId && p.Status && p.Brand != null && p.Brand != "")
            .Select(p => p.Brand!)
            .Distinct()
            .OrderBy(b => b)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Product>> FindByCategoryAndBrandActiveAsync(int catmasterId, string brand, CancellationToken ct = default) =>
        await WithGraph().AsNoTracking()
            .Where(p => p.CategoryId == catmasterId && p.Status && p.Brand != null && p.Brand.ToLower() == brand.ToLower())
            .ToListAsync(ct);

    public async Task<IReadOnlyList<string>> FindDistinctActiveBrandsByCategoryCodeAsync(string catId, CancellationToken ct = default) =>
        await Set.AsNoTracking()
            .Where(p => p.Category.CatId == catId && p.Status && p.Brand != null && p.Brand != "")
            .Select(p => p.Brand!)
            .Distinct()
            .OrderBy(b => b)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Product>> FindByCategoryCodeAndBrandActiveAsync(string catId, string brand, CancellationToken ct = default) =>
        await WithGraph().AsNoTracking()
            .Where(p => p.Category.CatId == catId && p.Status && p.Brand != null && p.Brand.ToLower() == brand.ToLower())
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Product>> FilterByCategoryGroupAsync(string catId, string? brand, decimal? minPrice, decimal? maxPrice, CancellationToken ct = default)
    {
        var query = WithGraph().AsNoTracking().Where(p => p.Category.CatId == catId && p.Status);

        if (brand is not null)
        {
            query = query.Where(p => p.Brand != null && p.Brand.ToLower() == brand.ToLower());
        }

        if (minPrice is not null)
        {
            query = query.Where(p => p.CardholderPrice >= minPrice);
        }

        if (maxPrice is not null)
        {
            query = query.Where(p => p.CardholderPrice <= maxPrice);
        }

        return await query.OrderBy(p => p.ProductName).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Product>> SearchAsync(string keyword, CancellationToken ct = default)
    {
        var pattern = $"%{keyword}%";

        return await WithGraph().AsNoTracking()
            .Where(p => p.Status && (
                EF.Functions.Like(p.ProductName.ToLower(), pattern) ||
                EF.Functions.Like(p.ShortDescription.ToLower(), pattern) ||
                (p.LongDescription != null && EF.Functions.Like(p.LongDescription.ToLower(), pattern)) ||
                (p.Brand != null && EF.Functions.Like(p.Brand.ToLower(), pattern)) ||
                (p.Category.CatName != null && EF.Functions.Like(p.Category.CatName.ToLower(), pattern)) ||
                (p.SubCategory != null && p.SubCategory.SubcatName != null && EF.Functions.Like(p.SubCategory.SubcatName.ToLower(), pattern))
            ))
            .Distinct()
            .ToListAsync(ct);
    }

    public async Task<Product?> FindRandomActiveSaleProductAsync(CancellationToken ct = default)
    {
        var product = await Set.FromSqlRaw(
                "select * from product_master where on_sale = true and status = true " +
                "and sale_end_date is not null and sale_end_date > current_timestamp " +
                "order by rand() limit 1")
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

        if (product is null)
        {
            return null;
        }

        // FromSqlRaw doesn't populate navigation properties - reload with the graph so callers
        // (e.g. mapping to ProductSaleResponseDTO / Category) see a fully-populated entity, same
        // as the Java repository method returning a JPA-managed Product.
        return await WithGraph().AsNoTracking().FirstOrDefaultAsync(p => p.ProductId == product.ProductId, ct);
    }
}
