using Emart.Api.Auth;
using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Emart.Api.Controllers;

/// <summary>
/// Checkout + order/invoice endpoints. Every route requires an authenticated user and always
/// operates on the caller's own cart/orders - userId comes from the JWT principal.
/// </summary>
[ApiController]
[Route("api/orders")]
[EnableCors("AnyOrigin")]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IPdfInvoiceService _pdfInvoiceService;

    public OrderController(IOrderService orderService, IPdfInvoiceService pdfInvoiceService)
    {
        _orderService = orderService;
        _pdfInvoiceService = pdfInvoiceService;
    }

    [HttpPost("checkout")]
    public async Task<ActionResult<OrderResponseDTO>> Checkout([FromBody] CheckoutRequestDTO request, CancellationToken ct) =>
        Ok(await _orderService.CheckoutAsync(User.GetUserId()!.Value, request, ct));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderResponseDTO>>> GetOrderHistory(CancellationToken ct) =>
        Ok(await _orderService.GetOrderHistoryAsync(User.GetUserId()!.Value, ct));

    [HttpGet("{orderId:long}")]
    public async Task<ActionResult<OrderResponseDTO>> GetOrder(long orderId, CancellationToken ct) =>
        Ok(await _orderService.GetOrderAsync(User.GetUserId()!.Value, orderId, ct));

    [HttpGet("{orderId:long}/invoice/pdf")]
    public async Task<IActionResult> DownloadInvoicePdf(long orderId, CancellationToken ct)
    {
        var order = await _orderService.GetOrderAsync(User.GetUserId()!.Value, orderId, ct);
        var pdfBytes = _pdfInvoiceService.GenerateInvoicePdf(order);

        return File(pdfBytes, "application/pdf", $"eMart-Invoice-{orderId}.pdf");
    }
}
