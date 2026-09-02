package com.emart.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import com.emart.entity.EmcardAccount;

@Repository
public interface EmcardAccountRepository
        extends JpaRepository<EmcardAccount, Long> {

    Optional<EmcardAccount> findByUserId(Long userId);

    /**
     * Locks the account row for the duration of the current
     * transaction (SELECT ... FOR UPDATE).
     *
     * This is the key piece that makes reserve/release safe under
     * concurrency: whether two requests come from the same tab
     * firing twice, two different browser tabs, or a genuine race
     * between two users hitting the same account, the second
     * request has to wait for the first transaction to commit
     * before it can read the (now up to date) reserved total.
     * That guarantees "available points" is always recalculated
     * against the latest committed reservations - it can never be
     * over-committed.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from EmcardAccount a where a.userId = :userId")
    Optional<EmcardAccount> findByUserIdForUpdate(
            @Param("userId") Long userId);
}
