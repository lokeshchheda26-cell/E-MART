package com.emart.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.emart.entity.Product;
import com.emart.repository.ProductRepository;

/**
 * One-time startup migration, same pattern as {@link StockBackfillRunner}.
 *
 * The "brand" column exists on Product_Master but was never populated -
 * every existing product has brand = NULL. That makes the "filter by
 * brand" requirement (BRD - Category/Item List page filters; also the
 * Category -> Brand -> Product navigation) unusable against real data.
 *
 * This runner assigns a brand to any product that still has a blank
 * brand, matched by a keyword found in the product's own name (so it
 * stays correct even if new products are added later, as long as their
 * name mentions a known brand keyword). Products that don't match any
 * keyword are left alone rather than guessed at.
 *
 * IMPORTANT: like StockBackfillRunner, this is a one-time bootstrap
 * convenience for existing data - once brand is set through the
 * product create/update API (or an Excel upload), this runner has
 * nothing left to do and can eventually be deleted.
 */
@Component
public class BrandBackfillRunner implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(BrandBackfillRunner.class);

    // Ordered so more specific keywords (e.g. "iphone") are checked
    // before more generic ones - avoids a generic keyword accidentally
    // matching first.
    private static final Map<String, String> BRAND_KEYWORDS = new LinkedHashMap<>();

    static {
        BRAND_KEYWORDS.put("iphone", "Apple");
        BRAND_KEYWORDS.put("samsung", "Samsung");
        BRAND_KEYWORDS.put("sony", "Sony");
        BRAND_KEYWORDS.put("canon", "Canon");
        BRAND_KEYWORDS.put("nikon", "Nikon");
        BRAND_KEYWORDS.put("daawat", "Daawat");
        BRAND_KEYWORDS.put("india gate", "India Gate");
        BRAND_KEYWORDS.put("moong dal", "Tata Sampann");
        BRAND_KEYWORDS.put("toor dal", "Tata Sampann");
        BRAND_KEYWORDS.put("chilli powder", "Everest");
        BRAND_KEYWORDS.put("turmeric powder", "Everest");
        BRAND_KEYWORDS.put("black tea", "Tata Tea");
        BRAND_KEYWORDS.put("coconut water", "Paper Boat");
        BRAND_KEYWORDS.put("coffee", "Nescafe");
        BRAND_KEYWORDS.put("energy drink", "Red Bull");
        BRAND_KEYWORDS.put("real go", "Real");
        BRAND_KEYWORDS.put("real-go", "Real");
    }


    private final ProductRepository productRepository;


    public BrandBackfillRunner(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }


    @Override
    public void run(ApplicationArguments args) {

        List<Product> productsMissingBrand =
                productRepository.findAll()
                        .stream()
                        .filter(product ->
                                product.getBrand() == null
                                        || product.getBrand().isBlank())
                        .toList();

        if (productsMissingBrand.isEmpty()) {
            return;
        }

        int updated = 0;

        for (Product product : productsMissingBrand) {

            String name = product.getProductName() == null
                    ? ""
                    : product.getProductName().toLowerCase();

            for (Map.Entry<String, String> entry : BRAND_KEYWORDS.entrySet()) {
                if (name.contains(entry.getKey())) {
                    product.setBrand(entry.getValue());
                    updated++;
                    break;
                }
            }
        }

        if (updated > 0) {
            productRepository.saveAll(productsMissingBrand);
        }

        log.info(
            "BrandBackfillRunner: assigned a brand to {} of {} product(s) "
                + "that had no brand value yet.",
            updated,
            productsMissingBrand.size()
        );
    }
}
