using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class SaleTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U11: an active sale collapses any mode to cash-only at the sale price")]
    public void ActiveSaleWins()
    {
        var p = FullRedemption("300.00", 450);
        p.OnSale = true;
        p.SalePrice = 225.00m;
        p.SaleEndDate = DateTime.UtcNow.AddDays(1);

        var line = Engine.DecideLine(p, 1, true, true, 10_000);

        line.Mode.Should().Be(PurchaseMode.CASH_ONLY);
        AssertMoney("225.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
    }

    [Test(Description = "an expired sale leaves the configured mode alone")]
    public void ExpiredSaleIsIgnored()
    {
        var p = FullRedemption("300.00", 450);
        p.OnSale = true;
        p.SalePrice = 225.00m;
        p.SaleEndDate = DateTime.UtcNow.AddMinutes(-1);

        var line = Engine.DecideLine(p, 1, true, true, 450);

        line.Mode.Should().Be(PurchaseMode.FULL_REDEMPTION);
        line.PointsRequired.Should().Be(450);
    }

    [Test(Description = "opting in is refused while a sale is running")]
    public void SaleForbidsOptIn()
    {
        var p = EmcardDiscount("500.00", "450.00");
        p.OnSale = true;
        p.SalePrice = 400.00m;
        p.SaleEndDate = DateTime.UtcNow.AddDays(1);

        Engine.AllowsOptIn(p, true).Should().BeFalse();
    }
}
