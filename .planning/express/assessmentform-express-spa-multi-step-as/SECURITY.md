# Security Report — Express: assessmentform-express-spa-multi-step-as

**Mode:** retroactive
**Audited:** 2026-07-21 (re-audit; prior run: 2026-07-20)
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 2

---

## Summary

The Multi-Step Assessment Form SPA implements a broadly sound JWT/HS256 + Drizzle ORM security
posture for its core respondent and dashboard flows. Server-side ownership checks are DB-verified
(not JWT-claim-only), all DB queries use parameterized statements, and dashboard routes are
uniformly protected by `requireSystemOwner`. Both prior HIGH findings remain open and unchanged:
(1) the JWT secret `uat-test-secret-32-chars-minimum-xxxxxxxx` is committed verbatim to `.env`
and is still tracked in git HEAD with no `.gitignore` exclusion for `.env`, enabling token forgery
by anyone with repository read access; (2) `POST /api/notifications/email` remains unauthenticated
and is an open relay when `EMAIL_RELAY_URL` is configured in production.

Three UAT fix changes (commits `bf0059d` and `0e4bc9b`) were evaluated for new security
issues: (a) the `assessment/page.tsx` guard now stays on `/assessment` when localStorage has
tokens but the session hook is null — this is a UX retry guard, not an auth bypass, since all
downstream API calls still require a server-verified JWT; (b) `review/page.tsx` reads
`af_team_type` from localStorage as a section-loading fallback — the value is passed to a
server API that validates it server-side, and only a same-origin XSS actor can tamper with
localStorage; (c) `useSession.ts` now preserves tokens on non-auth (5xx/network) errors —
the 403 `SESSION_ACCESS_DENIED` case does not clear tokens, but this code path requires a valid
token in the first place and cannot be reached by an unauthenticated actor. All three changes
were adversarially refuted as safe.

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| `POST /api/auth/login` — System Owner login | Spoofing | ✅ SAFE | DB-side email check via `isSystemOwnerEmail`; Zod email validation; JWT signed server-side. `authService.ts:38-44`, `login/route.ts:37` |
| `POST /api/sessions` — create/resume respondent session | Spoofing, EoP | ✅ SAFE | Zod schema validates email/name/team_type; `isSystemOwnerEmail` blocks System Owner emails before session creation. `sessions/route.ts:15-82` |
| `GET /api/sessions/:sessionId` — respondent session load | Spoofing, EoP | ✅ SAFE | `jwtMiddleware` → `requireSessionOwner` (DB ownership verify, case-insensitive). `sessions/[sessionId]/route.ts:42-44`, `auth/requireSessionOwner.ts:23-43` |
| `PUT /api/responses/:sessionId` — auto-save | Tampering, EoP | ✅ SAFE | `requireSessionOwner` (middleware) verifies JWT + DB ownership. Zod `PutResponsesBodySchema` validates all payloads. `responses/[sessionId]/route.ts:40-66` |
| `POST /api/submissions/:sessionId` — finalize submission | EoP, Tampering | ✅ SAFE | `requireSessionOwner` blocks system_owner; DB ownership check; `assessmentOpenGuard` enforces due date server-side. `submissions/[sessionId]/route.ts:35-42` |
| `POST /api/notifications/email` — email notification | Tampering, DoS | ⚠️ **OPEN SEC-001 (HIGH)** | No auth; arbitrary `email` and `name` accepted; spam relay when `EMAIL_RELAY_URL` is set. `notifications/email/route.ts:1-42` |
| `GET /api/dashboard/responses` — paginated list | EoP, ID | ✅ SAFE | `requireSystemOwner` enforces JWT + `role === 'system_owner'`. `dashboard/responses/route.ts:8-9` |
| `GET /api/dashboard/responses/:sessionId` — drill-down | EoP, ID | ✅ SAFE | `requireSystemOwner` guards. `dashboard/responses/[sessionId]/route.ts:11-12` |
| `GET /api/dashboard/analytics` — analytics data | EoP | ✅ SAFE | `requireSystemOwner` guards. `analytics/route.ts:8-9` |
| `GET /api/dashboard/export/csv` — CSV export | EoP | ✅ SAFE | `requireSystemOwner` guards. `export/csv/route.ts:9-10` |
| `GET /api/config` + `PATCH /api/config` — config management | EoP, Tampering | ✅ SAFE | `requireSystemOwner` guards both methods. `config/route.ts:9-10, 34-35` |
| JWT secret — `JWT_SECRET` env var | ID, Spoofing | ⚠️ **OPEN SEC-002 (HIGH)** | Weak secret committed to git in `.env`; `.env` not gitignored; present in HEAD. `.env:1`, git commit `944703a` |
| JWT verification — algorithm pinning | Tampering | ✅ SAFE | `jose` v6 `Uint8Array` key enforces HS* only; algorithm confusion not possible. `authService.ts:31` |
| JWT verification — dual middleware implementations | Tampering | ✅ SAFE | Two `requireSessionOwner` implementations (`auth/` vs `middleware/`); both call `jwtVerify` with same HMAC key. No gap. `middleware/requireSessionOwner.ts:53-55` |
| SQL injection — Drizzle ORM queries | Tampering | ✅ SAFE | All parameterized via Drizzle query builder or `sql` tag; raw `sql\`\`` wraps column references only, not user strings. `dashboardService.ts:34`, `sessionService.ts:90` |
| IDOR — respondent accessing other sessions | EoP | ✅ SAFE | DB-verified email match on every session-scoped write/read. `middleware/requireSessionOwner.ts:92-98` |
| `teamType` input validation — sections API | Tampering | ✅ SAFE | Server-side allowlist via `isValidTeamType()`. `sections/route.ts:26-31` |
| `teamType` — dashboard filter (unvalidated) | Tampering | ✅ LOW | `teamType[]` passed to `inArray()` without allowlist in dashboard/analytics; Drizzle parameterizes so no SQL injection, but invalid values cause empty result rather than 400. `dashboardService.ts:32-35` |
| `sortBy` column injection | Tampering | ✅ SAFE | Resolved via `sortColumnMap` allowlist with safe default. `dashboardService.ts:59-67` |
| `search` parameter — LIKE wildcards | DoS | ✅ LOW | `%${search}%` with unescaped `%`/`_` allows unbounded LIKE scan; Drizzle parameterizes value but no wildcard escaping. `dashboardService.ts:50-51` |
| Free-text `answer_payload` — mass assignment | Tampering | ✅ SAFE | Discriminated Zod union enforces type+payload structure. `answerPayload.ts:47-54` |
| `assessmentOpenGuard` ordering in PUT responses | ID | ✅ LOW | Guard runs before auth check — unauthenticated probe determines if assessment is open/closed (403 vs 401). `responses/[sessionId]/route.ts:36-41` |
| Client-side auth guard — dashboard | EoP | ✅ SAFE (INFO) | Dashboard `AuthGuard.tsx` decodes JWT client-side; `requireSystemOwner` is the real gate on every API call. |
| Token storage — localStorage | ID | ✅ INFO | JWTs in `localStorage` (`af_token`) are XSS-accessible. Accepted architectural trade-off. `useSession.ts:6-7` |
| System Owner email block | EoP | ✅ SAFE | Server-side `isSystemOwnerEmail` check before session creation. `sessions/route.ts:71-82` |
| Due-date enforcement | Tampering | ✅ SAFE | `assessmentOpenGuard` reads config from DB server-side on every save/submit. `assessmentOpenGuard.ts:20-45` |
| `.gitignore` — `.env` exclusion | ID | ⚠️ **OPEN SEC-002 (HIGH)** | `.env` not in `.gitignore`; tracked in HEAD; secret still present verbatim. `.gitignore` (full file) |
| CSP header | ID | ✅ LOW | No `Content-Security-Policy` header; mitigated by same-origin SPA and React JSX escaping. |
| CSRF protection | Tampering | ✅ SAFE | All mutations require `Authorization: Bearer` header; cannot be set by cross-origin forms. |
| Rate limiting — login/session | DoS | ✅ INFO | No rate limiting on login or session endpoints; accepted for internal tool. |
| **NEW** `assessment/page.tsx` — guard skips redirect when localStorage has tokens | Spoofing | ✅ SAFE (refuted) | Staying on `/assessment` with stale localStorage tokens does not bypass auth: API calls require valid server-verified JWT; on failure, `isAuthError` path clears tokens and guard redirects. `assessment/page.tsx:18-23`, `useSession.ts:43-53` |
| **NEW** `review/page.tsx` — `af_team_type` from localStorage as section load fallback | Tampering | ✅ SAFE (refuted) | Value is passed to server API (`GET /api/sections?teamType=`) which validates it against an allowlist server-side. Only a same-origin JS actor can write localStorage. `review/page.tsx:42`, sections API |
| **NEW** `useSession.ts` — tokens preserved on non-auth errors | Spoofing | ✅ SAFE (refuted) | 403 `SESSION_ACCESS_DENIED` does not clear tokens, but requires a valid JWT to reach. Network/5xx errors preserve tokens for retry, consistent with no-new-auth-surface. `useSession.ts:39-54` |

