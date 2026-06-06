import axios, { AxiosError } from "axios";
import { toast } from "sonner";

/**
 * Central axios instance for the eQMS backend.
 *
 * Auth model: the Spring Boot backend uses a stateful server session carried by an
 * HttpOnly `JSESSIONID` cookie (NOT a JWT / bearer token). So:
 *   - `withCredentials: true` makes the browser send that cookie on every call.
 *   - There is NO Authorization header and NO token-refresh flow (none exists server-side).
 *   - In local dev all calls are same-origin (Next.js rewrite proxy), so the cookie is
 *     first-party and SameSite=Strict is satisfied.
 *
 * Error handling here is the single choke point for compliance rule 4 (every API call has
 * error handling). 400 validation errors are intentionally passed through for forms to render
 * inline rather than toasted.
 */

// No hardcoded URLs. Empty default => same-origin (handled by the Next rewrite proxy).
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/* -------------------------------------------------------------------------- */
/* CSRF seam — INERT until the backend enables CSRF (planned Milestone 1.x).  */
/*                                                                            */
/* When the backend turns on Spring Security CSRF with a cookie-based token   */
/* repository (CookieCsrfTokenRepository), it will set a readable `XSRF-TOKEN`*/
/* cookie. Flip CSRF_ENABLED to true (or wire it to an env flag) and every    */
/* mutating request will echo it back in the `X-XSRF-TOKEN` header. Until     */
/* then this adds nothing, so it is safe to ship now.                         */
/* -------------------------------------------------------------------------- */
const CSRF_ENABLED = false;
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const SAFE_METHODS = new Set(["get", "head", "options"]);

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : undefined;
}

api.interceptors.request.use((config) => {
  if (CSRF_ENABLED) {
    const method = (config.method ?? "get").toLowerCase();
    if (!SAFE_METHODS.has(method)) {
      const token = readCookie(CSRF_COOKIE_NAME);
      if (token) {
        config.headers.set(CSRF_HEADER_NAME, token);
      }
    }
  }
  return config;
});

/* ------------------------------- responses -------------------------------- */
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";
    const isAuthCall = url.includes("/api/auth/") || url.includes("/api/platform/auth/");

    switch (status) {
      case 401:
        // Session expired/absent. No refresh exists -> send to login.
        // Skip for auth calls themselves so we don't redirect-loop on a bad login.
        if (typeof window !== "undefined" && !isAuthCall) {
          const loginPath = url.startsWith("/api/platform/")
            ? "/platform/login?session=expired"
            : "/login?session=expired";
          window.location.assign(loginPath);
        }
        break;
      case 403:
        toast.error("You don't have permission to perform this action.");
        break;
      case 409:
        toast.error("This record was changed by someone else. Refresh and try again.");
        break;
      case 400:
        // Validation errors belong inline on the form (React Hook Form + Zod).
        // Pass through — do not toast, do not swallow.
        break;
      case 500:
        toast.error("Something went wrong on the server. Please try again.");
        // eslint-disable-next-line no-console
        console.error("[api] 500", error.config?.url, error.response?.data);
        break;
      default:
        if (status === undefined) {
          toast.error("Network error. Check your connection and try again.");
        }
    }
    return Promise.reject(error);
  }
);
