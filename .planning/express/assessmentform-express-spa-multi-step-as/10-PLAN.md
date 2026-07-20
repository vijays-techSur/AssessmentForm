---
phase: 4a-integration-deployment
plan: 10
type: execute
wave: 10
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9]
files_modified:
  - Dockerfile
  - docker-compose.yml
  - .env.example
  - drizzle/seed.ts
  - src/app/api/health/route.ts
  - package.json
autonomous: true

features:
  implements: ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"]
  depends_on: ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"]
  enables: []

must_haves:
  truths:
    - "docker compose up -d starts the app + postgres stack cleanly with zero errors"
    - "Application is reachable at http://localhost:3000 and responds with HTTP 200"
    - "GET /api/health returns { status: 'ok', db: 'connected', timestamp: '<ISO>' } with HTTP 200"
    - "Database migrations run automatically on container startup before the app serves traffic"
    - "Seed script idempotently seeds 8 sections, 24 section_routing rows, and 1 assessment_config row"
    - "All required environment variables are documented in .env.example with descriptions"
    - "Application binds to 0.0.0.0:3000 inside the container"
    - "X-Frame-Options header is NOT set to DENY — app is embeddable in iframe for Pivota Preview"
  artifacts:
    - path: "Dockerfile"
      provides: "Multi-stage Next.js production container image"
      contains: "FROM node:"
    - path: "docker-compose.yml"
      provides: "Compose stack: app + postgres services, health checks, env vars"
      contains: "postgres"
    - path: ".env.example"
      provides: "All required env vars documented: DATABASE_URL, JWT_SECRET, AUTO_SAVE_IDLE_SECONDS, DUE_DATE, EMAIL_RELAY_URL, EMAIL_FROM_ADDRESS"
      contains: "JWT_SECRET"
    - path: "src/app/api/health/route.ts"
      provides: "GET /api/health — returns { status, db, timestamp } for container health check"
      exports: ["GET"]
    - path: "drizzle/seed.ts"
      provides: "Updated seed script with questions seeded for all 8 sections (5-6 per section)"
      contains: "general_dp_alignment"
  key_links:
    - from: "Dockerfile"
      to: "drizzle/migrate.ts"
      via: "CMD runs migrate then starts next"
      pattern: "migrate"
    - from: "docker-compose.yml"
      to: "Dockerfile"
      via: "build context"
      pattern: "build:"
    - from: "docker-compose.yml"
      to: "postgres"
      via: "DATABASE_URL env var injected into app service"
      pattern: "DATABASE_URL"
    - from: "src/app/api/health/route.ts"
      to: "src/lib/db.ts"
      via: "db.execute(sql`SELECT 1`) to verify DB connectivity"
      pattern: "db\\.execute|SELECT 1"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "drizzle/schema.ts"
      exports: ["systemOwnerEmails", "respondents", "sessions", "sections", "sectionRouting", "questions", "questionOptions", "responses", "assessmentConfig", "configAuditLog"]
      verify: "grep -n 'export const systemOwnerEmails' drizzle/schema.ts && grep -n 'export const assessmentConfig' drizzle/schema.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "drizzle/migrate.ts"
      exports: ["runMigrations"]
      verify: "grep -n 'migrate' drizzle/migrate.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/lib/db.ts"
      exports: ["db"]
      verify: "grep -n 'export const db' src/lib/db.ts && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "src/app/api/auth/login/route.ts"
      exports: ["POST"]
      verify: "grep -n 'export.*POST' src/app/api/auth/login/route.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/app/assessment/page.tsx"
      exports: ["default"]
      verify: "grep -n 'export default' src/app/assessment/page.tsx && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/app/dashboard/page.tsx"
      exports: ["default"]
      verify: "grep -n 'export default' src/app/dashboard/page.tsx && echo CONTRACT_OK"
  provides:
    - artifact: "Dockerfile"
      exports: ["multi-stage build producing standalone Next.js image"]
      shape: |
        FROM node:20-alpine AS deps
        FROM node:20-alpine AS builder
        FROM node:20-alpine AS runner
        CMD: runs drizzle/migrate.ts then `node server.js`
        EXPOSE 3000
        ENV HOST=0.0.0.0 PORT=3000
      verify: "grep -n 'EXPOSE 3000' Dockerfile && grep -n '0.0.0.0\\|HOST' Dockerfile && echo CONTRACT_OK"
    - artifact: "docker-compose.yml"
      exports: ["app service at :3000", "postgres service"]
      shape: |
        services:
          app: build + ports 3000:3000 + DATABASE_URL + JWT_SECRET + health check via /api/health
          postgres: image postgres:15-alpine, POSTGRES_DB=assessmentform, volume for persistence
      verify: "grep -n 'ports:' docker-compose.yml && grep -n 'postgres' docker-compose.yml && echo CONTRACT_OK"
    - artifact: "src/app/api/health/route.ts"
      exports: ["GET"]
      shape: |
        GET /api/health
        Response 200: { status: "ok", db: "connected", timestamp: "<ISO8601>" }
        Response 503: { status: "error", db: "disconnected", timestamp: "<ISO8601>" }
      verify: "grep -n 'export.*GET' src/app/api/health/route.ts && echo CONTRACT_OK"
---

<objective>
Containerize AssessmentForm-Express for production deployment: multi-stage Dockerfile (Next.js standalone output), docker-compose.yml (app + postgres services with health checks), comprehensive .env.example documenting all variables (DATABASE_URL, JWT_SECRET, AUTO_SAVE_IDLE_SECONDS, DUE_DATE, EMAIL_RELAY_URL, EMAIL_FROM_ADDRESS), a health check API endpoint, and an updated seed script that includes full v1 question data for all 8 sections.

Purpose: Without this wave, the app cannot run in a container or be verified end-to-end. This plan closes the deployment gap so the app is ready to boot, seed, and serve traffic in any Docker-compatible environment including Pivota Preview.
Output: Dockerfile, docker-compose.yml, updated .env.example, src/app/api/health/route.ts, updated drizzle/seed.ts with question data.
</objective>

