package com.emart.config;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import com.emart.auth.security.CustomUserDetails;
import com.emart.controller.ProductController;
import com.emart.dto.ProductDetailsResponseDTO;
import com.emart.entity.Product;
import com.emart.entity.ProductDisplayType;
import com.emart.entity.ProductOfferType;
import com.emart.service.purchase.PurchaseMode;
import com.emart.util.ProductVisibility;

/**
 * Applies BUSINESS CONDITION 1 to every product response, in one
 * place.
 *
 * A customer who is not an eMCard holder (including a guest) must
 * see the MRP and nothing else - no eMCard price, no point offer, no
 * redemption offer. ProductController has eight read endpoints
 * returning products; rather than thread a "is this viewer a member"
 * parameter through all eight method signatures, all eight services
 * and back again, the rule is enforced once here, on the way out.
 *
 * Why not just hide it in React: the values would still be sent over
 * the wire and be trivially visible in devtools or via curl. The
 * frontend gating is still done (so nothing renders), but THIS is
 * what makes it authoritative.
 *
 * Scoped strictly to ProductController so nothing else in the app is
 * affected.
 */
@RestControllerAdvice(assignableTypes = ProductController.class)
public class ProductVisibilityAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(
            MethodParameter returnType,
            Class<? extends HttpMessageConverter<?>> converterType) {

        return true;
    }


    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> converterType,
            ServerHttpRequest request,
            ServerHttpResponse response) {

        // Admins manage the catalogue - they must always see the real
        // offer columns, otherwise editing a product through the admin
        // screens would read back a flattened copy of it.
        if (body == null || isAdmin() || isEmcardMember()) {
            return body;
        }

        if (body instanceof Product product) {
            return ProductVisibility.forViewer(product, false);
        }

        if (body instanceof ProductDetailsResponseDTO details) {
            return stripDetails(details);
        }

        if (body instanceof List<?> list && !list.isEmpty()
                && list.get(0) instanceof Product) {

            List<Product> gated = new ArrayList<>(list.size());
            for (Object item : list) {
                gated.add(ProductVisibility.forViewer((Product) item, false));
            }
            return gated;
        }

        return body;
    }


    /**
     * True only for a signed-in eMCard holder. Guests have no
     * authentication (or the anonymous one), and ordinary registered
     * members have the flag set to false - both get the MRP-only view.
     */
    private boolean isEmcardMember() {

        CustomUserDetails userDetails = currentUser();

        return userDetails != null
                && userDetails.getUser() != null
                && Boolean.TRUE.equals(userDetails.getUser().getIsEmcardMember());
    }


    private boolean isAdmin() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        return authentication != null
                && authentication.getAuthorities().stream()
                        .anyMatch(granted ->
                                "ROLE_ADMIN".equals(granted.getAuthority()));
    }


    private CustomUserDetails currentUser() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            return null;
        }

        return userDetails;
    }


    private ProductDetailsResponseDTO stripDetails(ProductDetailsResponseDTO details) {

        // price/mrpPrice stay - those are the regular price, which
        // everyone is entitled to see. Only the eMCard offer goes.
        details.setCardholderPrice(details.getMrpPrice());
        details.setPoints(0);
        details.setOfferType(ProductOfferType.NORMAL.name());
        details.setDisplayType(ProductDisplayType.MRP_ONLY.name());

        // The purchase mode a non-member is subject to IS cash-only
        // (Condition 1), so it is reported as such - together with the
        // mode-driven figures collapsed, otherwise a guest could read
        // the eMCard price or point cost straight out of the JSON.
        details.setPurchaseMode(PurchaseMode.CASH_ONLY.name());
        details.setPurchaseModeLabel(PurchaseMode.CASH_ONLY.getLabel());
        details.setPurchaseModeNumber(PurchaseMode.CASH_ONLY.getModeNumber());
        details.setEmcardCashPrice(BigDecimal.ZERO);
        details.setPointsRequired(0);
        details.setEmcardSavings(BigDecimal.ZERO);
        details.setPointsOptional(false);
        details.setEarnsPoints(true);
        // Condition 1: "no Loyalty Points" for a normal customer - they
        // hold no card, so nothing is earned and no rate is quoted.
        details.setEarnRatePercent(null);

        return details;
    }
}
