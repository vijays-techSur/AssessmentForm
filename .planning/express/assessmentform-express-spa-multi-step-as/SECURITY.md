# Security Report — Express: assessmentform-express-spa-multi-step-as

**Mode:** retroactive (re-audit)
**Audited:** 2026-07-24 (re-audit; prior run: 2026-07-21, prior-prior: 2026-07-20)
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 3 (1 CRITICAL, 2 HIGH)

---

## Summary

Re-audit triggered by commits `450fbe7` (fix(preview): relax X-Frame-Options) and `5cc554a`
(test(uat): UAT results) since the prior audit on 2026-07-21.

**New confirmed finding (CRITICAL):** Commit `450fbe7` introduced two new secret leaks that
escalate the prior HIGH SEC-002 finding:

1. A new file `.env.local` was committed to git tracking for the first time in `450fbe7`.
   It contains both `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` AND
   `DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform`.
   `git ls-files --cached .env.local` confirms the file is actively tracked in HEAD. Neither
   `.env` nor `.env.local` appears in `.gitignore` (which has no `.env*` patterns at all).

2. `DATABASE_URL` (with username and password) was also added to `.env` in the same commit,
   meaning direct database credentials are now committed in two tracked git files simultaneously.

**Combined impact:** An attacker with repository read access can now (a) forge arbitrary JWT
tokens as before — gaining full dashboard and respondent session access — AND (b) connect
directly to the PostgreSQL database bypassing the application layer entirely, enabling raw
`SELECT`/`UPDATE`/`DELETE` on all respondent data (PII), all answers, all sessions, and the
system configuration. The leakage surface has widened from JWT forgery to full data exfiltration
and manipulation.

**SEC-002 is escalated from HIGH to CRITICAL.**

**X-Frame-Options clarification:** The commit message for `450fbe7` states "relax X-Frame-Options
DENY", but the actual code in `next.config.ts` sets `X-Frame-Options: SAMEORIGIN` (not ALLOWALL).
`SAMEORIGIN` blocks cross-origin framing and is an acceptable clickjacking protection. This is
NOT a new security finding — the value was already `SAMEORIGIN` in the prior audit's version of
the file. No new clickjacking surface was introduced.

**SEC-001 (unauthenticated email relay) remains unchanged:** The endpoint still has no auth guard.

