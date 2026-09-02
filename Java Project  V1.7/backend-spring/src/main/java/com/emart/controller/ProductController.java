package com.emart.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.emart.dto.ProductDetailsResponseDTO;
import com.emart.dto.ProductSaleResponseDTO;
import com.emart.entity.Product;
import com.emart.service.ProductService;

@RestController
@RequestMapping("/api/product")
@CrossOrigin("*")
public class ProductController {


    private final ProductService service;


    // =========================
    // CONSTRUCTOR INJECTION
    // =========================

    public ProductController(ProductService service) {
        this.service = service;
    }


    // =========================
    // GET PRODUCT DETAILS
    // (product + images + specifications)
    // GET
    // =========================

    @GetMapping("/{id}/details")
    public ResponseEntity<ProductDetailsResponseDTO>
    getProductDetails(
            @PathVariable Long id) {

        ProductDetailsResponseDTO details =
                service.getProductDetails(id);

        return ResponseEntity.ok(details);
    }


    // =========================
    // GET RANDOM ON-SALE PRODUCT
    // (homepage Sale Banner)
    // GET
    //
    // 200 + body when a product is currently on sale (onSale = true,
    // status = true, saleEndDate in the future); 204 No Content when
    // nothing qualifies right now, so the frontend can hide the
    // banner instead of treating it as an error.
    // =========================

    @GetMapping("/sale-random")
    public ResponseEntity<ProductSaleResponseDTO>
    getRandomSaleProduct() {

        return service
                .getRandomSaleProduct()
                .map(ResponseEntity::ok)
                .orElseGet(() ->
                        ResponseEntity
                                .noContent()
                                .build()
                );
    }


    // =========================
    // CREATE PRODUCT
    // POST
    // =========================

    @PostMapping
    public ResponseEntity<Product>
    saveProduct(
            @RequestBody Product product) {

        Product savedProduct =
                service.save(product);

        return ResponseEntity
                .ok(savedProduct);
    }


    // =========================
    // GET ALL PRODUCTS
    // GET
    // =========================

    @GetMapping
    public ResponseEntity<List<Product>>
    getAllProducts() {

        return ResponseEntity
                .ok(
                    service.getAll()
                );
    }


    // =========================
    // GET PRODUCT BY ID
    // GET
    // =========================

    @GetMapping("/{id}")
    public ResponseEntity<Product>
    getProductById(
            @PathVariable Long id) {


        Product product =
                service.getById(id);


        if (product == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }


        return ResponseEntity
                .ok(product);
    }


    // =========================
    // SEARCH PRODUCTS
    // (name, description, brand, category, subcategory -
    // case-insensitive, partial match)
    // GET /api/product/search?q=...
    // =========================

    @GetMapping("/search")
    public ResponseEntity<List<Product>>
    searchProducts(
            @RequestParam(name = "q", required = false, defaultValue = "")
            String q) {

        return ResponseEntity
                .ok(
                    service.search(q)
                );
    }


    // =========================
    // GET PRODUCTS BY
    // SUB CATEGORY
    // GET
    // =========================

    @GetMapping(
        "/subcategory/{subcatMasterId}"
    )
    public ResponseEntity<List<Product>>
    getProductsBySubCategory(
            @PathVariable Integer subcatMasterId) {


        return ResponseEntity
                .ok(
                    service
                        .getBySubCategoryId(
                            subcatMasterId
                        )
                );
    }


    // =========================
    // GET PRODUCTS BY
    // MAIN CATEGORY (active only)
    // GET
    // =========================

    @GetMapping(
        "/category/{catmasterId}"
    )
    public ResponseEntity<List<Product>>
    getProductsByCategory(
            @PathVariable Integer catmasterId) {


        return ResponseEntity
                .ok(
                    service
                        .getByCategoryId(
                            catmasterId
                        )
                );
    }


    // =========================
    // GET DISTINCT ACTIVE BRANDS
    // FOR A MAIN CATEGORY
    // GET
    // =========================

    @GetMapping(
        "/category/{catmasterId}/brands"
    )
    public ResponseEntity<List<String>>
    getBrandsByCategory(
            @PathVariable Integer catmasterId) {


        return ResponseEntity
                .ok(
                    service
                        .getBrandsByCategoryId(
                            catmasterId
                        )
                );
    }


    // =========================
    // GET PRODUCTS BY
    // MAIN CATEGORY + BRAND (active only)
    // GET
    // =========================

    @GetMapping(
        "/category/{catmasterId}/brand"
    )
    public ResponseEntity<List<Product>>
    getProductsByCategoryAndBrand(
            @PathVariable Integer catmasterId,
            @RequestParam String brand) {


        return ResponseEntity
                .ok(
                    service
                        .getByCategoryAndBrand(
                            catmasterId,
                            brand
                        )
                );
    }


    // =========================
    // GET DISTINCT ACTIVE BRANDS
    // FOR A MAIN-CATEGORY GROUP
    // (Category.catId code, e.g. "ELE" -
    // there is no separate main-category
    // table; catId is the real grouping key
    // shared by several Category rows)
    // GET
    // =========================

    @GetMapping(
        "/category-group/{catId}/brands"
    )
    public ResponseEntity<List<String>>
    getBrandsByCategoryCode(
            @PathVariable String catId) {


        return ResponseEntity
                .ok(
                    service
                        .getBrandsByCategoryCode(
                            catId
                        )
                );
    }


    // =========================
    // GET PRODUCTS BY
    // MAIN-CATEGORY GROUP CODE + BRAND
    // (active only)
    // GET
    // =========================

    @GetMapping(
        "/category-group/{catId}/brand"
    )
    public ResponseEntity<List<Product>>
    getProductsByCategoryCodeAndBrand(
            @PathVariable String catId,
            @RequestParam String brand) {


        return ResponseEntity
                .ok(
                    service
                        .getByCategoryCodeAndBrand(
                            catId,
                            brand
                        )
                );
    }


    // =========================
    // FILTER PRODUCTS BY MAIN-CATEGORY
    // GROUP + OPTIONAL BRAND + OPTIONAL
    // PRICE RANGE (active only)
    // GET /api/product/category-group/{catId}/filter?brand=&minPrice=&maxPrice=
    // =========================

    @GetMapping(
        "/category-group/{catId}/filter"
    )
    public ResponseEntity<List<Product>>
    filterProductsByCategoryGroup(
            @PathVariable String catId,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice) {


        return ResponseEntity
                .ok(
                    service
                        .filterByCategoryGroup(
                            catId,
                            brand,
                            minPrice,
                            maxPrice
                        )
                );
    }


    // =========================
    // UPDATE PRODUCT
    // PUT
    // =========================

    @PutMapping("/{id}")
    public ResponseEntity<Product>
    updateProduct(
            @PathVariable Long id,
            @RequestBody Product product) {


        Product updatedProduct =
                service.update(
                    id,
                    product
                );


        if (updatedProduct == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }


        return ResponseEntity
                .ok(updatedProduct);
    }


    // =========================
    // DELETE PRODUCT
    // DELETE
    // =========================

    @DeleteMapping("/{id}")
    public ResponseEntity<String>
    deleteProduct(
            @PathVariable Long id) {


        Product product =
                service.getById(id);


        if (product == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }


        service.delete(id);


        return ResponseEntity
                .ok(
                    "Product deleted successfully"
                );
    }
}