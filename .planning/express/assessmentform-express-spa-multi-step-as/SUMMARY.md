---
slug: assessmentform-express-spa-multi-step-as
description: Multi-Step Assessment Form SPA (Next.js + PostgreSQL + Drizzle ORM)
scope: full
date: 2026-07-20
total_plans: 10
total_waves: 5
---

# Express Task: Multi-Step Assessment Form SPA — Summary

## Execution Overview

**Scope:** Full (multi-plan wave execution)
**Plans:** 10 across 5 wave groups (1, 2a/2b/2c/2d, 3a/3b/3c, 4)
**Date:** 2026-07-20

### Wave Breakdown

| Wave | Plans | Status |
|------|-------|--------|
| 1 | 01 (Database Schema) | ✓ Complete |
| 2a | 02 (Auth & Session API) | ✓ Complete |
| 2b | 03 (Sections/Questions API + Zod) | ✓ Complete |
| 2c | 04 (Responses/Submission API) | ✓ Complete |
| 2d | 05 (Dashboard API) | ✓ Complete |
| 3a | 06 (Respondent SPA Part 1) | ✓ Complete |
| 3b | 07 (Review/Submit/Confirmation) | ✓ Complete |
| 3c | 08, 09 (Dashboard SPA) | ✓ Complete |
| 4 | 10 (Integration/Deployment) | ✓ Complete |

### Per-Plan Details

**01 (Database Schema):** PostgreSQL schema for 10 tables via Drizzle ORM 0.45 — LOWER() email indexes, JSONB responses, singleton CHECK constraint, idempotent v1 seed (8 sections, 24 routing rows).
- Tasks: 3/3
- Key files: drizzle/schema.ts, drizzle/seed.ts, drizzle/migrate.ts, src/lib/db.ts

**02 (Auth & Session API):** JWT auth (HS256) + session management — POST /api/auth/login, POST /api/sessions (respondent upsert), GET /api/sessions/:sessionId with returning-respondent detection, jwtMiddleware/requireSystemOwner/requireSessionOwner middleware stack.
- Tasks: 3/3
- Key files: src/lib/auth/*, src/lib/session/sessionService.ts, src/app/api/auth/login/route.ts, src/app/api/sessions/route.ts

**03 (Sections/Questions API):** GET /api/sections?teamType (sectionRoutingService with mandatory enforcement), GET /api/sections/:sectionId/questions, Zod discriminated-union schemas for all 6 answer payload types.
- Tasks: 3/3
- Key files: src/lib/sections/sectionRoutingService.ts, src/lib/sections/questionService.ts, src/lib/validation/answerPayloadSchemas.ts

**04 (Responses/Submission API):** PUT /api/responses/:sessionId (upsert auto-save, assessmentOpenGuard), POST /api/submissions/:sessionId (mandatory check, draft→submitted), POST /api/notifications/email (fire-and-forget email stretch).
- Tasks: 3/3
- Key files: src/lib/services/responseService.ts, src/lib/services/submissionService.ts, src/app/api/responses/[sessionId]/route.ts

**05 (Dashboard API):** GET /api/dashboard/responses (paginated/sortable/filterable), GET /api/dashboard/responses/:sessionId, GET /api/dashboard/analytics (4 chart types), GET /api/dashboard/export/csv (streaming), GET/PATCH /api/config.
- Tasks: 3/3
- Key files: src/lib/services/dashboardService.ts, src/lib/services/analyticsService.ts, src/lib/services/csvExportService.ts, src/lib/services/configService.ts

**06 (Respondent SPA Part 1):** IdentityForm + AssessmentWizard + ProgressBar + SectionScreen + all 6 question-type renderers (including dnd-kit RankingQuestion) + useAutoSave (30s idle timer, 3-retry backoff, SaveStateIndicator) + useSectionList + ResumeBanner.
- Tasks: 4/4
- Key files: src/components/assessment/*, src/components/questions/*, src/hooks/useSession.ts, src/hooks/useAutoSave.ts

**07 (Review/Submit/Confirmation):** ReviewStep (read-only summary, Edit links), SubmissionConfirmation screen, AuthGuard client-side route guard, re-entry banner for submitted-within-edit-window sessions.
- Tasks: 3/3
- Key files: src/components/assessment/ReviewStep.tsx, src/components/assessment/SubmissionConfirmation.tsx, src/components/assessment/AuthGuard.tsx

**08 (Dashboard SPA Part 1):** ResponseTable (paginated 25/page, sortable, 60s auto-refresh), FilterPanel + SearchBar + useDashboardFilters (URL-synced), ResponseDetailView, dashboard login/auth flow, DashboardHeader, CSV export trigger.
- Tasks: 4/4
- Key files: src/app/dashboard/*, src/components/dashboard/*, src/hooks/useDashboardFilters.ts

**09 (Dashboard SPA Part 2):** AnalyticsPanel with 4 Recharts chart types (TeamTypeBar, LikertDistribution, RankingTopItems, ChoiceBreakdown), ConfigPanel (due date display, date picker, confirmation dialog, status badge).
- Tasks: 3/3
- Key files: src/app/dashboard/analytics/page.tsx, src/app/dashboard/config/page.tsx, src/components/dashboard/AnalyticsPanel.tsx

**10 (Integration/Deployment):** Health endpoint GET /api/health (DB connectivity), Next.js standalone output config, comprehensive question seed (41 questions, 83 options, all 6 types across all 8 sections), .env.example documentation.
- Tasks: 2/2
- Key files: src/app/api/health/route.ts, drizzle/seed.ts (extended), next.config.ts, .env.example

### Aggregated Stats

- **Total tasks:** 31 across 10 plans
- **Total routes implemented:** 13 API routes + 7 pages
- **Key files created:** 80+ source files across app, components, hooks, lib, types directories
- **Features delivered:** F0–F9 (all 10 MVP features)

### Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.10 (App Router, TypeScript) |
| Database | PostgreSQL via Drizzle ORM 0.45 + pg pool (max 20) |
| Auth | jose (HS256 JWT, 8h system owner / 24h respondent) |
| Validation | Zod v4 (discriminated unions for 6 answer types) |
| UI | React 19 + Tailwind CSS |
| Charts | Recharts 3.9.2 |
| DnD | @dnd-kit/core + @dnd-kit/sortable (RankingQuestion) |
| CSV | csv-stringify (streaming export) |
| DB Mode | native-sidecar (PIVOTA_DB_MODE=sidecar-postgres) |

### Deviations

1. **Dockerfile/docker-compose.yml skipped** — DB_CONTRACT=native-sidecar; platform provides PostgreSQL sidecar at DATABASE_URL. No Docker daemon in sandbox.
2. **drizzle.config.ts format** — Updated to `dialect: 'postgresql'` + `dbCredentials.url` (drizzle-kit 0.31 API; plan specified legacy 0.21 format).
3. **create-next-app skipped** — Used manual `npm init -y` + individual installs due to existing project files blocking create-next-app.
4. **next.config.ts (TypeScript)** — Plan specified `.mjs`; TypeScript config used throughout for consistency.
5. **Login endpoint updated** — Wave 3c removed `name` field from system owner login (email-only matching system_owner_emails table).