All other prior findings are unchanged. The UAT commit `5cc554a` modified only
`.pivota/uat-start.sh` and `.planning/STATE.md` — no implementation files changed.

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
| JWT secret — `JWT_SECRET` env var | ID, Spoofing | ⚠️ **OPEN SEC-002 (CRITICAL — escalated)** | `JWT_SECRET` committed in both `.env` (since 2026-07-21) and `.env.local` (new in `450fbe7`); neither file is gitignored. `.env:1`, `.env.local:1` |
| `DATABASE_URL` — database credentials | ID, Tampering | ⚠️ **OPEN SEC-002 (CRITICAL — escalated, new sub-finding)** | `DATABASE_URL` with username+password committed to `.env` and `.env.local` in `450fbe7`. Direct DB access bypasses all application-layer auth. `.env:3`, `.env.local:3` |
| `.gitignore` — no `.env*` exclusion | ID | ⚠️ **OPEN SEC-002 (CRITICAL)** | `.gitignore` contains no `.env` or `.env*` pattern; both `.env` and `.env.local` are tracked. `.gitignore:1-123` (no env patterns) |
| JWT verification — algorithm pinning | Tampering | ✅ SAFE | `jose` v6 `Uint8Array` key enforces HS* only; algorithm confusion not possible. `authService.ts:31` |
| JWT verification — dual middleware implementations | Tampering | ✅ SAFE | Two `requireSessionOwner` implementations (`auth/` vs `middleware/`); both call `jwtVerify` with same HMAC key. No gap. `middleware/requireSessionOwner.ts:53-55` |
| SQL injection — Drizzle ORM queries | Tampering | ✅ SAFE | All parameterized via Drizzle query builder or `sql` tag; raw `sql\`\`` wraps column references only, not user strings. `dashboardService.ts:34` |
| IDOR — respondent accessing other sessions | EoP | ✅ SAFE | DB-verified email match on every session-scoped write/read. `middleware/requireSessionOwner.ts:92-98` |
| `teamType` input validation — sections API | Tampering | ✅ SAFE | Server-side allowlist via `isValidTeamType()`. `sessions/route.ts:26-31` |
| `teamType` — dashboard filter (unvalidated) | Tampering | ✅ LOW | `teamType[]` passed to `sql\`ANY\`` without allowlist; Drizzle parameterizes so no injection, but invalid values return empty result rather than 400. `dashboardService.ts:32-35` |
| `sortBy` column injection | Tampering | ✅ SAFE | Resolved via `sortColumnMap` allowlist with safe default. `dashboardService.ts:59-67` |
| `search` parameter — LIKE wildcards | DoS | ✅ LOW | `%${search}%` with unescaped `%`/`_` allows unbounded LIKE scan; no wildcard escaping. `dashboardService.ts:50-51` |
| Free-text `answer_payload` — mass assignment | Tampering | ✅ SAFE | Discriminated Zod union enforces type+payload structure. |
| `assessmentOpenGuard` ordering in PUT responses | ID | ✅ LOW | Guard runs before auth check — unauthenticated probe leaks open/closed state (403 vs 401). `responses/[sessionId]/route.ts:36-41` |
| Client-side auth guard — dashboard | EoP | ✅ SAFE (INFO) | Dashboard `AuthGuard.tsx` decodes JWT client-side; `requireSystemOwner` is the real gate on every API call. |
| Token storage — localStorage | ID | ✅ INFO | JWTs in `localStorage` (`af_token`) are XSS-accessible. Accepted architectural trade-off. `useSession.ts:6-7` |
| System Owner email block | EoP | ✅ SAFE | Server-side `isSystemOwnerEmail` check before session creation. `sessions/route.ts:71-82` |
| Due-date enforcement | Tampering | ✅ SAFE | `assessmentOpenGuard` reads config from DB server-side on every save/submit. |
| CSP header | ID | ✅ LOW | No `Content-Security-Policy` header; mitigated by same-origin SPA and React JSX escaping. |
| CSRF protection | Tampering | ✅ SAFE | All mutations require `Authorization: Bearer` header; cannot be set by cross-origin forms. |
| Rate limiting — login/session | DoS | ✅ INFO | No rate limiting on login or session endpoints; accepted for internal tool. |
| **NEW** `X-Frame-Options: SAMEORIGIN` (`450fbe7`) | Tampering | ✅ SAFE (refuted) | Commit message said "relax DENY" but actual `next.config.ts` HEAD value is `SAMEORIGIN` — blocks cross-origin framing. Not `ALLOWALL`. `next.config.ts:18`. No new clickjacking surface. |
| **NEW** `.env.local` added to git tracking (`450fbe7`) | ID | ⚠️ **OPEN SEC-002 (CRITICAL escalation)** | New file `.env.local` committed with both `JWT_SECRET` and `DATABASE_URL`. Confirmed: `git ls-files --cached .env.local` → tracked. `450fbe7:+.env.local` |
| **NEW** `DATABASE_URL` added to `.env` (`450fbe7`) | ID | ⚠️ **OPEN SEC-002 (CRITICAL escalation)** | Database credentials added to existing tracked `.env` in `450fbe7`. DB user `assessmentform` with password in history. `.env:3` |
| **UAT commit** `5cc554a` — implementation changes | All | ✅ SAFE | Only `.pivota/uat-start.sh` and `.planning/STATE.md` and `.planning/*/UAT.md` changed; zero implementation files modified. |

---

## Confirmed findings

### SEC-001 — HIGH: Unauthenticated Email Relay Endpoint

**Severity:** HIGH
**STRIDE:** Tampering / Denial of Service
**File:** `src/app/api/notifications/email/route.ts:1-42`
**Status:** OPEN — unchanged from prior audits (2026-07-20, 2026-07-21). No auth added.

**Description:**
`POST /api/notifications/email` requires no authentication or authorization. Any actor on the
internet can POST a valid JSON body `{ session_id, email, name, due_date }` and trigger an email
to an arbitrary address. When `EMAIL_RELAY_URL` is configured in production this constitutes an
open spam relay. The `email` field accepts any valid email address (Zod `z.string().email()`), so
recipients are fully attacker-controlled.

