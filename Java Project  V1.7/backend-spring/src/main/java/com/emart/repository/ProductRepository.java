package com.emart.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.emart.entity.Product;

public interface ProductRepository
        extends JpaRepository<Product, Long> {

    List<Product>
    findBySubCategory_SubcatMasterId(
            Integer subcatMasterId
    );


    /**
     * All active products directly under a given main category
     * (Product.category, i.e. product_master.catmaster_id) -
     * powers the "click a category, see its products" listing.
     * Only status = true rows are returned, per the requirement
     * that inactive products never appear in a category listing.
     */
    List<Product>
    findByCategory_CatmasterIdAndStatusTrue(
            Integer catmasterId
    );


    /**
     * Distinct, non-blank brand names across the active products of
     * a single main category - powers the "Category -> Brand"
     * drill-down step. Sorted alphabetically so the brand list is
     * stable/predictable in the UI.
     */
    @Query(
        "select distinct p.brand from Product p " +
        "where p.category.catmasterId = :catId " +
        "and p.status = true " +
        "and p.brand is not null " +
        "and p.brand <> '' " +
        "order by p.brand"
    )
    List<String> findDistinctActiveBrandsByCategory(
            @Param("catId") Integer catId
    );


    /**
     * Active products that match both a main category and a brand
     * (case-insensitive, exact match - the brand values offered to
     * the frontend always come from findDistinctActiveBrandsByCategory
     * above, never free-typed) - powers the "Brand -> Products" step.
     */
    List<Product>
    findByCategory_CatmasterIdAndBrandIgnoreCaseAndStatusTrue(
            Integer catmasterId,
            String brand
    );


    /**
     * The database has no dedicated "main category" table - the
     * real main category is the group of Category rows that share
     * the same catId code (e.g. "ELE" covers the separate "I-phone",
     * "TVS", "SLR Camera"... Category rows). These two queries group
     * by that code instead of a single row's catmasterId, so "main
     * category -> brand -> product" works against the real grouping
     * key rather than one leaf category at a time.
     */
    @Query(
        "select distinct p.brand from Product p " +
        "where p.category.catId = :catId " +
        "and p.status = true " +
        "and p.brand is not null " +
        "and p.brand <> '' " +
        "order by p.brand"
    )
    List<String> findDistinctActiveBrandsByCategoryCode(
            @Param("catId") String catId
    );

    List<Product>
    findByCategory_CatIdAndBrandIgnoreCaseAndStatusTrue(
            String catId,
            String brand
    );


    /**
     * Combined brand + price-range filter within a main-category
     * group, per the BRD's "filter by brand and/or price range,
     * click Go" requirement on the Category/Item List pages. Every
     * filter is optional except the category itself - a null bind
     * value is a no-op in the corresponding OR clause, so any
     * combination (brand only, price only, both, or neither) works
     * from the same query.
     */
    @Query(
        "select p from Product p " +
        "where p.category.catId = :catId " +
        "and p.status = true " +
        "and (:brand is null or lower(p.brand) = lower(:brand)) " +
        "and (:minPrice is null or p.cardholderPrice >= :minPrice) " +
        "and (:maxPrice is null or p.cardholderPrice <= :maxPrice) " +
        "order by p.productName"
    )
    List<Product> filterByCategoryGroup(
            @Param("catId") String catId,
            @Param("brand") String brand,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice
    );


    /**
     * Case-insensitive, partial-match search across product name,
     * short/long description, brand, category name and subcategory
     * name.
     *
     * A single lower-cased ":keyword" bind parameter is reused for
     * every column instead of concatenating the keyword into the
     * query string, so this is not vulnerable to SQL injection and
     * lets the query plan be cached/reused across searches (only the
     * bind value changes, not the query shape).
     *
     * LEFT JOIN is used for category/subCategory so a product would
     * still match on its own fields even if (hypothetically) it had
     * no subcategory - subCategory is optional on Product.
     *
     * p.longDescription is @Lob (mapped to CLOB) - Hibernate 7's
     * function-argument validator rejects passing a CLOB straight
     * into lower(), so it's cast to string first. The other columns
     * are plain VARCHAR and don't need the cast.
     */
    @Query(
        "select distinct p from Product p " +
        "left join p.category c " +
        "left join p.subCategory sc " +
        "where p.status = true and (" +
        "  lower(p.productName) like %:keyword% " +
        "  or lower(p.shortDescription) like %:keyword% " +
        "  or lower(cast(p.longDescription as string)) like %:keyword% " +
        "  or lower(p.brand) like %:keyword% " +
        "  or lower(c.catName) like %:keyword% " +
        "  or lower(sc.subcatName) like %:keyword% " +
        ")"
    )
    List<Product> searchProducts(@Param("keyword") String keyword);


    /**
     * Homepage Sale Banner (WPT: "Sale Banner" component).
     *
     * Picks exactly one random, currently-active product whose sale is
     * still running - onSale = true, status = true (never surface an
     * inactive product) and saleEndDate strictly in the future. The
     * randomization happens at the DB level via MySQL's
     * ORDER BY RAND() LIMIT 1 rather than fetching every eligible row
     * and randomizing client-side, so the cost stays O(matching rows)
     * regardless of catalog size and no product list ever crosses the
     * wire just to throw most of it away.
     *
     * A native query is used (rather than JPQL) because JPQL has no
     * portable RAND()/LIMIT support - this is fine here since the app
     * is MySQL-only (see application.properties).
     */
    @Query(
        value =
            "select * from product_master " +
            "where on_sale = true " +
            "and status = true " +
            "and sale_end_date is not null " +
            "and sale_end_date > current_timestamp " +
            "order by rand() " +
            "limit 1",
        nativeQuery = true
    )
    Optional<Product> findRandomActiveSaleProduct();
}