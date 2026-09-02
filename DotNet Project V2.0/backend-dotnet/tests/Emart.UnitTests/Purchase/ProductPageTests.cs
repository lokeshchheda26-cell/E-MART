using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class ProductPageTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "each mode exposes exactly the figures its page renders")]
    public void DescribeOfferPerMode()
    {
        var cash = Engine.DescribeOffer(CashOnly("500.00"), true);
        cash.Mode.Should().Be(PurchaseMode.CASH_ONLY);
        AssertMoney("500.00", cash.SellingPrice);
        AssertMoney("0.00", cash.EmcardCashPrice);
        cash.PointsRequired.Should().Be(0);
        AssertMoney("0.00", cash.EmcardSavings);
        cash.PointsOptional.Should().BeFalse();
        cash.EarnsPoints.Should().BeTrue();

        var discount = Engine.DescribeOffer(EmcardDiscount("500.00", "450.00"), true);
        AssertMoney("450.00", discount.EmcardCashPrice);
        AssertMoney("50.00", discount.EmcardSavings);
        discount.PointsOptional.Should().BeTrue();

        var full = Engine.DescribeOffer(FullRedemption("300.00", 450), true);
        full.PointsRequired.Should().Be(450);
        AssertMoney("0.00", full.EmcardCashPrice);
        full.EarnsPoints.Should().BeFalse();
        // Mode 3 gets a checkbox too: 300, or 450 points.
        full.PointsOptional.Should().BeTrue();

        var partial = Engine.DescribeOffer(PartialRedemption("300.00", "180.00", 120), true);
        partial.PointsRequired.Should().Be(120);
        AssertMoney("180.00", partial.EmcardCashPrice);
        AssertMoney("120.00", partial.EmcardSavings);
        partial.EarnsPoints.Should().BeTrue();
        // Mode 4 gets a checkbox too: 300, or 180 + 120 points.
        partial.PointsOptional.Should().BeTrue();
    }

    [Test(Description = "a non-member is described as cash-only with no offer figures")]
    public void NonMemberSeesMrpOnly()
    {
        var offer = Engine.DescribeOffer(PartialRedemption("300.00", "180.00", 120), false);

        offer.Mode.Should().Be(PurchaseMode.CASH_ONLY);
        AssertMoney("300.00", offer.SellingPrice);
        offer.PointsRequired.Should().Be(0);
        AssertMoney("0.00", offer.EmcardCashPrice);
    }
}
