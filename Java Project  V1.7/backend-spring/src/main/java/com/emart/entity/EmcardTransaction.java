package com.emart.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

/**
 * Append-only ledger of every change to an eMCard point balance
 * (table: emcard_transaction).
 *
 * Why this exists: emcard_account.total_points only tells you where
 * the balance is NOW. It cannot answer "why is it this number?" or
 * "which order spent those 40 points?". Each row here records the
 * balance immediately before and after a single, one-reason change,
 * so the full history is reconstructable and every invoice line can
 * be traced to a real record.
 *
 * Rows are written inside the same locked transaction that mutates
 * emcard_account (see EmcardServiceImpl#settleCheckout), so the
 * ledger can never disagree with the balance. Nothing ever updates
 * or deletes a row here.
 */
@Entity
@Table(
    name = "emcard_transaction",
    indexes = {
        @Index(name = "idx_emcard_txn_user", columnList = "user_id"),
        @Index(name = "idx_emcard_txn_order", columnList = "order_id")
    }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmcardTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "txn_id")
    private Long txnId;


    @NotNull(message = "User id is required")
    @Column(name = "user_id", nullable = false)
    private Long userId;


    /**
     * The order this movement belongs to, or null for movements that
     * are not tied to a purchase (e.g. the joining bonus).
     */
    @Column(name = "order_id")
    private Long orderId;


    @NotNull(message = "Transaction type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "txn_type", nullable = false, length = 20)
    private EmcardTransactionType txnType;


    /**
     * Always a positive magnitude. The direction is carried by
     * {@link #txnType} (REDEEM debits, EARN/CREDIT_INITIAL credit),
     * which keeps "how many points were involved" unambiguous.
     */
    @NotNull(message = "Points is required")
    @Column(name = "points", nullable = false)
    private Integer points;


    @NotNull
    @Column(name = "balance_before", nullable = false)
    private Integer balanceBefore;


    @NotNull
    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;


    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;


    // =========================
    // CONSTRUCTORS
    // =========================

    public EmcardTransaction() {
    }

    public EmcardTransaction(
            Long userId,
            Long orderId,
            EmcardTransactionType txnType,
            Integer points,
            Integer balanceBefore,
            Integer balanceAfter) {

        this.userId = userId;
        this.orderId = orderId;
        this.txnType = txnType;
        this.points = points;
        this.balanceBefore = balanceBefore;
        this.balanceAfter = balanceAfter;
        this.createdAt = LocalDateTime.now();
    }


    // =========================
    // GETTERS AND SETTERS
    // =========================

    public Long getTxnId() {
        return txnId;
    }

    public void setTxnId(Long txnId) {
        this.txnId = txnId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public EmcardTransactionType getTxnType() {
        return txnType;
    }

    public void setTxnType(EmcardTransactionType txnType) {
        this.txnType = txnType;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public Integer getBalanceBefore() {
        return balanceBefore;
    }

    public void setBalanceBefore(Integer balanceBefore) {
        this.balanceBefore = balanceBefore;
    }

    public Integer getBalanceAfter() {
        return balanceAfter;
    }

    public void setBalanceAfter(Integer balanceAfter) {
        this.balanceAfter = balanceAfter;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
