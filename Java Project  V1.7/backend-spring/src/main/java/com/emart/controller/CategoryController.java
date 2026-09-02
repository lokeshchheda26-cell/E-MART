package com.emart.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.emart.entity.Category;
import com.emart.service.CategoryService;

@RestController
@RequestMapping("/api/category")
@CrossOrigin("*")
public class CategoryController 
{
	@Autowired
    private CategoryService service;
	
	// Create Category
    @PostMapping
    public Category saveCategory(@RequestBody Category category) 
    {
        return service.save(category);
    }
    
 // Get All Categories
    @GetMapping
    public List<Category> getAllCategories() 
    {
        return service.getAll();
    }
    
 // Get Category By Id
    @GetMapping("/{id}")
    public Category getCategoryById(@PathVariable Integer id) 
    {
        return service.getById(id);
    }
    
 // Update Category
    @PutMapping("/{id}")
    public Category updateCategory(@PathVariable Integer id,@RequestBody Category category) 
    {
        return service.update(id, category);
    }
    
 // Delete Category
    @DeleteMapping("/{id}")
    public String deleteCategory(@PathVariable Integer id) 
    {
        service.delete(id);
        return "Category Deleted Successfully";
    }
}
