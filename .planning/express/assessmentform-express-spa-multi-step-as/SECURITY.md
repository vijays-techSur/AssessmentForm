# Security Report — Express Task: assessmentform-express-spa-multi-step-as

**Mode:** retroactive (re-audit — state A → this audit; whole-diff scope against `origin/main`)
**Audited:** 2026-08-27
**Verdict:** OPEN_THREATS
**Confirmed HIGH/CRITICAL:** 5

## Summary

This is a re-audit of the prior SECURITY.md (commit 660b407) against the current working tree. The diff since 660b407 (`origin/main...HEAD`) touches only `.planning/STATE.md`, this task's `SUMMARY.md`, `UAT.md`, `playwright-results.json`, and `src/app/dashboard/login/page.tsx` — the last being a purely cosmetic label-text change ("Dashboard Login" → "System Owner Login", "Email Address" → "System Owner Email", "View Dashboard →" → "Access Dashboard") with no change to form logic, request payload, validation, or auth wiring. I independently re-read every file cited as evidence in the prior report — `src/app/api/auth/login/route.ts`, `src/lib/middleware/requireSystemOwner.ts`, `src/lib/auth/requireSystemOwner.ts`, `src/lib/db.ts`, `.env`, `.env.local`, `.env.local.QUARANTINED-INCIDENT-20260722`, `.gitignore`, `src/app/api/notifications/email/route.ts`, `src/lib/middleware/requireSessionOwner.ts`, `src/lib/middleware/assessmentOpenGuard.ts`, `src/lib/services/csvExportService.ts` — and confirmed byte-for-byte that none of the vulnerable code paths, tracked secret files, or missing guards have changed. All 5 prior CRITICAL/HIGH findings (dashboard authorization bypass, two committed-secret files, disabled TLS verification, unauthenticated email endpoint) remain fully present and unmitigated, and all 5 lower-severity findings remain open as well. No findings were resolved and no new findings were introduced by the tiny copy-only diff. **Verdict: OPEN_THREATS, do not ship.**

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| Post-660b407 diff scope (`origin/main...HEAD`) | — | SAFE (no functional change) | `git diff origin/main...HEAD --stat` — 5 files, only `src/app/dashboard/login/page.tsx` is source code; `git diff origin/main...HEAD -- src/app/dashboard/login/page.tsx` shows 3 JSX text-label edits only, no logic/handler/import changes |
| Dashboard login — role verification | Elevation of Privilege | **CONFIRMED OPEN CRITICAL** | `src/app/api/auth/login/route.ts:35-44` — re-read this session; still no `isSystemOwnerEmail()` call; unconditionally signs `role: 'system_owner'` for any valid email |
| Dashboard auth middleware — role check | Elevation of Privilege | **CONFIRMED OPEN CRITICAL** | `src/lib/middleware/requireSystemOwner.ts:16-28` — re-read this session; `verifyJwt(token)` verifies signature/expiry only, comment on line 7-8 explicitly states "Role check removed" |
| Dead-code correct role-check implementation | — | INFO | `src/lib/auth/requireSystemOwner.ts:6-16` — re-read this session; still contains a correct `role !== 'system_owner'` → 403 check, but it is a HOF never imported by any route (only the vulnerable `middleware/requireSystemOwner.ts` is wired into `/api/dashboard/**` and `/api/config`) |
| Session-ownership on PUT/POST responses & submissions | Tampering / IDOR | SAFE | `src/lib/middleware/requireSessionOwner.ts:73-98` — re-read this session; DB lookup + case-insensitive email comparison against JWT payload still enforced, unchanged |
| `assessmentOpenGuard` failure treated as open | Elevation | **CONFIRMED OPEN LOW** | `src/lib/middleware/assessmentOpenGuard.ts:48-51` — re-read this session; catch block still returns `{ ok: true }` on DB error, unchanged |
| Secrets committed to git — `.env` | Info Disclosure | **CONFIRMED OPEN HIGH** | `.env` (tracked) — re-read this session; `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` + dev `DATABASE_URL` with password, unchanged |
| Secrets committed to git — `.env.local` | Info Disclosure | **CONFIRMED OPEN CRITICAL** | `.env.local` (tracked) — re-read this session; production `DATABASE_URL` (`pivota-spec-driven-primary.prod.svc`) with URL-encoded password + production `JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`, unchanged |
| Secrets committed to git — `.env.local.QUARANTINED-INCIDENT-20260722` | Info Disclosure | **CONFIRMED OPEN CRITICAL** | Same tracked file, re-read this session — identical production secrets verbatim, rename is cosmetic; `git ls-files \| grep -i .env` confirms still tracked |
| `.gitignore` missing `.env*` patterns | Info Disclosure (root cause) | **CONFIRMED OPEN (part of secret findings)** | `.gitignore` — re-read this session; only `.venv/` and `venv/` present (Python patterns), no `.env`, `.env.local`, or `.env.*` exclusion anywhere |
| TLS certificate verification disabled | Info Disclosure / Tampering | **CONFIRMED OPEN HIGH** | `src/lib/db.ts:24` — re-read this session; `ssl: isLocal ? false : { rejectUnauthorized: false }` unchanged; `.env.local:5` still sets `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| Unauthenticated email notification endpoint | Info Disclosure / DoS | **CONFIRMED OPEN MEDIUM** | `src/app/api/notifications/email/route.ts` — re-read full file this session; zero auth imports (`jwtMiddleware`/`requireSessionOwner`/`requireSystemOwner`), Zod-validates then always calls `sendSubmissionConfirmation()` |
| Rate limiting on login/session creation | DoS | **CONFIRMED OPEN LOW** | `grep -rn "rate.?limit\|throttle" src/` this session → zero matches |
| JWT verify without algorithm pin (requireSessionOwner) | Spoofing | **CONFIRMED OPEN LOW** | `src/lib/middleware/requireSessionOwner.ts:54` — re-read this session; `jwtVerify(token, secret)` still has no `{ algorithms: ['HS256'] }` option (safe in practice — jose rejects `alg:none` by default — but no explicit pin) |
| CSV export — formula injection | Tampering | **CONFIRMED OPEN LOW** | `src/lib/services/csvExportService.ts:13-33` — re-read this session; `flattenAnswerPayload()` returns raw free-text values with no leading `=`/`+`/`-`/`@` neutralization before `csv-stringify` |
| Raw SQL / IDOR / mass-assignment / path traversal / SSRF / shell scripts | various | SAFE (unchanged) | No source touching these paths appears in the post-660b407 diff; spot-checked `db.ts`, `requireSessionOwner.ts`, `assessmentOpenGuard.ts`, `csvExportService.ts` directly this session — all match prior report's description |

## Confirmed findings

> Each survived adversarial refutation (input is user-controlled, no upstream guard, reachable). All 5 carried forward unchanged from the prior audit (commit 660b407) — the tiny post-660b407 diff does not touch any of these code paths.

### FIND-09: Dashboard Authorization Bypass — Any Email Grants System Owner Access — CRITICAL
- **Category:** authz_bypass / elevation_of_privilege
- **Location:** `src/app/api/auth/login/route.ts:35-44`; `src/lib/middleware/requireSystemOwner.ts:16-28`
- **Description:** `POST /api/auth/login` accepts any RFC-5322-valid email and unconditionally signs a JWT with `role: 'system_owner'` (line 38). No `isSystemOwnerEmail()` allowlist check is present, confirmed by direct read this session (lines 5-8 explicitly comment "No system_owner_emails check — any respondent or user can access the dashboard"). The gating middleware `src/lib/middleware/requireSystemOwner.ts`, wired into all 5 dashboard/config route handlers (`/api/dashboard/responses`, `/api/dashboard/responses/[sessionId]`, `/api/dashboard/analytics`, `/api/dashboard/export/csv`, `/api/config` GET+PATCH), verifies only JWT signature/expiry (line 27: "verify signature + expiry only — no role restriction") and never inspects `payload.role`. A correct role-checking implementation still exists at `src/lib/auth/requireSystemOwner.ts` but is dead code — no route imports it.
- **Exploit:** Any party — including anonymous internet visitors — sends `POST /api/auth/login {"email":"attacker@example.com"}` and receives a valid `system_owner`-role JWT (8h expiry) with zero credential requirement. That token grants full read access to every respondent's PII via `GET /api/dashboard/export/csv` (names, emails, team types, all free-text/likert/ranking answers) and write access to assessment configuration via `PATCH /api/config`.
- **Fix:** Product decision required — either (1) restore `isSystemOwnerEmail()` check in the login route and/or the `payload.role !== 'system_owner'` check in `requireSystemOwner.ts` middleware, reverting to an allowlist model; or (2) if "any valid email → dashboard" is a genuine accepted product requirement (e.g. internal-only tool), document it as a formal, signed-off accepted risk with compensating controls (email-domain restriction, SSO/VPN gating, rate limiting + audit logging of every login).

### FIND-01: Production Credentials Committed to Git (`.env.local`) — CRITICAL
- **Category:** secret_leak
- **Location:** `.env.local` (tracked); `.env.local.QUARANTINED-INCIDENT-20260722` (tracked)
- **Description:** Both files remain tracked in the working tree and git history. `.env.local` contains the production `DATABASE_URL` (`pivota-spec-driven-primary.prod.svc`, URL-encoded password) and production `JWT_SECRET=q8Fv3nT6ZpW1YxRk9LmC2aD5sH7uQ4Jb0VgEoI+NtUf=`. The "QUARANTINED" copy carries identical secrets under a renamed filename — the rename does not remove it from git history or disk.
- **Exploit:** Anyone with read access to the repository can extract the production JWT signing secret (forging any role's token — though FIND-09 already makes this unnecessary for dashboard access) and the production DB password, granting direct datastore access bypassing all application-layer controls.
- **Fix:** Rotate the production `JWT_SECRET` and DB password immediately. `git rm --cached .env.local .env.local.QUARANTINED-INCIDENT-20260722`. Add `.env.local*` and `.env` patterns to `.gitignore`. Purge history (`git filter-repo`/BFG). Audit CI artifacts and clones for exposure.

### FIND-02: Development JWT Secret and DB Password Committed to Git (`.env`) — HIGH
- **Category:** secret_leak
- **Location:** `.env` (tracked)
- **Description:** `.env` contains `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` and a localhost dev `DATABASE_URL` with a plaintext password, committed to git history — unchanged from prior audit.
- **Exploit:** Anyone with repo access can forge JWTs for any role in environments sharing this secret (staging/UAT).
- **Fix:** Rotate the dev/UAT `JWT_SECRET`. `git rm --cached .env`. Add `.env` to `.gitignore`. Purge from history.

### FIND-03: TLS Certificate Verification Disabled for Production Database — HIGH
- **Category:** tls_misconfiguration
- **Location:** `src/lib/db.ts:24`; `.env.local:5` (`NODE_TLS_REJECT_UNAUTHORIZED=0`)
- **Description:** The pg `Pool` sets `ssl: { rejectUnauthorized: false }` for all non-local connections (unchanged). `NODE_TLS_REJECT_UNAUTHORIZED=0` is also set in `.env.local`, disabling TLS verification for all outbound HTTPS from the process, including the email relay `fetch()` in `emailService.ts`.
- **Exploit:** A network-position attacker between the app and DB/email-relay sidecars can MITM connections, reading/tampering with all respondent data in transit, with no certificate warning.
- **Fix:** Set `ssl: { rejectUnauthorized: true }` with correct CA cert via `ca:` option. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0`; pin the sidecar's CA explicitly instead of disabling verification.

