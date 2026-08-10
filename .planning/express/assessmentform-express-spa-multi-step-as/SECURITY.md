# Security Report — Multi-Step Assessment Form SPA

**Mode:** Retroactive
**Audited:** 2026-08-10
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 2

## Summary

The AssessmentForm Express SPA (Next.js 16 + PostgreSQL + Drizzle ORM) was audited in full retroactive mode against the entire codebase committed at merge commit `df5a532`. The authentication architecture (HS256 JWT via `jose`, dual-role middleware chain, session ownership guards) is structurally sound and correctly blocks IDOR and privilege escalation on all respondent and dashboard endpoints. Drizzle ORM parameterizes all queries; the `sortBy` parameter uses a safe whitelist map with safe fallback; no SQL injection vectors were found. Two critical/high findings survived adversarial refutation and block ship: (1) three `.env` files containing production credentials and real JWT secrets are committed to the repository, including the `JWT_SECRET` that could be used to forge arbitrary tokens; and (2) the `POST /api/notifications/email` endpoint has no authentication guard, making it reachable by any unauthenticated external caller. Additional medium/low findings are documented below.

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| `POST /api/auth/login` | S | SAFE — Zod email validation; `isSystemOwnerEmail` DB lookup; returns 403 for non-owners | `src/app/api/auth/login/route.ts:37` |
| `POST /api/sessions` | S, D | SAFE (auth); LOW (no rate limit) — Zod validated; SO email blocked; no rate limiting | `src/app/api/sessions/route.ts:32` |
| `GET /api/sessions/:sessionId` | S, E | SAFE — `jwtMiddleware → requireSessionOwner` chain; email ownership check in `sessionService.getSessionById` | `src/app/api/sessions/[sessionId]/route.ts:42` |
| `PUT /api/responses/:sessionId` | T, E | SAFE — `assessmentOpenGuard → requireSessionOwner`; Zod schema on answer payload; DB FK constraint on `question_id` | `src/app/api/responses/[sessionId]/route.ts:36-41` |
| `POST /api/submissions/:sessionId` | T, E | SAFE — `requireSessionOwner → assessmentOpenGuard`; mandatory check; system_owner blocked | `src/app/api/submissions/[sessionId]/route.ts:35-42` |
| `GET /api/sections` | E | SAFE — `jwtMiddleware` required; teamType whitelist validated | `src/app/api/sections/route.ts:46` |
| `GET /api/sections/:sectionId/questions` | E | SAFE — `jwtMiddleware` required; sectionId passed to DB as parameterized eq() | `src/app/api/sections/[sectionId]/questions/route.ts:47` |
| `POST /api/notifications/email` | S, T | **FINDING F-01** — No authentication guard; publicly callable by any client | `src/app/api/notifications/email/route.ts:25` |
| `GET /api/dashboard/responses` | E | SAFE — `requireSystemOwner` guards; `sortBy` whitelist map with safe default | `src/app/api/dashboard/responses/route.ts:8` |
| `GET /api/dashboard/responses/:sessionId` | E, I | SAFE — `requireSystemOwner` guards; returns 404 on unknown ID (no IDOR) | `src/app/api/dashboard/responses/[sessionId]/route.ts:11` |
| `GET /api/dashboard/analytics` | E | SAFE — `requireSystemOwner` guards; `teamTypeFilter` passed to Drizzle `inArray()` (parameterized) | `src/app/api/dashboard/analytics/route.ts:8` |
| `GET /api/dashboard/export/csv` | E | SAFE — `requireSystemOwner` guards; `ilike` with `%search%` is parameterized | `src/app/api/dashboard/export/csv/route.ts:9` |
| `GET /api/config` + `PATCH /api/config` | E | SAFE — both guarded by `requireSystemOwner`; date validated with `Date.parse()`; no arbitrary config fields | `src/app/api/config/route.ts:9,34` |
| `GET /api/health` | I | LOW — unauthenticated, leaks `db: connected/disconnected` and timestamp (acceptable for health endpoint) | `src/app/api/health/route.ts:9` |
| `jwtMiddleware` | S | SAFE — `jose.jwtVerify` with `algorithms: ['HS256']`; `ERR_JWT_EXPIRED` detected | `src/lib/auth/jwtMiddleware.ts:22` |
| `requireSessionOwner` (middleware/) | E | SAFE — independent JWT re-verification; system_owner blocked; case-insensitive email compare | `src/lib/middleware/requireSessionOwner.ts:52-98` |
| `requireSystemOwner` (middleware/) | E | SAFE — `verifyJwt` then `role !== 'system_owner'` check | `src/lib/middleware/requireSystemOwner.ts:28-29` |
| `assessmentOpenGuard` | D | LOW — fail-open on DB error (guard returns `{ok: true}` when DB throws) | `src/lib/middleware/assessmentOpenGuard.ts:48-51` |
| `dashboardService.getResponseList` — `sortBy` | T | SAFE — `sortBy` resolved through a hardcoded whitelist map with safe default (`sessions.submitted_at`) | `src/lib/services/dashboardService.ts:59-67` |
| `analyticsService` — raw `sql\`\`` | T | SAFE — all variable interpolations use `${}` (Drizzle parameterized); `q.id` comes from DB not user | `src/lib/services/analyticsService.ts:91-108` |
| `csvExportService` — `ilike` search | T | SAFE — `ilike(respondents.name, \`%${params.search}%\`)` is parameterized; no raw string concat | `src/lib/services/csvExportService.ts:52-55` |
| `emailService.sendSubmissionConfirmation` | T | MEDIUM — `fetch(relayUrl, ...)` where `relayUrl` = `process.env.EMAIL_RELAY_URL`; env-controlled, not user-controlled | `src/lib/services/emailService.ts:39` |
| `.env`, `.env.local`, `.env.local.QUARANTINED-INCIDENT-20260722` | I | **FINDING F-02** — Real production DATABASE_URL (with password) and JWT_SECRET committed to git | `.env.local:1-2`, `.env.local.QUARANTINED-INCIDENT-20260722:1-2` |
| `db.ts` — SSL config | T | MEDIUM — `rejectUnauthorized: false` in non-local mode; `sslmode=no-verify` in `.env.local` | `src/lib/db.ts:24`, `.env.local:1` |
| JWT storage in `localStorage` | I | LOW — tokens stored in `localStorage` not `httpOnly` cookies; XSS risk (no XSS found in codebase) | `src/app/dashboard/login/page.tsx:42`, `src/hooks/useSession.ts:27` |
| Missing `Content-Security-Policy` header | T | LOW — `next.config.ts` sets only `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`; no CSP | `next.config.ts:20-23` |
| `X-Frame-Options` intentionally absent | T | LOW (accepted risk) — explicitly removed to allow Pivota Preview iframe; noted in code comment | `next.config.ts:21` |

