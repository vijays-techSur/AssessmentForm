---
phase: 01-database
plan: 01
subsystem: database
tags: [drizzle-orm, postgresql, schema, seed, next.js]
dependency_graph:
  requires: []
  provides:
    - drizzle/schema.ts (all 10 table definitions)
    - drizzle/seed.ts (v1 section + routing seed data)
    - drizzle/migrate.ts (migration runner)
    - src/lib/db.ts (Pool singleton, max 20)
  affects:
    - All backend waves (2a–2d) — depend on schema exports
    - All frontend waves (3a–3c) — depend on data model
tech_stack:
  added:
    - next@16.2.10
    - drizzle-orm@0.45.2
    - drizzle-kit@0.31.10
    - pg@8.22.0
    - tsx@4.23.1
    - jose@6.2.3
    - zod@4.4.3
    - csv-stringify@6.8.1
    - "@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities"
    - recharts@3.9.2
  patterns:
    - Drizzle ORM pgTable with snake_case column names matching DB
    - LOWER() functional unique indexes for case-insensitive email lookup
    - JSONB answer_payload for polymorphic question responses
    - Singleton row pattern with CHECK(id=1) for assessment_config
    - onConflictDoNothing() in seed for idempotent restarts
key_files:
  created:
    - drizzle/schema.ts
    - drizzle/seed.ts
    - drizzle/migrate.ts
    - drizzle.config.ts
    - src/lib/db.ts
    - package.json
    - .env.example
    - next.config.ts
    - tsconfig.json
    - tailwind.config.ts
    - postcss.config.js
    - .eslintrc.json
    - src/app/layout.tsx
    - src/app/globals.css
    - src/app/page.tsx
  modified: []
decisions:
  - "Used dialect: 'postgresql' in drizzle.config.ts instead of driver: 'pg' — drizzle-kit 0.31 dropped the 'driver' field in favour of 'dialect'"
  - "Used dbCredentials.url instead of dbCredentials.connectionString — new drizzle-kit 0.31 API"
  - "Manual npm init + package installation instead of create-next-app — existing project files (.planning/, project_specs/) blocked create-next-app due to conflict detection"
  - "next.config.ts (TypeScript) instead of next.config.js — Next.js 16 supports TS config natively"
metrics:
  duration: "~5 minutes"
  completed: "2026-07-20"
  tasks_completed: 3
  files_created: 15
---

# Phase 01 Plan 01: Database Schema & Seed Summary

**One-liner:** PostgreSQL schema for 10 AssessmentForm tables via Drizzle ORM 0.45, with LOWER() email indexes, JSONB responses, singleton CHECK constraint, and idempotent v1 seed data (8 sections, 24 routing rows).

## What Was Built

### Task 1: Next.js Project Initialization with Dependencies
- Initialized `package.json` with Next.js 16, React 19, TypeScript
- Installed all Wave 1–4 dependencies: `drizzle-orm`, `pg`, `drizzle-kit`, `tsx`, `dotenv`, `jose`, `zod`, `csv-stringify`, `@dnd-kit/*`, `recharts`
- Created `drizzle.config.ts` with `dialect: 'postgresql'` pointing to `DATABASE_URL`
- Created `src/lib/db.ts` with Pool max 20 singleton (TechArch §1 connection pool spec)
- Created `.env.example` documenting all required env vars (DATABASE_URL, JWT_SECRET, AUTO_SAVE_IDLE_SECONDS, EMAIL_RELAY_URL, EMAIL_FROM_ADDRESS)
- Configured `package.json` dev script to bind to `0.0.0.0:3000`
- Configured `next.config.ts` with `X-Frame-Options: SAMEORIGIN` (not DENY) for Pivota Preview iframe compatibility
- Minimal Next.js App Router structure with Tailwind CSS

### Task 2: Drizzle ORM Schema (10 Tables)
All tables created from exact TechArch §3.2 DDL:

| Table | Key Constraints |
|-------|----------------|
| `system_owner_emails` | `UNIQUE INDEX LOWER(email)` for case-insensitive auth |
| `respondents` | `UNIQUE INDEX LOWER(email)` + `CHECK team_type IN (4 values)` |
| `sessions` | FK→respondents CASCADE, `CHECK submission_status IN ('draft','submitted')`, 3 indexes |
| `sections` | TEXT PK (slug), not UUID |
| `section_routing` | `UNIQUE(team_type, section_id)` + `CHECK team_type IN (4 values)` |
| `questions` | `CHECK question_type IN (6 values)`, FK→sections CASCADE |
| `question_options` | `UNIQUE(question_id, display_order)`, FK→questions CASCADE |
| `responses` | `UNIQUE(session_id, question_id)` for upsert semantics, JSONB answer_payload |
| `assessment_config` | `CHECK(id = 1)` singleton enforcement |
| `config_audit_log` | Audit trail for all config changes |

