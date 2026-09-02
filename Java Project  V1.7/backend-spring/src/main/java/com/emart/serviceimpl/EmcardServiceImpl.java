package com.emart.serviceimpl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.emart.dto.EmcardSettlementDTO;
import com.emart.dto.EmcardStatusDTO;
import com.emart.dto.EmcardTransactionResponseDTO;
import com.emart.entity.EmcardAccount;
import com.emart.entity.EmcardReservation;
import com.emart.entity.EmcardTransaction;
import com.emart.entity.EmcardTransactionType;
import com.emart.entity.Product;
import com.emart.exception.InsufficientPointsException;
import com.emart.exception.ResourceNotFoundException;
import com.emart.repository.EmcardAccountRepository;
import com.emart.repository.EmcardReservationRepository;
import com.emart.repository.EmcardTransactionRepository;
import com.emart.repository.ProductRepository;
import com.emart.repository.UserRepository;
import com.emart.service.EmcardService;
import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseDecisionEngine;
import com.emart.service.purchase.PurchaseMode;

@Service
public class EmcardServiceImpl implements EmcardService {

    private static final Logger log =
            LoggerFactory.getLogger(EmcardServiceImpl.class);

    private static final String INSUFFICIENT_POINTS_MESSAGE =
            "Insufficient EMCard Points";

    // A product that is already discounted by an active sale cannot
    // also be paid for with eMcard e-Points (no stacking of the two
    // offers) - server-side counterpart of the disabled eMcard
    // checkbox on the Product Details / listing pages.
    private static final String ON_SALE_MESSAGE =
            "This product is on sale, you cannot use e-Card points on it";

    // MODE 1 - money only, by configuration.
    private static final String CASH_ONLY_MESSAGE =
            "This product can only be purchased with cash. "
                    + "EMCard points cannot be redeemed on it.";


    // The earn rate itself is NOT declared here any more: it lives in
    // com.emart.service.purchase.LoyaltyPolicy (config-driven), which
    // the cart preview, the settlement below and the invoice label all
    // read. One owner, so those three can never quote different rates.

    private final EmcardAccountRepository accountRepository;
    private final EmcardReservationRepository reservationRepository;
    private final EmcardTransactionRepository transactionRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PurchaseDecisionEngine purchaseEngine;


    public EmcardServiceImpl(
            EmcardAccountRepository accountRepository,
            EmcardReservationRepository reservationRepository,
            EmcardTransactionRepository transactionRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            PurchaseDecisionEngine purchaseEngine) {

        this.accountRepository = accountRepository;
        this.reservationRepository = reservationRepository;
        this.transactionRepository = transactionRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.purchaseEngine = purchaseEngine;
    }


    // =========================
    // SUMMARY (read-only, no lock needed)
    // =========================

    @Override
    @Transactional(readOnly = true)
    public EmcardStatusDTO getSummary(Long userId) {

        // Condition 1: a non-member has no eMCard account and no
        // points. That is a normal state, not an error - return a
        // zeroed summary so the header/product pages can simply
        // render "no eMCard" instead of having to handle a 404.
        Optional<EmcardAccount> account = accountRepository.findByUserId(userId);

        if (account.isEmpty()) {
            return new EmcardStatusDTO(true, null, 0, 0, 0, List.of());
        }

        return buildStatus(
                true,
                null,
                account.get(),
                reservationRepository.findByUserId(userId)
        );
    }


    // =========================
    // RESERVE
    //
    // Available points = totalPoints - SUM(reservations for user)
    // is always recomputed from the database inside this locked
    // transaction, so it reflects every reservation committed so
    // far - including ones made a split second ago from another
    // tab or another rapid click. This is what guarantees the
    // backend can never be over-redeemed by a manipulated client
    // request (Phase 3 requirement: no client-side manipulation,
    // no over-redemption).
    // =========================

    @Override
    @Transactional
    public EmcardStatusDTO reserve(Long userId, Long productId) {
        return reserve(userId, productId, null);
    }

    @Override
    @Transactional
    public EmcardStatusDTO reserve(Long userId, Long productId, Integer points) {

        // Locks the account row for the rest of this transaction.
        // Any other reserve()/release() call for the SAME user has
        // to wait here until this transaction commits or rolls
        // back - that is what prevents two concurrent requests
        // from both "seeing" the same available balance and
        // double-spending it.
        EmcardAccount account = getAccountForUpdateOrThrow(userId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + productId));

