using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

// SecurityConfig has no permitAll rule for GET /api/product/** - it falls through to
// anyRequest().authenticated(); only POST/PUT/DELETE are explicitly ADMIN-only. Ported as-is.
//
// Listing responses used to be stripped to MRP-only for non-members (BUSINESS CONDITION 1,
// via ProductVisibilityFilter). By product decision that's now consistent with the details
// page: every viewer sees the real eMCard offer terms everywhere, so the listing card can show
// a disabled checkbox + "join to unlock" prompt instead of nothing. This does not weaken
// enforcement - EmcardService still rejects reserve/checkout for a non-member regardless of
// what any page displays.
[ApiController]
[Route("api/product")]
[EnableCors("AnyOrigin")]
[Authorize]
public class ProductController : ControllerBase
{
    private readonly IProductService _service;

    public ProductController(IProductService service)
    {
        _service = service;
    }

    [HttpGet("{id:long}/details")]
    public async Task<ActionResult<ProductDetailsResponseDTO>> GetProductDetails(long id, CancellationToken ct) =>
        Ok(await _service.GetProductDetailsAsync(id, ct));

    [HttpGet("sale-random")]
    public async Task<ActionResult<ProductSaleResponseDTO>> GetRandomSaleProduct(CancellationToken ct)
    {
        var sale = await _service.GetRandomSaleProductAsync(ct);
        return sale is null ? NoContent() : Ok(sale);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Product>> SaveProduct([FromBody] Product product, CancellationToken ct) =>
        Ok(await _service.SaveAsync(product, ct));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetAllProducts(CancellationToken ct) =>
        Ok(await _service.GetAllAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<Product>> GetProductById(long id, CancellationToken ct)
    {
        var product = await _service.GetByIdAsync(id, ct);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<Product>>> SearchProducts([FromQuery] string q = "", CancellationToken ct = default) =>
        Ok(await _service.SearchAsync(q, ct));

    [HttpGet("subcategory/{subcatMasterId:int}")]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetProductsBySubCategory(int subcatMasterId, CancellationToken ct) =>
        Ok(await _service.GetBySubCategoryIdAsync(subcatMasterId, ct));

    [HttpGet("category/{catmasterId:int}")]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetProductsByCategory(int catmasterId, CancellationToken ct) =>
        Ok(await _service.GetByCategoryIdAsync(catmasterId, ct));

    [HttpGet("category/{catmasterId:int}/brands")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetBrandsByCategory(int catmasterId, CancellationToken ct) =>
        Ok(await _service.GetBrandsByCategoryIdAsync(catmasterId, ct));

    [HttpGet("category/{catmasterId:int}/brand")]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetProductsByCategoryAndBrand(int catmasterId, [FromQuery] string brand, CancellationToken ct) =>
        Ok(await _service.GetByCategoryAndBrandAsync(catmasterId, brand, ct));

    [HttpGet("category-group/{catId}/brands")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetBrandsByCategoryCode(string catId, CancellationToken ct) =>
        Ok(await _service.GetBrandsByCategoryCodeAsync(catId, ct));

    [HttpGet("category-group/{catId}/brand")]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetProductsByCategoryCodeAndBrand(string catId, [FromQuery] string brand, CancellationToken ct) =>
        Ok(await _service.GetByCategoryCodeAndBrandAsync(catId, brand, ct));

    [HttpGet("category-group/{catId}/filter")]
    public async Task<ActionResult<IReadOnlyList<Product>>> FilterProductsByCategoryGroup(
        string catId, [FromQuery] string? brand, [FromQuery] decimal? minPrice, [FromQuery] decimal? maxPrice, CancellationToken ct) =>
        Ok(await _service.FilterByCategoryGroupAsync(catId, brand, minPrice, maxPrice, ct));

    [HttpPut("{id:long}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Product>> UpdateProduct(long id, [FromBody] Product product, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, product, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<string>> DeleteProduct(long id, CancellationToken ct)
    {
        var product = await _service.GetByIdAsync(id, ct);
        if (product is null)
        {
            return NotFound();
        }

        await _service.DeleteAsync(id, ct);
        return Ok("Product deleted successfully");
    }
}
