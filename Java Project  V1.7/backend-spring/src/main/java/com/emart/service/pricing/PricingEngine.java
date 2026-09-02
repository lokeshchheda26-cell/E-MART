package com.emart.service.pricing;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

import com.emart.entity.Product;
import com.emart.entity.ProductOfferType;
import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseDecisionEngine;

/**
 * Legacy line-pricing facade, kept so nothing that already depends on
 * it has to change.
 *
 * WHAT THIS IS NOW
 * ----------------
 * A thin adapter over {@link PurchaseDecisionEngine}. The rules that
 * used to live in this class as a chain of ifs now live in one
 * strategy per purchase mode
 * (com.emart.service.purchase.strategy.*), and this class only
 * translates the result into the older {@link PricedLine} shape.
 *
 * WHAT CHANGED IN BEHAVIOUR
 * -------------------------
 * The purchase mode is now authoritative, so:
 *   - MODE 3 (full redemption) and MODE 4 (partial redemption) apply
 *     their points MANDATORILY for a member - they are no longer
 *     something the shopper can decline by not ticking a box;
 *   - MODE 2 (eMCard price) is still the member's choice, which is
 *     what {@code optedIn} now means;
 *   - MODE 1 (cash only) can never spend points;
 *   - a product on an active public sale is charged its sale price and
 *     spends no points (a sale and an eMCard offer never stack).
 *
 * Prefer {@link PurchaseDecisionEngine} directly in new code: it also
 * reports validation failures and whole-cart totals, which this
 * facade cannot express.
 */
@Component
public class PricingEngine {

    private final PurchaseDecisionEngine decisionEngine;


    public PricingEngine(PurchaseDecisionEngine decisionEngine) {
        this.decisionEngine = decisionEngine;
    }


    /**
     * Prices one line for an eMCard MEMBER.
     *
     * Retained signature: every existing caller passed "did this member
     * opt into the offer", which is exactly what {@code optedIn} still
     * means for mode 2.
     */
    public PricedLine priceLine(Product product, int quantity, boolean optedIn) {
        return priceLine(product, quantity, optedIn, true);
    }


    /**
     * @param emcardMember false for a guest/non-member, which collapses
     *                     the line to cash-only at the regular price
     *                     (Condition 1).
     */
    public PricedLine priceLine(
            Product product,
            int quantity,
            boolean optedIn,
            boolean emcardMember) {

        LineDecision decision = decisionEngine.decideLine(
                product,
                quantity,
                emcardMember,
                optedIn,
                // This facade has no balance to validate against;
                // callers that need that use the engine directly.
                Integer.MAX_VALUE);

        return new PricedLine(
                decision.getRegularUnitPrice(),
                decision.getCashUnitPrice(),
                decision.getPointsPerUnit(),
                decision.getQuantity(),
                decision.isEmcardApplied(),
                decision.isEmcardApplied()
                        ? decision.getMode().toOfferType()
                        : ProductOfferType.NORMAL);
    }


    /** @deprecated use {@link PurchaseDecisionEngine#resolveSellingPrice}. */
    @Deprecated
    public BigDecimal resolveRegularPrice(Product product) {
        return decisionEngine.resolveSellingPrice(product);
    }


    /** @deprecated use {@link PurchaseDecisionEngine#configuredMode}. */
    @Deprecated
    public ProductOfferType resolveOfferType(Product product) {
        return decisionEngine.configuredMode(product).toOfferType();
    }
}