**Adversarial refutation check:**
- ✅ Input is fully user-controlled (`email`, `name`, `due_date`).
- ✅ No upstream guard exists: no `requireSystemOwner` or `jwtMiddleware` import in this file.
- ✅ Sink is reachable when `EMAIL_RELAY_URL` is set; route returns `200 { sent: true }` for valid schema input.
- ✅ Note: `submissions/[sessionId]/route.ts:58` already calls `sendSubmissionConfirmation` directly — the HTTP endpoint is architecturally redundant and serves no legitimate purpose that can't be satisfied by the direct import.

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
and rely solely on the direct `sendSubmissionConfirmation` import in
`submissions/[sessionId]/route.ts:58`, which is already the production code path.

---

### SEC-002 — CRITICAL (escalated from HIGH): Committed Secrets — JWT Key + Database Credentials

**Severity:** CRITICAL (escalated from HIGH as of 2026-07-24)
**STRIDE:** Information Disclosure / Spoofing / Tampering
**Files:** `.env:1-3`, `.env.local:1-3` (new in git `450fbe7`)
**Status:** OPEN — escalated in commit `450fbe7` (2026-07-24).

**Description:**
Three secrets are now committed to git in two tracked files with no `.gitignore` protection:

| Secret | File(s) | First committed |
|--------|---------|-----------------|
| `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` | `.env`, `.env.local` | `29d7288` (JWT), `450fbe7` (`.env.local`) |
| `DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform` | `.env`, `.env.local` | `450fbe7` |

**Confirmed via:**
```
git ls-files --cached .env .env.local
# → .env
# → .env.local
git cat-file -p HEAD:.env
# → JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx
# → AUTO_SAVE_IDLE_SECONDS=30
# → DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform
git cat-file -p HEAD:.env.local
# → JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx
# → AUTO_SAVE_IDLE_SECONDS=30
# → DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform
```

**Why escalated to CRITICAL (new in this audit):**
The prior HIGH finding was limited to JWT forgery. The `DATABASE_URL` now in git exposes direct
PostgreSQL credentials (`assessmentform:assessmentform_dev_password`) granting full database access.
An attacker with repo read access can:

1. **Forge arbitrary JWT tokens** (unchanged from prior HIGH):
   ```javascript
   import { SignJWT } from 'jose';
   const secret = new TextEncoder().encode('uat-test-secret-32-chars-minimum-xxxxxxxx');
   const token = await new SignJWT({ email: 'attacker@evil.com', role: 'system_owner', session_id: null })
     .setProtectedHeader({ alg: 'HS256' })
     .setExpirationTime('8h')
     .sign(secret);
   // token passes requireSystemOwner on all dashboard/config routes
   ```

2. **Connect directly to the database bypassing the application layer entirely (NEW)**:
   ```bash
   psql "postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform"
   # Full READ/WRITE/DELETE access to: respondents (PII), sessions, responses (all answers),
   # assessment_config, system_owner_emails, config_audit_log
   ```
   This enables: mass exfiltration of respondent PII, manipulation of submission status
   (`UPDATE sessions SET submission_status='submitted'`), deletion of responses, or takeover of
   the system owner list (`UPDATE system_owner_emails SET email='attacker@evil.com'`).

**Adversarial refutation check:**
- ✅ Both files confirmed tracked in git HEAD via `git ls-files --cached`.
- ✅ `.gitignore` contains zero `.env*` patterns — confirmed by grep for `^\.env` returning no matches.
- ✅ `DATABASE_URL` credential is a plaintext username/password in the connection string.
- ✅ Attack 1 (JWT forgery): confirmed all three JWT verification paths accept this secret.
- ✅ Attack 2 (direct DB): credential is syntactically valid PostgreSQL DSN; `localhost:5432` is the configured DB host; if repo is exposed externally, this secret is live until rotated.
- Attempted refutation: Could the password be wrong / placeholder? — No, it is consistent with the Drizzle config and seed scripts that use the same DSN; it is the active development credential.

