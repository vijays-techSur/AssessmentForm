---
phase: 4c-bugfix-polish
plan: 12
subsystem: bugfix-polish
tags: [bugfix, port, tls, search_path, autosave, zod, team_type, appnav, seed, migrations]
dependency_graph:
  requires: [plan-11-e2e-tests]
  provides: [stable-deployment, correct-autosave, global-nav, dashboard-access]
  affects: [all-features, deployment, e2e-tests]
tech_stack:
  added: []
  patterns: [ref-based-hooks, connection-string-params, process-level-env-export, sticky-nav, promise-boolean-gate]
key_files:
  created:
    - src/components/AppNav.tsx
  modified:
    - package.json
    - scripts/start.sh
    - .pivota/start-dev.sh
    - docker-compose.yml
    - playwright.config.ts
    - next.config.ts
    - src/lib/db.ts
    - src/hooks/useAutoSave.ts
    - src/app/assessment/page.tsx
    - src/app/api/sessions/route.ts
    - src/app/api/sessions/[sessionId]/route.ts
    - src/lib/validation.ts
    - src/types/session.ts
    - src/app/layout.tsx
    - src/app/dashboard/components/DashboardHeader.tsx
    - drizzle/seed.ts
    - drizzle/migrations/0000_initial.sql
    - e2e/f0-workflow.spec.ts
    - e2e/f1-identity-session.spec.ts
    - e2e/f2-question-types.spec.ts
    - e2e/f3-section-routing.spec.ts
    - e2e/f4-autosave.spec.ts
    - e2e/f5-deduplication-editwindow.spec.ts
    - e2e/f6-dashboard.spec.ts
    - e2e/f7-rbac.spec.ts
    - e2e/f8-config.spec.ts
    - e2e/f9-confirmation.spec.ts
    - e2e/journeys/jrn-01-marcus.spec.ts
    - e2e/journeys/jrn-02-priya.spec.ts
    - e2e/journeys/jrn-03-dana.spec.ts
    - e2e/smoke/cross-browser.spec.ts
    - project_specs/TechArch-AssessmentForm.md
decisions:
  - "Refs used for all useAutoSave params to avoid stale closure without expanding dep array"
  - "performSave returns Promise<boolean> so callers can gate navigation on save success"
  - "search_path in URL params not pool.on('connect') to eliminate async race condition"
  - "NODE_TLS_REJECT_UNAUTHORIZED exported in shell scripts not .env.local so it applies before TLS stack init"
  - "z.string().min(1) not z.string().uuid() for question_id — seed deterministic IDs are not RFC 4122 but are valid PK values"
  - "AppNav hidden on /dashboard/* via usePathname — dashboard has its own DashboardHeader"
  - "vijay@gmail.com removed from system_owner_emails — dual respondent+owner registration breaks respondent guard"
metrics:
  duration: "~2 hours"
  completed: "2026-08-11"
  tasks: 4
  files: 33
  fixes: 15
---

# Phase 4c Plan 12: Bug-Fix & Polish Summary

## One-liner

15 targeted fixes across infrastructure startup, auto-save reliability, API validation, and navigation UX — resolving all blocking issues discovered after the initial build in the Pivota Preview deployment environment.

## What Was Fixed

### Task 1: Infrastructure & Startup (Fixes 1–6)

#### Fix 1 — Port 3000 → 4000

Port 3000 was occupied by the Pivota platform host. Every startup attempt failed with `EADDRINUSE`.

Changed in: `package.json` (`dev`/`start` scripts), `scripts/start.sh`, `.pivota/start-dev.sh`, `docker-compose.yml` (port mapping `4000:4000`), `playwright.config.ts` (`baseURL: http://localhost:4000`), all 13 e2e spec files (hardcoded `localhost:3000` → `localhost:4000`), `next.config.ts` comment, `project_specs/TechArch-AssessmentForm.md`.

#### Fix 2 — NODE_TLS_REJECT_UNAUTHORIZED process-level export

Setting this variable in `.env.local` had no effect — Next.js loads `.env.local` after the Node.js TLS stack initialises, so the TLS peer certificate error persisted on every database connection.

Moved to `export NODE_TLS_REJECT_UNAUTHORIZED=0` at the very top of `scripts/start.sh` and `.pivota/start-dev.sh`, before any node process is started.

#### Fix 3 — DB search_path via connection string URL parameter

The `pool.on('connect', client => client.query('SET search_path...'))` approach has an inherent async race: the `SET` query is dispatched asynchronously, and the first application query may run before it completes, hitting "relation does not exist" on the `assessmentform` schema.

Fixed by appending `options=-csearch_path%3Dassessmentform%2Cpublic` directly to the `DATABASE_URL` in `buildConnectionString()` in `src/lib/db.ts`. PostgreSQL processes connection parameters synchronously at connection time, before any query runs. The `pool.on('connect')` handler was removed entirely.