### FIND-04: Unauthenticated Email Notification Endpoint — MEDIUM
- **Category:** missing_authentication
- **Location:** `src/app/api/notifications/email/route.ts:25-41`
- **Description:** `POST /api/notifications/email` has no auth guard — no import of `jwtMiddleware`, `requireSessionOwner`, or `requireSystemOwner` (confirmed by full-file read this session). Zod-validates `{ session_id, email, name, due_date }` and always forwards to `sendSubmissionConfirmation()`.
- **Exploit:** Any unauthenticated caller can trigger emails to arbitrary addresses with attacker-chosen `name`/`due_date` content, enabling spam/phishing under the platform's sending identity, and can fingerprint whether `EMAIL_RELAY_URL` is configured.
- **Fix:** Remove the HTTP route (redundant — `submissionService.ts` already calls `sendSubmissionConfirmation()` directly server-side) or add an internal pre-shared-secret header check.

## Resolved findings

> No prior findings were found to be fixed in this re-audit. The post-660b407 diff (`origin/main...HEAD`) touches only doc/metadata files and a cosmetic label-text change in `src/app/dashboard/login/page.tsx` (no handler, validation, or auth logic changed) — none of the 5 HIGH/CRITICAL or 5 lower-severity findings from the prior audit have any code-path overlap with this diff. Every finding (FIND-01 through FIND-10, including FIND-09) was independently re-read and re-confirmed present in the current working tree this session; none are resolved.

