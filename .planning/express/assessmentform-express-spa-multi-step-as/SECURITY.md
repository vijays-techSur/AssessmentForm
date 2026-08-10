# Security Report — Multi-Step Assessment Form SPA (Re-audit)

**Mode:** Retroactive (re-audit)
**Audited:** 2026-08-10
**Prior audit:** 2026-08-10 (commit `fb52b10`)
**Current HEAD:** `a8fa88e`
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 2

---

## Summary

This re-audit refreshes all eight prior findings (F-01 through F-08) against the current HEAD commit (`a8fa88e`). Since the prior security audit (`fb52b10`), only three files changed: `.pivota/dev-script.meta.json`, `.pivota/start-dev.sh`, `docker-compose.yml`, `.planning/STATE.md`, `.planning/express/.../SUMMARY.md`, and `.planning/express/.../UAT.md` — none of which affect any finding location. All implementation files in scope (routes, middleware, services, db.ts, .env files) are byte-for-byte identical to the prior audit state.

**Result: Both HIGH/CRITICAL findings (F-01, F-02) PERSIST unchanged.** The `POST /api/notifications/email` endpoint remains fully unauthenticated and publicly callable. All three `.env` files — including `.env.local` (production DATABASE_URL + JWT_SECRET) and `.env.local.QUARANTINED-INCIDENT-20260722` (same JWT_SECRET; incident date 2026-07-22) — remain committed to git HEAD with no `.gitignore` exclusion. The JWT_SECRET was never rotated after the 2026-07-22 incident; it is still active in `.env.local`. Both MEDIUM findings (F-03 fail-open guard, F-04 TLS rejectUnauthorized) also persist. No new findings were discovered. **Do not ship.**

---

## Prior Finding Status

