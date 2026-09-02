package com.emart.config;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.emart.entity.Product;
import com.emart.repository.ProductRepository;

/**
 * One-time startup migration, same pattern as StockBackfillRunner /
 * BrandBackfillRunner / SaleBackfillRunner.
 *
 * Existing catalog data used "charm pricing" - amounts like 2999,
 * 2499, or 24.99 that sit just under a round number to create a
 * false discount feel. The product listing page spec calls for
 * plain, clean round numbers instead (e.g. 3000, 2500), and
 * requires the change to happen at the DATABASE level - the stored
 * mrpPrice/cardholderPrice fields themselves, not just how they're
 * displayed on the frontend.
 *
 * On every startup, this rounds any mrpPrice/cardholderPrice that
 * isn't already a "clean" number (see roundToClean below) to the
 * nearest clean value, and persists it. Already-clean values are
 * left untouched, so this becomes a no-op once every row has been
 * cleaned up once.
 *
 * IMPORTANT: like its siblings, this is a one-time bootstrap
 * convenience for this migration, not a real pricing-policy engine.
 * Once products are exclusively created/edited through the
 * create/update product API (which should just be given clean
 * values to begin with), you can delete this class.
 */
@Component
public class PriceRoundingBackfillRunner implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(PriceRoundingBackfillRunner.class);

    /**
     * OFF by default now.
     *
     * This runner REWRITES stored prices from a rounding policy that is
     * hardcoded in this class - which is exactly the kind of invented
     * money value that should not run behind the business's back on
     * every boot. The one-time migration it existed for has already
     * happened, so it now only runs when explicitly asked for:
     *
     *   emart.bootstrap.price-rounding.enabled=true
     */
    @Value("${emart.bootstrap.price-rounding.enabled:false}")
    private boolean enabled;

    private final ProductRepository productRepository;

    public PriceRoundingBackfillRunner(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(ApplicationArguments args) {

        if (!enabled) {
            return;
        }

        List<Product> products = productRepository.findAll();
        List<Product> changed = new ArrayList<>();

        for (Product product : products) {

            boolean touched = false;

            BigDecimal cleanMrp = roundToClean(product.getMrpPrice());
            if (cleanMrp != null
                    && cleanMrp.compareTo(nvl(product.getMrpPrice())) != 0) {
                product.setMrpPrice(cleanMrp);
                touched = true;
            }

            BigDecimal cleanCardholder = roundToClean(product.getCardholderPrice());
            if (cleanCardholder != null
                    && cleanCardholder.compareTo(nvl(product.getCardholderPrice())) != 0) {
                product.setCardholderPrice(cleanCardholder);
                touched = true;
            }

            if (touched) {
                changed.add(product);
            }
        }

        if (changed.isEmpty()) {
            return;
        }

        productRepository.saveAll(changed);

        log.info(
            "PriceRoundingBackfillRunner: replaced charm pricing with "
                + "clean round numbers on {} product(s).",
            changed.size()
        );
    }

    /**
     * Rounds a "charm" price to a clean round number, using a
     * rounding unit that scales with magnitude so both small and
     * large prices land on a sensible value (2999 -> 3000,
     * 2499 -> 2500, 24.99 -> 20):
     *   >= 10,000  -> nearest 500
     *   >= 1,000   -> nearest 100
     *   >= 100     -> nearest 50
     *   < 100      -> nearest 10
     * Never rounds down to zero for a positive input.
     */
    private static BigDecimal roundToClean(BigDecimal value) {

        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            return value;
        }

        BigDecimal unit;
        if (value.compareTo(BigDecimal.valueOf(10_000)) >= 0) {
            unit = BigDecimal.valueOf(500);
        } else if (value.compareTo(BigDecimal.valueOf(1_000)) >= 0) {
            unit = BigDecimal.valueOf(100);
        } else if (value.compareTo(BigDecimal.valueOf(100)) >= 0) {
            unit = BigDecimal.valueOf(50);
        } else {
            unit = BigDecimal.valueOf(10);
        }

        BigDecimal rounded = value
                .divide(unit, 0, RoundingMode.HALF_UP)
                .multiply(unit);

        return rounded.compareTo(BigDecimal.ZERO) == 0 ? unit : rounded;
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
