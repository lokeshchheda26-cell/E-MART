package com.emart.service.purchase.strategy;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseContext;
import com.emart.service.purchase.PurchaseMode;
import com.emart.service.purchase.PurchaseModeStrategy;

/**
 * MODE 3 - FULL POINT REDEMPTION.
 *
 * MRP 300, required points 450 -> a member who takes the offer pays 0 in
 * cash and redeems 450 points, and because no cash is paid the order
 * earns nothing.
 *
 * TAKING the offer is the member's choice (one checkbox, like modes 2
 * and 4): the page opens on the regular price, and ticking the box swaps
 * it for "450 e-Points, no cash to pay". What is NOT a choice is the
 * amount - it is product configuration - nor the cash, which is always
 * exactly zero once the offer is on.
 *
 * Purchase is blocked - with a reason the cart renders next to the
 * line - when the balance does not cover it. Combined with the
 * row-locked re-check in EmcardServiceImpl#settleCheckout, that is
 * what makes a negative balance impossible.
 */
@Component
public class FullRedemptionStrategy implements PurchaseModeStrategy {

    @Override
    public PurchaseMode mode() {
        return PurchaseMode.FULL_REDEMPTION;
    }


    @Override
    public LineDecision decide(PurchaseContext context) {

        BigDecimal regular = context.getSellingUnitPrice();

        // Condition 1: a non-member has no points and no offer - they
        // pay the shelf price. (The engine normally resolves the mode
        // to CASH_ONLY for them before this is ever reached; this keeps
        // the strategy correct in isolation too.)
        //
        // Same shape for a member who has not ticked the box: the offer
        // exists, they have not taken it, so the line is plain cash at
        // the regular price.
        if (!context.isEmcardMember() || !context.isOptedIn()) {
            return new LineDecision(
                    PurchaseMode.FULL_REDEMPTION,
                    context.getQuantity(),
                    regular,
                    regular,
                    0,
                    false,
                    true,
                    null);
        }

        return new LineDecision(
                PurchaseMode.FULL_REDEMPTION,
                context.getQuantity(),
                regular,
                // Cash is ALWAYS zero for this mode - never
                // cash_required, never a remainder.
                BigDecimal.ZERO,
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

        // Mis-configured product: mode says "points only" but no point
        // cost was set. Refuse rather than ship it for free.
        if (required <= 0) {
            return "\"" + context.getProductName()
                    + "\" is a points-only product but has no point price "
                    + "configured. Please contact support.";
        }

        if (decision.getCashPayable().signum() != 0) {
            return "\"" + context.getProductName()
                    + "\" can only be purchased with EMCard points.";
        }

        if (required > context.getPointsAvailable()) {
            return "\"" + context.getProductName() + "\" needs "
                    + required + " EMCard points; you have "
                    + context.getPointsAvailable() + " available.";
        }

        return null;
    }
}
