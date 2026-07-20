---
phase: 01-database
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - drizzle/schema.ts
  - drizzle/seed.ts
  - drizzle/migrate.ts
  - drizzle.config.ts
  - package.json
  - .env.example
autonomous: true

features:
  implements: ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"]
  depends_on: []
  enables: ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"]

must_haves:
  truths:
    - "All 10 tables exist in PostgreSQL with correct columns, types, and constraints"
    - "Unique indexes on respondents.email and system_owner_emails.email use LOWER() for case-insensitive matching"
    - "assessment_config singleton is enforced via CHECK (id = 1)"
    - "section_routing has UNIQUE(team_type, section_id) constraint"
    - "responses has UNIQUE(session_id, question_id) for upsert semantics"
    - "All 8 v1 sections are seeded with correct is_mandatory flags and display_order"
    - "All 4 team-type routing configurations are seeded with correct section order"
    - "Database connection via DATABASE_URL environment variable uses Drizzle ORM"
  artifacts:
    - path: "drizzle/schema.ts"
      provides: "Drizzle ORM schema definitions for all 10 tables"
      exports: ["systemOwnerEmails", "respondents", "sessions", "sections", "sectionRouting", "questions", "questionOptions", "responses", "assessmentConfig", "configAuditLog"]
    - path: "drizzle/seed.ts"
      provides: "Seed script for sections and section_routing v1 data"
      contains: "general_dp_alignment"
    - path: "drizzle/migrate.ts"
      provides: "Migration runner using drizzle-kit push or migrate"
      contains: "migrate"
    - path: "drizzle.config.ts"
      provides: "Drizzle config pointing at DATABASE_URL"
  key_links:
    - from: "drizzle/schema.ts"
      to: "PostgreSQL"
      via: "drizzle-orm/node-postgres"
      pattern: "pgTable"
    - from: "drizzle/seed.ts"
      to: "drizzle/schema.ts"
      via: "db.insert(sections)"
      pattern: "db\\.insert"
    - from: "drizzle/migrate.ts"
      to: "DATABASE_URL"
      via: "drizzle + pg Pool"
      pattern: "DATABASE_URL"

integration_contracts:
  requires: []
  provides:
    - artifact: "drizzle/schema.ts"
      exports:
        - systemOwnerEmails
        - respondents
        - sessions
        - sections
        - sectionRouting
        - questions
        - questionOptions
        - responses
        - assessmentConfig
        - configAuditLog
      shape: |
        export const systemOwnerEmails = pgTable('system_owner_emails', { id: uuid, email: text UNIQUE, added_at: timestamptz, added_by: text, is_active: boolean })
        export const respondents = pgTable('respondents', { id: uuid, email: text UNIQUE, name: text, team_type: text CHECK IN (4 values), created_at: timestamptz })
        export const sessions = pgTable('sessions', { id: uuid, respondent_id: uuid FK respondents, submission_status: text CHECK('draft','submitted'), current_section_index: integer, section_ids_ordered: jsonb, submitted_at: timestamptz, last_saved_at: timestamptz, last_modified_at: timestamptz, created_at: timestamptz })
        export const sections = pgTable('sections', { id: text PK, title: text, description: text, is_mandatory: boolean, display_order: integer, created_at: timestamptz })
        export const sectionRouting = pgTable('section_routing', { id: uuid, team_type: text CHECK IN (4 values), section_id: text FK sections, display_order: integer, is_included: boolean }, UNIQUE(team_type, section_id))
        export const questions = pgTable('questions', { id: uuid, section_id: text FK sections, question_text: text, question_type: text CHECK IN (6 values), is_required: boolean, has_other: boolean, display_order: integer, help_text: text, created_at: timestamptz })
        export const questionOptions = pgTable('question_options', { id: uuid, question_id: uuid FK questions, option_text: text, display_order: integer, is_other: boolean, created_at: timestamptz }, UNIQUE(question_id, display_order))
        export const responses = pgTable('responses', { id: uuid, session_id: uuid FK sessions, question_id: uuid FK questions, answer_payload: jsonb, saved_at: timestamptz }, UNIQUE(session_id, question_id))
        export const assessmentConfig = pgTable('assessment_config', { id: integer PK CHECK(id=1), due_date: timestamptz, launch_date: timestamptz, created_at: timestamptz, last_modified_at: timestamptz, last_modified_by: text })
        export const configAuditLog = pgTable('config_audit_log', { id: uuid, changed_at: timestamptz, changed_by: text, field_changed: text, old_value: text, new_value: text })
      verify: "grep -n 'export const systemOwnerEmails' drizzle/schema.ts && grep -n 'export const assessmentConfig' drizzle/schema.ts && grep -n 'export const responses' drizzle/schema.ts && echo CONTRACT_OK"
    - artifact: "drizzle/seed.ts"
      exports: ["seedDatabase"]
      shape: "async function seedDatabase() — inserts 8 sections and 4x team-type routing rows"
      verify: "grep -n 'general_dp_alignment' drizzle/seed.ts && grep -n 'feedback_adaptability' drizzle/seed.ts && echo CONTRACT_OK"
