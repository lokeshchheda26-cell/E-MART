package com.emart.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.emart.entity.Config;

public interface ConfigRepository
        extends JpaRepository<Config, Integer> {
}
