package com.emart.service;

import java.math.BigDecimal;
import java.util.List;

import com.emart.dto.EmcardSettlementDTO;
import com.emart.dto.EmcardStatusDTO;
import com.emart.dto.EmcardTransactionResponseDTO;

public interface EmcardService {

    /**
     * Current balance snapshot: total / reserved / available,
     * plus the list of productIds currently EMCard-selected.
     * Used on page load to restore checkbox state (e.g. after a
     * refresh, or when a second tab opens).
     */
    EmcardStatusDTO getSummary(Long userId);

    /**
     * Attempts to reserve the given product's points for this user.
     * Idempotent: if this product is already reserved for this
     * user, it succeeds without reserving twice.
     */
    EmcardStatusDTO reserve(Long userId, Long productId);

    /**
     * Same as reserve(userId, productId), but lets the caller
     * redeem only PART of a product's points instead of all of
     * it - e.g. a product worth 750 points can be reserved for
     * just 300, which proportionally discounts that line's price
     * instead of making it fully free. This is what powers "pay
     * with both EMCard points and money" at checkout.
     *
     * points must be between 1 and the product's full
     * pointsToBeRedeemed (inclusive). Pass null to redeem the full
     * amount (same behavior as reserve(userId, productId)).
     *
     * If a reservation already exists for this product, its point
     * amount is updated to the new value (rather than being a
     * no-op) - this is what lets the person move a slider/input
     * up or down and have it take effect.
     */
    EmcardStatusDTO reserve(Long userId, Long productId, Integer points);

    /**
     * Releases any points reserved for this product/user.
     * Idempotent: releasing something that isn't reserved is a
     * harmless no-op.
     */
    EmcardStatusDTO release(Long userId, Long productId);

    /**
     * Releases everything reserved for this user in one go.
     * Used when the cart is cleared / order is placed / the app
     * resyncs on a fresh page load.
     */
    EmcardStatusDTO releaseAll(Long userId);

    /**
     * Called once, inside the checkout transaction, after the order's
     * line items have been priced. Atomically (same row lock as
     * reserve/release):
     *   - permanently deducts pointsToRedeem (the flat per-line point
     *     cost of every EMCard-redeemed cart line, matching whatever
     *     was already reserved for those products)
     *   - credits 10% of paidAmount (the amount actually charged,
     *     excluding redeemed lines) as newly earned points, per the
     *     BRD's "10% of the purchase amount" rule
     *   - clears every remaining reservation for this user, since the
     *     cart they belonged to no longer exists after checkout
     */
    EmcardSettlementDTO settleCheckout(
            Long userId,
            int pointsToRedeem,
            BigDecimal paidAmount
    );

    /**
     * As {@link #settleCheckout(Long, int, BigDecimal)}, but also
     * stamps the resulting ledger rows with the order they belong to
     * so a customer's points history can say WHICH purchase spent or
     * earned each amount.
     *
     * Additionally, and unlike the previous behaviour, this REJECTS
     * (rather than silently clamping) a redemption the balance no
     * longer covers - throwing
     * {@link com.emart.exception.InsufficientPointsException}, which
     * rolls back the whole checkout transaction.
     */
    EmcardSettlementDTO settleCheckout(
            Long userId,
            Long orderId,
            int pointsToRedeem,
            BigDecimal paidAmount
    );

    /**
     * Full points history for this user, newest first - one row per
     * reason the balance changed (redeemed at checkout, earned at
     * checkout, joining credit), each carrying the balance before and
     * after that single movement.
     */
    List<EmcardTransactionResponseDTO> getTransactions(Long userId);
}