<feature_dependencies>
Implements: F0: Multi-Step Assessment Workflow (fully deployable stack required to verify SPA navigation), F1: Respondent Identity & Session Management (DATABASE_URL for session storage), F2: Question Types Engine (seed script seeds actual questions + options per section), F3: Team-Type-Specific Section Routing (sections + routing data from seed), F4: Auto-Save & Progress Persistence (AUTO_SAVE_IDLE_SECONDS env var documented and passed to container), F5: Duplicate Submission Prevention & Edit Window (DUE_DATE env var documented — overrides assessment_config.due_date seed default), F6: System Owner Dashboard (full stack running enables dashboard verification), F7: Role-Based Access Control (JWT_SECRET required for token signing/verification), F8: Assessment Configuration Management (DUE_DATE env var, admin seed email), F9: Submission Confirmation & Respondent Feedback (EMAIL_RELAY_URL + EMAIL_FROM_ADDRESS documented)
Depends on: All prior waves (1–9) — schema, backend APIs, and frontend SPA must all exist before containerization
Enables: None — this is the final wave
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@.planning/express/assessmentform-express-spa-multi-step-as/01-PLAN.md
@.planning/express/assessmentform-express-spa-multi-step-as/06-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dockerfile, docker-compose.yml, health check endpoint, and .env.example</name>
  <files>
    Dockerfile
    docker-compose.yml
    .env.example
    src/app/api/health/route.ts
    next.config.mjs
  </files>
  <action>
Create the full container stack for AssessmentForm-Express. The app must bind to 0.0.0.0:3000, must NOT emit X-Frame-Options DENY (Pivota Preview uses iframe), and must run database migrations on startup before serving traffic.

---

### Step 1 — Verify/update `next.config.mjs` for standalone output

Next.js standalone output produces a self-contained server.js that runs without `node_modules`. This is required for a lean Docker image. Read the existing `next.config.mjs` first, then add `output: 'standalone'` if not present.

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // Required for Docker multi-stage build
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // CRITICAL: Do NOT set X-Frame-Options: DENY — Pivota Preview embeds the app in an iframe
          // Set SAMEORIGIN to allow controlled embedding while blocking cross-origin framing
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

After editing next.config.mjs, update package.json scripts to ensure correct binding:
```json
"scripts": {
  "dev": "next dev -H 0.0.0.0 -p 3000",
  "build": "next build",
  "start": "next start -H 0.0.0.0 -p 3000",
  "db:generate": "drizzle-kit generate:pg",
  "db:push": "drizzle-kit push:pg",
  "db:migrate": "tsx drizzle/migrate.ts",
  "db:seed": "tsx drizzle/seed.ts",
  "db:studio": "drizzle-kit studio"
}
```

---

### Step 2 — Create `Dockerfile`

Multi-stage build: deps → builder → runner. Uses Next.js standalone output for minimal image size.

```dockerfile
# ─── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install libc6-compat for Alpine node compatibility
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts

# Install dev deps needed for build (drizzle-kit, tsx, etc.)
RUN npm ci --ignore-scripts

# ─── Stage 2: Build the Next.js app ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build the standalone Next.js output
# next.config.mjs must have output: 'standalone'
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Required for health check curl command
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output from builder
# next.config.mjs output: 'standalone' produces .next/standalone/
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Drizzle migration files (needed at runtime for migrate.ts)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER nextjs

# Expose port 3000 — app binds to 0.0.0.0:3000
EXPOSE 3000

# Pivota platform constraint: bind to all interfaces
ENV PORT=3000
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0

# Startup sequence:
# 1. Run Drizzle migrations (creates tables if not exist; idempotent)
# 2. Run seed script (idempotent: onConflictDoNothing — safe to run repeatedly)
# 3. Start Next.js standalone server
CMD ["sh", "-c", "npx tsx drizzle/migrate.ts && npx tsx drizzle/seed.ts && node server.js"]
```

---

### Step 3 — Create `docker-compose.yml`

Defines two services: `app` (Next.js) and `postgres` (PostgreSQL 15). The postgres service has a health check so the app service waits for the DB to be ready before starting.

```yaml
version: '3.9'

services:

  # ─── PostgreSQL 15 ────────────────────────────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    container_name: assessmentform_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: assessmentform
      POSTGRES_USER: assessmentform
      POSTGRES_PASSWORD: assessmentform_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U assessmentform -d assessmentform"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    ports:
      - "5432:5432"  # Expose for local debugging; remove in strict production

  # ─── Next.js Application ──────────────────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: assessmentform_app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      # ── Required ──────────────────────────────────────────────────────────────
      # Drizzle ORM / pg Pool connection string
      DATABASE_URL: postgres://assessmentform:assessmentform_dev_password@postgres:5432/assessmentform

      # JWT signing secret — CHANGE THIS in production to a 256-bit random value
      # Generate with: openssl rand -hex 32
      JWT_SECRET: change-me-to-a-cryptographically-random-256-bit-value

      # ── Optional ──────────────────────────────────────────────────────────────
      # Auto-save idle timer in seconds (default: 30)
      AUTO_SAVE_IDLE_SECONDS: "30"

      # Assessment due date override (ISO 8601).
      # If set, overrides the seed-script default of +14 days from container start.
      # Leave empty to use the seed default. System Owner can also update via /api/config.
      # DUE_DATE: "2026-08-03T23:59:00Z"

      # Email relay (optional — omit to disable email notifications)
      # EMAIL_RELAY_URL: "smtp://user:password@smtp.example.com:587"
      # EMAIL_FROM_ADDRESS: "assessment@example.com"

      # Next.js runtime
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

volumes:
  postgres_data:
    driver: local
```

---

### Step 4 — Create `src/app/api/health/route.ts`

Used by the docker-compose healthcheck and any monitoring infrastructure. Checks DB connectivity by executing a lightweight `SELECT 1` query via the shared db singleton.

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// GET /api/health
// Used by docker-compose healthcheck and external monitoring.
// Returns 200 if app + DB are reachable, 503 if DB is down.
// TechArch §7.2 INT-02: deployment health verification endpoint.
export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  try {
    // Lightweight DB connectivity check — does not touch any application tables
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      { status: 'ok', db: 'connected', timestamp },
      {
        status: 200,
        headers: {
          // Health endpoint must be freely accessible — no auth, no caching
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/health] DB connectivity check failed:', err);
    return NextResponse.json(
      { status: 'error', db: 'disconnected', timestamp },
      { status: 503 }
    );
  }
}
```

---

### Step 5 — Update `.env.example`

Replace the existing .env.example (from plan 01) with a comprehensive version documenting all variables across all waves:

```bash
# ============================================================================
# AssessmentForm-Express — Environment Variables
# ============================================================================
# Copy this file to .env.local for local development.
# All variables marked REQUIRED must be set before the app will start.
# ============================================================================

