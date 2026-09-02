namespace Emart.Application.Dtos;

public class ProductSaleResponseDTO
{
    public long ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string? ProductImagePath { get; set; }
    public decimal? OriginalPrice { get; set; }
    public decimal? DiscountedPrice { get; set; }
    public int? DiscountPercent { get; set; }
    public DateTime? SaleEndDate { get; set; }

    public ProductSaleResponseDTO()
    {
    }

    public ProductSaleResponseDTO(
        long productId,
        string productName,
        string? productImagePath,
        decimal? originalPrice,
        decimal? discountedPrice,
        int? discountPercent,
        DateTime? saleEndDate)
    {
        ProductId = productId;
        ProductName = productName;
        ProductImagePath = productImagePath;
        OriginalPrice = originalPrice;
        DiscountedPrice = discountedPrice;
        DiscountPercent = discountPercent;
        SaleEndDate = saleEndDate;
    }
}
