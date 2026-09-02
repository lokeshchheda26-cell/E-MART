package com.emart.service.purchase.strategy;

import org.springframework.stereotype.Component;

import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseContext;
import com.emart.service.purchase.PurchaseMode;
import com.emart.service.purchase.PurchaseModeStrategy;

/**
 * MODE 1 - CASH ONLY.
 *
 * MRP 500 -> customer pays 500. Points can never be redeemed on this
 * product, there is no eMCard price, and neither partial nor full
 * redemption exists for it. Loyalty points are still EARNED, because
 * cash was paid (see LoyaltyPolicy).
 *
 * This is also the mode every line collapses to for a customer who is
 * not an eMCard member (Condition 1) and for any product on an active
 * public sale - a sale discount and an eMCard offer never stack.
 */
@Component
public class CashOnlyStrategy implements PurchaseModeStrategy {

    @Override
    public PurchaseMode mode() {
        return PurchaseMode.CASH_ONLY;
    }


    @Override
    public LineDecision decide(PurchaseContext context) {

        // Selling price, and nothing else. Note this deliberately
        // ignores cash_required/points_required even if some stale row
        // carries them: mode 1 means money only.
        return new LineDecision(
                PurchaseMode.CASH_ONLY,
                context.getQuantity(),
                context.getSellingUnitPrice(),
                context.getSellingUnitPrice(),
                0,
                false,
                true,
                null);
    }


    @Override
    public String validate(PurchaseContext context, LineDecision decision) {

        // Defensive: a cash-only line must never carry points. If it
        // somehow does, that is a bug or a crafted request, and saying
        // so is better than silently spending someone's balance.
        if (decision.getPointsRequired() > 0) {
            return "\"" + context.getProductName()
                    + "\" can only be purchased with cash. "
                    + "EMCard points cannot be redeemed on it.";
        }

        return null;
    }
}