| ID | Title | Prior Severity | Current Status | Evidence |
|----|-------|----------------|----------------|----------|
| F-01 | Unauthenticated email notification endpoint | HIGH | **PERSISTS** | `src/app/api/notifications/email/route.ts:25` — no auth guard added; identical to prior audit |
| F-02 | Production credentials & JWT secret committed to git | CRITICAL | **PERSISTS** | `.env.local:1-2`, `.env.local.QUARANTINED-INCIDENT-20260722:1-2` — still tracked by `git ls-files`; `.gitignore` still has no `.env.local` pattern |
| F-03 | TLS `rejectUnauthorized: false` in DB connection | MEDIUM | **PERSISTS** | `src/lib/db.ts:24` — `ssl: { rejectUnauthorized: false }` unchanged |
| F-04 | `assessmentOpenGuard` fail-open on DB error | MEDIUM | **PERSISTS** | `src/lib/middleware/assessmentOpenGuard.ts:48-51` — catch block returns `{ ok: true }` unchanged |
| F-05 | JWT tokens stored in `localStorage` | LOW | **PERSISTS** | `src/app/dashboard/login/page.tsx:42`, `src/hooks/useSession.ts:27` — unchanged |
| F-06 | Missing Content-Security-Policy header | LOW | **PERSISTS** | `next.config.ts:16-27` — no CSP header added |
| F-07 | No rate limiting on unauthenticated endpoints | LOW | **PERSISTS** | `src/app/api/auth/login/route.ts`, `src/app/api/sessions/route.ts` — no rate limiting added |
| F-08 | System owner email enumeration via login endpoint | LOW | **PERSISTS** | `src/app/api/auth/login/route.ts:38-43` — distinct `NOT_A_SYSTEM_OWNER` (403) vs `INVALID_EMAIL_FORMAT` (400) unchanged |

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
| `POST /api/notifications/email` | S, T | **FINDING F-01 — PERSISTS** — No authentication guard; publicly callable by any client | `src/app/api/notifications/email/route.ts:25` |
| `GET /api/dashboard/responses` | E | SAFE — `requireSystemOwner` guards; `sortBy` whitelist map with safe default | `src/app/api/dashboard/responses/route.ts:8` |
| `GET /api/dashboard/responses/:sessionId` | E, I | SAFE — `requireSystemOwner` guards; returns 404 on unknown ID (no IDOR) | `src/app/api/dashboard/responses/[sessionId]/route.ts:11` |
| `GET /api/dashboard/analytics` | E | SAFE — `requireSystemOwner` guards; `teamTypeFilter` passed to Drizzle `inArray()` (parameterized) | `src/app/api/dashboard/analytics/route.ts:8` |
| `GET /api/dashboard/export/csv` | E | SAFE — `requireSystemOwner` guards; `ilike` with `%search%` is parameterized | `src/app/api/dashboard/export/csv/route.ts:9` |
| `GET /api/config` + `PATCH /api/config` | E | SAFE — both guarded by `requireSystemOwner`; date validated with `Date.parse()`; no arbitrary config fields | `src/app/api/config/route.ts:9,34` |
| `GET /api/health` | I | LOW — unauthenticated, leaks `db: connected/disconnected` and timestamp (acceptable for health endpoint) | `src/app/api/health/route.ts:9` |
| `jwtMiddleware` | S | SAFE — `jose.jwtVerify` with `algorithms: ['HS256']`; `ERR_JWT_EXPIRED` detected | `src/lib/auth/jwtMiddleware.ts:22` |
| `requireSessionOwner` (middleware/) | E | SAFE — independent JWT re-verification; system_owner blocked; case-insensitive email compare | `src/lib/middleware/requireSessionOwner.ts:52-98` |
| `requireSystemOwner` (middleware/) | E | SAFE — `verifyJwt` then `role !== 'system_owner'` check | `src/lib/middleware/requireSystemOwner.ts:28-29` |
| `assessmentOpenGuard` | D | MEDIUM — **FINDING F-04 — PERSISTS** — fail-open on DB error (guard returns `{ok: true}` when DB throws) | `src/lib/middleware/assessmentOpenGuard.ts:48-51` |
| `dashboardService.getResponseList` — `sortBy` | T | SAFE — `sortBy` resolved through a hardcoded whitelist map with safe default (`sessions.submitted_at`) | `src/lib/services/dashboardService.ts:59-67` |
| `analyticsService` — raw `sql\`\`` | T | SAFE — all variable interpolations use `${}` (Drizzle parameterized); `q.id` comes from DB not user | `src/lib/services/analyticsService.ts:91-108` |
| `csvExportService` — `ilike` search | T | SAFE — `ilike(respondents.name, \`%${params.search}%\`)` is parameterized; no raw string concat | `src/lib/services/csvExportService.ts:52-55` |
| `emailService.sendSubmissionConfirmation` | T | MEDIUM — `fetch(relayUrl, ...)` where `relayUrl` = `process.env.EMAIL_RELAY_URL`; env-controlled, not user-controlled | `src/lib/services/emailService.ts:39` |
| `.env`, `.env.local`, `.env.local.QUARANTINED-INCIDENT-20260722` | I | **FINDING F-02 — PERSISTS** — Real production DATABASE_URL (with password) and JWT_SECRET committed to git; `.gitignore` has no `.env.local` entry | `.env.local:1-2`, `.env.local.QUARANTINED-INCIDENT-20260722:1-2` |
| `db.ts` — SSL config | T | MEDIUM — **FINDING F-03 — PERSISTS** — `rejectUnauthorized: false` in non-local mode; `sslmode=no-verify` in `.env.local` | `src/lib/db.ts:24`, `.env.local:1` |
| JWT storage in `localStorage` | I | LOW — **FINDING F-05 — PERSISTS** — tokens stored in `localStorage` not `httpOnly` cookies; XSS risk (no XSS found in codebase) | `src/app/dashboard/login/page.tsx:42`, `src/hooks/useSession.ts:27` |
| Missing `Content-Security-Policy` header | T | LOW — **FINDING F-06 — PERSISTS** — `next.config.ts` sets only `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`; no CSP | `next.config.ts:20-23` |
| `X-Frame-Options` intentionally absent | T | LOW (accepted risk) — explicitly removed to allow Pivota Preview iframe; noted in code comment | `next.config.ts:21` |
| No rate limiting | D | LOW — **FINDING F-07 — PERSISTS** — `POST /api/auth/login` and `POST /api/sessions` have no per-IP rate limiting | `src/app/api/auth/login/route.ts`, `src/app/api/sessions/route.ts` |
| Email enumeration via login | I | LOW — **FINDING F-08 — PERSISTS** — distinct 403 `NOT_A_SYSTEM_OWNER` vs 400 `INVALID_EMAIL_FORMAT` responses | `src/app/api/auth/login/route.ts:38-43` |

---

## Confirmed findings

> Each finding below survived adversarial refutation: input is user-controlled or secret is reachable via repository access; no upstream guard exists; the sink is reachable from the network.

---

### F-01: Unauthenticated Email Notification Endpoint — HIGH (PERSISTS — UNFIXED)