        // ---- PURCHASE MODE GUARD ----
        // What this endpoint means now: "the member took this product's
        // eMCard offer". Modes 2, 3 and 4 all have one to take; mode 1
        // does not, and is refused here rather than quietly creating a
        // reservation the pricing engine would then ignore.
        //
        // Sale price and e-Points never stack, so an active sale is
        // refused first - PurchaseDecisionEngine.resolveMode collapses
        // an on-sale product to CASH_ONLY for exactly the same reason.
        if (purchaseEngine.isSaleActive(product)) {
            return buildStatus(
                    false,
                    ON_SALE_MESSAGE,
                    account,
                    reservationRepository.findByUserId(userId)
            );
        }

        PurchaseMode mode = purchaseEngine.configuredMode(product);

        // MODE 1 is the only mode with no offer to take.
        if (!mode.isOptional()) {
            return buildStatus(
                    false,
                    CASH_ONLY_MESSAGE,
                    account,
                    reservationRepository.findByUserId(userId)
            );
        }

        // MODES 3 and 4 spend points, so refuse the opt-in up front when
        // the balance does not cover even one unit - the shopper finds out
        // at the checkbox instead of at the till. The engine is asked, so
        // this uses exactly the rule the cart and checkout will apply.
        LineDecision offerCheck = purchaseEngine.decideLine(
                product, 1, true, true, account.getTotalPoints());

        if (!offerCheck.isPurchasable()) {
            return buildStatus(
                    false,
                    offerCheck.getBlockingReason(),
                    account,
                    reservationRepository.findByUserId(userId)
            );
        }

        // The reservation row is only the "opted in" MARKER, always for 0
        // points: how many points a product costs is its configuration
        // (points_required x quantity), resolved by the pricing engine at
        // cart/checkout time. The `points` parameter is retained for API
        // compatibility but no longer lets a customer choose an arbitrary
        // redemption amount.
        int requestedPoints = 0;

        Optional<EmcardReservation> existing =
                reservationRepository.findByUserIdAndProductId(
                        userId, productId);

        int reservedSoFar =
                reservationRepository.sumReservedPointsByUserId(userId);

        // If this product already has a reservation, changing the
        // amount only spends/frees the DELTA - not the whole
        // requested amount again - so raising or lowering the
        // slider on an already-partially-redeemed item works
        // correctly against the true available balance.
        int alreadyHeldForThisProduct =
                existing.map(EmcardReservation::getPointsReserved).orElse(0);

        if (existing.isPresent() && alreadyHeldForThisProduct == requestedPoints) {
            // No-op: idempotent success (duplicate click/request).
            return buildStatus(
                    true,
                    null,
                    account,
                    reservationRepository.findByUserId(userId)
            );
        }

        int availableExcludingThisProduct =
                account.getTotalPoints() - (reservedSoFar - alreadyHeldForThisProduct);

        if (availableExcludingThisProduct < requestedPoints) {

            List<EmcardReservation> currentReservations =
                    reservationRepository.findByUserId(userId);

            return buildStatus(
                    false,
                    INSUFFICIENT_POINTS_MESSAGE,
                    account,
                    currentReservations
            );
        }

        try {
            if (existing.isPresent()) {
                EmcardReservation reservation = existing.get();
                reservation.setPointsReserved(requestedPoints);
                reservationRepository.save(reservation);
            } else {
                reservationRepository.save(new EmcardReservation(
                        userId, productId, requestedPoints));
            }
            // Flush-equivalent: save() inside this locked transaction
            // is enough, the unique constraint on (user_id, prod_id)
            // is the DB-level safety net below.
        } catch (DataIntegrityViolationException duplicate) {
            // Extremely unlikely given the row lock above, but if a
            // duplicate reservation ever slips through, treat it as
            // an idempotent success rather than an error.
        }

