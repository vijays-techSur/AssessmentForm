# Security Report — Express: assessmentform-express-spa-multi-step-as

**Mode:** retroactive  
**Audited:** 2026-08-10  
**Verdict:** OPEN_THREATS  
**Confirmed HIGH/CRITICAL:** 5  

---

## Summary

This Next.js 16 App Router assessment-form application has a well-structured authentication and authorisation layer (JWT HS256 with dual middleware chains, ownership checks, role separation). The majority of SQL access uses Drizzle ORM with parameterised bindings, which eliminates classic SQL-injection paths. However, the audit uncovered **five confirmed HIGH/CRITICAL findings**:

1. **Production database credentials and JWT signing secret committed to git** — `.env.local` (and its quarantined copy) were added in the `382d771` commit, exposing a real production PostgreSQL connection string (with password) and a production JWT signing secret to every git clone of the repo.
2. **`/api/notifications/email` is unauthenticated and externally reachable** — any unauthenticated caller can POST to this endpoint and trigger `sendSubmissionConfirmation`, which sends a `fetch()` to whatever `EMAIL_RELAY_URL` is configured. This is a confirmed SSRF/email-abuse surface.
3. **`docker-compose.yml` ships a known-weak JWT secret** hardcoded as a literal string that is identical to `.env.example`. Operators who `docker-compose up` without customising env get a predictably weak HS256 signing key.
4. **No Content Security Policy (CSP) header is set**, and `X-Frame-Options` is deliberately omitted to allow iframe embedding. With JWTs in `localStorage`, a successful XSS or clickjacking attack can exfiltrate all tokens.
5. **No rate limiting on the login endpoint** (`/api/auth/login`) — the email-enumeration timing oracle is open to unlimited brute-force against the `system_owner_emails` table.