## Lower-severity findings

| ID | Severity | Title | Location | Status |
|----|----------|-------|----------|--------|
| FIND-05 | LOW | No rate limiting on login/session creation | `POST /api/auth/login`, `POST /api/sessions` | Still open — `grep -rn "rate.?limit\|throttle" src/` → zero matches, re-verified this session |
| FIND-06 | LOW | `assessmentOpenGuard` failure treated as open | `src/lib/middleware/assessmentOpenGuard.ts:48-51` | Still open — catch block still returns `{ ok: true }` on DB error, re-read this session |
| FIND-07 | LOW | `jwtVerify` without explicit algorithm pin | `src/lib/middleware/requireSessionOwner.ts:54` | Still open — no `{ algorithms: ['HS256'] }` option, re-read this session; safe in practice (jose default alg rejection) |
| FIND-08 | LOW | Missing `.gitignore` patterns for `.env` files | `.gitignore` | Still open — only `.venv/`/`venv/` present, re-read this session; root cause enabling FIND-01/FIND-02 recurrence |
| FIND-10 | LOW | CSV export does not neutralize formula-injection characters | `src/lib/services/csvExportService.ts:13-33` | Still open — `flattenAnswerPayload()` returns raw free-text with no leading `=`/`+`/`-`/`@` sanitization, re-read this session |

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | JWT stored in localStorage (both respondent and dashboard flows) | Design constraint: SPA with no server-side session store. XSS mitigated by React's automatic HTML escaping. Tokens short-lived (8h/24h). Compounded by FIND-09: an XSS stealing a dashboard token no longer even needs the victim to be a real system owner. | Product |
| AR-02 | LIKE wildcard injection in `search` parameter | `ilike()` uses parameterized queries; wildcards cause table scans only, no data leakage beyond what the (broken) system_owner gate already permits. | Engineering |
| AR-03 | CSV export reads all rows into memory | Bounded by current assessment cohort size; stream-to-disk refactor deferred until scale requires it. | Engineering |
| AR-04 | `docker-compose.yml` hardcoded DB password / placeholder JWT_SECRET | Development-only compose file; DB password non-reusable, clearly dev-scoped; inline comment instructs replacement before real deployment. | DevOps |
| AR-05 | `EMAIL_RELAY_URL` operator-controlled, not allowlist-validated | No SSRF risk today — value never derived from request input; re-review if ever made configurable via an authenticated API. | Engineering |

