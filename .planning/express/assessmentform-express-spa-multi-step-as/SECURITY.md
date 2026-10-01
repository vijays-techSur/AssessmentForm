# Security Report — Express Task: assessmentform-express-spa-multi-step-as

**Mode:** retroactive (re-audit — state A; whole-diff scope; develop == main at HEAD)
**Audited:** 2026-10-01
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 5
**threats_open:** 5

## Summary

This is the fourth re-audit of the working tree against the full codebase (develop branch == main at HEAD; `git diff 594bfbb..HEAD --stat` touches only `.planning/STATE.md`, `SUMMARY.md`, and `UAT.md` — zero implementation files changed). Every implementation file listed in the `<required_reading>` block was independently re-read in this session. The only commits since the prior security audit (commit 594bfbb, dated 2026-10-01) are `56192bc` (SUMMARY docs) and `83be58d` (UAT results) — both documentation-only. No security-relevant code was modified. All 5 CRITICAL/HIGH findings (SEC-01 through SEC-04, SEC-05 re-classified at MEDIUM) and all 5 MEDIUM/LOW findings (SEC-05 through SEC-10) remain fully present and unmitigated. Two additional `jwtVerify` call sites without explicit algorithm pins (confirmed at `src/lib/middleware/requireSessionOwner.ts:54` and `src/app/api/config/route.ts:61`) remain open at LOW severity. **Verdict: OPEN_THREATS — do not ship to production.**

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| Dashboard login — role verification | Elevation of Privilege | **CONFIRMED OPEN CRITICAL** | `src/app/api/auth/login/route.ts:38` — no `isSystemOwnerEmail()` call; unconditionally signs `role: 'system_owner'` for any valid email |
| Dashboard auth middleware — role check | Elevation of Privilege | **CONFIRMED OPEN CRITICAL** | `src/lib/middleware/requireSystemOwner.ts:27` — `verifyJwt(token)` only; comment lines 7–8 explicit: "Role check removed — dashboard access is open to any user with a valid dashboard JWT" |
| Correct role-check HOF — unwired | INFO | Dead code | `src/lib/auth/requireSystemOwner.ts:10` — correct `role !== 'system_owner'` → 403 exists but no route imports it (all routes import exclusively from `@/lib/middleware/requireSystemOwner`) |
| Secrets in `.env` (tracked) | Information Disclosure | **CONFIRMED OPEN HIGH** | `.env` tracked (`git ls-files`): `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` + dev DB password `assessmentform_dev_password` |
| Secrets in `.env.local` (tracked) | Information Disclosure | **CONFIRMED OPEN CRITICAL** | `.env.local` tracked: production `DATABASE_URL` (`pivota-spec-driven-primary.prod.svc:5432`) with URL-encoded password + `JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`; `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| Secrets in `.env.local.QUARANTINED-INCIDENT-20260722` (tracked) | Information Disclosure | **CONFIRMED OPEN CRITICAL** | Same production credentials verbatim, still tracked in git — cosmetic rename does not remove from history or disk |
| `.gitignore` missing `.env*` patterns | Information Disclosure (root cause) | **CONFIRMED OPEN** | `.gitignore` lines 1–122: zero `.env`, `.env.local`, `.env.*` exclusions; only `.venv/`/`venv/` Python-env patterns present |
| TLS certificate verification disabled | Information Disclosure / Tampering | **CONFIRMED OPEN HIGH** | `src/lib/db.ts:24`: `ssl: isLocal ? false : { rejectUnauthorized: false }`; `.env.local:5`: `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| Unauthenticated email notification endpoint | Missing Auth / DoS | **CONFIRMED OPEN MEDIUM** | `src/app/api/notifications/email/route.ts:1–42` — zero auth imports; any caller can trigger email sends |
| Session-ownership (respondent IDOR guard) | Tampering / IDOR | SAFE | `src/lib/middleware/requireSessionOwner.ts:93` — DB lookup + case-insensitive email comparison enforced |
| `src/app/api/sessions/[sessionId]/route.ts` wiring | Elevation of Privilege | SAFE | Imports `requireSessionOwner` from `@/lib/auth/requireSessionOwner` (HOF with correct ownership check) |
| `assessmentOpenGuard` failure treated as open | Elevation of Privilege | **CONFIRMED OPEN LOW** | `src/lib/middleware/assessmentOpenGuard.ts:51` — catch block returns `{ ok: true }` on DB error |
| Rate limiting on login/session creation | DoS | **CONFIRMED OPEN LOW** | `grep -rn "rate.limit\|throttle" src/` → zero matches |
| `jwtVerify` without explicit algorithm pin — `requireSessionOwner` | Spoofing | **CONFIRMED OPEN LOW** | `src/lib/middleware/requireSessionOwner.ts:54` — `jwtVerify(token, secret)` with no `{ algorithms: ['HS256'] }` option |
| `jwtVerify` without explicit algorithm pin — `config/route.ts` | Spoofing | **CONFIRMED OPEN LOW** | `src/app/api/config/route.ts:61` — same pattern |
| CSV export — formula injection | Tampering | **CONFIRMED OPEN LOW** | `src/lib/services/csvExportService.ts:13–33` — `flattenAnswerPayload()` returns raw free-text values with no leading `=`/`+`/`-`/`@` neutralization |
| Dashboard query params — SQL injection | Tampering | SAFE | `src/lib/services/dashboardService.ts:59–67` — `sortBy` uses allowlist map; `search` uses Drizzle `ilike()` (parameterized); `teamType` uses Drizzle `ANY()` (parameterized) |
| Analytics raw SQL blocks | Tampering | SAFE | `src/lib/services/analyticsService.ts:92–108`, `:148–167` — all Drizzle `sql\`...\`` use parameterized `${q.id}` / `${responses.answer_payload}` expressions; no user-controlled strings spliced in |
| `emailService.ts` `fetch(relayUrl, …)` | SSRF | NOT USER-CONTROLLED | `src/lib/services/emailService.ts:19,39` — `relayUrl` from `process.env.EMAIL_RELAY_URL`; user input cannot influence this value |
| CSV export SQL (filter params) | Tampering | SAFE | `src/lib/services/csvExportService.ts:39–56` — same Drizzle parameterized patterns as dashboardService |