Additionally, three MEDIUM findings are reported: `rejectUnauthorized: false` on the DB TLS connection in non-local environments, an unbounded `responses[]` array in the auto-save payload (no max-item count), and the `NODE_TLS_REJECT_UNAUTHORIZED=0` committed to `.env.local` which disables TLS verification process-wide.

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| `POST /api/auth/login` — email-based SO login | S, D | CONFIRMED: no rate limit (D); enum oracle (I) | `src/app/api/auth/login/route.ts:14` |
| `POST /api/sessions` — respondent session create/resume | T, S | Safe — Zod validation, SO-blocked | `src/app/api/sessions/route.ts:32` |
| `GET /api/sessions/:sessionId` — session fetch | S, E | Safe — jwtMiddleware + requireSessionOwner | `src/app/api/sessions/[sessionId]/route.ts:38` |
| `PUT /api/responses/:sessionId` — auto-save | T, E | MEDIUM: unbounded array; question_id not validated vs DB | `src/app/api/responses/[sessionId]/route.ts:27` |
| `POST /api/submissions/:sessionId` — finalise | E | Safe — requireSessionOwner blocks SO | `src/app/api/submissions/[sessionId]/route.ts:27` |
| `GET /api/sections` — section list | I | Safe — jwtMiddleware required | `src/app/api/sections/route.ts:45` |
| `GET /api/sections/:id/questions` — question fetch | I | Safe — jwtMiddleware required | `src/app/api/sections/[sectionId]/questions/route.ts:42` |
| `GET /api/dashboard/responses` — list | E, I | Safe — requireSystemOwner enforced | `src/app/api/dashboard/responses/route.ts:8` |
| `GET /api/dashboard/responses/:sessionId` — detail | E, I | Safe — requireSystemOwner enforced | `src/app/api/dashboard/responses/[sessionId]/route.ts:11` |
| `GET /api/dashboard/analytics` — analytics | E | Safe — requireSystemOwner enforced | `src/app/api/dashboard/analytics/route.ts:8` |
| `GET /api/dashboard/export/csv` — CSV export | E, I | Safe — requireSystemOwner enforced | `src/app/api/dashboard/export/csv/route.ts:9` |
| `GET /api/config` + `PATCH /api/config` — config | E, T | Safe — requireSystemOwner enforced; date validated | `src/app/api/config/route.ts:8,33` |
| `GET /api/health` — health check | I | Acceptable — returns only `{status, db, timestamp}` | `src/app/api/health/route.ts:9` |
| `POST /api/notifications/email` — email relay | T, I | **CONFIRMED HIGH**: no auth; SSRF/abuse vector | `src/app/api/notifications/email/route.ts:25` |
| JWT middleware chain (jwtMiddleware) | S | Safe — `algorithms: ['HS256']` pinned | `src/lib/auth/authService.ts:31` |
| requireSessionOwner (middleware layer) | E | Safe — DB join + email comparison | `src/lib/middleware/requireSessionOwner.ts:36` |
| requireSystemOwner (middleware layer) | E | Safe — role check after signature verify | `src/lib/middleware/requireSystemOwner.ts:17` |
| assessmentOpenGuard | T | Safe — server-side date comparison | `src/lib/middleware/assessmentOpenGuard.ts:16` |
| dashboardService sortBy / sortDir | T | Safe — whitelist map with fallback default | `src/lib/services/dashboardService.ts:59-67` |
| dashboardService teamType filter (SQL ANY) | T | Low — Drizzle parameterises array; DB-side type check | `src/lib/services/dashboardService.ts:34` |
| analyticsService raw sql`` template | T | Safe — all variables are Drizzle column refs or parameterised | `src/lib/services/analyticsService.ts:91-108` |
| csvExportService — unbounded export | D | Low — system_owner-gated; pagination not applicable | `src/lib/services/csvExportService.ts:59` |
| `.env` / `.env.local` / `.env.local.QUARANTINED` committed | I | **CONFIRMED CRITICAL**: production secrets in git history | `382d771` commit |
| `docker-compose.yml` JWT_SECRET | I | **CONFIRMED HIGH**: weak literal default key shipped | `docker-compose.yml:31` |
| `db.ts` — `rejectUnauthorized: false` | I | **CONFIRMED MEDIUM**: MITM-able DB TLS in cloud | `src/lib/db.ts:24` |
| `next.config.ts` — no CSP, no X-Frame-Options | T | **CONFIRMED HIGH**: localStorage tokens + framing risk | `next.config.ts:21` |
| JWT in localStorage (respondent + dashboard) | I | MEDIUM — XSS-accessible; no HttpOnly cookie | `src/hooks/useSession.ts:6-7` |
| No rate limiting on login or session creation | D | **CONFIRMED HIGH**: brute-force / enumeration | `src/app/api/auth/login/route.ts` |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` in committed `.env.local` | I | MEDIUM — process-wide TLS bypass | `.env.local:5` |

---

## Confirmed findings

---

### FINDING-01 — Production secrets committed to git repository

| Field | Value |
|-------|-------|
| **ID** | FINDING-01 |
| **Severity** | CRITICAL |
| **Category** | Information Disclosure (STRIDE: I) |
| **Location** | `.env.local` (commit `382d771`), `.env.local.QUARANTINED-INCIDENT-20260722` (commit `382d771`), `.env` (commit `382d771`) |

**Description**  
Three env files containing real credentials were tracked and committed to git in commit `382d771`:

- `.env.local` — production PostgreSQL DSN with URL-encoded password (`%3EAhQ%7B-%5D%2FJCVAr%5BHR2%7BdH7YIr`) for `pivota-spec-driven-primary.prod.svc:5432`; production JWT signing secret `q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`; `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- `.env.local.QUARANTINED-INCIDENT-20260722` — same production DB DSN and JWT secret (earlier capture of the same credentials, noted as a prior incident).
- `.env` — non-production JWT secret (`uat-test-secret-32-chars-minimum-xxxxxxxx`) + local DB DSN with plaintext password.

All three files are present in the current HEAD (`git ls-files` confirms). Any git clone of this repository exposes the production database password and JWT signing secret.

**Exploit**  
Clone the repo → read `.env.local` → connect directly to `pivota-spec-driven-primary.prod.svc:5432` as `pivota-spec-driven`. Alternatively, forge valid system_owner JWTs using the leaked `q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=` secret with `alg: HS256`, gaining full dashboard access including all respondent PII and CSV export of all assessment answers.

**Fix**  
1. **Immediately rotate** the PostgreSQL password for `pivota-spec-driven` and the JWT secret (rotation invalidates all active sessions, which is acceptable given the breach).  
2. Remove all three files from git history with `git filter-repo --path .env.local --invert-paths` (and similarly for the quarantined copy and `.env`).  
3. Add `.env`, `.env.local`, `.env.local.*` to `.gitignore` so they can never be re-committed.  
4. Audit all git clones and CI/CD pipelines that had access to this repo for credential use.

---

### FINDING-02 — `/api/notifications/email` is unauthenticated and externally callable (SSRF / email abuse)

| Field | Value |
|-------|-------|
| **ID** | FINDING-02 |
| **Severity** | HIGH |
| **Category** | Elevation of Privilege / Tampering (STRIDE: E, T) |
| **Location** | `src/app/api/notifications/email/route.ts:25` |

