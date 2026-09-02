package com.emart.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name="category_master")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Category 
{
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer catmasterId;

	private String catId;

    private String subcatId;

    private String catName;

    private String catImagePath;

    private Boolean flag;
    public Integer getCatmasterId() 
    {
		return catmasterId;
	}
	public void setCatmasterId(Integer catmasterId) 
	{
		this.catmasterId = catmasterId;
	}
	public String getCatId() 
	{
		return catId;
	}
	public void setCatId(String catId) 
	{
		this.catId = catId;
	}
	public String getSubcatId() 
	{
		return subcatId;
	}
	public void setSubcatId(String subcatId) 
	{
		this.subcatId = subcatId;
	}
	public String getCatName() 
	{
		return catName;
	}
	public void setCatName(String catName) 
	{
		this.catName = catName;
	}
	public String getCatImagePath() 
	{
		return catImagePath;
	}
	public void setCatImagePath(String catImagePath) 
	{
		this.catImagePath = catImagePath;
	}
	public Boolean getFlag() 
	{
		return flag;
	}
	public void setFlag(Boolean flag) 
	{
		this.flag = flag;
	}

	
}
