package com.emart.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.emart.entity.SubCategory;
import com.emart.service.SubCategoryService;

@RestController
@RequestMapping("/api/subcategory")
@CrossOrigin("*")
public class SubCategoryController {

    @Autowired
    private SubCategoryService service;


    @PostMapping
    public SubCategory save(
            @RequestBody SubCategory subCategory) {

        return service.save(subCategory);
    }


    @GetMapping
    public List<SubCategory> getAll() {

        return service.getAll();
    }


    @GetMapping("/{id}")
    public SubCategory getById(
            @PathVariable Integer id) {

        return service.getById(id);
    }


    @GetMapping("/category/{catmasterId}")
    public List<SubCategory> getByCategoryId(
            @PathVariable Integer catmasterId) {

        return service.getByCategoryId(
                catmasterId
        );
    }


    @PutMapping("/{id}")
    public SubCategory update(
            @PathVariable Integer id,
            @RequestBody SubCategory subCategory) {

        return service.update(
                id,
                subCategory
        );
    }


    @DeleteMapping("/{id}")
    public String delete(
            @PathVariable Integer id) {

        service.delete(id);

        return "SubCategory Deleted Successfully";
    }
}