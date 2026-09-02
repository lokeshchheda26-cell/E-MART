package com.emart.serviceimpl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.emart.dto.CartItemResponseDTO;
import com.emart.dto.CartResponseDTO;
import com.emart.entity.Cart;
import com.emart.entity.CartItem;
import com.emart.entity.EmcardReservation;
import com.emart.entity.Product;
import com.emart.exception.ResourceNotFoundException;
import com.emart.repository.CartItemRepository;
import com.emart.repository.CartRepository;
import com.emart.repository.EmcardAccountRepository;
import com.emart.repository.EmcardReservationRepository;
import com.emart.repository.ProductRepository;
import com.emart.repository.UserRepository;
import com.emart.service.CartService;
import com.emart.service.EmcardService;
import com.emart.service.purchase.CartDecision;
import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseDecisionEngine;

@Service
public class CartServiceImpl implements CartService {

    private static final Logger log = LoggerFactory.getLogger(CartServiceImpl.class);

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final EmcardReservationRepository reservationRepository;
    private final EmcardAccountRepository emcardAccountRepository;
    private final UserRepository userRepository;
    private final EmcardService emcardService;
    private final PurchaseDecisionEngine purchaseEngine;


    public CartServiceImpl(
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            EmcardReservationRepository reservationRepository,
            EmcardAccountRepository emcardAccountRepository,
            UserRepository userRepository,
            EmcardService emcardService,
            PurchaseDecisionEngine purchaseEngine) {

        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.reservationRepository = reservationRepository;
        this.emcardAccountRepository = emcardAccountRepository;
        this.userRepository = userRepository;
        this.emcardService = emcardService;
        this.purchaseEngine = purchaseEngine;
    }


    // =========================
    // GET CART
    // =========================

