# SECURITY AUDIT REPORT

| Field | Value |
|-------|-------|
| **Task** | assessmentform-express-spa-multi-step-as (Full codebase — 12 waves, express whole-diff mode) |
| **Mode** | Retroactive (re-audit — state B; full working-tree re-scan) |
| **Audited** | 2026-08-27 |
| **Auditor** | claude-sonnet-5 (automated STRIDE audit) |
| **Verdict** | **OPEN_THREATS** |
| **Confirmed HIGH/CRITICAL** | 5 (3 CRITICAL, 2 HIGH) |
| **Lower-severity** | 4 (LOW) |

---

## Summary

This re-audit re-verified all 8 prior findings against current file contents and surfaced **one new CRITICAL finding not previously reported**: the dashboard login flow (`POST /api/auth/login`) and its gating middleware (`src/lib/middleware/requireSystemOwner.ts`) no longer perform the `system_owner_emails` authorization check — any syntactically valid email address obtains a `role: "system_owner"` JWT and can read/export every respondent's PII (names, emails, free-text answers) and modify the assessment due date via `PATCH /api/config`. **Correction on origin:** this is not a silent code regression independent of intent — commit `d8ad63a` ("docs: update all docs to reflect open dashboard access") retroactively rewrote the FRD/PRD/TechArch spec *the same day* to describe exactly this "any email logs in as dashboard user, no allowlist" model, and the code change in `9fe4293` brought the implementation in line with that rewritten spec. The current `project_specs/PRD-AssessmentForm.md:172` states this in plain language: "Any user with a valid email can log into the dashboard — no pre-configured allowlist is required." So the access model is now the *documented, current* design intent, not an accident — but it directly reverses the phase's original threat-model mitigation (05-PLAN.md, T-05-01: "returns 403 ACCESS_DENIED ... if ... role !== 'system_owner'"), which the initially-shipped code (commit `8f76844`) correctly implemented, and it remains a severe, unauthenticated PII-disclosure and data-integrity exposure regardless of which spec version is authoritative: an assessment platform that collects named respondent answers should not let an anonymous internet visitor read them all by typing any email address into a login box. This is flagged as a CONFIRMED CRITICAL finding on security merits, with the spec-intent caveat recorded so the fix decision (revert vs. formally accept-as-designed) is made by a human, not silently assumed either way. All 4 previously-confirmed CRITICAL/HIGH findings (production secrets committed to git, TLS certificate verification disabled, unauthenticated email endpoint) remain fully unmitigated — no source file touching those code paths has changed since the prior audit. Verdict: **OPEN_THREATS, do not ship** — combined with the still-committed production JWT_SECRET, external parties have multiple independent paths to full respondent-data disclosure.