---

## Confirmed findings

> Each finding below survived adversarial refutation: input is user-controlled or secret is reachable via repository access; no upstream guard exists; the sink is reachable from the network.

---

### F-01: Unauthenticated Email Notification Endpoint — HIGH

- **Category:** authz_bypass / unauthenticated_public_endpoint
- **Location:** `src/app/api/notifications/email/route.ts:25`
- **Description:** `POST /api/notifications/email` accepts a JSON body `{ session_id, email, name, due_date }` and triggers `sendSubmissionConfirmation()` without any JWT verification or IP-allowlist guard. The inline comment states "Internal server-to-server only (no external auth; called from submissionService)", but the route is a public Next.js API route exposed on the same port and hostname as all other routes. The caller identity is never verified.

  Data flow: `POST /api/notifications/email` → `sendSubmissionConfirmation(parsed.data)` → `fetch(EMAIL_RELAY_URL, { body: JSON.stringify(emailPayload) })` where `to: params.email` is fully attacker-controlled.

- **Exploit (refutation attempt failed):**
  1. Attacker sends `POST /api/notifications/email` with `{ session_id: "00000000-...", email: "victim@example.com", name: "Victim", due_date: "2026-09-01T00:00:00Z" }` — **no credentials needed**.
  2. If `EMAIL_RELAY_URL` is configured, the server sends a confirmation email from the platform's address to any victim address (spam/phishing vector).
  3. An attacker can enumerate whether `EMAIL_RELAY_URL` is set (rate of `{ sent: true }` vs timing).
  4. Even without email relay configured, the endpoint leaks internal API surface that is supposedly "internal only" but is fully public.
  - **Refutation check:** Is there any upstream guard (Next.js middleware, WAF, network policy)? The `next.config.ts` has no middleware matcher restricting this path. No evidence of network-level restriction in the codebase. Endpoint is reachable.

- **Fix:** Add `requireSessionOwner` or at minimum a shared secret header (`X-Internal-Token`) check to `POST /api/notifications/email`. Alternatively, remove the HTTP endpoint entirely and call `sendSubmissionConfirmation()` directly as an in-process function (as is already done in `submissionService.ts` line 58 — making the HTTP endpoint redundant).

---

### F-02: Production Credentials and JWT Secret Committed to Git Repository — CRITICAL

