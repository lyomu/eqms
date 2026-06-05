# Project: Pharmaceutical eQMS Frontend (UPDATED)

## What this is
A Next.js frontend for the pharmaceutical eQMS, consuming the Java + Spring Boot 
backend. Builds UI for all 16 quality modules across 5 phases. All business logic, 
audit trails, signatures, and permissions enforced on backend — frontend is 
presentation layer only.

**Phase 1 MVP (Milestones 0–10):** Document Control, Training, Change Control, 
Deviations, CAPA, Products, Materials, Batch Records, Dashboard, Notifications, Reports.

**Phase 2 (Milestones 11–15):** Complaints, Audits, Risk, Suppliers, Training (expanded).

**Phase 3 (Milestones 16–19):** Equipment, OOS, Non-Conformance, Management Review.

**Phase 4:** Advanced Analytics, Custom Workflows.

**Phase 5:** Desktop App (Tauri wrapper).

## Tech stack (LOCKED)
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS + shadcn/ui
- State: React Query (server) + Zustand (client UI state)
- Auth: Spring Security **stateful session cookie** (`JSESSIONID`, HttpOnly,
  SameSite=Strict). NOT a JWT/bearer token; there is no refresh endpoint.
- Forms: React Hook Form + Zod
- HTTP: axios (`withCredentials: true`) with a single response interceptor for error
  handling. No Authorization header, no token refresh.
- Testing: Playwright (e2e) + Vitest + React Testing Library (unit)
- Monorepo: pnpm workspaces. Frontend lives at `frontend/` (workspace root) with the
  Next app at `frontend/apps/web`, alongside the backend Maven modules in the same git repo.

## Backend integration (decided in M0)
- **Same-origin via Next.js rewrite proxy.** The browser calls `/api/*` on the Next
  origin; `next.config.mjs` rewrites to `BACKEND_ORIGIN` (default `http://localhost:8080`).
  This keeps the session cookie first-party (SameSite=Strict works) and needs **no CORS on
  the backend**. Never hardcode the backend URL in client code.
- **Auth is two-step with mandatory MFA**: `POST /api/auth/login` (email+password) returns a
  status string (`MFA_REQUIRED` | `ENROLLMENT_REQUIRED` | `INVALID_CREDENTIALS` | `LOCKED`),
  then `POST /api/auth/mfa/verify` (`{code}`); `POST /api/auth/mfa/enroll` for first-time
  setup. `GET /api/auth/me` hydrates the current user; `isAuthenticated` derives from it.
- **CSRF**: backend has CSRF disabled for now (planned Milestone 1.x). The axios client
  carries an inert CSRF header seam (`CSRF_ENABLED=false` in `src/lib/api.ts`) — flip it on
  when the backend issues an `XSRF-TOKEN` cookie; mutating requests will echo `X-XSRF-TOKEN`.

## NON-NEGOTIABLE RULES FOR FRONTEND

1. ALL BUSINESS LOGIC ON BACKEND.
   - Frontend NEVER validates compliance rules.
   - Permission checks on backend (frontend hiding is UX).
   - Self-approval, optimistic locking, audit logging all backend.

2. NO LOCAL STATE FOR REGULATED ACTIONS.
   - Status transitions not cached.
   - Signatures not generated locally.
   - Timestamps from backend response.

3. SESSION COOKIE IS HTTPONLY + SECURE (NOT A TOKEN IN JS).
   - Auth rides a server-side session cookie (JSESSIONID), set by the backend on login.
   - Never store any token/credential in localStorage or JS-readable state.
   - No client-side JWT, no auto-refresh: a 401 means the session is gone → go to /login.

4. ALL API CALLS HAVE ERROR HANDLING.
   - 401 → redirect to login
   - 403 → show "no permission"
   - 409 → show "record updated, refresh"
   - 400 → show validation errors
   - 500 → show error + log

5. PERMISSION HIDING NOT SECURITY.
   - Backend enforces; frontend hiding is UX.

6. FORMS OPTIMISTIC BUT ROLLBACK-SAFE.
   - Show loading, revert on error.

7. AUDIT TRAIL READ-ONLY.
   - Display only, no editing.

