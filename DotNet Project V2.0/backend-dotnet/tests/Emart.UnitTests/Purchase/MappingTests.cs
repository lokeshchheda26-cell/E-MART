using Emart.Domain.Purchase;
using Emart.Domain.Purchase.Strategy;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

[TestFixture]
public class MappingTests : PurchaseDecisionEngineTestBase
{
    [Test(Description = "U17: every mode round-trips through the persisted offer type")]
    public void RoundTrip()
    {
        foreach (PurchaseMode mode in Enum.GetValues<PurchaseMode>())
        {
            PurchaseModeExtensions.From(mode.ToOfferType()).Should().Be(mode);
        }

        // A row with no offer type is treated as cash-only, the option that can never spend
        // someone's points.
        PurchaseModeExtensions.From(null).Should().Be(PurchaseMode.CASH_ONLY);
    }

    [Test(Description = "U18: a missing strategy is a startup failure, not a runtime surprise")]
    public void RegistryRequiresEveryMode()
    {
        var act = () => new PurchaseModeRegistry(new IPurchaseModeStrategy[] { new CashOnlyStrategy() });
        act.Should().Throw<InvalidOperationException>();
    }

    [Test(Description = "two strategies claiming one mode is refused")]
    public void RegistryRefusesDuplicates()
    {
        var act = () => new PurchaseModeRegistry(new IPurchaseModeStrategy[]
        {
            new CashOnlyStrategy(),
            new CashOnlyStrategy(),
            new EmcardDiscountStrategy(),
            new FullRedemptionStrategy(),
            new PartialRedemptionStrategy()
        });

        act.Should().Throw<InvalidOperationException>();
    }

    [Test(Description = "every offer mode allows an opt-in; mode 1 does not")]
    public void EveryOfferModeIsOptional()
    {
        // Mode 1 has no offer to take.
        Engine.AllowsOptIn(CashOnly("500.00"), true).Should().BeFalse();

        Engine.AllowsOptIn(EmcardDiscount("500.00", "450.00"), true).Should().BeTrue();
        Engine.AllowsOptIn(FullRedemption("300.00", 450), true).Should().BeTrue();
        Engine.AllowsOptIn(PartialRedemption("300.00", "180.00", 120), true).Should().BeTrue();
    }

    [Test(Description = "U19: quantity below 1 is treated as 1")]
    public void QuantityClamped()
    {
        Engine.DecideLine(CashOnly("100.00"), 0, true, false, 0).Quantity.Should().Be(1);
        Engine.DecideLine(CashOnly("100.00"), -5, true, false, 0).Quantity.Should().Be(1);
    }

    [Test(Description = "legacy rows with no offer_type are still classified")]
    public void LegacyRowsStillWork()
    {
        var legacy = new Domain.Entities.Product
        {
            MrpPrice = 300.00m,
            CardholderPrice = 180.00m,
            PointsToBeRedeemed = 120
        };

        var line = Engine.DecideLine(legacy, 1, true, true, 500);

        line.Mode.Should().Be(PurchaseMode.PARTIAL_REDEMPTION);
        line.PointsRequired.Should().Be(120);
        AssertMoney("180.00", line.CashPayable);
    }
}
