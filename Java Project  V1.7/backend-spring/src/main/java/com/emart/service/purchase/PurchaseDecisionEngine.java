package com.emart.service.purchase;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.emart.entity.Product;
import com.emart.entity.ProductOfferType;

/**
 * THE centralised purchase decision algorithm.
 *
 * Every question about money or points - what mode is this product,
 * what is payable in cash, how many points does it cost, what was
 * saved, what is earned, may this line be bought at all - is answered
 * here, once. Cart, checkout, the product page and the invoice all
 * call this class instead of carrying their own copy of the rules;
 * that is what stops the cart and the till disagreeing.
 *
 * The per-mode rules themselves live in {@link PurchaseModeStrategy}
 * implementations selected through {@link PurchaseModeRegistry}
 * (strategy + factory), so this class contains no per-mode branching
 * and a fifth mode needs no change here.
 *
 * MODE RESOLUTION PRECEDENCE (the only "if"s in the algorithm, and
 * they are about the VIEWER and the CALENDAR, not about pricing):
 *
 *   1. not an eMCard member          -> CASH_ONLY   (Condition 1)
 *   2. product is on an active sale  -> CASH_ONLY at the sale price
 *      (a public sale discount and an eMCard offer never stack)
 *   3. otherwise                     -> the product's configured mode
 */
@Component
public class PurchaseDecisionEngine {

    private final PurchaseModeRegistry registry;
    private final LoyaltyPolicy loyaltyPolicy;


    public PurchaseDecisionEngine(
            PurchaseModeRegistry registry,
            LoyaltyPolicy loyaltyPolicy) {

        this.registry = registry;
        this.loyaltyPolicy = loyaltyPolicy;
    }


    // =========================================================
    // MODE RESOLUTION
    // =========================================================

    /** The mode that actually applies to this product for this viewer. */
    public PurchaseMode resolveMode(Product product, boolean emcardMember) {

        if (product == null || !emcardMember || isSaleActive(product)) {
            return PurchaseMode.CASH_ONLY;
        }

        return PurchaseMode.from(resolveOfferType(product));
    }


    /** The product's own configured mode, ignoring viewer and sale. */
    public PurchaseMode configuredMode(Product product) {

        if (product == null) {
            return PurchaseMode.CASH_ONLY;
        }

        return PurchaseMode.from(resolveOfferType(product));
    }


    public boolean isSaleActive(Product product) {

        return product != null
                && Boolean.TRUE.equals(product.getOnSale())
                && product.getSaleEndDate() != null
                && product.getSaleEndDate().isAfter(LocalDateTime.now());
    }


    /**
     * Cash a shopper pays with no eMCard offer applied: the sale price
     * while a sale is genuinely running, otherwise MRP.
     */
    public BigDecimal resolveSellingPrice(Product product) {

        if (product == null) {
            return BigDecimal.ZERO;
        }

        if (isSaleActive(product) && product.getSalePrice() != null) {
            return product.getSalePrice();
        }

        return nvl(product.getMrpPrice());
    }


    /**
     * Whether {@code POST /api/emcard/reserve} is meaningful for this
     * product - true for mode 2 only. Modes 3/4 apply their points
     * automatically and mode 1 has no offer, so both are rejected.
     */
    public boolean allowsOptIn(Product product, boolean emcardMember) {

        PurchaseMode mode = resolveMode(product, emcardMember);

        return registry.forMode(mode).allowsOptIn();
    }


    // =========================================================
    // ONE LINE
    // =========================================================

    public LineDecision decideLine(
            Product product,
            int quantity,
            boolean emcardMember,
            boolean optedIn,
            int pointsAvailable) {

        PurchaseMode mode = resolveMode(product, emcardMember);

        PurchaseContext context = new PurchaseContext(
                product,
                quantity,
                emcardMember,
                optedIn,
                pointsAvailable,
                resolveSellingPrice(product));

        PurchaseModeStrategy strategy = registry.forMode(mode);

        LineDecision decision = strategy.decide(context);

        String problem = strategy.validate(context, decision);

        return problem == null ? decision : decision.blocked(problem);
    }


    // =========================================================
    // WHOLE CART
    // =========================================================

    /**
     * One cart line's inputs. A record so callers (cart, checkout) can
     * build the list from their own entities without this class knowing
     * about CartItem.
     */
    public record CartLine(Product product, int quantity, boolean optedIn) {
    }


