# Security Report — Express: assessmentform-express-spa-multi-step-as

**Mode:** retroactive
**Audited:** 2026-07-20
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 2

---

## Summary

The Multi-Step Assessment Form SPA implements a broadly sound JWT/HS256 + Drizzle ORM security
posture for its core respondent and dashboard flows. The server-side ownership checks are DB-verified
(not JWT-claim-only), all DB queries use parameterized statements, and dashboard routes are uniformly
protected by `requireSystemOwner`. However, two confirmed HIGH-severity issues exist: (1) a JWT
secret committed verbatim into `.env` with inadequate entropy, exposing it to anyone with repository
read access and enabling token forgery; (2) an unauthenticated `POST /api/notifications/email` HTTP
endpoint that can be abused as an open spam relay when `EMAIL_RELAY_URL` is configured. Several
lower-severity design-choice issues are also noted.

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| `POST /api/auth/login` — System Owner login | Spoofing | ✅ SAFE | DB-side email check via `isSystemOwnerEmail`; Zod email validation; JWT signed server-side. `authService.ts:38-44`, `login/route.ts:37` |
| `GET /api/sessions/:sessionId` — respondent session load | Spoofing, EoP | ✅ SAFE | `jwtMiddleware` → `requireSessionOwner` (DB ownership verify, case-insensitive). `sessions/[sessionId]/route.ts:42-44`, `auth/requireSessionOwner.ts:23-43` |
| `PUT /api/responses/:sessionId` — auto-save | Tampering, EoP | ✅ SAFE | `requireSessionOwner` (middleware version) verifies JWT + DB ownership. Zod `PutResponsesBodySchema` validates all payloads. `responses/[sessionId]/route.ts:40-66` |
| `POST /api/submissions/:sessionId` — finalize submission | EoP, Tampering | ✅ SAFE | `requireSessionOwner` blocks system_owner; DB ownership check; `assessmentOpenGuard` enforces due date server-side. `submissions/[sessionId]/route.ts:35-42` |
| `POST /api/notifications/email` — email notification | Tampering, DoS | ⚠️ **FINDING SEC-001** | No auth on route; arbitrary email target; spam relay risk. `notifications/email/route.ts:1-45` |
| `GET /api/dashboard/responses` — paginated list | EoP, ID | ✅ SAFE | `requireSystemOwner` enforces JWT + `role === 'system_owner'`. `dashboard/responses/route.ts:8-9` |
| `GET /api/dashboard/responses/:sessionId` — drill-down | EoP, ID | ✅ SAFE | `requireSystemOwner` guards. `dashboard/responses/[sessionId]/route.ts:11-12` |
| `GET /api/dashboard/analytics` — analytics data | EoP | ✅ SAFE | `requireSystemOwner` guards. `analytics/route.ts:8-9` |
| `GET /api/dashboard/export/csv` — CSV export | EoP | ✅ SAFE | `requireSystemOwner` guards. `export/csv/route.ts:9-10` |
| `GET /api/config` + `PATCH /api/config` — config management | EoP, Tampering | ✅ SAFE | `requireSystemOwner` guards both methods. `config/route.ts:9-10, 34-35` |
| `GET /api/health` — health check | ID | ✅ SAFE (LOW) | Returns `{ status, db, timestamp }` only; no stack trace or connection string. `health/route.ts:16-31` |
| JWT secret — `JWT_SECRET` env var | ID, Tampering | ⚠️ **FINDING SEC-002** | Weak secret committed to git in `.env`. `.env:1`, git commit `daf62b5` |
| JWT verification — algorithm pinning | Tampering | ✅ SAFE | `jose` v6 `Uint8Array` key enforces HS* only via `check_key_type.js`; algorithm confusion not possible. `authService.ts:31` |
| JWT verification — middleware divergence | Tampering | ✅ SAFE (LOW) | Two `requireSessionOwner` implementations (`auth/` vs `middleware/`); both call `jwtVerify` with same HMAC key. No algorithm pinning gap. `middleware/requireSessionOwner.ts:53-55` |
| SQL injection — Drizzle ORM queries | Tampering | ✅ SAFE | All parameterized via Drizzle's query builder or `sql` tag. Raw `sql`` ` only wraps column references, not user strings. `dashboardService.ts:34`, `sessionService.ts:90` |
| IDOR — respondent accessing other sessions | EoP | ✅ SAFE | DB-verified email match on every session-scoped write/read. `middleware/requireSessionOwner.ts:92-98` |
| `teamType` input validation — sections API | Tampering | ✅ SAFE | Server-side allowlist via `isValidTeamType()`. `sections/route.ts:26-31` |
| `teamType` — dashboard filter (unvalidated) | Tampering | ✅ LOW | `teamType[]` passed to `inArray()` without allowlist in dashboard/analytics; Drizzle parameterizes, no SQL injection, but invalid values cause empty result rather than error. `dashboardService.ts:32-35` |
| `sortBy` column injection | Tampering | ✅ SAFE | Resolved via `sortColumnMap` allowlist with safe default. `dashboardService.ts:59-67` |
| `search` parameter — LIKE wildcards | DoS | ✅ LOW | `%${search}%` with unescaped `%`/`_` allows unbounded LIKE scan; Drizzle parameterizes value but no wildcard escaping. `dashboardService.ts:50-51` |
| Free-text `answer_payload` — mass assignment | Tampering | ✅ SAFE | Discriminated Zod union enforces type+payload structure; no open-ended blob write. `answerPayload.ts:47-54` |
| `assessmentOpenGuard` ordering | ID | ✅ LOW | Guard runs before auth check in `PUT /api/responses` — unauthenticated probe can determine if assessment is open/closed (403 vs 401). `responses/[sessionId]/route.ts:36-41` |
| Client-side auth guard — dashboard | EoP | ✅ SAFE (INFO) | Dashboard `AuthGuard.tsx` decodes JWT client-side; server-side `requireSystemOwner` is the real gate on every API call. Accepted design. `dashboard/AuthGuard.tsx:6-14` |
| Token storage — localStorage | ID | ✅ INFO | JWTs in `localStorage` (`af_token`, `dashboard_token`) are XSS-accessible. Accepted architectural trade-off for SPA. `useSession.ts:6-7`, `login/page.tsx:42` |
| System Owner email block | EoP | ✅ SAFE | Server-side `isSystemOwnerEmail` check before session creation. `sessions/route.ts:75-86` |
| Due-date enforcement | Tampering | ✅ SAFE | `assessmentOpenGuard` reads config from DB server-side on every save/submit. `assessmentOpenGuard.ts:20-45` |
| Hardcoded secrets in source | ID | ✅ SAFE | No hardcoded secrets; all use `process.env.JWT_SECRET`. `authService.ts:8-10` |
| `.gitignore` — `.env` exclusion | ID | ⚠️ **FINDING SEC-002** | `.env` pattern missing from `.gitignore`; file is tracked. `.gitignore` (full file) |
| CSP header | ID | ✅ LOW | No `Content-Security-Policy` header set; mitigated by same-origin SPA and Referrer-Policy. `next.config.ts:11-24` |
| CSRF protection | Tampering | ✅ SAFE | All mutations require `Authorization: Bearer` header; cannot be set by cross-origin forms. |
| Rate limiting — login | DoS | ✅ INFO | No rate limiting on `POST /api/auth/login` or `POST /api/sessions`; accepted risk for internal tool. |

