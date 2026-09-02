package com.emart.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emart.entity.CartItem;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByCart_CartId(Long cartId);

    Optional<CartItem> findByCart_CartIdAndProduct_ProductId(
            Long cartId,
            Long productId
    );

    Optional<CartItem> findByCartItemIdAndCart_CartId(
            Long cartItemId,
            Long cartId
    );

    void deleteByCart_CartId(Long cartId);
}