---

## Confirmed findings

> All findings survived adversarial refutation. Input paths are user-controlled (or attacker-accessible), upstream guards absent or bypassed, and all code paths verified by direct file reads in this session.

### SEC-01 (FIND-09): Dashboard Authorization Bypass — Any Email Grants System Owner Access — CRITICAL

- **Category:** Elevation of Privilege / Authorization Bypass
- **Location:** `src/app/api/auth/login/route.ts:35–44`; `src/lib/middleware/requireSystemOwner.ts:16–28`; all of `src/app/api/dashboard/**` and `src/app/api/config`
- **Description:** `POST /api/auth/login` accepts any RFC-5322-valid email address and unconditionally issues a JWT with `role: 'system_owner'` (line 38). The comments at lines 5–8 of the route explicitly document this: "No system_owner_emails check — any respondent or user can access the dashboard." The `isSystemOwnerEmail()` function exists in `src/lib/auth/authService.ts:38–44` but is not called in the login route. All five dashboard/config route handlers (`/api/dashboard/responses`, `/api/dashboard/responses/[sessionId]`, `/api/dashboard/analytics`, `/api/dashboard/export/csv`, `/api/config` GET+PATCH) import their auth guard exclusively from `@/lib/middleware/requireSystemOwner`, which calls `verifyJwt(token)` only (line 27 comment: "verify signature + expiry only — no role restriction"). The correct role-checking implementation at `src/lib/auth/requireSystemOwner.ts:10` (`req.user.role !== 'system_owner'`) is dead code — confirmed by `grep -rn "requireSystemOwner" src/` showing zero route imports from the HOF path.
- **Exploit:** An anonymous internet visitor sends `POST /api/auth/login {"email":"attacker@example.com"}`. No password, no allowlist check. They receive a valid `system_owner`-role JWT (8 h expiry). That token grants: (1) full read of all respondent PII and answers via `GET /api/dashboard/export/csv`; (2) read of all individual responses via `GET /api/dashboard/responses` and `GET /api/dashboard/responses/:sessionId`; (3) write access to assessment configuration (due date) via `PATCH /api/config`; (4) analytics read via `GET /api/dashboard/analytics`.
- **Fix:** Product decision required. Option A (restore allowlist model): add `isSystemOwnerEmail()` check in `src/app/api/auth/login/route.ts` before signing the JWT, or replace the import of `requireSystemOwner` in all dashboard/config routes from `@/lib/middleware/requireSystemOwner` to `@/lib/auth/requireSystemOwner` (the HOF with the role check). Option B (accepted open-access): formally document as accepted risk with compensating controls (email-domain restriction, SSO/VPN perimeter gate, rate limiting, audit logging of every login event).

---

### SEC-02 (FIND-01): Production Credentials Committed to Git (`.env.local` + `.env.local.QUARANTINED-INCIDENT-20260722`) — CRITICAL

