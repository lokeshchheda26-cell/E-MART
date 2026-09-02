package com.emart.util;

import java.util.List;

import com.emart.entity.Product;
import com.emart.entity.ProductDisplayType;
import com.emart.entity.ProductOfferType;

/**
 * Enforces BUSINESS CONDITION 1 on the way out of the API.
 *
 * "Normal Customer (NOT an eMCard holder). Product page should
 *  display ONLY MRP Price. No eMCard Price, no Redemption Offer,
 *  no Point Offer, no Loyalty Points."
 *
 * Until now the product endpoints returned cardholderPrice and
 * pointsToBeRedeemed to everyone - guests included - and the React
 * product card rendered the eMCard row for them. Hiding it in the
 * browser alone is not enough: the numbers still travel over the
 * wire and are visible in devtools or a direct curl. So the gate
 * lives here, server-side, and the frontend simply renders whatever
 * it is given.
 *
 * IMPORTANT - why this COPIES rather than mutating:
 * a Product returned by a repository may still be a MANAGED entity
 * (spring.jpa.open-in-view is on by default), so nulling fields on
 * it would be picked up by Hibernate's dirty checking and flushed
 * back to product_master - silently destroying real pricing data
 * just because a guest browsed the catalogue. Every gated result is
 * therefore a brand-new, unmanaged instance.
 */
public final class ProductVisibility {

    private ProductVisibility() {
    }


    /**
     * @param isEmcardMember true only for a signed-in eMCard holder.
     *                       Guests and ordinary registered members
     *                       both get the MRP-only view.
     */
    public static Product forViewer(Product product, boolean isEmcardMember) {

        if (product == null) {
            return null;
        }

        if (isEmcardMember) {
            return product;
        }

        return stripEmcardOffer(product);
    }


    public static List<Product> forViewer(
            List<Product> products, boolean isEmcardMember) {

        if (products == null) {
            return List.of();
        }

        if (isEmcardMember) {
            return products;
        }

        return products.stream()
                .map(ProductVisibility::stripEmcardOffer)
                .toList();
    }


    /**
     * Detached copy showing the regular price only.
     *
     * cardholderPrice is set EQUAL to mrpPrice rather than null: the
     * field is non-null in the entity/DB contract, and several
     * existing consumers (admin screens, older frontend code) read it
     * unguarded. Equal prices mean "no discount", which is exactly
     * what a non-member should see, and it leaks no offer.
     */
    private static Product stripEmcardOffer(Product source) {

        Product view = new Product();

        view.setProductId(source.getProductId());
        view.setCategory(source.getCategory());
        view.setSubCategory(source.getSubCategory());
        view.setProductName(source.getProductName());
        view.setShortDescription(source.getShortDescription());
        view.setLongDescription(source.getLongDescription());
        view.setProductImagePath(source.getProductImagePath());
        view.setBrand(source.getBrand());
        view.setStock(source.getStock());
        view.setStatus(source.getStatus());
        view.setCreatedAt(source.getCreatedAt());
        view.setUpdatedAt(source.getUpdatedAt());

        // Sale pricing is a public promotion, not an eMCard benefit -
        // everyone sees it.
        view.setOnSale(source.getOnSale());
        view.setSalePrice(source.getSalePrice());
        view.setSaleEndDate(source.getSaleEndDate());

        view.setMrpPrice(source.getMrpPrice());

        // ---- the eMCard offer, removed ----
        view.setCardholderPrice(source.getMrpPrice());
        view.setPointsToBeRedeemed(0);
        view.setPointsRequired(0);
        view.setCashRequired(source.getMrpPrice());
        view.setOfferType(ProductOfferType.NORMAL);
        view.setDisplayType(ProductDisplayType.MRP_ONLY);

        return view;
    }
}