    /**
     * Decides EVERY line independently, then totals.
     *
     * The point balance is spent line by line: {@code remaining} drops
     * as each redeeming line is decided, so two lines that are each
     * individually affordable but not affordable together correctly
     * fail - which a per-line check against the raw balance would miss.
     */
    public CartDecision decideCart(
            List<CartLine> lines,
            boolean emcardMember,
            int openingBalance) {

        List<LineDecision> decisions = new ArrayList<>();

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal payableTotal = BigDecimal.ZERO;
        int totalPoints = 0;
        int remainingPoints = Math.max(0, openingBalance);

        String blockingReason = null;

        for (CartLine line : (lines == null ? List.<CartLine>of() : lines)) {

            LineDecision decision = decideLine(
                    line.product(),
                    line.quantity(),
                    emcardMember,
                    line.optedIn(),
                    remainingPoints);

            decisions.add(decision);

            subtotal = subtotal.add(decision.getRegularLineTotal());
            payableTotal = payableTotal.add(decision.getCashPayable());
            totalPoints += decision.getPointsRequired();
            remainingPoints = Math.max(
                    0, remainingPoints - decision.getPointsRequired());

            if (!decision.isPurchasable() && blockingReason == null) {
                blockingReason = decision.getBlockingReason();
            }
        }

        // Belt and braces: even if every line passed its own check, the
        // cart as a whole must fit inside the balance.
        if (blockingReason == null && totalPoints > Math.max(0, openingBalance)) {
            blockingReason = "This order needs " + totalPoints
                    + " EMCard points but your balance is "
                    + Math.max(0, openingBalance) + ".";
        }

        return new CartDecision(
                decisions,
                subtotal,
                payableTotal,
                totalPoints,
                loyaltyPolicy.earnedPoints(payableTotal),
                openingBalance,
                blockingReason == null,
                blockingReason);
    }


    // =========================================================
    // PRODUCT PAGE
    // =========================================================

    /** Mode + every display figure the product page needs. */
    public ProductOffer describeOffer(Product product, boolean emcardMember) {

        PurchaseMode mode = resolveMode(product, emcardMember);
        BigDecimal selling = resolveSellingPrice(product);

        // cash_required / points_required are the authoritative columns,
        // with the legacy pair as a fallback so a row written before they
        // existed still describes its offer correctly.
        BigDecimal emcardCash = switch (mode) {
            case EMCARD_DISCOUNT, PARTIAL_REDEMPTION -> configuredCash(product);
            case CASH_ONLY, FULL_REDEMPTION -> BigDecimal.ZERO;
        };

        int points = switch (mode) {
            case FULL_REDEMPTION, PARTIAL_REDEMPTION -> configuredPoints(product);
            case CASH_ONLY, EMCARD_DISCOUNT -> 0;
        };

        return new ProductOffer(
                mode,
                selling,
                product == null ? BigDecimal.ZERO : nvl(product.getMrpPrice()),
                emcardCash,
                points,
                // Mode 3 pays no cash, so it can never earn.
                mode != PurchaseMode.FULL_REDEMPTION,
                isSaleActive(product));
    }


    public LoyaltyPolicy getLoyaltyPolicy() {
        return loyaltyPolicy;
    }


    // =========================================================
    // HELPERS
    // =========================================================

    /**
     * offer_type from the explicit column, falling back to deriving it
     * from the legacy (mrp, cardholder, points) trio for any row
     * written before that column existed - so old data keeps behaving
     * exactly as it did.
     */
    private ProductOfferType resolveOfferType(Product product) {

        if (product.getOfferType() != null) {
            return product.getOfferType();
        }

        return ProductOfferType.derive(
                product.getMrpPrice(),
                product.getCardholderPrice(),
                product.getPointsToBeRedeemed());
    }


    /** cash_required, falling back to the legacy cardholder_price. */
    private static BigDecimal configuredCash(Product product) {

        if (product == null) {
            return BigDecimal.ZERO;
        }

        if (product.getCashRequired() != null) {
            return product.getCashRequired();
        }

        return nvl(product.getCardholderPrice());
    }


    /** points_required, falling back to the legacy points column. */
    private static int configuredPoints(Product product) {

        if (product == null) {
            return 0;
        }

        if (product.getPointsRequired() != null) {
            return Math.max(0, product.getPointsRequired());
        }

        return product.getPointsToBeRedeemed() == null
                ? 0
                : Math.max(0, product.getPointsToBeRedeemed());
    }


    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
