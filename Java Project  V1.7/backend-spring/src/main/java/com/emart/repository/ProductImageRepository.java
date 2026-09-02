package com.emart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.emart.entity.ProductImage;

public interface ProductImageRepository
        extends JpaRepository<ProductImage, Long> {

    // Fetch all images belonging to a product, ordered by
    // Image_Id so the first uploaded image acts as the
    // "main" image on the Product Details page.
    List<ProductImage>
    findByProduct_ProductIdOrderByImageIdAsc(
            Long productId
    );
}
