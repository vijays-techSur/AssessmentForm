/**
 * Direct schema push for Pivota native-sidecar environment.
 * Uses pg pool with SSL (rejectUnauthorized: false) to create all tables.
 * Run: node scripts/push-schema.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[push-schema] ERROR: DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const DDL = `
-- system_owner_emails
CREATE TABLE IF NOT EXISTS system_owner_emails (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_owner_emails_lower ON system_owner_emails (LOWER(email));

-- respondents
CREATE TABLE IF NOT EXISTS respondents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  team_type   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_respondents_email_lower ON respondents (LOWER(email));

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id           UUID NOT NULL REFERENCES respondents(id),
  team_type               TEXT NOT NULL,
  submission_status       TEXT NOT NULL DEFAULT 'draft',
  current_section_index   INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_respondent_id ON sessions (respondent_id);

-- sections
CREATE TABLE IF NOT EXISTS sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- section_routing
CREATE TABLE IF NOT EXISTS section_routing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_type   TEXT NOT NULL,
  section_id  UUID NOT NULL REFERENCES sections(id),
  display_order INT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_section_routing_team_section ON section_routing (team_type, section_id);
CREATE INDEX IF NOT EXISTS idx_section_routing_team_type ON section_routing (team_type);

-- questions
CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES sections(id),
  text            TEXT NOT NULL,
  question_type   TEXT NOT NULL,
  is_required     BOOLEAN NOT NULL DEFAULT false,
  display_order   INT NOT NULL DEFAULT 0,
  allow_other     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_section_id ON questions (section_id);

-- question_options
CREATE TABLE IF NOT EXISTS question_options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id),
  label        TEXT NOT NULL,
  value        TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options (question_id);

-- responses
CREATE TABLE IF NOT EXISTS responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id),
  section_id      UUID NOT NULL REFERENCES sections(id),
  question_id     UUID NOT NULL REFERENCES questions(id),
  answer_payload  JSONB NOT NULL,
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_session_question ON responses (session_id, question_id);
CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses (session_id);

-- assessment_config
CREATE TABLE IF NOT EXISTS assessment_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  due_date    TIMESTAMPTZ NOT NULL,
  is_open     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- config_audit_log
CREATE TABLE IF NOT EXISTS config_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by   TEXT NOT NULL,
  field_name   TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function main() {
  const client = await pool.connect();
  try {
    console.log('[push-schema] Creating tables...');
    await client.query(DDL);
    console.log('[push-schema] Tables created OK');

    // Check row count
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
        AND table_name IN (
          'system_owner_emails','respondents','sessions','sections',
          'section_routing','questions','question_options','responses',
          'assessment_config','config_audit_log'
        )
      ORDER BY table_name
    `);
    console.log('[push-schema] Tables present:', rows.map(r => r.table_name).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => {
  console.error('[push-schema] FAILED:', e.message);
  process.exit(1);
});
