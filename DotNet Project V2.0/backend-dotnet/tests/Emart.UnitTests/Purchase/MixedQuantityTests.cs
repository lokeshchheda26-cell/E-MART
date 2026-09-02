using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

/// <summary>
/// A single cart/order line can now mix EMCard-redeemed units with normally-priced units instead
/// of being all-or-nothing (bug: unchecking EMCard on one quantity used to clear the whole
/// product's selection). DecideLine(product, quantity, member, emcardQuantity, pointsAvailable)
/// is the entry point that makes this possible.
/// </summary>
[TestFixture]
public class MixedQuantityTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "Worked example: MRP 120, offer 90 cash + 20 pts, qty 4 split 2/2")]
    public void PartialRedemption_TwoEmcardTwoNormal()
    {
        var product = PartialRedemption("120.00", "90.00", 20);

        var line = Engine.DecideLine(product, quantity: 4, emcardMember: true, emcardQuantity: 2, pointsAvailable: 100);

        line.Purchasable.Should().BeTrue();
        line.EmcardQuantity.Should().Be(2);
        line.NormalQuantity.Should().Be(2);
        // 2 x 90 (EMCard) + 2 x 120 (normal) = 420
        AssertMoney("420.00", line.CashPayable);
        // 2 x 20 = 40
        line.PointsRequired.Should().Be(40);
        line.EmcardApplied.Should().BeTrue();
    }

    [Test(Description = "emcardQuantity 0 of 4 -> all normal, no points")]
    public void PartialRedemption_AllNormal()
    {
        var product = PartialRedemption("120.00", "90.00", 20);

        var line = Engine.DecideLine(product, 4, true, 0, 100);

        line.EmcardQuantity.Should().Be(0);
        line.NormalQuantity.Should().Be(4);
        AssertMoney("480.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
        line.EmcardApplied.Should().BeFalse();
    }

    [Test(Description = "emcardQuantity == quantity -> all eMCard, matches the old all-or-nothing shape")]
    public void PartialRedemption_AllEmcard()
    {
        var product = PartialRedemption("120.00", "90.00", 20);

        var line = Engine.DecideLine(product, 4, true, 4, 100);

        line.EmcardQuantity.Should().Be(4);
        line.NormalQuantity.Should().Be(0);
        AssertMoney("360.00", line.CashPayable);
        line.PointsRequired.Should().Be(80);
    }

    [Test(Description = "single quantity + full opt-in still behaves exactly like before")]
    public void SingleQuantityUnaffected()
    {
        var product = PartialRedemption("120.00", "90.00", 20);

        var opted = Engine.DecideLine(product, 1, true, 1, 100);
        AssertMoney("90.00", opted.CashPayable);
        opted.PointsRequired.Should().Be(20);

        var notOpted = Engine.DecideLine(product, 1, true, 0, 100);
        AssertMoney("120.00", notOpted.CashPayable);
        notOpted.PointsRequired.Should().Be(0);
    }

    [Test(Description = "requested split is clamped to [0, quantity]")]
    public void EmcardQuantityIsClamped()
    {
        var product = PartialRedemption("120.00", "90.00", 20);

        var over = Engine.DecideLine(product, 4, true, 10, 1000);
        over.EmcardQuantity.Should().Be(4);

        var negative = Engine.DecideLine(product, 4, true, -3, 1000);
        negative.EmcardQuantity.Should().Be(0);
    }

    [Test(Description = "full redemption can also mix: 2 points-only units + 2 cash units")]
    public void FullRedemption_MixedQuantity()
    {
        // MRP 100, full redemption costs 30 pts/unit.
        var product = FullRedemption("100.00", 30);

        var line = Engine.DecideLine(product, 4, true, 2, 1000);

        line.EmcardQuantity.Should().Be(2);
        line.NormalQuantity.Should().Be(2);
        // 2 x 0 (points-only) + 2 x 100 (cash) = 200
        AssertMoney("200.00", line.CashPayable);
        line.PointsRequired.Should().Be(60);
        line.Purchasable.Should().BeTrue();
    }

    [Test(Description = "mode 1 (cash only) ignores any requested split, exactly like the old opt-in bool")]
    public void CashOnly_IgnoresSplit()
    {
        var product = CashOnly("500.00");

        var line = Engine.DecideLine(product, 3, true, 2, 1000);

        line.EmcardQuantity.Should().Be(0);
        line.EmcardApplied.Should().BeFalse();
        AssertMoney("1500.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
    }

    [Test(Description = "non-member requesting a split still pays cash for every unit")]
    public void NonMember_IgnoresSplit()
    {
        var product = FullRedemption("100.00", 30);

        var line = Engine.DecideLine(product, 4, false, 2, 1000);

        line.EmcardQuantity.Should().Be(0);
        AssertMoney("400.00", line.CashPayable);
        line.PointsRequired.Should().Be(0);
    }

    [Test(Description = "insufficient balance for the requested split blocks the whole line")]
    public void InsufficientBalanceForSplit_Blocks()
    {
        var product = FullRedemption("100.00", 30);

        // 2 units x 30 = 60 points needed, only 50 available.
        var line = Engine.DecideLine(product, 4, true, 2, 50);

        line.Purchasable.Should().BeFalse();
        line.BlockingReason.Should().NotBeNull();
    }

    [Test(Description = "DecideCart threads a per-line EmcardQuantity through to totals")]
    public void DecideCart_MixedLine()
    {
        var product = PartialRedemption("120.00", "90.00", 20);

        var lines = new List<PurchaseDecisionEngine.CartLine>
        {
            new(product, 4, true, 2)
        };

        var cart = Engine.DecideCart(lines, true, 100);

        cart.Purchasable.Should().BeTrue();
        AssertMoney("420.00", cart.PayableTotal);
        cart.TotalPointsRequired.Should().Be(40);
    }
}