- **Category:** Information Disclosure / Secret Leak
- **Location:** `.env.local` (tracked); `.env.local.QUARANTINED-INCIDENT-20260722` (tracked)
- **Description:** Both files are tracked in git (confirmed `git ls-files` this session). `.env.local` contains: production PostgreSQL connection string to `pivota-spec-driven-primary.prod.svc:5432` with URL-encoded password (`%3EAhQ%7B-%5D%2FJCVAr%5BHR2%7BdH7YIr`), production JWT signing secret (`q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`), and `NODE_TLS_REJECT_UNAUTHORIZED=0`. The "QUARANTINED" file is a verbatim copy under a renamed filename — the rename does not expunge it from git history or disk (confirmed: file still contains identical production `DATABASE_URL` and `JWT_SECRET`). `.gitignore` has no `.env.local*` or `.env.*` patterns.
- **Exploit:** Anyone with read access to the repository (including collaborators, CI systems that clone the repo, and any fork) can: (1) extract the production JWT secret and forge tokens of any role; (2) connect directly to the production database bypassing all application-layer controls — reading, modifying, or deleting all respondent data. Compounded by SEC-01: forging dashboard tokens is already trivial without knowing the JWT secret.
- **Fix:** (1) Rotate the production `JWT_SECRET` and DB password immediately. (2) `git rm --cached .env.local ".env.local.QUARANTINED-INCIDENT-20260722"`. (3) Add `.env.local*` to `.gitignore`. (4) Purge from git history using `git filter-repo` or BFG Repo Cleaner. (5) Audit all CI artifacts and developer clones for exposure.

---

### SEC-03 (FIND-02): Development JWT Secret and DB Password Committed to Git (`.env`) — HIGH

- **Category:** Information Disclosure / Secret Leak
- **Location:** `.env` (tracked)
- **Description:** `.env` contains `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` and a dev/UAT `DATABASE_URL` with plaintext password (`assessmentform_dev_password`). The file is tracked in git (confirmed `git ls-files`). `.gitignore` has no `.env` pattern. Re-read this session: contents unchanged since prior audit.
- **Exploit:** Anyone with repo access can forge JWTs for any role in environments sharing this secret (UAT/staging). Because SEC-01 is also open, a forged respondent token could also be combined with direct DB access to exfiltrate or manipulate UAT data.
- **Fix:** Rotate UAT `JWT_SECRET` and DB password. `git rm --cached .env`. Add `.env` to `.gitignore`. Purge history.

---

### SEC-04 (FIND-03): TLS Certificate Verification Disabled for Production Database Connections — HIGH

