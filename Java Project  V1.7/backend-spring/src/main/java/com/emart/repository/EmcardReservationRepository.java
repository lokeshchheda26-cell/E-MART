package com.emart.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.emart.entity.EmcardReservation;

@Repository
public interface EmcardReservationRepository
        extends JpaRepository<EmcardReservation, Long> {

    List<EmcardReservation> findByUserId(Long userId);

    Optional<EmcardReservation> findByUserIdAndProductId(
            Long userId, Long productId);

    /**
     * Sum of points currently held for this user across every
     * EMCard-selected product. Returns 0 (never null) when the
     * user has nothing reserved.
     */
    @Query(
        "select coalesce(sum(r.pointsReserved), 0) "
            + "from EmcardReservation r where r.userId = :userId"
    )
    Integer sumReservedPointsByUserId(@Param("userId") Long userId);

    void deleteByUserIdAndProductId(Long userId, Long productId);

    @Modifying
    @Query("delete from EmcardReservation r where r.userId = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