8. RESPONSIVE DESIGN REQUIRED.
   - Desktop, tablet, mobile.
   - Sidebar collapses on mobile.

## Design system (SimplerQMS)
- Primary blue: #1F4E79
- Secondary blue: #2E75B6
- Light blue bg: #D6E4F0
- Success green: #70AD47
- Warning: #FFC107
- Error: #DC3545
- Spacing: 16px default
- Border radius: 4–8px
- Font: Open Sans (Arial fallback)

### Shell conventions (cues from SimplerQMS, established in M0)
- **Light left sidebar** (white bg, right border, blue `eQMS` wordmark, gray outline
  icons). Active item = light-blue pill (`bg-brand-light`) + `text-brand-primary`.
  Top of sidebar: Search + Notifications. Bottom: user identity, Settings, Logout.
- **No heavy top bar on desktop** — pages render their own `h1` title (+ tabs). The
  `Header` is mobile-only (hamburger + wordmark); the sidebar is a slide-over on mobile.
- **Status as `Badge` pills** (`components/ui/badge.tsx`) with semantic variants
  (neutral/info/success/warning/error), mirroring SimplerQMS list states
  ("About Due", "Closed", "Active", "Overdue").
- Reusable primitives live in `components/ui/`; one component per file; use `cn()` from
  `lib/utils`. Module-specific components go under `components/<module>/`.
- Typography scale is in the Tailwind config: `text-h1/h2/h3/body/label`.

## Milestone Sequence (19 total)

**Phase 1 MVP (Months 1–3):**
- M0: Foundation (Next.js, login, MFA, layouts, design system) ✅
- M1: Dashboard + Navigation
- M2: Generic list/detail template
- M3: Document Control UI
- M4: Change Control UI
- M5: CAPA UI
- M6: Deviations UI
- M7: Product Management UI
- M8: Material Management UI
- M9: Electronic Batch Records UI
- M10: Notifications, Dashboard (expanded), Reports

**Phase 2 (Months 4–5):**
- M11: Complaint Management UI
- M12: Audit Management UI
- M13: Risk Management UI
- M14: Supplier Quality UI
- M15: Training Management UI (expanded)

**Phase 3 (Months 6–7):**
- M16: Equipment Management UI
- M17: OOS Management UI
- M18: Non-Conformance UI
- M19: Management Review UI

**Phase 4 (Months 8–9):**
- Advanced Analytics dashboards, Custom workflows UI

**Phase 5 (Months 10–12):**
- Desktop App (Tauri, reuse React components)

## All 16 Modules (UI)

**Core Quality:**
1. Document Control - M3
2. Training Management - M15
3. Change Management - M4
4. Deviation Management - M6

**Investigation & Corrective:**
5. CAPA Management - M5
6. Complaint Management - M11
7. OOS Management - M17

**Compliance & Oversight:**
8. Audit Management - M12
9. Risk Management - M13
10. Equipment Management - M16
11. Supplier Management - M14

**Manufacturing & Production:**
12. Material Management - M8
13. Electronic Batch Records - M9
14. Product Management - M7
15. Non-Conformance Management - M18
16. Management Review - M19

## Architecture
- React Query: all server state (caching, refetch, errors)
- Zustand: UI state (sidebar, filters, drawer open/closed)
- Component per module (documents/, change-control/, etc.)
- Shared/ for cross-module (Button, Input, Modal, etc.)
- Every page: loading + error states
- Every form: confirmation dialog or toast
- WCAG 2.1 AA accessibility (semantic HTML, ARIA, keyboard nav)

## Coding standards
- TypeScript: strict mode, no `any` without justification
- Functional components only (hooks)
- PascalCase components, camelCase functions/variables
- One component per file
- Tests: unit (Vitest) + integration (RTL) + e2e (Playwright)
- Conventional commits
- No hardcoded API URLs (environment variables)

## What NOT to do
- Do not implement backend logic in frontend
- Do not store sensitive data in localStorage
- Do not submit forms without backend validation
- Do not hide error messages
- Do not cache permission decisions
- Do not build offline mode (Phase 5 desktop app only)
- Do not call APIs directly without error handling