### Task 3: Migration Runner, Seed Script, DB Push
- `drizzle/migrate.ts`: Runs migrations from `./drizzle/migrations` folder
- `drizzle/seed.ts`: Seeds v1 data per TechArch §3.4–3.5:
  - **8 sections**: general_dp_alignment (mandatory, order 1), current_status (mandatory, order 2), platform_needs, tool_evaluation, integration_requirements, adoption_readiness, governance_compliance, feedback_adaptability (mandatory, order 8)
  - **24 section_routing rows** across 4 team types:
    - `program_project`: 5 sections
    - `platform_engineering`: 7 sections
    - `infrastructure_cloud`: 6 sections
    - `data_api_governance`: 6 sections
  - **assessment_config singleton** (id=1): launch_date=now, due_date=+14 days
- Schema pushed via `drizzle-kit push` to running PostgreSQL sidecar
- Seed ran successfully — all DB counts verified

## Key Schema Decisions

### LOWER() Functional Indexes
Both `system_owner_emails` and `respondents` use `uniqueIndex(...).on(sql\`LOWER(${table.email})\`)` to enforce case-insensitive uniqueness at the DB layer. This prevents case-spoofing attacks (T-01-03) and ensures resume flow matches regardless of email casing.

### JSONB `answer_payload`
The `responses.answer_payload` column stores polymorphic answer shapes per TechArch §3.3:
```typescript
{ type: "single_choice", selected_option_id: "uuid" }
{ type: "multi_choice", selected_option_ids: ["uuid", ...] }
{ type: "likert", value: 1..5 }
{ type: "ranking", ordered_option_ids: ["uuid", ...] }
{ type: "free_text_short" | "free_text_long", text: "..." }
```
This avoids per-question-type tables and enables flexible `PUT /api/responses/:sessionId` upsert.

### Singleton `assessment_config`
`CHECK(id = 1)` at DB layer prevents a second config row being inserted to shadow the active `due_date` used by `assessmentOpenGuard` (T-01-04).

### `onConflictDoNothing()` Seed Pattern
All seed inserts use `onConflictDoNothing()` so the seed script is idempotent — safe to run on every app restart without duplicate key errors.

## DB Connection Pattern
```typescript
// src/lib/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // TechArch §1: Connection pool max 20
});
export const db = drizzle(pool, { schema });
```
DATABASE_URL injected from environment (postgres://postgres:devpass@localhost:5432/app via native sidecar).

## Table Exports Available for Downstream Waves
```typescript
import {
  systemOwnerEmails, respondents, sessions, sections,
  sectionRouting, questions, questionOptions, responses,
  assessmentConfig, configAuditLog
} from '../../drizzle/schema';
```
All TypeScript inference types also exported: `Respondent`, `Session`, `Section`, `Question`, `Response`, etc.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle.config.ts format updated for drizzle-kit 0.31**
- **Found during:** Task 1
- **Issue:** Plan specified `driver: 'pg'` and `dbCredentials.connectionString` — format from drizzle-kit ≤0.21. Installed version is 0.31.10 which uses `dialect: 'postgresql'` and `dbCredentials.url`
- **Fix:** Updated config to use `dialect: 'postgresql'` and `dbCredentials.url` per drizzle-kit 0.31 API
- **Files modified:** `drizzle.config.ts`
- **Commit:** cda9686

**2. [Rule 3 - Blocking] Manual Next.js initialization instead of create-next-app**
- **Found during:** Task 1
- **Issue:** `create-next-app` refused to run because existing project files (`.planning/`, `project_specs/`, `opencode.json`) conflict with its empty-directory requirement
- **Fix:** Used `npm init -y` + individual package installs + manual file creation (tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.js, app router structure)
- **Files modified:** All Task 1 files created manually
- **Commit:** cda9686

## Self-Check

### Files Exist
- [x] `drizzle/schema.ts` — 10 table exports verified
- [x] `drizzle/seed.ts` — sections + routing + config seeded
- [x] `drizzle/migrate.ts` — migration runner exists
- [x] `drizzle.config.ts` — drizzle-kit config with postgresql dialect
- [x] `src/lib/db.ts` — Pool max 20 singleton

### Database State
- [x] 10 tables in `information_schema.tables`
- [x] 8 rows in `sections`
- [x] 24 rows in `section_routing`
- [x] 1 row in `assessment_config`
- [x] Mandatory sections: general_dp_alignment, current_status, feedback_adaptability

### Commits Exist
- [x] cda9686 — Task 1: Initialize Next.js project
- [x] 3348fcc — Task 2: Drizzle ORM schema (10 tables)
- [x] 2ed4b9a — Task 3: Migration runner, seed script, DB push

## Self-Check: PASSED