- **Category:** authz_bypass / unauthenticated_public_endpoint
- **Location:** `src/app/api/notifications/email/route.ts:25`
- **Re-audit evidence:** File is byte-for-byte identical to prior audit. `git diff fb52b10 HEAD -- src/app/api/notifications/email/route.ts` produces no output. The route handler at line 25 performs Zod schema validation only, then calls `sendSubmissionConfirmation(parsed.data)` with no preceding `jwtMiddleware`, `requireSessionOwner`, or any other auth check.
- **Confirmed reachable:** `POST /api/notifications/email` requires no credentials. Any unauthenticated caller can supply `{ session_id, email, name, due_date }` and trigger `sendSubmissionConfirmation()`. The `email` field is fully attacker-controlled (`z.string().email()` validates format only, not ownership).
- **Note on submissionService:** `src/app/api/submissions/[sessionId]/route.ts:58` now calls `sendSubmissionConfirmation()` directly as an in-process function — the HTTP endpoint (`/api/notifications/email`) is therefore redundant AND remains exposed.

  **Data flow:** `POST /api/notifications/email` → Zod parse (format only) → `sendSubmissionConfirmation({ email: attacker_value })` → `fetch(EMAIL_RELAY_URL, { to: attacker_value })`

- **Exploit:**
  1. Attacker sends `POST /api/notifications/email` with `{ "session_id": "00000000-0000-0000-0000-000000000000", "email": "victim@example.com", "name": "Victim Name", "due_date": "2027-01-01T00:00:00Z" }` — **no credentials required**.
  2. If `EMAIL_RELAY_URL` is configured, the server dispatches a confirmation email from the platform's address to any target mailbox (spam/phishing vector using the platform's reputation).
  3. Attacker can spam arbitrary addresses at no cost, abusing the platform's email delivery infrastructure.
  4. Even without relay configured, the endpoint exposes internal API surface marked "internal only" but publicly reachable.

- **Fix options (in order of preference):**
  1. **Remove the HTTP route entirely** — `submissionService.ts` already calls `sendSubmissionConfirmation()` directly (line 58); the HTTP route is dead code from the caller's perspective. Delete `src/app/api/notifications/email/route.ts`.
  2. **If the HTTP route must stay:** add a shared-secret header check (`X-Internal-Token: <env var>`) validated at the top of the handler, before the Zod parse.
  3. **Minimum viable fix:** add `requireSessionOwner` so only the session owner can trigger the notification for their own session.

---

### F-02: Production Credentials and JWT Secret Committed to Git Repository — CRITICAL (PERSISTS — UNFIXED)

- **Category:** secret_leak / information_disclosure
- **Location:**
  - `.env.local:1-2` (tracked by git HEAD, confirmed via `git ls-files`)
  - `.env.local.QUARANTINED-INCIDENT-20260722:1-2` (tracked by git HEAD)
  - `.env:1` (JWT_SECRET `uat-test-secret-32-chars-minimum-xxxxxxxx` — weak test secret, also tracked)
- **Re-audit evidence:** `git ls-files` confirms all three files are tracked: exit code 0. `.gitignore` contains no pattern matching `.env.local` or `*.QUARANTINED-INCIDENT-*`. No changes to any of these files since prior audit.
- **Current content of `.env.local`** (confirmed by direct read, 2026-08-10):
  ```
  DATABASE_URL=postgresql://pivota-spec-driven:<URL-encoded-password>@pivota-spec-driven-primary.prod.svc:5432/pivota-spec-driven?sslmode=no-verify
  JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=
  NODE_TLS_REJECT_UNAUTHORIZED=0
  ```
- **Current content of `.env.local.QUARANTINED-INCIDENT-20260722`** (confirmed by direct read, 2026-08-10):
  ```
  DATABASE_URL=postgresql://pivota-spec-driven:<URL-encoded-password>@pivota-spec-driven-primary.prod.svc:5432/pivota-spec-driven
  JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=
  ```
  The file was named `QUARANTINED` on 2026-07-22. As of 2026-08-10 (19 days later), the same `JWT_SECRET` is still present in `.env.local` — indicating the secret was **never rotated** after the quarantine incident.

- **Exploit:**
  1. Any developer, CI system, or third party with repository read access immediately obtains the production `JWT_SECRET` (`q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`).
  2. Using this secret with `jose.jwtVerify` algorithm HS256, attacker forges a valid system_owner JWT: `{ session_id: null, email: "attacker@evil.com", role: "system_owner", iat: <now>, exp: <now+8h> }`.
  3. This forged token passes `requireSystemOwner` (calls `verifyJwt` → `jose.jwtVerify` with the same leaked secret) — granting full access to: `GET /api/dashboard/responses`, `GET /api/dashboard/responses/:sessionId`, `GET /api/dashboard/analytics`, `GET /api/dashboard/export/csv`, `GET/PATCH /api/config`.
  4. Attacker reads all respondent PII (name, email, team type), all assessment answers, and can modify assessment due_date via PATCH /api/config.
  5. The production `DATABASE_URL` additionally exposes the database password; direct DB access is possible if the sidecar network is reachable.

