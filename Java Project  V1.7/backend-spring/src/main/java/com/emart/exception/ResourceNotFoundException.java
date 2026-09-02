package com.emart.exception;

/**
 * Thrown when a requested resource (e.g. a Product) does
 * not exist in the database. Mapped to HTTP 404 by
 * GlobalExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
