package com.emart.config;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
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
 * Startup demo/dev convenience for the homepage Sale Banner, same
 * pattern as {@link StockBackfillRunner} / {@link BrandBackfillRunner}.
 *
 * The banner (GET /api/product/sale-random) only ever returns a product
 * where onSale = true and saleEndDate is still in the future - on a
 * fresh database (or once every sale has expired) that set is empty and
 * the banner stays hidden with no way to see it working. If there is no
 * active sale, this puts one on a few products.
 *
 * NO RANDOM OR HARDCODED MONEY
 * ----------------------------
 * This class used to invent the discount with {@code java.util.Random}
 * between two hardcoded percentages, and pick the products with
 * {@code Collections.shuffle} - so the price a customer saw depended on
 * a coin flip at boot and nobody could reproduce it. Everything is now
 * CONFIGURATION:
 *
 *   emart.sale.bootstrap.enabled          on/off (default on)
 *   emart.sale.bootstrap.product-count    how many products
 *   emart.sale.bootstrap.discount-percent the single discount applied
 *   emart.sale.bootstrap.duration-hours   how long the sale runs
 *
 * and the products are chosen deterministically (lowest product id
 * first), so two environments given the same properties end up with the
 * same sale prices.
 *
 * Set emart.sale.bootstrap.enabled=false and manage sales through the
 * product create/update API for a real deployment.
 */
@Component
public class SaleBackfillRunner implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(SaleBackfillRunner.class);

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    @Value("${emart.sale.bootstrap.enabled:true}")
    private boolean enabled;

    @Value("${emart.sale.bootstrap.product-count:3}")
    private int productCount;

    @Value("${emart.sale.bootstrap.discount-percent:25}")
    private int discountPercent;

    @Value("${emart.sale.bootstrap.duration-hours:48}")
    private long durationHours;

    private final ProductRepository productRepository;


    public SaleBackfillRunner(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }


    @Override
    public void run(ApplicationArguments args) {

        if (!enabled || productCount <= 0) {
            return;
        }

        // A configured discount outside 1..99 would produce a free or a
        // more-expensive "sale" - refuse rather than write it.
        if (discountPercent <= 0 || discountPercent >= 100) {
            log.warn(
                "SaleBackfillRunner: emart.sale.bootstrap.discount-percent={} "
                    + "is not between 1 and 99 - skipping the demo sale.",
                discountPercent
            );
            return;
        }

        // Already have a live sale running - nothing to do.
        if (productRepository.findRandomActiveSaleProduct().isPresent()) {
            return;
        }

        List<Product> candidates = productRepository
                .findAll()
                .stream()
                .filter(p ->
                        Boolean.TRUE.equals(p.getStatus())
                                && p.getStock() != null
                                && p.getStock() > 0
                                && p.getMrpPrice() != null)
                // Deterministic order: same database + same config =>
                // same products on sale at the same price.
                .sorted(Comparator.comparing(Product::getProductId))
                .limit(productCount)
                .toList();

        if (candidates.isEmpty()) {
            return;
        }

        LocalDateTime saleEndDate = LocalDateTime.now().plusHours(durationHours);

        BigDecimal multiplier = BigDecimal
                .valueOf(100L - discountPercent)
                .divide(ONE_HUNDRED);

        for (Product product : candidates) {

            // Whole-number sale price, no charm-pricing decimals: the
            // listing page, Product Details and the cart all show plain
            // rounded amounts and they have to agree.
            BigDecimal salePrice = product.getMrpPrice()
                    .multiply(multiplier)
                    .setScale(0, RoundingMode.HALF_UP);

            product.setOnSale(Boolean.TRUE);
            product.setSalePrice(salePrice);
            product.setSaleEndDate(saleEndDate);
        }

        productRepository.saveAll(candidates);

        log.info(
            "SaleBackfillRunner: started a {}% demo sale on {} product(s), "
                + "ending {}.",
            discountPercent,
            candidates.size(),
            saleEndDate
        );
    }
}
