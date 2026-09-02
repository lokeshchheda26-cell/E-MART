using Emart.Domain.Enums;
using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class ModeFourTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U9a: offer not taken -> pays the regular price, no points")]
    public void WithoutOptInPaysRegularPrice()
    {
        var line = Engine.DecideLine(PartialRedemption("300.00", "180.00", 120), 1, true, false, 120);

        line.Mode.Should().Be(PurchaseMode.PARTIAL_REDEMPTION);
        AssertMoney("300.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
        line.EmcardApplied.Should().BeFalse();
        line.Purchasable.Should().BeTrue();
    }

    [Test(Description = "U9: offer taken -> 180 cash + 120 pts, both charged, earns 18")]
    public void CashAndPointsAreBothMandatory()
    {
        var line = Engine.DecideLine(PartialRedemption("300.00", "180.00", 120), 1, true, true, 120);

        line.Mode.Should().Be(PurchaseMode.PARTIAL_REDEMPTION);
        AssertMoney("180.00", line.CashPayable);
        line.PointsRequired.Should().Be(120);
        AssertMoney("120.00", line.Savings);
        line.Purchasable.Should().BeTrue();
        LoyaltyPolicy.EarnedPoints(line.CashPayable).Should().Be(18);
    }

    [Test(Description = "U10: quantity 2 needs 240 pts - balance 200 blocks it")]
    public void InsufficientForQuantity()
    {
        var line = Engine.DecideLine(PartialRedemption("300.00", "180.00", 120), 2, true, true, 200);

        line.PointsRequired.Should().Be(240);
        AssertMoney("360.00", line.CashPayable);
        line.Purchasable.Should().BeFalse();
    }

    [Test(Description = "U20: a mis-configured product (0 points) is refused, not given away")]
    public void MisconfiguredProductIsRefused()
    {
        // Mode says cash + points but the point price is missing.
        var p = PartialRedemption("300.00", "180.00", 120);
        p.OfferType = ProductOfferType.PARTIAL_REDEMPTION;
        p.PointsRequired = 0;
        p.PointsToBeRedeemed = 0;

        var line = Engine.DecideLine(p, 1, true, true, 10_000);

        line.Purchasable.Should().BeFalse();
        line.BlockingReason.Should().NotBeNull();
    }
}
