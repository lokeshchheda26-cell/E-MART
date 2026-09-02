using Emart.Domain.Entities;
using Emart.Domain.Purchase;
using Emart.Domain.Purchase.Strategy;
using FluentAssertions;
using NUnit.Framework;

namespace Emart.UnitTests.Purchase;

/// <summary>
/// Shared fixture for the purchase-decision-engine test suite, ported from the Java
/// PurchaseDecisionEngineTest. Deliberately DI-free and database-free, exactly like the source:
/// build a Product POJO, ask the engine, assert the money and the points.
/// </summary>
public abstract class PurchaseDecisionEngineTestBase
{
    protected LoyaltyPolicy LoyaltyPolicy { get; private set; } = null!;
    protected PurchaseDecisionEngine Engine { get; private set; } = null!;

    [SetUp]
    public void BaseSetUp()
    {
        LoyaltyPolicy = new LoyaltyPolicy();

        var registry = new PurchaseModeRegistry(new IPurchaseModeStrategy[]
        {
            new CashOnlyStrategy(),
            new EmcardDiscountStrategy(),
            new FullRedemptionStrategy(),
            new PartialRedemptionStrategy()
        });

        Engine = new PurchaseDecisionEngine(registry, LoyaltyPolicy);
    }

    /// <summary>
    /// A product configured the way the database holds it: the legacy (mrp, cardholder, points)
    /// trio, normalised by the same hook production rows go through.
    /// </summary>
    protected static Product Product(string mrp, string cardholder, int points)
    {
        var p = new Domain.Entities.Product
        {
            ProductName = "Test Product",
            MrpPrice = decimal.Parse(mrp),
            CardholderPrice = decimal.Parse(cardholder),
            PointsToBeRedeemed = points,
            Stock = 100
        };
        p.NormaliseOffer();
        return p;
    }

    protected static Product CashOnly(string mrp) => Product(mrp, mrp, 0);

    protected static Product EmcardDiscount(string mrp, string emcardPrice) => Product(mrp, emcardPrice, 0);

    protected static Product FullRedemption(string mrp, int points) => Product(mrp, mrp, points);

    protected static Product PartialRedemption(string mrp, string cash, int points) => Product(mrp, cash, points);

    protected static void AssertMoney(string expected, decimal actual) =>
        actual.Should().Be(decimal.Parse(expected), $"expected {expected} but was {actual}");
}