# ── Database (REQUIRED) ─────────────────────────────────────────────────────
# PostgreSQL connection string used by Drizzle ORM and pg Pool.
# Format: postgres://USER:PASSWORD@HOST:PORT/DATABASE
# Local dev (docker-compose): postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform
# Production: set to your managed PostgreSQL instance connection string.
DATABASE_URL=postgres://assessmentform:assessmentform_dev_password@localhost:5432/assessmentform

# ── JWT Secret (REQUIRED) ───────────────────────────────────────────────────
# 256-bit random secret for signing and verifying JWT tokens (HS256).
# Respondent JWTs expire in 24h; System Owner JWTs expire in 8h.
# Generate a secure value with: openssl rand -hex 32
# WARNING: Changing this value invalidates ALL existing sessions.
JWT_SECRET=change-me-to-a-cryptographically-random-256-bit-value

# ── Auto-Save Configuration (Optional) ─────────────────────────────────────
# Idle timer in seconds before auto-save fires when the respondent has
# unsaved changes but has stopped interacting (US-4.2 AC).
# Default: 30 seconds. FRD F04: configurable without code deploy.
AUTO_SAVE_IDLE_SECONDS=30

# ── Assessment Due Date Override (Optional) ─────────────────────────────────
# If set, overrides the assessment_config.due_date value seeded into the DB.
# Useful for initial deployment to set the exact window before any System Owner
# has logged in to configure it via the dashboard.
# Format: ISO 8601 datetime with timezone.
# Leave unset to use the seed default (+14 days from seed runtime).
# System Owner can always update this via PATCH /api/config from the dashboard.
# DUE_DATE=2026-08-03T23:59:00Z

# ── Email Relay (Optional — stretch goal) ───────────────────────────────────
# SMTP URL for sending submission confirmation emails to respondents (F9 stretch).
# If EMAIL_RELAY_URL is not set, the emailService.ts gracefully no-ops —
# no email is sent but submission succeeds normally.
# Format: smtp://USER:PASSWORD@SMTP_HOST:PORT
# EMAIL_RELAY_URL=smtp://user:password@smtp.example.com:587
# EMAIL_FROM_ADDRESS=assessment@your-domain.com

# ── Next.js Runtime (set automatically in production Docker image) ───────────
# NODE_ENV=production
# PORT=3000
# HOSTNAME=0.0.0.0
```
  </action>
  <verify>
```bash
# Dockerfile exists and has key markers
ls Dockerfile && echo "DOCKERFILE EXISTS"
grep -n "EXPOSE 3000" Dockerfile && echo "PORT 3000 OK"
grep -n "0.0.0.0\|HOSTNAME" Dockerfile && echo "BIND ALL INTERFACES OK"
grep -n "migrate.ts" Dockerfile && echo "MIGRATE ON STARTUP OK"
grep -n "seed.ts" Dockerfile && echo "SEED ON STARTUP OK"
grep -n "DENY" Dockerfile && echo "ERROR: DENY present in Dockerfile" || echo "NO DENY HEADER OK"

# docker-compose.yml
ls docker-compose.yml && echo "COMPOSE EXISTS"
grep -n "postgres" docker-compose.yml && echo "POSTGRES SERVICE OK"
grep -n "3000:3000" docker-compose.yml && echo "PORT MAPPING OK"
grep -n "DATABASE_URL" docker-compose.yml && echo "DATABASE_URL IN COMPOSE OK"
grep -n "JWT_SECRET" docker-compose.yml && echo "JWT_SECRET IN COMPOSE OK"
grep -n "/api/health" docker-compose.yml && echo "HEALTH CHECK ENDPOINT OK"

# Health endpoint
ls src/app/api/health/route.ts && echo "HEALTH ROUTE EXISTS"
grep -n "export.*GET" src/app/api/health/route.ts && echo "HEALTH GET EXPORT OK"
grep -n "SELECT 1\|db.*execute" src/app/api/health/route.ts && echo "DB CHECK IN HEALTH OK"
grep -n "503\|disconnected" src/app/api/health/route.ts && echo "HEALTH ERROR HANDLING OK"

# .env.example
grep -n "DATABASE_URL" .env.example && echo "DATABASE_URL DOCUMENTED"
grep -n "JWT_SECRET" .env.example && echo "JWT_SECRET DOCUMENTED"
grep -n "AUTO_SAVE_IDLE_SECONDS" .env.example && echo "AUTO_SAVE_IDLE_SECONDS DOCUMENTED"
grep -n "DUE_DATE" .env.example && echo "DUE_DATE DOCUMENTED"
grep -n "EMAIL_RELAY_URL" .env.example && echo "EMAIL_RELAY_URL DOCUMENTED"

# next.config.mjs: standalone output + no DENY
grep -n "standalone" next.config.mjs && echo "STANDALONE OUTPUT OK"
grep -n "DENY" next.config.mjs && echo "ERROR: DENY still present" || echo "NO DENY IN NEXT CONFIG OK"
grep -n "SAMEORIGIN" next.config.mjs && echo "SAMEORIGIN SET OK"

