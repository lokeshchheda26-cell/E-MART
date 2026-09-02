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
 * One-time startup migration.
 *
 * When the "stock" column was added to Product_Master via
 * Hibernate's ddl-auto=update, MySQL back-filled every
 * existing row with 0 (its implicit default for a NOT NULL
 * numeric column with no explicit default). That made every
 * pre-existing product look "Out of Stock" even though stock
 * was never actually being tracked before this feature.
 *
 * This runner sets a sensible default (STOCK_BACKFILL_QTY)
 * on any product still sitting at 0, so existing catalog data
 * is usable immediately after upgrading, without needing to
 * run a manual SQL UPDATE.
 *
 * IMPORTANT: this is a one-time bootstrap convenience for
 * this migration, not an inventory management feature. Once
 * you start managing real stock quantities (e.g. through the
 * update-product API or an admin screen), you should delete
 * this class - otherwise it will keep "reviving" any product
 * that legitimately drops back down to 0 units on every
 * application restart.
 */
@Component
public class StockBackfillRunner implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(StockBackfillRunner.class);

    private static final int STOCK_BACKFILL_QTY = 100;

    private final ProductRepository productRepository;


    public StockBackfillRunner(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }


    @Override
    public void run(ApplicationArguments args) {

        List<Product> productsWithZeroStock =
                productRepository.findAll()
                        .stream()
                        .filter(product ->
                                product.getStock() == null
                                        || product.getStock() == 0)
                        .toList();

        if (productsWithZeroStock.isEmpty()) {
            return;
        }

        productsWithZeroStock.forEach(product ->
                product.setStock(STOCK_BACKFILL_QTY)
        );

        productRepository.saveAll(productsWithZeroStock);

        log.info(
            "StockBackfillRunner: set stock={} on {} product(s) "
                + "that had no real stock value yet.",
            STOCK_BACKFILL_QTY,
            productsWithZeroStock.size()
        );
    }
}
