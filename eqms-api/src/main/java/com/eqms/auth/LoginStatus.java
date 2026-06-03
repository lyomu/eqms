package com.eqms.auth;

/** Outcome of a login or MFA-verification attempt, mapped to HTTP responses by the controller. */
public enum LoginStatus {
    /** Wrong email/password. -> 401 */
    INVALID_CREDENTIALS,
    /** Account is locked (too many failures). -> 423 */
    LOCKED,
    /** Password OK, user already enrolled in MFA; awaiting TOTP code. -> 200 (pre-auth session) */
    MFA_REQUIRED,
    /** Password OK, but MFA not yet enrolled (mandatory); client must enroll. -> 200 (pre-auth session) */
    ENROLLMENT_REQUIRED,
    /** TOTP verified; full session established. -> 200 */
    AUTHENTICATED,
    /** TOTP code invalid. -> 401 */
    INVALID_CODE
}
