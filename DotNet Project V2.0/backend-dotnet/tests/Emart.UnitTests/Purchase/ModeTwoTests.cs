using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class ModeTwoTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U3: not opted in -> pays MRP")]
    public void WithoutOptInPaysMrp()
    {
        var line = Engine.DecideLine(EmcardDiscount("500.00", "450.00"), 1, true, false, 0);

        line.Mode.Should().Be(PurchaseMode.EMCARD_DISCOUNT);
        AssertMoney("500.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
        line.EmcardApplied.Should().BeFalse();
    }

    [Test(Description = "U4: opted in -> pays 450, saves 50, earns 45, spends no points")]
    public void OptedInPaysDiscountedCash()
    {
        var line = Engine.DecideLine(EmcardDiscount("500.00", "450.00"), 1, true, true, 0);

        AssertMoney("450.00", line.CashPayable);
        AssertMoney("50.00", line.Savings);
        line.PointsRequired.Should().Be(0);
        line.EmcardApplied.Should().BeTrue();
        LoyaltyPolicy.EarnedPoints(line.CashPayable).Should().Be(45);
    }

    [Test(Description = "U5: a non-member who somehow opts in still pays MRP")]
    public void NonMemberPaysMrp()
    {
        var line = Engine.DecideLine(EmcardDiscount("500.00", "450.00"), 1, false, true, 0);

        line.Mode.Should().Be(PurchaseMode.CASH_ONLY);
        AssertMoney("500.00", line.CashPayable);
    }
}
