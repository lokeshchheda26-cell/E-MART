using System.Globalization;

namespace Emart.Domain.Purchase;

/// <summary>
/// The ONLY place that knows how eMCard points are earned.
///
/// BRD: "cardholders will be given e-points equal to 10% of the purchase amount". "Purchase
/// amount" is the CASH actually paid after eMCard pricing and any point redemption.
///
/// The rate is CONFIGURATION (Loyalty:EarnRate, default 0.10, overridable with the
/// LOYALTY_EARN_RATE env var), never a literal inside pricing or invoice code - a double-points
/// weekend is a config change, not a redeploy. Registered in DI with the configured rate baked
/// in (see Emart.Infrastructure DI registration); the constructor here also doubles as the
/// test-only seam for proving the rate really is configuration.
/// </summary>
public sealed class LoyaltyPolicy
{
    private static readonly decimal DefaultEarnRate = 0.10m;

    private readonly decimal? _configuredEarnRate;

    public LoyaltyPolicy(decimal? configuredEarnRate = null)
    {
        _configuredEarnRate = configuredEarnRate;
    }

    /// <summary>Fraction of cash paid that comes back as points.</summary>
    public decimal EarnRate => _configuredEarnRate is null || _configuredEarnRate < 0
        ? DefaultEarnRate
        : _configuredEarnRate.Value;

    /// <summary>
    /// Points earned for an amount of cash actually paid. Rounded DOWN so the loyalty scheme is
    /// never generous by a rounding error, and never negative.
    /// </summary>
    public int EarnedPoints(decimal? cashPaid)
    {
        if (cashPaid is null || cashPaid <= 0m)
        {
            return 0;
        }

        return (int)Math.Floor(cashPaid.Value * EarnRate);
    }

    /// <summary>
    /// The configured rate as a whole-number percentage for display ("Points earned (10% of
    /// amount paid)"). Trailing zeros stripped so 0.125 reads as 12.5, not 12.50.
    /// </summary>
    public string EarnRatePercentLabel()
    {
        var percent = EarnRate * 100m;
        return percent.ToString("0.####################", CultureInfo.InvariantCulture);
    }
}