## Audit trail

- **Diff scoped via:** `git diff origin/main...HEAD --stat` — 5 files, 218/-192 lines: `.planning/STATE.md`, this task's `SUMMARY.md`, `UAT.md`, `playwright-results.json`, and `src/app/dashboard/login/page.tsx`. Full diff of the source file confirmed 3 JSX text-label edits only ("Dashboard Login"→"System Owner Login", "Email Address"→"System Owner Email", "View Dashboard →"→"Access Dashboard"), no handler/import/logic changes. `git log --oneline` confirms `origin/main` tip is 660b407's parent-adjacent commit (the prior audit commit itself, 660b407, is on `origin/main` at HEAD~1 of the merge; `7891289` is the merge commit).
- **Register:** Loaded from the prior SECURITY.md (commit 660b407) as the re-audit checklist — all 10 line items (FIND-01 through FIND-10, plus the "attack surface audited" SAFE rows) re-verified independently against current file contents by direct `Read` calls in this session, not copied from the prior report's text.
- **Refutation:** 5 HIGH/CRITICAL candidates re-examined (FIND-09, FIND-01, FIND-02, FIND-03, FIND-04) plus 5 lower-severity (FIND-05 through FIND-08, FIND-10) — all 10 CONFIRMED still open via direct file reads this session (`src/app/api/auth/login/route.ts`, `src/lib/middleware/requireSystemOwner.ts`, `src/lib/auth/requireSystemOwner.ts`, `.env`, `.env.local`, `.env.local.QUARANTINED-INCIDENT-20260722`, `.gitignore`, `src/lib/db.ts`, `src/app/api/notifications/email/route.ts`, `src/lib/middleware/requireSessionOwner.ts`, `src/lib/middleware/assessmentOpenGuard.ts`, `src/lib/services/csvExportService.ts`). 0 resolved. 0 new findings introduced by the post-660b407 diff (confirmed the diff's only source-code file, `src/app/dashboard/login/page.tsx`, is a JSX-text-only change with no reachable security-relevant surface).

| Step | Finding | Evidence Checked This Session | Result |
|------|---------|-------------------------------|--------|
| Post-660b407 diff scope | — | `git diff origin/main...HEAD --stat` and full diff of `src/app/dashboard/login/page.tsx` | No functional change — copy-only |
| Dashboard login role verification | FIND-09 | `src/app/api/auth/login/route.ts:35-44` — re-read, no `isSystemOwnerEmail` call | UNMITIGATED — CONFIRMED OPEN CRITICAL |
| Dashboard middleware role check | FIND-09 | `src/lib/middleware/requireSystemOwner.ts:16-28` — re-read, no `payload.role` check | UNMITIGATED — CONFIRMED OPEN CRITICAL |
| Dead-code correct implementation | — | `src/lib/auth/requireSystemOwner.ts:6-16` — re-read, correct check present but unused | Confirms fix must target wired-in `middleware/` path |
| Secrets in committed files | FIND-01, FIND-02 | `cat .env .env.local .env.local.QUARANTINED-INCIDENT-20260722` — re-read this session, secrets present verbatim, matches prior report | UNMITIGATED — CONFIRMED OPEN CRITICAL/HIGH |
| `.gitignore` env patterns | FIND-08 | `cat .gitignore \| grep -i env` — only `.venv/`, `venv/` | UNMITIGATED — CONFIRMED OPEN LOW |
| TLS verification | FIND-03 | `src/lib/db.ts:24` — re-read, `ssl: isLocal ? false : { rejectUnauthorized: false }` unchanged | UNMITIGATED — CONFIRMED OPEN HIGH |
| Email endpoint auth | FIND-04 | `src/app/api/notifications/email/route.ts` — full file re-read, no auth import | UNMITIGATED — CONFIRMED OPEN MEDIUM |
| Session-ownership guard | — | `src/lib/middleware/requireSessionOwner.ts:73-98` — re-read, email comparison intact | SAFE (unchanged) |
| Rate limiting | FIND-05 | `grep -rn "rate.?limit\|throttle" src/` → zero matches | UNMITIGATED — CONFIRMED OPEN LOW |
| Assessment closed fail-open | FIND-06 | `src/lib/middleware/assessmentOpenGuard.ts:48-51` — re-read, catch returns `{ ok: true }` | UNMITIGATED — CONFIRMED OPEN LOW |
| JWT algorithm pin (requireSessionOwner) | FIND-07 | `src/lib/middleware/requireSessionOwner.ts:54` — re-read, no `algorithms` option | UNMITIGATED — CONFIRMED OPEN LOW |
| CSV formula injection | FIND-10 | `src/lib/services/csvExportService.ts:13-33` — re-read, no leading-char sanitization | UNMITIGATED — CONFIRMED OPEN LOW |