---

## Confirmed findings

### SEC-001 — HIGH: Unauthenticated Email Relay Endpoint

**Severity:** HIGH  
**STRIDE:** Tampering / Denial of Service  
**File:** `src/app/api/notifications/email/route.ts:1-45`

**Description:**  
`POST /api/notifications/email` requires no authentication or authorization. Any actor on the
internet can POST a valid JSON body `{ session_id, email, name, due_date }` and trigger an email
to an arbitrary address. When `EMAIL_RELAY_URL` is configured in production, this constitutes an
open spam relay. The `name` field is inserted verbatim into the email body (`Dear ${params.name}`)
with no length cap and no SMTP header injection sanitization.

**Adversarial refutation check:**  
- ✅ Input is fully user-controlled (`email`, `name`, `due_date`).  
- ✅ No upstream guard exists (confirmed: no `requireSystemOwner` or `jwtMiddleware`).  
- ✅ Sink is reachable and exploitable when `EMAIL_RELAY_URL` is set; the route returns `200 { sent: true }` for valid schema input regardless of outcome.

**Attack path:**
```
POST /api/notifications/email HTTP/1.1
Content-Type: application/json

{
  "session_id": "00000000-0000-0000-0000-000000000001",
  "email": "victim@example.com",
  "name": "Winner\r\nBCC: spam@attacker.com",
  "due_date": "2026-01-01"
}
```
When `EMAIL_RELAY_URL` is configured, this sends an email to the `victim@example.com` address
with attacker-controlled body content and a potentially injected `BCC` header.

**Fix:**  
Add `requireSystemOwner` (or at minimum a shared secret header check) to this route, OR remove the
public HTTP endpoint entirely and only call `sendSubmissionConfirmation` directly (which is already
done in `submissions/[sessionId]/route.ts:58`). The HTTP route is unnecessary — the internal direct
import is the production code path.

---

### SEC-002 — HIGH: JWT Secret Committed to Git Repository

**Severity:** HIGH  
**STRIDE:** Information Disclosure / Spoofing  
**File:** `.env:1`, git commit `daf62b5`

**Description:**  
The file `.env` containing `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` was committed
to the repository and is tracked by git. The secret (41 ASCII chars, low entropy, predictable
pattern) is now in the git history. Anyone with repository read access can extract this value and:
1. Forge valid JWT tokens with `role: 'system_owner'` — gaining access to all dashboard APIs.
2. Forge valid respondent tokens with any `email` — enabling IDOR against any respondent's session.

