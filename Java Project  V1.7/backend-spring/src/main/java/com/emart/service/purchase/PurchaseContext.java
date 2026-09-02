package com.emart.service.purchase;

import java.math.BigDecimal;

import com.emart.entity.Product;

/**
 * Everything a purchase-mode strategy is allowed to look at when it
 * prices ONE line.
 *
 * Immutable, entity-light (it holds the Product but never writes to
 * it) and Spring-free, so every strategy can be unit-tested with a
 * plain POJO and no database.
 *
 * {@code sellingUnitPrice} is resolved ONCE by
 * {@link PurchaseDecisionEngine} (sale price while a sale is running,
 * otherwise MRP) and handed to the strategy - so no strategy needs to
 * know the sale rules, and none of them can disagree about what the
 * regular price is.
 *
 * {@code pointsAvailable} is the balance still unspent by EARLIER
 * lines in the same cart, not the raw account balance - that is what
 * makes "two lines that are each affordable but not affordable
 * together" fail correctly.
 */
public final class PurchaseContext {

    private final Product product;
    private final int quantity;
    private final boolean emcardMember;
    private final boolean optedIn;
    private final int pointsAvailable;
    private final BigDecimal sellingUnitPrice;


    public PurchaseContext(
            Product product,
            int quantity,
            boolean emcardMember,
            boolean optedIn,
            int pointsAvailable,
            BigDecimal sellingUnitPrice) {

        this.product = product;
        // Quantity is clamped rather than rejected: a 0/negative
        // quantity is a client bug, and charging for one unit is
        // safer than dividing by it or shipping nothing silently.
        this.quantity = Math.max(1, quantity);
        this.emcardMember = emcardMember;
        this.optedIn = optedIn;
        this.pointsAvailable = Math.max(0, pointsAvailable);
        this.sellingUnitPrice = sellingUnitPrice == null
                ? BigDecimal.ZERO
                : sellingUnitPrice;
    }


    public Product getProduct() {
        return product;
    }

    public int getQuantity() {
        return quantity;
    }

    public boolean isEmcardMember() {
        return emcardMember;
    }

    /** Mode 2 only: did the member tick the eMCard price checkbox? */
    public boolean isOptedIn() {
        return optedIn;
    }

    public int getPointsAvailable() {
        return pointsAvailable;
    }

    public BigDecimal getSellingUnitPrice() {
        return sellingUnitPrice;
    }


    public String getProductName() {
        return product != null ? product.getProductName() : "this product";
    }

    /**
     * Cash the offer asks for per unit.
     *
     * cash_required is authoritative; cardholder_price is the fallback
     * for a row written before that column existed (Product#normaliseOffer
     * fills it in on the next write), so legacy data prices exactly as it
     * did before purchase modes were introduced.
     */
    public BigDecimal getConfiguredCashRequired() {

        if (product == null) {
            return BigDecimal.ZERO;
        }

        if (product.getCashRequired() != null) {
            return product.getCashRequired();
        }

        return product.getCardholderPrice() == null
                ? BigDecimal.ZERO
                : product.getCardholderPrice();
    }

    /**
     * Points the offer asks for per unit - points_required, falling back
     * to the legacy points_to_be_redeemed column for the same reason.
     */
    public int getConfiguredPointsRequired() {

        if (product == null) {
            return 0;
        }

        if (product.getPointsRequired() != null) {
            return Math.max(0, product.getPointsRequired());
        }

        return product.getPointsToBeRedeemed() == null
                ? 0
                : Math.max(0, product.getPointsToBeRedeemed());
    }
}
