package com.emart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class EmartCategoryMasterApplication 
{
	public static void main(String[] args)
	{
		SpringApplication.run(EmartCategoryMasterApplication.class, args);
	}
}