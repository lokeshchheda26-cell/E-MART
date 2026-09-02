package com.emart.serviceimpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.emart.dto.CheckoutRequestDTO;
import com.emart.dto.EmcardSettlementDTO;
import com.emart.dto.OrderItemResponseDTO;
import com.emart.dto.OrderResponseDTO;
import com.emart.entity.Cart;
import com.emart.entity.CartItem;
import com.emart.entity.DeliveryOption;
import com.emart.entity.EmcardReservation;
import com.emart.entity.OrderItem;
import com.emart.entity.Orders;
import com.emart.entity.PaymentStatus;
import com.emart.entity.Product;
import com.emart.entity.User;
import com.emart.exception.InsufficientPointsException;
import com.emart.exception.ResourceNotFoundException;
import com.emart.repository.CartItemRepository;
import com.emart.repository.CartRepository;
import com.emart.repository.EmcardReservationRepository;
import com.emart.repository.OrderItemRepository;
import com.emart.repository.OrdersRepository;
import com.emart.repository.ProductRepository;
import com.emart.repository.UserRepository;
import com.emart.repository.EmcardAccountRepository;
import com.emart.service.EmailService;
import com.emart.service.EmcardService;
import com.emart.service.OrderService;
import com.emart.service.PdfInvoiceService;
import com.emart.service.purchase.CartDecision;
import com.emart.service.purchase.LineDecision;
import com.emart.service.purchase.PurchaseDecisionEngine;
import com.emart.service.purchase.PurchaseMode;

