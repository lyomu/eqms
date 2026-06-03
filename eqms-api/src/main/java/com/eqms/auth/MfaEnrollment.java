package com.eqms.auth;

/** TOTP enrollment material returned to the client: the Base32 secret and the otpauth:// URI. */
public record MfaEnrollment(String secret, String otpauthUri) {
}