# Docker build validation
docker build -t assessmentform-build-check . 2>&1 | tail -5 && echo "BUILD OK"
docker compose config --quiet && echo "COMPOSE CONFIG VALID"
```
  </verify>
  <done>
- Dockerfile: multi-stage build (deps → builder → runner); node:20-alpine; output: 'standalone'; EXPOSE 3000; ENV HOST=0.0.0.0; CMD runs migrate.ts → seed.ts → node server.js on startup; no X-Frame-Options DENY
- docker-compose.yml: `app` service (builds from Dockerfile, ports 3000:3000, depends_on postgres with health condition, DATABASE_URL + JWT_SECRET + AUTO_SAVE_IDLE_SECONDS env vars, /api/health healthcheck); `postgres` service (postgres:15-alpine, persistent volume, pg_isready healthcheck); postgres_data named volume
- src/app/api/health/route.ts: GET /api/health returns 200 { status: 'ok', db: 'connected', timestamp } when DB reachable; 503 { status: 'error', db: 'disconnected' } if DB down; no auth required; Cache-Control: no-store
- .env.example: all 7 variables documented with descriptions — DATABASE_URL (required), JWT_SECRET (required, openssl rand hint), AUTO_SAVE_IDLE_SECONDS (optional, default 30), DUE_DATE (optional override), EMAIL_RELAY_URL (optional stretch), EMAIL_FROM_ADDRESS (optional stretch), NODE_ENV/PORT/HOSTNAME (runtime only)
- next.config.mjs: output: 'standalone' added; X-Frame-Options: SAMEORIGIN (NOT DENY); app remains embeddable in Pivota Preview iframe
  </done>
</task>

<task type="auto">
  <name>Task 2: Full question seed data for all 8 sections (5-6 questions per section, all types represented)</name>
  <files>
    drizzle/seed.ts
  </files>
  <action>
Update `drizzle/seed.ts` to include complete v1 question and question_options seed data for all 8 sections. Without seeded questions, the assessment form renders empty section screens and the RTM test cases (TEST-F2-01 through TEST-F2-14) cannot be exercised. All 6 question types must appear at least once. All inserts use `onConflictDoNothing()` so the seed is idempotent.

Read the existing drizzle/seed.ts first to preserve its existing sections + section_routing + assessment_config seed logic. Then extend it by appending question seeding AFTER the existing section routing seed.

**Preserve all existing seed logic (sections, sectionRouting, assessmentConfig). Add the following after `console.log('Section routing seeded...')` and before `await pool.end()`:**

```typescript
  // ── Questions + Options Seed Data (v1) ──────────────────────────────────────
  // Seeded question IDs are fixed UUIDs so reruns remain idempotent.
  // All 6 question types represented across the 8 sections.
  // TechArch §3.4: 5-6 questions per section; questions table + question_options table.

  console.log('Seeding questions...');

  // Helper to build question insert rows
  const { questions: questionsTable, questionOptions } = await import('./schema');

  // ── Section: general_dp_alignment (mandatory, 5 questions) ─────────────────
  await db.insert(questionsTable).values([
    { id: '00000001-0001-0001-0001-000000000001', section_id: 'general_dp_alignment', question_text: 'How familiar is your team with Developer Platform tooling (e.g., Backstage, Harness IDP, Red Hat Developer Hub)?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not at all familiar, 5 = Highly familiar' },
    { id: '00000001-0001-0001-0001-000000000002', section_id: 'general_dp_alignment', question_text: 'Which of the following Developer Platform tools has your team evaluated or used?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000001-0001-0001-0001-000000000003', section_id: 'general_dp_alignment', question_text: 'What is the primary reason your team is interested in a Developer Platform?', question_type: 'single_choice', is_required: true, has_other: true, display_order: 3, help_text: null },
    { id: '00000001-0001-0001-0001-000000000004', section_id: 'general_dp_alignment', question_text: 'Briefly describe your team\'s current biggest pain point in developer onboarding or tooling.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: 'Up to 2000 characters.' },
    { id: '00000001-0001-0001-0001-000000000005', section_id: 'general_dp_alignment', question_text: 'How urgently does your team need a Developer Platform solution?', question_type: 'likert', is_required: true, has_other: false, display_order: 5, help_text: '1 = Not urgent, 5 = Critical / blocking work' },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    // Q2 options — multi_choice (which DP tools evaluated)
    { id: '00000001-0002-0001-0001-000000000001', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Backstage (Spotify)', display_order: 1, is_other: false },
    { id: '00000001-0002-0001-0001-000000000002', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Red Hat Developer Hub', display_order: 2, is_other: false },
    { id: '00000001-0002-0001-0001-000000000003', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Harness IDP', display_order: 3, is_other: false },
    { id: '00000001-0002-0001-0001-000000000004', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'None yet', display_order: 4, is_other: false },
    { id: '00000001-0002-0001-0001-000000000005', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    // Q3 options — single_choice (primary reason)
    { id: '00000001-0003-0001-0001-000000000001', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Improve developer onboarding speed', display_order: 1, is_other: false },
    { id: '00000001-0003-0001-0001-000000000002', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Standardise tooling across teams', display_order: 2, is_other: false },
    { id: '00000001-0003-0001-0001-000000000003', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Reduce cognitive load for engineers', display_order: 3, is_other: false },
    { id: '00000001-0003-0001-0001-000000000004', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Improve compliance and audit trails', display_order: 4, is_other: false },
    { id: '00000001-0003-0001-0001-000000000005', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Other', display_order: 5, is_other: true },
  ]).onConflictDoNothing();

  // ── Section: current_status (mandatory, 5 questions) ─────────────────────────
  await db.insert(questionsTable).values([
    { id: '00000002-0001-0001-0001-000000000001', section_id: 'current_status', question_text: 'How would you rate your team\'s current developer experience (DX)?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Very poor, 5 = Excellent' },
    { id: '00000002-0001-0001-0001-000000000002', section_id: 'current_status', question_text: 'Which of the following tools does your team currently use? (Select all that apply)', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000002-0001-0001-0001-000000000003', section_id: 'current_status', question_text: 'What is the approximate size of your team?', question_type: 'single_choice', is_required: true, has_other: false, display_order: 3, help_text: null },
    { id: '00000002-0001-0001-0001-000000000004', section_id: 'current_status', question_text: 'Describe any recurring tooling or workflow issues your team experiences today.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000002-0001-0001-0001-000000000005', section_id: 'current_status', question_text: 'How satisfied is your team with the current CI/CD setup?', question_type: 'likert', is_required: true, has_other: false, display_order: 5, help_text: '1 = Very dissatisfied, 5 = Very satisfied' },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000002-0002-0001-0001-000000000001', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'GitHub / GitLab', display_order: 1, is_other: false },
    { id: '00000002-0002-0001-0001-000000000002', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Jenkins / TeamCity', display_order: 2, is_other: false },
    { id: '00000002-0002-0001-0001-000000000003', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Confluence / Notion (docs)', display_order: 3, is_other: false },
    { id: '00000002-0002-0001-0001-000000000004', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Jira / Linear (tracking)', display_order: 4, is_other: false },
    { id: '00000002-0002-0001-0001-000000000005', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    { id: '00000002-0003-0001-0001-000000000001', question_id: '00000002-0001-0001-0001-000000000003', option_text: '1–5 people', display_order: 1, is_other: false },
    { id: '00000002-0003-0001-0001-000000000002', question_id: '00000002-0001-0001-0001-000000000003', option_text: '6–15 people', display_order: 2, is_other: false },
    { id: '00000002-0003-0001-0001-000000000003', question_id: '00000002-0001-0001-0001-000000000003', option_text: '16–50 people', display_order: 3, is_other: false },
    { id: '00000002-0003-0001-0001-000000000004', question_id: '00000002-0001-0001-0001-000000000003', option_text: '50+ people', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: platform_needs (optional, 6 questions including ranking) ─────────
  await db.insert(questionsTable).values([
    { id: '00000003-0001-0001-0001-000000000001', section_id: 'platform_needs', question_text: 'Rank the following Developer Platform capabilities by priority for your team.', question_type: 'ranking', is_required: true, has_other: false, display_order: 1, help_text: 'Drag items to reorder from most to least important.' },
    { id: '00000003-0001-0001-0001-000000000002', section_id: 'platform_needs', question_text: 'How important is a self-service software catalog (e.g., Backstage catalog) to your team?', question_type: 'likert', is_required: true, has_other: false, display_order: 2, help_text: '1 = Not important, 5 = Essential' },
    { id: '00000003-0001-0001-0001-000000000003', section_id: 'platform_needs', question_text: 'Which platform features does your team consider must-have for day 1 adoption?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 3, help_text: null },
    { id: '00000003-0001-0001-0001-000000000004', section_id: 'platform_needs', question_text: 'What template or scaffolding capabilities does your team need?', question_type: 'free_text_short', is_required: false, has_other: false, display_order: 4, help_text: 'e.g., project templates, service scaffolding, IaC templates' },
    { id: '00000003-0001-0001-0001-000000000005', section_id: 'platform_needs', question_text: 'How many internal services or components would your team register in a software catalog?', question_type: 'single_choice', is_required: false, has_other: false, display_order: 5, help_text: null },
    { id: '00000003-0001-0001-0001-000000000006', section_id: 'platform_needs', question_text: 'Describe any custom platform capability your team requires that is not covered above.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 6, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    // Q1 ranking options
    { id: '00000003-0001-0001-0002-000000000001', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Software catalog / service registry', display_order: 1, is_other: false },
    { id: '00000003-0001-0001-0002-000000000002', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Developer portal / unified UI', display_order: 2, is_other: false },
    { id: '00000003-0001-0001-0002-000000000003', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Scaffolding / templates', display_order: 3, is_other: false },
    { id: '00000003-0001-0001-0002-000000000004', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Onboarding automation', display_order: 4, is_other: false },
    { id: '00000003-0001-0001-0002-000000000005', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Plugin / extension ecosystem', display_order: 5, is_other: false },
    // Q3 multi-choice options
    { id: '00000003-0003-0001-0002-000000000001', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'Software catalog', display_order: 1, is_other: false },
    { id: '00000003-0003-0001-0002-000000000002', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'CI/CD pipeline integration', display_order: 2, is_other: false },
    { id: '00000003-0003-0001-0002-000000000003', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'Metrics and observability', display_order: 3, is_other: false },
    { id: '00000003-0003-0001-0002-000000000004', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'Other', display_order: 4, is_other: true },
    // Q5 single-choice
    { id: '00000003-0005-0001-0002-000000000001', question_id: '00000003-0001-0001-0001-000000000005', option_text: 'Fewer than 10', display_order: 1, is_other: false },
    { id: '00000003-0005-0001-0002-000000000002', question_id: '00000003-0001-0001-0001-000000000005', option_text: '10–50', display_order: 2, is_other: false },
    { id: '00000003-0005-0001-0002-000000000003', question_id: '00000003-0001-0001-0001-000000000005', option_text: '51–200', display_order: 3, is_other: false },
    { id: '00000003-0005-0001-0002-000000000004', question_id: '00000003-0001-0001-0001-000000000005', option_text: '200+', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: tool_evaluation (optional, 5 questions) ─────────────────────────
  await db.insert(questionsTable).values([
    { id: '00000004-0001-0001-0001-000000000001', section_id: 'tool_evaluation', question_text: 'Rank the three DP tools being evaluated by your overall preference.', question_type: 'ranking', is_required: true, has_other: false, display_order: 1, help_text: 'Rank from most to least preferred.' },
    { id: '00000004-0001-0001-0001-000000000002', section_id: 'tool_evaluation', question_text: 'Which evaluation criteria are most important to your team?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000004-0001-0001-0001-000000000003', section_id: 'tool_evaluation', question_text: 'How confident is your team in evaluating these tools without external support?', question_type: 'likert', is_required: true, has_other: false, display_order: 3, help_text: '1 = Not confident, 5 = Very confident' },
    { id: '00000004-0001-0001-0001-000000000004', section_id: 'tool_evaluation', question_text: 'What is the most important single differentiator between the tools for your team?', question_type: 'free_text_short', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000004-0001-0001-0001-000000000005', section_id: 'tool_evaluation', question_text: 'Which tool do you currently lean toward adopting, based on your initial evaluation?', question_type: 'single_choice', is_required: false, has_other: false, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    // Q1 ranking — tools
    { id: '00000004-0001-0001-0002-000000000001', question_id: '00000004-0001-0001-0001-000000000001', option_text: 'Backstage (Spotify)', display_order: 1, is_other: false },
    { id: '00000004-0001-0001-0002-000000000002', question_id: '00000004-0001-0001-0001-000000000001', option_text: 'Red Hat Developer Hub', display_order: 2, is_other: false },
    { id: '00000004-0001-0001-0002-000000000003', question_id: '00000004-0001-0001-0001-000000000001', option_text: 'Harness IDP', display_order: 3, is_other: false },
    // Q2 multi-choice — criteria
    { id: '00000004-0002-0001-0002-000000000001', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Ease of onboarding', display_order: 1, is_other: false },
    { id: '00000004-0002-0001-0002-000000000002', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Plugin / extension ecosystem', display_order: 2, is_other: false },
    { id: '00000004-0002-0001-0002-000000000003', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Enterprise support / SLA', display_order: 3, is_other: false },
    { id: '00000004-0002-0001-0002-000000000004', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Total cost of ownership', display_order: 4, is_other: false },
    { id: '00000004-0002-0001-0002-000000000005', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    // Q5 single-choice — current lean
    { id: '00000004-0005-0001-0002-000000000001', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'Backstage (Spotify)', display_order: 1, is_other: false },
    { id: '00000004-0005-0001-0002-000000000002', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'Red Hat Developer Hub', display_order: 2, is_other: false },
    { id: '00000004-0005-0001-0002-000000000003', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'Harness IDP', display_order: 3, is_other: false },
    { id: '00000004-0005-0001-0002-000000000004', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'No preference yet', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: integration_requirements (optional, 5 questions) ────────────────
  await db.insert(questionsTable).values([
    { id: '00000005-0001-0001-0001-000000000001', section_id: 'integration_requirements', question_text: 'Which source control platforms does your team use?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 1, help_text: null },
    { id: '00000005-0001-0001-0001-000000000002', section_id: 'integration_requirements', question_text: 'How critical is integration with your existing CI/CD pipelines for initial adoption?', question_type: 'likert', is_required: true, has_other: false, display_order: 2, help_text: '1 = Not critical, 5 = Blocker for adoption' },
    { id: '00000005-0001-0001-0001-000000000003', section_id: 'integration_requirements', question_text: 'Rank the integration points your team needs most urgently.', question_type: 'ranking', is_required: true, has_other: false, display_order: 3, help_text: null },
    { id: '00000005-0001-0001-0001-000000000004', section_id: 'integration_requirements', question_text: 'Describe any non-standard or bespoke integrations your team requires.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000005-0001-0001-0001-000000000005', section_id: 'integration_requirements', question_text: 'Does your team use a cloud provider that the DP tool must integrate with?', question_type: 'single_choice', is_required: false, has_other: true, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000005-0001-0001-0002-000000000001', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'GitHub', display_order: 1, is_other: false },
    { id: '00000005-0001-0001-0002-000000000002', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'GitLab', display_order: 2, is_other: false },
    { id: '00000005-0001-0001-0002-000000000003', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'Bitbucket', display_order: 3, is_other: false },
    { id: '00000005-0001-0001-0002-000000000004', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'Azure DevOps', display_order: 4, is_other: false },
    { id: '00000005-0001-0001-0002-000000000005', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'Other', display_order: 5, is_other: true },
    // Q3 ranking
    { id: '00000005-0003-0001-0002-000000000001', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'SCM / version control', display_order: 1, is_other: false },
    { id: '00000005-0003-0001-0002-000000000002', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'CI/CD pipelines', display_order: 2, is_other: false },
    { id: '00000005-0003-0001-0002-000000000003', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'Cloud provider APIs', display_order: 3, is_other: false },
    { id: '00000005-0003-0001-0002-000000000004', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'Identity / SSO', display_order: 4, is_other: false },
    // Q5 single-choice
    { id: '00000005-0005-0001-0002-000000000001', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'AWS', display_order: 1, is_other: false },
    { id: '00000005-0005-0001-0002-000000000002', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'Azure', display_order: 2, is_other: false },
    { id: '00000005-0005-0001-0002-000000000003', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'GCP', display_order: 3, is_other: false },
    { id: '00000005-0005-0001-0002-000000000004', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'Multiple / Hybrid', display_order: 4, is_other: false },
    { id: '00000005-0005-0001-0002-000000000005', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'Other', display_order: 5, is_other: true },
  ]).onConflictDoNothing();

  // ── Section: adoption_readiness (optional, 5 questions) ──────────────────────
  await db.insert(questionsTable).values([
    { id: '00000006-0001-0001-0001-000000000001', section_id: 'adoption_readiness', question_text: 'How ready is your team to adopt a Developer Platform in the next 6 months?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not ready, 5 = Ready to adopt immediately' },
    { id: '00000006-0001-0001-0001-000000000002', section_id: 'adoption_readiness', question_text: 'What are the main blockers to adoption for your team?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000006-0001-0001-0001-000000000003', section_id: 'adoption_readiness', question_text: 'Who in your team would be the primary champion for DP adoption?', question_type: 'single_choice', is_required: false, has_other: true, display_order: 3, help_text: null },
    { id: '00000006-0001-0001-0001-000000000004', section_id: 'adoption_readiness', question_text: 'What training or support would your team need to successfully adopt a Developer Platform?', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000006-0001-0001-0001-000000000005', section_id: 'adoption_readiness', question_text: 'How many engineers in your team would actively use the Developer Platform in the first 90 days?', question_type: 'single_choice', is_required: false, has_other: false, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000006-0002-0001-0002-000000000001', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Migration effort from existing tools', display_order: 1, is_other: false },
    { id: '00000006-0002-0001-0002-000000000002', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Lack of engineering capacity', display_order: 2, is_other: false },
    { id: '00000006-0002-0001-0002-000000000003', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Budget / procurement constraints', display_order: 3, is_other: false },
    { id: '00000006-0002-0001-0002-000000000004', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Leadership buy-in', display_order: 4, is_other: false },
    { id: '00000006-0002-0001-0002-000000000005', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    { id: '00000006-0003-0001-0002-000000000001', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Engineering Lead / Principal Engineer', display_order: 1, is_other: false },
    { id: '00000006-0003-0001-0002-000000000002', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Platform / DevOps team lead', display_order: 2, is_other: false },
    { id: '00000006-0003-0001-0002-000000000003', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Engineering Manager', display_order: 3, is_other: false },
    { id: '00000006-0003-0001-0002-000000000004', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Other', display_order: 4, is_other: true },
    { id: '00000006-0005-0001-0002-000000000001', question_id: '00000006-0001-0001-0001-000000000005', option_text: '1–3 engineers', display_order: 1, is_other: false },
    { id: '00000006-0005-0001-0002-000000000002', question_id: '00000006-0001-0001-0001-000000000005', option_text: '4–10 engineers', display_order: 2, is_other: false },
    { id: '00000006-0005-0001-0002-000000000003', question_id: '00000006-0001-0001-0001-000000000005', option_text: '11–25 engineers', display_order: 3, is_other: false },
    { id: '00000006-0005-0001-0002-000000000004', question_id: '00000006-0001-0001-0001-000000000005', option_text: '25+ engineers', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: governance_compliance (optional, 5 questions) ───────────────────
  await db.insert(questionsTable).values([
    { id: '00000007-0001-0001-0001-000000000001', section_id: 'governance_compliance', question_text: 'How important is regulatory compliance support (e.g., SOC 2, ISO 27001) in the DP tool?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not required, 5 = Mandatory for adoption' },
    { id: '00000007-0001-0001-0001-000000000002', section_id: 'governance_compliance', question_text: 'Which compliance frameworks does your team need to demonstrate adherence to?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000007-0001-0001-0001-000000000003', section_id: 'governance_compliance', question_text: 'Does your team require data residency controls (e.g., EU-only data storage)?', question_type: 'single_choice', is_required: true, has_other: false, display_order: 3, help_text: null },
    { id: '00000007-0001-0001-0001-000000000004', section_id: 'governance_compliance', question_text: 'Describe any specific audit or governance requirements not covered in the options above.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000007-0001-0001-0001-000000000005', section_id: 'governance_compliance', question_text: 'How mature is your team\'s current API governance practice?', question_type: 'likert', is_required: true, has_other: false, display_order: 5, help_text: '1 = Ad hoc / none, 5 = Fully governed with enforcement' },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000007-0002-0001-0002-000000000001', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'SOC 2', display_order: 1, is_other: false },
    { id: '00000007-0002-0001-0002-000000000002', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'ISO 27001', display_order: 2, is_other: false },
    { id: '00000007-0002-0001-0002-000000000003', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'GDPR', display_order: 3, is_other: false },
    { id: '00000007-0002-0001-0002-000000000004', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'HIPAA', display_order: 4, is_other: false },
    { id: '00000007-0002-0001-0002-000000000005', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    { id: '00000007-0003-0001-0002-000000000001', question_id: '00000007-0001-0001-0001-000000000003', option_text: 'Yes — strict data residency required', display_order: 1, is_other: false },
    { id: '00000007-0003-0001-0002-000000000002', question_id: '00000007-0001-0001-0001-000000000003', option_text: 'Preferred but not mandatory', display_order: 2, is_other: false },
    { id: '00000007-0003-0001-0002-000000000003', question_id: '00000007-0001-0001-0001-000000000003', option_text: 'No requirement', display_order: 3, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: feedback_adaptability (mandatory, 5 questions) ──────────────────
  await db.insert(questionsTable).values([
    { id: '00000008-0001-0001-0001-000000000001', section_id: 'feedback_adaptability', question_text: 'Overall, how confident are you that a Developer Platform will improve your team\'s productivity?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not confident, 5 = Highly confident' },
    { id: '00000008-0001-0001-0001-000000000002', section_id: 'feedback_adaptability', question_text: 'How willing is your team to adapt existing workflows to use a shared Developer Platform?', question_type: 'likert', is_required: true, has_other: false, display_order: 2, help_text: '1 = Very resistant, 5 = Fully open to change' },
    { id: '00000008-0001-0001-0001-000000000003', section_id: 'feedback_adaptability', question_text: 'Which aspects of your current workflow are you most reluctant to change?', question_type: 'multi_choice', is_required: false, has_other: true, display_order: 3, help_text: null },
    { id: '00000008-0001-0001-0001-000000000004', section_id: 'feedback_adaptability', question_text: 'What would make you rate this assessment as highly valuable to you and your team?', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000008-0001-0001-0001-000000000005', section_id: 'feedback_adaptability', question_text: 'Is there anything else you would like the adoption decision team to know?', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000008-0003-0001-0002-000000000001', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Local build tooling / scripts', display_order: 1, is_other: false },
    { id: '00000008-0003-0001-0002-000000000002', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Existing CI/CD pipelines', display_order: 2, is_other: false },
    { id: '00000008-0003-0001-0002-000000000003', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Team-specific onboarding docs', display_order: 3, is_other: false },
    { id: '00000008-0003-0001-0002-000000000004', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Other', display_order: 4, is_other: true },
  ]).onConflictDoNothing();

  console.log('Questions seeded (38 questions, 8 sections, all 6 question types represented).');
```

After adding this block, ensure the final `console.log('Seed complete.')` and `await pool.end()` remain at the end of the `seedDatabase()` function.
  </action>
  <verify>
```bash
# Verify question seed data present in seed.ts
grep -n "00000001-0001-0001-0001-000000000001" drizzle/seed.ts && echo "GENERAL DP ALIGNMENT Q1 OK"
grep -n "00000008-0001-0001-0001-000000000001" drizzle/seed.ts && echo "FEEDBACK ADAPTABILITY Q1 OK"
grep -n "ranking" drizzle/seed.ts && echo "RANKING QUESTION TYPE SEEDED OK"
grep -n "free_text_long\|free_text_short" drizzle/seed.ts && echo "FREE TEXT QUESTION TYPES OK"
grep -n "is_other: true" drizzle/seed.ts && echo "OTHER OPTIONS SEEDED OK"
grep -n "onConflictDoNothing" drizzle/seed.ts && echo "IDEMPOTENT SEED OK"
grep -c "section_id:" drizzle/seed.ts && echo "question rows above (expect 38+)"

# Run seed script against live DB (if DATABASE_URL set)
npx tsx drizzle/seed.ts 2>&1 | tail -10 && echo "SEED RAN OK"

# Verify DB question counts (requires running DB)
npx tsx -e "
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) as cnt FROM questions').then(r => {
  console.log('questions count:', r.rows[0].cnt, '(expected >= 38)');
  if (parseInt(r.rows[0].cnt) >= 38) console.log('QUESTIONS OK');
  else console.error('QUESTIONS FAIL: expected >= 38, got', r.rows[0].cnt);
}).catch(e => console.error('DB check failed:', e.message)).finally(() => pool.end());
" 2>&1

# Full docker stack validation
docker build -t assessmentform-build-check . 2>&1 | tail -5 && echo "BUILD OK"
docker compose config --quiet && echo "COMPOSE CONFIG VALID"
docker compose up -d && sleep 90 && docker compose ps && echo "STACK UP"
curl -f http://localhost:3000/api/health 2>&1 | head -3 && echo "HEALTH ENDPOINT OK"
docker compose down && echo "COMPOSE DOWN CLEAN"
```
  </verify>
  <done>
- drizzle/seed.ts extended with question + question_options data for all 8 sections: general_dp_alignment (5q), current_status (5q), platform_needs (6q), tool_evaluation (5q), integration_requirements (5q), adoption_readiness (5q), governance_compliance (5q), feedback_adaptability (5q) = 41 total questions
- All 6 question types represented in seed data: single_choice, multi_choice, likert, ranking, free_text_short, free_text_long
- "Other" option (is_other: true) present on multi_choice and single_choice questions as required by F2
- All inserts use onConflictDoNothing() — seed is idempotent and safe to run on every container startup
- docker compose up -d starts both services; postgres healthcheck passes before app starts
- docker compose ps shows both containers in Up/healthy state
- GET http://localhost:3000/api/health returns 200 { status: "ok", db: "connected" }
- docker compose down stops cleanly with no dangling containers
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| env→container | DATABASE_URL, JWT_SECRET, and other secrets injected via docker-compose environment block cross from host environment into the container process |
| client→health | GET /api/health is publicly accessible without auth — must not leak sensitive internal details |
| seed→db | drizzle/seed.ts runs with full DB write access on every container start — seed data is hardcoded (not user-controlled) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-01 | Information disclosure | `src/app/api/health/route.ts` | mitigate | Health endpoint returns only `{ status, db, timestamp }` — never exposes stack traces, connection strings, or internal error details. Catch block logs server-side only (`console.error`); response body contains only `"db": "disconnected"` on failure. Cache-Control: no-store prevents caching of health state. |
| T-10-02 | Information disclosure | `docker-compose.yml` JWT_SECRET | accept | Default `docker-compose.yml` contains a placeholder `JWT_SECRET` (clearly labeled "change-me"). Risk accepted for local dev; production deployments must substitute a real secret via env injection or secrets manager. `.env.example` documents this with `openssl rand -hex 32` guidance. |
| T-10-03 | Elevation of privilege | `Dockerfile` CMD (migrate + seed) | mitigate | Migration and seed scripts run as `nextjs` user (non-root UID 1001), not as root. Seed inserts use `onConflictDoNothing()` — cannot overwrite existing data with malicious payloads. Hardcoded seed data contains no user-controlled input. |
| T-10-04 | Tampering | `docker-compose.yml` postgres volume | accept | Persistent `postgres_data` volume is not encrypted at rest in the default compose config. Risk accepted for internal enterprise deployment; production environments should use managed PostgreSQL (RDS, Cloud SQL) with encryption-at-rest enforced at the infrastructure layer. |
| T-10-05 | Denial of service | `src/app/api/health/route.ts` | mitigate | Health endpoint executes `SELECT 1` — a 0-scan, near-zero-cost query. It does not touch application tables or perform any writes. Cannot be used to trigger expensive DB operations. Rate limiting (if needed) is handled at the load balancer/ingress layer outside this app. |
</threat_model>

<verification>
## Wave 10 — Integration/Deployment Verification

After all tasks complete, run:

```bash
# 1. All source files exist
ls Dockerfile docker-compose.yml .env.example src/app/api/health/route.ts && echo "ALL FILES PRESENT"

# 2. No X-Frame-Options DENY anywhere in the stack
grep -r "X-Frame-Options.*DENY" . --include="*.ts" --include="*.mjs" --include="*.js" --include="Dockerfile" && echo "ERROR: DENY found" || echo "NO DENY HEADER OK"

# 3. App binds to 0.0.0.0:3000
grep "0.0.0.0\|HOSTNAME\|HOST" Dockerfile && echo "BIND ALL INTERFACES OK"
grep "3000:3000" docker-compose.yml && echo "PORT MAPPING OK"

# 4. Health endpoint contract
grep -n "export.*GET" src/app/api/health/route.ts && echo "HEALTH GET CONTRACT OK"
grep -n "status.*ok\|db.*connected" src/app/api/health/route.ts && echo "HEALTH RESPONSE SHAPE OK"
grep -n "503\|disconnected" src/app/api/health/route.ts && echo "HEALTH ERROR PATH OK"

# 5. Seed covers all question types
for qt in single_choice multi_choice likert ranking free_text_short free_text_long; do
  grep -q "$qt" drizzle/seed.ts && echo "$qt: SEEDED OK" || echo "$qt: MISSING"
done

# 6. Docker stack (requires Docker daemon)
docker compose config --quiet && echo "COMPOSE VALID"
docker build -t assessmentform-build-check . 2>&1 | tail -5 && echo "BUILD COMPLETE"
docker compose up -d && echo "STACK STARTED"
sleep 90  # Wait for migrations + seed + app startup
docker compose ps
curl -s http://localhost:3000/api/health | grep '"status":"ok"' && echo "HEALTH CHECK PASSED"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep "200\|307\|308" && echo "ROOT ROUTE RESPONDS"
docker compose down && echo "CLEAN SHUTDOWN"
```
</verification>

<success_criteria>
- Dockerfile produces a runnable image: multi-stage build, node:20-alpine runner, standalone Next.js output, EXPOSE 3000, binds to 0.0.0.0, CMD migrates + seeds + starts server.js
- docker-compose.yml boots app + postgres in a single `docker compose up -d`; postgres service_healthy gate prevents race condition; app healthcheck uses /api/health; postgres_data volume persists between restarts
- GET /api/health returns 200 { status: "ok", db: "connected", timestamp } when DB is reachable; returns 503 { status: "error", db: "disconnected" } if DB is down
- .env.example documents all 7 environment variables (DATABASE_URL, JWT_SECRET, AUTO_SAVE_IDLE_SECONDS, DUE_DATE, EMAIL_RELAY_URL, EMAIL_FROM_ADDRESS, runtime vars) with descriptions and safe defaults
- drizzle/seed.ts seeds 38+ questions across all 8 sections; all 6 question types present; "Other" options included on applicable questions; idempotent via onConflictDoNothing()
- X-Frame-Options is NOT set to DENY anywhere — app is embeddable in Pivota Preview iframe
- next.config.mjs has output: 'standalone' enabling Docker multi-stage build
- TypeScript compilation passes (npx tsc --noEmit)
- docker compose up → wait 90s → GET /api/health returns 200 → docker compose down exits cleanly
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/10-SUMMARY.md` with:
- What was built (Dockerfile, docker-compose.yml, health endpoint, seed extension)
- Container startup sequence (migrate → seed → serve)
- All env vars documented (names, whether required or optional)
- Pivota Preview iframe note (SAMEORIGIN not DENY)
- Any deviations from plan or TechArch (flag, do not silently diverge)
</output>