The `.gitignore` file does not include a `.env` exclusion pattern (only `.venv/` and `venv/` are
excluded under the env-related section). The Pivota-managed block in `.gitignore` lacks standard
`*.env` / `.env*` patterns.

**Adversarial refutation check:**  
- ✅ Input is user-controlled in context of forgery: attacker controls the JWT claims.  
- ✅ No upstream guard: knowing the secret is sufficient to sign tokens accepted by `jwtVerify`.  
- ✅ All three server-side JWT verification paths accept tokens signed with this secret:
  `authService.ts:31`, `middleware/requireSessionOwner.ts:54`, `config/route.ts:61`.

**Exploitation path for dashboard takeover:**
```javascript
// Attacker forges a system_owner token
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode('uat-test-secret-32-chars-minimum-xxxxxxxx');
const token = await new SignJWT({ email: 'attacker@evil.com', role: 'system_owner', session_id: null })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('8h')
  .sign(secret);
// token passes requireSystemOwner on all dashboard routes
```

**Fix:**  
1. **Immediately rotate** `JWT_SECRET` to a cryptographically random 256-bit value (`openssl rand -hex 32`). All existing sessions are invalidated on rotation.  
2. Add `.env` and `.env*.local` to `.gitignore` (outside the Pivota-managed block).  
3. Remove the `.env` file from git history using `git filter-repo --invert-paths --path .env` and force-push. Treat the committed secret as permanently compromised.

---

## Lower-severity items

| ID | Severity | Finding | File:line |
|----|----------|---------|-----------|
| SEC-003 | LOW | `assessmentOpenGuard` runs before auth check in `PUT /api/responses/:sessionId`. Unauthenticated requests receive `403 ASSESSMENT_CLOSED` instead of `401 AUTH_REQUIRED` when assessment is closed, leaking closure state. | `responses/[sessionId]/route.ts:36` |
| SEC-004 | LOW | `search` query parameter in dashboard is passed to `ilike()` as `%${search}%` without LIKE wildcard escaping. Input containing `%` or `_` may cause full-table scans (performance DoS), though values are safely parameterized (no SQL injection). | `dashboardService.ts:50-51` |
| SEC-005 | LOW | Dashboard `teamType` filter accepts arbitrary string values not validated against the 4-value allowlist before DB query. Drizzle's `inArray()` prevents injection; effect is an empty result for invalid values rather than a 400 error. | `dashboardService.ts:32-35` |
| SEC-006 | LOW | No `Content-Security-Policy` header is set. XSS exploitation (if any input renders unsanitized) could exfiltrate `localStorage` tokens. Mitigated by React's JSX escaping; no `dangerouslySetInnerHTML` detected. | `next.config.ts:11-24` |
| SEC-007 | INFO | JWT tokens stored in `localStorage` (`af_token`, `dashboard_token`) are accessible to JavaScript. If XSS occurs, tokens are exfiltrable. This is an accepted trade-off for the SPA architecture. | `useSession.ts:6-7` |
| SEC-008 | INFO | No rate limiting on `POST /api/auth/login` or `POST /api/sessions`. An attacker could enumerate valid System Owner emails (distinct 403 vs 400 responses). For an internal tool this may be accepted risk. | `login/route.ts:38-43` |
| SEC-009 | INFO | Two distinct `requireSessionOwner` implementations exist (`src/lib/auth/` and `src/lib/middleware/`). Both are functionally equivalent for ownership checks, but the duplication increases maintenance risk. | `auth/requireSessionOwner.ts`, `middleware/requireSessionOwner.ts` |

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| SEC-007 | `localStorage` JWT storage (XSS-accessible) | SPA-first architecture; no `HttpOnly` cookie alternative implemented; React JSX escaping mitigates primary XSS vectors | Architecture decision |
| SEC-008 | No rate limiting on login/session endpoints | Internal corporate tool with low volume; email enumeration limited by known fixed email list in `system_owner_emails` table | Product decision |

---

## Audit trail

- **Diff scoped via:** `git log --all --oneline` — develop branch, whole-diff mode
- **Register:** Built retroactively from diff (retroactive mode — no PLAN.md threat_model)
- **Files read:** 35 implementation files across API routes, auth middleware, services, hooks, components, seed, config
- **Refutation:** 28 candidates examined, **2 confirmed HIGH**, 6 confirmed lower-severity, 20 refuted as safe
- **Key safe confirmations:**
  - All DB queries use Drizzle ORM parameterized statements (no SQL injection)
  - Session ownership verified in DB (not JWT-claim-only) on every write/read
  - Dashboard routes uniformly protected by `requireSystemOwner` server-side
  - `jose` v6 `Uint8Array` key type enforces HMAC-only (`check_key_type.js`) — algorithm confusion not possible
  - `teamType` validated against allowlist in the sections/questions flow
  - System Owner email block is server-side in `POST /api/sessions`
  - Due-date enforcement is server-side via `assessmentOpenGuard` (reads DB, not client claim)

**threats_open: 2**