        return buildStatus(
                true,
                null,
                account,
                reservationRepository.findByUserId(userId)
        );
    }


    // =========================
    // RELEASE
    // =========================

    @Override
    @Transactional
    public EmcardStatusDTO release(Long userId, Long productId) {

        // Non-EMCard shoppers have no EmcardAccount row and can never
        // have reserved anything, so releasing is a no-op for them.
        // This has to stay tolerant rather than throw: CartServiceImpl
        // calls release() whenever a line is removed from the cart, so
        // throwing here would break remove-item / quantity-to-zero for
        // every non-member.
        Optional<EmcardAccount> existingAccount =
                accountRepository.findByUserIdForUpdate(userId);

        if (existingAccount.isEmpty()) {
            reservationRepository.deleteByUserIdAndProductId(userId, productId);
            return new EmcardStatusDTO(true, null, 0, 0, 0, List.of());
        }

        EmcardAccount account = existingAccount.get();

        // No-op if nothing was reserved for this product - keeps
        // repeated/duplicate uncheck calls harmless.
        reservationRepository.deleteByUserIdAndProductId(userId, productId);

        return buildStatus(
                true,
                null,
                account,
                reservationRepository.findByUserId(userId)
        );
    }


    // =========================
    // RELEASE ALL
    // (cart cleared / order placed / fresh page load resync)
    // =========================

    @Override
    @Transactional
    public EmcardStatusDTO releaseAll(Long userId) {

        // Same reasoning as release(): CartServiceImpl.clearCart calls
        // this for every shopper, member or not, so a missing account
        // must be a no-op rather than an error.
        Optional<EmcardAccount> existingAccount =
                accountRepository.findByUserIdForUpdate(userId);

        if (existingAccount.isEmpty()) {
            reservationRepository.deleteAllByUserId(userId);
            return new EmcardStatusDTO(true, null, 0, 0, 0, List.of());
        }

        EmcardAccount account = existingAccount.get();

        reservationRepository.deleteAllByUserId(userId);

        return buildStatus(
                true,
                null,
                account,
                List.of()
        );
    }


    // =========================
    // SETTLE CHECKOUT
    // (permanent spend of redeemed points + 10% earn on the
    // amount actually paid, in one locked transaction)
    // =========================

    @Override
    @Transactional
    public EmcardSettlementDTO settleCheckout(
            Long userId,
            int pointsToRedeem,
            BigDecimal paidAmount) {

        return settleCheckout(userId, null, pointsToRedeem, paidAmount);
    }

    @Override
    @Transactional
    public EmcardSettlementDTO settleCheckout(
            Long userId,
            Long orderId,
            int pointsToRedeem,
            BigDecimal paidAmount) {

        // Non-EMCard shoppers never get an EmcardAccount row created
        // at registration (see AuthServiceImpl.register), so there is
        // simply nothing to settle for them - they pay cash, redeem
        // nothing, and earn nothing. Treat that as a no-op instead of
        // throwing, otherwise checkout would fail outright for every
        // non-member ("EMCard account not found for user id: ...").
        Optional<EmcardAccount> existingAccount =
                accountRepository.findByUserIdForUpdate(userId);

        if (existingAccount.isEmpty()) {

            // A non-member must never be able to redeem. If the order
            // somehow priced points onto a line for someone with no
            // account, that is a crafted request or a bug - fail the
            // whole checkout rather than hand over goods for free.
            if (pointsToRedeem > 0) {
                throw new InsufficientPointsException(
                        "This account is not an eMCard member, so points "
                                + "cannot be redeemed.");
            }

            // BUT: a member with no account row must still EARN on this
            // order. The row is normally created at registration, so it
            // is missing only for someone whose membership was switched
            // on afterwards (an admin/profile edit) - and silently
            // skipping the credit meant every order they ever placed
            // earned nothing, with no error to show why. Open the
            // account at zero and carry on crediting.
            boolean member = userRepository.findById(userId)
                    .map(user -> Boolean.TRUE.equals(user.getIsEmcardMember()))
                    .orElse(false);

            if (!member) {
                reservationRepository.deleteAllByUserId(userId);
                return new EmcardSettlementDTO(0, 0, 0, 0);
            }

            existingAccount = Optional.of(
                    accountRepository.save(new EmcardAccount(userId, 0)));

            log.info(
                "EMCard: opened a points account for member userId={} at "
                    + "settlement - it had none, so earlier orders earned "
                    + "nothing.",
                userId
            );
        }

        EmcardAccount account = existingAccount.get();

        int currentTotal = account.getTotalPoints();

        // Points were validated at reserve() time, but the balance can
        // legitimately have moved since (another tab checked out, an
        // admin adjustment). Re-validate INSIDE the row lock and fail
        // loudly if it no longer covers the order.
        //
        // This used to be a silent Math.min() clamp, which meant a
        // customer whose balance had dropped still received every
        // redeemed item while the order recorded a smaller redemption
        // than the invoice claimed. Throwing here rolls back the
        // entire checkout transaction - order, order items, stock and
        // points together.
        if (pointsToRedeem > currentTotal) {
            throw new InsufficientPointsException(
                    "You do not have enough eMCard points to complete this "
                            + "order. Required: " + pointsToRedeem
                            + ", available: " + currentTotal + ".");
        }

        int redeemed = Math.max(0, pointsToRedeem);

        // ONE owner of the earn rule (LoyaltyPolicy), shared with the
        // cart preview and the invoice label - so "points earned" is the
        // same number wherever it appears, and the rate stays
        // configuration rather than a literal in here.
        int earned = purchaseEngine.getLoyaltyPolicy().earnedPoints(paidAmount);

        int newTotal = currentTotal - redeemed + earned;

        account.setTotalPoints(newTotal);
        accountRepository.save(account);

        // Ledger: one row per reason, so "why is my balance this
        // number?" is answerable and every invoice line is traceable.
        // Written inside this same locked transaction as the balance
        // itself, so the two can never disagree.
        int running = currentTotal;
        if (redeemed > 0) {
            transactionRepository.save(new EmcardTransaction(
                    userId, orderId, EmcardTransactionType.REDEEM,
                    redeemed, running, running - redeemed));
            running -= redeemed;
        }
        if (earned > 0) {
            transactionRepository.save(new EmcardTransaction(
                    userId, orderId, EmcardTransactionType.EARN,
                    earned, running, running + earned));
        }

        // user_master.emcard_points was written once at registration
        // and never again, so it has been stale for every customer
        // who ever checked out - and it is what the Profile page
        // shows. emcard_account.total_points remains the authoritative
        // balance; this just stops the legacy copy lying.
        userRepository.findById(userId).ifPresent(user -> {
            user.setEmcardPoints(newTotal);
            userRepository.save(user);
        });

        // The cart this checkout came from is gone either way - every
        // reservation for this user (redeemed or not) is now stale.
        reservationRepository.deleteAllByUserId(userId);

        log.info(
            "EMCard settleCheckout: userId={} redeemed={} earned={} "
                + "totalBefore={} totalAfter={}",
            userId, redeemed, earned, currentTotal, newTotal
        );

        return new EmcardSettlementDTO(redeemed, earned, currentTotal, newTotal);
    }


    // =========================
    // POINTS HISTORY
    // =========================

    @Override
    @Transactional(readOnly = true)
    public List<EmcardTransactionResponseDTO> getTransactions(Long userId) {

        return transactionRepository.findByUserIdOrderByTxnIdDesc(userId)
                .stream()
                .map(txn -> new EmcardTransactionResponseDTO(
                        txn.getTxnId(),
                        txn.getOrderId(),
                        txn.getTxnType() != null ? txn.getTxnType().name() : null,
                        txn.getPoints(),
                        txn.getBalanceBefore(),
                        txn.getBalanceAfter(),
                        txn.getCreatedAt()))
                .toList();
    }


    // =========================
    // HELPERS
    // =========================

    /**
     * A shopper who is not an eMCard member simply has no account row
     * (see AuthServiceImpl.register). Trying to redeem is then a
     * business rejection - "you are not a member" - not a missing
     * resource, so this reports it as such (400) instead of the
     * 404-shaped "EMCard account not found for user id: 7" that
     * leaked an internal id into the UI.
     */
    private EmcardAccount getAccountForUpdateOrThrow(Long userId) {
        return accountRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new InsufficientPointsException(
                        "eMCard offers are only available to eMCard members."));
    }

    private EmcardStatusDTO buildStatus(
            boolean success,
            String message,
            EmcardAccount account,
            List<EmcardReservation> reservations) {

        int reservedPoints = reservations.stream()
                .mapToInt(EmcardReservation::getPointsReserved)
                .sum();

        int availablePoints = account.getTotalPoints() - reservedPoints;

        List<Long> reservedProductIds = reservations.stream()
                .map(EmcardReservation::getProductId)
                .toList();

        return new EmcardStatusDTO(
                success,
                message,
                account.getTotalPoints(),
                reservedPoints,
                availablePoints,
                reservedProductIds
        );
    }
}
