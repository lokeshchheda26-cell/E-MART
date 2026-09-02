package com.emart.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

@Entity
@Table(name = "subcategory_master")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SubCategory 
{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer subcatMasterId;

    private String subcatId;

    private String subcatName;

    private String subcatImagePath;

    private Boolean flag;


    @ManyToOne
    @JoinColumn(name = "catmaster_id")
    private Category category;


    public Integer getSubcatMasterId() 
    {
        return subcatMasterId;
    }

    public void setSubcatMasterId(Integer subcatMasterId) 
    {
        this.subcatMasterId = subcatMasterId;
    }


    public String getSubcatId() 
    {
        return subcatId;
    }

    public void setSubcatId(String subcatId) 
    {
        this.subcatId = subcatId;
    }


    public String getSubcatName() 
    {
        return subcatName;
    }

    public void setSubcatName(String subcatName) 
    {
        this.subcatName = subcatName;
    }


    public String getSubcatImagePath() 
    {
        return subcatImagePath;
    }

    public void setSubcatImagePath(String subcatImagePath)
    {
        this.subcatImagePath = subcatImagePath;
    }


    public Boolean getFlag()
    {
        return flag;
    }

    public void setFlag(Boolean flag) 
    {
        this.flag = flag;
    }


    public Category getCategory() 
    {
        return category;
    }

    public void setCategory(Category category) 
    {
        this.category = category;
    }
}