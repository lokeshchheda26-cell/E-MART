namespace Emart.Application.Common.Options;

public class LoyaltySettings
{
    public const string SectionName = "Loyalty";

    /// <summary>Fraction of cash paid that comes back as points. Default 0.10 (10%), per the BRD.</summary>
    public decimal EarnRate { get; set; } = 0.10m;
}
