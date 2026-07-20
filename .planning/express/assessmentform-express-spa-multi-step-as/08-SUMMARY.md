---
phase: 3c-part1-frontend-dashboard-response-table
plan: "08"
subsystem: dashboard-frontend
tags: [dashboard, auth, jwt, rbac, filter, table, pagination, csv-export]
dependency_graph:
  requires: [plan-05-dashboard-api]
  provides: [dashboard-home, auth-login-endpoint, auth-guard, dashboard-layout, response-detail]
  affects: [plan-09-analytics-config]
tech_stack:
  added: []
  patterns: [jwt-localstorage, url-param-filter-sync, sessionStorage-filter-preservation, 60s-polling, suspense-searchparams]
key_files:
  created:
    - src/app/api/auth/login/route.ts (updated — email-only, no name field)
    - src/components/dashboard/AuthGuard.tsx
    - src/components/dashboard/DashboardHeader.tsx
    - src/app/dashboard/layout.tsx
    - src/app/dashboard/login/page.tsx
    - src/hooks/useDashboardFilters.ts
    - src/hooks/useDashboardData.ts
    - src/components/dashboard/SummaryStats.tsx
    - src/components/dashboard/TeamTypeCoverageBar.tsx
    - src/components/dashboard/SearchBar.tsx
    - src/components/dashboard/FilterPanel.tsx
    - src/components/dashboard/ResponseTable.tsx
    - src/components/dashboard/ResponseDetailView.tsx
    - src/app/dashboard/page.tsx
    - src/app/dashboard/responses/[sessionId]/page.tsx
  modified:
    - next.config.ts (removed X-Frame-Options; added X-XSS-Protection)
decisions:
  - "Auth login route simplified to email-only (removed name field from plan 05 stub) to match F07 spec: POST /api/auth/login accepts { email } only"
  - "DashboardHeader extracted as separate client component (rather than making layout a client component) to maintain server component layout with client-side Exit button"
  - "params in /dashboard/responses/[sessionId]/page.tsx typed as Promise<{ sessionId }> for Next.js 16 compatibility (matching existing dashboard API routes in plan 05)"
  - "X-Frame-Options removed entirely from next.config.ts headers (was SAMEORIGIN, now omitted) to satisfy DB contract: enterprise portal embedding"
metrics:
  duration_minutes: 25
  completed_date: "2026-07-20"
  tasks_completed: 2
  files_created: 15
  files_modified: 1
---

# Phase 3c-part1 Plan 08: System Owner Dashboard SPA — Summary

**One-liner:** Full System Owner dashboard with email-only JWT auth (8h system_owner role), AuthGuard client-side RBAC (no flash), paginated/sortable/filterable response table with 60s stats refresh, URL-synced filters, CSV export, and per-respondent read-only drill-down with filter-preserving back navigation.

## Tasks Completed

| # | Task | Commit | Key Artifacts |
|---|------|--------|---------------|
| 1 | Auth login API, next.config, AuthGuard, Dashboard layout + login page | `efdf7b2` | `route.ts`, `AuthGuard.tsx`, `layout.tsx`, `login/page.tsx`, `next.config.ts` |
| 2 | Dashboard home page — all components, hooks, detail view | `5829fd7` | `useDashboardFilters.ts`, `useDashboardData.ts`, `SummaryStats.tsx`, `TeamTypeCoverageBar.tsx`, `SearchBar.tsx`, `FilterPanel.tsx`, `ResponseTable.tsx`, `ResponseDetailView.tsx`, `page.tsx`, `[sessionId]/page.tsx` |

## What Was Built

### Task 1: Security Foundation

**`POST /api/auth/login`** — Updated to accept `{ email }` only (removed `name` field from earlier stub). Validates email format (Zod, 400 INVALID_EMAIL_FORMAT), checks `system_owner_emails` table case-insensitively via `isSystemOwnerEmail` service (403 NOT_A_SYSTEM_OWNER), issues HS256 JWT with `role: "system_owner"` and 8h expiry, returns `{ token, role, email }`.

**`AuthGuard`** — Client component. Reads `dashboard_token` from localStorage, decodes JWT (client-side, no signature verification), checks `role === "system_owner"` and not expired. During SSR/mount: returns `null` (no flash). If invalid: shows 403-state UI + redirects to `/dashboard/login`. If valid: renders children.

**`DashboardLayout`** — Server component wrapping `<AuthGuard>` and `<DashboardHeader>`. DashboardHeader extracted as a separate client component to handle Exit button's `onClick` (removes token, redirects to `/`). Nav links: Responses, Analytics, ⚙ Settings, Exit.

**`DashboardLoginPage`** — Email input form. POSTs to `/api/auth/login`. Stores token in localStorage on success. Shows specific error messages for `NOT_A_SYSTEM_OWNER` and `INVALID_EMAIL_FORMAT`.

**`next.config.ts`** — Removed X-Frame-Options (was SAMEORIGIN, now omitted entirely per DB contract: enterprise portal embedding). Added X-XSS-Protection, kept X-Content-Type-Options and Referrer-Policy.

### Task 2: Dashboard Home + Components

