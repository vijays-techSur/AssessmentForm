# SECURITY AUDIT REPORT

| Field | Value |
|-------|-------|
| **Phase** | assessmentform-express-spa-multi-step-as (Full codebase — Waves 1–11) |
| **Mode** | Retroactive |
| **Audited** | 2026-08-11 |
| **Auditor** | claude-sonnet-4-6 (automated STRIDE audit) |
| **Verdict** | **OPEN_THREATS** |
| **threats_open** | 4 (2 CRITICAL, 1 HIGH, 1 MEDIUM) |
| **threats_lower** | 4 (LOW/INFO) |

---

## 1. Attack Surface (STRIDE Register)

| ID | Area | Route / File | STRIDE | Initial Disposition |
|----|------|-------------|--------|-------------------|
| S1 | JWT signing (authService) | `src/lib/auth/authService.ts` | Spoofing | SAFE — HS256 pinned in `verifyJwt`, jose rejects `none` alg by design |
| S2 | JWT verify without alg pin | `src/lib/middleware/requireSessionOwner.ts:54` | Spoofing | LOW — `none` rejected by jose; no practical downgrade path with symmetric key |
| S3 | JWT storage in localStorage | `src/app/dashboard/login/page.tsx`, `src/hooks/*` | Spoofing | ACCEPTED RISK — XSS-exposed but no HttpOnly cookie alternative in SPA |
| T1 | Session-ownership check on PUT /api/responses | `src/app/api/responses/[sessionId]/route.ts` | Tampering | CONFIRMED MEDIUM — `assessmentOpenGuard` runs *before* auth; unauthenticated timing oracle |
| T2 | Session-ownership check on GET /api/sessions | `src/app/api/sessions/[sessionId]/route.ts` | Tampering | SAFE — jwtMiddleware → requireSessionOwner (HOF) → service double-check |
| T3 | IDOR on POST /api/submissions | `src/app/api/submissions/[sessionId]/route.ts` | Tampering | SAFE — requireSessionOwner (middleware) does full JWT + ownership verification |
| T4 | Raw SQL in analyticsService | `src/lib/services/analyticsService.ts:91–168` | Tampering | SAFE — `q.id` sourced from DB rows, user input never flows into raw SQL |
| T5 | LIKE wildcard injection in search | `src/lib/services/dashboardService.ts:50-51` | Tampering | LOW — causes table scan; no data disclosure; dashboard is system_owner–gated |
| T6 | Input validation on answer payloads | `src/app/api/responses/[sessionId]/route.ts` | Tampering | SAFE — `PutResponsesBodySchema` (Zod) validated before DB write |
| I1 | Secrets committed to git — `.env` | commit `a343e60` | Info Disclosure | CONFIRMED HIGH — JWT_SECRET + DB creds in `.env` committed to repo |
| I2 | Secrets committed to git — `.env.local` | commit `a343e60` | Info Disclosure | CONFIRMED CRITICAL — production JWT_SECRET + production DATABASE_URL (with password) committed |
| I3 | Secrets committed to git — `.env.local.QUARANTINED-INCIDENT-20260722` | commit `a343e60` | Info Disclosure | CONFIRMED CRITICAL — same production creds committed; "QUARANTINED" rename is cosmetic |
| I4 | Hardcoded credentials in docker-compose.yml | `docker-compose.yml:9,31` | Info Disclosure | CONFIRMED MEDIUM — DB password + placeholder JWT_SECRET in committed Compose file |
| I5 | TLS certificate verification disabled | `src/lib/db.ts:24`, `.env.local:5` | Info Disclosure | CONFIRMED HIGH — `rejectUnauthorized: false` for all non-local DB connections |
| I6 | Unauthenticated email notification endpoint | `src/app/api/notifications/email/route.ts` | Info Disclosure / DoS | CONFIRMED MEDIUM — no auth guard; any client can trigger arbitrary emails |
| I7 | JWT returned in API response body | `src/lib/session/sessionService.ts:153` | Info Disclosure | ACCEPTED RISK — design choice; SPA requires token; no server-side session store |
| D1 | No rate limiting on login or session creation | `POST /api/auth/login`, `POST /api/sessions` | DoS | CONFIRMED LOW — brute-force email enumeration possible; no mitigation present |
| D2 | CSV export loads all rows into memory | `src/lib/services/csvExportService.ts` | DoS | LOW — system_owner–gated; not externally exploitable |
| E1 | System Owner role check on all /api/dashboard/* | All dashboard routes | Elevation | SAFE — `requireSystemOwner` (direct-await) applied on every handler |
| E2 | System Owner bypass in HOF requireSessionOwner | `src/lib/auth/requireSessionOwner.ts:18` | Elevation | SAFE — service-level email match blocks cross-session read even after middleware bypass |
| E3 | `assessmentOpenGuard` failure treated as open | `src/lib/middleware/assessmentOpenGuard.ts:48-51` | Elevation | LOW — DB error during guard → assessment treated as open, allowing saves/submissions |

---

## 2. Confirmed Findings

### FIND-01 — Production Credentials Committed to Git (`.env.local`)
| Field | Value |
|-------|-------|
| **ID** | FIND-01 |
| **Severity** | CRITICAL |
| **STRIDE** | Information Disclosure |
| **Location** | `.env.local` committed in `a343e60`; `.env.local.QUARANTINED-INCIDENT-20260722` committed in same commit |
| **CWE** | CWE-312 (Cleartext Storage of Sensitive Information) |

**Description:**  
Commit `a343e60` includes `.env.local` containing the **production** `DATABASE_URL` with embedded credentials for `pivota-spec-driven-primary.prod.svc` and the production `JWT_SECRET`. A second file `.env.local.QUARANTINED-INCIDENT-20260722` (renamed copy) carries the same data. Both are tracked in git history permanently.

**Evidence (committed content):**
```
DATABASE_URL=postgresql://pivota-spec-driven:%3EAhQ%7B-%5D%2FJCVAr%5BHR2%7BdH7YIr@pivota-spec-driven-primary.prod.svc:5432/pivota-spec-driven?sslmode=no-verify
JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=
```

**Exploit:**  
Anyone with read access to the git repository (including CI/CD tokens, forks, or git-log on clones already distributed) can extract the production database password and JWT signing secret. With the JWT secret, an attacker can forge tokens for any role (including `system_owner`) and sign arbitrary session ownership claims, gaining full access to all respondent data and the admin dashboard. With the database password, direct DB access bypasses all application-layer controls.

**Fix:**
1. **Immediately rotate** the production `JWT_SECRET` and database password—the secrets are already in git history.
2. Remove `.env.local` and `.env.local.QUARANTINED-INCIDENT-20260722` from git tracking: `git rm --cached .env.local .env.local.QUARANTINED-INCIDENT-20260722`
3. Add `*.env.local` and `.env.local*` patterns to `.gitignore` (currently absent).
4. Use git-filter-repo or BFG Repo Cleaner to purge all references from history.
5. Consider scanning CI/CD artifacts and any distributed clones.

---

### FIND-02 — Development JWT Secret and DB Password Committed to Git (`.env`)
| Field | Value |
|-------|-------|
| **ID** | FIND-02 |
| **Severity** | HIGH |
| **STRIDE** | Information Disclosure |
| **Location** | `.env` committed in `a343e60` |
| **CWE** | CWE-312 |

**Description:**  
The `.env` file (containing a UAT/dev `JWT_SECRET` and localhost DB credentials) was committed to git history in the same commit. Although lower-risk than production credentials, this secret is in public git history and could be used to forge JWTs in any environment that shares this secret, or to reconstruct dev DB access patterns.

**Evidence:**
```
JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx
DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform
```

**Exploit:**  
Anyone with repo access can forge JWT tokens for any role using the `uat-test-secret` value, gaining system_owner access in any environment running that secret.

**Fix:**
1. Rotate the UAT/dev `JWT_SECRET`.
2. Remove `.env` from git tracking: `git rm --cached .env`
3. Add `.env` to `.gitignore` (currently the `.gitignore` ignores `.next/`, `node_modules/`, etc. but has **no `.env` or `.env.*` pattern**—this is the root cause).
4. Use git-filter-repo to purge from history.

---

### FIND-03 — TLS Certificate Verification Disabled for Production Database
| Field | Value |
|-------|-------|
| **ID** | FIND-03 |
| **Severity** | HIGH |
| **STRIDE** | Information Disclosure / Tampering |
| **Location** | `src/lib/db.ts:24`; `src/lib/db.ts:16-18` (isLocal detection); `.env.local:5` (`NODE_TLS_REJECT_UNAUTHORIZED=0`) |
| **CWE** | CWE-295 (Improper Certificate Validation) |

**Description:**  
The database connection pool sets `ssl: { rejectUnauthorized: false }` for all non-localhost connections (line 24 of `db.ts`). This means the application connects to the production PostgreSQL sidecar without verifying the server certificate, making it vulnerable to TLS MITM attacks. Additionally, `.env.local` sets `NODE_TLS_REJECT_UNAUTHORIZED=0`, which disables Node.js's TLS verification globally for the process, affecting all outbound HTTPS connections (including email relay calls via `fetch()`).

**Evidence:**
```typescript
// src/lib/db.ts:24
ssl: isLocal ? false : { rejectUnauthorized: false },
```
```
# .env.local:5
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Exploit:**  
A network-level attacker between the app container and the database sidecar can perform a MITM attack to intercept all DB queries (reading all respondent data, emails, answers) or inject malicious responses. The process-level TLS bypass also allows MITM on the email relay connection.

**Fix:**
1. Change to `ssl: { rejectUnauthorized: true }` and provide the correct CA certificate via `ca: fs.readFileSync('/path/to/ca.crt')` or equivalent.
2. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from `.env.local` and `scripts/start.sh`.
3. If using the platform sidecar with a self-signed cert, provision the sidecar CA cert and pin it explicitly rather than disabling verification entirely.

---

### FIND-04 — Unauthenticated Email Notification Endpoint
| Field | Value |
|-------|-------|
| **ID** | FIND-04 |
| **Severity** | MEDIUM |
| **STRIDE** | Elevation of Privilege / Denial of Service |
| **Location** | `src/app/api/notifications/email/route.ts` |
| **CWE** | CWE-306 (Missing Authentication for Critical Function) |

**Description:**  
`POST /api/notifications/email` is publicly accessible with no authentication guard. Although documented as "internal server-to-server only," it is a standard HTTP endpoint reachable from the internet. It accepts a Zod-validated schema `{ session_id: UUID, email: string, name: string, due_date: string }` and forwards the call to `sendSubmissionConfirmation()`, which POSTs to the configured `EMAIL_RELAY_URL`. Any unauthenticated attacker can:

1. Trigger arbitrary email sends to any email address they supply.
2. Use it to spam, phish, or impersonate the assessment platform.
3. Enumerate whether `EMAIL_RELAY_URL` is configured (200 vs. network error patterns).

**Refutation check:** Is the endpoint rate-limited or IP-restricted at infrastructure level? No rate limiting is present in the codebase, and no NGINX/WAF config is included. The endpoint is fully exposed.

**Evidence:**
```typescript
// route.ts — no auth check before processing
export async function POST(request: NextRequest) {
  // ... parse body, call sendSubmissionConfirmation()
}
```

**Fix:**
1. Add `requireSystemOwner` (or a shared internal secret header check) to the route handler, or
2. Remove the HTTP endpoint entirely—`sendSubmissionConfirmation()` is already called directly from `submissionService.ts` (server-side), so the HTTP route is redundant and unnecessary.
3. If the HTTP route is retained for architectural reasons, add a pre-shared secret check: `if (req.headers.get('X-Internal-Token') !== process.env.INTERNAL_EMAIL_SECRET) return 401`.

---

## 3. Lower-Severity Findings

| ID | Severity | Title | Location | Notes |
|----|----------|-------|----------|-------|
| FIND-05 | LOW | No rate limiting on login / session creation | `POST /api/auth/login`, `POST /api/sessions` | Allows email enumeration (different error codes for SO vs non-SO) and brute-force session creation. Recommend upstream rate limiter (nginx, Cloudflare, or `express-rate-limit` wrapper). |
| FIND-06 | LOW | `assessmentOpenGuard` failure treated as open | `src/lib/middleware/assessmentOpenGuard.ts:48-51` | A DB error during the guard silently allows saves/submissions after the due date. Should fail closed: return 503 SERVICE_UNAVAILABLE rather than `{ ok: true }`. |
| FIND-07 | LOW | `jwtVerify` without explicit algorithm pin in `requireSessionOwner` middleware | `src/lib/middleware/requireSessionOwner.ts:54` | Does not pass `{ algorithms: ['HS256'] }` unlike `authService.verifyJwt`. Currently safe because jose v6.2.3 rejects `alg:none` with symmetric keys; however explicit pinning is a defense-in-depth practice. |
| FIND-08 | LOW | Missing `.gitignore` patterns for `.env` files | `.gitignore` | The managed `.gitignore` block contains no `**/.env*` pattern. This is the root cause of FIND-01 and FIND-02. Add `.env`, `.env.local`, `.env.*.local`, `.env.local.*` exclusions. |

---

## 4. Accepted Risks

| ID | Area | Rationale |
|----|------|-----------|
| AR-01 | JWT stored in localStorage | Design constraint: SPA with no server-side session store. XSS risk mitigated by Next.js Content Security Policy defaults and React's automatic HTML escaping. Tokens are short-lived (8h/24h). |
| AR-02 | LIKE wildcard injection in `search` parameter | `ilike()` in Drizzle uses parameterized queries; wildcards in user search string cause full-table scans but no data leakage. Route is system_owner–gated. Acceptable for current data volume. |
| AR-03 | CSV export reads all rows into memory | System_owner–gated. Current data scale (assessment cohort) is bounded. Stream-to-disk refactor can be done if scale grows. |
| AR-04 | `docker-compose.yml` has hardcoded DB password | Development-only compose file. The `docker-compose.yml` JWT_SECRET is a placeholder with a comment to replace it. DB password `assessmentform_dev_password` is non-reusable and clearly dev-scoped. Still tracked in git—acceptable for dev tooling. |

---

## 5. Audit Trail

| Step | Finding | Evidence Checked | Result |
|------|---------|-----------------|--------|
| IDOR / Session ownership — responses | FIND-01 path | `src/lib/middleware/requireSessionOwner.ts:73-98` — DB lookup + email comparison | SAFE |
| IDOR / Session ownership — sessions | — | `src/lib/auth/requireSessionOwner.ts:23-43` + `sessionService.ts:200-203` | SAFE |
| IDOR / Session ownership — submissions | — | `src/lib/middleware/requireSessionOwner.ts:65-98` | SAFE |
| Auth bypass on dashboard routes | — | All 4 dashboard handlers checked for `requireSystemOwner` | SAFE |
| JWT algorithm pinning | FIND-07 | `jwtVerify` in `requireSessionOwner.ts:54`, `config/route.ts:61` | LOW |
| JWT secret source | — | `getJwtSecret()` in `authService.ts:7-10` | SAFE |
| JWT secret length enforcement | — | No length check in code; `.env` has 41-char secret | No enforcement |
| Secrets in committed files | FIND-01, FIND-02, FIND-08 | `git show a343e60 -- .env.local .env docker-compose.yml` | CRITICAL / HIGH |
| TLS verification | FIND-03 | `src/lib/db.ts:24`, `.env.local:5`, `scripts/start.sh:7` | HIGH |
| ORM injection (Drizzle) | — | All DB calls use parameterized Drizzle queries; raw SQL uses tagged `sql` template (parameterized) | SAFE |
| Raw SQL in analyticsService | — | `q.id` values come from DB select of questions table, not user input | SAFE |
| Answer payload validation | — | `PutResponsesBodySchema` Zod schema at route entry | SAFE |
| Assessment closed enforcement | FIND-06 | `assessmentOpenGuard.ts:48-51` catch block | LOW |
| Email endpoint auth | FIND-04 | `src/app/api/notifications/email/route.ts` — no auth import | MEDIUM |
| Rate limiting | FIND-05 | Grep for `rateLimit`, `throttle`, middleware configs | None found |
| Mass assignment / over-exposure | — | Dashboard service selects explicit columns; no `SELECT *` on sensitive tables | SAFE |
| Path traversal | — | No `readFile` or `require(userInput)` patterns found | SAFE |
| Content-Disposition injection | — | Filename uses server-generated date `new Date().toISOString()` | SAFE |
| SSRF via email relay | — | `EMAIL_RELAY_URL` set by operator env, not user-supplied | Accepted risk |
| `system_owner` bypass in HOF | — | `sessionService.getSessionById` re-checks `callerEmail !== respondent_email` | SAFE |
