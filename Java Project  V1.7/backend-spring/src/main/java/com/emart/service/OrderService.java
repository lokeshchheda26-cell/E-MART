package com.emart.service;

import java.util.List;

import com.emart.dto.CheckoutRequestDTO;
import com.emart.dto.OrderResponseDTO;

public interface OrderService {

    /**
     * Converts the user's current cart into a placed order:
     * validates it isn't empty, checks stock, prices every line
     * (applying EMCard redemption where selected), permanently
     * spends the redeemed points and credits 10% of the paid amount
     * as newly earned points, decrements stock, clears the cart, and
     * persists the order + line items as an immutable snapshot.
     */
    OrderResponseDTO checkout(Long userId, CheckoutRequestDTO request);

    /**
     * A single order's full invoice detail. Only the owning user (or
     * an admin) may view it - enforced by the controller/caller
     * passing the authenticated userId.
     */
    OrderResponseDTO getOrder(Long userId, Long orderId);

    /**
     * All of a user's past orders, most recent first.
     */
    List<OrderResponseDTO> getOrderHistory(Long userId);
}
