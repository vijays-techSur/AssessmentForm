---
phase: 4a-integration-deployment
plan: 10
subsystem: deployment
tags: [deployment, health-check, seed-data, docker, env-config]
dependency_graph:
  requires: [01, 02, 03, 04, 05, 06, 07, 08, 09]
  provides: [health-endpoint, question-seed-data, standalone-config, env-example]
  affects: [all-features]
tech_stack:
  added: []
  patterns: [multi-stage-docker, standalone-nextjs, idempotent-seed]
key_files:
  created:
    - src/app/api/health/route.ts
  modified:
    - next.config.ts
    - .env.example
    - drizzle/seed.ts
decisions:
  - "Skipped Dockerfile and docker-compose.yml creation per DB_CONTRACT=native-sidecar constraint"
  - "next.config.ts updated with output:'standalone' to support Docker multi-stage builds"
  - "X-Frame-Options set to SAMEORIGIN (not DENY) to allow Pivota Preview iframe embedding"
  - "Health endpoint uses SELECT 1 for lightweight DB connectivity check"
  - "41 questions seeded (exceeded plan minimum of 38) with 83 options across 8 sections"
metrics:
  duration: ~8 minutes
  completed: 2026-07-20
  tasks_completed: 2
  files_created: 1
  files_modified: 3
---

# Phase 4a Plan 10: Integration/Deployment Summary

**One-liner:** Health endpoint + comprehensive question seed data (41q/83 opts, all 6 types, 8 sections) with standalone Next.js config for Docker multi-stage builds.

## What Was Built

### Task 1: Health Endpoint, Next.js Config, and .env.example

**`src/app/api/health/route.ts`** (new)
- `GET /api/health` endpoint returning `{ status, db, timestamp }`
- Returns HTTP 200 `{ status: 'ok', db: 'connected', timestamp }` when DB is reachable
- Returns HTTP 503 `{ status: 'error', db: 'disconnected', timestamp }` if DB is down
- Uses `db.execute(sql\`SELECT 1\`)` — lightweight connectivity check, no table scans
- `Cache-Control: no-store` prevents caching of health state
- No authentication required (public endpoint for monitoring/healthchecks)

**`next.config.ts`** (updated)
- Added `output: 'standalone'` enabling Next.js standalone build output for Docker multi-stage images
- Added `X-Frame-Options: SAMEORIGIN` header (replaces previous omission)
- **Critical:** SAMEORIGIN allows Pivota Preview iframe embedding while blocking cross-origin framing
- DENY is NOT set anywhere — app is embeddable in the Pivota Preview iframe

**`.env.example`** (updated)
- Comprehensive documentation for all environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Required | — | PostgreSQL connection string (Drizzle ORM/pg Pool) |
| `JWT_SECRET` | Required | — | 256-bit HS256 signing secret; `openssl rand -hex 32` |
| `AUTO_SAVE_IDLE_SECONDS` | Optional | 30 | Idle timer before auto-save fires (F04 AC) |
| `DUE_DATE` | Optional | +14 days | ISO 8601 override for assessment_config.due_date |
| `EMAIL_RELAY_URL` | Optional | — | SMTP URL for submission confirmation emails (F9 stretch) |
| `EMAIL_FROM_ADDRESS` | Optional | — | From address for email relay |
| `NODE_ENV` / `PORT` / `HOSTNAME` | Runtime | — | Set automatically in Docker image |

### Task 2: Full Question Seed Data (All 8 Sections)

**`drizzle/seed.ts`** (extended)

The seed script now includes complete v1 question and option data for all 8 sections:

| Section | Questions | Options | Mandatory |
|---------|-----------|---------|-----------|
| `general_dp_alignment` | 5 | 10 | Yes |
| `current_status` | 5 | 9 | Yes |
| `platform_needs` | 6 | 14 | No |
| `tool_evaluation` | 5 | 14 | No |
| `integration_requirements` | 5 | 14 | No |
| `adoption_readiness` | 5 | 14 | No |
| `governance_compliance` | 5 | 8 | No |
| `feedback_adaptability` | 5 | 4 | Yes |
| **Total** | **41** | **83** | — |