**Description**  
The `POST /api/notifications/email` endpoint has no authentication check whatsoever. The code comments state "Internal server-to-server only (no external auth)" but the route is exposed publicly as a Next.js API route. Any unauthenticated external caller can POST a valid JSON payload (validated by `EmailNotificationSchema` — only requires a valid UUID, email string, name, and due_date) and trigger `sendSubmissionConfirmation`. That function calls `fetch(EMAIL_RELAY_URL, ...)` with the attacker-controlled `email` field in the `to:` field.

**Exploit**  
```bash
curl -X POST https://app.example.com/api/notifications/email \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"00000000-0000-0000-0000-000000000001",
       "email":"victim@example.com",
       "name":"Test",
       "due_date":"2026-12-31"}'
```
This sends an official-looking "Assessment Submitted" email to any arbitrary email address, using the application's email relay. At minimum this enables phishing and email harassment. If `EMAIL_RELAY_URL` is an internal service URL, this is also an SSRF vector — an attacker can probe internal services by changing `session_id` / `email` values and observing error timing (though output is fire-and-forget).

**Refutation attempt**: Could `EMAIL_RELAY_URL` being unset mitigate this? Only partially — the guard at `emailService.ts:22` is a no-op check, but the endpoint still returns `{ sent: true }` and does not expose the relay URL. However, if `EMAIL_RELAY_URL` is set (which it must be in any production email-enabled deployment), the abuse is fully active.

**Fix**  
Add authentication to the endpoint — either:
- Require a valid system_owner JWT (`requireSystemOwner`), or  
- Require a pre-shared internal API secret header (`X-Internal-Token`) validated against an env var, or  
- Remove the HTTP endpoint entirely and call `sendSubmissionConfirmation` directly from `submissionService` (it is already doing this at `src/app/api/submissions/[sessionId]/route.ts:58`). The HTTP endpoint duplicates an internal call path and serves no additional purpose.

---

### FINDING-03 — `docker-compose.yml` ships a predictable, known-weak JWT signing secret

| Field | Value |
|-------|-------|
| **ID** | FINDING-03 |
| **Severity** | HIGH |
| **Category** | Spoofing / Information Disclosure (STRIDE: S, I) |
| **Location** | `docker-compose.yml:31` |

**Description**  
`docker-compose.yml` hardcodes `JWT_SECRET: change-me-to-a-cryptographically-random-256-bit-value`. This string is 57 characters long, is publicly readable in the repository, and is identical to the placeholder in `.env.example`. Any operator who runs `docker-compose up` without setting a custom `JWT_SECRET` will operate the application with this fixed, publicly known signing secret. An attacker who knows the secret can sign arbitrary JWTs with `role: "system_owner"`, bypassing login entirely.

**Exploit**  
```javascript
const { SignJWT } = require('jose');
const secret = new TextEncoder().encode('change-me-to-a-cryptographically-random-256-bit-value');
const token = await new SignJWT({ session_id: null, email: 'attacker@example.com', role: 'system_owner' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('8h')
  .sign(secret);
// Use token in Authorization: Bearer <token> on any /api/dashboard/** route
```

**Refutation attempt**: Is the weak key applied only to development? The `docker-compose.yml` also sets `NODE_ENV: production` on line 33, meaning this exact secret can be used in production deployments that follow the provided compose file without modification. The comment in `.env.example` says "WARNING: Changing this value invalidates ALL existing sessions" which may discourage operators from rotating the key once set.

**Fix**  
Remove the literal placeholder from `docker-compose.yml`. Instead, require `JWT_SECRET` to be provided externally (e.g., via a `.env` file not shipped with the repository, or a Docker secrets mechanism). Add a startup check that rejects the known-weak placeholder value at application boot:
```typescript
if (secret === 'change-me-to-a-cryptographically-random-256-bit-value') {
  throw new Error('JWT_SECRET must be changed from the default placeholder value.');
}
```

---

### FINDING-04 — No Content Security Policy; `X-Frame-Options` intentionally absent; JWT tokens in `localStorage`

| Field | Value |
|-------|-------|
| **ID** | FINDING-04 |
| **Severity** | HIGH |
| **Category** | Tampering / Information Disclosure (STRIDE: T, I) |
| **Location** | `next.config.ts:16-28`, `src/hooks/useSession.ts:6-7`, `src/components/dashboard/AuthGuard.tsx:35` |

**Description**  
Three related weaknesses compound each other:

