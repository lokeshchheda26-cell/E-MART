package com.emart.service.pricing;

import java.math.BigDecimal;

import com.emart.entity.ProductOfferType;

/**
 * The priced result of ONE cart/order line.
 *
 * Immutable value object - it carries no entity references and no
 * behaviour beyond arithmetic, so it can be unit-tested without
 * Spring, a database, or a logged-in user.
 */
public final class PricedLine {

    /** Price per unit before any eMCard offer (MRP, or salePrice while on sale). */
    private final BigDecimal regularUnitPrice;

    /** Price per unit actually charged. */
    private final BigDecimal unitPrice;

    /** Points redeemed per unit. */
    private final int pointsPerUnit;

    private final int quantity;

    /** Whether the eMCard offer was actually applied to this line. */
    private final boolean emcardApplied;

    private final ProductOfferType offerType;


    public PricedLine(
            BigDecimal regularUnitPrice,
            BigDecimal unitPrice,
            int pointsPerUnit,
            int quantity,
            boolean emcardApplied,
            ProductOfferType offerType) {

        this.regularUnitPrice = regularUnitPrice;
        this.unitPrice = unitPrice;
        this.pointsPerUnit = pointsPerUnit;
        this.quantity = quantity;
        this.emcardApplied = emcardApplied;
        this.offerType = offerType;
    }


    public BigDecimal getRegularUnitPrice() {
        return regularUnitPrice;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public int getPointsPerUnit() {
        return pointsPerUnit;
    }

    public int getQuantity() {
        return quantity;
    }

    public boolean isEmcardApplied() {
        return emcardApplied;
    }

    public ProductOfferType getOfferType() {
        return offerType;
    }


    /** unitPrice x quantity - the cash this line contributes. */
    public BigDecimal getLineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    /** regularUnitPrice x quantity - what this line would have cost without eMCard. */
    public BigDecimal getRegularLineTotal() {
        return regularUnitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    /**
     * Points this line redeems in total.
     *
     * Scales with quantity, exactly like getLineTotal() does. Before
     * this class existed, the cash side scaled but the points side
     * did not - so buying 3 units of a 40-point item redeemed 40
     * points and handed over all 3 units free.
     */
    public int getPointsRedeemed() {
        return pointsPerUnit * quantity;
    }

    /** regularLineTotal - lineTotal, i.e. the cash saved on this line. */
    public BigDecimal getLineSavings() {
        return getRegularLineTotal().subtract(getLineTotal());
    }
}
