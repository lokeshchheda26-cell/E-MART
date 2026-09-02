using Emart.Domain.Entities;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

// SecurityConfig has no permitAll rule for GET /api/category/** - it falls through to the
// anyRequest().authenticated() catch-all, so unlike a typical storefront, browsing categories
// also requires a logged-in user in the source app. Ported as-is for fidelity.
[ApiController]
[Route("api/category")]
[EnableCors("AnyOrigin")]
[Authorize]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _service;

    public CategoryController(ICategoryService service)
    {
        _service = service;
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Category>> SaveCategory([FromBody] Category category, CancellationToken ct) =>
        Ok(await _service.SaveAsync(category, ct));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Category>>> GetAllCategories(CancellationToken ct) =>
        Ok(await _service.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Category>> GetCategoryById(int id, CancellationToken ct) =>
        Ok(await _service.GetByIdAsync(id, ct));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Category>> UpdateCategory(int id, [FromBody] Category category, CancellationToken ct) =>
        Ok(await _service.UpdateAsync(id, category, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<string>> DeleteCategory(int id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return Ok("Category Deleted Successfully");
    }
}