1. **No `Content-Security-Policy` header** is set in `next.config.ts`. The `headers()` function only sets `X-Content-Type-Options`, `X-XSS-Protection` (deprecated), and `Referrer-Policy`. Without a CSP, any XSS vulnerability (current or future) will be able to read `localStorage` in full.

2. **`X-Frame-Options` is deliberately not set** (comment at `next.config.ts:21`: "Do NOT set X-Frame-Options — Pivota Preview embeds this app in an iframe"). The `allowedDevOrigins` allows `*.preview.pivota-ng.pivota.dev`. Without `X-Frame-Options` or a CSP `frame-ancestors` directive restricted to the Pivota preview origin, the application can be framed by any third-party page, enabling clickjacking attacks against authenticated respondents and system owners.

3. **Both JWT tokens (`af_token` and `dashboard_token`) are stored in `localStorage`** (`src/hooks/useSession.ts:6-7`, `src/components/dashboard/AuthGuard.tsx:35`). `localStorage` is synchronously accessible to all JavaScript on the same origin, meaning a single XSS flaw allows full token exfiltration and session hijacking.

**Exploit**  
An attacker who can inject a `<script>` tag (via a reflected XSS in a URL parameter rendered unsanitised, or via a stored XSS in a future feature) can call `localStorage.getItem('af_token')` and `localStorage.getItem('dashboard_token')` to silently steal all active session tokens. With the system_owner token, all respondent PII and assessment data is accessible. Clickjacking (framing from a malicious page) can additionally be used to trick an authenticated system_owner into changing the assessment due-date via PATCH /api/config.

**Fix**  
- Add a restrictive `Content-Security-Policy` header in `next.config.ts`. A starting baseline for Next.js App Router:  
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'self' https://*.preview.pivota-ng.pivota.dev`
- Add `frame-ancestors` in the CSP (which supersedes `X-Frame-Options`) restricted to the Pivota preview origin.
- Consider migrating JWT storage to `HttpOnly` secure cookies (requires server-side `Set-Cookie` and CSRF protection for state-mutating endpoints) to remove localStorage as an XSS exfiltration target.

---

### FINDING-05 — No rate limiting on `/api/auth/login` (brute-force and email enumeration)

| Field | Value |
|-------|-------|
| **ID** | FINDING-05 |
| **Severity** | HIGH |
| **Category** | Denial of Service / Information Disclosure (STRIDE: D, I) |
| **Location** | `src/app/api/auth/login/route.ts:14-60` |

**Description**  
The `POST /api/auth/login` endpoint performs a database lookup (`isSystemOwnerEmail`) on every request and returns a distinct error code/message for unregistered vs. registered (but blocked) emails. There is no rate limiting, no lockout, no CAPTCHA, and no account lockout. An attacker can:

1. **Enumerate system owner emails** — the endpoint returns `NOT_A_SYSTEM_OWNER` for unrecognised emails and `{ token, role, email }` for valid ones. Timing differences between a DB miss and a DB hit may also leak information.
2. **Brute-force the email list** — by submitting a dictionary of common corporate email addresses, an attacker can identify all system owners without any throttling.

The `POST /api/sessions` (respondent session creation) is similarly unrate-limited, but the impact is lower since it does not gate privileged access.

**Exploit**  
```bash
for email in cto@company.com admin@company.com sysadmin@company.com ...; do
  curl -s -X POST https://app/api/auth/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\"}" | jq .
done
```
Valid system owner emails receive a signed JWT with `role: system_owner`; invalid emails return a 403 error, allowing complete enumeration.

**Fix**  
- Add a rate limit at the Next.js middleware layer or via an `upstash/ratelimit` / `next-rate-limit` integration (e.g., 5 attempts per IP per 15 minutes for the login endpoint).
- Return a uniform response for both hit and miss cases (timing-equalize the DB miss path with a constant-time dummy lookup or `await new Promise(r => setTimeout(r, 200))`).
- Consider adding exponential backoff or a temporary lockout after N consecutive failures from the same IP.

---

## Medium findings (non-blocking, should be tracked)

### FINDING-06 — `rejectUnauthorized: false` on database TLS connection

| Field | Value |
|-------|-------|
| **ID** | FINDING-06 |
| **Severity** | MEDIUM |
| **Category** | Information Disclosure (STRIDE: I) |
| **Location** | `src/lib/db.ts:24` |

**Description**  
In non-local environments (cloud/production), the PostgreSQL pool is configured with `ssl: { rejectUnauthorized: false }`. This disables certificate chain validation, making the DB connection vulnerable to TLS MITM attacks on the same network segment. All PII (respondent email, name, team type, assessment answers) and JWT secrets stored in the DB transit over an unverified TLS channel.

