package com.emart.dto;

import java.util.List;

/**
 * Response returned by every EMCard endpoint (summary, reserve,
 * release). Always carries the freshly recalculated balance so the
 * frontend never has to derive it - it just renders what the server
 * says "available" is right now.
 */
public class EmcardStatusDTO {

    private boolean success;
    private String message;

    private Integer totalPoints;
    private Integer reservedPoints;
    private Integer availablePoints;

    // productIds the user currently has EMCard-selected,
    // used by the frontend to restore/verify checkbox state
    private List<Long> reservedProductIds;


    public EmcardStatusDTO() {
    }

    public EmcardStatusDTO(
            boolean success,
            String message,
            Integer totalPoints,
            Integer reservedPoints,
            Integer availablePoints,
            List<Long> reservedProductIds) {

        this.success = success;
        this.message = message;
        this.totalPoints = totalPoints;
        this.reservedPoints = reservedPoints;
        this.availablePoints = availablePoints;
        this.reservedProductIds = reservedProductIds;
    }


    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Integer getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(Integer totalPoints) {
        this.totalPoints = totalPoints;
    }

    public Integer getReservedPoints() {
        return reservedPoints;
    }

    public void setReservedPoints(Integer reservedPoints) {
        this.reservedPoints = reservedPoints;
    }

    public Integer getAvailablePoints() {
        return availablePoints;
    }

    public void setAvailablePoints(Integer availablePoints) {
        this.availablePoints = availablePoints;
    }

    public List<Long> getReservedProductIds() {
        return reservedProductIds;
    }

    public void setReservedProductIds(List<Long> reservedProductIds) {
        this.reservedProductIds = reservedProductIds;
    }
}
