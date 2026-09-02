package com.emart.exception;

/**
 * Thrown when an eMCard operation would leave the account with a
 * negative balance, or when a non-member tries to redeem points.
 *
 * Handled by {@link GlobalExceptionHandler} as a 400 Bad Request -
 * this is a business rejection the customer can act on ("you don't
 * have enough points"), not a server fault and not a missing
 * resource.
 *
 * Critically, when this is thrown from inside the checkout
 * transaction it rolls back the ENTIRE checkout - order, order
 * items, stock decrement and point mutation together - so a
 * customer can never end up with goods they could not pay for in
 * points.
 */
public class InsufficientPointsException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public InsufficientPointsException(String message) {
        super(message);
    }
}
