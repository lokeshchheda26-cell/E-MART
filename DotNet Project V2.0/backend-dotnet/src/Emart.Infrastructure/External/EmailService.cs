using Emart.Application.Common.Options;
using Emart.Application.Services.Interfaces;
using Emart.Domain.Entities;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Emart.Infrastructure.External;

/// <summary>
/// Sends the three transactional emails the app needs, via SMTP (MailKit). Mirrors the Java
/// EmailServiceImpl's best-effort-vs-throws semantics exactly: welcome and order-confirmation
/// mail are swallowed on failure (they are best-effort notifications about something that already
/// succeeded), the password-reset OTP mail is not (it IS the deliverable).
/// </summary>
public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly MailSettings _settings;

    public EmailService(ILogger<EmailService> logger, IOptions<MailSettings> settings)
    {
        _logger = logger;
        _settings = settings.Value;
    }

    private string FromAddress => string.IsNullOrWhiteSpace(_settings.From) ? _settings.Username : _settings.From;

    public async Task SendWelcomeEmailAsync(string toEmail, string firstName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            return;
        }

        try
        {
            var name = string.IsNullOrWhiteSpace(firstName) ? "there" : firstName;

            var message = BuildMessage(toEmail, "Welcome to online e-Mart store",
                $"Hi {name},\n\n" +
                "Welcome to online e-Mart store! Your account has been created successfully and you're all set to start shopping.\n\n" +
                "Happy shopping!\n" +
                "- The eMart Team");

            await SendAsync(message, ct);
            _logger.LogInformation("Welcome email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome email to {Email}: {Error}", toEmail, ex.ToString());
        }
    }

    public async Task SendPasswordResetOtpEmailAsync(string toEmail, string firstName, string otp, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            throw new InvalidOperationException("Cannot send OTP: no email address on file.");
        }

        try
        {
            var name = string.IsNullOrWhiteSpace(firstName) ? "there" : firstName;

            var message = BuildMessage(toEmail, "Your eMart password reset OTP",
                $"Hi {name},\n\n" +
                "Use the OTP below to reset your eMart account password:\n\n" +
                $"    {otp}\n\n" +
                "This OTP is valid for 10 minutes and can be used only once. If you didn't request a password reset, you can safely ignore this email.\n\n" +
                "- The eMart Team");

            await SendAsync(message, ct);
            _logger.LogInformation("Password reset OTP email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset OTP email to {Email}: {Error}", toEmail, ex.ToString());
            throw new InvalidOperationException("Failed to send OTP email. Please try again in a moment.");
        }
    }

    public async Task SendOrderConfirmationEmailAsync(string toEmail, string customerName, Orders order, List<OrderItem> orderItems, byte[]? invoicePdf, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            return;
        }

        try
        {
            var name = string.IsNullOrWhiteSpace(customerName) ? "there" : customerName;

            var body = new System.Text.StringBuilder();
            body.Append($"Hi {name},\n\n");
            body.Append("Thank you for your order! Here are your order details:\n\n");
            body.Append($"Order ID: {order.OrderId}\n\n");

            foreach (var item in orderItems)
            {
                body.Append($"- {item.ProductNameSnapshot}  x{item.Quantity}  @ Rs. {item.UnitPrice}  = Rs. {item.LineTotal}\n");
            }

            body.Append($"\nTotal Amount: Rs. {order.PayableTotal}\n\n");
            body.Append("We'll notify you once your order is on its way.\n\n");
            body.Append("Thank you for shopping with us!\n");
            body.Append("- The eMart Team");

            var subject = $"Your eMart Order Confirmation - Order #{order.OrderId}";

            byte[]? attachment = invoicePdf is { Length: > 0 } ? invoicePdf : null;
            var message = BuildMessage(toEmail, subject, body.ToString(), attachment, $"eMart-Invoice-{order.OrderId}.pdf");

            await SendAsync(message, ct);
            _logger.LogInformation(
                "Order confirmation email sent to {Email} for order #{OrderId} (invoice attached: {HasInvoice})",
                toEmail, order.OrderId, invoicePdf is { Length: > 0 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send order confirmation email to {Email}: {Error}", toEmail, ex.ToString());
        }
    }

    private MimeMessage BuildMessage(string toEmail, string subject, string textBody, byte[]? attachment = null, string? attachmentName = null)
    {
        var message = new MimeMessage();

        if (!string.IsNullOrWhiteSpace(FromAddress))
        {
            message.From.Add(MailboxAddress.Parse(FromAddress));
        }

        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        var builder = new BodyBuilder { TextBody = textBody };

        if (attachment is not null && attachmentName is not null)
        {
            builder.Attachments.Add(attachmentName, attachment, ContentType.Parse("application/pdf"));
        }

        message.Body = builder.ToMessageBody();

        return message;
    }

    private async Task SendAsync(MimeMessage message, CancellationToken ct)
    {
        using var client = new SmtpClient();
        await client.ConnectAsync(_settings.Host, _settings.Port, MailKit.Security.SecureSocketOptions.StartTls, ct);

        if (!string.IsNullOrWhiteSpace(_settings.Username))
        {
            await client.AuthenticateAsync(_settings.Username, _settings.Password, ct);
        }

        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
