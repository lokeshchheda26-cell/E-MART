package com.emart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.emart.dto.ProductSpecificationDTO;
import com.emart.entity.ProductSpecification;

public interface ProductSpecificationRepository
        extends JpaRepository<ProductSpecification, Long> {

    // JOIN Prod_Dtl_Master with Config_Master so we get the
    // human-readable config name (e.g. "RAM") alongside the
    // value (e.g. "8 GB") in a single query, projected
    // straight into the DTO.
    @Query(
        "SELECT new com.emart.dto.ProductSpecificationDTO(" +
        "   ps.config.configName, ps.configValue) " +
        "FROM ProductSpecification ps " +
        "WHERE ps.product.productId = :productId " +
        "ORDER BY ps.config.configId ASC"
    )
    List<ProductSpecificationDTO> findSpecificationsByProductId(
            @Param("productId") Long productId
    );
}
