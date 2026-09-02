using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class LoyaltyTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U15: 10% of cash paid, rounded down, never negative")]
    public void DefaultRate()
    {
        LoyaltyPolicy.EarnedPoints(null).Should().Be(0);
        LoyaltyPolicy.EarnedPoints(0m).Should().Be(0);
        // 0.9 of a point is not a point.
        LoyaltyPolicy.EarnedPoints(9.00m).Should().Be(0);
        LoyaltyPolicy.EarnedPoints(500.00m).Should().Be(50);
        LoyaltyPolicy.EarnedPoints(180.00m).Should().Be(18);
    }

    [Test(Description = "U16: the rate is configuration - no literal in the logic")]
    public void ConfiguredRate()
    {
        var doublePoints = new LoyaltyPolicy(0.20m);

        doublePoints.EarnedPoints(500.00m).Should().Be(100);
        doublePoints.EarnRatePercentLabel().Should().Be("20");
    }

    [Test(Description = "the percent label matches the configured rate")]
    public void PercentLabel()
    {
        LoyaltyPolicy.EarnRatePercentLabel().Should().Be("10");
    }
}
