package com.emart.service.purchase.strategy;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseContext;
import com.emart.service.purchase.PurchaseMode;
import com.emart.service.purchase.PurchaseModeStrategy;

/**
 * MODE 2 - EMCARD DISCOUNT.
 *
 * MRP 500, eMCard price 450 -> a member who opts in pays 450 in cash
 * and redeems NO points; loyalty is earned on the 450 actually paid.
 *
 * This is the only mode with a choice in it: the member picks Regular
 * Price or eMCard Price with one checkbox (an emcard_reservation row
 * is that opt-in marker, always for 0 points). Without the opt-in the
 * line is simply charged the regular price - which is why
 * {@link #decide} can hand back a cash-only-shaped decision.
 */
@Component
public class EmcardDiscountStrategy implements PurchaseModeStrategy {

    @Override
    public PurchaseMode mode() {
        return PurchaseMode.EMCARD_DISCOUNT;
    }


    @Override
    public LineDecision decide(PurchaseContext context) {

        BigDecimal regular = context.getSellingUnitPrice();

        // Not a member, or member who did not opt in -> regular price.
        if (!context.isEmcardMember() || !context.isOptedIn()) {
            return new LineDecision(
                    PurchaseMode.EMCARD_DISCOUNT,
                    context.getQuantity(),
                    regular,
                    regular,
                    0,
                    false,
                    true,
                    null);
        }

        BigDecimal emcardCash = context.getConfiguredCashRequired();

        // A configured price of 0 (or above the regular price) is not a
        // discount - fall back to the regular price rather than giving
        // the item away or charging more than the shelf price.
        BigDecimal cash =
                emcardCash.signum() > 0 && emcardCash.compareTo(regular) < 0
                        ? emcardCash
                        : regular;

        return new LineDecision(
                PurchaseMode.EMCARD_DISCOUNT,
                context.getQuantity(),
                regular,
                cash,
                // Mode 2 never spends points, whatever the row says.
                0,
                cash.compareTo(regular) < 0,
                true,
                null);
    }


    @Override
    public String validate(PurchaseContext context, LineDecision decision) {

        if (decision.getPointsRequired() > 0) {
            return "\"" + context.getProductName()
                    + "\" is sold at an EMCard price. "
                    + "EMCard points cannot be redeemed on it.";
        }

        return null;
    }
}
