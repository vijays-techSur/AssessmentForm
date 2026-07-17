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

> **Database:** PostgreSQL 15+  
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