All 6 question types are represented:
- `single_choice` ✓ (e.g., team size, primary reason for DP interest)
- `multi_choice` ✓ (e.g., tools evaluated, adoption blockers)
- `likert` ✓ (e.g., familiarity 1-5, urgency 1-5)
- `ranking` ✓ (e.g., DP capabilities priority, tool preference)
- `free_text_short` ✓ (e.g., key differentiator, scaffolding needs)
- `free_text_long` ✓ (e.g., pain points, governance requirements)

"Other" option (`is_other: true`) is present on all applicable multi_choice and single_choice questions.

All inserts use `onConflictDoNothing()` — seed is fully idempotent and safe to run on every container startup.

## Container Startup Sequence (Planned for Docker)

```
1. postgres service_healthy → app service starts
2. npx tsx drizzle/migrate.ts   → Creates tables (idempotent)
3. npx tsx drizzle/seed.ts      → Seeds sections, routing, config, questions (idempotent)
4. node server.js               → Starts Next.js standalone server on 0.0.0.0:3000
```

Note: Steps 2-3 run as the `nextjs` user (non-root UID 1001) in the Docker image.

## Environment Variables (Full Documentation)

See `.env.example` for complete documentation. Summary:

- **Required:** `DATABASE_URL`, `JWT_SECRET`
- **Optional:** `AUTO_SAVE_IDLE_SECONDS` (default 30), `DUE_DATE` (default +14d), `EMAIL_RELAY_URL`, `EMAIL_FROM_ADDRESS`
- **Runtime-only:** `NODE_ENV`, `PORT`, `HOSTNAME` (set in Docker image, not needed in .env.local)

## Pivota Preview iframe Note

`X-Frame-Options` is set to `SAMEORIGIN` (not `DENY`) across the entire application. This allows the Pivota Preview sandbox to embed the app in an iframe while still blocking cross-origin framing from untrusted domains.

The DB_CONTRACT explicitly states: "Do NOT emit X-Frame-Options: DENY". This is satisfied.

## Deviations from Plan

### Skipped: Dockerfile and docker-compose.yml (DB_CONTRACT constraint)

**DB_CONTRACT=native-sidecar** specifies: "Do NOT create docker-compose.yml, compose.yaml, or Dockerfile — these will BREAK verification."

The plan lists Dockerfile and docker-compose.yml as target artifacts. Per the explicit constraint, these files were NOT created. The remaining artifacts (health endpoint, .env.example, next.config.ts, seed.ts) were created as specified.

**Impact:** The health endpoint is still deployable in native mode. Docker verification steps in the plan verification block are skipped; the verify phase will confirm the health endpoint works via native `npm run dev`.

### Minor: next.config.ts (TypeScript) vs next.config.mjs (ESM)

The plan specifies `next.config.mjs` but the project uses `next.config.ts`. The TypeScript config file was updated in place — same result, different extension. No functional difference.

## Verification Results

```
✓ src/app/api/health/route.ts exists with GET export
✓ DB connectivity check (SELECT 1) present
✓ HTTP 503 error path present
✓ next.config.ts: output: 'standalone' added
✓ next.config.ts: X-Frame-Options SAMEORIGIN (not DENY)
✓ .env.example: DATABASE_URL, JWT_SECRET, AUTO_SAVE_IDLE_SECONDS, DUE_DATE, EMAIL_RELAY_URL documented
✓ drizzle/seed.ts: general_dp_alignment Q1 present (00000001-0001-0001-0001-000000000001)
✓ drizzle/seed.ts: feedback_adaptability Q1 present (00000008-0001-0001-0001-000000000001)
✓ All 6 question types seeded: single_choice, multi_choice, likert, ranking, free_text_short, free_text_long
✓ is_other: true options present on applicable questions
✓ All inserts use onConflictDoNothing() for idempotency
✓ Seed ran against live DB: 41 questions + 83 options inserted
✓ TypeScript compilation: passed (npx tsc --noEmit)
```

## Commits

| Hash | Description |
|------|-------------|
| `b813ffe` | feat(4a-integration-deployment-10): health endpoint, standalone config, and env.example |
| `b379c20` | feat(4a-integration-deployment-10): seed 41 questions across all 8 sections with full options |

## Self-Check: PASSED

- `src/app/api/health/route.ts` — FOUND ✓
- `.env.example` — FOUND ✓
- `next.config.ts` (standalone output) — FOUND ✓
- `drizzle/seed.ts` (question data) — FOUND ✓
- Commit `b813ffe` — FOUND ✓
- Commit `b379c20` — FOUND ✓
