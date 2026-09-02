package com.emart.service.purchase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.emart.entity.Product;
import com.emart.entity.ProductOfferType;
import com.emart.service.purchase.strategy.CashOnlyStrategy;
import com.emart.service.purchase.strategy.EmcardDiscountStrategy;
import com.emart.service.purchase.strategy.FullRedemptionStrategy;
import com.emart.service.purchase.strategy.PartialRedemptionStrategy;

/**
 * The four PURCHASE MODES, pinned as tests.
 *
 * Everything under test here is deliberately Spring-free, JPA-free and
 * has no notion of "who is logged in", so each case is a plain fast
 * unit test: build a Product POJO, ask the engine, assert the money and
 * the points.
 *
 * Case numbers (U1..U20) match the unit-test table in
 * PURCHASE_MODE_DESIGN.md.
 */
class PurchaseDecisionEngineTest {

    private final LoyaltyPolicy loyaltyPolicy = new LoyaltyPolicy();

    private final PurchaseDecisionEngine engine = new PurchaseDecisionEngine(
            new PurchaseModeRegistry(List.of(
                    new CashOnlyStrategy(),
                    new EmcardDiscountStrategy(),
                    new FullRedemptionStrategy(),
                    new PartialRedemptionStrategy())),
            loyaltyPolicy);


    // =========================
    // FIXTURES
    // =========================

    /**
     * A product configured the way the database holds it: the legacy
     * (mrp, cardholder, points) trio, normalised by the same
     * {@code @PrePersist} hook production rows go through - so
     * offer_type / cash_required / points_required end up exactly as
     * they would in MySQL.
     */
    private Product product(String mrp, String cardholder, int points) {

        Product p = new Product();
        p.setProductName("Test Product");
        p.setMrpPrice(new BigDecimal(mrp));
        p.setCardholderPrice(new BigDecimal(cardholder));
        p.setPointsToBeRedeemed(points);
        p.setStock(100);
        p.normaliseOffer();
        return p;
    }

    private Product cashOnly(String mrp) {
        return product(mrp, mrp, 0);
    }

    private Product emcardDiscount(String mrp, String emcardPrice) {
        return product(mrp, emcardPrice, 0);
    }

    private Product fullRedemption(String mrp, int points) {
        return product(mrp, mrp, points);
    }

    private Product partialRedemption(String mrp, String cash, int points) {
        return product(mrp, cash, points);
    }

