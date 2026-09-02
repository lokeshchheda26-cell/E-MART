package com.emart.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emart.entity.EmcardTransaction;

@Repository
public interface EmcardTransactionRepository
        extends JpaRepository<EmcardTransaction, Long> {

    // Newest first - what the "my points history" screen shows.
    List<EmcardTransaction> findByUserIdOrderByTxnIdDesc(Long userId);

    // Every movement caused by one order (a checkout that both
    // redeems and earns produces two rows).
    List<EmcardTransaction> findByOrderIdOrderByTxnIdAsc(Long orderId);
}