---

## Confirmed findings

### SEC-001 — HIGH: Unauthenticated Email Relay Endpoint

**Severity:** HIGH
**STRIDE:** Tampering / Denial of Service
**File:** `src/app/api/notifications/email/route.ts:1-42`
**Status:** OPEN — unchanged from prior audit (2026-07-20). No auth added.

**Description:**
`POST /api/notifications/email` requires no authentication or authorization. Any actor on the
internet can POST a valid JSON body `{ session_id, email, name, due_date }` and trigger an email
to an arbitrary address. When `EMAIL_RELAY_URL` is configured in production this constitutes an
open spam relay. The `name` field is inserted verbatim into the email body (`Dear ${params.name}`)
and while Zod limits it to `z.string().min(1)` with no max length cap, the relay payload
includes no SMTP header injection sanitization. The `email` field accepts any valid email address
(validated by Zod `z.string().email()`), so recipients are fully attacker-controlled.

**Changes since prior audit:**
The endpoint now validates `session_id` as a UUID, `email` as a valid address, and `name`/`due_date`
as non-empty strings. This reduces (but does not eliminate) the open relay risk — arbitrary
recipients can still be targeted.

**Adversarial refutation check:**
- ✅ Input is fully user-controlled (`email`, `name`, `due_date`).
- ✅ No upstream guard exists (confirmed: no `requireSystemOwner` or `jwtMiddleware` import).
- ✅ Sink is reachable when `EMAIL_RELAY_URL` is set; route returns `200 { sent: true }` for valid schema input.
- ✅ Note: `emailService.ts:58` already calls `sendSubmissionConfirmation` directly — the HTTP endpoint is architecturally redundant and serves no legitimate purpose that can't be satisfied by the direct import.

