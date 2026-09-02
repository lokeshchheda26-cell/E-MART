package com.emart.serviceimpl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.emart.entity.SubCategory;
import com.emart.repository.SubCategoryRepository;
import com.emart.service.SubCategoryService;

@Service
public class SubCategoryServiceImpl
        implements SubCategoryService {

    @Autowired
    private SubCategoryRepository repository;


    @Override
    public SubCategory save(
            SubCategory subCategory) {

        return repository.save(subCategory);
    }


    @Override
    public List<SubCategory> getAll() {

        return repository.findAll();
    }


    @Override
    public SubCategory getById(
            Integer id) {

        return repository
                .findById(id)
                .orElse(null);
    }


    @Override
    public List<SubCategory> getByCategoryId(
            Integer catmasterId) {

        return repository
                .findByCategory_CatmasterId(
                        catmasterId
                );
    }


    @Override
    public SubCategory update(
            Integer id,
            SubCategory subCategory) {

        SubCategory old =
                repository
                    .findById(id)
                    .orElse(null);

        if (old != null) {

            old.setSubcatId(
                    subCategory.getSubcatId()
            );

            old.setSubcatName(
                    subCategory.getSubcatName()
            );

            old.setSubcatImagePath(
                    subCategory
                        .getSubcatImagePath()
            );

            old.setFlag(
                    subCategory.getFlag()
            );

            old.setCategory(
                    subCategory.getCategory()
            );

            return repository.save(old);
        }

        return null;
    }


    @Override
    public void delete(Integer id) {

        repository.deleteById(id);
    }
}