package com.emart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.emart.entity.SubCategory;

public interface SubCategoryRepository
        extends JpaRepository<SubCategory, Integer> {

    List<SubCategory> findByCategory_CatmasterId(
            Integer catmasterId
    );
}