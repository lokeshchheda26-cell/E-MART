package com.emart.service.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.emart.entity.Product;
import com.emart.entity.ProductOfferType;
import com.emart.service.purchase.LoyaltyPolicy;
import com.emart.service.purchase.PurchaseDecisionEngine;
import com.emart.service.purchase.PurchaseModeRegistry;
import com.emart.service.purchase.strategy.CashOnlyStrategy;
import com.emart.service.purchase.strategy.EmcardDiscountStrategy;
import com.emart.service.purchase.strategy.FullRedemptionStrategy;
import com.emart.service.purchase.strategy.PartialRedemptionStrategy;

/**
 * The four eMART loyalty business conditions, pinned as tests.
 *
 * PricingEngine is deliberately free of Spring, JPA and any notion of
 * "who is logged in", so every case below is a plain, fast unit test
 * with no context to start and no database to seed.
 *
 * Points EARNED are asserted here using the same rule the settlement
 * applies (10% of cash actually paid, rounded DOWN) so the worked
 * examples from the spec read end-to-end in one place.
 */
class PricingEngineTest {

    /**
     * PricingEngine is now a facade over the purchase-mode strategies,
     * so the unit under test is assembled by hand here - still no
     * Spring, no database, no logged-in user. That the whole of this
     * suite still passes unchanged is the point: the legacy pricing
     * contract survived the refactor.
     */
    private final PricingEngine engine = new PricingEngine(
            new PurchaseDecisionEngine(
                    new PurchaseModeRegistry(List.of(
                            new CashOnlyStrategy(),
                            new EmcardDiscountStrategy(),
                            new FullRedemptionStrategy(),
                            new PartialRedemptionStrategy())),
                    new LoyaltyPolicy()));

    private static final BigDecimal EARN_RATE = new BigDecimal("0.10");


    // =========================
    // HELPERS
    // =========================

    private Product product(
            String mrp, String cardholder, int points) {

        Product p = new Product();
        p.setProductName("Test Product");
        p.setMrpPrice(new BigDecimal(mrp));
        p.setCardholderPrice(new BigDecimal(cardholder));
        p.setPointsToBeRedeemed(points);
        p.setStock(100);
        // Mirrors what the @PrePersist hook does when the row is
        // written, so these tests exercise the same explicit offer
        // columns production code reads.
        p.normaliseOffer();
        return p;
    }

    /** 10% of cash actually paid, rounded down - see EmcardServiceImpl. */
    private int earnedFrom(BigDecimal cashPaid) {
        if (cashPaid == null || cashPaid.signum() <= 0) {
            return 0;
        }
        return cashPaid.multiply(EARN_RATE)
                .setScale(0, RoundingMode.DOWN)
                .intValue();
    }

