# Technical Architecture: AssessmentForm-Express
**Project:** AssessmentForm  
**Version:** 1.0  
**Date:** 2026-07-17  
**Status:** Draft  
**Based on:** PRD-AssessmentForm.md v1.0, FRD-AssessmentForm.md v1.0

---

## 1. Architectural Overview

### 1.1 Architecture Pattern

AssessmentForm-Express uses a **Layered Monolith / Full-Stack SPA** pattern built on Next.js. The frontend is a React single-page application served as a statically-rendered shell with client-side routing. The backend exposes a REST API via Next.js API Routes (Node.js runtime), co-located in the same deployment unit. PostgreSQL provides the persistent relational data store.

This pattern was chosen over a microservices approach because:
- **Operational simplicity:** Internal enterprise tool with a bounded scope (~500 concurrent users) doesn't require distributed services.
- **Co-location reduces latency:** API routes run in the same process as the server-side rendering layer.
- **Single deployment artifact:** One container image simplifies the enterprise's internal rollout.
- **Next.js API Routes provide sufficient isolation:** Each route file maps to an HTTP handler — logic can be extracted to a service module later if needed.

### 1.2 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Enterprise Internal Network                   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Browser (SPA Client)                     │   │
│   │                                                             │   │
│   │  ┌─────────────────┐       ┌──────────────────────────┐   │   │
│   │  │  Assessment SPA  │       │   Dashboard SPA (SO only) │   │   │
│   │  │  (Respondent)   │       │   (System Owner)          │   │   │
│   │  │                 │       │                           │   │   │
│   │  │ • Multi-step    │       │ • Response list + filters │   │   │
│   │  │   form wizard   │       │ • Analytics charts        │   │   │
│   │  │ • Auto-save     │       │   (Recharts)              │   │   │
│   │  │ • Progress bar  │       │ • Individual drill-down   │   │   │
│   │  │ • Review step   │       │ • CSV export              │   │   │
│   │  └────────┬────────┘       └──────────┬────────────────┘   │   │
│   │           │                           │                     │   │
│   │           └─────────┬─────────────────┘                     │   │
│   │                     │  Authorization: Bearer {JWT}          │   │
│   └─────────────────────┼─────────────────────────────────────-─┘   │
│                         │                                            │
│   ┌─────────────────────▼──────────────────────────────────────┐    │
│   │               Next.js Application Server                   │    │
│   │                                                            │    │
│   │  ┌──────────────────────────────────────────────────────┐ │    │
│   │  │                   REST API Layer                     │ │    │
│   │  │          /api/** (Next.js API Routes)                │ │    │
│   │  │                                                      │ │    │
│   │  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │ │    │
│   │  │  │  Auth    │  │ Sessions │  │  Responses /      │ │ │    │
│   │  │  │  /login  │  │ CRUD     │  │  Submissions      │ │ │    │
│   │  │  └──────────┘  └──────────┘  └───────────────────┘ │ │    │
│   │  │                                                      │ │    │
│   │  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │ │    │
│   │  │  │ Sections │  │Dashboard │  │  Config PATCH     │ │ │    │
│   │  │  │ /Questions│  │ Analytics│  │  & Audit Log      │ │ │    │
│   │  │  └──────────┘  └──────────┘  └───────────────────┘ │ │    │
│   │  └──────────────────────────────────────────────────────┘ │    │
│   │                                                            │    │
│   │  ┌──────────────────────────────────────────────────────┐ │    │
│   │  │              Business Logic Layer                    │ │    │
│   │  │  • JWT auth middleware (role claim extraction)       │ │    │
│   │  │  • Section routing engine (team-type → sections)     │ │    │
│   │  │  • Answer payload validation (per question type)     │ │    │
│   │  │  • Due date enforcement (assessment open/closed)     │ │    │
│   │  │  • Analytics aggregation (SQL GROUP BY / AVG)        │ │    │
│   │  │  • CSV generation (streaming)                        │ │    │
│   │  └──────────────────────────────────────────────────────┘ │    │
│   │                                                            │    │
│   │  ┌──────────────────────────────────────────────────────┐ │    │
│   │  │                Data Access Layer                     │ │    │
│   │  │  • PostgreSQL client (pg / Drizzle ORM)              │ │    │
│   │  │  • Parameterized queries; no raw string concat       │ │    │
│   │  │  • Connection pool (max 20 connections)              │ │    │
│   │  └──────────────────────────────────────────────────────┘ │    │
│   └────────────────────────┬───────────────────────────────────┘    │
│                            │                                         │
│   ┌────────────────────────▼───────────────────────────────────┐    │
│   │                   PostgreSQL Database                      │    │
│   │                                                            │    │
│   │  system_owner_emails │ respondents │ sessions             │    │
│   │  sections │ section_routing │ questions │ question_options│    │
│   │  responses │ assessment_config │ config_audit_log        │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │   Optional: Enterprise Email Relay (SMTP)        │              │
│   │   INT-01 stretch goal — graceful no-op if absent │              │
│   └──────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.3 Deployment Topology

```
┌────────────────────────────────────────────────────┐
│               Enterprise Internal Network          │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │          Docker Container (single)           │  │
│  │                                              │  │
│  │  Node.js 20 LTS  (Next.js 16.2.10 App Router) │  │
│  │  Port 4000 (HTTP — internal only)            │  │
│  │                                              │  │
│  │  ENV:                                        │  │
│  │    DATABASE_URL=postgres://...?options=...   │  │
│  │    JWT_SECRET=<secret>                       │  │
│  │    NODE_TLS_REJECT_UNAUTHORIZED=0            │  │
│  │    EMAIL_RELAY_URL= (optional)               │  │
│  │    EMAIL_FROM_ADDRESS= (optional)            │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  PostgreSQL 16 (pivota-spec-driven-primary   │  │
│  │  .prod.svc:5432, schema: assessmentform)     │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

**Deployment notes:**
- Single container deployment; no orchestration required for v1 scale (≤500 concurrent users).
- PostgreSQL hosted internally; `DATABASE_URL` injected at runtime.
- No public internet exposure. All traffic is within the enterprise network.
- `JWT_SECRET` must be a cryptographically random 256-bit value; rotated on security events.
- Optional email relay enabled by setting `EMAIL_RELAY_URL`; omitting the variable disables the feature silently.

### 1.4 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js (App Router)** | Co-locates React SPA and API routes in one deployment; SSR optional but not required; simplifies internal hosting. |
| **JWT-based auth (no SSO)** | Eliminates SSO dependency for v1. Email + role claim sufficient for two-role model. Token expiry: 24h (respondent) / 8h (system owner). |
| **PostgreSQL with JSONB** | Relational integrity for sessions/responses; JSONB `answer_payload` handles polymorphic answer types without a schema-per-question approach. |
| **Singleton `assessment_config`** | One active assessment at a time in v1. `CHECK (id = 1)` constraint enforces this at the database level. |
| **Section routing in DB** | Config-driven team-type → section mapping allows future team types / section changes without code deploys. |
| **Auto-save on navigation + idle** | Guarantees zero data loss on browser close. Dirty-state tracking prevents unnecessary API calls. |
| **CSV export via streaming** | Avoids memory pressure on large result sets; streamed directly as HTTP response. |
| **Recharts for analytics** | Lightweight, React-native charting library; no additional iframe or embed dependencies. |

---
---

## 2. Component Architecture

### 2.1 Frontend Components

```
src/
├── app/                             # Next.js App Router pages
│   ├── page.tsx                     # Root redirect: → /assessment or /dashboard
│   ├── assessment/
│   │   └── page.tsx                 # Assessment SPA entry point
│   └── dashboard/
│       ├── page.tsx                 # Dashboard home (response list + analytics)
│       └── responses/
│           └── [sessionId]/
│               └── page.tsx         # Individual response drill-down
│
├── components/
│   ├── assessment/
│   │   ├── IdentityForm.tsx         # F01: Email + name + team type capture
│   │   ├── AssessmentWizard.tsx     # F00: Multi-step section wizard container
│   │   ├── ProgressBar.tsx          # F00: Step progress indicator
│   │   ├── SectionScreen.tsx        # F00: Renders one section's questions
│   │   ├── ReviewStep.tsx           # F00: Pre-submit read-only summary
│   │   ├── SaveStateIndicator.tsx   # F04: "Saved / Saving… / Unsaved" status
│   │   └── SubmissionConfirmation.tsx # F09: Post-submit confirmation screen
│   │
│   ├── questions/                   # F02: Question type renderers
│   │   ├── QuestionRouter.tsx       # Selects renderer by question_type
│   │   ├── SingleChoiceQuestion.tsx
│   │   ├── MultiChoiceQuestion.tsx
│   │   ├── LikertQuestion.tsx
│   │   ├── RankingQuestion.tsx      # DnD + numbered fallback
│   │   ├── FreeTextShortQuestion.tsx
│   │   ├── FreeTextLongQuestion.tsx
│   │   └── OtherTextReveal.tsx      # Shared "Other" field reveal component
│   │
│   ├── dashboard/
│   │   ├── ResponseTable.tsx        # F06: Paginated, sortable response list
│   │   ├── FilterPanel.tsx          # F06: Team type / date / status filters
│   │   ├── SearchBar.tsx            # F06: Name/email search
│   │   ├── ResponseDetailView.tsx   # F06: Individual response read-only render
│   │   ├── AnalyticsPanel.tsx       # F06: Charts container
│   │   ├── charts/
│   │   │   ├── TeamTypeBarChart.tsx          # Response counts by team type
│   │   │   ├── LikertDistributionChart.tsx   # Stacked bar per Likert question
│   │   │   ├── RankingTopItemsChart.tsx      # Average rank per ranking question
│   │   │   └── ChoiceBreakdownChart.tsx      # Pie/bar per choice question
│   │   └── ConfigPanel.tsx          # F08: Due date management
│   │
│   └── shared/
│       ├── AuthGuard.tsx            # F07: Client-side role guard HOC
│       ├── ErrorBoundary.tsx        # Global error catch + display
│       ├── LoadingSpinner.tsx
│       └── ResumeBanner.tsx         # F01: Returning respondent notice
│
├── hooks/
│   ├── useAutoSave.ts               # F04: Auto-save logic (nav + idle timer)
│   ├── useSession.ts                # F01: Session state management + localStorage
│   ├── useSectionList.ts            # F03: Fetch + cache section list
│   └── useDashboardFilters.ts       # F06: Filter state + URL sync
│
├── lib/
│   ├── api.ts                       # Typed fetch wrapper (all API calls)
│   ├── jwt.ts                       # Client-side JWT decode (role extraction)
│   ├── answerPayload.ts             # F02: Answer serialization helpers
│   └── validators.ts                # Client-side validation (email, name, etc.)
│
└── types/
    └── index.ts                     # Shared TypeScript interfaces (see §4)
```

### 2.2 Backend Modules (Next.js API Routes)

```
src/app/api/
├── auth/
│   └── login/route.ts               # POST /api/auth/login — System Owner login
│
├── sessions/
│   ├── route.ts                     # POST /api/sessions — create/resume session
│   └── [sessionId]/
│       └── route.ts                 # GET /api/sessions/:sessionId — load session
│
├── sections/
│   ├── route.ts                     # GET /api/sections?teamType — section list
│   └── [sectionId]/
│       └── questions/
│           └── route.ts             # GET /api/sections/:id/questions
│
├── responses/
│   └── [sessionId]/
│       └── route.ts                 # PUT /api/responses/:sessionId — auto-save
│
├── submissions/
│   └── [sessionId]/
│       └── route.ts                 # POST /api/submissions/:sessionId — finalize
│
├── dashboard/
│   ├── responses/
│   │   ├── route.ts                 # GET /api/dashboard/responses — paginated list
│   │   └── [sessionId]/
│   │       └── route.ts             # GET /api/dashboard/responses/:sessionId
│   ├── analytics/
│   │   └── route.ts                 # GET /api/dashboard/analytics
│   └── export/
│       └── csv/
│           └── route.ts             # GET /api/dashboard/export/csv — streaming
│
├── config/
│   └── route.ts                     # GET + PATCH /api/config
│
└── notifications/
    └── email/
        └── route.ts                 # POST /api/notifications/email (stretch)
```

### 2.3 Backend Services (Business Logic Layer)

| Service Module | Responsibilities |
|----------------|-----------------|
| `authService.ts` | JWT sign/verify, role determination, `system_owner_emails` lookup |
| `sessionService.ts` | Session upsert, returning-respondent detection, section list hydration |
| `sectionRoutingService.ts` | Compute effective section list for a team type; mandatory section enforcement; order assembly |
| `questionService.ts` | Fetch section questions with options; validate answer payload schemas |
| `responseService.ts` | Upsert responses (JSONB payloads); due-date guard; `last_saved_at` update |
| `submissionService.ts` | Final submission: mandatory-questions check, status transition, audit timestamp |
| `dashboardService.ts` | Paginated response list with filters; individual response fetch |
| `analyticsService.ts` | SQL aggregations: COUNT by team type, Likert distribution, ranking AVG, choice counts |
| `csvExportService.ts` | Streaming CSV generation: flatten JSONB payloads to human-readable strings |
| `configService.ts` | Read/update `assessment_config` singleton; write `config_audit_log` on every change |
| `emailService.ts` | Fire-and-forget email via SMTP relay; no-op if `EMAIL_RELAY_URL` unset |

### 2.4 Middleware

| Middleware | Applied To | Responsibility |
|------------|-----------|----------------|
| `jwtMiddleware` | All `/api/**` except `POST /api/sessions` and `POST /api/auth/login` | Verify JWT signature + expiry; attach `req.user = { session_id, email, role }` |
| `requireSystemOwner` | All `/api/dashboard/**` and `GET /api/config`, `PATCH /api/config` | Reject with 403 `ACCESS_DENIED` if `req.user.role !== "system_owner"` |
| `requireSessionOwner` | `GET /api/sessions/:id`, `PUT /api/responses/:id`, `POST /api/submissions/:id` | Verify session belongs to authenticated email; reject with 403 `SESSION_ACCESS_DENIED` |
| `assessmentOpenGuard` | `PUT /api/responses/:id`, `POST /api/submissions/:id` | Check `assessment_config.due_date > NOW()`; reject with 403 `ASSESSMENT_CLOSED` if past |
| `requestLogger` | All routes | Structured request/response logging (method, path, status, latency) |

---
---

## 3. Data Model

### 3.1 Entity-Relationship Diagram

```
┌──────────────────────┐        ┌────────────────────────┐
│  system_owner_emails │        │    assessment_config   │
│─────────────────────-│        │────────────────────────│
│  id (PK)            │        │  id (PK, always = 1)   │
│  email (UNIQUE)     │        │  due_date              │
│  added_at           │        │  launch_date           │
│  added_by           │        │  last_modified_at      │
│  is_active          │        │  last_modified_by      │
└──────────────────────┘        └────────────────────────┘
                                         │ 1
                                         │ writes to
                                         ▼ N
                                ┌────────────────────────┐
                                │    config_audit_log    │
                                │────────────────────────│
                                │  id (PK)               │
                                │  changed_at            │
                                │  changed_by            │
                                │  field_changed         │
                                │  old_value             │
                                │  new_value             │
                                └────────────────────────┘

┌────────────────────────┐    1       N  ┌─────────────────────────┐
│      respondents       │──────────────▶│         sessions        │
│────────────────────────│              │─────────────────────────│
│  id (PK)               │              │  id (PK)                │
│  email (UNIQUE)        │              │  respondent_id (FK)     │
│  name                  │              │  submission_status      │
│  team_type             │              │  current_section_index  │
│  created_at            │              │  section_ids_ordered    │
└────────────────────────┘              │  submitted_at           │
                                        │  last_saved_at          │
                                        │  last_modified_at       │
                                        │  created_at             │
                                        └──────────┬──────────────┘
                                                   │ 1
                                                   │
                                                   ▼ N
                                        ┌──────────────────────┐
                                        │      responses       │
                                        │──────────────────────│
                                        │  id (PK)             │
                                        │  session_id (FK)     │◀─────────┐
                                        │  question_id (FK)    │          │
                                        │  answer_payload(JSONB│          │
                                        │  saved_at            │          │
                                        └──────────────────────┘          │
                                                   ▲                      │
                                                   │ N                    │
┌────────────────────────┐    1       N  ┌─────────┴────────────┐        │
│       sections         │──────────────▶│       questions      │        │
│────────────────────────│              │──────────────────────│        │
│  id (PK, text slug)    │              │  id (PK)             │────────┘
│  title                 │              │  section_id (FK)     │
│  description           │              │  question_text       │
│  is_mandatory          │              │  question_type       │
│  display_order         │              │  is_required         │
│  created_at            │              │  has_other           │
└────────────┬───────────┘              │  display_order       │
             │ 1                        │  help_text           │
             │                          │  created_at          │
             ▼ N                        └──────────┬───────────┘
  ┌──────────────────────┐                         │ 1
  │    section_routing   │                         │
  │──────────────────────│                         ▼ N
  │  id (PK)             │              ┌──────────────────────┐
  │  team_type           │              │   question_options   │
  │  section_id (FK)     │              │──────────────────────│
  │  display_order       │              │  id (PK)             │
  │  is_included         │              │  question_id (FK)    │
  │  UNIQUE(team,section)│              │  option_text         │
  └──────────────────────┘              │  display_order       │
                                        │  is_other            │
                                        │  created_at          │
                                        └──────────────────────┘
```

### 3.2 Complete DDL

> **Database:** PostgreSQL 16 (platform-provisioned shared DB; schema: `assessmentform`)  
> All `TIMESTAMPTZ` columns are stored in UTC.  
> UUIDs use `gen_random_uuid()`.  
> `JSONB` used for polymorphic answer payloads.

---

#### Table: `system_owner_emails`

```sql
CREATE TABLE system_owner_emails (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL UNIQUE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by     TEXT,                              -- Email of the admin who added this entry
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE  -- Soft-disable without deletion
);

-- Case-insensitive unique lookup
CREATE UNIQUE INDEX idx_system_owner_emails_lower
  ON system_owner_emails (LOWER(email));
```

---

#### Table: `respondents`

```sql
CREATE TABLE respondents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  team_type    TEXT        NOT NULL
                 CHECK (team_type IN (
                   'program_project',
                   'platform_engineering',
                   'infrastructure_cloud',
                   'data_api_governance'
                 )),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique lookup (resume flow uses LOWER(email) match)
CREATE UNIQUE INDEX idx_respondents_email_lower
  ON respondents (LOWER(email));
```

---

#### Table: `sessions`

```sql
CREATE TABLE sessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id         UUID        NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  submission_status     TEXT        NOT NULL DEFAULT 'draft'
                          CHECK (submission_status IN ('draft', 'submitted')),
  current_section_index INTEGER     NOT NULL DEFAULT 0,
  section_ids_ordered   JSONB       NOT NULL DEFAULT '[]', -- Ordered array of section ID strings
  submitted_at          TIMESTAMPTZ,                       -- NULL until deliberate Submit action
  last_saved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_respondent_id      ON sessions(respondent_id);
CREATE INDEX idx_sessions_submission_status  ON sessions(submission_status);
CREATE INDEX idx_sessions_submitted_at       ON sessions(submitted_at);
```

---

#### Table: `sections`

```sql
CREATE TABLE sections (
  id            TEXT        PRIMARY KEY,           -- Slug, e.g. 'general_dp_alignment'
  title         TEXT        NOT NULL,
  description   TEXT,
  is_mandatory  BOOLEAN     NOT NULL DEFAULT FALSE,
  display_order INTEGER     NOT NULL,              -- Global default display order
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### Table: `section_routing`

```sql
CREATE TABLE section_routing (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  team_type     TEXT     NOT NULL
                  CHECK (team_type IN (
                    'program_project',
                    'platform_engineering',
                    'infrastructure_cloud',
                    'data_api_governance'
                  )),
  section_id    TEXT     NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  display_order INTEGER  NOT NULL,  -- Order of this section for this specific team type
  is_included   BOOLEAN  NOT NULL DEFAULT TRUE,
  UNIQUE (team_type, section_id)
);

CREATE INDEX idx_section_routing_team_type ON section_routing(team_type);
```

---

#### Table: `questions`

```sql
CREATE TABLE questions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id     TEXT        NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  question_text  TEXT        NOT NULL,
  question_type  TEXT        NOT NULL
                   CHECK (question_type IN (
                     'single_choice',
                     'multi_choice',
                     'likert',
                     'ranking',
                     'free_text_short',
                     'free_text_long'
                   )),
  is_required    BOOLEAN     NOT NULL DEFAULT TRUE,
  has_other      BOOLEAN     NOT NULL DEFAULT FALSE, -- Only applicable to single/multi_choice
  display_order  INTEGER     NOT NULL,
  help_text      TEXT,                               -- Optional tooltip / hint
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_section_id ON questions(section_id);
```

---

#### Table: `question_options`

```sql
CREATE TABLE question_options (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id    UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text    TEXT        NOT NULL,
  display_order  INTEGER     NOT NULL,
  is_other       BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE for the special "Other" option
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, display_order)
);

CREATE INDEX idx_question_options_question_id ON question_options(question_id);
```

---

#### Table: `responses`

```sql
CREATE TABLE responses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id     UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_payload  JSONB       NOT NULL,  -- Polymorphic payload (see §3.3 below)
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)       -- One answer per question per session; upsert on conflict
);

CREATE INDEX idx_responses_session_id  ON responses(session_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);
```

---

#### Table: `assessment_config`

```sql
CREATE TABLE assessment_config (
  id               INTEGER     PRIMARY KEY DEFAULT 1
                     CHECK (id = 1),              -- Singleton row; only one assessment at a time
  due_date         TIMESTAMPTZ NOT NULL,
  launch_date      TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_by TEXT                           -- System Owner email who last changed config
);
```

---

#### Table: `config_audit_log`

```sql
CREATE TABLE config_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by    TEXT        NOT NULL,  -- System Owner email
  field_changed TEXT        NOT NULL,  -- e.g. 'due_date'
  old_value     TEXT,
  new_value     TEXT
);
```

---

### 3.3 Answer Payload Shapes (JSONB)

The `responses.answer_payload` column stores type-discriminated JSON objects. The `type` field must match the parent question's `question_type`.

```jsonc
// single_choice (option selected by ID)
{ "type": "single_choice", "value": "option-uuid" }

// single_choice with "Other" selected
{ "type": "single_choice", "value": "other", "other_text": "My custom answer" }

// multi_choice (one or more option IDs)
{ "type": "multi_choice", "values": ["option-uuid-1", "option-uuid-2"] }

// multi_choice with "Other" checked
{ "type": "multi_choice", "values": ["option-uuid-1", "other"], "other_text": "Custom value" }

// likert (integer 1–5)
{ "type": "likert", "value": 4 }

// ranking (array of option IDs; index 0 = rank 1 = highest priority)
{ "type": "ranking", "order": ["option-uuid-3", "option-uuid-1", "option-uuid-2"] }

// free_text_short (max 500 chars)
{ "type": "free_text_short", "value": "Brief answer" }

// free_text_long (max 2000 chars)
{ "type": "free_text_long", "value": "Extended open-ended response..." }
```

### 3.4 Seed Data — v1 Sections

```sql
INSERT INTO sections (id, title, description, is_mandatory, display_order) VALUES
  ('general_dp_alignment',     'General DP Alignment',
   'Core Developer Platform alignment questions',            TRUE,  1),
  ('current_status',           'Current Status',
   'Team current tooling and adoption status',               TRUE,  2),
  ('platform_needs',           'Platform Needs & Capability Requirements',
   'Platform-specific capability requirements',              FALSE, 3),
  ('tool_evaluation',          'Tool Evaluation Criteria',
   'Criteria for evaluating DP tools',                       FALSE, 4),
  ('integration_requirements', 'Integration & Ecosystem Requirements',
   'Integration and ecosystem requirements',                 FALSE, 5),
  ('adoption_readiness',       'Adoption Readiness & Constraints',
   'Readiness and blockers for adoption',                    FALSE, 6),
  ('governance_compliance',    'Governance & Compliance Requirements',
   'Governance and compliance needs',                        FALSE, 7),
  ('feedback_adaptability',    'Feedback & Adaptability',
   'Open feedback and adaptability questions',               TRUE,  8);
```

### 3.5 Seed Data — v1 Section Routing

```sql
-- Program/Project: mandatory + platform_needs, tool_evaluation
INSERT INTO section_routing (team_type, section_id, display_order) VALUES
  ('program_project', 'general_dp_alignment',     1),
  ('program_project', 'current_status',           2),
  ('program_project', 'platform_needs',           3),
  ('program_project', 'tool_evaluation',          4),
  ('program_project', 'feedback_adaptability',    5);

-- Platform Engineering: mandatory + platform_needs, tool_evaluation, integration_requirements, adoption_readiness
INSERT INTO section_routing (team_type, section_id, display_order) VALUES
  ('platform_engineering', 'general_dp_alignment',     1),
  ('platform_engineering', 'current_status',           2),
  ('platform_engineering', 'platform_needs',           3),
  ('platform_engineering', 'tool_evaluation',          4),
  ('platform_engineering', 'integration_requirements', 5),
  ('platform_engineering', 'adoption_readiness',       6),
  ('platform_engineering', 'feedback_adaptability',    7);

-- Infrastructure/Cloud: mandatory + integration_requirements, adoption_readiness, tool_evaluation
INSERT INTO section_routing (team_type, section_id, display_order) VALUES
  ('infrastructure_cloud', 'general_dp_alignment',     1),
  ('infrastructure_cloud', 'current_status',           2),
  ('infrastructure_cloud', 'integration_requirements', 3),
  ('infrastructure_cloud', 'adoption_readiness',       4),
  ('infrastructure_cloud', 'tool_evaluation',          5),
  ('infrastructure_cloud', 'feedback_adaptability',    6);

-- Data/API Governance: mandatory + governance_compliance, platform_needs, integration_requirements
INSERT INTO section_routing (team_type, section_id, display_order) VALUES
  ('data_api_governance', 'general_dp_alignment',     1),
  ('data_api_governance', 'current_status',           2),
  ('data_api_governance', 'governance_compliance',    3),
  ('data_api_governance', 'platform_needs',           4),
  ('data_api_governance', 'integration_requirements', 5),
  ('data_api_governance', 'feedback_adaptability',    6);
```

---
---

## 4. API Design

### 4.1 API Conventions

- **Base URL:** `/api`
- **Auth:** `Authorization: Bearer {JWT}` required on all endpoints except `POST /api/sessions` and `POST /api/auth/login`.
- **Content-Type:** `application/json` for all requests and responses (except CSV export: `text/csv`).
- **Error envelope:**
  ```json
  { "error": { "code": "SCREAMING_SNAKE_CASE", "message": "Human-readable description" } }
  ```
- **Timestamps:** ISO 8601 / UTC (e.g. `"2026-07-17T14:34:22Z"`).
- **Pagination:** `page` (1-based), `pageSize` (default 25, max 100), `total` in response.

---

### 4.2 TypeScript Interfaces

```typescript
// ─── Shared Enums ─────────────────────────────────────────────────────────────

export type TeamType =
  | 'program_project'
  | 'platform_engineering'
  | 'infrastructure_cloud'
  | 'data_api_governance';

export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'likert'
  | 'ranking'
  | 'free_text_short'
  | 'free_text_long';

export type SubmissionStatus = 'draft' | 'submitted';
export type UserRole = 'respondent' | 'system_owner';
export type AssessmentStatus = 'upcoming' | 'active' | 'closed';

// ─── Answer Payloads ──────────────────────────────────────────────────────────

export interface SingleChoicePayload {
  type: 'single_choice';
  value: string;           // option UUID or 'other'
  other_text?: string;     // required when value === 'other'
}

export interface MultiChoicePayload {
  type: 'multi_choice';
  values: string[];        // array of option UUIDs, may include 'other'
  other_text?: string;     // required when 'other' is in values
}

export interface LikertPayload {
  type: 'likert';
  value: 1 | 2 | 3 | 4 | 5;
}

export interface RankingPayload {
  type: 'ranking';
  order: string[];         // option UUIDs in ranked order; index 0 = rank 1
}

export interface FreeTextShortPayload {
  type: 'free_text_short';
  value: string;           // max 500 chars
}

export interface FreeTextLongPayload {
  type: 'free_text_long';
  value: string;           // max 2000 chars
}

export type AnswerPayload =
  | SingleChoicePayload
  | MultiChoicePayload
  | LikertPayload
  | RankingPayload
  | FreeTextShortPayload
  | FreeTextLongPayload;

// ─── Session & Respondent ─────────────────────────────────────────────────────

export interface SessionResponse {
  session_id: string;
  token: string;
  role: UserRole;
  is_returning: boolean;
  submission_status: SubmissionStatus;
  current_section_index: number;
  section_ids_ordered: string[];
  saved_responses: SavedResponse[];
  is_closed: boolean;
  due_date: string;        // ISO 8601
}

export interface SavedResponse {
  question_id: string;
  answer_payload: AnswerPayload;
}

// ─── Sections & Questions ─────────────────────────────────────────────────────

export interface SectionSummary {
  section_id: string;
  title: string;
  description: string | null;
  is_mandatory: boolean;
  display_order: number;
  question_count: number;
}

export interface QuestionOption {
  option_id: string;
  option_text: string;
  display_order: number;
  is_other: boolean;
}

export interface Question {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  has_other: boolean;
  display_order: number;
  help_text: string | null;
  options: QuestionOption[];  // empty for likert / free_text types
}

export interface SectionWithQuestions {
  section_id: string;
  title: string;
  questions: Question[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface ResponseListItem {
  session_id: string;
  respondent_name: string;
  respondent_email: string;
  team_type: TeamType;
  submission_status: SubmissionStatus;
  submitted_at: string | null;
  last_modified_at: string;
}

export interface PaginatedResponseList {
  total: number;
  page: number;
  pageSize: number;
  data: ResponseListItem[];
}

export interface ResponseDetail {
  session_id: string;
  respondent_name: string;
  respondent_email: string;
  team_type: TeamType;
  submission_status: SubmissionStatus;
  submitted_at: string | null;
  sections: Array<{
    section_id: string;
    title: string;
    answers: Array<{
      question_id: string;
      question_text: string;
      question_type: QuestionType;
      answer_payload: AnswerPayload | null;
    }>;
  }>;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  response_counts_by_team_type: Record<TeamType, number>;
  likert_distributions: Array<{
    question_id: string;
    question_text: string;
    distribution: { '1': number; '2': number; '3': number; '4': number; '5': number };
  }>;
  ranking_top_items: Array<{
    question_id: string;
    question_text: string;
    ranked_items: Array<{ option_text: string; average_rank: number }>;
  }>;
  choice_breakdowns: Array<{
    question_id: string;
    question_text: string;
    counts: Array<{ option_text: string; count: number; percentage: number }>;
  }>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface AssessmentConfig {
  due_date: string;
  launch_date: string;
  status: AssessmentStatus;
  last_modified_at: string;
  last_modified_by: string | null;
}
```

---

### 4.3 Endpoint Reference

#### `POST /api/auth/login` — Dashboard Login

| Field | Value |
|-------|-------|
| Auth | None |
| Role | Any authenticated user (dashboard JWT issued to any valid email) |

**Request body:**
```json
{ "email": "user@example.com", "name": "Jane Smith" }
```
**Response 200:** `{ token, role: "system_owner", email, expires_at }`  
**Behavior:** Any valid email is accepted. No allowlist check is performed.  
**Errors:** `400 INVALID_EMAIL_FORMAT`

---

#### `POST /api/sessions` — Create or Resume Session

| Field | Value |
|-------|-------|
| Auth | None |
| Role | Respondent |

**Request body:**
```json
{ "email": "respondent@example.com", "name": "Alex Johnson", "team_type": "platform_engineering" }
```
**Response 200:** `SessionResponse`  
**Behavior:** Upsert — returns existing session if email matches; creates new session otherwise.  
**Errors:** `400 INVALID_EMAIL_FORMAT`, `400 INVALID_NAME`, `400 INVALID_TEAM_TYPE`, `403 SYSTEM_OWNER_CANNOT_RESPOND`, `500 SESSION_CREATE_FAILED`

---

#### `GET /api/sessions/:sessionId` — Load Session

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent (own session) |

**Response 200:** `SessionResponse`  
**Errors:** `401 AUTH_REQUIRED`, `403 SESSION_ACCESS_DENIED`, `404 SESSION_NOT_FOUND`

---

#### `GET /api/sections?teamType={teamType}` — Section List

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent |

**Query params:** `teamType` (required)  
**Response 200:** `{ sections: SectionSummary[] }`  
**Errors:** `400 INVALID_TEAM_TYPE`, `500 SECTION_ROUTING_EMPTY`, `500 SECTION_LIMIT_EXCEEDED`

---

#### `GET /api/sections/:sectionId/questions` — Questions for Section

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Any authenticated |

**Response 200:** `SectionWithQuestions`  
**Errors:** `401 AUTH_REQUIRED`, `404 SECTION_NOT_FOUND`

---

#### `PUT /api/responses/:sessionId` — Auto-Save Responses

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent (own session) |

**Request body:**
```json
{
  "section_id": "platform_needs",
  "current_section_index": 3,
  "responses": [
    { "question_id": "string-min-1", "answer_payload": { "type": "likert", "value": 4 } }
  ]
}
```
> **Note:** `question_id` is validated as `string (min length 1)`, not strict UUID format. The seed data uses deterministic non-RFC-UUID identifiers.

**Response 200:** `{ saved: true, last_saved_at: "ISO8601" }`  
**Behavior:** Upsert on `(session_id, question_id)`. Empty `responses` array is valid.  
**Retry:** Client retries 3× on failure with exponential backoff (1s, 2s, 4s).  
**Errors:** `400 INVALID_ANSWER_PAYLOAD`, `401 AUTH_REQUIRED`, `403 ASSESSMENT_CLOSED`, `403 SESSION_ACCESS_DENIED`, `404 SESSION_NOT_FOUND`, `500 SAVE_FAILED`

---

#### `POST /api/submissions/:sessionId` — Finalize Submission

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent (own session) |

**Request body:** `{}` (empty; data already saved via auto-save)  
**Response 200:**
```json
{ "submitted": true, "submitted_at": "ISO8601", "due_date": "ISO8601", "edit_window_open": true }
```
**Behavior:** Transitions `draft → submitted`. Re-submitting within edit window is a no-op (updates `last_modified_at`).  
**Errors:** `400 MANDATORY_QUESTIONS_INCOMPLETE`, `401 AUTH_REQUIRED`, `403 ASSESSMENT_CLOSED`, `403 SESSION_ACCESS_DENIED`, `403 SYSTEM_OWNER_CANNOT_SUBMIT`, `404 SESSION_NOT_FOUND`, `500 SUBMISSION_FAILED`

---

#### `GET /api/dashboard/responses` — Paginated Response List

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `pageSize` | integer | 25 | Max 100 |
| `sortBy` | string | `submitted_at` | Sort column |
| `sortDir` | `asc`\|`desc` | `desc` | Sort direction |
| `teamType` | string (multi) | — | Filter by team type |
| `status` | `all`\|`submitted`\|`draft` | `all` | Completion status filter |
| `submittedAfter` | ISO date | — | Inclusive date filter |
| `submittedBefore` | ISO date | — | Inclusive date filter |
| `search` | string | — | Partial name or email match |

**Response 200:** `PaginatedResponseList`  
**Errors:** `400 INVALID_DATE_RANGE`, `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`

---

#### `GET /api/dashboard/responses/:sessionId` — Individual Response

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Response 200:** `ResponseDetail`  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `404 RESPONSE_NOT_FOUND`

---

#### `GET /api/dashboard/analytics` — Analytics Data

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Query params:** `teamType` (optional, multi-select)  
**Response 200:** `AnalyticsData`  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 ANALYTICS_ERROR`

---

#### `GET /api/dashboard/export/csv` — CSV Export

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |
| Response type | `text/csv` |

**Query params:** Same as `GET /api/dashboard/responses` (filters applied to export).  
**Response headers:** `Content-Disposition: attachment; filename="assessment-responses-YYYY-MM-DD.csv"`  
**Columns:** `respondent_name`, `respondent_email`, `team_type`, `submission_status`, `submitted_at`, `last_modified_at`, then one column per question (by question ID / title).  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 EXPORT_FAILED`

---

#### `GET /api/config` — Assessment Configuration

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Response 200:** `AssessmentConfig`  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 CONFIG_NOT_FOUND`

---

#### `PATCH /api/config` — Update Due Date

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Request body:** `{ "due_date": "2026-08-07T23:59:59Z" }`  
**Response 200:** `AssessmentConfig` (updated)  
**Side effect:** Writes a row to `config_audit_log`.  
**Errors:** `400 INVALID_DATE_FORMAT`, `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 CONFIG_UPDATE_FAILED`

---

#### `POST /api/notifications/email` — Submission Confirmation Email *(v1 stretch)*

| Field | Value |
|-------|-------|
| Auth | Internal server-to-server only |
| Role | Internal |

**Request body:** `{ session_id, email, name, due_date }`  
**Response 200:** `{ sent: true }`  
**Behavior:** Fire-and-forget. Failure logged; never surfaces to respondent. No-op if `EMAIL_RELAY_URL` env var is not set.  
**Errors:** `500 EMAIL_SEND_FAILED` (logged only)

---
---

## 5. Security Architecture

### 5.1 Authentication

AssessmentForm-Express uses **email-identity + JWT** authentication. There is no password, SSO, or OAuth in v1.

**Respondent flow:**
1. Respondent submits email + name + team_type to `POST /api/sessions`.
2. Server looks up email in `respondents` table (case-insensitive). Creates or loads the session.
3. Server checks email against `system_owner_emails` (case-insensitive): no match → `role = "respondent"`.
4. Server signs a JWT with secret `JWT_SECRET` (HS256):
   ```json
   { "session_id": "uuid", "email": "user@example.com", "role": "respondent", "iat": 1752758400, "exp": 1752844800 }
   ```
   - Token expiry: **24 hours** (covers multi-day resume without re-login).
5. JWT returned to client; stored in `localStorage`.

**Dashboard User flow:**
1. User submits email + name to `POST /api/auth/login`.
2. Any valid email is accepted — no allowlist check is performed.
3. Server issues JWT with `role = "system_owner"`, expiry **8 hours**.
4. Client stores JWT; attaches as `Authorization: Bearer {token}` on all dashboard requests.

**JWT verification (all protected routes):**
- Signature verified with `JWT_SECRET`; tampered tokens → `401 TOKEN_INVALID`.
- Expiry checked; expired tokens → `401 TOKEN_EXPIRED`.
- `role` claim must be `"respondent"` or `"system_owner"`; any other value → `401 TOKEN_INVALID`.

### 5.2 Authorization Model

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Authorization Matrix                                │
├─────────────────────────────────────────┬────────────────┬────────────────┤
│ Resource                                │ Respondent     │ System Owner   │
├─────────────────────────────────────────┼────────────────┼────────────────┤
│ POST /api/sessions                      │ ✓ (no auth)    │ ✗ (blocked)    │
│ POST /api/auth/login                    │ ✗ (blocked)    │ ✓ (no auth)    │
│ GET /api/sessions/:id (own session)     │ ✓              │ ✓              │
│ GET /api/sessions/:id (other session)   │ ✗ 403          │ ✓              │
│ GET /api/sections?teamType=...          │ ✓              │ ✓              │
│ GET /api/sections/:id/questions         │ ✓              │ ✓              │
│ PUT /api/responses/:sessionId           │ ✓ (own session)│ ✗ 403          │
│ POST /api/submissions/:sessionId        │ ✓ (own session)│ ✗ 403          │
│ GET /api/dashboard/responses            │ ✗ 403          │ ✓              │
│ GET /api/dashboard/responses/:sessionId │ ✗ 403          │ ✓              │
│ GET /api/dashboard/analytics            │ ✗ 403          │ ✓              │
│ GET /api/dashboard/export/csv           │ ✗ 403          │ ✓              │
│ GET /api/config                         │ ✗ 403          │ ✓              │
│ PATCH /api/config                       │ ✗ 403          │ ✓              │
└─────────────────────────────────────────┴────────────────┴────────────────┘
```

**Data isolation enforcement (respondent sessions):**
- Every request to `/api/sessions/:id`, `/api/responses/:id`, `/api/submissions/:id` verifies that the `session_id` path param's `respondent_id` matches the email in the JWT.
- Mismatch returns `403 SESSION_ACCESS_DENIED` — respondents cannot access, modify, or submit other respondents' sessions.

**System Owner restrictions:**
- `POST /api/sessions` rejects System Owner emails with `403 SYSTEM_OWNER_CANNOT_RESPOND`.
- `POST /api/submissions/:id` rejects if `role === "system_owner"` with `403 SYSTEM_OWNER_CANNOT_SUBMIT`.

### 5.3 Data Protection

| Category | Mechanism |
|----------|-----------|
| **Data in transit** | HTTPS enforced via enterprise reverse proxy (TLS 1.2+). App server runs HTTP internally; TLS termination at the network edge. |
| **Data at rest** | PostgreSQL database disk encryption handled by enterprise infrastructure team. |
| **JWT secret** | `JWT_SECRET` injected via environment variable; never committed to source control; 256-bit minimum entropy. |
| **SQL injection** | All database queries use parameterized statements (no string concatenation). Drizzle ORM enforces this. |
| **JSONB payload validation** | Server-side schema validation on every `answer_payload` before persistence; type mismatch returns `400 INVALID_ANSWER_PAYLOAD`. |
| **Input sanitization** | All user-provided strings trimmed and length-bounded server-side; no HTML rendered from user input (React's JSX escaping prevents XSS). |
| **Email case-insensitive matching** | `LOWER(email)` index enforced at DB level prevents case-variation duplicate abuse. |
| **Audit trail** | `config_audit_log` records every `assessment_config` change with timestamp and System Owner email. |
| **Session token storage** | Client stores JWT in `localStorage`; acceptable for an internal enterprise tool. For higher-security deployments, `httpOnly` cookie storage is a drop-in alternative. |

### 5.4 Due Date Enforcement

Due-date checks are **server-side only** — the client may display the due date, but access control decisions are never delegated to the client.

- Every `PUT /api/responses/:sessionId` request checks `assessment_config.due_date > NOW()` before persisting.
- Every `POST /api/submissions/:sessionId` performs the same check.
- Every `GET /api/sessions/:sessionId` response includes `is_closed: boolean` derived from the server-side due-date comparison.
- The `assessmentOpenGuard` middleware (see §2.4) handles this check centrally.

### 5.5 Security Non-Goals (v1)

The following are explicitly out of scope for v1:
- Rate limiting / brute-force protection on `POST /api/sessions` (no password to brute-force).
- CSRF protection (no cookie-based session; JWT in `Authorization` header is CSRF-safe by design).
- Content Security Policy headers beyond default Next.js headers.
- Penetration testing / formal security audit (deferred to pre-launch hardening if required).

---
---

## 6. Technology Stack

### 6.1 Stack Table

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend framework** | React | 19.2.7 | Component model for SPA |
| **Full-stack framework** | Next.js (App Router) | 16.2.10 | SPA shell + API Routes co-located |
| **Language** | TypeScript | 6.0.3 | Type safety across frontend and backend |
| **Styling** | Tailwind CSS | 4.3.3 | Utility-first CSS; WCAG 2.1 AA compliant primitives |
| **Charts** | Recharts | 3.9.2 | React-native analytics charts (bar, pie, stacked bar) |
| **Drag-and-drop** | dnd-kit | 6.x | Ranking question drag-and-drop; accessible, keyboard-navigable |
| **Database** | PostgreSQL | 16 | Platform-provisioned shared DB; schema: `assessmentform` |
| **ORM / Query builder** | Drizzle ORM | 0.45.2 | Typesafe SQL queries; parameterized; lightweight |
| **JWT** | jose | 6.2.3 | JWT sign/verify (HS256); 24h respondent / 8h system_owner |
| **Validation (shared)** | Zod | 4.4.3 | Runtime schema validation for API payloads (server + client) |
| **HTTP client** | Native `fetch` | — | Browser fetch API; no additional HTTP lib needed |
| **CSV generation** | csv-stringify | 6.8.1 | Streaming CSV serialization for export endpoint |
| **Runtime** | Node.js | 20 LTS | Application server runtime |
| **Container** | Docker | 24.x+ | Single container packaging for enterprise deployment |
| **Package manager** | npm | — | Standard Node.js package management |

### 6.2 Key Dependency Rationale

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router (not Pages Router)** | App Router supports React Server Components and co-located API handlers; reduces boilerplate; easier streaming response for CSV export. |
| **Drizzle ORM (not Prisma)** | Drizzle generates minimal runtime overhead; schema lives in TypeScript; no heavy binary client; easier to use raw SQL when needed for analytics GROUP BY queries. |
| **jose (not jsonwebtoken)** | `jose` is Edge Runtime compatible, needed for Next.js middleware JWT verification. `jsonwebtoken` uses Node.js crypto, incompatible with Edge. |
| **dnd-kit (not react-beautiful-dnd)** | `react-beautiful-dnd` is unmaintained. `dnd-kit` is actively maintained, accessible, and supports both pointer and keyboard interactions (required by WCAG 2.1 AA). |
| **Zod (not Yup)** | Zod inference integrates cleanly with TypeScript; schemas can be shared between client validation and server-side API validation without duplication. |
| **Recharts (not Chart.js)** | Recharts is React-native (no imperative canvas management); composable; integrates naturally with React state for filtered views. |

### 6.3 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | PostgreSQL connection string with schema isolation: `postgres://user:pass@pivota-spec-driven-primary.prod.svc:5432/db?options=-csearch_path%3Dassessmentform%2Cpublic` |
| `JWT_SECRET` | ✓ | HS256 signing secret (min 256-bit entropy; random string) |
| `EMAIL_RELAY_URL` | Optional | SMTP relay or internal email service URL; stretch goal |
| `EMAIL_FROM_ADDRESS` | Optional | Sender address for confirmation emails; required if `EMAIL_RELAY_URL` is set |
| `NODE_ENV` | ✓ | `production` \| `development` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | ✓ | Set to `0` at process level (exported in `server.js` before Next.js starts, not in `.env.local`) to allow self-signed TLS certs on platform-internal DB connections |

---
---

## 7. Integration Points

### 7.1 Integration Summary

AssessmentForm-Express v1 is designed to minimize external dependencies. All core functionality is self-contained within the Next.js application and PostgreSQL database. The only external integration is an optional email relay for submission confirmation.

| ID | Integration | Type | Status |
|----|-------------|------|--------|
| INT-01 | Enterprise Email Relay (SMTP) | Outbound HTTP / SMTP | Optional stretch goal |
| INT-02 | Enterprise Deployment Infrastructure | Deployment | Required |
| INT-03 | SSO / OAuth | — | Explicitly out of scope for v1 |
| INT-04 | AI/ML Analysis | — | Explicitly out of scope for v1 |

---

### 7.2 INT-01: Email Relay (Stretch Goal)

**Purpose:** Send submission confirmation emails to respondents upon successful assessment submission (F09).

**Trigger:** Successful `POST /api/submissions/:sessionId` (HTTP 200 response).

**Flow:**
```
Next.js Server
    │
    │ POST /api/submissions/:sessionId → success
    │
    ▼
emailService.ts  ──────────────►  Enterprise Email Relay
    │              (fire-and-forget   (SMTP / internal HTTP)
    │               async call)
    │
    ▼
Failure: LOG only — does not block submission response to respondent
```

**Configuration:**
- `EMAIL_RELAY_URL` — relay endpoint or SMTP host. Feature disabled if unset (graceful no-op).
- `EMAIL_FROM_ADDRESS` — sender address (e.g. `noreply@enterprise.com`).

**Email content:**
- Subject: `"Assessment Submitted — Developer Platform Evaluation"`
- Body: Plain-text with respondent name and due date (HTML optional).

**Error handling:** `EMAIL_SEND_FAILED` logged server-side. No retry. No respondent-facing error. Submission is confirmed regardless of email delivery.

**Out of scope:** Two-way email tracking, delivery receipts, template management via dashboard.

---

### 7.3 INT-02: Enterprise Deployment Infrastructure

**Purpose:** Host the SPA and backend API within the enterprise internal network.

**Deployment artifact:** Single Docker container image.

**Runtime requirements:**
- Node.js 20 LTS (provided by base image `node:20-alpine`).
- PostgreSQL 16 shared DB at `pivota-spec-driven-primary.prod.svc:5432` reachable via `DATABASE_URL`.
- Port 4000 exposed internally; TLS termination handled by enterprise reverse proxy.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` exported at process level to allow platform-internal TLS connections.

**Network requirements:**
- All traffic is internal; no public internet exposure required.
- PostgreSQL accessible from the container on port 5432.
- Optional: Email relay accessible from the container if `EMAIL_RELAY_URL` is configured.

**Configuration injection:** All environment variables injected at container startup (not baked into image).

---

### 7.4 INT-03: No SSO in v1 (Explicit Non-Integration)

Email + name identity is used in lieu of enterprise SSO (Azure AD, Okta, Google Workspace, etc.). This eliminates SSO configuration dependencies for the initial rollout.

**Future migration path:** The `respondents` table can be extended with `sso_provider TEXT` and `external_user_id TEXT` columns. `POST /api/sessions` would be augmented with an OIDC callback endpoint. The JWT role model is unchanged — `role` claim would still be determined by `system_owner_emails` lookup.

---

### 7.5 INT-04: No AI/ML in v1 (Explicit Non-Integration)

All analytics are computed via standard PostgreSQL aggregations (`GROUP BY`, `AVG`, `COUNT`). No external AI/ML APIs, LLM inference, or embedding pipelines are used.

**Future migration path:** The `responses.answer_payload` JSONB column's structured format supports analytical overlays without schema changes. A post-submission enrichment job could add an `analysis_payload JSONB` column to `responses` and populate it asynchronously.

---
