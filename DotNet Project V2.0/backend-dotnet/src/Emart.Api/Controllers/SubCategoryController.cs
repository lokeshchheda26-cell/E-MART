using Emart.Domain.Entities;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

// Same authorization shape as CategoryController: GET falls through to
// anyRequest().authenticated() in the source SecurityConfig - no anonymous browsing.
[ApiController]
[Route("api/subcategory")]
[EnableCors("AnyOrigin")]
[Authorize]
public class SubCategoryController : ControllerBase
{
    private readonly ISubCategoryService _service;

    public SubCategoryController(ISubCategoryService service)
    {
        _service = service;
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<SubCategory>> Save([FromBody] SubCategory subCategory, CancellationToken ct) =>
        Ok(await _service.SaveAsync(subCategory, ct));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SubCategory>>> GetAll(CancellationToken ct) =>
        Ok(await _service.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SubCategory>> GetById(int id, CancellationToken ct) =>
        Ok(await _service.GetByIdAsync(id, ct));

    [HttpGet("category/{catmasterId:int}")]
    public async Task<ActionResult<IReadOnlyList<SubCategory>>> GetByCategoryId(int catmasterId, CancellationToken ct) =>
        Ok(await _service.GetByCategoryIdAsync(catmasterId, ct));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<SubCategory>> Update(int id, [FromBody] SubCategory subCategory, CancellationToken ct) =>
        Ok(await _service.UpdateAsync(id, subCategory, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<string>> Delete(int id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return Ok("SubCategory Deleted Successfully");
    }
}
