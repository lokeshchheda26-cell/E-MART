package com.emart.service.purchase.strategy;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseContext;
import com.emart.service.purchase.PurchaseMode;
import com.emart.service.purchase.PurchaseModeStrategy;

/**
 * MODE 4 - PARTIAL REDEMPTION.
 *
 * MRP 300, cash required 180, points required 120 -> a member who takes
 * the offer pays BOTH halves: 180 in cash and 120 points. Loyalty is
 * earned on the cash component only (18 points here).
 *
 * TAKING the offer is the member's choice (one checkbox, exactly like
 * mode 2): un-ticked means the regular price and no points, ticked means
 * "cash + points". What is NOT a choice is the split - once the offer is
 * on, BOTH halves are mandatory and neither can be varied. The amounts
 * come from points_required/cash_required multiplied by quantity, which
 * is what stops the "type any number of points" behaviour the checkout
 * page used to allow.
 */
@Component
public class PartialRedemptionStrategy implements PurchaseModeStrategy {

    @Override
    public PurchaseMode mode() {
        return PurchaseMode.PARTIAL_REDEMPTION;
    }


    @Override
    public LineDecision decide(PurchaseContext context) {

        BigDecimal regular = context.getSellingUnitPrice();

        // Condition 1 - a non-member pays the shelf price and spends no
        // points. Same shape for a member who has NOT ticked the box:
        // the offer is available, they just have not taken it, so this
        // line is plain cash at the regular price.
        if (!context.isEmcardMember() || !context.isOptedIn()) {
            return new LineDecision(
                    PurchaseMode.PARTIAL_REDEMPTION,
                    context.getQuantity(),
                    regular,
                    regular,
                    0,
                    false,
                    true,
                    null);
        }

        BigDecimal cash = context.getConfiguredCashRequired();

        return new LineDecision(
                PurchaseMode.PARTIAL_REDEMPTION,
                context.getQuantity(),
                regular,
                cash,
                context.getConfiguredPointsRequired(),
                true,
                true,
                null);
    }


    @Override
    public String validate(PurchaseContext context, LineDecision decision) {

        // Nothing to validate for a non-member, or for a member who has
        // not taken the offer - that line is ordinary cash.
        if (!context.isEmcardMember() || !decision.isEmcardApplied()) {
            return null;
        }

        int required = decision.getPointsRequired();

        // Both components are mandatory for this mode - a missing one
        // means the product is mis-configured, not that the customer
        // gets the other half free.
        if (required <= 0 || decision.getCashPayable().signum() <= 0) {
            return "\"" + context.getProductName()
                    + "\" is a cash + points product but is missing its "
                    + "cash or point price. Please contact support.";
        }

        if (required > context.getPointsAvailable()) {
            return "\"" + context.getProductName() + "\" needs "
                    + required + " EMCard points; you have "
                    + context.getPointsAvailable() + " available.";
        }

        return null;
    }
}
