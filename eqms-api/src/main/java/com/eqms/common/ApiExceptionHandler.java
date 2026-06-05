package com.eqms.common;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.eqms.attachments.StorageException;
import com.eqms.workflows.SelfApprovalException;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.WorkflowException;

/**
 * Maps domain/compliance exceptions to HTTP responses so clients get meaningful status codes:
 * self-approval -> 403, stale version -> 409, other workflow violations -> 422, re-auth failure ->
 * 401, missing record -> 404. (Spring Security already maps AccessDeniedException -> 403.)
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    public record ErrorResponse(int status, String error, String message, Instant timestamp) {
        static ErrorResponse of(HttpStatus status, String message) {
            return new ErrorResponse(status.value(), status.getReasonPhrase(), message, Instant.now());
        }
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(SelfApprovalException.class)
    public ResponseEntity<ErrorResponse> handleSelfApproval(SelfApprovalException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(StaleVersionException.class)
    public ResponseEntity<ErrorResponse> handleStaleVersion(StaleVersionException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(WorkflowException.class)
    public ResponseEntity<ErrorResponse> handleWorkflow(WorkflowException ex) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ErrorResponse> handleStorage(StorageException ex) {
        return build(HttpStatus.SERVICE_UNAVAILABLE, "Object storage error: " + ex.getMessage());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        // Re-authentication for an electronic signature failed.
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ErrorResponse.of(status, message));
    }
}
