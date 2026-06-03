package com.eqms.auth;

/**
 * Result of {@link AuthService#login} / {@link AuthService#verifyMfa}. Carries the user identity
 * (when known) plus the {@link LoginStatus}. Failure statuses are returned (not thrown) so that
 * the failed-attempt counter is committed rather than rolled back with an exception.
 */
public record LoginOutcome(Long userId, String email, String fullName, LoginStatus status) {

    public static LoginOutcome invalidCredentials() {
        return new LoginOutcome(null, null, null, LoginStatus.INVALID_CREDENTIALS);
    }

    public static LoginOutcome locked() {
        return new LoginOutcome(null, null, null, LoginStatus.LOCKED);
    }

    public static LoginOutcome invalidCode() {
        return new LoginOutcome(null, null, null, LoginStatus.INVALID_CODE);
    }
}
