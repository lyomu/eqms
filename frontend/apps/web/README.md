# eQMS Frontend (`@eqms/web`)

Next.js 14 (App Router) frontend for the pharmaceutical eQMS. Presentation layer only —
all business logic, audit trail, signatures, and permissions are enforced by the Spring
Boot backend. See [`CLAUDE-FRONTEND.md`](../../../CLAUDE-FRONTEND.md) for the rules and
design system.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui**-style primitives
- **React Query** (server state) + **Zustand** (UI state)
- **React Hook Form** + **Zod** (forms/validation)
- **axios** (single client with interceptors)
- **sonner** (toasts), **lucide-react** (icons)

## Prerequisites

- **Node 20+** and **pnpm 9+** (`corepack enable` or `npm i -g pnpm`)
- The **backend running at `http://localhost:8080`** (from the repo root: the Spring Boot
  `eqms-api` module, plus its PostgreSQL/MinIO via `docker-compose up`).

## Install & run

From the workspace root (`frontend/`):

```bash
pnpm install
pnpm dev            # starts @eqms/web on http://localhost:3000
```

Or from this folder (`frontend/apps/web/`):

```bash
pnpm dev
pnpm build          # production build (also typechecks + lints)
pnpm typecheck      # tsc --noEmit
pnpm lint           # next lint
```

## How auth works (important)

The backend uses a **stateful session cookie (`JSESSIONID`, HttpOnly, SameSite=Strict)** —
**not** a JWT/bearer token, and there is **no refresh endpoint**. The frontend therefore:

- sends requests with `withCredentials: true` (the cookie carries the session);
- treats `401` as "session gone" → redirect to `/login` (no silent refresh);
- talks to the API **same-origin** through the Next.js **rewrite proxy**
  (`/api/*` → `http://localhost:8080/api/*`, see [`next.config.mjs`](next.config.mjs)),
  so the cookie stays first-party and **no CORS config is needed on the backend**.

Login is a **two-step flow with mandatory MFA**:

1. `POST /api/auth/login` (email + password) → returns a status:
   `MFA_REQUIRED`, `ENROLLMENT_REQUIRED`, `INVALID_CREDENTIALS`, or `LOCKED`.
2. `POST /api/auth/mfa/verify` (6-digit TOTP) → full session. First-time users enroll via
   `POST /api/auth/mfa/enroll` first.

> **CSRF:** the backend currently has CSRF disabled (a planned Milestone 1.x item). The
> axios client already contains an **inert CSRF header seam** (`CSRF_ENABLED = false` in
> [`src/lib/api.ts`](src/lib/api.ts)) — flip it on once the backend issues an `XSRF-TOKEN`
> cookie and every mutating request will echo `X-XSRF-TOKEN`.

## Environment

Copy `.env.example` → `.env.local`. Defaults work for local dev:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | _(empty)_ | axios base. Empty = same-origin via the proxy. |
| `BACKEND_ORIGIN` | `http://localhost:8080` | Where the Next proxy forwards `/api/*`. |

## Verifying Milestone 0

1. Start the backend (`http://localhost:8080`) and `pnpm dev`.
2. Visit `http://localhost:3000` → you're redirected to `/login` (no session).
3. Sign in with a backend user → routed to `/mfa` → enter TOTP → landed on **My Work**.
4. The light sidebar, user identity (bottom), and **Logout** all work; logout returns you
   to `/login`.

## Structure

```
src/
├── app/
│   ├── (auth)/login, (auth)/mfa     # login + MFA (verify/enroll)
│   ├── (app)/                       # authenticated shell (ProtectedRoute + MainLayout)
│   ├── layout.tsx, providers.tsx, globals.css
├── components/{layout,auth,ui}/     # Sidebar/Header/MainLayout, ProtectedRoute, primitives
├── hooks/useAuth.ts                 # session-based auth (login/verify/enroll/logout/me)
├── lib/{api,query-client,utils}.ts  # axios + interceptors, React Query, cn()
├── stores/ui-store.ts               # Zustand UI state (sidebar)
└── types/auth.ts                    # backend auth contract mirror
```
