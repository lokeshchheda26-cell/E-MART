using Emart.Domain.Entities;

namespace Emart.Application.Repositories;

public interface IProductRepository : IGenericRepository<Product>
{
    Task<IReadOnlyList<Product>> FindBySubCategoryIdAsync(int subcatMasterId, CancellationToken ct = default);

    /// <summary>Active products directly under a given main category (Product.category).</summary>
    Task<IReadOnlyList<Product>> FindByCategoryIdActiveAsync(int catmasterId, CancellationToken ct = default);

    /// <summary>Distinct, non-blank, alphabetically sorted brand names across a category's active products.</summary>
    Task<IReadOnlyList<string>> FindDistinctActiveBrandsByCategoryAsync(int catmasterId, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> FindByCategoryAndBrandActiveAsync(int catmasterId, string brand, CancellationToken ct = default);

    /// <summary>Same as above, grouped by Category.CatId code rather than one leaf category.</summary>
    Task<IReadOnlyList<string>> FindDistinctActiveBrandsByCategoryCodeAsync(string catId, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> FindByCategoryCodeAndBrandActiveAsync(string catId, string brand, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> FilterByCategoryGroupAsync(string catId, string? brand, decimal? minPrice, decimal? maxPrice, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> SearchAsync(string keyword, CancellationToken ct = default);

    /// <summary>One random, currently-active on-sale product (MySQL ORDER BY RAND() LIMIT 1).</summary>
    Task<Product?> FindRandomActiveSaleProductAsync(CancellationToken ct = default);
}
