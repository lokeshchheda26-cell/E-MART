package com.emart.service;

import java.util.List;
import java.util.Optional;

import com.emart.dto.ProductDetailsResponseDTO;
import com.emart.dto.ProductSaleResponseDTO;
import com.emart.entity.Product;

public interface ProductService {

    // CREATE
    Product save(Product product);


    // GET PRODUCT DETAILS (images + specifications)
    ProductDetailsResponseDTO getProductDetails(
            Long productId
    );


    // GET ALL
    List<Product> getAll();


    // GET BY ID
    Product getById(Long id);


    // GET BY SUBCATEGORY
    List<Product> getBySubCategoryId(
            Integer subcatMasterId
    );


    // GET BY CATEGORY (active only)
    List<Product> getByCategoryId(
            Integer catmasterId
    );


    // GET DISTINCT ACTIVE BRANDS FOR A CATEGORY
    List<String> getBrandsByCategoryId(
            Integer catmasterId
    );


    // GET BY CATEGORY + BRAND (active only)
    List<Product> getByCategoryAndBrand(
            Integer catmasterId,
            String brand
    );


    // GET DISTINCT ACTIVE BRANDS FOR A MAIN-CATEGORY
    // GROUP (Category.catId code, e.g. "ELE")
    List<String> getBrandsByCategoryCode(
            String catId
    );


    // GET BY MAIN-CATEGORY GROUP CODE + BRAND (active only)
    List<Product> getByCategoryCodeAndBrand(
            String catId,
            String brand
    );


    // FILTER BY MAIN-CATEGORY GROUP + OPTIONAL BRAND + OPTIONAL
    // PRICE RANGE (active only)
    List<Product> filterByCategoryGroup(
            String catId,
            String brand,
            java.math.BigDecimal minPrice,
            java.math.BigDecimal maxPrice
    );


    // SEARCH (name, description, brand, category, subcategory)
    List<Product> search(String keyword);


    // UPDATE
    Product update(
            Long id,
            Product product
    );


    // DELETE
    void delete(Long id);


    // GET ONE RANDOM ACTIVE-SALE PRODUCT (homepage Sale Banner) -
    // empty Optional means "nothing on sale right now", which the
    // controller turns into a 204 so the banner can hide itself.
    Optional<ProductSaleResponseDTO> getRandomSaleProduct();
}