---

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| Dashboard login — role verification | Elevation of Privilege | **FINDING (NEW)** | `src/app/api/auth/login/route.ts:38` — issues `role: 'system_owner'` to any validly-formatted email, no `isSystemOwnerEmail()` call |
| Dashboard auth middleware — role check | Elevation of Privilege | **FINDING (NEW)** | `src/lib/middleware/requireSystemOwner.ts:16-27` — verifies JWT signature/expiry only; comment explicitly states "Role check removed" |
| Respondent-session SO-email block | Spoofing | SAFE | `src/app/api/sessions/route.ts:71-81` — `isSystemOwnerEmail()` still enforced here (this is the *only* remaining caller of `isSystemOwnerEmail`) |
| Legacy unused HOF `requireSystemOwner` (correct impl, dead code) | — | INFO | `src/lib/auth/requireSystemOwner.ts:6-16` — still checks `role !== 'system_owner'` correctly but is never imported by any route; the vulnerable `src/lib/middleware/requireSystemOwner.ts` is what's actually wired up |
| JWT signing (authService) | Spoofing | SAFE | `src/lib/auth/authService.ts:20-25` — HS256 pinned in `signJwt`; `verifyJwt` (line 31) pins `{ algorithms: ['HS256'] }` |
| JWT verify without alg pin | Spoofing | LOW | `src/lib/middleware/requireSessionOwner.ts:54` — `jwtVerify(token, secret)` with no explicit `algorithms` option; jose rejects `alg:none` by default so no practical downgrade |
| JWT storage in localStorage (both flows) | Spoofing | ACCEPTED RISK | `src/components/dashboard/AuthGuard.tsx:35`, `src/hooks/useSession.ts` — no HttpOnly cookie alternative in this SPA architecture |
| Session-ownership on PUT /api/responses | Tampering | LOW | `src/app/api/responses/[sessionId]/route.ts:36-40` — `assessmentOpenGuard` runs before `requireSessionOwner`; unauthenticated timing/DB-state oracle only, no data access |
| Session-ownership on GET /api/sessions/:id | Tampering | SAFE | `src/app/api/sessions/[sessionId]/route.ts:37-43` + `src/lib/auth/requireSessionOwner.ts:23-43` + `sessionService.ts:200-203` double-check |
| IDOR on POST /api/submissions | Tampering | SAFE | `src/app/api/submissions/[sessionId]/route.ts:33` — `requireSessionOwner` (middleware) does full JWT + ownership verification before any state change |
| Raw SQL in analyticsService | Tampering | SAFE | `src/lib/services/analyticsService.ts:91-167` — `q.id` sourced from DB `SELECT` of `questions` table, never from request input; all interpolations are Drizzle `sql` tagged-template parameters |
| LIKE wildcard injection in dashboard search | Tampering | LOW / ACCEPTED | `src/lib/services/dashboardService.ts:50-51`, `src/lib/services/csvExportService.ts:51-56` — `ilike()` parameterized; wildcard chars cause scan cost only, gated by (broken) system_owner check |
| Input validation on answer payloads | Tampering | SAFE | `src/lib/schemas/answerPayload.ts` — Zod discriminated union validated in `PUT /api/responses/:sessionId` before any DB write |
| Secrets committed to git — `.env` | Info Disclosure | **CONFIRMED HIGH (carried forward)** | `.env` (tracked) — `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx`, dev `DATABASE_URL` with password |
| Secrets committed to git — `.env.local` | Info Disclosure | **CONFIRMED CRITICAL (carried forward)** | `.env.local` (tracked) — production `DATABASE_URL` w/ password + production `JWT_SECRET` |
| Secrets committed to git — `.env.local.QUARANTINED-INCIDENT-20260722` | Info Disclosure | **CONFIRMED CRITICAL (carried forward)** | Same tracked file, same production secrets, "QUARANTINED" rename is cosmetic only |
| Hardcoded credentials in docker-compose.yml | Info Disclosure | ACCEPTED RISK | `docker-compose.yml:9,25` — dev-only DB password + placeholder `JWT_SECRET` |
| TLS certificate verification disabled | Info Disclosure / Tampering | **CONFIRMED HIGH (carried forward)** | `src/lib/db.ts:24` — `ssl: isLocal ? false : { rejectUnauthorized: false }`; `.env.local:5` — `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| Unauthenticated email notification endpoint | Info Disclosure / DoS | **CONFIRMED MEDIUM (carried forward)** | `src/app/api/notifications/email/route.ts:24-39` — no auth import, no guard call |
| JWT returned in API response body | Info Disclosure | ACCEPTED RISK | `src/lib/session/sessionService.ts:157`, `src/app/api/auth/login/route.ts:38-42` — design choice; no server-side session store |
| No rate limiting on login/session creation | DoS | LOW | Grep for `rateLimit`/`throttle` across `src/` — zero matches |
| CSV export loads all rows into memory | DoS | LOW / ACCEPTED | `src/lib/services/csvExportService.ts:60-99` — gated (in theory) by system_owner check; bounded by cohort size |
| System Owner role check on all `/api/dashboard/*` + `/api/config` | Elevation | **CONFIRMED CRITICAL (see above — role check is a no-op)** | All 5 handlers call `requireSystemOwner(req)` from `src/lib/middleware/requireSystemOwner.ts`, which no longer checks role |
| System Owner bypass in HOF `requireSessionOwner` | Elevation | SAFE | `src/lib/auth/requireSessionOwner.ts:18-20` — service-level email match (`sessionService.getSessionById`) still blocks cross-session read even if role bypass is used |
| `assessmentOpenGuard` failure treated as open | Elevation | LOW | `src/lib/middleware/assessmentOpenGuard.ts:48-51` — DB error → `{ ok: true }`, allowing saves/submissions past due date on transient errors |
| `.pivota/start-dev.sh` shell variable injection | Tampering | SAFE | All variables hardcoded, filesystem-derived, or `/proc/1/environ` platform-injected; no `eval`; CSPRNG (`/dev/urandom`) for placeholder secret generation |
| `.pivota/uat-start.sh` shell variable injection | Tampering | SAFE | `$COMPOSE`/`$PORT`/`$BUILD_SYSTEM` are operator/sandbox env vars, not externally user-controlled; `RUN_CMD` set to one of two hardcoded strings before `bash -c` |
| `scripts/start.sh` shell variable injection | Tampering | SAFE | `DB_URL`/`JWT` read from `/proc/1/environ` (platform-injected, not external-user-controlled) and written into `.env.local` via heredoc — no shell metacharacter execution path |
| `.pivota/dev-script.meta.json` | — | SAFE | Static JSON metadata, never executed |
| `.gitignore` missing `.env*` patterns | Info Disclosure (root cause) | **CONFIRMED (carried forward)** | `.gitignore` — no `.env`, `.env.local`, or `.env.*` exclusion pattern anywhere in the managed block |
| Path traversal / arbitrary file read | Tampering | SAFE | No `fs.readFile`/`fs.writeFile`/`require(userInput)` patterns anywhere in `src/` |
| Content-Disposition header injection (CSV filename) | Tampering | SAFE | `src/app/api/dashboard/export/csv/route.ts:13` — filename built from server-generated `new Date().toISOString()`, no user input |
| CSV formula/data injection (respondent free-text into CSV cells) | Tampering | LOW / ACCEPTED | `src/lib/services/csvExportService.ts:13-34,109-127` — `csv-stringify` quotes/escapes values but does not neutralize leading `=`/`+`/`-`/`@` (classic CSV-injection into Excel); requires system_owner to open a malicious file, and access to reach the export is itself broken (see EoP finding above) |
| Mass assignment / over-exposure in dashboard responses | Info Disclosure | SAFE | `src/lib/services/dashboardService.ts` — explicit column selects (`session_id`, `respondent_name`, etc.), no `SELECT *` on sensitive tables |
| SSRF via `EMAIL_RELAY_URL` | — | SAFE | `src/lib/services/emailService.ts:20` — value is operator-set env var, never derived from request input |

---

## Confirmed findings

> Each survived adversarial refutation (input is user-controlled, no upstream guard, reachable).

### FIND-09: Dashboard Authorization Bypass — Any Email Grants System Owner Access — CRITICAL
- **Category:** authz_bypass / elevation_of_privilege
- **Location:** `src/app/api/auth/login/route.ts:20-45`; `src/lib/middleware/requireSystemOwner.ts:16-27`
- **Status note:** Currently matches the *documented* spec (`project_specs/PRD-AssessmentForm.md:172`, `FRD/F07-rbac.md` as rewritten in commit `d8ad63a`), not an unintentional drift between spec and code — see Summary. Flagged CRITICAL on security merits regardless; the spec change does not reduce the actual exposure.
- **Description:** `POST /api/auth/login` accepts any RFC-5322-valid email and unconditionally signs a JWT with `role: 'system_owner'` — the call to `isSystemOwnerEmail()` (which checks the `system_owner_emails` DB table) that the originally-shipped implementation (commit `8f76844`) and the phase's own PLAN.md threat model (05-PLAN.md, T-05-01: "returns 403 `ACCESS_DENIED` if... role !== 'system_owner'") both required has been removed, in the same commit sequence (`d8ad63a` docs + `9fe4293` code) that redefined the intended access model to "any email is a dashboard user." The gating middleware `src/lib/middleware/requireSystemOwner.ts`, which is imported by all 5 dashboard/config route handlers (`/api/dashboard/responses`, `/api/dashboard/responses/[sessionId]`, `/api/dashboard/analytics`, `/api/dashboard/export/csv`, `/api/config` GET+PATCH), now only calls `verifyJwt(token)` for signature/expiry — it never inspects `payload.role`. A correct, role-checking implementation still exists at `src/lib/auth/requireSystemOwner.ts`, but it is dead code: no route imports from `@/lib/auth/requireSystemOwner`, only from `@/lib/middleware/requireSystemOwner`.
- **Exploit:** An attacker (including any respondent who completed the identity flow, or any external party who knows nothing except that the app exists) sends `POST /api/auth/login {"email":"attacker@example.com"}`. The response contains a valid `system_owner`-role JWT (8h expiry). Using that token, the attacker calls `GET /api/dashboard/export/csv` to download every respondent's name, email, team type, and all free-text/likert/ranking answers; `GET /api/dashboard/responses/:sessionId` to drill into individual respondent submissions; and `PATCH /api/config` to change the assessment due date (with a forged `changed_by` audit trail entry, since `ownerEmail` is extracted from the same unchecked token). No credential, invite, or prior privilege is required — only a syntactically valid email address.
- **Fix (pick one, this is a product decision, not just a code fix):**
  1. **If "open dashboard" was not actually intended for production:** revert to an allowlist — restore the `isSystemOwnerEmail()` check in `POST /api/auth/login` (reject with 403 `NOT_A_SYSTEM_OWNER`) and/or the `payload.role !== 'system_owner'` check in `src/lib/middleware/requireSystemOwner.ts`, and revert the `d8ad63a` spec rewrite alongside it so docs and code agree again.
  2. **If "any valid email → dashboard" is a genuine, accepted product requirement** (e.g., this is an internal-network-only tool with no external exposure): that must be an explicit, written **accepted risk** signed off by a product/security owner — not something this audit assumes on the codebase's behalf — and should be paired with compensating controls (e.g., restrict to a corporate email domain suffix, put the dashboard behind SSO/VPN, or at minimum rate-limit + log every login) since respondent PII is otherwise fully exposed to anyone who can reach the login endpoint.

### FIND-01: Production Credentials Committed to Git (`.env.local`) — CRITICAL
- **Category:** secret_leak
- **Location:** `.env.local` (tracked); `.env.local.QUARANTINED-INCIDENT-20260722` (tracked)
- **Description:** Both files remain tracked in the working tree and in git history. `.env.local` contains the production `DATABASE_URL` (`pivota-spec-driven-primary.prod.svc`, with URL-encoded password) and production `JWT_SECRET`. The "QUARANTINED" copy carries the identical secrets under a renamed filename — the rename does not remove it from git history or from disk.
- **Exploit:** Unchanged from prior audit. Anyone with read access to the repository (clone, fork, CI logs, or a compromised contributor account) can extract the production JWT signing secret and forge tokens for any role — including, given FIND-09 above, tokens that already don't even need to be forged, since the login endpoint hands them out for free. The production DB password grants direct datastore access bypassing all application-layer controls.
- **Fix:** Immediately rotate the production `JWT_SECRET` and database password. `git rm --cached .env.local .env.local.QUARANTINED-INCIDENT-20260722`. Add `.env.local*` and `.env` patterns to `.gitignore` (see FIND-08). Purge history with `git filter-repo` or BFG. Audit CI artifacts and any distributed clones for exposure.

### FIND-02: Development JWT Secret and DB Password Committed to Git (`.env`) — HIGH
- **Category:** secret_leak
- **Location:** `.env` (tracked)
- **Description:** Unchanged from prior audit. `.env` contains `JWT_SECRET=uat-test-secret-32-chars-minimum-xxxxxxxx` and a localhost dev `DATABASE_URL` with a plaintext password, committed to git history.
- **Exploit:** Anyone with repo access can forge JWTs for any role in environments sharing this secret (e.g., staging/UAT).
- **Fix:** Rotate the dev/UAT `JWT_SECRET`. `git rm --cached .env`. Add `.env` to `.gitignore`. Purge from history.

### FIND-03: TLS Certificate Verification Disabled for Production Database — HIGH
- **Category:** tls_misconfiguration
- **Location:** `src/lib/db.ts:24`; `.env.local:5` (`NODE_TLS_REJECT_UNAUTHORIZED=0`); `scripts/start.sh:6,50-51,60`
- **Description:** Unchanged from prior audit. The pg `Pool` sets `ssl: { rejectUnauthorized: false }` for all non-local connections. `NODE_TLS_REJECT_UNAUTHORIZED=0` is also exported process-wide in `scripts/start.sh` before the Node process starts, disabling TLS verification for *all* outbound HTTPS connections from the process (including the email relay `fetch()` call in `emailService.ts`).
- **Exploit:** A network-position attacker between the app and the DB/email-relay sidecars can MITM connections, reading or tampering with all respondent data in transit, without any certificate warning.
- **Fix:** Set `ssl: { rejectUnauthorized: true }` with the correct CA cert supplied via `ca:` option. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from `.env.local` and `scripts/start.sh`; if the platform sidecar uses a self-signed cert, pin its CA explicitly instead of disabling verification.

### FIND-04: Unauthenticated Email Notification Endpoint — MEDIUM
- **Category:** missing_authentication
- **Location:** `src/app/api/notifications/email/route.ts:24-39`
- **Description:** Unchanged from prior audit. `POST /api/notifications/email` has no auth guard of any kind — no import of `jwtMiddleware`, `requireSessionOwner`, or `requireSystemOwner`. It Zod-validates `{ session_id, email, name, due_date }` and always forwards to `sendSubmissionConfirmation()`.
- **Refutation check:** Confirmed the route file itself contains zero auth-related imports or logic; no upstream proxy/WAF config exists in the repo to compensate.
- **Exploit:** Any unauthenticated caller can trigger emails to arbitrary addresses with attacker-chosen `name`/`due_date` content, enabling spam/phishing under the assessment platform's sending identity, and can also be used to fingerprint whether `EMAIL_RELAY_URL` is configured.
- **Fix:** Remove the HTTP route (it is already redundant — `submissionService.ts` calls `sendSubmissionConfirmation()` directly, server-side) or add an internal pre-shared-secret header check.

---

## Resolved findings

> No prior findings were found to be fixed in this re-audit. Every prior CRITICAL/HIGH/MEDIUM finding (FIND-01 through FIND-04) and every LOW finding (FIND-05 through FIND-08) remains present and unmitigated in the current working tree, as confirmed by direct file reads in this session. See the Audit Trail below for per-finding re-verification evidence.

---

## Lower-severity findings

| ID | Severity | Title | Location | Notes |
|----|----------|-------|----------|-------|
| FIND-05 | LOW | No rate limiting on login/session creation | `POST /api/auth/login`, `POST /api/sessions` | Still no `rateLimit`/`throttle` middleware anywhere in `src/`. Combined with FIND-09, this also means brute-forcing/enumerating the (now-irrelevant) `system_owner_emails` check is moot, but general auth-endpoint abuse (spamming session creation, email enumeration via different error codes) remains unmitigated. |
| FIND-06 | LOW | `assessmentOpenGuard` failure treated as open | `src/lib/middleware/assessmentOpenGuard.ts:48-51` | Catch block still returns `{ ok: true }` on any DB error during the due-date check, silently allowing saves/submissions after the due date if the guard query itself fails. Should fail closed (503). |
| FIND-07 | LOW | `jwtVerify` without explicit algorithm pin in `requireSessionOwner` middleware | `src/lib/middleware/requireSessionOwner.ts:54` | Still does not pass `{ algorithms: ['HS256'] }`, unlike `authService.verifyJwt` (line 31) which does. Currently safe in practice (jose rejects `alg:none`/asymmetric algs against a symmetric key by default) but is a defense-in-depth gap. |
| FIND-08 | LOW | Missing `.gitignore` patterns for `.env` files | `.gitignore` | Still contains no `.env`, `.env.local`, `.env.*.local`, or `.env.local.*` pattern anywhere in the managed block (verified: only `.venv/`/`venv/` present, which are Python virtualenv patterns, not Node `.env` files). This remains the root cause enabling FIND-01/FIND-02 to recur on any future commit. |
| FIND-10 (new) | LOW | CSV export does not neutralize formula-injection characters | `src/lib/services/csvExportService.ts:13-34` | Respondent free-text answers (`free_text_short`/`free_text_long`, `other_text`) are written verbatim into CSV cells. A respondent could enter `=cmd|'/c calc'!A1` or similar as a free-text answer; if a System Owner opens the exported CSV in Excel/Sheets with legacy DDE/formula execution enabled, this could trigger local code execution on the reviewer's machine. Low likelihood (requires the reviewer's spreadsheet app to have formula execution enabled and requires reaching the (currently-broken) system_owner gate) but worth fixing alongside FIND-09. Fix: prefix cell values starting with `=`, `+`, `-`, or `@` with a single quote `'` before writing to CSV. |

---

## Accepted risks

| ID | Risk | Why accepted | Owner |
|----|------|--------------|-------|
| AR-01 | JWT stored in localStorage (both respondent and dashboard flows) | Design constraint: SPA with no server-side session store. XSS risk mitigated by React's automatic HTML escaping. Tokens are short-lived (8h/24h). Note: this accepted risk is now compounded by FIND-09 — an XSS that steals a dashboard token no longer even needs the victim to *be* a system owner, since any login grants that role. | Product |
| AR-02 | LIKE wildcard injection in `search` parameter | `ilike()` uses parameterized queries; wildcards cause table scans only, no data leakage beyond what the (intended) system_owner gate already permits. | Engineering |
| AR-03 | CSV export reads all rows into memory | Bounded by current assessment cohort size; stream-to-disk refactor deferred until scale requires it. | Engineering |
| AR-04 | `docker-compose.yml` has hardcoded DB password / placeholder JWT_SECRET | Development-only compose file; DB password is non-reusable and clearly dev-scoped; JWT_SECRET has an inline comment instructing replacement before any real deployment. | DevOps |
| AR-05 | `EMAIL_RELAY_URL` is operator-controlled, not validated against an allowlist | No SSRF risk today because the value is never derived from request input; would need re-review if this env var is ever made configurable via an authenticated API in the future. | Engineering |

---

## Audit trail

- **Diff scoped via:** `origin/main...HEAD` is effectively empty for source code (doc/metadata only); full working-tree re-scan performed instead per task instructions. `git log --oneline -5` shows the merge history; `git show 9fe4293 --stat` (227 files) was used to identify the single commit that both introduced the `.pivota/` tooling reviewed by the prior audit *and* silently regressed the dashboard auth check.
- **Register:** Built retroactively from full `src/` contents (88 files) plus prior SECURITY.md as a starting checklist; cross-referenced against `05-PLAN.md`'s own `<threat_model>`-style STRIDE table (T-05-01 through T-05-05) to establish the *intended* mitigation baseline for the dashboard routes.
- **Refutation:** 32 candidates examined across the full attack surface (auth, IDOR/session-ownership, raw SQL, secrets, TLS, unauthenticated endpoints, rate limiting, CSV/export handling, dev shell scripts, file I/O). 5 confirmed CRITICAL/HIGH (1 new: FIND-09; 4 carried forward: FIND-01, FIND-02, FIND-03, FIND-04), 5 lower-severity (4 carried forward + 1 new: FIND-10), 22 refuted/verified-safe.

| Step | Finding | Evidence Checked | Result |
|------|---------|-------------------|--------|
| Dashboard login role verification | FIND-09 (new) | `src/app/api/auth/login/route.ts:20-45` — no `isSystemOwnerEmail` call; grep confirms only caller of `isSystemOwnerEmail` is `src/app/api/sessions/route.ts:71` | **UNMITIGATED — NEW CRITICAL** |
| Dashboard middleware role check | FIND-09 (new) | `src/lib/middleware/requireSystemOwner.ts:16-27` — `verifyJwt(token)` call has no `payload.role` check; comment explicitly documents "Role check removed" | **UNMITIGATED — NEW CRITICAL** |
| Historical baseline for FIND-09 | — | `git show 8f76844:src/lib/auth/requireSystemOwner.ts` (wave 2a original) and `05-PLAN.md:1139` (T-05-01) both show/require `role !== 'system_owner'` → 403; `git show 9fe4293` diff confirms both `login/route.ts` and `middleware/requireSystemOwner.ts` were rewritten to drop this check; `git show d8ad63a` (same-day docs commit, predates `9fe4293`) shows `project_specs/FRD/F07-rbac.md` and `PRD-AssessmentForm.md:172` were rewritten to describe this exact "any email, no allowlist" model as intended | Reverses the original threat-model mitigation; current code now MATCHES the current (rewritten) spec — this is a documented design decision, not an accidental drift, but remains CRITICAL on security merits (see Fix options) |
| Dead-code correct implementation | — | `src/lib/auth/requireSystemOwner.ts:6-16` still has correct role check but zero importers (`grep -rn "from '@/lib/auth/requireSystemOwner'" src/app` → no matches) | Confirms fix must target the wired-in `middleware/` path |
| IDOR / session ownership — responses | — | `src/lib/middleware/requireSessionOwner.ts:73-98` — DB lookup + case-insensitive email comparison | SAFE |
| IDOR / session ownership — sessions | — | `src/lib/auth/requireSessionOwner.ts:23-43` + `sessionService.ts:200-203` | SAFE |
| IDOR / session ownership — submissions | — | `src/app/api/submissions/[sessionId]/route.ts:33` → `requireSessionOwner` | SAFE |
| JWT algorithm pinning (authService) | — | `src/lib/auth/authService.ts:31` — `jwtVerify(token, secret, { algorithms: ['HS256'] })` | SAFE |
| JWT algorithm pinning (middleware/requireSessionOwner) | FIND-07 | `src/lib/middleware/requireSessionOwner.ts:54` — no `algorithms` option | UNMITIGATED (LOW) |
| Secrets in committed files | FIND-01, FIND-02 | `cat .env`, `cat .env.local`, `cat .env.local.QUARANTINED-INCIDENT-20260722` — all three read directly in this session, secrets present verbatim | UNMITIGATED (CRITICAL/HIGH) |
| `.gitignore` env patterns | FIND-08 | `grep -n "env" .gitignore` → only `.venv/`, `venv/` matches; no `.env*` pattern | UNMITIGATED |
| TLS verification | FIND-03 | `src/lib/db.ts:24` read directly — `ssl: isLocal ? false : { rejectUnauthorized: false }` still present | UNMITIGATED (HIGH) |
| Raw SQL in analyticsService | — | `src/lib/services/analyticsService.ts:91-167` — all `sql` template interpolations use `q.id` from prior DB `SELECT`, never request params | SAFE |
| Answer payload validation | — | `src/lib/schemas/answerPayload.ts` — Zod discriminated union enforced in `PUT /api/responses/:sessionId` route before DB write | SAFE |
| Email endpoint auth | FIND-04 | `src/app/api/notifications/email/route.ts` — full file read, no auth import present | UNMITIGATED (MEDIUM) |
| Rate limiting | FIND-05 | `grep -rn "rate.?limit\|throttle" src/` → zero matches | UNMITIGATED (LOW) |
| Assessment closed fail-open | FIND-06 | `src/lib/middleware/assessmentOpenGuard.ts:48-51` — catch block still returns `{ ok: true }` | UNMITIGATED (LOW) |
| CSV formula injection | FIND-10 (new) | `src/lib/services/csvExportService.ts:13-34` — `flattenAnswerPayload` returns raw free-text with no leading-character sanitization before `csv-stringify` | NEW (LOW) |
| Path traversal / arbitrary file read | — | `grep -rn "readFile\|writeFile\|fs\.\|require(" src/` → zero matches | SAFE |
| Content-Disposition injection | — | `src/app/api/dashboard/export/csv/route.ts:13` — filename from `new Date().toISOString()`, server-generated only | SAFE |
| SSRF via email relay | — | `src/lib/services/emailService.ts:20` — `EMAIL_RELAY_URL` from `process.env`, never request-derived | SAFE (accepted risk) |
| `.pivota/start-dev.sh` shell injection | — | Full file read — all shell variables hardcoded, filesystem-derived, or `/proc/1/environ` platform-injected; no `eval` | SAFE |
| `.pivota/uat-start.sh` shell injection | — | Full file read — `$COMPOSE`/`$PORT`/`$BUILD_SYSTEM` are operator/sandbox env, `RUN_CMD` is one of two hardcoded strings | SAFE |
| `scripts/start.sh` shell injection | — | Full file read — `DB_URL`/`JWT` sourced from `/proc/1/environ` (platform-injected), written via heredoc, no metacharacter execution path | SAFE |
| `.pivota/dev-script.meta.json` | — | Static JSON, never executed | SAFE |
| Mass assignment / over-exposure | — | `src/lib/services/dashboardService.ts` — explicit column selects throughout, no `SELECT *` | SAFE |
