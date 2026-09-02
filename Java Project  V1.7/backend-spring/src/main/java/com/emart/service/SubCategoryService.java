package com.emart.service;

import java.util.List;

import com.emart.entity.SubCategory;

public interface SubCategoryService {

    SubCategory save(SubCategory subCategory);

    List<SubCategory> getAll();

    SubCategory getById(Integer id);

    List<SubCategory> getByCategoryId(
            Integer catmasterId
    );

    SubCategory update(
            Integer id,
            SubCategory subCategory
    );

    void delete(Integer id);
}