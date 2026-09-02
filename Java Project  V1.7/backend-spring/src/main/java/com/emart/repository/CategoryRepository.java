package com.emart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.emart.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Integer> 
{
    List<Category> findByCatId(String catId);
}