    private static void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual),
                "expected " + expected + " but was " + actual);
    }


    @Nested
    @DisplayName("Condition 1 - normal customer (not an eMCard holder)")
    class ConditionOne {

        @Test
        @DisplayName("pays MRP, spends no points, earns no points")
        void normalCustomerPaysMrp() {

            // Even though this product HAS an eMCard offer, a customer
            // who did not (and could not) opt in never sees it.
            Product p = product("169.00", "160.00", 0);

            PricedLine line = engine.priceLine(p, 1, false);

            assertMoney("169.00", line.getUnitPrice());
            assertEquals(0, line.getPointsRedeemed());
            assertFalse(line.isEmcardApplied());
            assertEquals(ProductOfferType.NORMAL, line.getOfferType());
            // Earn is settled per ORDER, and a non-member has no
            // eMCard account at all - so nothing is credited.
        }

        @Test
        @DisplayName("a product with no offer prices at MRP even for a member")
        void productWithNoOffer() {

            Product p = product("500.00", "500.00", 0);

            PricedLine line = engine.priceLine(p, 1, true);

            assertMoney("500.00", line.getUnitPrice());
            assertEquals(0, line.getPointsRedeemed());
            assertEquals(ProductOfferType.NORMAL, line.getOfferType());
        }
    }


    @Nested
    @DisplayName("Condition 2 - eMCard holder, discounted price")
    class ConditionTwo {

        @Test
        @DisplayName("MRP 169 / eMCard 160 -> pays 160, earns 16")
        void discountedPriceEarnsTenPercentOfCash() {

            Product p = product("169.00", "160.00", 0);

            PricedLine line = engine.priceLine(p, 1, true);

            assertEquals(ProductOfferType.EMCARD_PRICE, line.getOfferType());
            assertMoney("160.00", line.getUnitPrice());
            assertEquals(0, line.getPointsRedeemed());
            assertMoney("9.00", line.getLineSavings());
            assertEquals(16, earnedFrom(line.getLineTotal()));
        }
    }


    @Nested
    @DisplayName("Condition 3 - full point redemption")
    class ConditionThree {

        @Test
        @DisplayName("MRP 27 / 40 points -> pays 0 cash, spends 40, earns 0")
        void fullRedemptionPaysNoCashAndEarnsNothing() {

            Product p = product("27.00", "27.00", 40);

            PricedLine line = engine.priceLine(p, 1, true);

            assertEquals(ProductOfferType.FULL_REDEMPTION, line.getOfferType());
            assertMoney("0.00", line.getUnitPrice());
            assertEquals(40, line.getPointsRedeemed());
            // No cash paid, so nothing is earned - 10% of 0 is 0.
            assertEquals(0, earnedFrom(line.getLineTotal()));
        }
    }


    @Nested
    @DisplayName("Condition 4 - partial redemption")
    class ConditionFour {

        @Test
        @DisplayName("MRP 120 / 80 cash + 50 points -> earns 8")
        void partialRedemptionEarnsOnCashOnly() {

            Product p = product("120.00", "80.00", 50);

            PricedLine line = engine.priceLine(p, 1, true);

            assertEquals(ProductOfferType.PARTIAL_REDEMPTION, line.getOfferType());
            assertMoney("80.00", line.getUnitPrice());
            assertEquals(50, line.getPointsRedeemed());
            assertMoney("40.00", line.getLineSavings());
            // Points are earned on the CASH paid, not on the MRP -
            // 10% of 80, not of 120.
            assertEquals(8, earnedFrom(line.getLineTotal()));
        }
    }


    @Nested
    @DisplayName("Quantity")
    class Quantity {

        @Test
        @DisplayName("points scale with quantity, like the cash total does")
        void pointsScaleWithQuantity() {

            // Regression guard. This used to redeem 40 points no
            // matter how many units were bought, so 3 units of a
            // 40-point item cost 40 points and shipped all 3 free.
            Product p = product("27.00", "27.00", 40);

            PricedLine line = engine.priceLine(p, 3, true);

            assertEquals(120, line.getPointsRedeemed());
            assertMoney("0.00", line.getLineTotal());
        }

        @Test
        @DisplayName("partial redemption scales both cash and points")
        void partialRedemptionScales() {

            Product p = product("120.00", "80.00", 50);

            PricedLine line = engine.priceLine(p, 2, true);

            assertMoney("160.00", line.getLineTotal());
            assertEquals(100, line.getPointsRedeemed());
            assertEquals(16, earnedFrom(line.getLineTotal()));
        }

        @Test
        @DisplayName("quantity below 1 is treated as 1")
        void quantityIsClamped() {

            Product p = product("100.00", "90.00", 0);

            assertEquals(1, engine.priceLine(p, 0, true).getQuantity());
        }
    }


    @Nested
    @DisplayName("Sale price")
    class Sale {

        @Test
        @DisplayName("an active sale replaces MRP as the regular price")
        void activeSaleBecomesRegularPrice() {

            Product p = product("1000.00", "1000.00", 0);
            p.setOnSale(true);
            p.setSalePrice(new BigDecimal("750.00"));
            p.setSaleEndDate(java.time.LocalDateTime.now().plusDays(1));

            PricedLine line = engine.priceLine(p, 1, false);

            assertMoney("750.00", line.getUnitPrice());
        }

        @Test
        @DisplayName("an expired sale falls back to MRP")
        void expiredSaleIsIgnored() {

            Product p = product("1000.00", "1000.00", 0);
            p.setOnSale(true);
            p.setSalePrice(new BigDecimal("750.00"));
            p.setSaleEndDate(java.time.LocalDateTime.now().minusMinutes(1));

            PricedLine line = engine.priceLine(p, 1, false);

            assertMoney("1000.00", line.getUnitPrice());
        }
    }


    @Nested
    @DisplayName("Offer classification")
    class OfferClassification {

        @Test
        @DisplayName("legacy rows with no offer_type are still classified")
        void derivesOfferTypeForLegacyRows() {

            // A row written before offer_type existed: the explicit
            // columns are null, so the engine must fall back to the
            // old (mrp, cardholder, points) inference and behave
            // exactly as the previous implementation did.
            Product legacy = new Product();
            legacy.setMrpPrice(new BigDecimal("120.00"));
            legacy.setCardholderPrice(new BigDecimal("80.00"));
            legacy.setPointsToBeRedeemed(50);

            PricedLine line = engine.priceLine(legacy, 1, true);

            assertEquals(ProductOfferType.PARTIAL_REDEMPTION, line.getOfferType());
            assertMoney("80.00", line.getUnitPrice());
            assertEquals(50, line.getPointsRedeemed());
        }

        @Test
        @DisplayName("normalisation keeps the legacy columns in step")
        void normalisationKeepsLegacyColumnsInStep() {

            Product p = product("120.00", "80.00", 50);

            assertEquals(ProductOfferType.PARTIAL_REDEMPTION, p.getOfferType());
            assertMoney("80.00", p.getCashRequired());
            assertEquals(50, p.getPointsRequired());
            // The old columns must still agree, because the admin
            // screens and older API consumers read them.
            assertMoney("80.00", p.getCardholderPrice());
            assertEquals(50, p.getPointsToBeRedeemed());
            assertTrue(p.getDisplayType().name().contains("POINTS"));
        }
    }
}