    @Override
    @Transactional
    public CartResponseDTO getCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        return buildCartResponse(cart);
    }


    // =========================
    // ADD ITEM
    // =========================

    @Override
    @Transactional
    public CartResponseDTO addItem(Long userId, Long productId, Integer quantity) {

        Cart cart = getOrCreateCart(userId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + productId));

        int qtyToAdd = (quantity == null || quantity < 1) ? 1 : quantity;

        Optional<CartItem> existing = cartItemRepository
                .findByCart_CartIdAndProduct_ProductId(cart.getCartId(), productId);

        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + qtyToAdd);
            cartItemRepository.save(item);
        } else {
            cartItemRepository.save(new CartItem(cart, product, qtyToAdd));
        }

        log.info("Cart: userId={} added productId={} qty={}", userId, productId, qtyToAdd);

        return buildCartResponse(cart);
    }


    // =========================
    // UPDATE ITEM QUANTITY
    // =========================

    @Override
    @Transactional
    public CartResponseDTO updateItemQuantity(
            Long userId,
            Long cartItemId,
            Integer quantity) {

        Cart cart = getOrCreateCart(userId);

        CartItem item = cartItemRepository
                .findByCartItemIdAndCart_CartId(cartItemId, cart.getCartId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cart item not found with id: " + cartItemId));

        if (quantity == null || quantity <= 0) {

            Long productId = item.getProduct().getProductId();
            cartItemRepository.delete(item);

            // Dropping a line out of the cart makes any EMCard
            // selection on it meaningless too - release it, same as
            // the pre-persistence frontend-only cart used to do.
            emcardService.release(userId, productId);

        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return buildCartResponse(cart);
    }


    // =========================
    // REMOVE ITEM
    // =========================

    @Override
    @Transactional
    public CartResponseDTO removeItem(Long userId, Long cartItemId) {
        return updateItemQuantity(userId, cartItemId, 0);
    }


    // =========================
    // CLEAR CART
    // =========================

    @Override
    @Transactional
    public CartResponseDTO clearCart(Long userId) {

        Cart cart = getOrCreateCart(userId);

        cartItemRepository.deleteByCart_CartId(cart.getCartId());
        emcardService.releaseAll(userId);

        log.info("Cart: userId={} cleared", userId);

        return buildCartResponse(cart);
    }


    // =========================
    // HELPERS
    // =========================

    private Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> cartRepository.save(new Cart(userId)));
    }

    /**
     * Builds the cart response entirely from ONE
     * {@link PurchaseDecisionEngine#decideCart} result.
     *
     * Every line is decided independently (a single cart can mix all
     * four purchase modes), then the totals are aggregated - and the
     * exact same call is made by OrderServiceImpl.checkout, so what the
     * cart shows and what the till charges cannot diverge.
     */
    private CartResponseDTO buildCartResponse(Cart cart) {

        Long userId = cart.getUserId();

        List<CartItem> items = cartItemRepository.findByCart_CartId(cart.getCartId());

        boolean emcardMember = isEmcardMember(userId);
        int openingBalance = pointsBalance(userId);

        // Only mode 2 (eMCard price) has an opt-in, and a reservation
        // row is that opt-in marker. Modes 3/4 redeem automatically, so
        // their points come from the product configuration rather than
        // from anything the shopper reserved.
        Set<Long> optedInProductIds =
                reservationRepository.findByUserId(userId)
                        .stream()
                        .map(EmcardReservation::getProductId)
                        .collect(Collectors.toSet());

        List<PurchaseDecisionEngine.CartLine> lines = items.stream()
                .map(item -> new PurchaseDecisionEngine.CartLine(
                        item.getProduct(),
                        item.getQuantity(),
                        optedInProductIds.contains(
                                item.getProduct().getProductId())))
                .toList();

        CartDecision decision =
                purchaseEngine.decideCart(lines, emcardMember, openingBalance);

        List<CartItemResponseDTO> itemDtos = new ArrayList<>();
        int itemCount = 0;

        for (int i = 0; i < items.size(); i++) {

            CartItem item = items.get(i);
            Product product = item.getProduct();
            LineDecision line = decision.getLines().get(i);

            CartItemResponseDTO dto = new CartItemResponseDTO();
            dto.setCartItemId(item.getCartItemId());
            dto.setProductId(product.getProductId());
            dto.setProductName(product.getProductName());
            dto.setProductImagePath(product.getProductImagePath());
            dto.setBrand(product.getBrand());
            dto.setMrpPrice(nvl(product.getMrpPrice()));
            dto.setCardholderPrice(nvl(product.getCardholderPrice()));
            dto.setQuantity(item.getQuantity());

            dto.setEmcardApplied(line.isEmcardApplied());
            dto.setUnitPrice(line.getCashUnitPrice());
            dto.setLineTotal(line.getCashPayable());

            // ---- purchase-mode fields the UI renders from ----
            dto.setPurchaseMode(line.getMode().name());
            dto.setPurchaseModeLabel(line.getMode().getLabel());
            dto.setPurchaseModeNumber(line.getMode().getModeNumber());
            dto.setCashPayable(line.getCashPayable());
            dto.setPointsRequired(line.getPointsRequired());
            dto.setSavings(line.getSavings());
            dto.setPointsOptional(line.getMode().isOptional());
            dto.setPurchasable(line.isPurchasable());
            dto.setBlockingReason(line.getBlockingReason());

            // ---- legacy fields, unchanged meaning ----
            dto.setOfferType(line.getMode().toOfferType().name());
            dto.setPointsToRedeem(line.getPointsRequired());
            dto.setPointsMax(product.getPointsToBeRedeemed());

            itemDtos.add(dto);
            itemCount += item.getQuantity();
        }

        CartResponseDTO response = new CartResponseDTO();
        response.setCartId(cart.getCartId());
        response.setItems(itemDtos);
        response.setItemCount(itemCount);
        response.setSubtotal(decision.getSubtotal());
        response.setPayableTotal(decision.getPayableTotal());
        response.setTotalSavings(decision.getTotalSavings());
        response.setTotalPointsToRedeem(decision.getTotalPointsRequired());
        response.setPointsBalanceOpening(decision.getOpeningBalance());
        response.setPointsBalanceClosing(decision.getClosingBalance());
        response.setPointsEarned(decision.getPointsEarned());
        response.setEarnRatePercent(
                purchaseEngine.getLoyaltyPolicy().earnRatePercentLabel());
        response.setPurchasable(decision.isPurchasable());
        response.setBlockingReason(decision.getBlockingReason());

        return response;
    }


    /**
     * Condition 1 gate. A non-member's every line is priced cash-only,
     * so this one flag is what keeps eMCard pricing and redemption away
     * from them here, exactly as ProductVisibilityAdvice does for the
     * catalogue endpoints.
     */
    private boolean isEmcardMember(Long userId) {

        return userRepository.findById(userId)
                .map(user -> Boolean.TRUE.equals(user.getIsEmcardMember()))
                .orElse(false);
    }


    /**
     * Authoritative point balance (emcard_account), 0 when there is no
     * account. Read-only here - the cart never moves points; only
     * EmcardServiceImpl#settleCheckout does, under a row lock.
     */
    private int pointsBalance(Long userId) {

        return emcardAccountRepository.findByUserId(userId)
                .map(account -> account.getTotalPoints() == null
                        ? 0
                        : account.getTotalPoints())
                .orElse(0);
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