This is compounded by `.env.local:1` which also adds `sslmode=no-verify` to the DSN, and `NODE_TLS_REJECT_UNAUTHORIZED=0` at line 5 of the same file, which disables TLS verification for all `fetch()` calls process-wide including the email relay.

**Fix**  
Set `rejectUnauthorized: true` and provision the CA certificate for the managed Postgres instance. Pass the CA cert path via an env var (e.g., `PG_CA_CERT`). Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from all env files.

---

### FINDING-07 — Unbounded `responses[]` array in auto-save payload

| Field | Value |
|-------|-------|
| **ID** | FINDING-07 |
| **Severity** | MEDIUM |
| **Category** | Denial of Service (STRIDE: D) |
| **Location** | `src/lib/schemas/answerPayload.ts:70`, `src/lib/services/responseService.ts:24-41` |

**Description**  
`PutResponsesBodySchema` accepts `responses: z.array(ResponseItemSchema)` with no `.max()` bound. A malicious respondent (who holds a valid JWT) can POST a `responses` array with thousands of entries. Each entry triggers a DB upsert in a single `INSERT … ON CONFLICT DO UPDATE` batch. With `free_text_long` payloads at 2 KB each, a request containing 10,000 entries would be a 20 MB JSON payload that is fully deserialized and batched to Postgres in one operation.

**Fix**  
Add `.max(200)` (or the actual maximum question count across all sections, e.g., 50) to the `responses` array schema:
```typescript
responses: z.array(ResponseItemSchema).max(200),
```
Also enforce a `Content-Length` / `bodySize` limit in the route handler or Next.js config.

---

### FINDING-08 — `question_id` not validated against DB for the session's sections

| Field | Value |
|-------|-------|
| **ID** | FINDING-08 |
| **Severity** | LOW |
| **Category** | Tampering (STRIDE: T) |
| **Location** | `src/lib/services/responseService.ts:26-42`, `src/lib/schemas/answerPayload.ts:61-63` |

**Description**  
The auto-save endpoint validates `question_id` as a UUID string only. It does not verify that the submitted `question_id` belongs to a question in the respondent's assigned sections. A respondent could save an answer for a question UUID from a section they were not routed to (e.g., a question in the `platform_engineering` section while they are `program_project`). The DB FK constraint ensures the question UUID must exist in the `questions` table, but cross-section contamination is possible.

The practical impact is limited because analytics and dashboard views query questions via their section routing, and the submission mandatory-check only inspects the respondent's `section_ids_ordered`. Contaminated rows would generally be ignored in reporting, but could pollute analytics queries.

**Fix**  
In `upsertResponses`, validate that each `question_id` belongs to a section in the session's `section_ids_ordered` list. Fetch the session's `section_ids_ordered` at the start of the upsert and filter out any question not belonging to those sections before inserting.

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | `X-XSS-Protection: 1; mode=block` is set but deprecated in modern browsers | Provides defence in depth for legacy browsers; CSP (FINDING-04 fix) is the correct modern control | Security team |
| AR-02 | Health endpoint (`/api/health`) is unauthenticated | Only exposes `{ status, db, timestamp }` — no PII or internal info; required for load-balancer liveness checks | Platform team |
| AR-03 | Dashboard JWT verified client-side only for route protection | Server enforces auth on every API call via `requireSystemOwner`; client guard is a UX-only optimisation, not a security boundary | Engineering team |

---

## Audit trail

- **Diff scoped via:** entire develop branch (express whole-diff mode); base = first commit; all files are new
- **Register:** built retroactively from diff (retroactive mode — no PLAN.md threat register)
- **Refutation:** 28 candidates examined, 8 confirmed (5 HIGH/CRITICAL, 3 MEDIUM/LOW), 20 refuted as safe
- **Key safe determinations:**
  - SQL injection refuted: all Drizzle ORM queries use parameterised bindings; `sql\`\`` tagged templates pass column refs as Drizzle AST nodes, not raw strings; `sortBy` uses an allowlist map with a safe fallback
  - IDOR refuted: `requireSessionOwner` (both middleware copies) enforces DB-level email ownership on all respondent-scoped routes; system_owner bypass is intentional and scoped to dashboard routes only
  - JWT algorithm confusion refuted: `verifyJwt` passes `{ algorithms: ['HS256'] }` as a jwtVerify option, pinning the algorithm
  - Mass assignment refuted: Zod schemas strip extra fields; Drizzle insert/update calls explicitly name columns
  - Path traversal refuted: no file reads from user input anywhere in the codebase
