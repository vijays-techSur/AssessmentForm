---
phase: 4b-integration-e2e-tests
plan: 11
subsystem: e2e-test-suite
tags: [playwright, e2e, rtm, wcag, accessibility, cross-browser, journeys]
dependency_graph:
  requires: [plan-10-docker-stack]
  provides: [rtm-test-coverage, wcag-audit, cross-browser-smoke, persona-journeys]
  affects: [ci-pipeline, release-gate]
tech_stack:
  added: ["@playwright/test@1.62.1", "@axe-core/playwright@4.12.1"]
  patterns: [page-object-helpers, api-request-fixtures, route-interception, axe-core-integration]
key_files:
  created:
    - playwright.config.ts (updated)
    - e2e/helpers/setup.ts
    - e2e/helpers/auth.ts
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
    - e2e/accessibility/wcag-audit.spec.ts
    - e2e/smoke/cross-browser.spec.ts
  modified:
    - package.json (added @axe-core/playwright, test:e2e scripts)
decisions:
  - "workers=1 serial execution for shared Docker DB to avoid state conflicts"
  - "axe-core filters to critical+serious WCAG violations only (not minor cosmetic)"
  - "test.skip() used for conditional tests that depend on seeded data (ranking, Other, etc.)"
  - "Unique emails per test (Date.now()) to prevent cross-test contamination"
  - "APIRequestContext helpers used for server-side validations instead of UI navigation"
metrics:
  duration: "~15 minutes"
  completed: "2026-08-05"
  tasks: 2
  files: 18
---

# Phase 4b Plan 11: E2E Integration Test Suite Summary

## One-liner

Complete Playwright E2E suite: 89 RTM test cases (TEST-F0-01 through TEST-F9-06) + 6 persona journey integration tests + axe-core WCAG 2.1 AA audit + cross-browser smoke tests for chromium and firefox.

## What Was Built

### Task 1: Playwright Configuration & RTM Feature Specs (commit fa941d5)

**playwright.config.ts** — Updated from UAT config to full E2E config:
- `baseURL: http://localhost:3000` (Docker stack target)
- `chromium` + `firefox` projects (Desktop Chrome & Firefox)  
- `workers: 1` — serial execution for shared PostgreSQL state
- `timeout: 30s`, `expect: 10s`
- HTML + list reporters

**e2e/helpers/setup.ts** — API-level test data factories:
- `createRespondentSession()` — POST /api/sessions with unique email
- `createSystemOwnerToken()` — POST /api/auth/login
- `submitSession()` — POST /api/submissions/:sessionId
- `setAssessmentClosed()` / `setAssessmentOpen()` — PATCH /api/config

**e2e/helpers/auth.ts** — UI-level auth helpers:
- `loginAsRespondent()` — fills identity form, waits for section screen
- `loginAsSystemOwner()` — navigates /dashboard/login, waits for dashboard URL

**10 RTM Feature Spec Files (89 test cases total):**

| File | Tests | RTM Range |
|------|-------|-----------|
| f0-workflow.spec.ts | 10 | TEST-F0-01–10 |
| f1-identity-session.spec.ts | 8 | TEST-F1-01–08 |
| f2-question-types.spec.ts | 14 | TEST-F2-01–14 |
| f3-section-routing.spec.ts | 8 | TEST-F3-01–08 |
| f4-autosave.spec.ts | 7 | TEST-F4-01–07 |
| f5-deduplication-editwindow.spec.ts | 8 | TEST-F5-01–08 |
| f6-dashboard.spec.ts | 12 | TEST-F6-01–12 |
| f7-rbac.spec.ts | 10 | TEST-F7-01–10 |
| f8-config.spec.ts | 6 | TEST-F8-01–06 |
| f9-confirmation.spec.ts | 6 | TEST-F9-01–06 |

### Task 2: Persona Journeys, Accessibility Audit, Cross-Browser Smoke (commit f324008)

**e2e/journeys/jrn-01-marcus.spec.ts** — Marcus Reid (program_project):
- JRN-01.1: First-time two-session completion (stages 1–6)
- JRN-01.2: Re-entry to correct a hasty answer (stages 1–5), direct section jump (US-0.5), "updated" confirmation

**e2e/journeys/jrn-02-priya.spec.ts** — Priya Nair (platform_engineering):
- JRN-02.1: Single-session with ranking + free-text + Other option
- JRN-02.2: Revision after team discussion, deduplication verified via API

**e2e/journeys/jrn-03-dana.spec.ts** — Dana Okafor (System Owner):
- JRN-03.1: Config panel, Active status, participation monitoring, drill-down ≤2 clicks, email column
- JRN-03.2: Closed status, drill-down, CSV export with correct filename, analytics charts