**`useDashboardFilters`** — All filter state (search, teamType[], status, submittedAfter, submittedBefore, page, sortBy, sortDir) owned by URL search params via `useSearchParams` + `router.replace`. `toQueryString()` serializes for API calls. `clearFilters()` navigates to clean `/dashboard`.

**`useDashboardData`** — Fetches `GET /api/dashboard/responses` with queryString + `Authorization: Bearer {token}`. Refreshes on queryString change.

**`useSummaryStats`** — Fetches total, submitted, draft counts in parallel from the dashboard API with `pageSize=1`. Runs on mount + every 60 seconds (`setInterval(fetchStats, 60000)`). Silent fail on error.

**`SummaryStats`** — Displays Total, Submitted (green), Draft (amber) count cards.

**`TeamTypeCoverageBar`** — Horizontal bar per team type. Amber/⚠ for 0-response types. Shows coverage count "N/4 team types represented".

**`SearchBar`** — Controlled input with `aria-label`; onChange calls parent setSearch.

**`FilterPanel`** — Team type multi-select checkboxes, status radio group (All/Submitted/Draft), date range inputs. Clear Filters + Export CSV buttons.

**`ResponseTable`** — 6 columns: Name, Email, Team Type, Status, Submitted At, Last Modified. Sortable headers with ASC/DESC indicator (aria-sort). Row click saves `window.location.search` to `sessionStorage['dashboard_filter_qs']` then navigates to `/dashboard/responses/:sessionId`. Empty state: "No responses match your current filters." Pagination: Prev/page-numbers/Next, 25/page.

**`ResponseDetailView`** — Fetches `/api/dashboard/responses/:sessionId` with Bearer token. Renders respondent metadata + all sections/answers read-only (formatAnswerPayload handles single_choice, multi_choice, likert, ranking, free_text). Back button reads `sessionStorage['dashboard_filter_qs']` to restore filter state.

**Dashboard page `/dashboard`** — Composes all components. CSV export: fetches `GET /api/dashboard/export/csv?{activeFilters}` with Bearer, downloads as `assessment-responses-{date}.csv`. Wrapped in `<Suspense>` for `useSearchParams` compatibility (Next.js App Router requirement).

**Response detail page `/dashboard/responses/:sessionId`** — Async params (`Promise<{ sessionId }>`) for Next.js 16 compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Simplified auth login route to email-only request**
- **Found during:** Task 1
- **Issue:** Existing stub at `src/app/api/auth/login/route.ts` required `{ email, name }` (both fields) — contradicting F07 spec which only needs email. Name is not part of System Owner flow.
- **Fix:** Rewrote route to accept `{ email }` only. Validates with `z.string().email()`. Uses existing `isSystemOwnerEmail` + `signJwt` services from plan 05.
- **Files modified:** `src/app/api/auth/login/route.ts`
- **Commit:** `efdf7b2`

**2. [Rule 2 - Architecture] Extracted DashboardHeader as client component**
- **Found during:** Task 1
- **Issue:** Plan spec's `DashboardLayout` had `onClick` handler inline in a server component — Next.js server components cannot have event handlers.
- **Fix:** Extracted `DashboardHeader` as a separate `'use client'` component handling the Exit button. Layout remains a server component.
- **Files modified:** Created `src/components/dashboard/DashboardHeader.tsx`
- **Commit:** `efdf7b2`

**3. [Rule 1 - Bug] Next.js 16 async params for dynamic route**
- **Found during:** Task 2
- **Issue:** Plan spec used `params: { sessionId: string }` but project uses Next.js 16 where dynamic route params are `Promise<{ sessionId: string }>`.
- **Fix:** Response detail page uses `async function` + `await params` pattern, matching existing dashboard API routes.
- **Files modified:** `src/app/dashboard/responses/[sessionId]/page.tsx`
- **Commit:** `5829fd7`

**4. [Rule 1 - Bug] next.config uses .ts extension, not .mjs**
- **Found during:** Task 1
- **Issue:** Plan specified creating `next.config.mjs` but project uses `next.config.ts`. Creating a new file would conflict.
- **Fix:** Updated existing `next.config.ts` to remove X-Frame-Options (was SAMEORIGIN) and add X-XSS-Protection per plan spec.
- **Files modified:** `next.config.ts`
- **Commit:** `efdf7b2`

## Integration Contracts Verified

| Contract | Status |
|----------|--------|
| `GET /api/dashboard/responses` from plan 05 | ✓ Consumed by `useDashboardData` |
| `GET /api/dashboard/responses/:sessionId` from plan 05 | ✓ Consumed by `ResponseDetailView` |
| `GET /api/dashboard/export/csv` from plan 05 | ✓ Consumed by export handler in dashboard page |
| `DashboardLayout` exports default | ✓ Contract OK |
| `DashboardPage` exports default | ✓ Contract OK |
| `ResponseDetailPage` exports default | ✓ Contract OK |
| `POST /api/auth/login` exports POST | ✓ Contract OK |
| `AuthGuard` named export | ✓ Contract OK |
| `useDashboardFilters` named export | ✓ Contract OK |

## Self-Check: PASSED

- [x] All 15 files created/modified exist on disk
- [x] `efdf7b2` commit exists in git log
- [x] `5829fd7` commit exists in git log
- [x] TypeScript compiles clean (`npx tsc --noEmit` — no output = success)
- [x] All plan verification checks passed
