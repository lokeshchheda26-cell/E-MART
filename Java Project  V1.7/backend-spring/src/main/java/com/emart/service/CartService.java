package com.emart.service;

import com.emart.dto.CartResponseDTO;

public interface CartService {

    /**
     * Returns the current user's cart (creating an empty one on
     * first use), with pricing and EMCard status resolved live for
     * every line - the single source of truth the frontend renders
     * from, so it can never drift from what checkout will actually
     * charge.
     */
    CartResponseDTO getCart(Long userId);

    /**
     * Adds a product to the cart, or increases its quantity if it's
     * already there.
     */
    CartResponseDTO addItem(Long userId, Long productId, Integer quantity);

    /**
     * Sets a line's quantity. A quantity of 0 (or null) removes the
     * line entirely and releases any EMCard points reserved for it -
     * mirrors the existing "remove from cart releases its EMCard
     * selection" behaviour.
     */
    CartResponseDTO updateItemQuantity(
            Long userId,
            Long cartItemId,
            Integer quantity
    );

    /**
     * Removes a line entirely (equivalent to updateItemQuantity with
     * quantity 0).
     */
    CartResponseDTO removeItem(Long userId, Long cartItemId);

    /**
     * Empties the cart and releases every EMCard reservation for
     * this user.
     */
    CartResponseDTO clearCart(Long userId);
}
