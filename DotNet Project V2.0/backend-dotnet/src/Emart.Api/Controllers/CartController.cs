using Emart.Api.Auth;
using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

/// <summary>
/// Persisted cart endpoints. Every route requires an authenticated user and always operates on
/// the caller's own cart - userId comes from the JWT principal, never from client input.
/// </summary>
[ApiController]
[Route("api/cart")]
[EnableCors("AnyOrigin")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    [HttpGet]
    public async Task<ActionResult<CartResponseDTO>> GetCart(CancellationToken ct) =>
        Ok(await _cartService.GetCartAsync(User.GetUserId()!.Value, ct));

    [HttpPost("items")]
    public async Task<ActionResult<CartResponseDTO>> AddItem([FromBody] AddCartItemRequestDTO request, CancellationToken ct) =>
        Ok(await _cartService.AddItemAsync(User.GetUserId()!.Value, request.ProductId!.Value, request.Quantity, ct));

    [HttpPut("items/{cartItemId:long}")]
    public async Task<ActionResult<CartResponseDTO>> UpdateItemQuantity(long cartItemId, [FromBody] UpdateCartItemRequestDTO request, CancellationToken ct) =>
        Ok(await _cartService.UpdateItemQuantityAsync(User.GetUserId()!.Value, cartItemId, request.Quantity, ct));

    [HttpDelete("items/{cartItemId:long}")]
    public async Task<ActionResult<CartResponseDTO>> RemoveItem(long cartItemId, CancellationToken ct) =>
        Ok(await _cartService.RemoveItemAsync(User.GetUserId()!.Value, cartItemId, ct));

    [HttpDelete]
    public async Task<ActionResult<CartResponseDTO>> ClearCart(CancellationToken ct) =>
        Ok(await _cartService.ClearCartAsync(User.GetUserId()!.Value, ct));
}
