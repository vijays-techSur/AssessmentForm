---
phase: 2d-backend-dashboard-config
plan: "05"
subsystem: backend-dashboard-config
tags: [dashboard, analytics, csv-export, config-management, system-owner, rbac]
dependency_graph:
  requires:
    - plan: "01"
      artifacts: [drizzle/schema.ts]
      exports: [sessions, respondents, responses, questions, sections, assessmentConfig, configAuditLog]
  provides:
    - artifact: src/lib/services/dashboardService.ts
      exports: [getResponseList, getResponseDetail]
    - artifact: src/lib/services/analyticsService.ts
      exports: [getAnalyticsData]
    - artifact: src/lib/services/csvExportService.ts
      exports: [buildCsvExportStream]
    - artifact: src/lib/services/configService.ts
      exports: [getConfig, patchConfig]
    - artifact: src/app/api/dashboard/responses/route.ts
      exports: [GET]
    - artifact: src/app/api/dashboard/responses/[sessionId]/route.ts
      exports: [GET]
    - artifact: src/app/api/dashboard/analytics/route.ts
      exports: [GET]
    - artifact: src/app/api/dashboard/export/csv/route.ts
      exports: [GET]
    - artifact: src/app/api/config/route.ts
      exports: [GET, PATCH]
  affects:
    - wave 3c System Owner Dashboard SPA (ResponseTable, AnalyticsPanel, ConfigPanel)
tech_stack:
  added:
    - csv-stringify@6.8.1 (already in package.json, now actively used for row-by-row async generator streaming)
  patterns:
    - Direct await requireSystemOwner(req) pattern returning NextResponse|null (vs HOF pattern used in older auth)
    - Drizzle ORM parameterized queries throughout (no string interpolation into SQL)
    - Async generator Readable.from() for streaming CSV assembly
    - Singleton config row (id=1) with separate configAuditLog append-only write
key_files:
  created:
    - src/lib/middleware/requireSystemOwner.ts
    - src/lib/services/dashboardService.ts
    - src/lib/services/analyticsService.ts
    - src/lib/services/csvExportService.ts
    - src/lib/services/configService.ts
    - src/app/api/dashboard/responses/route.ts
    - src/app/api/dashboard/responses/[sessionId]/route.ts
    - src/app/api/dashboard/analytics/route.ts
    - src/app/api/dashboard/export/csv/route.ts
    - src/app/api/config/route.ts
  modified: []
decisions:
  - "requireSystemOwner created at src/lib/middleware/requireSystemOwner.ts using direct-await NextRequest→NextResponse|null pattern, distinct from the HOF pattern in src/lib/auth/requireSystemOwner.ts — avoids wrapping pattern mismatch with plan's usage"
  - "params destructuring uses await params in Next.js 15 dynamic route handlers to avoid deprecation warnings"
  - "CSV streaming materializes full buffer before sending (not true chunked streaming) because Next.js App Router NextResponse does not support Node.js Readable streams directly"
metrics:
  duration: "~20 minutes"
  completed: "2026-07-20"
  tasks_completed: 2
  files_created: 10
---

# Phase 2d Plan 05: System Owner Dashboard Backend + Config Management Summary

**One-liner:** JWT-gated dashboard API (paginated response list, session drill-down, analytics aggregations, CSV export) and assessment config CRUD with audit log — all five endpoints enforce `requireSystemOwner` before any DB access.

---

## Services Implemented

### `src/lib/services/dashboardService.ts`

Exports `getResponseList` and `getResponseDetail`.

**`getResponseList(params)`** — `Promise<PaginatedResponseList>`
- Pagination: 1-based `page`, `pageSize` (default 25, max 100)
- Sorting: `sortBy` ∈ {`submitted_at`, `name`, `email`, `team_type`, `status`, `last_modified_at`}, `sortDir` ∈ {`asc`, `desc`}
- Filters: `teamType` (multi-value, `ANY(array)` SQL), `status` (`all`/`submitted`/`draft`), `submittedAfter`/`submittedBefore` (inclusive ISO date), `search` (case-insensitive `ilike` on name + email)
- Returns: `{ total, page, pageSize, data: ResponseListItem[], duplicate_count: 0 }`