**Attack path:**
```
POST /api/notifications/email HTTP/1.1
Content-Type: application/json

{
  "session_id": "00000000-0000-0000-0000-000000000001",
  "email": "victim@example.com",
  "name": "Winner — see attachment",
  "due_date": "2099-01-01T00:00:00Z"
}
```
When `EMAIL_RELAY_URL` is configured, this sends an email to `victim@example.com` with
attacker-controlled body content.

**Fix:**
Either (a) add `requireSystemOwner` to the route, or (b) **remove the HTTP endpoint entirely**
and rely solely on the direct `sendSubmissionConfirmation` import in `submissions/[sessionId]/route.ts:58`,
which is already the production code path and has no open-relay risk.

---

### SEC-002 — HIGH: JWT Secret Committed to Git Repository

**Severity:** HIGH
**STRIDE:** Information Disclosure / Spoofing
**File:** `.env:1`, git commit `944703a`
**Status:** OPEN — `.env` still tracked in HEAD; secret unchanged; `.gitignore` still has no `.env` exclusion.

**Description:**
The file `.env` containing `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` is committed
to the repository and actively tracked (`git ls-files --cached .env` confirms tracking). The
secret (41 ASCII chars, low entropy, predictable pattern) is in git history from commit `944703a`
through the current HEAD. The `.gitignore` file does not include a `.env` exclusion pattern
(only `.venv/` and `venv/` appear under env-related entries; the Pivota-managed block lacks
standard `*.env` / `.env*` patterns).

Anyone with repository read access can extract this value and:
1. Forge valid JWT tokens with `role: 'system_owner'` — gaining access to all dashboard APIs
   (`GET/POST /api/dashboard/**`, `GET/PATCH /api/config`).
2. Forge valid respondent tokens with any `email` — enabling IDOR against any respondent's session.

All three JWT verification paths in the codebase accept tokens signed with this secret:
`authService.ts:31`, `middleware/requireSessionOwner.ts:53-54`, `config/route.ts:60-61`.

**Adversarial refutation check:**
- ✅ Secret is user-readable from git history (`git show 944703a:.env` confirms).
- ✅ No upstream guard: knowing the secret is sufficient to sign arbitrary tokens.
- ✅ Token forgery confirmed exploitable against all protected API routes.