- **Category:** secret_leak / information_disclosure
- **Location:**
  - `.env.local:1-2` (committed to git HEAD, confirmed via `git ls-files`)
  - `.env.local.QUARANTINED-INCIDENT-20260722:1-2` (committed to git HEAD)
  - `.env:1` (JWT_SECRET `uat-test-secret-32-chars-minimum-xxxxxxxx` — weak test secret)
- **Description:** Three files containing secrets are tracked by git and present in the HEAD commit (`df5a532`):

  **`.env.local`** (actively used by `drizzle/seed.ts` and `drizzle/migrate.ts` via `dotenv.config({ path: '.env.local' })`):
  ```
  DATABASE_URL=postgresql://pivota-spec-driven:<PASSWORD>@pivota-spec-driven-primary.prod.svc:5432/pivota-spec-driven?sslmode=no-verify
  JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=
  NODE_TLS_REJECT_UNAUTHORIZED=0
  ```

  **`.env.local.QUARANTINED-INCIDENT-20260722`** (identical JWT_SECRET; DB URL without `sslmode=no-verify`):
  ```
  DATABASE_URL=postgresql://pivota-spec-driven:<PASSWORD>@pivota-spec-driven-primary.prod.svc:5432/pivota-spec-driven
  JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=
  ```

  The file name `QUARANTINED-INCIDENT-20260722` indicates the incident was known on 2026-07-22, yet the file containing the same credential set remains in the repository 19 days later (audit date: 2026-08-10), and the active `.env.local` uses the same `JWT_SECRET`.

  **Secondary issue:** `NODE_TLS_REJECT_UNAUTHORIZED=0` is set process-wide in `.env.local`, disabling TLS certificate verification for **all** Node.js `https` connections (not just the DB), including any external service calls.

- **Exploit (refutation attempt failed):**
  1. Any developer who clones the repository (or any CI system with repo read access) immediately obtains the production `JWT_SECRET`.
  2. Using the leaked `JWT_SECRET` (`q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`), an attacker can forge a valid `system_owner` JWT: `{ session_id: null, email: "any@example.com", role: "system_owner" }` signed with HS256 and the known secret.
  3. This forged token passes `requireSystemOwner` (which calls `verifyJwt` → `jose.jwtVerify` with the same secret), granting full access to all dashboard endpoints: response list, individual response details, analytics, CSV export, and config PATCH.
  4. The production `DATABASE_URL` additionally exposes the database password and internal hostname, enabling direct database access if network reachable.
  - **Refutation check:** Is the JWT_SECRET different in production from what's in `.env.local`? There is no evidence of rotation. The quarantined incident file and the current `.env.local` share the **same** JWT_SECRET value, implying it was never rotated after the 2026-07-22 incident.

- **Fix:**
  1. **Immediately rotate** `JWT_SECRET` and the database password — treat both as fully compromised.
  2. Add `.env.local` and `*.QUARANTINED-INCIDENT-*` to `.gitignore` **and** purge from git history (`git filter-repo` or BFG Repo-Cleaner).
  3. Verify `NODE_TLS_REJECT_UNAUTHORIZED=0` is not present in any deployed environment configuration.
  4. Use a secret management solution (Vault, K8s Secrets) and never commit real credentials to version control.

---

## Medium findings (do not block ship independently but should be addressed)

### F-03: TLS Certificate Validation Disabled in Production DB Connection — MEDIUM

- **Category:** tampering / information_disclosure
- **Location:** `src/lib/db.ts:24`, `.env.local:1` (`sslmode=no-verify`), `.env.local:5` (`NODE_TLS_REJECT_UNAUTHORIZED=0`)
- **Description:** `db.ts` sets `ssl: { rejectUnauthorized: false }` for all non-local connections, meaning the PostgreSQL TLS certificate is never validated. Combined with `sslmode=no-verify` in the connection string and the process-wide `NODE_TLS_REJECT_UNAUTHORIZED=0`, TLS provides encryption but no authentication — a MitM attacker on the same network can intercept all DB traffic.
- **Fix:** Set `rejectUnauthorized: true` and provide the CA certificate. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from all environments. Use `sslmode=verify-full` in production connection strings.

### F-04: assessmentOpenGuard Fail-Open on Database Error — MEDIUM

- **Category:** denial_of_service / tampering
- **Location:** `src/lib/middleware/assessmentOpenGuard.ts:48-51`
- **Description:** When the DB is unavailable, the guard catches the error and returns `{ ok: true }`, allowing responses to be saved and submissions to proceed even if the due-date check cannot be performed. An attacker who can cause transient DB failures during the deadline window could bypass the closed-assessment gate. The realistic attack surface is low (requires DB-level DoS), but the design is fail-open rather than fail-safe.
- **Fix:** On DB error, return a `503 SERVICE_UNAVAILABLE` response rather than treating the assessment as open. Accept that brief DB outages will block saves — this is safer than silently bypassing the deadline.