---

<objective>
Create the full PostgreSQL database schema for all 10 tables used by AssessmentForm-Express, using Drizzle ORM with exact DDL from TechArch §3.2. Includes all constraints, indexes, and v1 seed data for sections and section routing.

Purpose: Provides the complete data foundation that every backend service in waves 2a–2d depends on. No backend API can be implemented without these table definitions.
Output: drizzle/schema.ts (all 10 table definitions), drizzle/seed.ts (section + routing seed data), drizzle/migrate.ts (migration runner), drizzle.config.ts, .env.example, and package.json with Drizzle + pg dependencies installed.
</objective>

<feature_dependencies>
Implements: F1: Respondent Identity & Session Management (respondents, sessions tables), F2: Question Types Engine (questions, question_options, responses tables), F3: Team-Type-Specific Section Routing (sections, section_routing tables + seed data), F4: Auto-Save & Progress Persistence (responses table, sessions.last_saved_at), F5: Duplicate Prevention & Edit Window (UNIQUE email constraints, assessment_config.due_date), F6: System Owner Dashboard (all tables read by dashboard API), F7: Role-Based Access Control (system_owner_emails table), F8: Assessment Configuration Management (assessment_config, config_audit_log tables)
Depends on: None
Enables: All backend waves (2a–2d) and frontend waves (3a–3c) depend on this schema
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@project_specs/TechArch-AssessmentForm.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Initialize Next.js project with Drizzle ORM and PostgreSQL dependencies</name>
  <files>
    package.json
    drizzle.config.ts
    .env.example
    src/lib/db.ts
  </files>
  <action>
Initialize a Next.js 14+ App Router project (if not already initialized) and install all required dependencies. Then configure Drizzle ORM for PostgreSQL.

**Step 1 — Initialize Next.js project (if no package.json exists yet):**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```
If package.json already exists (project was started), skip this and proceed to dependency installation.

**Step 2 — Install database and ORM dependencies:**
```bash
npm install drizzle-orm pg
npm install --save-dev drizzle-kit @types/pg tsx dotenv
```

Also install other Wave 1–4 dependencies now to avoid repeated installs:
```bash
npm install jose zod csv-stringify
npm install --save-dev @types/csv-stringify
```

For ranking question drag-and-drop (wave 3a):
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities recharts
```

**Step 3 — Create `drizzle.config.ts` at project root:**
```typescript
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Step 4 — Create `src/lib/db.ts` — Drizzle + pg Pool singleton:**
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../drizzle/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // TechArch §1: Connection pool max 20
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
```

**Step 5 — Create `.env.example`:**
```bash
# Database (required)
DATABASE_URL=postgres://user:password@localhost:5432/assessmentform

# JWT (required — use a 256-bit random value)
JWT_SECRET=change-me-to-a-cryptographically-random-256-bit-value

# Auto-save idle timer in seconds (optional, default 30)
AUTO_SAVE_IDLE_SECONDS=30

# Email relay (optional — omit to disable email notifications)
EMAIL_RELAY_URL=
EMAIL_FROM_ADDRESS=
```

**Step 6 — Add scripts to package.json:**
Add under `"scripts"`:
```json
"db:generate": "drizzle-kit generate:pg",
"db:push": "drizzle-kit push:pg",
"db:migrate": "tsx drizzle/migrate.ts",
"db:seed": "tsx drizzle/seed.ts",
"db:studio": "drizzle-kit studio"
```

**Step 7 — Update `next.config.js` / `next.config.ts` to bind dev server to 0.0.0.0 on port 3000:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pivota Preview: do NOT set X-Frame-Options: DENY
  // Allow embedding in iframe for Pivota Preview
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Explicitly allow framing (Pivota Preview uses iframe)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

Update the `dev` script in package.json to bind to 0.0.0.0:
```json
"dev": "next dev -H 0.0.0.0 -p 3000"
```
  </action>
  <verify>
```bash
node -e "require('./drizzle.config.ts')" 2>/dev/null || npx tsx -e "import('./drizzle.config.ts').then(m => console.log('config ok', !!m.default))"
ls node_modules/drizzle-orm && ls node_modules/pg && echo "DEPS OK"
grep -n "DATABASE_URL" .env.example && echo "ENV OK"
grep -n "0.0.0.0" package.json && echo "BIND OK"
```
  </verify>
  <done>