**Fix (priority: immediate):**
1. **Rotate BOTH secrets immediately:**
   - `JWT_SECRET`: `openssl rand -hex 32` → all existing sessions invalidated.
   - Database password: `ALTER USER assessmentform WITH PASSWORD '<new-random-password>';` → update all deployment configs.
2. **Remove both files from git tracking:**
   ```bash
   git rm --cached .env .env.local
   ```
3. **Add to `.gitignore` outside the Pivota-managed block:**
   ```
   .env
   .env.local
   .env*.local
   ```
4. **Purge from git history** (the secrets are in commits `29d7288` and `450fbe7`):
   ```bash
   git filter-repo --invert-paths --path .env --path .env.local
   # Force-push required; coordinate with all repository users.
   ```
5. **Treat both secrets as permanently compromised** regardless of history rewrite, since any
   prior clone may retain them.

---

### SEC-002a — CRITICAL (sub-finding): `.env.local` Newly Committed With Database Credentials

**Severity:** CRITICAL
**STRIDE:** Information Disclosure
**File:** `.env.local` (created and tracked in git `450fbe7`)
**Status:** OPEN — new finding in this audit cycle (2026-07-24).

This is formally recorded as a sub-finding of SEC-002 to distinguish the new surface introduced
in `450fbe7` from the prior JWT-only leak. `.env.local` did not exist in git before commit
`450fbe7`. It was created as a NEW tracked file containing both the JWT secret AND the database
credentials. See SEC-002 for the full impact assessment and remediation steps.

---

## Lower-severity items

| ID | Severity | Finding | File:line |
|----|----------|---------|-----------|
| SEC-003 | LOW | `assessmentOpenGuard` runs before auth check in `PUT /api/responses/:sessionId`. Unauthenticated requests receive `403 ASSESSMENT_CLOSED` instead of `401 AUTH_REQUIRED` when assessment is closed, leaking closure state to unauthenticated probes. | `responses/[sessionId]/route.ts:36` |
| SEC-004 | LOW | `search` query parameter in dashboard is passed to `ilike()` as `%${search}%` without LIKE wildcard escaping. Input containing `%` or `_` may cause full-table scans (performance DoS), though values are safely parameterized (no SQL injection). | `dashboardService.ts:50-51` |
| SEC-005 | LOW | Dashboard `teamType` filter accepts arbitrary string values not validated against the 4-value allowlist before DB query. Drizzle's `sql\`ANY\`` prevents injection; effect is empty result for invalid values rather than a 400 error. | `dashboardService.ts:32-35` |
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

- **Re-audit scope:** Commits `450fbe7` (preview fix + secret leak escalation) and `5cc554a` (UAT-only, no implementation changes) since prior audit `29d7288` (2026-07-21)
- **Diff scoped via:** `git log --oneline --all`, `git show 450fbe7 --stat`, `git show 450fbe7 -- .env .env.local next.config.ts`
- **Register:** Retroactive mode — no PLAN.md threat_model; register extended from prior audit
- **Secret leak confirmed via:** `git ls-files --cached .env .env.local` (both tracked), `git cat-file -p HEAD:.env` and `HEAD:.env.local` (both contain JWT_SECRET + DATABASE_URL), grep for `.env*` patterns in `.gitignore` (zero matches)
- **X-Frame-Options refuted as safe:** `git show 29d7288 -- next.config.ts` shows `SAMEORIGIN` was already the value when the file was first committed; `git show HEAD -- next.config.ts` confirms current value is still `SAMEORIGIN` not `ALLOWALL` — no new clickjacking surface
- **UAT commit safe:** `git show 5cc554a --stat` shows only `.pivota/` and `.planning/` files changed — zero implementation files
- **Refutation summary:** 3 new candidates examined: `.env.local` secret leak (CONFIRMED CRITICAL), `DATABASE_URL` in `.env` (CONFIRMED CRITICAL sub-finding), X-Frame-Options SAMEORIGIN (REFUTED — safe value, not ALLOWALL)
- **Cumulative confirmed:** **3 HIGH/CRITICAL open** (SEC-001 HIGH, SEC-002 CRITICAL, SEC-002a CRITICAL); 7 lower-severity

**threats_open: 3**