- **Fix:**
  1. **Immediately rotate** `JWT_SECRET` (all active respondent and system-owner sessions will be invalidated — acceptable security trade-off). Rotate the production database password.
  2. Add `.env.local` and `*.QUARANTINED-INCIDENT-*` to `.gitignore`.
  3. Purge both files from git history using `git filter-repo --path .env.local --path ".env.local.QUARANTINED-INCIDENT-20260722" --invert-paths` (or BFG Repo-Cleaner), then force-push (after rotating credentials — rotating makes the history purge less urgent but still required for hygiene).
  4. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from all environments.
  5. Adopt a secret management solution (HashiCorp Vault, K8s Secrets, environment-injected secrets) — never commit real credentials.

---

## Medium findings (do not block ship independently but should be addressed)

### F-03: TLS Certificate Validation Disabled in Production DB Connection — MEDIUM (PERSISTS — UNFIXED)

- **Category:** tampering / information_disclosure
- **Location:** `src/lib/db.ts:24`, `.env.local:1` (`sslmode=no-verify`), `.env.local:5` (`NODE_TLS_REJECT_UNAUTHORIZED=0`)
- **Re-audit evidence:** `src/lib/db.ts` is unchanged since prior audit. Line 24: `ssl: isLocal ? false : { rejectUnauthorized: false }`. The `isLocal` check evaluates to `true` only when `DATABASE_URL` contains `localhost`, `127.0.0.1`, or `sslmode=disable`. The production URL in `.env.local` contains `sslmode=no-verify` (not `sslmode=disable`), so `isLocal` is `false` and `rejectUnauthorized: false` applies in production.
- **Fix:** Set `rejectUnauthorized: true` and supply the CA certificate. Use `sslmode=verify-full` in production connection strings. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from all environments.

---

### F-04: `assessmentOpenGuard` Fail-Open on Database Error — MEDIUM (PERSISTS — UNFIXED)

- **Category:** denial_of_service / tampering
- **Location:** `src/lib/middleware/assessmentOpenGuard.ts:48-51`
- **Re-audit evidence:** File is unchanged. The catch block at lines 48-51 catches any exception and returns `{ ok: true }`, treating the assessment as open when the due_date cannot be verified:
  ```typescript
  } catch {
    // Guard failure is treated as open to not block respondents on DB errors
    return { ok: true };
  }
  ```
  This applies to both `PUT /api/responses/:sessionId` and `POST /api/submissions/:sessionId`. A transient DB failure during the closed-assessment window silently bypasses the deadline gate.
- **Fix:** On DB error, return `503 SERVICE_UNAVAILABLE`. A brief outage blocking saves is safer than silently accepting saves after deadline.

---

## Low findings

### F-05: JWT Tokens Stored in `localStorage` (XSS Exposure) — LOW (PERSISTS)

- **Category:** information_disclosure
- **Location:** `src/app/dashboard/login/page.tsx:42`, `src/hooks/useSession.ts:27`
- **Re-audit evidence:** Both files unchanged. `localStorage.setItem('dashboard_token', data.token)` at line 42 of login page; `localStorage.getItem(SESSION_TOKEN_KEY)` at line 27 of `useSession.ts`. No XSS sinks found (`dangerouslySetInnerHTML`, `eval`, `innerHTML`) in current codebase — risk remains theoretical.
- **Fix:** Move `dashboard_token` (system_owner JWT) to `httpOnly` cookies. Respondent `af_token` is lower-risk given its narrower scope.

---

### F-06: Missing Content-Security-Policy Header — LOW (PERSISTS)

- **Category:** tampering
- **Location:** `next.config.ts:16-27`
- **Re-audit evidence:** File unchanged. Headers set: `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block` (deprecated), `Referrer-Policy: strict-origin-when-cross-origin`. No `Content-Security-Policy` header present.
- **Fix:** Add a restrictive CSP (e.g., `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`).

---

### F-07: No Rate Limiting on Unauthenticated Endpoints — LOW (PERSISTS)