- **Category:** Information Disclosure / Tampering (MITM)
- **Location:** `src/lib/db.ts:24`; `.env.local:5`
- **Description:** The pg `Pool` is configured with `ssl: isLocal ? false : { rejectUnauthorized: false }` for all non-localhost connections (line 24). This disables server certificate validation entirely, making the TLS connection trivially MITM-able by any network-path actor. In addition, `.env.local` sets `NODE_TLS_REJECT_UNAUTHORIZED=0`, which disables TLS verification globally for the Node.js process — including the `fetch()` call to `EMAIL_RELAY_URL` in `emailService.ts`. Both confirmed re-read this session; no change.
- **Exploit:** A network-position attacker on the path between the application pod and the DB or email-relay sidecar can present a self-signed certificate, intercept all SQL traffic (reading every respondent's PII and answers) or inject SQL responses. The `NODE_TLS_REJECT_UNAUTHORIZED=0` flag extends this risk to all HTTPS connections the process makes.
- **Fix:** Set `ssl: { rejectUnauthorized: true, ca: fs.readFileSync('/path/to/ca.pem') }` (or equivalent for the sidecar CA). Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from `.env.local`; pin the specific CA certificate instead. If the platform uses a private CA (Kubernetes PKI), mount the CA bundle and reference it explicitly.

---

### SEC-05 (FIND-04): Unauthenticated Email Notification Endpoint — MEDIUM

- **Category:** Missing Authentication / Denial of Service / Information Disclosure
- **Location:** `src/app/api/notifications/email/route.ts:25–41`
- **Description:** `POST /api/notifications/email` performs zero authentication — no import of `jwtMiddleware`, `requireSessionOwner`, or `requireSystemOwner` (confirmed by full-file read this session: only imports are `NextRequest`, `NextResponse`, `sendSubmissionConfirmation`, and `z`). It Zod-validates `{ session_id, email, name, due_date }` and calls `sendSubmissionConfirmation()`. The comment "Internal server-to-server only" is documentation with no technical enforcement. The submission flow in `submissionService.ts` already calls `sendSubmissionConfirmation()` directly server-side — this HTTP route is redundant.
- **Exploit:** Any unauthenticated caller on the internet (if the endpoint is network-reachable) can: (1) trigger emails to arbitrary addresses with attacker-chosen `name`/`due_date` content, enabling phishing/spam under the platform's sending identity; (2) enumerate whether `EMAIL_RELAY_URL` is configured (200 vs. 400); (3) perform low-effort DoS against the email relay (fire-and-forget, no rate limiting). The `email` field is Zod-validated as email format only — no domain restriction.
- **Fix:** Remove the HTTP endpoint entirely (the submission flow calls `sendSubmissionConfirmation()` directly from `submissionService.ts` — the HTTP route is redundant). If the route must exist, add an internal pre-shared-secret header check (e.g., `X-Internal-Token: <env-var>`) or restrict to loopback via network policy.

---

## Lower-severity findings

| ID | Severity | Title | Location | Status |
|----|----------|-------|----------|--------|
| SEC-06 (FIND-06) | LOW | `assessmentOpenGuard` failure treated as open (fail-open on DB error) | `src/lib/middleware/assessmentOpenGuard.ts:51` | CONFIRMED OPEN — catch block returns `{ ok: true }` on DB error; re-read this session; no change |
| SEC-07 (FIND-05) | LOW | No rate limiting on login or session creation | `POST /api/auth/login`, `POST /api/sessions` | CONFIRMED OPEN — `grep -rn "rate.limit\|throttle" src/` → zero matches; re-verified this session |
| SEC-08 (FIND-07/updated) | LOW | `jwtVerify` without explicit algorithm pin (two call sites) | `src/lib/middleware/requireSessionOwner.ts:54`; `src/app/api/config/route.ts:61` | CONFIRMED OPEN — both call `jwtVerify(token, secret)` without `{ algorithms: ['HS256'] }`; safe in practice (jose rejects `alg:none` by default) but lacks defense-in-depth; `authService.verifyJwt` correctly pins at line 31 |
| SEC-09 (FIND-08) | LOW | Missing `.gitignore` patterns for `.env` files | `.gitignore:1–122` | CONFIRMED OPEN — root cause enabling SEC-02/SEC-03 recurrence; re-read lines 1–122, no `.env*` pattern present; only `.venv/`/`venv/` Python-env patterns |
| SEC-10 (FIND-10) | LOW | CSV export does not neutralize formula-injection characters | `src/lib/services/csvExportService.ts:13–33` | CONFIRMED OPEN — `flattenAnswerPayload()` returns raw free-text values with no leading `=`/`+`/`-`/`@` sanitization before `csv-stringify` |

---

## Resolved findings

> No prior findings were found to be fixed in this re-audit. Every finding (SEC-01 through SEC-10) was independently re-read and re-confirmed present in the current working tree. The commits between the prior audit (594bfbb) and HEAD (83be58d) touch only `.planning/STATE.md`, `SUMMARY.md`, and `UAT.md` — zero security-relevant implementation code was changed (confirmed: `git diff 594bfbb..HEAD --stat`).

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | JWT stored in `localStorage` (both respondent and dashboard flows) | Design constraint: SPA with no server-side session store. XSS risk mitigated by React's automatic HTML escaping. Tokens short-lived (8h/24h). Risk compounded by SEC-01: an XSS stealing a dashboard token no longer requires the victim to be a real system owner. | Product |
| AR-02 | LIKE wildcard injection in `search` parameter | `ilike()` uses Drizzle parameterized queries; wildcards at most cause table scans, no data leakage beyond what the already-open dashboard gate permits. | Engineering |
| AR-03 | CSV export reads all rows into memory | Bounded by current assessment cohort size; stream-to-disk refactor deferred until scale requires it. | Engineering |
| AR-04 | `docker-compose.yml` hardcoded dev DB password / placeholder `JWT_SECRET` | Development-only compose file; password non-reusable in production, clearly dev-scoped; inline comment instructs replacement before deployment. | DevOps |
| AR-05 | `EMAIL_RELAY_URL` operator-controlled, not allowlist-validated | No SSRF risk today — value never derived from request input; re-review if ever made configurable via an API endpoint. | Engineering |

---

## Audit trail

| Step | Finding | Evidence Checked This Session | Result |
|------|---------|-------------------------------|--------|
| Diff scope since last audit | — | `git diff 594bfbb..HEAD --stat` — only `.planning/STATE.md`, `SUMMARY.md`, `UAT.md` modified; `git log --oneline -5` confirms no implementation commits since 594bfbb | No new attack surface |
| Dashboard login role verification | SEC-01 | `src/app/api/auth/login/route.ts:35–44` re-read — no `isSystemOwnerEmail()` call; unconditional `role: 'system_owner'`; comment lines 5–8 explicit | UNMITIGATED — CONFIRMED OPEN CRITICAL |
| Dashboard middleware role check | SEC-01 | `src/lib/middleware/requireSystemOwner.ts:16–28` re-read — `verifyJwt(token)` only, comment explicit "Role check removed" | UNMITIGATED — CONFIRMED OPEN CRITICAL |
| All dashboard/config route requireSystemOwner imports | SEC-01 | `grep -rn "requireSystemOwner" src/app/api/` → all 5 routes import exclusively from `@/lib/middleware/requireSystemOwner` (broken path); zero routes import from `@/lib/auth/requireSystemOwner` (correct HOF) | Confirms SEC-01 is unmitigated across all protected routes |
| Dead-code correct role-check HOF | — | `src/lib/auth/requireSystemOwner.ts:6–17` re-read — correct check exists, zero routes import it | Confirms fix must target wired-in middleware path |
| Wiring of session routes | — | `src/app/api/sessions/[sessionId]/route.ts:3,43` re-read — imports `requireSessionOwner` from `@/lib/auth/requireSessionOwner` (HOF, correct) not from broken middleware path | SAFE |
| Secrets in tracked env files | SEC-02, SEC-03 | `.env`, `.env.local`, `.env.local.QUARANTINED-INCIDENT-20260722` all re-read; `git ls-files` confirms all three tracked; production DB URL and JWT secret confirmed present | UNMITIGATED — CONFIRMED OPEN CRITICAL/HIGH |
| `.gitignore` env patterns | SEC-09 | `.gitignore` lines 1–122 re-read — only `.venv/`/`venv/` env-like patterns; no `.env*` exclusions | UNMITIGATED — CONFIRMED OPEN LOW |
| TLS verification | SEC-04 | `src/lib/db.ts:24` re-read — `ssl: isLocal ? false : { rejectUnauthorized: false }` unchanged; `.env.local:5` `NODE_TLS_REJECT_UNAUTHORIZED=0` confirmed | UNMITIGATED — CONFIRMED OPEN HIGH |
| Unauthenticated email endpoint | SEC-05 | `src/app/api/notifications/email/route.ts:1–42` full re-read — zero auth imports (only `NextRequest`, `NextResponse`, `sendSubmissionConfirmation`, `z`) | UNMITIGATED — CONFIRMED OPEN MEDIUM |
| Session-ownership IDOR guard | — | `src/lib/middleware/requireSessionOwner.ts:73–98` re-read — DB lookup + case-insensitive email comparison intact | SAFE |
| Rate limiting | SEC-07 | `grep -rn "rate.limit\|throttle" src/` → zero matches | UNMITIGATED — CONFIRMED OPEN LOW |
| Assessment closed guard fail-open | SEC-06 | `src/lib/middleware/assessmentOpenGuard.ts:48–51` re-read — catch returns `{ ok: true }` | UNMITIGATED — CONFIRMED OPEN LOW |
| JWT algorithm pin — all call sites | SEC-08 | `grep -rn "jwtVerify" src/` → 3 call sites: `authService.ts:31` pins `HS256`; `requireSessionOwner.ts:54` and `config/route.ts:61` do not | UNMITIGATED — CONFIRMED OPEN LOW (×2 call sites, safe in practice via jose default rejection of alg:none) |
| CSV formula injection | SEC-10 | `src/lib/services/csvExportService.ts:13–33` re-read — no leading-char sanitization in `flattenAnswerPayload()` | UNMITIGATED — CONFIRMED OPEN LOW |
| Analytics SQL injection | — | `src/lib/services/analyticsService.ts` full read — all raw `sql\`...\`` blocks use parameterized Drizzle `${variable}` expressions; no user strings spliced directly | SAFE |
| `emailService.ts` SSRF | — | `src/lib/services/emailService.ts:19,39` — `relayUrl` from `process.env.EMAIL_RELAY_URL`; not user-input-derived | SAFE (env-misconfiguration risk only; classified as AR-05) |
| Dashboard service SQL (sortBy/search/teamType) | — | `src/lib/services/dashboardService.ts:59–67` — `sortBy` allowlist map; `search` via `ilike()` parameterized; `teamType` via `ANY()` parameterized | SAFE |
| CSV export SQL filter params | — | `src/lib/services/csvExportService.ts:39–56` — same Drizzle parameterized patterns as dashboardService | SAFE |
