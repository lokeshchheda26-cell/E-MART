using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

/// <summary>
/// Razorpay integration for the Payment page's "Card / UPI" methods. Once VerifyPayment returns
/// true, the frontend calls the existing POST /api/orders/checkout to actually place the order.
/// </summary>
[ApiController]
[Route("api/payments")]
[EnableCors("AnyOrigin")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly IRazorpayService _razorpayService;

    public PaymentController(IRazorpayService razorpayService)
    {
        _razorpayService = razorpayService;
    }

    [HttpPost("create-order")]
    public async Task<ActionResult<RazorpayOrderResponseDTO>> CreateOrder([FromBody] RazorpayOrderRequestDTO request, CancellationToken ct)
    {
        try
        {
            var response = await _razorpayService.CreateOrderAsync(request.Amount!.Value, request.Currency, request.Receipt, ct);
            return Ok(response);
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost("verify")]
    public async Task<IActionResult> VerifyPayment([FromBody] PaymentVerificationRequestDTO request, CancellationToken ct)
    {
        var verified = await _razorpayService.VerifyPaymentAsync(request, ct);

        if (verified)
        {
            return Content("{\"verified\":true}", "application/json");
        }

        Response.StatusCode = StatusCodes.Status400BadRequest;
        return Content("{\"verified\":false,\"message\":\"Payment verification failed\"}", "application/json");
    }
}