- **Category:** denial_of_service
- **Location:** `src/app/api/auth/login/route.ts`, `src/app/api/sessions/route.ts`
- **Re-audit evidence:** Both route handlers unchanged. No rate-limit middleware, no per-IP counter, no CAPTCHA.
- **Fix:** Add per-IP rate limiting via Next.js middleware or upstream proxy (e.g., 5 req/min on `/api/auth/login`, 10 req/min on `/api/sessions`).

---

### F-08: System Owner Email Enumeration via Login Endpoint — LOW (PERSISTS)

- **Category:** information_disclosure
- **Location:** `src/app/api/auth/login/route.ts:38-43`
- **Re-audit evidence:** Lines 38-43 unchanged. Valid-format unregistered email returns `{ error: { code: 'NOT_A_SYSTEM_OWNER' } }` (403). Invalid email format returns `{ error: { code: 'INVALID_EMAIL_FORMAT' } }` (400). These distinct responses allow email enumeration.
- **Fix:** Return a single generic response regardless of email recognition: e.g., `{ message: "If this email is registered, you will receive access instructions." }` with status 200.

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | `X-Frame-Options` header absent | Required by Pivota Preview iframe embedding; explicitly noted in `next.config.ts:21` | Platform |
| AR-02 | `/api/health` unauthenticated and leaks DB status | Standard health endpoint pattern; status `connected`/`disconnected` is low-sensitivity; required by docker-compose healthcheck | Platform |
| AR-03 | `rejectUnauthorized: false` initially from platform constraint | `sslmode=no-verify` reflects platform-provisioned sidecar constraint; to be resolved with proper CA cert provisioning | Platform |

---

## Audit trail

### Re-audit scope
- **Diff from prior audit:** `git diff fb52b10 HEAD --name-only` — 6 files changed, **none** in `src/` or implementation paths; `.env` files unchanged
- **Key implementation files verified as unchanged:** `src/app/api/notifications/email/route.ts`, `src/lib/db.ts`, `src/lib/middleware/assessmentOpenGuard.ts`, `src/app/api/auth/login/route.ts`, `.env.local`, `.env.local.QUARANTINED-INCIDENT-20260722`, `.gitignore`
- **Re-read files:** All 27 files listed in `<required_reading>` were read in full

### Finding disposition
| Finding | Examined | Confirmed | Refuted | Status |
|---------|----------|-----------|---------|--------|
| F-01 (unauth email endpoint) | ✓ | ✓ | — | PERSISTS HIGH |
| F-02 (secrets in git) | ✓ | ✓ | — | PERSISTS CRITICAL |
| F-03 (TLS rejectUnauthorized) | ✓ | ✓ | — | PERSISTS MEDIUM |
| F-04 (fail-open guard) | ✓ | ✓ | — | PERSISTS MEDIUM |
| F-05 (localStorage JWT) | ✓ | ✓ | — | PERSISTS LOW |
| F-06 (no CSP) | ✓ | ✓ | — | PERSISTS LOW |
| F-07 (no rate limiting) | ✓ | ✓ | — | PERSISTS LOW |
| F-08 (email enumeration) | ✓ | ✓ | — | PERSISTS LOW |
| New candidates | 0 | 0 | 0 | No new findings |

### New-finding scan results (retroactive STRIDE pass on re-audit)
- **Command injection:** No `exec`, `spawn`, `eval` with user input — none found
- **IDOR:** `requireSessionOwner` performs DB email ownership check (case-insensitive) on all respondent routes; `requireSystemOwner` guards all dashboard routes — no IDOR vector found
- **SQL injection:** All Drizzle ORM queries parameterized; raw `sql\`\`` template literals use `${}` (Drizzle binding); `sortBy` uses whitelist map — no injection vector found
- **Path traversal:** No file reads/writes with user-controlled paths — no vector found
- **XXE / unsafe deserialization:** No XML parsing; JSONB payloads validated by Zod discriminated union before DB write — no vector found
- **SSRF:** `emailService.fetch(relayUrl)` — `relayUrl` is `process.env.EMAIL_RELAY_URL` (env-controlled, not user-controlled) — not an SSRF vector
- **XSS sinks:** No `dangerouslySetInnerHTML`, `eval()`, `innerHTML`, or `document.write` in `src/` — none found

### Statistics
- **Candidates examined (total):** 22 (prior) + 8 new STRIDE re-scan = 30
- **Confirmed open HIGH/CRITICAL:** 2 (F-01, F-02)
- **Confirmed open MEDIUM:** 2 (F-03, F-04)
- **Confirmed open LOW:** 4 (F-05, F-06, F-07, F-08)
- **Refuted:** 0 new (all prior refutations stand)
- **Resolved since prior audit:** 0
- **threats_open:** 2
