import { db } from '@/lib/db';
import {
  respondents,
  sessions,
  responses,
  assessmentConfig,
} from '../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { signJwt } from '../auth/authService';
import type { UserRole } from '@/types/auth';

export type TeamType =
  | 'program_project'
  | 'platform_engineering'
  | 'infrastructure_cloud'
  | 'data_api_governance';

export type SubmissionStatus = 'draft' | 'submitted';

export interface SavedResponse {
  question_id: string;
  answer_payload: unknown;
}

export interface SessionResponse {
  session_id: string;
  token: string;
  role: UserRole;
  is_returning: boolean;
  team_type: string;
  submission_status: SubmissionStatus;
  current_section_index: number;
  section_ids_ordered: string[];
  saved_responses: SavedResponse[];
  is_closed: boolean;
  due_date: string;
}

// Fetch assessment config (singleton id=1) and compute is_closed.
// TechArch §5.4: due-date checks are server-side only.
async function getAssessmentStatus(): Promise<{ due_date: string; is_closed: boolean }> {
  const config = await db
    .select({ due_date: assessmentConfig.due_date })
    .from(assessmentConfig)
    .where(eq(assessmentConfig.id, 1))
    .limit(1);

  if (config.length === 0) {
    // No config seeded yet — treat as open (seed script covers this in wave 1)
    const fallback = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    return { due_date: fallback, is_closed: false };
  }

  const dueDate = config[0].due_date;
  const is_closed = new Date() > new Date(dueDate);
  return { due_date: dueDate, is_closed };
}

// Load all saved responses for a session (for pre-population on resume).
async function loadSavedResponses(sessionId: string): Promise<SavedResponse[]> {
  const rows = await db
    .select({
      question_id: responses.question_id,
      answer_payload: responses.answer_payload,
    })
    .from(responses)
    .where(eq(responses.session_id, sessionId));

  return rows.map((r) => ({
    question_id: r.question_id,
    answer_payload: r.answer_payload,
  }));
}

// FRD F01 §Process steps 4–9: Create or resume a respondent session.
// - New respondent: INSERT respondents + sessions; is_returning=false
// - Returning respondent: SELECT existing; is_returning=true; team_type LOCKED (ignored on resume)
// - System Owner email blocked with SYSTEM_OWNER_CANNOT_RESPOND (caller validates before calling this)
export async function createOrResumeSession(input: {
  email: string;
  name: string;
  team_type: TeamType;
}): Promise<SessionResponse> {
  const { email, name, team_type } = input;
  const { due_date, is_closed } = await getAssessmentStatus();

  // TechArch §3.2: idx_respondents_email_lower uses LOWER(email) — case-insensitive lookup
  const existingRespondent = await db
    .select()
    .from(respondents)
    .where(sql`LOWER(${respondents.email}) = LOWER(${email})`)
    .limit(1);

  let respondentId: string;
  let isReturning: boolean;
  let resolvedTeamType: string = team_type;

  if (existingRespondent.length > 0) {
    // Returning respondent — team_type is LOCKED (FRD F03 constraint: server ignores submitted team_type)
    respondentId = existingRespondent[0].id;
    resolvedTeamType = existingRespondent[0].team_type;
    isReturning = true;
  } else {
    // New respondent — insert into respondents
    const newRespondent = await db
      .insert(respondents)
      .values({ email, name, team_type })
      .returning();
    respondentId = newRespondent[0].id;
    isReturning = false;
  }

  // Find or create session for this respondent
  const existingSession = await db
    .select()
    .from(sessions)
    .where(eq(sessions.respondent_id, respondentId))
    .limit(1);

  let sessionId: string;
  let submission_status: SubmissionStatus;
  let current_section_index: number;
  let section_ids_ordered: string[];

  if (existingSession.length > 0) {
    const s = existingSession[0];
    sessionId = s.id;
    submission_status = s.submission_status as SubmissionStatus;
    current_section_index = s.current_section_index;
    section_ids_ordered = (s.section_ids_ordered as string[]) ?? [];
  } else {
    // Create new session for this respondent
    const newSession = await db
      .insert(sessions)
      .values({
        respondent_id: respondentId,
        submission_status: 'draft',
        current_section_index: 0,
        section_ids_ordered: [],
      })
      .returning();
    const s = newSession[0];
    sessionId = s.id;
    submission_status = 'draft';
    current_section_index = 0;
    section_ids_ordered = [];
  }

  // Load saved responses for pre-population (empty array for new respondents)
  const saved_responses = isReturning ? await loadSavedResponses(sessionId) : [];

  // TechArch §5.1: Respondent JWT expires in 24 hours
  const token = await signJwt({ session_id: sessionId, email, role: 'respondent' }, '24h');

  return {
    session_id: sessionId,
    token,
    role: 'respondent',
    is_returning: isReturning,
    team_type: resolvedTeamType,
    submission_status,
    current_section_index,
    section_ids_ordered,
    saved_responses,
    is_closed,
    due_date,
  };
}

// FRD F01: GET /api/sessions/:sessionId — load session for returning respondent
// Used by useSession hook on page load to hydrate state from localStorage session_id
export async function getSessionById(
  sessionId: string,
  callerEmail: string
): Promise<SessionResponse> {
  const { due_date, is_closed } = await getAssessmentStatus();

  // Join sessions → respondents (include team_type for client fallback)
  const result = await db
    .select({
      session_id: sessions.id,
      submission_status: sessions.submission_status,
      current_section_index: sessions.current_section_index,
      section_ids_ordered: sessions.section_ids_ordered,
      respondent_email: respondents.email,
      team_type: respondents.team_type,
    })
    .from(sessions)
    .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (result.length === 0) {
    throw Object.assign(new Error('SESSION_NOT_FOUND'), { code: 'SESSION_NOT_FOUND', status: 404 });
  }

  const row = result[0];

  // Ownership check — caller (jwtMiddleware) already verified token; requireSessionOwner
  // validates path ownership, but service double-checks for safety
  if (row.respondent_email.toLowerCase() !== callerEmail.toLowerCase()) {
    throw Object.assign(new Error('SESSION_ACCESS_DENIED'), { code: 'SESSION_ACCESS_DENIED', status: 403 });
  }

  const saved_responses = await loadSavedResponses(sessionId);

  // Re-sign JWT for the session (fresh token with updated exp; same role)
  const token = await signJwt(
    { session_id: sessionId, email: callerEmail, role: 'respondent' },
    '24h'
  );

  return {
    session_id: row.session_id,
    token,
    role: 'respondent',
    is_returning: true,
    team_type: row.team_type,
    submission_status: row.submission_status as SubmissionStatus,
    current_section_index: row.current_section_index,
    section_ids_ordered: (row.section_ids_ordered as string[]) ?? [],
    saved_responses,
    is_closed,
    due_date,
  };
}
