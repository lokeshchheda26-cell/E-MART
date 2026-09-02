package com.emart.serviceimpl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.emart.entity.Category;
import com.emart.repository.CategoryRepository;
import com.emart.service.CategoryService;

@Service
public class CategoryServiceImpl implements CategoryService {

    @Autowired
    CategoryRepository repository;
    // CREATE
    @Override
    public Category save(Category category) 
    {

        return repository.save(category);

    }
    // GET ALL
    @Override
    public List<Category> getAll() 
    {

        return repository.findAll();

    }
    // GET BY ID
    @Override
    public Category getById(Integer id) 
    {

        return repository.findById(id).orElse(null);

    }
    // UPDATE
    @Override
    public Category update(Integer id,Category category) {

        Category oldCategory =repository.findById(id).orElse(null);

        if (oldCategory != null) 
        {
        	oldCategory.setCatId(category.getCatId() );

            oldCategory.setSubcatId(category.getSubcatId());

            oldCategory.setCatName( category.getCatName());

            oldCategory.setCatImagePath( category.getCatImagePath() );

            oldCategory.setFlag(category.getFlag() );

            return repository.save(oldCategory);
        }

        return null;
    }
    // DELETE
    @Override
    public void delete(Integer id) 
    {

        repository.deleteById(id);

    }
    // GET BY CAT ID
    @Override
    public List<Category> getByCatId(String catId) 
    {

        return repository.findByCatId(catId);

    }

}