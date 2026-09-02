using Emart.Application.Dtos;
using Emart.Domain.Entities;

namespace Emart.Application.Services.Interfaces;

public interface IProductService
{
    Task<Product> SaveAsync(Product product, CancellationToken ct = default);

    Task<ProductDetailsResponseDTO> GetProductDetailsAsync(long productId, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken ct = default);

    Task<Product?> GetByIdAsync(long id, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> GetBySubCategoryIdAsync(int subcatMasterId, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> GetByCategoryIdAsync(int catmasterId, CancellationToken ct = default);

    Task<IReadOnlyList<string>> GetBrandsByCategoryIdAsync(int catmasterId, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> GetByCategoryAndBrandAsync(int catmasterId, string brand, CancellationToken ct = default);

    Task<IReadOnlyList<string>> GetBrandsByCategoryCodeAsync(string catId, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> GetByCategoryCodeAndBrandAsync(string catId, string brand, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> FilterByCategoryGroupAsync(string catId, string? brand, decimal? minPrice, decimal? maxPrice, CancellationToken ct = default);

    Task<IReadOnlyList<Product>> SearchAsync(string keyword, CancellationToken ct = default);

    Task<Product?> UpdateAsync(long id, Product product, CancellationToken ct = default);

    Task DeleteAsync(long id, CancellationToken ct = default);

    Task<ProductSaleResponseDTO?> GetRandomSaleProductAsync(CancellationToken ct = default);
}