@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrdersRepository ordersRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final EmcardReservationRepository reservationRepository;
    private final EmcardAccountRepository emcardAccountRepository;
    private final EmcardService emcardService;
    private final EmailService emailService;
    private final PdfInvoiceService pdfInvoiceService;
    private final PurchaseDecisionEngine purchaseEngine;


    public OrderServiceImpl(
            OrdersRepository ordersRepository,
            OrderItemRepository orderItemRepository,
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            EmcardReservationRepository reservationRepository,
            EmcardAccountRepository emcardAccountRepository,
            EmcardService emcardService,
            EmailService emailService,
            PdfInvoiceService pdfInvoiceService,
            PurchaseDecisionEngine purchaseEngine) {

        this.ordersRepository = ordersRepository;
        this.orderItemRepository = orderItemRepository;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.reservationRepository = reservationRepository;
        this.emcardAccountRepository = emcardAccountRepository;
        this.emcardService = emcardService;
        this.emailService = emailService;
        this.pdfInvoiceService = pdfInvoiceService;
        this.purchaseEngine = purchaseEngine;
    }


    // =========================
    // CHECKOUT
    // =========================

    @Override
    @Transactional
    public OrderResponseDTO checkout(Long userId, CheckoutRequestDTO request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with id: " + userId));

        DeliveryOption deliveryOption = parseDeliveryOption(
                request.getDeliveryOption());

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException(
                        "Your cart is empty. Add items before checking out."));

        List<CartItem> cartItems = cartItemRepository.findByCart_CartId(cart.getCartId());

        if (cartItems.isEmpty()) {
            throw new IllegalStateException(
                    "Your cart is empty. Add items before checking out.");
        }

        String shippingAddress = resolveShippingAddress(
                deliveryOption, request.getShippingAddress(), user.getAddress());

        // Only MODE 2 (eMCard price) has an opt-in, and a reservation
        // row is that marker. Modes 3 and 4 redeem their configured
        // points mandatorily, so nothing about them depends on what the
        // shopper reserved.
        Set<Long> optedInProductIds =
                reservationRepository.findByUserId(userId)
                        .stream()
                        .map(EmcardReservation::getProductId)
                        .collect(Collectors.toSet());

        boolean emcardMember = Boolean.TRUE.equals(user.getIsEmcardMember());

        // STEP 1 - latest point balance (authoritative account row).
        int openingBalance = emcardAccountRepository.findByUserId(userId)
                .map(account -> account.getTotalPoints() == null
                        ? 0
                        : account.getTotalPoints())
                .orElse(0);

        // STEPS 2-7 - every line decided independently by its purchase
        // mode, validated (mandatory cash/points, sufficient balance,
        // cumulative across the cart), then totalled. This is the SAME
        // call CartServiceImpl makes, so the summary the customer just
        // approved is the arithmetic being charged here.
        CartDecision decision = purchaseEngine.decideCart(
                cartItems.stream()
                        .map(cartItem -> new PurchaseDecisionEngine.CartLine(
                                cartItem.getProduct(),
                                cartItem.getQuantity(),
                                optedInProductIds.contains(
                                        cartItem.getProduct().getProductId())))
                        .toList(),
                emcardMember,
                openingBalance);

        // STEP 8 - refuse before anything is written. An insufficient
        // balance is reported as such (400 via the exception handler)
        // rather than silently reducing what gets redeemed.
        if (!decision.isPurchasable()) {
            throw new InsufficientPointsException(decision.getBlockingReason());
        }

        List<OrderItem> orderItems = new ArrayList<>();
        List<Product> productsToUpdate = new ArrayList<>();

        for (int i = 0; i < cartItems.size(); i++) {

            CartItem cartItem = cartItems.get(i);
            Product product = cartItem.getProduct();
            int qty = cartItem.getQuantity();
            LineDecision line = decision.getLines().get(i);

            int availableStock = product.getStock() == null ? 0 : product.getStock();
            if (availableStock < qty) {
                throw new IllegalStateException(
                        "Insufficient stock for \"" + product.getProductName()
                                + "\". Only " + availableStock + " left.");
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(product);
            orderItem.setProductNameSnapshot(product.getProductName());
            orderItem.setBrandSnapshot(product.getBrand());
            orderItem.setMrpPrice(nvl(product.getMrpPrice()));
            orderItem.setUnitPrice(line.getCashUnitPrice());
            orderItem.setQuantity(qty);
            orderItem.setEmcardApplied(line.isEmcardApplied());
            // Points for the whole line (per-unit x qty).
            orderItem.setPointsRedeemed(line.getPointsRequired());
            orderItem.setLineTotal(line.getCashPayable());
            // Snapshot the mode so the invoice stays mode-driven for
            // this order forever, even if the product is reconfigured.
            orderItem.setPurchaseMode(line.getMode().name());
            orderItems.add(orderItem);

            product.setStock(availableStock - qty);
            productsToUpdate.add(product);
        }

        BigDecimal subtotal = decision.getSubtotal();
        BigDecimal payableTotal = decision.getPayableTotal();
        int totalPointsRedeemed = decision.getTotalPointsRequired();
        BigDecimal totalSavings = decision.getTotalSavings();

        // The order row is written FIRST so it has a real id, which
        // the points ledger rows below can then reference ("these 40
        // points were spent on order #123"). Point totals are filled
        // in immediately after settlement; both writes happen inside
        // this one transaction, so nothing is ever observable in the
        // half-written state.
        Orders order = new Orders();
        order.setUserId(userId);
        order.setCustomerName(
                ((user.getFirstName() != null ? user.getFirstName() : "") + " "
                        + (user.getLastName() != null ? user.getLastName() : "")).trim());
        order.setCustomerEmail(user.getEmail());
        order.setDeliveryOption(deliveryOption);
        order.setShippingAddress(shippingAddress);
        order.setStoreLocation(
                deliveryOption == DeliveryOption.PICKUP
                        ? request.getStoreLocation()
                        : null);
        order.setSubtotal(subtotal);
        order.setTotalSavings(totalSavings);
        order.setPayableTotal(payableTotal);
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setOrderDate(LocalDateTime.now());

        order = ordersRepository.save(order);

        // Permanently spend the redeemed points + credit 10% of what
        // was actually paid, atomically. This also re-validates the
        // balance inside a row lock and throws
        // InsufficientPointsException if it no longer covers the
        // order - rolling back this entire checkout (order, items,
        // stock, points) rather than shipping goods that could not be
        // paid for. It also clears every remaining reservation.
        EmcardSettlementDTO settlement = emcardService.settleCheckout(
                userId, order.getOrderId(), totalPointsRedeemed, payableTotal);

        order.setPointsRedeemed(settlement.getPointsRedeemed());
        order.setPointsEarned(settlement.getPointsEarned());
        // Snapshot both balances onto the order so the invoice can
        // show opening/closing figures for ANY past order, not just
        // the live checkout response.
        order.setPointsBalanceBefore(settlement.getTotalPointsBefore());
        order.setPointsBalanceAfter(settlement.getTotalPointsAfter());
        order = ordersRepository.save(order);

        for (OrderItem item : orderItems) {
            item.setOrder(order);
        }
        orderItemRepository.saveAll(orderItems);

        productRepository.saveAll(productsToUpdate);

        cartItemRepository.deleteByCart_CartId(cart.getCartId());

        log.info(
            "Order placed: orderId={} userId={} items={} payableTotal={} "
                + "pointsRedeemed={} pointsEarned={}",
            order.getOrderId(), userId, orderItems.size(),
            payableTotal, settlement.getPointsRedeemed(), settlement.getPointsEarned()
        );

        OrderResponseDTO response = mapToResponse(order, orderItems);

        // Reuse the exact same invoice the /invoice download endpoint
        // serves, so the emailed copy and the downloaded one can never
        // disagree. A failure here must not cost the customer their
        // confirmation email, so fall back to sending it unattached.
        byte[] invoicePdf = null;
        try {
            invoicePdf = pdfInvoiceService.generateInvoicePdf(response);
        } catch (Exception ex) {
            log.error(
                "Could not generate invoice PDF for orderId={}: {}",
                order.getOrderId(), ex.toString(), ex
            );
        }

        // Order + order items are fully committed at this point -
        // safe to fire the confirmation email now, listing every
        // product/price/quantity plus the final payable total, with
        // the PDF invoice attached.
        emailService.sendOrderConfirmationEmail(
                user.getEmail(), order.getCustomerName(), order, orderItems, invoicePdf);

        return response;
    }


    // =========================
    // GET ONE ORDER
    // =========================

    @Override
    @Transactional(readOnly = true)
    public OrderResponseDTO getOrder(Long userId, Long orderId) {

        Orders order = ordersRepository.findByOrderIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Order not found with id: " + orderId));

        List<OrderItem> items = orderItemRepository.findByOrder_OrderId(orderId);

        // The opening/closing balances now live on the order row
        // itself, so re-opening a past order (or re-downloading its
        // PDF) shows the same figures it showed at checkout - they
        // are historical facts about that order, not a live balance.
        return mapToResponse(order, items);
    }


    // =========================
    // ORDER HISTORY
    // =========================

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getOrderHistory(Long userId) {

        return ordersRepository.findByUserIdOrderByOrderDateDesc(userId)
                .stream()
                .map(order -> mapToResponse(
                        order,
                        orderItemRepository.findByOrder_OrderId(order.getOrderId())
                ))
                .toList();
    }


    // =========================
    // HELPERS
    // =========================

    private DeliveryOption parseDeliveryOption(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Delivery option is required");
        }
        try {
            return DeliveryOption.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid delivery option: " + raw
                            + " (expected COURIER or PICKUP)");
        }
    }

    private String resolveShippingAddress(
            DeliveryOption deliveryOption,
            String requestedAddress,
            String profileAddress) {

        if (deliveryOption == DeliveryOption.PICKUP) {
            return null;
        }

        String address = (requestedAddress != null && !requestedAddress.isBlank())
                ? requestedAddress.trim()
                : profileAddress;

        if (address == null || address.isBlank()) {
            throw new IllegalStateException(
                    "Shipping address is required for courier delivery.");
        }

        return address;
    }

    private OrderResponseDTO mapToResponse(
            Orders order,
            List<OrderItem> items) {

        OrderResponseDTO dto = new OrderResponseDTO();
        dto.setOrderId(order.getOrderId());
        dto.setOrderDate(order.getOrderDate());
        dto.setCustomerName(order.getCustomerName());
        dto.setCustomerEmail(order.getCustomerEmail());
        dto.setDeliveryOption(
                order.getDeliveryOption() != null
                        ? order.getDeliveryOption().name()
                        : null);
        dto.setShippingAddress(order.getShippingAddress());
        dto.setStoreLocation(order.getStoreLocation());
        dto.setPaymentStatus(
                order.getPaymentStatus() != null
                        ? order.getPaymentStatus().name()
                        : null);
        dto.setSubtotal(order.getSubtotal());
        dto.setTotalSavings(order.getTotalSavings());
        dto.setPayableTotal(order.getPayableTotal());
        dto.setPointsRedeemed(order.getPointsRedeemed());
        dto.setPointsEarned(order.getPointsEarned());
        dto.setPointsBalanceBefore(order.getPointsBalanceBefore());
        dto.setPointsBalanceAfter(order.getPointsBalanceAfter());
        // Kept for backward compatibility - the Invoice page and the
        // PDF used to read this field. It now comes from the stored
        // closing balance, so it is correct for past orders too
        // instead of only on the checkout response.
        dto.setEmcardBalanceAfter(order.getPointsBalanceAfter());
        // Configured rate, so the invoice can label earned points
        // without hardcoding a percentage.
        dto.setEarnRatePercent(
                purchaseEngine.getLoyaltyPolicy().earnRatePercentLabel());

        dto.setItems(items.stream().map(this::mapItem).toList());

        return dto;
    }

    private OrderItemResponseDTO mapItem(OrderItem item) {
        OrderItemResponseDTO dto = new OrderItemResponseDTO();
        dto.setOrderItemId(item.getOrderItemId());
        dto.setProductId(item.getProduct() != null ? item.getProduct().getProductId() : null);
        dto.setProductName(item.getProductNameSnapshot());
        dto.setBrand(item.getBrandSnapshot());
        dto.setMrpPrice(item.getMrpPrice());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setQuantity(item.getQuantity());
        dto.setEmcardApplied(Boolean.TRUE.equals(item.getEmcardApplied()));
        dto.setPointsRedeemed(item.getPointsRedeemed());
        dto.setLineTotal(item.getLineTotal());

        PurchaseMode mode = resolveOrderItemMode(item);
        dto.setPurchaseMode(mode.name());
        dto.setPurchaseModeLabel(mode.getLabel());
        dto.setPurchaseModeNumber(mode.getModeNumber());

        int qty = item.getQuantity() == null ? 1 : item.getQuantity();
        BigDecimal regular = nvl(item.getMrpPrice())
                .multiply(BigDecimal.valueOf(qty));
        dto.setSavings(regular.subtract(nvl(item.getLineTotal())));

        return dto;
    }

    /**
     * The purchase mode this order line was billed under.
     *
     * Reads the snapshot written at checkout; for rows created before
     * order_item.purchase_mode existed it reconstructs the mode from the
     * stored figures (points spent? cash paid? discounted?), so an old
     * invoice renders mode-driven too instead of falling back to a
     * generic layout.
     */
    private PurchaseMode resolveOrderItemMode(OrderItem item) {

        if (item.getPurchaseMode() != null && !item.getPurchaseMode().isBlank()) {
            try {
                return PurchaseMode.valueOf(item.getPurchaseMode());
            } catch (IllegalArgumentException ignored) {
                // Unknown value (hand-edited row) - fall through to
                // derivation rather than failing the whole invoice.
            }
        }

        int points = item.getPointsRedeemed() == null ? 0 : item.getPointsRedeemed();
        BigDecimal cash = nvl(item.getLineTotal());
        BigDecimal mrp = nvl(item.getMrpPrice());
        BigDecimal unit = nvl(item.getUnitPrice());

        if (points > 0) {
            return cash.signum() > 0
                    ? PurchaseMode.PARTIAL_REDEMPTION
                    : PurchaseMode.FULL_REDEMPTION;
        }

        if (mrp.signum() > 0 && unit.compareTo(mrp) < 0
                && Boolean.TRUE.equals(item.getEmcardApplied())) {
            return PurchaseMode.EMCARD_DISCOUNT;
        }

        return PurchaseMode.CASH_ONLY;
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
