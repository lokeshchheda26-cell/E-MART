using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class ModeThreeTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U6a: offer not taken -> pays the regular price, no points")]
    public void WithoutOptInPaysRegularPrice()
    {
        // Mode 3 is the member's choice too: an un-ticked box means 300 in cash and 0 points.
        var line = Engine.DecideLine(FullRedemption("300.00", 450), 1, true, false, 450);

        line.Mode.Should().Be(PurchaseMode.FULL_REDEMPTION);
        AssertMoney("300.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
        line.EmcardApplied.Should().BeFalse();
        line.Purchasable.Should().BeTrue();
    }

    [Test(Description = "U6: offer taken, balance 450 -> 0 cash, 450 pts, earns 0")]
    public void PointsOnly()
    {
        var line = Engine.DecideLine(FullRedemption("300.00", 450), 1, true, true, 450);

        line.Mode.Should().Be(PurchaseMode.FULL_REDEMPTION);
        AssertMoney("0.00", line.CashPayable);
        line.PointsRequired.Should().Be(450);
        line.Purchasable.Should().BeTrue();
        // No cash paid, so nothing is earned.
        LoyaltyPolicy.EarnedPoints(line.CashPayable).Should().Be(0);
    }

    [Test(Description = "U6b: once taken, the cash side is always exactly zero")]
    public void CashIsAlwaysZeroWhenTaken()
    {
        var line = Engine.DecideLine(FullRedemption("300.00", 450), 1, true, true, 450);

        line.PointsRequired.Should().Be(450);
        AssertMoney("0.00", line.CashPayable);
    }

    [Test(Description = "U7: balance 449 -> not purchasable, with a reason")]
    public void InsufficientBalanceBlocksTheLine()
    {
        var line = Engine.DecideLine(FullRedemption("300.00", 450), 1, true, true, 449);

        line.Purchasable.Should().BeFalse();
        line.BlockingReason.Should().NotBeNull();
        line.BlockingReason.Should().Contain("450");
    }

    [Test(Description = "U8: quantity 3 needs 3x the points")]
    public void PointsScaleWithQuantity()
    {
        var line = Engine.DecideLine(FullRedemption("300.00", 450), 3, true, true, 1350);

        line.PointsRequired.Should().Be(1350);
        AssertMoney("0.00", line.CashPayable);
        line.Purchasable.Should().BeTrue();
    }

    [Test(Description = "U12: a non-member pays cash for a points-only product")]
    public void NonMemberPaysCash()
    {
        var line = Engine.DecideLine(FullRedemption("300.00", 450), 1, false, true, 0);

        line.Mode.Should().Be(PurchaseMode.CASH_ONLY);
        AssertMoney("300.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
    }
}
