package com.emart.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Holds the EMCard (loyalty points) balance for a user.
 *
 * There is exactly one row per user. "Available" points are
 * NOT stored here - they are always computed on demand as:
 *
 *      totalPoints - SUM(pointsReserved from EmcardReservation for that user)
 *
 * so the balance can never drift out of sync with what is
 * currently selected in the cart.
 *
 * Table: emcard_account
 *
 * Merge note: userId here is the same id as {@link User#getUserId()}
 * (com.emart.entity.User). It is kept as a plain Long (no @ManyToOne)
 * to match the original EMCard prototype's design - it is looked up by
 * id from the JWT-authenticated principal in EmcardController, never
 * trusted from the client.
 */
@Entity
@Table(name = "emcard_account")
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmcardAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_id")
    private Long accountId;


    // =========================
    // USER
    // =========================

    @NotNull(message = "User id is required")
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;


    // =========================
    // TOTAL EMCARD POINTS BALANCE
    // =========================

    @NotNull(message = "Total points is required")
    @Min(value = 0, message = "Total points cannot be negative")
    @Column(name = "total_points", nullable = false)
    private Integer totalPoints;


    // =========================
    // OPTIMISTIC LOCK
    // (defence-in-depth alongside the pessimistic row lock
    // taken explicitly in EmcardServiceImpl)
    // =========================

    @Version
    @Column(name = "version", nullable = false)
    private Long version;


    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;


    // =========================
    // CONSTRUCTORS
    // =========================

    public EmcardAccount() {
    }

    public EmcardAccount(Long userId, Integer totalPoints) {
        this.userId = userId;
        this.totalPoints = totalPoints;
    }


    // =========================
    // GETTERS AND SETTERS
    // =========================

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(Integer totalPoints) {
        this.totalPoints = totalPoints;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
