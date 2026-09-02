namespace Emart.Application.Common.Options;

public class RazorpaySettings
{
    public const string SectionName = "Razorpay";

    public string ApiKey { get; set; } = null!;

    public string ApiSecret { get; set; } = null!;
}
