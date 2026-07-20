import type {
  SessionResponse,
  SectionSummary,
  SectionWithQuestions,
  PutResponsesBody,
} from './types';

const BASE = '';  // Same-origin — Next.js API routes

async function apiFetch<T>(
  url: string,
  options: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(rest.headers as Record<string, string> | undefined ?? {}),
  };
  const res = await fetch(`${BASE}${url}`, { ...rest, headers });
  const data = await res.json();
  if (!res.ok) {
    const err = data?.error ?? { code: 'UNKNOWN_ERROR', message: res.statusText };
    throw Object.assign(new Error(err.message), { code: err.code, status: res.status });
  }
  return data as T;
}

// POST /api/sessions — create or resume respondent session (plan 02)
export async function createSession(body: {
  email: string;
  name: string;
  team_type: string;
}): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// GET /api/sessions/:sessionId — load session for resume (plan 02)
export async function getSession(sessionId: string, token: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>(`/api/sessions/${sessionId}`, {
    method: 'GET',
    token,
  });
}

// GET /api/sections?teamType — ordered section list (plan 03)
export async function getSections(
  teamType: string,
  token: string
): Promise<{ sections: SectionSummary[] }> {
  return apiFetch<{ sections: SectionSummary[] }>(
    `/api/sections?teamType=${encodeURIComponent(teamType)}`,
    { method: 'GET', token }
  );
}

// GET /api/sections/:sectionId/questions — questions with options (plan 03)
export async function getQuestions(
  sectionId: string,
  token: string
): Promise<SectionWithQuestions> {
  return apiFetch<SectionWithQuestions>(`/api/sections/${sectionId}/questions`, {
    method: 'GET',
    token,
  });
}

// PUT /api/responses/:sessionId — auto-save responses (plan 04)
export async function putResponses(
  sessionId: string,
  body: PutResponsesBody,
  token: string
): Promise<{ saved: true; last_saved_at: string }> {
  return apiFetch<{ saved: true; last_saved_at: string }>(
    `/api/responses/${sessionId}`,
    { method: 'PUT', body: JSON.stringify(body), token }
  );
}
