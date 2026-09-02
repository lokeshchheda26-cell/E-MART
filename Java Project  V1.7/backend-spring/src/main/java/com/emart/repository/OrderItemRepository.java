package com.emart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.emart.entity.OrderItem;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrder_OrderId(Long orderId);

    // Sum of points redeemed (across every past order) for a single
    // product, used to show "Points redeemed so far" on the Product
    // Details page. COALESCE keeps this 0 (not null) when the
    // product has never had points redeemed against it.
    @Query("SELECT COALESCE(SUM(oi.pointsRedeemed), 0) FROM OrderItem oi "
            + "WHERE oi.product.productId = :productId")
    Integer sumPointsRedeemedByProductId(@Param("productId") Long productId);
}