---

## Low findings

### F-05: JWT Tokens Stored in localStorage (XSS Exposure) — LOW

- **Category:** information_disclosure
- **Location:** `src/app/dashboard/login/page.tsx:42`, `src/hooks/useSession.ts:27`
- **Description:** Both the respondent JWT (`af_token`) and system owner JWT (`dashboard_token`) are stored in `localStorage`, accessible to any JavaScript executing in the page origin. No `dangerouslySetInnerHTML`, `eval()`, or other XSS sinks were found in the audited source code, so there is no current XSS path. However, any future XSS introduction would immediately enable token theft.
- **Fix:** Consider moving tokens to `httpOnly` cookies (preferred for system_owner JWT given its broader privilege). For the respondent flow, localStorage is acceptable given the limited scope of the respondent role.

### F-06: Missing Content-Security-Policy Header — LOW

- **Category:** tampering
- **Location:** `next.config.ts:16-27`
- **Description:** The application sets `X-Content-Type-Options`, `X-XSS-Protection` (deprecated in modern browsers), and `Referrer-Policy`, but no `Content-Security-Policy`. Without CSP, any XSS vulnerability has no defense-in-depth protection.
- **Fix:** Add a restrictive CSP (e.g., `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`). Note: `'unsafe-inline'` for styles may be needed for Tailwind CSS.

### F-07: No Rate Limiting on Unauthenticated Endpoints — LOW

- **Category:** denial_of_service
- **Location:** `src/app/api/auth/login/route.ts`, `src/app/api/sessions/route.ts`
- **Description:** `POST /api/auth/login` (system owner login) and `POST /api/sessions` (respondent session creation) have no rate limiting. An attacker can enumerate system owner email addresses (via distinct 403 vs 400 responses) or create large numbers of respondent sessions. The login endpoint response distinguishes "NOT_A_SYSTEM_OWNER" (403) from invalid email format (400), enabling email enumeration.
- **Fix:** Add per-IP rate limiting (e.g., via Next.js middleware or an upstream proxy). For the login endpoint, consider returning a consistent "if this email is registered, you'll receive access" style response to prevent enumeration.

### F-08: System Owner Email Enumeration via Login Endpoint — LOW

- **Category:** information_disclosure
- **Location:** `src/app/api/auth/login/route.ts:38-43`
- **Description:** `POST /api/auth/login` returns `{ error: { code: 'NOT_A_SYSTEM_OWNER' } }` (403) for valid email addresses not in the system owner list, and `{ error: { code: 'INVALID_EMAIL_FORMAT' } }` (400) for invalid email format. This lets an attacker determine whether an email address is a registered system owner.
- **Fix:** Return the same error response (e.g., generic "Login failed") regardless of whether the email is recognized, to prevent enumeration.

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | `X-Frame-Options` header absent | Required by Pivota Preview iframe embedding; explicitly noted in `next.config.ts:21` | Platform |
| AR-02 | `/api/health` unauthenticated and leaks DB status | Standard health endpoint pattern; status `connected`/`disconnected` is low-sensitivity; required by docker-compose healthcheck | Platform |
| AR-03 | `rejectUnauthorized: false` initially from platform constraint | `sslmode=no-verify` reflects platform-provisioned sidecar constraint; to be resolved with proper CA cert provisioning | Platform |

---

## Audit trail

- **Diff scoped via:** `git ls-files`, `git show df5a532`, and SUMMARY.md file list (110+ files, full codebase)
- **Register:** Built retroactively from diff (no `<threat_model>` in PLAN.md)
- **Refutation:** 22 candidates examined, 2 confirmed HIGH/CRITICAL, 2 confirmed MEDIUM, 4 confirmed LOW, 14 refuted as safe
- **SQL injection:** All Drizzle ORM queries verified as parameterized; raw `sql\`\`` template literals use `${}` interpolation (Drizzle parameterized binding); `sortBy` uses whitelist map — no injection vector found
- **IDOR:** Both `requireSessionOwner` implementations (auth/ and middleware/) verified to perform DB ownership check with case-insensitive email comparison; system_owner bypass is intentional (dashboard context uses `requireSystemOwner` instead)
- **Auth bypass:** `requireSystemOwner` in middleware/ re-verifies JWT signature independently (not relying on `AuthenticatedRequest.user`); dual verification confirmed on dashboard routes
- **Secret scan:** Three .env files confirmed tracked by git via `git ls-files`; production credentials confirmed present in HEAD commit
- **XSS sinks:** `grep -rn "dangerouslySetInnerHTML|eval(|innerHTML|document.write"` across `src/` returned no matches
