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
    sectionIdx:        index('idx_questions_section_id').on(table.section_id),
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
export const assessmentConfig = pgTable(
  'assessment_config',
  {
    id:               integer('id').primaryKey().default(1),
    // CHECK (id = 1) — enforced via Drizzle check() below
    due_date:         timestamp('due_date', { withTimezone: true, mode: 'string' }).notNull(),
    launch_date:      timestamp('launch_date', { withTimezone: true, mode: 'string' }).notNull(),
    created_at:       timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    last_modified_at: timestamp('last_modified_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    last_modified_by: text('last_modified_by'),  // System Owner email who last changed config
  },
  (table) => ({
    // TechArch: CHECK (id = 1) — Singleton enforcement
    singletonCheck: check('assessment_config_singleton_check', sql`${table.id} = 1`),
  })
);

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
