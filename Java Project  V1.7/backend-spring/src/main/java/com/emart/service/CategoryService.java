package com.emart.service;

import java.util.List;

import com.emart.entity.Category;

public interface CategoryService {

    Category save(Category category);

    List<Category> getAll();

    Category getById(Integer id);

    Category update(Integer id, Category category);

    void delete(Integer id);

    List<Category> getByCatId(String catId);
}