- package.json has drizzle-orm, pg, drizzle-kit, tsx, jose, zod, recharts, @dnd-kit/* installed
- drizzle.config.ts exists pointing schema at ./drizzle/schema.ts and driver 'pg'
- src/lib/db.ts exports `db` singleton with Pool max 20
- .env.example documents all required env vars (DATABASE_URL, JWT_SECRET, AUTO_SAVE_IDLE_SECONDS, EMAIL_RELAY_URL, EMAIL_FROM_ADDRESS)
- package.json dev script binds to 0.0.0.0:3000
- next.config sets X-Frame-Options: SAMEORIGIN (not DENY) so Pivota Preview iframe works
  </done>
</task>

<task type="auto">
  <name>Task 2: Create Drizzle ORM schema for all 10 tables with exact DDL from TechArch §3.2</name>
  <files>
    drizzle/schema.ts
  </files>
  <action>
Create `drizzle/schema.ts` implementing all 10 tables with EXACT column names, types, constraints, and indexes from TechArch §3.2. Do NOT abstract or rename — downstream services depend on these exact names.

**Create `drizzle/schema.ts`:**

```typescript
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── system_owner_emails ──────────────────────────────────────────────────────
// F7: Role-Based Access Control — pre-configured System Owner emails
// TechArch §3.2: system_owner_emails table
export const systemOwnerEmails = pgTable(
  'system_owner_emails',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    email:      text('email').notNull().unique(),
    added_at:   timestamp('added_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    added_by:   text('added_by'),          // Email of the admin who added this entry
    is_active:  boolean('is_active').notNull().default(true),  // Soft-disable without deletion
  },
  (table) => ({
    // Case-insensitive unique lookup
    // TechArch: CREATE UNIQUE INDEX idx_system_owner_emails_lower ON system_owner_emails (LOWER(email))
    emailLowerIdx: uniqueIndex('idx_system_owner_emails_lower').on(sql`LOWER(${table.email})`),
  })
);

// ─── respondents ──────────────────────────────────────────────────────────────
// F1: Respondent Identity & Session Management
// F5: Duplicate Prevention — UNIQUE email enforces one submission per respondent
// TechArch §3.2: respondents table
export const respondents = pgTable(
  'respondents',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    email:      text('email').notNull().unique(),
    name:       text('name').notNull(),
    team_type:  text('team_type').notNull(),
    // CHECK constraint enforced via raw SQL in migration; Drizzle check() for documentation
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // Case-insensitive unique lookup (resume flow uses LOWER(email) match)
    // TechArch: CREATE UNIQUE INDEX idx_respondents_email_lower ON respondents (LOWER(email))
    emailLowerIdx: uniqueIndex('idx_respondents_email_lower').on(sql`LOWER(${table.email})`),
    // CHECK (team_type IN ('program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance'))
    teamTypeCheck: check('respondents_team_type_check', sql`${table.team_type} IN ('program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance')`),
  })
);

// ─── sessions ─────────────────────────────────────────────────────────────────
// F1: Session persistence across browser close/reopen
// F4: Auto-save — last_saved_at updated on every PUT /api/responses/:sessionId
// F5: Duplicate prevention — submission_status tracks draft → submitted transition
// TechArch §3.2: sessions table
export const sessions = pgTable(
  'sessions',
  {
    id:                    uuid('id').primaryKey().defaultRandom(),
    respondent_id:         uuid('respondent_id').notNull().references(() => respondents.id, { onDelete: 'cascade' }),
    submission_status:     text('submission_status').notNull().default('draft'),
    // CHECK (submission_status IN ('draft', 'submitted'))
    current_section_index: integer('current_section_index').notNull().default(0),
    section_ids_ordered:   jsonb('section_ids_ordered').notNull().default(sql`'[]'::jsonb`),  // Ordered array of section ID strings
    submitted_at:          timestamp('submitted_at', { withTimezone: true, mode: 'string' }),  // NULL until deliberate Submit action
    last_saved_at:         timestamp('last_saved_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    last_modified_at:      timestamp('last_modified_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    created_at:            timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // TechArch: CREATE INDEX idx_sessions_respondent_id ON sessions(respondent_id)
    respondentIdx:     index('idx_sessions_respondent_id').on(table.respondent_id),
    // TechArch: CREATE INDEX idx_sessions_submission_status ON sessions(submission_status)
    statusIdx:         index('idx_sessions_submission_status').on(table.submission_status),
    // TechArch: CREATE INDEX idx_sessions_submitted_at ON sessions(submitted_at)
    submittedAtIdx:    index('idx_sessions_submitted_at').on(table.submitted_at),
    // CHECK (submission_status IN ('draft', 'submitted'))
    statusCheck:       check('sessions_submission_status_check', sql`${table.submission_status} IN ('draft', 'submitted')`),
  })
);

// ─── sections ─────────────────────────────────────────────────────────────────
// F3: Team-Type-Specific Section Routing — section catalogue
// TechArch §3.2: sections table (id is TEXT slug, not UUID)
export const sections = pgTable('sections', {
  id:            text('id').primaryKey(),  // Slug, e.g. 'general_dp_alignment'
  title:         text('title').notNull(),
  description:   text('description'),
  is_mandatory:  boolean('is_mandatory').notNull().default(false),
  display_order: integer('display_order').notNull(),  // Global default display order
  created_at:    timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

// ─── section_routing ─────────────────────────────────────────────────────────
// F3: Config-driven team-type → section mapping
// TechArch §3.2: section_routing table
export const sectionRouting = pgTable(
  'section_routing',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    team_type:     text('team_type').notNull(),
    section_id:    text('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
    display_order: integer('display_order').notNull(),  // Order of this section for this specific team type
    is_included:   boolean('is_included').notNull().default(true),
  },
  (table) => ({
    // TechArch: UNIQUE (team_type, section_id)
    teamSectionUniq: uniqueIndex('section_routing_team_section_uniq').on(table.team_type, table.section_id),
    // TechArch: CREATE INDEX idx_section_routing_team_type ON section_routing(team_type)
    teamTypeIdx:     index('idx_section_routing_team_type').on(table.team_type),
    // CHECK (team_type IN (...))
    teamTypeCheck:   check('section_routing_team_type_check', sql`${table.team_type} IN ('program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance')`),
  })
);

// ─── questions ────────────────────────────────────────────────────────────────
// F2: Question Types Engine — question catalogue per section
// TechArch §3.2: questions table
export const questions = pgTable(
  'questions',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    section_id:    text('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
    question_text: text('question_text').notNull(),
    question_type: text('question_type').notNull(),
    // CHECK (question_type IN ('single_choice','multi_choice','likert','ranking','free_text_short','free_text_long'))
    is_required:   boolean('is_required').notNull().default(true),
    has_other:     boolean('has_other').notNull().default(false),  // Only applicable to single/multi_choice
    display_order: integer('display_order').notNull(),
    help_text:     text('help_text'),  // Optional tooltip / hint
    created_at:    timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // TechArch: CREATE INDEX idx_questions_section_id ON questions(section_id)
    sectionIdx:       index('idx_questions_section_id').on(table.section_id),
    // CHECK (question_type IN ('single_choice','multi_choice','likert','ranking','free_text_short','free_text_long'))
    questionTypeCheck: check('questions_question_type_check', sql`${table.question_type} IN ('single_choice', 'multi_choice', 'likert', 'ranking', 'free_text_short', 'free_text_long')`),
  })
);

// ─── question_options ─────────────────────────────────────────────────────────
// F2: Options for single_choice, multi_choice, and ranking questions
// TechArch §3.2: question_options table
export const questionOptions = pgTable(
  'question_options',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    question_id:   uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    option_text:   text('option_text').notNull(),
    display_order: integer('display_order').notNull(),
    is_other:      boolean('is_other').notNull().default(false),  // TRUE for the special "Other" option
    created_at:    timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // TechArch: UNIQUE (question_id, display_order)
    questionOrderUniq: uniqueIndex('question_options_question_order_uniq').on(table.question_id, table.display_order),
    // TechArch: CREATE INDEX idx_question_options_question_id ON question_options(question_id)
    questionIdx:       index('idx_question_options_question_id').on(table.question_id),
  })
);

// ─── responses ────────────────────────────────────────────────────────────────
// F4: Auto-save persistence — one row per (session, question), upserted on every save
// TechArch §3.2: responses table
// TechArch §3.3: answer_payload JSONB shape — { type: "single_choice"|"multi_choice"|"likert"|"ranking"|"free_text_short"|"free_text_long", ... }
export const responses = pgTable(
  'responses',
  {
    id:             uuid('id').primaryKey().defaultRandom(),
    session_id:     uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    question_id:    uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    answer_payload: jsonb('answer_payload').notNull(),  // Polymorphic payload per TechArch §3.3
    saved_at:       timestamp('saved_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // TechArch: UNIQUE (session_id, question_id) — One answer per question per session; upsert on conflict
    sessionQuestionUniq: uniqueIndex('responses_session_question_uniq').on(table.session_id, table.question_id),
    // TechArch: CREATE INDEX idx_responses_session_id ON responses(session_id)
    sessionIdx:          index('idx_responses_session_id').on(table.session_id),
    // TechArch: CREATE INDEX idx_responses_question_id ON responses(question_id)
    questionIdx:         index('idx_responses_question_id').on(table.question_id),
  })
);

// ─── assessment_config ────────────────────────────────────────────────────────
// F8: Assessment Configuration Management — singleton row (id always = 1)
// TechArch §3.2: assessment_config table
// TechArch: CHECK (id = 1) — Only one assessment at a time in v1
export const assessmentConfig = pgTable('assessment_config', {
  id:               integer('id').primaryKey().default(1),
  // CHECK (id = 1) — enforced via raw SQL; Drizzle does not directly support check on PK
  due_date:         timestamp('due_date', { withTimezone: true, mode: 'string' }).notNull(),
  launch_date:      timestamp('launch_date', { withTimezone: true, mode: 'string' }).notNull(),
  created_at:       timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  last_modified_at: timestamp('last_modified_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  last_modified_by: text('last_modified_by'),  // System Owner email who last changed config
});

// ─── config_audit_log ─────────────────────────────────────────────────────────
// F8: Audit trail — every PATCH /api/config writes a row here
// TechArch §3.2: config_audit_log table
export const configAuditLog = pgTable('config_audit_log', {
  id:            uuid('id').primaryKey().defaultRandom(),
  changed_at:    timestamp('changed_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  changed_by:    text('changed_by').notNull(),  // System Owner email
  field_changed: text('field_changed').notNull(),  // e.g. 'due_date'
  old_value:     text('old_value'),
  new_value:     text('new_value'),
});

// ─── TypeScript type exports for use in services ──────────────────────────────
export type SystemOwnerEmail    = typeof systemOwnerEmails.$inferSelect;
export type NewSystemOwnerEmail = typeof systemOwnerEmails.$inferInsert;
export type Respondent          = typeof respondents.$inferSelect;
export type NewRespondent       = typeof respondents.$inferInsert;
export type Session             = typeof sessions.$inferSelect;
export type NewSession          = typeof sessions.$inferInsert;
export type Section             = typeof sections.$inferSelect;
export type NewSection          = typeof sections.$inferInsert;
export type SectionRouting      = typeof sectionRouting.$inferSelect;
export type NewSectionRouting   = typeof sectionRouting.$inferInsert;
export type Question            = typeof questions.$inferSelect;
export type NewQuestion         = typeof questions.$inferInsert;
export type QuestionOption      = typeof questionOptions.$inferSelect;
export type NewQuestionOption   = typeof questionOptions.$inferInsert;
export type Response            = typeof responses.$inferSelect;
export type NewResponse         = typeof responses.$inferInsert;
export type AssessmentConfig    = typeof assessmentConfig.$inferSelect;
export type NewAssessmentConfig = typeof assessmentConfig.$inferInsert;
export type ConfigAuditLog      = typeof configAuditLog.$inferSelect;
export type NewConfigAuditLog   = typeof configAuditLog.$inferInsert;
```

**CRITICAL: Verify CHECK constraint on assessment_config singleton.** Drizzle's `check()` helper must be added in the table's second argument for the `id = 1` constraint. Add to assessmentConfig table definition:
```typescript
export const assessmentConfig = pgTable(
  'assessment_config',
  {
    id: integer('id').primaryKey().default(1),
    // ... rest of columns
  },
  (table) => ({
    singletonCheck: check('assessment_config_singleton_check', sql`${table.id} = 1`),
  })
);
```

Apply this pattern consistently — update the assessmentConfig definition in schema.ts to include the table extras function.
  </action>
  <verify>
```bash
npx tsx -e "import('./drizzle/schema.ts').then(m => { const tables = Object.keys(m).filter(k => !k.startsWith('type') && typeof m[k] === 'object'); console.log('Tables:', tables.join(', ')); if (tables.length >= 10) console.log('SCHEMA OK — 10+ exports'); else console.error('SCHEMA FAIL — expected 10 table exports, got', tables.length); })" 2>&1
grep -n "idx_respondents_email_lower" drizzle/schema.ts && echo "LOWER EMAIL IDX OK"
grep -n "idx_system_owner_emails_lower" drizzle/schema.ts && echo "LOWER SYSTEM OWNER IDX OK"
grep -n "responses_session_question_uniq" drizzle/schema.ts && echo "RESPONSES UNIQ OK"
grep -n "section_routing_team_section_uniq" drizzle/schema.ts && echo "SECTION ROUTING UNIQ OK"
grep -n "assessment_config_singleton_check" drizzle/schema.ts && echo "SINGLETON CHECK OK"
```
  </verify>
  <done>
- drizzle/schema.ts exports all 10 tables: systemOwnerEmails, respondents, sessions, sections, sectionRouting, questions, questionOptions, responses, assessmentConfig, configAuditLog
- UNIQUE indexes use LOWER() for email fields in systemOwnerEmails and respondents (case-insensitive lookup)
- responses has UNIQUE(session_id, question_id) for upsert semantics
- section_routing has UNIQUE(team_type, section_id)
- assessment_config has CHECK (id = 1) singleton enforcement
- All FK relationships use onDelete: 'cascade' as specified in TechArch §3.2
- TypeScript inference types exported for all 10 tables
  </done>
</task>

<task type="auto">
  <name>Task 3: Create migration runner, seed script (v1 sections + routing), and push schema to PostgreSQL</name>
  <files>
    drizzle/migrate.ts
    drizzle/seed.ts
  </files>
  <action>
Create the migration runner and comprehensive seed script containing the exact v1 section and section_routing data from TechArch §3.4 and §3.5. Then push the schema to the running PostgreSQL instance.

**Step 1 — Create `drizzle/migrate.ts`:**
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.log('Migrations complete.');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Step 2 — Create `drizzle/seed.ts` with EXACT v1 data from TechArch §3.4 (sections) and §3.5 (section_routing):**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sections, sectionRouting, systemOwnerEmails, assessmentConfig } from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Seeding sections...');

  // ── TechArch §3.4: v1 Section Seed Data ─────────────────────────────────────
  // INSERT INTO sections (id, title, description, is_mandatory, display_order)
  // Exact values from TechArch §3.4 — do NOT modify IDs or order
  await db.insert(sections).values([
    {
      id:            'general_dp_alignment',
      title:         'General DP Alignment',
      description:   'Core Developer Platform alignment questions',
      is_mandatory:  true,
      display_order: 1,
    },
    {
      id:            'current_status',
      title:         'Current Status',
      description:   'Team current tooling and adoption status',
      is_mandatory:  true,
      display_order: 2,
    },
    {
      id:            'platform_needs',
      title:         'Platform Needs & Capability Requirements',
      description:   'Platform-specific capability requirements',
      is_mandatory:  false,
      display_order: 3,
    },
    {
      id:            'tool_evaluation',
      title:         'Tool Evaluation Criteria',
      description:   'Criteria for evaluating DP tools',
      is_mandatory:  false,
      display_order: 4,
    },
    {
      id:            'integration_requirements',
      title:         'Integration & Ecosystem Requirements',
      description:   'Integration and ecosystem requirements',
      is_mandatory:  false,
      display_order: 5,
    },
    {
      id:            'adoption_readiness',
      title:         'Adoption Readiness & Constraints',
      description:   'Readiness and blockers for adoption',
      is_mandatory:  false,
      display_order: 6,
    },
    {
      id:            'governance_compliance',
      title:         'Governance & Compliance Requirements',
      description:   'Governance and compliance needs',
      is_mandatory:  false,
      display_order: 7,
    },
    {
      id:            'feedback_adaptability',
      title:         'Feedback & Adaptability',
      description:   'Open feedback and adaptability questions',
      is_mandatory:  true,
      display_order: 8,
    },
  ]).onConflictDoNothing();

  console.log('Sections seeded (8 rows).');
  console.log('Seeding section routing...');

  // ── TechArch §3.5: v1 Section Routing Seed Data ──────────────────────────────
  // Exact values from TechArch §3.5 — display_order per team type matches routing table

  // Program/Project: mandatory + platform_needs, tool_evaluation (5 sections total)
  // general_dp_alignment → current_status → platform_needs → tool_evaluation → feedback_adaptability
  const programProjectRouting = [
    { team_type: 'program_project', section_id: 'general_dp_alignment',  display_order: 1 },
    { team_type: 'program_project', section_id: 'current_status',        display_order: 2 },
    { team_type: 'program_project', section_id: 'platform_needs',        display_order: 3 },
    { team_type: 'program_project', section_id: 'tool_evaluation',       display_order: 4 },
    { team_type: 'program_project', section_id: 'feedback_adaptability', display_order: 5 },
  ];

  // Platform Engineering: mandatory + platform_needs, tool_evaluation, integration_requirements, adoption_readiness (7 sections total)
  // general_dp_alignment → current_status → platform_needs → tool_evaluation → integration_requirements → adoption_readiness → feedback_adaptability
  const platformEngineeringRouting = [
    { team_type: 'platform_engineering', section_id: 'general_dp_alignment',     display_order: 1 },
    { team_type: 'platform_engineering', section_id: 'current_status',           display_order: 2 },
    { team_type: 'platform_engineering', section_id: 'platform_needs',           display_order: 3 },
    { team_type: 'platform_engineering', section_id: 'tool_evaluation',          display_order: 4 },
    { team_type: 'platform_engineering', section_id: 'integration_requirements', display_order: 5 },
    { team_type: 'platform_engineering', section_id: 'adoption_readiness',       display_order: 6 },
    { team_type: 'platform_engineering', section_id: 'feedback_adaptability',    display_order: 7 },
  ];

  // Infrastructure/Cloud: mandatory + integration_requirements, adoption_readiness, tool_evaluation (6 sections total)
  // general_dp_alignment → current_status → integration_requirements → adoption_readiness → tool_evaluation → feedback_adaptability
  const infrastructureCloudRouting = [
    { team_type: 'infrastructure_cloud', section_id: 'general_dp_alignment',     display_order: 1 },
    { team_type: 'infrastructure_cloud', section_id: 'current_status',           display_order: 2 },
    { team_type: 'infrastructure_cloud', section_id: 'integration_requirements', display_order: 3 },
    { team_type: 'infrastructure_cloud', section_id: 'adoption_readiness',       display_order: 4 },
    { team_type: 'infrastructure_cloud', section_id: 'tool_evaluation',          display_order: 5 },
    { team_type: 'infrastructure_cloud', section_id: 'feedback_adaptability',    display_order: 6 },
  ];

  // Data/API Governance: mandatory + governance_compliance, platform_needs, integration_requirements (6 sections total)
  // general_dp_alignment → current_status → governance_compliance → platform_needs → integration_requirements → feedback_adaptability
  const dataApiGovernanceRouting = [
    { team_type: 'data_api_governance', section_id: 'general_dp_alignment',     display_order: 1 },
    { team_type: 'data_api_governance', section_id: 'current_status',           display_order: 2 },
    { team_type: 'data_api_governance', section_id: 'governance_compliance',    display_order: 3 },
    { team_type: 'data_api_governance', section_id: 'platform_needs',           display_order: 4 },
    { team_type: 'data_api_governance', section_id: 'integration_requirements', display_order: 5 },
    { team_type: 'data_api_governance', section_id: 'feedback_adaptability',    display_order: 6 },
  ];

  await db.insert(sectionRouting).values([
    ...programProjectRouting,
    ...platformEngineeringRouting,
    ...infrastructureCloudRouting,
    ...dataApiGovernanceRouting,
  ]).onConflictDoNothing();

  console.log('Section routing seeded (24 rows total across 4 team types).');

  // ── Initial assessment_config singleton ──────────────────────────────────────
  // Seed the singleton assessment config row (id=1) with a 2-week default window
  // System Owner can update due_date from the dashboard (PATCH /api/config)
  const launchDate = new Date();
  const dueDate = new Date(launchDate);
  dueDate.setDate(dueDate.getDate() + 14);  // 2-week default from TechArch §1.4

  await db.insert(assessmentConfig).values({
    id:               1,
    due_date:         dueDate.toISOString(),
    launch_date:      launchDate.toISOString(),
    last_modified_at: launchDate.toISOString(),
    last_modified_by: null,
  }).onConflictDoNothing();

  console.log('Assessment config singleton seeded (id=1, due_date=+14 days from now).');

  await pool.end();
  console.log('Seed complete.');
}

// Run when called directly
seedDatabase().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

**Step 3 — Push schema to database using drizzle-kit:**

Run `db:push` to create all tables in the connected PostgreSQL instance. This uses the DATABASE_URL from `.env.local` (which should be set by the Pivota platform via the postgres sidecar):

```bash
npm run db:push
```

If `.env.local` does not yet exist (Pivota injects DATABASE_URL as a process env), run:
```bash
DATABASE_URL="$DATABASE_URL" npx drizzle-kit push:pg --config=drizzle.config.ts
```

**Step 4 — Run seed script:**
```bash
npm run db:seed
```

**Step 5 — Verify tables and seed data exist in PostgreSQL:**

Run a quick verification query to confirm all 10 tables and seed data are present:
```bash
npx tsx -e "
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function verify() {
  const tables = await pool.query(\`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  \`);
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

  const sectionCount = await pool.query('SELECT COUNT(*) FROM sections');
  console.log('Sections:', sectionCount.rows[0].count);

  const routingCount = await pool.query('SELECT COUNT(*) FROM section_routing');
  console.log('Routing rows:', routingCount.rows[0].count);

  const mandatory = await pool.query(\"SELECT id FROM sections WHERE is_mandatory = true ORDER BY display_order\");
  console.log('Mandatory sections:', mandatory.rows.map(r => r.id).join(', '));

  await pool.end();
}
verify().catch(console.error);
"
```
  </action>
  <verify>
```bash
# Verify schema files exist with correct content
grep -n "general_dp_alignment" drizzle/seed.ts && echo "SECTION SEED OK"
grep -n "feedback_adaptability" drizzle/seed.ts && echo "MANDATORY LAST SECTION OK"
grep -n "platform_engineering" drizzle/seed.ts && echo "PLATFORM ENG ROUTING OK"
grep -n "data_api_governance" drizzle/seed.ts && echo "DATA API GOV ROUTING OK"
grep -n "governance_compliance" drizzle/seed.ts && echo "GOV COMPLIANCE SECTION OK"

# Verify database state (requires DATABASE_URL set)
npx tsx -e "
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) as cnt FROM sections').then(r => {
  console.log('sections count:', r.rows[0].cnt);
  if (parseInt(r.rows[0].cnt) === 8) console.log('SECTIONS OK');
  else console.error('SECTIONS FAIL: expected 8, got', r.rows[0].cnt);
}).catch(e => console.error('DB check failed (may need DATABASE_URL):', e.message)).finally(() => pool.end());
" 2>&1

npx tsx -e "
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) as cnt FROM section_routing').then(r => {
  console.log('section_routing count:', r.rows[0].cnt);
  if (parseInt(r.rows[0].cnt) === 24) console.log('ROUTING OK');
  else console.error('ROUTING FAIL: expected 24, got', r.rows[0].cnt);
}).catch(e => console.error('DB check failed:', e.message)).finally(() => pool.end());
" 2>&1
```
  </verify>
  <done>
- drizzle/migrate.ts exists and runs migrations from ./drizzle/migrations folder
- drizzle/seed.ts seeds exactly 8 sections with correct ids, titles, is_mandatory flags, and display_order values from TechArch §3.4
- drizzle/seed.ts seeds exactly 24 section_routing rows (5 + 7 + 6 + 6) across all 4 team types with correct display_order per team type from TechArch §3.5
- assessment_config singleton row (id=1) seeded with launch_date=now, due_date=+14 days
- All 10 tables exist in PostgreSQL (verified via information_schema.tables query)
- sections table has 8 rows; section_routing table has 24 rows
- 3 mandatory sections: general_dp_alignment (order 1), current_status (order 2), feedback_adaptability (order 8 globally, last in all team type routings)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| {env→db} | {DATABASE_URL injected from environment into the pg Pool connection string — any compromise of env vars exposes the database} |
| {seed→db} | {Seed script runs as a trusted internal process; seed data is hardcoded, not user-controlled — low risk} |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Information disclosure | `src/lib/db.ts` Pool initialization | mitigate | `DATABASE_URL` read from `process.env` only; never logged or exposed in responses. Pool config in `src/lib/db.ts::Pool` constructor uses env var directly — no string interpolation of user input. |
| T-01-02 | Tampering | `drizzle/schema.ts` CHECK constraints | mitigate | `team_type` CHECK constraint in `respondents`, `section_routing` and `submission_status` CHECK in `sessions` reject out-of-enum values at the DB layer (`check()` in schema + raw SQL fallback in migrations), not just at the application layer. |
| T-01-03 | Elevation of privilege | `system_owner_emails` table | mitigate | Case-insensitive unique index `idx_system_owner_emails_lower` on `LOWER(email)` prevents case-spoofing attacks (e.g., `Admin@example.com` vs `admin@example.com` treated identically). Lookup in `authService.ts` (wave 2a) must use `LOWER(email)` parameterized query — not string concatenation. |
| T-01-04 | Tampering | `assessment_config` singleton | mitigate | `CHECK (id = 1)` constraint at DB level (`assessment_config_singleton_check`) prevents insertion of a second config row that could shadow the active due_date used by `assessmentOpenGuard`. |
| T-01-05 | Denial of service | pg connection pool | mitigate | `max: 20` cap in `src/lib/db.ts` Pool prevents connection exhaustion under 500-concurrent-user load (TechArch §1 SPEC-ARCH). |
</threat_model>

<verification>
## Wave 1 — Database Verification

After all 3 tasks complete, verify:

```bash
# 1. All 10 table exports present in schema
npx tsx -e "import('./drizzle/schema.ts').then(m => { const tbls = ['systemOwnerEmails','respondents','sessions','sections','sectionRouting','questions','questionOptions','responses','assessmentConfig','configAuditLog']; const missing = tbls.filter(t => !m[t]); if (missing.length === 0) console.log('ALL 10 TABLES EXPORTED OK'); else console.error('MISSING:', missing); })"

# 2. Key constraints present in schema source
grep -c "LOWER\|lower" drizzle/schema.ts && echo "LOWER() indexes present"
grep "responses_session_question_uniq" drizzle/schema.ts && echo "UPSERT UNIQUE OK"
grep "assessment_config_singleton_check" drizzle/schema.ts && echo "SINGLETON CHECK OK"

# 3. Seed data completeness
grep -c "team_type:" drizzle/seed.ts  # Should be 24 (all routing rows)
grep "feedback_adaptability" drizzle/seed.ts | grep -c "display_order" # Should be 4 (one per team type, always last)

# 4. DB connectivity and data
DATABASE_URL="${DATABASE_URL}" npx tsx -e "
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
Promise.all([
  pool.query('SELECT COUNT(*) FROM sections'),
  pool.query('SELECT COUNT(*) FROM section_routing'),
  pool.query('SELECT COUNT(*) FROM assessment_config'),
  pool.query(\"SELECT id FROM sections WHERE is_mandatory ORDER BY display_order\"),
]).then(([s, r, c, m]) => {
  console.log('sections:', s.rows[0].count, '(expected 8)');
  console.log('routing:', r.rows[0].count, '(expected 24)');
  console.log('config:', c.rows[0].count, '(expected 1)');
  console.log('mandatory:', m.rows.map(r=>r.id).join(', '));
}).finally(() => pool.end());
"
```
</verification>

<success_criteria>
- All 10 PostgreSQL tables created with exact DDL from TechArch §3.2
- UNIQUE indexes on LOWER(email) for case-insensitive respondent and system_owner_emails lookups
- UNIQUE(session_id, question_id) on responses enables upsert auto-save pattern
- UNIQUE(team_type, section_id) on section_routing prevents duplicate routing config
- CHECK(id = 1) on assessment_config enforces singleton constraint
- 8 sections seeded with exact IDs, titles, is_mandatory flags from TechArch §3.4
- 24 section_routing rows seeded (5+7+6+6) with exact team-type/display_order from TechArch §3.5
- assessment_config singleton row seeded with +14-day due date window
- Drizzle ORM schema TypeScript exports match column names exactly (snake_case, matching DB column names)
- src/lib/db.ts exports `db` singleton with Pool max 20 connections
- package.json dev script binds to 0.0.0.0:3000
- Next.js headers do NOT emit X-Frame-Options: DENY (Pivota Preview iframe compatibility)
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/01-SUMMARY.md` with:
- What was built (tables created, seed data loaded)
- Key schema decisions (LOWER() indexes, JSONB answer_payload, singleton pattern)
- DB connection pattern (Pool max 20, DATABASE_URL env var)
- Exact table exports available for downstream waves
- Any deviations from TechArch (flag conflicts, do not silently diverge)
</output>
