using Emart.Domain.Purchase;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class CartTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U13: a cart mixing all four modes totals correctly")]
    public void MixedCart()
    {
        // Mode 1: 500 cash
        // Mode 2: 450 cash (opted in), saves 50
        // Mode 3: 450 points, 0 cash
        // Mode 4: 180 cash + 120 points, saves 120
        var lines = new List<PurchaseDecisionEngine.CartLine>
        {
            new(CashOnly("500.00"), 1, false),
            new(EmcardDiscount("500.00", "450.00"), 1, true),
            new(FullRedemption("300.00", 450), 1, true),
            new(PartialRedemption("300.00", "180.00", 120), 1, true)
        };

        var cart = Engine.DecideCart(lines, true, 1000);

        cart.Purchasable.Should().BeTrue();
        AssertMoney("1130.00", cart.PayableTotal);
        cart.TotalPointsRequired.Should().Be(570);
        // 500 + 500 + 300 + 300 regular, minus 1130 paid
        AssertMoney("1600.00", cart.Subtotal);
        AssertMoney("470.00", cart.TotalSavings);
        // 10% of the cash actually paid
        cart.PointsEarned.Should().Be(113);
        cart.OpeningBalance.Should().Be(1000);
        cart.ClosingBalance.Should().Be(1000 - 570 + 113);
    }

    [Test(Description = "U14: two redeeming lines that only fit one at a time fail the cart")]
    public void CumulativeBalanceIsRespected()
    {
        var lines = new List<PurchaseDecisionEngine.CartLine>
        {
            new(FullRedemption("300.00", 450), 1, true),
            new(FullRedemption("400.00", 450), 1, true)
        };

        // 900 needed, balance covers exactly one line.
        var cart = Engine.DecideCart(lines, true, 500);

        cart.Purchasable.Should().BeFalse();
        cart.BlockingReason.Should().NotBeNull();
        cart.TotalPointsRequired.Should().Be(900);
    }

    [Test(Description = "an empty cart is a valid, zero-everything decision")]
    public void EmptyCart()
    {
        var cart = Engine.DecideCart(new List<PurchaseDecisionEngine.CartLine>(), true, 100);

        cart.Purchasable.Should().BeTrue();
        AssertMoney("0.00", cart.PayableTotal);
        cart.TotalPointsRequired.Should().Be(0);
        cart.ClosingBalance.Should().Be(100);
    }

    [Test(Description = "a non-member's mixed cart is priced entirely in cash")]
    public void NonMemberCartIsAllCash()
    {
        var lines = new List<PurchaseDecisionEngine.CartLine>
        {
            new(FullRedemption("300.00", 450), 1, true),
            new(PartialRedemption("300.00", "180.00", 120), 1, true)
        };

        var cart = Engine.DecideCart(lines, false, 0);

        cart.TotalPointsRequired.Should().Be(0);
        AssertMoney("600.00", cart.PayableTotal);
        cart.Purchasable.Should().BeTrue();
    }
}
