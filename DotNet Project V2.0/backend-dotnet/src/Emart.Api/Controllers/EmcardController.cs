using Emart.Api.Auth;
using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

[ApiController]
[Route("api/emcard")]
[EnableCors("AnyOrigin")]
[Authorize]
public class EmcardController : ControllerBase
{
    private readonly IEmcardService _service;

    public EmcardController(IEmcardService service)
    {
        _service = service;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<EmcardStatusDTO>> GetSummary(CancellationToken ct) =>
        Ok(await _service.GetSummaryAsync(User.GetUserId()!.Value, ct));

    /// <summary>Upgrades the caller (an existing, non-member CUSTOMER) to eMCard membership. New feature - not present in the original Java app.</summary>
    [HttpPost("join")]
    public async Task<ActionResult<EmcardStatusDTO>> JoinMembership(CancellationToken ct) =>
        Ok(await _service.JoinMembershipAsync(User.GetUserId()!.Value, ct));

    /// <summary>
    /// emcardQty: how many of this product's units currently in the cart should take the eMCard
    /// offer (the rest pay the regular price in the same line). Omit it to opt in for the whole
    /// cart quantity, same as a plain checkbox click.
    /// </summary>
    [HttpPost("reserve/{productId:long}")]
    public async Task<ActionResult<EmcardStatusDTO>> Reserve(long productId, [FromQuery] int? emcardQty, CancellationToken ct) =>
        Ok(await _service.ReserveAsync(User.GetUserId()!.Value, productId, emcardQty, ct));

    [HttpPost("release/{productId:long}")]
    public async Task<ActionResult<EmcardStatusDTO>> Release(long productId, CancellationToken ct) =>
        Ok(await _service.ReleaseAsync(User.GetUserId()!.Value, productId, ct));

    [HttpPost("reset")]
    public async Task<ActionResult<EmcardStatusDTO>> ReleaseAll(CancellationToken ct) =>
        Ok(await _service.ReleaseAllAsync(User.GetUserId()!.Value, ct));

    [HttpGet("transactions")]
    public async Task<ActionResult<IReadOnlyList<EmcardTransactionResponseDTO>>> GetTransactions(CancellationToken ct) =>
        Ok(await _service.GetTransactionsAsync(User.GetUserId()!.Value, ct));
}
