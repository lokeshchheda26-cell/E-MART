namespace Emart.Application.Common.Options;

/// <summary>One-time price cleanup, off by default - re-running it silently rewrites real money values.</summary>
public class PriceRoundingSettings
{
    public const string SectionName = "PriceRounding";

    public bool Enabled { get; set; } = false;
}
