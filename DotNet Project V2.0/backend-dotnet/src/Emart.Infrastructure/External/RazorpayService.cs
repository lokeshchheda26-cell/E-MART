using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Emart.Application.Common.Options;
using Emart.Application.Dtos;
using Emart.Application.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Emart.Infrastructure.External;

/// <summary>
/// Razorpay integration via its plain REST API (no official .NET SDK), mirroring the Java
/// razorpay-java usage: create an order with HTTP Basic auth (key:secret), and verify a payment
/// by recomputing the HMAC-SHA256 signature Checkout.js returns rather than trusting it as-is.
/// </summary>
public class RazorpayService : IRazorpayService
{
    private readonly HttpClient _httpClient;
    private readonly RazorpaySettings _settings;

    public RazorpayService(HttpClient httpClient, IOptions<RazorpaySettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings.Value;

        _httpClient.BaseAddress ??= new Uri("https://api.razorpay.com/v1/");
        var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_settings.ApiKey}:{_settings.ApiSecret}"));
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
    }

    public async Task<RazorpayOrderResponseDTO> CreateOrderAsync(int amount, string currency, string receipt, CancellationToken ct = default)
    {
        var payload = new { amount, currency, receipt };

        var response = await _httpClient.PostAsJsonAsync("orders", payload, ct);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync(ct);
        var order = await JsonSerializer.DeserializeAsync<JsonElement>(stream, cancellationToken: ct);

        return new RazorpayOrderResponseDTO
        {
            OrderId = order.GetProperty("id").GetString()!,
            Amount = order.GetProperty("amount").GetInt32(),
            Currency = order.GetProperty("currency").GetString()!,
            Receipt = order.TryGetProperty("receipt", out var r) ? r.GetString() ?? receipt : receipt,
            Status = order.GetProperty("status").GetString()!
        };
    }

    public Task<bool> VerifyPaymentAsync(PaymentVerificationRequestDTO request, CancellationToken ct = default)
    {
        // Recomputes HMAC-SHA256(order_id + "|" + payment_id, key_secret) and compares it to the
        // signature Checkout.js returned - this is what actually proves the payment came from
        // Razorpay and wasn't spoofed in the browser.
        var payload = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.ApiSecret));
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computedSignature = Convert.ToHexString(computedHash).ToLowerInvariant();

        var verified = string.Equals(computedSignature, request.RazorpaySignature, StringComparison.OrdinalIgnoreCase);
        return Task.FromResult(verified);
    }
}
