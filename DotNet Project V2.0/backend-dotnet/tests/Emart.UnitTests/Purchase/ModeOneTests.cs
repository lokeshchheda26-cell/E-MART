using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class ModeOneTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U1: MRP 500 -> pays 500, no points, earns 50")]
    public void PaysCashAndEarns()
    {
        var line = Engine.DecideLine(CashOnly("500.00"), 1, true, false, 10_000);

        line.Mode.Should().Be(PurchaseMode.CASH_ONLY);
        AssertMoney("500.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
        line.Purchasable.Should().BeTrue();
        LoyaltyPolicy.EarnedPoints(line.CashPayable).Should().Be(50);
    }

    [Test(Description = "U2: an opt-in on a cash-only product changes nothing")]
    public void OptInIsIgnored()
    {
        // Even with optedIn = true (a stale reservation row, or a crafted request) a mode 1
        // product must never redeem.
        var line = Engine.DecideLine(CashOnly("500.00"), 1, true, true, 10_000);

        AssertMoney("500.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
        line.EmcardApplied.Should().BeFalse();
    }
}
