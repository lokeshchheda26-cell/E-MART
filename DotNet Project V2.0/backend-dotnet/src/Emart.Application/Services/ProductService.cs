using Emart.Application.Common.Exceptions;
using Emart.Application.Dtos;
using Emart.Application.Repositories;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Emart.Domain.Enums;
using Emart.Domain.Purchase;

namespace Emart.Application.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _repository;
    private readonly IProductImageRepository _imageRepository;
    private readonly IProductSpecificationRepository _specificationRepository;
    private readonly IOrderItemRepository _orderItemRepository;
    private readonly PurchaseDecisionEngine _purchaseEngine;

    public ProductService(
        IProductRepository repository,
        IProductImageRepository imageRepository,
        IProductSpecificationRepository specificationRepository,
        IOrderItemRepository orderItemRepository,
        PurchaseDecisionEngine purchaseEngine)
    {
        _repository = repository;
        _imageRepository = imageRepository;
        _specificationRepository = specificationRepository;
        _orderItemRepository = orderItemRepository;
        _purchaseEngine = purchaseEngine;
    }

    public async Task<Product> SaveAsync(Product product, CancellationToken ct = default)
    {
        var saved = await _repository.AddAsync(product, ct);
        await _repository.SaveChangesAsync(ct);
        return saved;
    }

    public async Task<ProductDetailsResponseDTO> GetProductDetailsAsync(long productId, CancellationToken ct = default)
    {
        var product = await _repository.GetByIdAsync(productId, ct)
            ?? throw new ResourceNotFoundException($"Product not found with id: {productId}");

        // The product's own main image is always included first; gallery images are appended
        // after it, deduplicated.
        var imageUrls = new List<string>();

        if (!string.IsNullOrWhiteSpace(product.ProductImagePath))
        {
            imageUrls.Add(product.ProductImagePath);
        }

        var galleryImages = (await _imageRepository.FindByProductIdOrderByImageIdAscAsync(productId, ct))
            .Select(i => i.ImageUrl)
            .Where(url => !string.IsNullOrWhiteSpace(url) && !imageUrls.Contains(url));

        imageUrls.AddRange(galleryImages);

        var specRows = await _specificationRepository.FindSpecificationsByProductIdAsync(productId, ct);
        var specifications = specRows.Select(r => new ProductSpecificationDTO(r.ConfigName, r.ConfigValue)).ToList();

        return await MapToProductDetailsResponseAsync(product, imageUrls, specifications, ct);
    }

    private async Task<ProductDetailsResponseDTO> MapToProductDetailsResponseAsync(
        Product product, List<string> imageUrls, List<ProductSpecificationDTO> specifications, CancellationToken ct)
    {
        var dto = new ProductDetailsResponseDTO
        {
            ProductId = product.ProductId,
            ProductName = product.ProductName
        };

        // The purchase mode, and every figure derived from it, come from the ONE central
        // algorithm (PurchaseDecisionEngine), always described here as an eMCard MEMBER would
        // see it - every viewer gets the real offer terms (details page and listing cards
        // alike), so the frontend can show a disabled checkbox + "join to unlock" prompt to a
        // non-member instead of nothing. Enforcement is unaffected: EmcardService still rejects
        // reserve/checkout for anyone who isn't actually a member.
        var offer = _purchaseEngine.DescribeOffer(product, true);

        var saleActive = offer.SaleActive;
        var price = offer.SellingPrice > 0 ? offer.SellingPrice : product.CardholderPrice;

        dto.Price = price;
        dto.OnSale = saleActive;

        dto.PurchaseMode = offer.Mode.ToString();
        dto.PurchaseModeLabel = offer.Mode.Label();
        dto.PurchaseModeNumber = offer.Mode.ModeNumber();
        dto.EmcardCashPrice = offer.EmcardCashPrice;
        dto.PointsRequired = offer.PointsRequired;
        dto.EmcardSavings = offer.EmcardSavings;
        dto.PointsOptional = offer.PointsOptional;
        dto.EarnsPoints = offer.EarnsPoints;
        dto.EarnRatePercent = _purchaseEngine.LoyaltyPolicy.EarnRatePercentLabel();

        dto.MrpPrice = product.MrpPrice;
        dto.CardholderPrice = product.CardholderPrice;

        dto.Description = !string.IsNullOrWhiteSpace(product.LongDescription) ? product.LongDescription : product.ShortDescription;
        dto.Brand = product.Brand;
        dto.Category = product.Category?.CatName;
        dto.Stock = product.Stock;
        dto.Points = product.PointsToBeRedeemed;

        var offerType = product.OfferType ?? ProductOfferTypeExtensions.Derive(product.MrpPrice, product.CardholderPrice, product.PointsToBeRedeemed);
        dto.OfferType = offerType.ToString();
        dto.DisplayType = (product.DisplayType ?? ProductDisplayTypeExtensions.ForOfferType(offerType)).ToString();

        dto.TotalPointsRedeemed = await _orderItemRepository.SumPointsRedeemedByProductIdAsync(product.ProductId, ct);

        dto.Images = imageUrls;
        dto.Specifications = specifications;

        return dto;
    }

    public Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken ct = default) => _repository.GetAllAsync(ct);

    public Task<Product?> GetByIdAsync(long id, CancellationToken ct = default) => _repository.GetByIdAsync(id, ct);

    public Task<IReadOnlyList<Product>> GetBySubCategoryIdAsync(int subcatMasterId, CancellationToken ct = default) =>
        _repository.FindBySubCategoryIdAsync(subcatMasterId, ct);

    public Task<IReadOnlyList<Product>> GetByCategoryIdAsync(int catmasterId, CancellationToken ct = default) =>
        _repository.FindByCategoryIdActiveAsync(catmasterId, ct);

    public Task<IReadOnlyList<string>> GetBrandsByCategoryIdAsync(int catmasterId, CancellationToken ct = default) =>
        _repository.FindDistinctActiveBrandsByCategoryAsync(catmasterId, ct);

    public Task<IReadOnlyList<Product>> GetByCategoryAndBrandAsync(int catmasterId, string brand, CancellationToken ct = default) =>
        _repository.FindByCategoryAndBrandActiveAsync(catmasterId, brand, ct);

    public Task<IReadOnlyList<string>> GetBrandsByCategoryCodeAsync(string catId, CancellationToken ct = default) =>
        _repository.FindDistinctActiveBrandsByCategoryCodeAsync(catId, ct);

    public Task<IReadOnlyList<Product>> GetByCategoryCodeAndBrandAsync(string catId, string brand, CancellationToken ct = default) =>
        _repository.FindByCategoryCodeAndBrandActiveAsync(catId, brand, ct);

    public Task<IReadOnlyList<Product>> FilterByCategoryGroupAsync(string catId, string? brand, decimal? minPrice, decimal? maxPrice, CancellationToken ct = default)
    {
        // Blank strings are treated the same as "no brand filter".
        var normalizedBrand = string.IsNullOrWhiteSpace(brand) ? null : brand;
        return _repository.FilterByCategoryGroupAsync(catId, normalizedBrand, minPrice, maxPrice, ct);
    }

    public Task<IReadOnlyList<Product>> SearchAsync(string keyword, CancellationToken ct = default)
    {
        // A blank/whitespace-only query returns the full active catalog rather than an empty result.
        if (string.IsNullOrWhiteSpace(keyword))
        {
            return _repository.GetAllAsync(ct);
        }

        return _repository.SearchAsync(keyword.Trim().ToLowerInvariant(), ct);
    }

    public async Task<Product?> UpdateAsync(long id, Product product, CancellationToken ct = default)
    {
        var old = await _repository.GetByIdAsync(id, ct);
        if (old is null)
        {
            return null;
        }

        old.ProductName = product.ProductName;
        old.ShortDescription = product.ShortDescription;
        old.LongDescription = product.LongDescription;
        old.ProductImagePath = product.ProductImagePath;
        old.MrpPrice = product.MrpPrice;
        old.CardholderPrice = product.CardholderPrice;
        old.Brand = product.Brand;
        old.Stock = product.Stock;
        old.PointsToBeRedeemed = product.PointsToBeRedeemed;
        old.Status = product.Status;
        old.CategoryId = product.CategoryId;
        old.SubCategoryId = product.SubCategoryId;

        _repository.Update(old);
        await _repository.SaveChangesAsync(ct);
        return old;
    }

    public async Task DeleteAsync(long id, CancellationToken ct = default)
    {
        await _repository.RemoveByIdAsync(id, ct);
        await _repository.SaveChangesAsync(ct);
    }

    public async Task<ProductSaleResponseDTO?> GetRandomSaleProductAsync(CancellationToken ct = default)
    {
        var product = await _repository.FindRandomActiveSaleProductAsync(ct);
        return product is null ? null : MapToProductSaleResponse(product);
    }

    private static ProductSaleResponseDTO MapToProductSaleResponse(Product product)
    {
        // Original ("was") price for the strikethrough - MrpPrice is the true list price;
        // CardholderPrice is only a fallback in case MrpPrice is somehow blank on old data.
        var originalPrice = product.MrpPrice != 0 ? product.MrpPrice : product.CardholderPrice;

        var discountedPrice = product.SalePrice ?? (product.CardholderPrice != 0 ? product.CardholderPrice : originalPrice);

        int? discountPercent = null;

        if (originalPrice > 0)
        {
            var savings = originalPrice - discountedPrice;
            discountPercent = (int)Math.Round(savings / originalPrice * 100m, 0, MidpointRounding.AwayFromZero);
        }

        return new ProductSaleResponseDTO(
            product.ProductId,
            product.ProductName,
            product.ProductImagePath,
            originalPrice,
            discountedPrice,
            discountPercent,
            product.SaleEndDate);
    }
}
