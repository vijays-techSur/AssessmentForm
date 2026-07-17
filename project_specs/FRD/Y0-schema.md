---

## Database Schema (DDL)

> **Database:** PostgreSQL (or compatible relational store). All timestamps are stored as `TIMESTAMPTZ` (UTC). UUIDs use `gen_random_uuid()` as default. `JSONB` is used for flexible answer payloads.

---

### §Auth — System Owner Emails

```sql
CREATE TABLE system_owner_emails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,              -- Case-insensitive enforced via CHECK/lower()
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by     TEXT,                              -- Email of the admin who added this entry
  is_active    BOOLEAN NOT NULL DEFAULT TRUE      -- Soft-disable without deleting
);

CREATE UNIQUE INDEX idx_system_owner_emails_lower
  ON system_owner_emails (LOWER(email));
```

---

### §Sessions — Respondent Sessions

```sql
CREATE TABLE respondents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  team_type    TEXT NOT NULL
                 CHECK (team_type IN (
                   'program_project',
                   'platform_engineering',
                   'infrastructure_cloud',
                   'data_api_governance'
                 )),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_respondents_email_lower
  ON respondents (LOWER(email));

CREATE TABLE sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id         UUID NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  submission_status     TEXT NOT NULL DEFAULT 'draft'
                          CHECK (submission_status IN ('draft', 'submitted')),
  current_section_index INTEGER NOT NULL DEFAULT 0,
  section_ids_ordered   JSONB NOT NULL DEFAULT '[]', -- Array of section_id strings in display order
  submitted_at          TIMESTAMPTZ,
  last_saved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_respondent_id ON sessions(respondent_id);
CREATE INDEX idx_sessions_submission_status ON sessions(submission_status);
CREATE INDEX idx_sessions_submitted_at ON sessions(submitted_at);
```

---

### §Sections — Sections & Section Routing

```sql
CREATE TABLE sections (
  id              TEXT PRIMARY KEY,            -- e.g., 'general_dp_alignment'
  title           TEXT NOT NULL,
  description     TEXT,
  is_mandatory    BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INTEGER NOT NULL,            -- Global default order; overridden by section_routing
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE section_routing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_type       TEXT NOT NULL
                    CHECK (team_type IN (
                      'program_project',
                      'platform_engineering',
                      'infrastructure_cloud',
                      'data_api_governance'
                    )),
  section_id      TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  display_order   INTEGER NOT NULL,            -- Order of this section for this team type
  is_included     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (team_type, section_id)
);

CREATE INDEX idx_section_routing_team_type ON section_routing(team_type);
```

---

### §Questions — Questions & Options

```sql
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL
                    CHECK (question_type IN (
                      'single_choice',
                      'multi_choice',
                      'likert',
                      'ranking',
                      'free_text_short',
                      'free_text_long'
                    )),
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  has_other       BOOLEAN NOT NULL DEFAULT FALSE,  -- Applicable to single/multi_choice only
  display_order   INTEGER NOT NULL,
  help_text       TEXT,                            -- Optional tooltip/hint text
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_section_id ON questions(section_id);

CREATE TABLE question_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text     TEXT NOT NULL,
  display_order   INTEGER NOT NULL,
  is_other        BOOLEAN NOT NULL DEFAULT FALSE,  -- Marks the special "Other" option
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, display_order)
);

CREATE INDEX idx_question_options_question_id ON question_options(question_id);
```

---

### §Responses — Respondent Answers

```sql
CREATE TABLE responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_payload  JSONB NOT NULL,               -- Structured per question type (see F02)
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)              -- One answer per question per session; upsert on conflict
);

CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);
```

**Answer Payload Shapes (stored in `answer_payload` JSONB):**

```json
// single_choice
{ "type": "single_choice", "value": "option_id_uuid" }
// single_choice with Other
{ "type": "single_choice", "value": "other", "other_text": "Custom value" }

// multi_choice
{ "type": "multi_choice", "values": ["option_id_1", "option_id_2"] }
// multi_choice with Other
{ "type": "multi_choice", "values": ["option_id_1", "other"], "other_text": "Custom value" }

// likert
{ "type": "likert", "value": 4 }

// ranking (array = ranked order; index 0 = rank 1 = highest priority)
{ "type": "ranking", "order": ["option_id_2", "option_id_1", "option_id_3"] }

// free_text_short
{ "type": "free_text_short", "value": "Brief answer text" }

// free_text_long
{ "type": "free_text_long", "value": "Extended open-ended response text..." }
```

---

### §Config — Assessment Configuration

```sql
CREATE TABLE assessment_config (
  id              INTEGER PRIMARY KEY DEFAULT 1
                    CHECK (id = 1),             -- Singleton: only one row allowed
  due_date        TIMESTAMPTZ NOT NULL,
  launch_date     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_by TEXT                         -- System Owner email
);

CREATE TABLE config_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by      TEXT NOT NULL,                -- System Owner email
  field_changed   TEXT NOT NULL,                -- e.g., 'due_date'
  old_value       TEXT,
  new_value       TEXT
);
```

---

### §Seed Data (v1 Sections)

```sql
INSERT INTO sections (id, title, description, is_mandatory, display_order) VALUES
  ('general_dp_alignment',  'General DP Alignment',                  'Core Developer Platform alignment questions', TRUE,  1),
  ('current_status',        'Current Status',                        'Team current tooling and adoption status',   TRUE,  2),
  ('platform_needs',        'Platform Needs & Capability Requirements', 'Platform-specific capability requirements', FALSE, 3),
  ('tool_evaluation',       'Tool Evaluation Criteria',              'Criteria for evaluating DP tools',           FALSE, 4),
  ('integration_requirements', 'Integration & Ecosystem Requirements', 'Integration and ecosystem requirements',  FALSE, 5),
  ('adoption_readiness',    'Adoption Readiness & Constraints',      'Readiness and blockers for adoption',        FALSE, 6),
  ('governance_compliance', 'Governance & Compliance Requirements',  'Governance and compliance needs',            FALSE, 7),
  ('feedback_adaptability', 'Feedback & Adaptability',               'Open feedback and adaptability questions',  TRUE,  8);
```

---
