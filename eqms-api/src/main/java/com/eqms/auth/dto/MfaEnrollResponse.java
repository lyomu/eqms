package com.eqms.auth.dto;

/** Enrollment material for the authenticator app: Base32 secret + otpauth:// URI for the QR code. */
public record MfaEnrollResponse(String secret, String otpauthUri) {
}