**e2e/accessibility/wcag-audit.spec.ts** — 5 WCAG 2.1 AA tests:
- WCAG-01: Landing page (identity form) — zero critical/serious violations
- WCAG-02: Assessment section screen — zero critical/serious violations
- WCAG-03: Dashboard response list — zero critical/serious violations
- WCAG-04: Progress bar ARIA labels (aria-label or aria-labelledby required)
- WCAG-05: Likert keyboard navigation (arrow keys, WCAG 2.1 AA)

**e2e/smoke/cross-browser.spec.ts** — 7 smoke tests running on chromium + firefox:
- SMOKE-01: Identity form renders and accepts input
- SMOKE-02: Assessment section navigation (Next/Previous)
- SMOKE-03: API health endpoint (/api/health → 200, status:ok, db:connected)
- SMOKE-04: System Owner login and dashboard load
- SMOKE-05: RBAC enforcement (respondent blocked from /dashboard)
- SMOKE-06: Question types render (radio, checkbox, textarea)
- SMOKE-07: Auto-save indicator visible

## Test Discovery Results

```
npx playwright test --list → 322 tests in 16 files
```

Breakdown:
- 89 RTM feature tests (f0–f9 spec files)
- ~18 journey tests (JRN-01.1, JRN-01.2, JRN-02.1, JRN-02.2, JRN-03.1, JRN-03.2)
- 5 WCAG accessibility tests
- 7 cross-browser smoke tests
- 39 existing UAT tests (e2e/uat/ — unchanged)
- Chromium + Firefox projects × most tests = 2× count

**Exceeds the ≥107 minimum requirement** (322 total, 119 new non-UAT tests).

## Integration Contracts Verified

| Contract | Verification | Result |
|----------|-------------|--------|
| Dockerfile EXPOSE 3000 | `grep -n 'EXPOSE 3000' Dockerfile` | ✓ Line 38 |
| docker-compose.yml ports 3000:3000 | `grep -n '3000:3000' docker-compose.yml` | ✓ Line 28 |
| docker-compose.yml postgres service | `grep -n 'postgres' docker-compose.yml` | ✓ postgres:16 |
| /api/health GET export | `grep -n 'export.*GET' src/app/api/health/route.ts` | ✓ Line 9 |
| playwright.config.ts baseURL | `grep -n 'baseURL' playwright.config.ts` | ✓ |
| chromium project | `grep -n 'chromium' playwright.config.ts` | ✓ |
| firefox project | `grep -n 'firefox' playwright.config.ts` | ✓ |

## Deviations from Plan

None — plan executed exactly as written. All spec files created with exact content from the plan spec. TypeScript compiles without errors. Test discovery confirms ≥107 tests (322 actual).

## Known Stubs

None found. All test implementations are complete. Tests that target features not available in the current section (e.g. ranking questions for program_project, "Other" option) use `test.skip()` with a clear reason rather than a blocking stub — this is intentional conditional behavior, not incomplete implementation.

## To Run the Full Suite

```bash
# 1. Start Docker stack (from wave 10)
docker compose up -d

# 2. Wait for health check
until curl -sf http://localhost:3000/api/health | grep -q '"status":"ok"'; do sleep 5; done && echo "STACK READY"

# 3. Run all RTM feature tests (chromium only for speed)
npx playwright test e2e/f*.spec.ts --project=chromium --reporter=list

# 4. Run persona journey tests
npx playwright test e2e/journeys/ --project=chromium --reporter=list

# 5. Run WCAG 2.1 AA accessibility audit
npx playwright test e2e/accessibility/ --project=chromium --reporter=list

# 6. Run cross-browser smoke tests (chromium + firefox)
npx playwright test e2e/smoke/ --reporter=list

# 7. Full suite
npx playwright test --reporter=list
```

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| playwright.config.ts exists | ✓ |
| e2e/helpers/setup.ts exists | ✓ |
| e2e/helpers/auth.ts exists | ✓ |
| All 10 RTM spec files exist (f0–f9) | ✓ |
| All 3 journey spec files exist (jrn-01,02,03) | ✓ |
| WCAG audit spec exists | ✓ |
| Cross-browser smoke spec exists | ✓ |
| TEST-F0-01 through TEST-F0-10 present | ✓ |
| TEST-F9-06 present | ✓ |
| 89 RTM tests (grep count) | ✓ |
| 322 tests total (playwright --list) | ✓ |
| TypeScript compiles (tsc --noEmit) | ✓ |
| Task 1 commit fa941d5 | ✓ |
| Task 2 commit f324008 | ✓ |
| Integration contracts (Dockerfile, compose, health) | ✓ |
| No blocking stubs | ✓ |
