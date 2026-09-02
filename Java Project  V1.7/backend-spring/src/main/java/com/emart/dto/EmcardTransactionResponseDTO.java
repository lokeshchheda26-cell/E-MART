package com.emart.dto;

import java.time.LocalDateTime;

/**
 * One row of the customer-facing eMCard points history.
 */
public class EmcardTransactionResponseDTO {

    private Long txnId;
    private Long orderId;
    private String type;
    private Integer points;
    private Integer balanceBefore;
    private Integer balanceAfter;
    private LocalDateTime createdAt;

    public EmcardTransactionResponseDTO() {
    }

    public EmcardTransactionResponseDTO(
            Long txnId,
            Long orderId,
            String type,
            Integer points,
            Integer balanceBefore,
            Integer balanceAfter,
            LocalDateTime createdAt) {

        this.txnId = txnId;
        this.orderId = orderId;
        this.type = type;
        this.points = points;
        this.balanceBefore = balanceBefore;
        this.balanceAfter = balanceAfter;
        this.createdAt = createdAt;
    }

    public Long getTxnId() {
        return txnId;
    }

    public void setTxnId(Long txnId) {
        this.txnId = txnId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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