**Exploitation path for dashboard takeover:**
```javascript
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode('uat-test-secret-32-chars-minimum-xxxxxxxx');
const token = await new SignJWT({ email: 'attacker@evil.com', role: 'system_owner', session_id: null })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('8h')
  .sign(secret);
// token passes requireSystemOwner on all dashboard/config routes
```

**Fix:**
1. **Immediately rotate** `JWT_SECRET` to a cryptographically random 256-bit value:
   `openssl rand -hex 32`. All existing sessions are invalidated on rotation.
2. Add `.env` and `.env.local` to `.gitignore` outside the Pivota-managed block.
3. Remove `.env` from git history: `git filter-repo --invert-paths --path .env` and force-push.
   Treat the committed secret as permanently compromised.

---

## Lower-severity items

| ID | Severity | Finding | File:line |
|----|----------|---------|-----------|
| SEC-003 | LOW | `assessmentOpenGuard` runs before auth check in `PUT /api/responses/:sessionId`. Unauthenticated requests receive `403 ASSESSMENT_CLOSED` instead of `401 AUTH_REQUIRED` when assessment is closed, leaking closure state to unauthenticated probes. | `responses/[sessionId]/route.ts:36` |
| SEC-004 | LOW | `search` query parameter in dashboard is passed to `ilike()` as `%${search}%` without LIKE wildcard escaping. Input containing `%` or `_` may cause full-table scans (performance DoS), though values are safely parameterized (no SQL injection). | `dashboardService.ts:50-51` |
| SEC-005 | LOW | Dashboard `teamType` filter accepts arbitrary string values not validated against the 4-value allowlist before DB query. Drizzle's `inArray()` prevents injection; effect is empty result for invalid values rather than a 400 error. | `dashboardService.ts:32-35` |
| SEC-006 | LOW | No `Content-Security-Policy` header is set. XSS exploitation (if any input renders unsanitized) could exfiltrate `localStorage` tokens. Mitigated by React's JSX escaping; no `dangerouslySetInnerHTML` detected. | `next.config.ts` |
| SEC-007 | INFO | JWT tokens stored in `localStorage` (`af_token`) are accessible to JavaScript (XSS-exfiltrable). Accepted trade-off for SPA architecture. | `useSession.ts:6-7` |
| SEC-008 | INFO | No rate limiting on `POST /api/auth/login` or `POST /api/sessions`. Attacker can enumerate valid System Owner emails (distinct 403 vs 400 responses). For internal tool, accepted risk. | `login/route.ts:38-43` |
| SEC-009 | INFO | Two distinct `requireSessionOwner` implementations exist (`src/lib/auth/` and `src/lib/middleware/`). Both are functionally equivalent but duplication increases maintenance risk (divergence over time). | `auth/requireSessionOwner.ts`, `middleware/requireSessionOwner.ts` |

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| SEC-007 | `localStorage` JWT storage (XSS-accessible) | SPA-first architecture; no `HttpOnly` cookie alternative implemented; React JSX escaping mitigates primary XSS vectors | Architecture decision |
| SEC-008 | No rate limiting on login/session endpoints | Internal corporate tool with low volume; email enumeration limited by known fixed email list in `system_owner_emails` table | Product decision |

---

## Audit trail

- **Diff scoped via:** `git log --all --oneline` — develop branch, whole-diff mode; UAT fix commits `bf0059d`, `0e4bc9b`, `1d64c09` examined for new issues
- **Register:** Built retroactively from diff (retroactive mode — no PLAN.md threat_model)
- **Files read:** 38 implementation files across API routes, auth middleware, services, hooks, components, seed, config, and client pages
- **Refutation:** 31 candidates examined, **2 confirmed HIGH**, 7 confirmed lower-severity, 22 refuted as safe
- **Key safe confirmations:**
  - All DB queries use Drizzle ORM parameterized statements (no SQL injection)
  - Session ownership verified in DB (not JWT-claim-only) on every write/read
  - Dashboard routes uniformly protected by `requireSystemOwner` server-side
  - `jose` v6 `Uint8Array` key type enforces HMAC-only — algorithm confusion not possible
  - `teamType` validated against allowlist in the sections/questions flow (server-side)
  - System Owner email block is server-side in `POST /api/sessions`
  - Due-date enforcement is server-side via `assessmentOpenGuard` (reads DB, not client claim)
  - New UAT fix changes (localStorage guard bypass, `af_team_type` fallback, token-retention on non-auth errors) all refuted as safe — no new HIGH/CRITICAL surface introduced

**threats_open: 2**