#### Fix 4 — npm ci in start-dev.sh

`.pivota/start-dev.sh` was generated from a docker-compose template that left `LOCK_FILE_PATH` and `INSTALL_CMD` empty. The application started with no `node_modules`, immediately crashing with `Cannot find module`.

Added a lockfile sentinel pattern: checks for `node_modules` directory, runs `npm ci || npm install` on the first boot, and skips on subsequent warm boots.

#### Fix 5 — Local next binary

`npx next dev` resolves Next.js from the npm registry at runtime, potentially downloading a version mismatched with `package.json`. Replaced with `./node_modules/.bin/next dev` in all start scripts to guarantee the pinned version is used.

#### Fix 6 — allowedDevOrigins for Pivota Preview

Next.js 16 rejects cross-origin requests from iframes by default. The Pivota Preview environment embeds the application at `*.preview.pivota-ng.pivota.dev`, which was blocked with a 403 cross-origin error.

Added to `next.config.ts`:
```typescript
allowedDevOrigins: ['*.preview.pivota-ng.pivota.dev'],
```

---

### Task 2: Auto-Save Reliability (Fixes 7–8)

#### Fix 7 — Auto-save stale closure

`useAutoSave` created `performSave` with `getResponses`, `sessionId`, `token`, `sectionId`, and `currentSectionIndex` in its dependency array. On mount, `currentQuestions` is an empty array (questions haven't loaded yet), so `getResponses()` returns `[]`. The memoised closure captured this empty state and reused it on every subsequent call — auto-saves were silently POSTing an empty responses array.

**Root fix:** Stored all save parameters in `useRef` instances. Sync effects keep refs current on every render. `performSave` uses `useCallback(async () => { ... }, [])` — an empty dependency array — and reads from refs at call time. The closure is never stale.

#### Fix 8 — Navigation blocked on save failure

`triggerSave()` returned `void`. `handleNext` called it and immediately navigated, regardless of whether the network request succeeded. Failed saves (network errors, 4xx, 5xx) were silently swallowed; the user navigated away thinking their data was saved when it wasn't.

**Fix:** `performSave` now returns `Promise<boolean>` (true = HTTP 2xx, false = any error). `triggerSave` propagates this boolean. `handleNext`, `handlePrevious`, and `handleJump` in `AssessmentWizard` await the result; if `false`, navigation is blocked and a red error banner is rendered:
```
"Failed to save your answers. Please check your connection and try again."
```

---

### Task 3: API & Validation (Fixes 9–11)

#### Fix 9 — Zod UUID validation rejected seed IDs

`ResponseItemSchema` used `z.string().uuid()`. The seed script generates deterministic question IDs like `"00000001-0001-0001-0001-000000000001"`. These are hyphen-formatted but not RFC 4122–compliant (variant and version bits are wrong). Every save attempt returned `400 INVALID_INPUT`.

Changed to `z.string().min(1)`. The database enforces FK integrity; Zod only needs to confirm the field is non-empty.

#### Fix 10 — team_type missing from session response

`AssessmentWizard` read `team_type` exclusively from `localStorage`. In a fresh Pivota Preview iframe, `localStorage` is always empty. With `teamType = null`, the sections fetch either failed or returned zero sections.

Three-part fix:
1. `POST /api/sessions` now includes `team_type` in its response JSON.
2. `GET /api/sessions/[sessionId]` now includes `team_type` in its response JSON.
3. `SessionResponse` interface in `src/types/session.ts` gains `team_type: string`.
4. `AssessmentWizard` falls back to `session.team_type` when `localStorage` is empty, then writes the value to `localStorage` for subsequent renders.

#### Fix 11 — Loading assessment hang (consequence of fix 10)

With `team_type` always `null`, the sections API received `teamType=null` and returned an error or empty array. `AssessmentWizard` remained in a loading state indefinitely.

Resolved as a direct consequence of fix 10 — no additional code changes required.

---

### Task 4: Navigation & UX (Fixes 12–15)

#### Fix 12 — Global AppNav

No navigation bar existed on the respondent-facing routes. Users could not reach the dashboard or log out without knowing the URL.

Created `src/components/AppNav.tsx`: a sticky top nav bar with the brand name, a "System Owner Dashboard" link, and a "Logout" button (visible when a respondent `token` exists in `localStorage`). Mounted in `src/app/layout.tsx` above `{children}`. The component returns `null` on any route starting with `/dashboard` — the dashboard has its own `DashboardHeader`.

#### Fix 13 — Dashboard access and DashboardHeader polish

The "System Owner Dashboard" link in `AppNav` provides the navigation entry point to `/dashboard`. `DashboardHeader` received two changes:
- "Exit" button renamed to "Logout" with correct logout behaviour (clears cookie + localStorage, redirects to `/dashboard/login`).
- Responses/Analytics/Settings tabs now have hover states (`hover:text-gray-900 hover:border-gray-300`) matching the active tab's underline pattern.

#### Fix 14 — System owner seeding

`system_owner_emails` was empty after seeding — nobody could log into the dashboard. Additionally, `vijay@gmail.com` appeared in both the respondents table and `system_owner_emails`, which triggered the "This email is registered as a System Owner" guard on the respondent identity form, blocking test logins.

Changes to `drizzle/seed.ts`:
- Added `admin@assessmentform.dev` to `system_owner_emails` with `onConflictDoNothing()`.
- Removed `vijay@gmail.com` from `system_owner_emails`.

#### Fix 15 — Migration FK references

`drizzle/migrations/0000_initial.sql` contained `REFERENCES "public"."questions"("id")` for foreign keys. All application tables reside in the `assessmentform` schema; the `public` schema has no `questions` table. These FKs caused migration failures on a clean database (`ERROR: relation "public.questions" does not exist`).

Replaced all occurrences of `REFERENCES "public"."questions"` with `REFERENCES "assessmentform"."questions"` in the migration file. Same correction applied to any other FK constraints using the `public` schema prefix for tables in `assessmentform`.

---

## Fix Impact Matrix

| Fix | Symptom | Root Cause | Files Changed |
|-----|---------|-----------|---------------|
| 1 | App fails to start (EADDRINUSE) | Port 3000 occupied by platform | package.json, start.sh, start-dev.sh, docker-compose.yml, playwright.config.ts, all e2e |
| 2 | TLS peer cert error on DB connect | NODE_TLS_REJECT_UNAUTHORIZED loaded too late | start.sh, start-dev.sh |
| 3 | "relation does not exist" on first query | Async race in pool.on('connect') | src/lib/db.ts |
| 4 | Cannot find module on cold boot | npm install never ran | .pivota/start-dev.sh |
| 5 | Module version mismatch | npx downloads mismatched Next.js | start.sh, start-dev.sh |
| 6 | 403 in Pivota Preview iframe | Cross-origin request blocked by Next.js | next.config.ts |
| 7 | Auto-save sends empty responses | Stale closure on getResponses | src/hooks/useAutoSave.ts |
| 8 | Data loss on network error | triggerSave returned void; nav always proceeded | src/hooks/useAutoSave.ts, assessment/page.tsx |
| 9 | 400 INVALID_INPUT on every save | z.string().uuid() rejects seed IDs | src/lib/validation.ts |
| 10 | team_type null in fresh iframe | API didn't return team_type | sessions/route.ts, [sessionId]/route.ts, types/session.ts, assessment/page.tsx |
| 11 | Assessment hangs on loading | Consequence of fix 10 | (resolved by fix 10) |
| 12 | No way to navigate to dashboard | No global nav bar | src/components/AppNav.tsx, layout.tsx |
| 13 | Broken Exit button; no tab hovers | DashboardHeader missing polish | dashboard/components/DashboardHeader.tsx |
| 14 | Nobody can log into dashboard | system_owner_emails empty; vijay dual-registration | drizzle/seed.ts |
| 15 | Migration fails on clean DB | FK refs use public schema not assessmentform | drizzle/migrations/0000_initial.sql |

---

## Deviations from Initial Build

All fixes were implemented post-phase-11 as defects were discovered during Pivota Preview deployment. The plan documents these fixes retrospectively; no deviations from the plan itself occurred since this phase was authored to match the implementation.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| Port 4000 in package.json | ✓ |
| Port 4000 in docker-compose.yml | ✓ |
| PORT 4000 in playwright.config.ts | ✓ |
| NODE_TLS_REJECT_UNAUTHORIZED in start.sh | ✓ |
| NODE_TLS_REJECT_UNAUTHORIZED in start-dev.sh | ✓ |
| search_path in buildConnectionString() | ✓ |
| pool.on('connect') removed | ✓ |
| npm ci in start-dev.sh | ✓ |
| ./node_modules/.bin/next in start scripts | ✓ |
| allowedDevOrigins in next.config.ts | ✓ |
| useRef in useAutoSave | ✓ |
| performSave returns Promise<boolean> | ✓ |
| Error banner in AssessmentWizard | ✓ |
| z.string().min(1) in ResponseItemSchema | ✓ |
| team_type in POST /api/sessions response | ✓ |
| team_type in GET /api/sessions/[id] response | ✓ |
| team_type in SessionResponse type | ✓ |
| team_type fallback in AssessmentWizard | ✓ |
| AppNav.tsx created | ✓ |
| AppNav in layout.tsx | ✓ |
| AppNav hidden on /dashboard/* | ✓ |
| Logout button in DashboardHeader | ✓ |
| Tab hover states in DashboardHeader | ✓ |
| admin@assessmentform.dev in seed | ✓ |
| vijay@gmail.com not in system_owner_emails | ✓ |
| FK references use assessmentform schema | ✓ |
| TypeScript compiles (tsc --noEmit) | ✓ |
