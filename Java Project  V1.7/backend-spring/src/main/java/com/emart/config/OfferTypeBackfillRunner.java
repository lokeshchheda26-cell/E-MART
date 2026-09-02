package com.emart.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.emart.entity.Product;
import com.emart.repository.ProductRepository;

/**
 * One-time startup migration for the loyalty offer columns.
 *
 * When offer_type / points_required / cash_required / display_type
 * were added to product_master via Hibernate's ddl-auto=update, every
 * pre-existing row got NULL. Those rows still describe a perfectly
 * valid offer - it is just encoded implicitly in the old
 * (mrp_price, cardholder_price, points_to_be_redeemed) trio.
 *
 * This runner classifies each such row and writes the explicit
 * values, so the catalogue behaves identically to before the columns
 * existed, and PricingEngine can read one field instead of
 * re-deriving the rule.
 *
 * Idempotent and self-limiting: it only touches rows whose offer_type
 * is still NULL, so a second startup does nothing. Once every row has
 * been classified this class can be deleted - unlike the stock
 * backfill it will never "revive" anything, because a product that is
 * legitimately set to NORMAL is not NULL.
 *
 * (The equivalent one-shot SQL is in
 *  src/main/resources/db/loyalty-offer-migration.sql for anyone who
 *  prefers to run it by hand.)
 */
@Component
public class OfferTypeBackfillRunner implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(OfferTypeBackfillRunner.class);

    private final ProductRepository productRepository;


    public OfferTypeBackfillRunner(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }


    @Override
    public void run(ApplicationArguments args) {

        List<Product> unclassified =
                productRepository.findAll()
                        .stream()
                        .filter(product -> product.getOfferType() == null)
                        .toList();

        if (unclassified.isEmpty()) {
            return;
        }

        // Saving is enough: Product#normaliseOffer (@PreUpdate) does
        // the classification and keeps the legacy columns in step, so
        // the rule lives in exactly one place rather than being
        // repeated here.
        productRepository.saveAll(unclassified);

        log.info(
            "OfferTypeBackfillRunner: classified the eMCard offer on {} "
                + "product(s) that predate the offer_type column.",
            unclassified.size()
        );
    }
}
