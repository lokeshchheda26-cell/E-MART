using Emart.Domain.Entities;

namespace Emart.Application.Services.Interfaces;

public interface IEmailService
{
    /// <summary>Best-effort - never throws. A missing/misconfigured SMTP account must not roll back registration.</summary>
    Task SendWelcomeEmailAsync(string toEmail, string firstName, CancellationToken ct = default);

    /// <summary>NOT best-effort - throws on failure, since this IS the deliverable (the user's only way to get their OTP).</summary>
    Task SendPasswordResetOtpEmailAsync(string toEmail, string firstName, string otp, CancellationToken ct = default);

    /// <summary>Best-effort - never throws. Attaches the invoice PDF when generation succeeded.</summary>
    Task SendOrderConfirmationEmailAsync(string toEmail, string customerName, Orders order, List<OrderItem> orderItems, byte[]? invoicePdf, CancellationToken ct = default);
}
