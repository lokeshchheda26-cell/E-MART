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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Represents EMCard points currently "held" against a product that
 * a user has ticked the EMCard checkbox for.
 *
 * One row = one (userId, prodId) pair. The unique constraint below
 * is what makes reserve/release idempotent and race-safe:
 * ticking the same checkbox twice, or two concurrent duplicate
 * requests (double click, two tabs), can never create two
 * reservations for the same product.
 *
 * A user's currently RESERVED points = SUM(pointsReserved) across
 * all their rows in this table. A user's AVAILABLE points =
 * EmcardAccount.totalPoints - that sum. Nothing is duplicated:
 * this table is the single source of truth for "what is currently
 * held", so available points can never drift.
 *
 * Table: emcard_reservation
 */
@Entity
@Table(
    name = "emcard_reservation",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_emcard_user_product",
        columnNames = { "user_id", "prod_id" }
    )
)
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmcardReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Long reservationId;


    @NotNull(message = "User id is required")
    @Column(name = "user_id", nullable = false)
    private Long userId;


    @NotNull(message = "Product id is required")
    @Column(name = "prod_id", nullable = false)
    private Long productId;


    @NotNull(message = "Points reserved is required")
    @Min(value = 0, message = "Points reserved cannot be negative")
    @Column(name = "points_reserved", nullable = false)
    private Integer pointsReserved;


    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;


    // =========================
    // CONSTRUCTORS
    // =========================

    public EmcardReservation() {
    }

    public EmcardReservation(Long userId, Long productId, Integer pointsReserved) {
        this.userId = userId;
        this.productId = productId;
        this.pointsReserved = pointsReserved;
    }


    // =========================
    // GETTERS AND SETTERS
    // =========================

    public Long getReservationId() {
        return reservationId;
    }

    public void setReservationId(Long reservationId) {
        this.reservationId = reservationId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Integer getPointsReserved() {
        return pointsReserved;
    }

    public void setPointsReserved(Integer pointsReserved) {
        this.pointsReserved = pointsReserved;
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
