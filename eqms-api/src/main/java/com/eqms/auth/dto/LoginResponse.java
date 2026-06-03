package com.eqms.auth.dto;

/** Response carrying the {@code LoginStatus} name (e.g. MFA_REQUIRED, ENROLLMENT_REQUIRED, AUTHENTICATED). */
public record LoginResponse(String status) {
}