**`getResponseDetail(sessionId)`** — `Promise<ResponseDetail | null>`
- Fetches session + respondent row; returns `null` if not found
- Builds sections in `section_ids_ordered` order (respondent's actual section sequence)
- Left-joins responses to questions — unanswered questions return `answer_payload: null`

---

### `src/lib/services/analyticsService.ts`

Exports `getAnalyticsData(teamTypeFilter?)`.

**Four analytics aggregations:**

1. **`response_counts_by_team_type`** — `COUNT(*)` GROUP BY `respondents.team_type` for submitted sessions; all 4 team types seeded to 0.
2. **`likert_distributions`** — Per likert question: `COUNT(*)` grouped by `(answer_payload->>'value')::int` across submitted sessions joined via subquery. Distribution buckets 1–5 always present (0 if no responses).
3. **`ranking_top_items`** — Per ranking question: raw SQL using `jsonb_array_elements_text(answer_payload->'order') WITH ORDINALITY` to expand ranked arrays, computes `AVG(rank_pos)` per `item_id`, ordered ascending (lower = higher preference). Options mapped by UUID to `option_text`.
4. **`choice_breakdowns`** — Per single_choice/multi_choice question: raw SQL extracts `answer_payload->>'value'` (single) or `jsonb_array_elements_text(answer_payload->'values')` (multi); counts + percentage of submitted response total.

Optional `teamTypeFilter` (`string[]`) narrows `response_counts_by_team_type` and the session subquery for all aggregations.

---

### `src/lib/services/csvExportService.ts`

Exports `buildCsvExportStream(params)` — returns `Readable`.

**Column order:** `respondent_name`, `respondent_email`, `team_type`, `submission_status`, `submitted_at`, `last_modified_at`, then one column per question ordered by `questions.display_order`.

**Answer payload flattening per type:**

| Type | Output |
|------|--------|
| `single_choice` | option text; `Other: {other_text}` if value=`'other'` |
| `multi_choice` | values joined by `"; "`; `Other: {other_text}` for `'other'` |
| `likert` | numeric value as string |
| `ranking` | option texts joined by `" > "` in ranked order |
| `free_text_short` / `free_text_long` | raw text value |
| unknown | `JSON.stringify(payload)` |

**Implementation note:** CSV is assembled via an async generator `Readable.from()` using `csv-stringify` per-row, then buffered into a `Buffer` before response (Next.js App Router does not support `Readable` in `NextResponse` directly).

---

### `src/lib/services/configService.ts`

Exports `getConfig()` and `patchConfig(newDueDate, changedBy)`.

**`getConfig()`** — reads singleton row (`id = 1`), computes `status` dynamically:
- `'upcoming'`: now < `launch_date`
- `'active'`: `launch_date` ≤ now ≤ `due_date`
- `'closed'`: now > `due_date`

Status is never stored; computed on every call.

**`patchConfig(newDueDate, changedBy)`** — updates singleton, then writes `config_audit_log`:
```
{ changed_by, field_changed: 'due_date', old_value, new_value, changed_at }
```
Throws `'CONFIG_NOT_FOUND'` if singleton missing (route handler maps to 500).

---

## API Endpoints

| Method | Path | Auth | Key Behavior |
|--------|------|------|-------------|
| GET | `/api/dashboard/responses` | requireSystemOwner | Paginated list; 400 `INVALID_DATE_RANGE` if after > before |
| GET | `/api/dashboard/responses/:sessionId` | requireSystemOwner | Full drill-down; 404 `RESPONSE_NOT_FOUND` |
| GET | `/api/dashboard/analytics` | requireSystemOwner | Four aggregations; optional `teamType` filter |
| GET | `/api/dashboard/export/csv` | requireSystemOwner | `Content-Disposition: attachment; filename="assessment-responses-YYYY-MM-DD.csv"` |
| GET | `/api/config` | requireSystemOwner | Computed status field |
| PATCH | `/api/config` | requireSystemOwner | 400 `INVALID_DATE_FORMAT` if not valid ISO 8601; audit log written |

All 5 route handlers call `requireSystemOwner(req)` as the **first** statement before any DB access (401/403 returned before touching the database).

---

## Auth Middleware Pattern

Created `src/lib/middleware/requireSystemOwner.ts` with a **direct-await pattern**:
```typescript
const authError = await requireSystemOwner(req);
if (authError) return authError;
```

This is distinct from the HOF pattern at `src/lib/auth/requireSystemOwner.ts` (used by older routes). The middleware verifies JWT via `verifyJwt()` from `authService`, checks `payload.role === 'system_owner'`, and returns `null` (authorized) or a `NextResponse` (401/403).

---

## Deviations from Plan

### Auto-applied Adaptations (not deviations from spec)

**1. [Rule 3 - Blocking] `params` async destructuring in Next.js 15 dynamic route**
- **Found during:** Task 1, `[sessionId]/route.ts`
- **Issue:** Next.js 15 requires `params` to be awaited (`Promise<{ sessionId: string }>`) in dynamic route handlers; the plan's type signature used the older synchronous form
- **Fix:** Changed `{ params }: { params: { sessionId: string } }` → `{ params }: { params: Promise<{ sessionId: string }> }` + `const { sessionId } = await params`
- **Files modified:** `src/app/api/dashboard/responses/[sessionId]/route.ts`

**2. [Rule 3 - Blocking] Created `src/lib/middleware/requireSystemOwner.ts` (new file)**
- **Found during:** Task 1
- **Issue:** Plan imports `requireSystemOwner` from `@/lib/middleware` using `await requireSystemOwner(req)` pattern, but existing implementation at `src/lib/auth/requireSystemOwner.ts` is a HOF (`(handler) => (req) => ...`) not compatible with the plan's call sites
- **Fix:** Created new direct-await middleware at `src/lib/middleware/requireSystemOwner.ts` that calls `verifyJwt` from authService; leaves existing HOF at `src/lib/auth/` untouched
- **Impact:** No breaking change to existing routes

**3. [Rule 1 - Bug] `csv-stringify` callback type annotation**
- **Found during:** Task 2
- **Issue:** TypeScript complained about the callback type in `stringify([row], (err, output) => ...)` — `err` needed `Error | null | undefined`
- **Fix:** Explicit callback typing: `(err: Error | null | undefined, output: string | undefined)`

### No architectural changes — all within TechArch scope.

---

## Self-Check: PASSED

All created files exist:
- ✓ `src/lib/middleware/requireSystemOwner.ts`
- ✓ `src/lib/services/dashboardService.ts`
- ✓ `src/lib/services/analyticsService.ts`
- ✓ `src/lib/services/csvExportService.ts`
- ✓ `src/lib/services/configService.ts`
- ✓ `src/app/api/dashboard/responses/route.ts`
- ✓ `src/app/api/dashboard/responses/[sessionId]/route.ts`
- ✓ `src/app/api/dashboard/analytics/route.ts`
- ✓ `src/app/api/dashboard/export/csv/route.ts`
- ✓ `src/app/api/config/route.ts`

Commits present:
- ✓ `d240235` — Task 1: dashboardService, analyticsService, dashboard API routes
- ✓ `f40e893` — Task 2: csvExportService, configService, CSV export and config API routes

TypeScript: `npx tsc --noEmit` → no errors.