    private static void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual),
                "expected " + expected + " but was " + actual);
    }


    // =========================================================
    // MODE 1 - CASH ONLY
    // =========================================================

    @Nested
    @DisplayName("Mode 1 - cash only")
    class ModeOne {

        @Test
        @DisplayName("U1: MRP 500 -> pays 500, no points, earns 50")
        void paysCashAndEarns() {

            LineDecision line = engine.decideLine(
                    cashOnly("500.00"), 1, true, false, 10_000);

            assertEquals(PurchaseMode.CASH_ONLY, line.getMode());
            assertMoney("500.00", line.getCashPayable());
            assertEquals(0, line.getPointsRequired());
            assertTrue(line.isPurchasable());
            assertEquals(50, loyaltyPolicy.earnedPoints(line.getCashPayable()));
        }

        @Test
        @DisplayName("U2: an opt-in on a cash-only product changes nothing")
        void optInIsIgnored() {

            // Even with optedIn = true (a stale reservation row, or a
            // crafted request) a mode 1 product must never redeem.
            LineDecision line = engine.decideLine(
                    cashOnly("500.00"), 1, true, true, 10_000);

            assertMoney("500.00", line.getCashPayable());
            assertEquals(0, line.getPointsRequired());
            assertFalse(line.isEmcardApplied());
        }
    }


    // =========================================================
    // MODE 2 - EMCARD DISCOUNT
    // =========================================================

    @Nested
    @DisplayName("Mode 2 - eMCard discount")
    class ModeTwo {

        @Test
        @DisplayName("U3: not opted in -> pays MRP")
        void withoutOptInPaysMrp() {

            LineDecision line = engine.decideLine(
                    emcardDiscount("500.00", "450.00"), 1, true, false, 0);

            assertEquals(PurchaseMode.EMCARD_DISCOUNT, line.getMode());
            assertMoney("500.00", line.getCashPayable());
            assertEquals(0, line.getPointsRequired());
            assertFalse(line.isEmcardApplied());
        }

        @Test
        @DisplayName("U4: opted in -> pays 450, saves 50, earns 45, spends no points")
        void optedInPaysDiscountedCash() {

            LineDecision line = engine.decideLine(
                    emcardDiscount("500.00", "450.00"), 1, true, true, 0);

            assertMoney("450.00", line.getCashPayable());
            assertMoney("50.00", line.getSavings());
            assertEquals(0, line.getPointsRequired());
            assertTrue(line.isEmcardApplied());
            assertEquals(45, loyaltyPolicy.earnedPoints(line.getCashPayable()));
        }

        @Test
        @DisplayName("U5: a non-member who somehow opts in still pays MRP")
        void nonMemberPaysMrp() {

            LineDecision line = engine.decideLine(
                    emcardDiscount("500.00", "450.00"), 1, false, true, 0);

            assertEquals(PurchaseMode.CASH_ONLY, line.getMode());
            assertMoney("500.00", line.getCashPayable());
        }
    }


    // =========================================================
    // MODE 3 - FULL REDEMPTION
    // =========================================================

    @Nested
    @DisplayName("Mode 3 - full point redemption")
    class ModeThree {

        @Test
        @DisplayName("U6a: offer not taken -> pays the regular price, no points")
        void withoutOptInPaysRegularPrice() {

            // Mode 3 is the member's choice too: an un-ticked box means
            // 300 in cash and 0 points, not 450 points.
            LineDecision line = engine.decideLine(
                    fullRedemption("300.00", 450), 1, true, false, 450);

            assertEquals(PurchaseMode.FULL_REDEMPTION, line.getMode());
            assertMoney("300.00", line.getCashPayable());
            assertEquals(0, line.getPointsRequired());
            assertFalse(line.isEmcardApplied());
            assertTrue(line.isPurchasable());
        }

        @Test
        @DisplayName("U6: offer taken, balance 450 -> 0 cash, 450 pts, earns 0")
        void pointsOnly() {

            LineDecision line = engine.decideLine(
                    fullRedemption("300.00", 450), 1, true, true, 450);

            assertEquals(PurchaseMode.FULL_REDEMPTION, line.getMode());
            assertMoney("0.00", line.getCashPayable());
            assertEquals(450, line.getPointsRequired());
            assertTrue(line.isPurchasable());
            // No cash paid, so nothing is earned.
            assertEquals(0, loyaltyPolicy.earnedPoints(line.getCashPayable()));
        }

        @Test
        @DisplayName("U6b: once taken, the cash side is always exactly zero")
        void cashIsAlwaysZeroWhenTaken() {

            // The split is not negotiable: taking a mode 3 offer means
            // points only, never points plus a cash remainder.
            LineDecision line = engine.decideLine(
                    fullRedemption("300.00", 450), 1, true, true, 450);

            assertEquals(450, line.getPointsRequired());
            assertMoney("0.00", line.getCashPayable());
        }

        @Test
        @DisplayName("U7: balance 449 -> not purchasable, with a reason")
        void insufficientBalanceBlocksTheLine() {

            LineDecision line = engine.decideLine(
                    fullRedemption("300.00", 450), 1, true, true, 449);

            assertFalse(line.isPurchasable());
            assertNotNull(line.getBlockingReason());
            assertTrue(line.getBlockingReason().contains("450"));
        }

        @Test
        @DisplayName("U8: quantity 3 needs 3x the points")
        void pointsScaleWithQuantity() {

            LineDecision line = engine.decideLine(
                    fullRedemption("300.00", 450), 3, true, true, 1350);

            assertEquals(1350, line.getPointsRequired());
            assertMoney("0.00", line.getCashPayable());
            assertTrue(line.isPurchasable());
        }

        @Test
        @DisplayName("U12: a non-member pays cash for a points-only product")
        void nonMemberPaysCash() {

            LineDecision line = engine.decideLine(
                    fullRedemption("300.00", 450), 1, false, true, 0);

            assertEquals(PurchaseMode.CASH_ONLY, line.getMode());
            assertMoney("300.00", line.getCashPayable());
            assertEquals(0, line.getPointsRequired());
        }
    }


    // =========================================================
    // MODE 4 - PARTIAL REDEMPTION
    // =========================================================

    @Nested
    @DisplayName("Mode 4 - partial redemption")
    class ModeFour {

        @Test
        @DisplayName("U9a: offer not taken -> pays the regular price, no points")
        void withoutOptInPaysRegularPrice() {

            // Mode 4 has a cash price to fall back on, so it is the
            // member's choice: an un-ticked box means 300 and 0 points,
            // not 180 + 120.
            LineDecision line = engine.decideLine(
                    partialRedemption("300.00", "180.00", 120),
                    1, true, false, 120);

            assertEquals(PurchaseMode.PARTIAL_REDEMPTION, line.getMode());
            assertMoney("300.00", line.getCashPayable());
            assertEquals(0, line.getPointsRequired());
            assertFalse(line.isEmcardApplied());
            assertTrue(line.isPurchasable());
        }

        @Test
        @DisplayName("U9: offer taken -> 180 cash + 120 pts, both charged, earns 18")
        void cashAndPointsAreBothMandatory() {

            LineDecision line = engine.decideLine(
                    partialRedemption("300.00", "180.00", 120),
                    1, true, true, 120);

            assertEquals(PurchaseMode.PARTIAL_REDEMPTION, line.getMode());
            assertMoney("180.00", line.getCashPayable());
            assertEquals(120, line.getPointsRequired());
            assertMoney("120.00", line.getSavings());
            assertTrue(line.isPurchasable());
            assertEquals(18, loyaltyPolicy.earnedPoints(line.getCashPayable()));
        }

        @Test
        @DisplayName("U10: quantity 2 needs 240 pts - balance 200 blocks it")
        void insufficientForQuantity() {

            LineDecision line = engine.decideLine(
                    partialRedemption("300.00", "180.00", 120),
                    2, true, true, 200);

            assertEquals(240, line.getPointsRequired());
            assertMoney("360.00", line.getCashPayable());
            assertFalse(line.isPurchasable());
        }

        @Test
        @DisplayName("U20: a mis-configured product (0 points) is refused, not given away")
        void misconfiguredProductIsRefused() {

            // Mode says cash + points but the point price is missing.
            Product p = partialRedemption("300.00", "180.00", 120);
            p.setOfferType(ProductOfferType.PARTIAL_REDEMPTION);
            p.setPointsRequired(0);
            p.setPointsToBeRedeemed(0);

            LineDecision line = engine.decideLine(p, 1, true, true, 10_000);

            assertFalse(line.isPurchasable());
            assertNotNull(line.getBlockingReason());
        }
    }


    // =========================================================
    // SALE PRECEDENCE
    // =========================================================

    @Nested
    @DisplayName("Sale precedence")
    class Sale {

        @Test
        @DisplayName("U11: an active sale collapses any mode to cash-only at the sale price")
        void activeSaleWins() {

            Product p = fullRedemption("300.00", 450);
            p.setOnSale(true);
            p.setSalePrice(new BigDecimal("225.00"));
            p.setSaleEndDate(LocalDateTime.now().plusDays(1));

            LineDecision line = engine.decideLine(p, 1, true, true, 10_000);

            assertEquals(PurchaseMode.CASH_ONLY, line.getMode());
            assertMoney("225.00", line.getCashPayable());
            assertEquals(0, line.getPointsRequired());
        }

        @Test
        @DisplayName("an expired sale leaves the configured mode alone")
        void expiredSaleIsIgnored() {

            Product p = fullRedemption("300.00", 450);
            p.setOnSale(true);
            p.setSalePrice(new BigDecimal("225.00"));
            p.setSaleEndDate(LocalDateTime.now().minusMinutes(1));

            LineDecision line = engine.decideLine(p, 1, true, true, 450);

            assertEquals(PurchaseMode.FULL_REDEMPTION, line.getMode());
            assertEquals(450, line.getPointsRequired());
        }

        @Test
        @DisplayName("opting in is refused while a sale is running")
        void saleForbidsOptIn() {

            Product p = emcardDiscount("500.00", "450.00");
            p.setOnSale(true);
            p.setSalePrice(new BigDecimal("400.00"));
            p.setSaleEndDate(LocalDateTime.now().plusDays(1));

            assertFalse(engine.allowsOptIn(p, true));
        }
    }


    // =========================================================
    // WHOLE CART
    // =========================================================

    @Nested
    @DisplayName("Cart processing")
    class Cart {

        @Test
        @DisplayName("U13: a cart mixing all four modes totals correctly")
        void mixedCart() {

            // Mode 1: 500 cash
            // Mode 2: 450 cash (opted in), saves 50
            // Mode 3: 450 points, 0 cash
            // Mode 4: 180 cash + 120 points, saves 120
            List<PurchaseDecisionEngine.CartLine> lines = List.of(
                    new PurchaseDecisionEngine.CartLine(cashOnly("500.00"), 1, false),
                    new PurchaseDecisionEngine.CartLine(
                            emcardDiscount("500.00", "450.00"), 1, true),
                    new PurchaseDecisionEngine.CartLine(
                            fullRedemption("300.00", 450), 1, true),
                    new PurchaseDecisionEngine.CartLine(
                            partialRedemption("300.00", "180.00", 120), 1, true));

            CartDecision cart = engine.decideCart(lines, true, 1000);

            assertTrue(cart.isPurchasable());
            assertMoney("1130.00", cart.getPayableTotal());
            assertEquals(570, cart.getTotalPointsRequired());
            // 500 + 500 + 300 + 300 regular, minus 1130 paid
            assertMoney("1600.00", cart.getSubtotal());
            assertMoney("470.00", cart.getTotalSavings());
            // 10% of the cash actually paid
            assertEquals(113, cart.getPointsEarned());
            assertEquals(1000, cart.getOpeningBalance());
            assertEquals(1000 - 570 + 113, cart.getClosingBalance());
        }

        @Test
        @DisplayName("U14: two redeeming lines that only fit one at a time fail the cart")
        void cumulativeBalanceIsRespected() {

            List<PurchaseDecisionEngine.CartLine> lines = List.of(
                    new PurchaseDecisionEngine.CartLine(
                            fullRedemption("300.00", 450), 1, true),
                    new PurchaseDecisionEngine.CartLine(
                            fullRedemption("400.00", 450), 1, true));

            // 900 needed, balance covers exactly one line.
            CartDecision cart = engine.decideCart(lines, true, 500);

            assertFalse(cart.isPurchasable());
            assertNotNull(cart.getBlockingReason());
            assertEquals(900, cart.getTotalPointsRequired());
        }

        @Test
        @DisplayName("an empty cart is a valid, zero-everything decision")
        void emptyCart() {

            CartDecision cart = engine.decideCart(List.of(), true, 100);

            assertTrue(cart.isPurchasable());
            assertMoney("0.00", cart.getPayableTotal());
            assertEquals(0, cart.getTotalPointsRequired());
            assertEquals(100, cart.getClosingBalance());
        }

        @Test
        @DisplayName("a non-member's mixed cart is priced entirely in cash")
        void nonMemberCartIsAllCash() {

            List<PurchaseDecisionEngine.CartLine> lines = List.of(
                    new PurchaseDecisionEngine.CartLine(
                            fullRedemption("300.00", 450), 1, true),
                    new PurchaseDecisionEngine.CartLine(
                            partialRedemption("300.00", "180.00", 120), 1, true));

            CartDecision cart = engine.decideCart(lines, false, 0);

            assertEquals(0, cart.getTotalPointsRequired());
            assertMoney("600.00", cart.getPayableTotal());
            assertTrue(cart.isPurchasable());
        }
    }


    // =========================================================
    // LOYALTY
    // =========================================================

    @Nested
    @DisplayName("Loyalty calculation")
    class Loyalty {

        @Test
        @DisplayName("U15: 10% of cash paid, rounded down, never negative")
        void defaultRate() {

            assertEquals(0, loyaltyPolicy.earnedPoints(null));
            assertEquals(0, loyaltyPolicy.earnedPoints(BigDecimal.ZERO));
            // 0.9 of a point is not a point.
            assertEquals(0, loyaltyPolicy.earnedPoints(new BigDecimal("9.00")));
            assertEquals(50, loyaltyPolicy.earnedPoints(new BigDecimal("500.00")));
            assertEquals(18, loyaltyPolicy.earnedPoints(new BigDecimal("180.00")));
        }

        @Test
        @DisplayName("U16: the rate is configuration - no literal in the logic")
        void configuredRate() {

            LoyaltyPolicy doublePoints = new LoyaltyPolicy(new BigDecimal("0.20"));

            assertEquals(100, doublePoints.earnedPoints(new BigDecimal("500.00")));
            assertEquals("20", doublePoints.earnRatePercentLabel());
        }

        @Test
        @DisplayName("the percent label matches the configured rate")
        void percentLabel() {
            assertEquals("10", loyaltyPolicy.earnRatePercentLabel());
        }
    }


    // =========================================================
    // MODE MAPPING / REGISTRY
    // =========================================================

    @Nested
    @DisplayName("Mode mapping and registry")
    class Mapping {

        @Test
        @DisplayName("U17: every mode round-trips through the persisted offer type")
        void roundTrip() {

            for (PurchaseMode mode : PurchaseMode.values()) {
                assertEquals(mode, PurchaseMode.from(mode.toOfferType()));
            }
            // A row with no offer type is treated as cash-only, the
            // option that can never spend someone's points.
            assertEquals(PurchaseMode.CASH_ONLY, PurchaseMode.from(null));
        }

        @Test
        @DisplayName("U18: a missing strategy is a startup failure, not a runtime surprise")
        void registryRequiresEveryMode() {

            assertThrows(IllegalStateException.class,
                    () -> new PurchaseModeRegistry(List.of(new CashOnlyStrategy())));
        }

        @Test
        @DisplayName("two strategies claiming one mode is refused")
        void registryRefusesDuplicates() {

            assertThrows(IllegalStateException.class,
                    () -> new PurchaseModeRegistry(List.of(
                            new CashOnlyStrategy(),
                            new CashOnlyStrategy(),
                            new EmcardDiscountStrategy(),
                            new FullRedemptionStrategy(),
                            new PartialRedemptionStrategy())));
        }

        @Test
        @DisplayName("every offer mode allows an opt-in; mode 1 does not")
        void everyOfferModeIsOptional() {

            // Mode 1 has no offer to take.
            assertFalse(engine.allowsOptIn(cashOnly("500.00"), true));

            assertTrue(engine.allowsOptIn(
                    emcardDiscount("500.00", "450.00"), true));
            assertTrue(engine.allowsOptIn(fullRedemption("300.00", 450), true));
            assertTrue(engine.allowsOptIn(
                    partialRedemption("300.00", "180.00", 120), true));
        }

        @Test
        @DisplayName("U19: quantity below 1 is treated as 1")
        void quantityClamped() {

            assertEquals(1,
                    engine.decideLine(cashOnly("100.00"), 0, true, false, 0)
                            .getQuantity());
            assertEquals(1,
                    engine.decideLine(cashOnly("100.00"), -5, true, false, 0)
                            .getQuantity());
        }

        @Test
        @DisplayName("legacy rows with no offer_type are still classified")
        void legacyRowsStillWork() {

            Product legacy = new Product();
            legacy.setMrpPrice(new BigDecimal("300.00"));
            legacy.setCardholderPrice(new BigDecimal("180.00"));
            legacy.setPointsToBeRedeemed(120);

            LineDecision line = engine.decideLine(legacy, 1, true, true, 500);

            assertEquals(PurchaseMode.PARTIAL_REDEMPTION, line.getMode());
            assertEquals(120, line.getPointsRequired());
            assertMoney("180.00", line.getCashPayable());
        }
    }


    // =========================================================
    // PRODUCT PAGE
    // =========================================================

    @Nested
    @DisplayName("Product page description")
    class ProductPage {

        @Test
        @DisplayName("each mode exposes exactly the figures its page renders")
        void describeOfferPerMode() {

            ProductOffer cash = engine.describeOffer(cashOnly("500.00"), true);
            assertEquals(PurchaseMode.CASH_ONLY, cash.getMode());
            assertMoney("500.00", cash.getSellingPrice());
            assertMoney("0.00", cash.getEmcardCashPrice());
            assertEquals(0, cash.getPointsRequired());
            assertMoney("0.00", cash.getEmcardSavings());
            assertFalse(cash.isPointsOptional());
            assertTrue(cash.isEarnsPoints());

            ProductOffer discount =
                    engine.describeOffer(emcardDiscount("500.00", "450.00"), true);
            assertMoney("450.00", discount.getEmcardCashPrice());
            assertMoney("50.00", discount.getEmcardSavings());
            assertTrue(discount.isPointsOptional());

            ProductOffer full =
                    engine.describeOffer(fullRedemption("300.00", 450), true);
            assertEquals(450, full.getPointsRequired());
            assertMoney("0.00", full.getEmcardCashPrice());
            assertFalse(full.isEarnsPoints());
            // Mode 3 gets a checkbox too: 300, or 450 points.
            assertTrue(full.isPointsOptional());

            ProductOffer partial = engine.describeOffer(
                    partialRedemption("300.00", "180.00", 120), true);
            assertEquals(120, partial.getPointsRequired());
            assertMoney("180.00", partial.getEmcardCashPrice());
            assertMoney("120.00", partial.getEmcardSavings());
            assertTrue(partial.isEarnsPoints());
            // Mode 4 gets a checkbox too: 300, or 180 + 120 points.
            assertTrue(partial.isPointsOptional());
        }

        @Test
        @DisplayName("a non-member is described as cash-only with no offer figures")
        void nonMemberSeesMrpOnly() {

            ProductOffer offer = engine.describeOffer(
                    partialRedemption("300.00", "180.00", 120), false);

            assertEquals(PurchaseMode.CASH_ONLY, offer.getMode());
            assertMoney("300.00", offer.getSellingPrice());
            assertEquals(0, offer.getPointsRequired());
            assertMoney("0.00", offer.getEmcardCashPrice());
        }
    }
}
