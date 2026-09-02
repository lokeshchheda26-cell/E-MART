package com.emart.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emart.entity.Orders;

@Repository
public interface OrdersRepository extends JpaRepository<Orders, Long> {

    List<Orders> findByUserIdOrderByOrderDateDesc(Long userId);

    Optional<Orders> findByOrderIdAndUserId(Long orderId, Long userId);
}
