/** Mirrors the backend auth contract (com.eqms.auth). Presentation layer only. */

/** Status strings returned by POST /api/auth/login and /api/auth/mfa/verify. */
export type LoginStatus =
  | "INVALID_CREDENTIALS"
  | "LOCKED"
  | "MFA_REQUIRED"
  | "ENROLLMENT_REQUIRED"
  | "AUTHENTICATED"
  | "INVALID_CODE";

/** Response body of the login / mfa-verify endpoints. */
export interface LoginResponse {
  status: LoginStatus;
}

export interface PasswordResetRequestResponse {
  message: string;
}

/** Response body of POST /api/auth/mfa/enroll — material for the authenticator QR. */
export interface MfaEnrollResponse {
  secret: string;
  otpauthUri: string;
}

/** Response body of GET /api/auth/me — current identity + authorities (UX hints only). */
export interface MeResponse {
  id: number;
  organizationId: number | null;
  email: string;
  fullName: string;
  authorities: string[];
}
