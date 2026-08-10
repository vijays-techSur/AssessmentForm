import { APIRequestContext } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:4000';

export interface RespondentSession {
  sessionId: string;
  token: string;
  email: string;
  name: string;
  teamType: string;
}

/**
 * Create a respondent session via POST /api/sessions.
 * Returns { sessionId, token, email, name, teamType }.
 * Uses a unique email per call to avoid conflicts across tests.
 */
export async function createRespondentSession(
  request: APIRequestContext,
  opts: { email?: string; name?: string; teamType?: string } = {}
): Promise<RespondentSession> {
  const email = opts.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const name = opts.name ?? 'Test Respondent';
  const teamType = opts.teamType ?? 'program_project';

  const res = await request.post(`${BASE}/api/sessions`, {
    data: { email, name, team_type: teamType },
  });
  const body = await res.json();
  return {
    sessionId: body.session_id ?? body.sessionId,
    token: body.token,
    email,
    name,
    teamType,
  };
}

/**
 * Create a System Owner JWT via POST /api/auth/login.
 * The seed script must have seeded a system owner email.
 * Default: admin@assessmentform.internal (from drizzle/seed.ts).
 */
export async function createSystemOwnerToken(
  request: APIRequestContext,
  email = 'admin@assessmentform.internal'
): Promise<string> {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email },
  });
  const body = await res.json();
  return body.token;
}

/**
 * Submit a session (draft → submitted) via POST /api/submissions/:sessionId.
 * Auto-saves minimal required answers first if saveAnswers=true.
 */
export async function submitSession(
  request: APIRequestContext,
  sessionId: string,
  token: string
): Promise<void> {
  await request.post(`${BASE}/api/submissions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Set due_date in assessment_config to a past date (to simulate closed assessment).
 * Requires System Owner token.
 */
export async function setAssessmentClosed(
  request: APIRequestContext,
  ownerToken: string
): Promise<void> {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await request.patch(`${BASE}/api/config`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { due_date: pastDate },
  });
}

/**
 * Set due_date to a future date (to simulate open assessment).
 */
export async function setAssessmentOpen(
  request: APIRequestContext,
  ownerToken: string
): Promise<void> {
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await request.patch(`${BASE}/api/config`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { due_date: futureDate },
  });
}
