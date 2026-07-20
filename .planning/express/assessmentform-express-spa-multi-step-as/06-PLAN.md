---
phase: 3a-part1-respondent-spa
plan: 06
type: execute
wave: 6
depends_on: [2, 3, 4]
files_modified:
  - next.config.mjs
  - src/lib/api/client.ts
  - src/hooks/useSession.ts
  - src/hooks/useSectionList.ts
  - src/hooks/useAutoSave.ts
  - src/components/identity/IdentityForm.tsx
  - src/components/identity/ResumeBanner.tsx
  - src/components/assessment/AssessmentWizard.tsx
  - src/components/assessment/ProgressBar.tsx
  - src/components/assessment/SectionScreen.tsx
  - src/components/assessment/SaveStateIndicator.tsx
  - src/components/questions/QuestionRouter.tsx
  - src/components/questions/SingleChoiceQuestion.tsx
  - src/components/questions/MultiChoiceQuestion.tsx
  - src/components/questions/LikertQuestion.tsx
  - src/components/questions/RankingQuestion.tsx
  - src/components/questions/FreeTextShortQuestion.tsx
  - src/components/questions/FreeTextLongQuestion.tsx
  - src/components/questions/OtherTextReveal.tsx
  - src/app/page.tsx
  - src/app/assessment/page.tsx
  - src/app/layout.tsx
autonomous: true

features:
  implements: ["F0", "F1", "F2", "F3", "F4"]
  depends_on: ["F1", "F7"]
  enables: ["F5", "F9"]

must_haves:
  truths:
    - "Respondent can open / at the root and see the identity form with email, name, and team type fields"
    - "Identity form Start Assessment button is disabled until all 3 fields are valid; email validated RFC 5322; name ≥ 2 non-whitespace chars"
    - "Selecting a team type shows a section-count preview beneath the dropdown"
    - "Submitting the identity form calls POST /api/sessions; on success the JWT is stored in localStorage and the respondent is navigated to /assessment"
    - "System Owner email shows inline error; stale localStorage session shows warning; returning respondent sees ResumeBanner with section index"
    - "On /assessment the AssessmentWizard renders one section at a time; Previous/Next buttons navigate between sections without page reload"
    - "Previous is hidden on section 0; Next label changes to 'Review Answers' on the final section"
    - "ProgressBar shows filled/current/future segments labeled with section names; completed segments are visually distinct"
    - "All 6 question type renderers correctly render their widget — radio, checkbox, Likert 5-point, ranking with drag-and-drop + numbered fallback, single-line input, textarea"
    - "OtherTextReveal shows/hides the Other text input based on selection state; auto-focuses on reveal; clears value on hide"
    - "FreeText fields show live character counters that turn amber at 80% of limit and red at 96%+"
    - "useAutoSave triggers on Next/Previous navigation AND after 30s idle when dirty; SaveStateIndicator reflects Unsaved/Saving/Saved states"
    - "Auto-save retries up to 3 times with exponential backoff (1s, 2s, 4s) on failure; navigation is never blocked by save failure"
    - "useSectionList fetches GET /api/sections?teamType and stores the ordered section list; section count is reflected in ProgressBar"
    - "When clicking Next with unanswered required questions, a section-level error banner appears and navigation is blocked"
  artifacts:
    - path: "next.config.mjs"
      provides: "Next.js config with host 0.0.0.0:3000, no X-Frame-Options DENY, no frame-ancestors none CSP"
      contains: "next.config.mjs"
    - path: "src/lib/api/client.ts"
      provides: "Typed API client functions: createSession, getSession, getSections, getQuestions, putResponses"
      exports: ["createSession", "getSession", "getSections", "getQuestions", "putResponses"]
    - path: "src/hooks/useSession.ts"
      provides: "useSession — localStorage token management, POST /api/sessions, GET /api/sessions/:id hydration"
      exports: ["useSession"]
    - path: "src/hooks/useSectionList.ts"
      provides: "useSectionList — fetches GET /api/sections?teamType and exposes ordered section list"
      exports: ["useSectionList"]
    - path: "src/hooks/useAutoSave.ts"
      provides: "useAutoSave — navigate-triggered save + 30s idle timer + 3-retry backoff + SaveStateIndicator state"
      exports: ["useAutoSave", "SaveState"]
    - path: "src/components/identity/IdentityForm.tsx"
      provides: "IdentityForm — email/name/team-type capture, validation, POST /api/sessions wiring"
      exports: ["IdentityForm"]
    - path: "src/components/identity/ResumeBanner.tsx"
      provides: "ResumeBanner — shown when is_returning: true with section index and edit window info"
      exports: ["ResumeBanner"]
    - path: "src/components/assessment/AssessmentWizard.tsx"
      provides: "AssessmentWizard — section navigation state machine, Previous/Next controls, is_closed/re-entry mode"
      exports: ["AssessmentWizard"]
    - path: "src/components/assessment/ProgressBar.tsx"
      provides: "ProgressBar — step indicator with ARIA labels; clickable only when submitted + is_closed=false"
      exports: ["ProgressBar"]
    - path: "src/components/assessment/SectionScreen.tsx"
      provides: "SectionScreen — renders question list via QuestionRouter; re-entry/closed banners; required validation"
      exports: ["SectionScreen"]
    - path: "src/components/assessment/SaveStateIndicator.tsx"
      provides: "SaveStateIndicator — Unsaved changes / Saving… / Saved at HH:MM"
      exports: ["SaveStateIndicator"]
    - path: "src/components/questions/QuestionRouter.tsx"
      provides: "QuestionRouter — dispatches to the correct question renderer by question_type"
      exports: ["QuestionRouter"]
    - path: "src/components/questions/SingleChoiceQuestion.tsx"
      provides: "SingleChoiceQuestion — radio buttons with optional OtherTextReveal"
      exports: ["SingleChoiceQuestion"]
    - path: "src/components/questions/MultiChoiceQuestion.tsx"
      provides: "MultiChoiceQuestion — checkboxes with optional OtherTextReveal"
      exports: ["MultiChoiceQuestion"]
    - path: "src/components/questions/LikertQuestion.tsx"
      provides: "LikertQuestion — 5-point radio group with keyboard arrow navigation and ARIA radiogroup"
      exports: ["LikertQuestion"]
    - path: "src/components/questions/RankingQuestion.tsx"
      provides: "RankingQuestion — dnd-kit drag-and-drop reorder + numbered input fallback + up/down buttons"
      exports: ["RankingQuestion"]
    - path: "src/components/questions/FreeTextShortQuestion.tsx"
      provides: "FreeTextShortQuestion — single-line input with char counter (max 500)"
      exports: ["FreeTextShortQuestion"]
    - path: "src/components/questions/FreeTextLongQuestion.tsx"
      provides: "FreeTextLongQuestion — textarea with resize + char counter (max 2000)"
      exports: ["FreeTextLongQuestion"]
    - path: "src/components/questions/OtherTextReveal.tsx"
      provides: "OtherTextReveal — conditional reveal/hide of Other text input with aria-expanded"
      exports: ["OtherTextReveal"]
  key_links:
    - from: "src/components/identity/IdentityForm.tsx"
      to: "src/hooks/useSession.ts"
      via: "createSession() from useSession on form submit"
      pattern: "useSession|createSession"
    - from: "src/hooks/useSession.ts"
      to: "src/lib/api/client.ts"
      via: "createSession / getSession API calls"
      pattern: "createSession|getSession"
    - from: "src/components/assessment/AssessmentWizard.tsx"
      to: "src/hooks/useAutoSave.ts"
      via: "triggerSave() called on Next/Previous navigation"
      pattern: "triggerSave|useAutoSave"
    - from: "src/hooks/useAutoSave.ts"
      to: "src/lib/api/client.ts"
      via: "putResponses(sessionId, payload) on every save"
      pattern: "putResponses"
    - from: "src/components/assessment/SectionScreen.tsx"
      to: "src/components/questions/QuestionRouter.tsx"
      via: "renders QuestionRouter per question in section"
      pattern: "QuestionRouter"
    - from: "src/hooks/useSectionList.ts"
      to: "src/lib/api/client.ts"
      via: "getSections(teamType) on wizard mount"
      pattern: "getSections"

integration_contracts:
  requires:
    - from_plan: "02"
      artifact: "src/app/api/sessions/route.ts"
      exports: ["POST"]
      verify: "grep -n 'export.*POST' src/app/api/sessions/route.ts && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "src/app/api/sessions/[sessionId]/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export.*GET' 'src/app/api/sessions/[sessionId]/route.ts' && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/app/api/sections/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export async function GET' src/app/api/sections/route.ts && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/app/api/sections/[sectionId]/questions/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export async function GET' 'src/app/api/sections/[sectionId]/questions/route.ts' && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "src/app/api/responses/[sessionId]/route.ts"
      exports: ["PUT"]
      verify: "grep -n 'export.*PUT' 'src/app/api/responses/[sessionId]/route.ts' && echo CONTRACT_OK"
  provides:
    - artifact: "src/lib/api/client.ts"
      exports: ["createSession", "getSession", "getSections", "getQuestions", "putResponses"]
      shape: |
        export async function createSession(body: { email: string; name: string; team_type: string }, token?: string): Promise<SessionResponse>
        export async function getSession(sessionId: string, token: string): Promise<SessionResponse>
        export async function getSections(teamType: string, token: string): Promise<{ sections: SectionSummary[] }>
        export async function getQuestions(sectionId: string, token: string): Promise<SectionWithQuestions>
        export async function putResponses(sessionId: string, body: PutResponsesBody, token: string): Promise<{ saved: true; last_saved_at: string }>
      verify: "grep -n 'export.*createSession' src/lib/api/client.ts && grep -n 'export.*putResponses' src/lib/api/client.ts && echo CONTRACT_OK"
    - artifact: "src/hooks/useSession.ts"
      exports: ["useSession"]
      shape: |
        export function useSession(): {
          session: SessionResponse | null;
          token: string | null;
          isLoading: boolean;
          error: string | null;
          createSession: (body: { email: string; name: string; team_type: string }) => Promise<SessionResponse>;
          resumeSession: (sessionId: string) => Promise<SessionResponse>;
          clearSession: () => void;
        }
      verify: "grep -n 'export.*useSession' src/hooks/useSession.ts && echo CONTRACT_OK"
    - artifact: "src/hooks/useAutoSave.ts"
      exports: ["useAutoSave", "SaveState"]
      shape: |
        export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
        export function useAutoSave(params: {
          sessionId: string;
          token: string;
          sectionId: string;
          currentSectionIndex: number;
          getResponses: () => ResponseItem[];
        }): {
          saveState: SaveState;
          lastSavedAt: Date | null;
          triggerSave: () => Promise<void>;
          markDirty: () => void;
        }
      verify: "grep -n 'export.*useAutoSave' src/hooks/useAutoSave.ts && echo CONTRACT_OK"
    - artifact: "src/components/questions/QuestionRouter.tsx"
      exports: ["QuestionRouter"]
      shape: |
        export function QuestionRouter(props: {
          question: Question;
          value: AnswerPayload | null;
          onChange: (payload: AnswerPayload) => void;
          errorMessage?: string;
          readOnly?: boolean;
        }): JSX.Element
      verify: "grep -n 'export.*QuestionRouter' src/components/questions/QuestionRouter.tsx && echo CONTRACT_OK"
    - artifact: "src/components/assessment/AssessmentWizard.tsx"
      exports: ["AssessmentWizard"]
      shape: |
        // Consumed by wave 3b for ReviewStep and SubmissionConfirmation integration
        export function AssessmentWizard(props: {
          session: SessionResponse;
          token: string;
          onSubmitRedirect?: () => void;
        }): JSX.Element
      verify: "grep -n 'export.*AssessmentWizard' src/components/assessment/AssessmentWizard.tsx && echo CONTRACT_OK"
---

<objective>
Implement the complete Respondent SPA for Wave 3a Part 1. This covers the full frontend respondent flow: Next.js project scaffold with SPA configuration (next.config.mjs bound to 0.0.0.0:3000, no iframe-blocking headers), typed API client, all custom hooks (useSession, useSectionList, useAutoSave), the identity capture flow (IdentityForm + ResumeBanner), the assessment wizard shell (AssessmentWizard + ProgressBar + SectionScreen + SaveStateIndicator), and all 6 question-type renderer components plus OtherTextReveal.

Purpose: This is the respondent-facing UI. Without it, no respondent can start, navigate, or save an assessment. All components produced here are consumed by Wave 3b (ReviewStep, SubmissionConfirmation) and the read-only drill-down in Wave 3c.
Output: next.config.mjs, api client, 3 hooks, 2 identity components, 4 assessment layout components, 7 question renderer components, and route pages for / and /assessment.
</objective>

<feature_dependencies>
Implements: F0: Multi-Step Assessment Workflow (AssessmentWizard, ProgressBar, SectionScreen, Previous/Next navigation, required-question validation), F1: Respondent Identity & Session Management (IdentityForm, useSession, ResumeBanner, localStorage session_id, POST /api/sessions wiring, returning-respondent detection), F2: Question Types Engine (all 6 question renderers, OtherTextReveal, char counters, Likert ARIA, ranking dnd-kit), F3: Team-Type-Specific Section Routing (useSectionList, GET /api/sections wiring, ProgressBar section count), F4: Auto-Save & Progress Persistence (useAutoSave, navigate-triggered save, 30s idle timer, 3-retry backoff, SaveStateIndicator)
Depends on: F1 + F7 (POST /api/sessions, GET /api/sessions/:id from Wave 2a plan 02), F2 + F3 (GET /api/sections, GET /api/sections/:sectionId/questions from Wave 2b plan 03), F4 (PUT /api/responses/:sessionId from Wave 2c plan 04)
Enables: F5: Duplicate Submission Prevention & Edit Window (edit-window mode flag from session state), F9: Submission Confirmation (SubmissionConfirmation screen in wave 3b)
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@project_specs/TechArch-AssessmentForm.md
@project_specs/UX-Mockup-AssessmentForm.md
@project_specs/UserStories-AssessmentForm.md
@.planning/express/assessmentform-express-spa-multi-step-as/02-PLAN.md
@.planning/express/assessmentform-express-spa-multi-step-as/03-PLAN.md
@.planning/express/assessmentform-express-spa-multi-step-as/04-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Next.js SPA config, typed API client, and custom hooks (useSession, useSectionList, useAutoSave)</name>
  <files>
    next.config.mjs
    src/lib/api/client.ts
    src/lib/api/types.ts
    src/hooks/useSession.ts
    src/hooks/useSectionList.ts
    src/hooks/useAutoSave.ts
    src/components/assessment/SaveStateIndicator.tsx
  </files>
  <action>
Create the infrastructure layer: Next.js SPA config, strongly-typed API client, and the three hooks that wire the frontend to the backend.

---

### Step 1 — `next.config.mjs` (MUST be .mjs, not .ts — Next 14 hard error)

From constraints: bind to 0.0.0.0:3000, do NOT emit X-Frame-Options DENY or CSP frame-ancestors none. The app must be embeddable (enterprise iframe context).

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // SPA-first: no static exports needed; keep App Router
  reactStrictMode: true,

  // Bind to all interfaces so the container is reachable from host
  // (Next.js reads HOST/PORT from env; 0.0.0.0 is the docker default)
  // Start command: next start -H 0.0.0.0 -p 3000

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Do NOT set X-Frame-Options: DENY — app must be embeddable in enterprise portals
          // Do NOT set Content-Security-Policy frame-ancestors none
          // Set a permissive X-Frame-Options to allow embedding
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

Also ensure `package.json` scripts include: `"start": "next start -H 0.0.0.0 -p 3000"` and `"dev": "next dev -H 0.0.0.0 -p 3000"`.

---

### Step 2 — `src/lib/api/types.ts` — shared frontend types

These mirror the backend SessionResponse and SectionWithQuestions shapes from plans 02/03/04:

```typescript
// ─── Session types (from plan 02 sessionService.ts) ──────────────────────────

export type TeamType =
  | 'program_project'
  | 'platform_engineering'
  | 'infrastructure_cloud'
  | 'data_api_governance';

export type SubmissionStatus = 'draft' | 'submitted';

export interface SavedResponse {
  question_id: string;
  answer_payload: AnswerPayload;
}

export interface SessionResponse {
  session_id: string;
  token: string;
  role: 'respondent' | 'system_owner';
  is_returning: boolean;
  submission_status: SubmissionStatus;
  current_section_index: number;
  section_ids_ordered: string[];
  saved_responses: SavedResponse[];
  is_closed: boolean;
  due_date: string; // ISO 8601
}

// ─── Section/Question types (from plan 03) ───────────────────────────────────

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
  question_type:
    | 'single_choice'
    | 'multi_choice'
    | 'likert'
    | 'ranking'
    | 'free_text_short'
    | 'free_text_long';
  is_required: boolean;
  has_other: boolean;
  display_order: number;
  help_text: string | null;
  options: QuestionOption[];
}

export interface SectionWithQuestions {
  section_id: string;
  title: string;
  questions: Question[];
}

// ─── Answer payload types (mirror plan 03 answerPayloadSchemas) ──────────────

export interface SingleChoicePayload { type: 'single_choice'; value: string; other_text?: string }
export interface MultiChoicePayload  { type: 'multi_choice'; values: string[]; other_text?: string }
export interface LikertPayload       { type: 'likert'; value: 1 | 2 | 3 | 4 | 5 }
export interface RankingPayload      { type: 'ranking'; order: string[] }
export interface FreeTextShortPayload { type: 'free_text_short'; value: string }
export interface FreeTextLongPayload  { type: 'free_text_long'; value: string }

export type AnswerPayload =
  | SingleChoicePayload
  | MultiChoicePayload
  | LikertPayload
  | RankingPayload
  | FreeTextShortPayload
  | FreeTextLongPayload;

export interface ResponseItem {
  question_id: string;
  answer_payload: AnswerPayload;
}

export interface PutResponsesBody {
  section_id: string;
  current_section_index: number;
  responses: ResponseItem[];
}
```

---

### Step 3 — `src/lib/api/client.ts` — typed fetch wrapper

All functions add `Authorization: Bearer {token}` header. All errors throw with `{ code, message }` shape for hook-level error handling.

```typescript
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
```

---

### Step 4 — `src/hooks/useSession.ts`

Manages localStorage token + session_id, exposes createSession and resumeSession. On mount, checks localStorage for existing session_id and auto-resumes if present.

```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { SessionResponse } from '@/lib/api/types';
import { createSession as apiCreateSession, getSession } from '@/lib/api/client';

const SESSION_TOKEN_KEY = 'af_token';
const SESSION_ID_KEY = 'af_session_id';

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: attempt auto-resume from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (storedToken && storedSessionId) {
      setIsLoading(true);
      getSession(storedSessionId, storedToken)
        .then((sess) => {
          setSession(sess);
          setToken(sess.token); // fresh token from server
          localStorage.setItem(SESSION_TOKEN_KEY, sess.token);
        })
        .catch(() => {
          // Stale session — clear and let user re-enter
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(SESSION_ID_KEY);
          setError('Your previous session could not be found. Please re-enter your details.');
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  const createSession = useCallback(
    async (body: { email: string; name: string; team_type: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        const sess = await apiCreateSession(body);
        setSession(sess);
        setToken(sess.token);
        localStorage.setItem(SESSION_TOKEN_KEY, sess.token);
        localStorage.setItem(SESSION_ID_KEY, sess.session_id);
        return sess;
      } catch (err: unknown) {
        const e = err as { message?: string; code?: string };
        // US-7.3: System Owner email blocked — forward server message
        setError(e.message ?? 'An error occurred. Please try again.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resumeSession = useCallback(
    async (sessionId: string, existingToken: string) => {
      setIsLoading(true);
      try {
        const sess = await getSession(sessionId, existingToken);
        setSession(sess);
        setToken(sess.token);
        localStorage.setItem(SESSION_TOKEN_KEY, sess.token);
        localStorage.setItem(SESSION_ID_KEY, sess.session_id);
        return sess;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    setSession(null);
    setToken(null);
  }, []);

  return { session, token, isLoading, error, createSession, resumeSession, clearSession };
}
```

---

### Step 5 — `src/hooks/useSectionList.ts`

Fetches section list for the respondent's team type. Called once when the wizard mounts.

```typescript
'use client';
import { useState, useCallback } from 'react';
import type { SectionSummary } from '@/lib/api/types';
import { getSections } from '@/lib/api/client';

export function useSectionList() {
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSections = useCallback(async (teamType: string, token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { sections: list } = await getSections(teamType, token);
      setSections(list);
      return list;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Could not load sections. Please refresh.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sections, isLoading, error, loadSections };
}
```

---

### Step 6 — `src/hooks/useAutoSave.ts`

Navigate-triggered save + 30s idle timer + 3-retry exponential backoff. Navigation is NEVER blocked by save failure per US-4.1 AC.

```typescript
'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ResponseItem } from '@/lib/api/types';
import { putResponses } from '@/lib/api/client';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

// AUTO_SAVE_IDLE_SECONDS read from env var (US-4.2 AC: configurable without code deploy)
const IDLE_SECONDS =
  typeof window !== 'undefined' && (window as unknown as { NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS?: string })
    .NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS
    ? parseInt((window as unknown as { NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS: string }).NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS, 10)
    : 30;

async function saveWithRetry(
  fn: () => Promise<void>,
  retries = 3,
  delay = 1000
): Promise<void> {
  try {
    await fn();
  } catch {
    if (retries === 0) throw new Error('Max retries exceeded');
    await new Promise((r) => setTimeout(r, delay));
    return saveWithRetry(fn, retries - 1, delay * 2);
  }
}

export function useAutoSave({
  sessionId,
  token,
  sectionId,
  currentSectionIndex,
  getResponses,
}: {
  sessionId: string;
  token: string;
  sectionId: string;
  currentSectionIndex: number;
  getResponses: () => ResponseItem[];
}) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const performSave = useCallback(async () => {
    setSaveState('saving');
    const items = getResponses();
    try {
      await saveWithRetry(() =>
        putResponses(sessionId, {
          section_id: sectionId,
          current_section_index: currentSectionIndex,
          responses: items,
        }, token).then(() => undefined)
      );
      const now = new Date();
      setLastSavedAt(now);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [sessionId, token, sectionId, currentSectionIndex, getResponses]);

  // Called on any user interaction to reset idle timer (US-4.2 AC)
  const markDirty = useCallback(() => {
    setSaveState('dirty');
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      performSave();
    }, IDLE_SECONDS * 1000);
  }, [performSave]);

  // Called explicitly on Next/Previous navigation (US-4.1 AC)
  const triggerSave = useCallback(async () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    await performSave();
  }, [performSave]);

  return { saveState, lastSavedAt, triggerSave, markDirty };
}
```

---

### Step 7 — `src/components/assessment/SaveStateIndicator.tsx`

From UX-Mockup Screen 01 — top-right header indicator.

```tsx
'use client';
import type { SaveState } from '@/hooks/useAutoSave';

interface Props {
  saveState: SaveState;
  lastSavedAt: Date | null;
}

export function SaveStateIndicator({ saveState, lastSavedAt }: Props) {
  const timeStr = lastSavedAt
    ? lastSavedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <span className="text-sm text-gray-500 flex items-center gap-1" aria-live="polite">
      {saveState === 'saving' && (
        <><span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" />Saving…</>
      )}
      {saveState === 'saved' && (
        <><span className="text-green-600">💾</span>Saved at {timeStr}</>
      )}
      {saveState === 'dirty' && 'Unsaved changes'}
      {saveState === 'error' && 'Unsaved changes — server error. Retrying…'}
      {saveState === 'idle' && lastSavedAt && `Saved at ${timeStr}`}
    </span>
  );
}
```
  </action>
  <verify>
```bash
# next.config.mjs exists and does NOT have X-Frame-Options DENY
ls next.config.mjs && echo "CONFIG EXISTS"
grep "DENY" next.config.mjs && echo "ERROR: DENY present" || echo "NO DENY OK"
grep "frame-ancestors none" next.config.mjs && echo "ERROR: frame-ancestors none present" || echo "NO FRAME-ANCESTORS-NONE OK"
grep "0.0.0.0\|SAMEORIGIN" next.config.mjs && echo "CONFIG HEADERS OK"

# API client and types
grep -n "export.*createSession\|export.*putResponses" src/lib/api/client.ts && echo "CLIENT EXPORTS OK"
grep -n "export.*SessionResponse\|export.*AnswerPayload\|export.*Question\b" src/lib/api/types.ts && echo "TYPES OK"

# Hook exports
grep -n "export function useSession" src/hooks/useSession.ts && echo "USE_SESSION OK"
grep -n "export function useSectionList" src/hooks/useSectionList.ts && echo "USE_SECTION_LIST OK"
grep -n "export.*useAutoSave\|export type SaveState" src/hooks/useAutoSave.ts && echo "USE_AUTOSAVE OK"

# SaveStateIndicator
grep -n "export function SaveStateIndicator" src/components/assessment/SaveStateIndicator.tsx && echo "SAVE_INDICATOR OK"

# TypeScript compile
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"
```
  </verify>
  <done>
- next.config.mjs exports nextConfig with X-Frame-Options: SAMEORIGIN (NOT DENY); no CSP frame-ancestors none; dev/start scripts bind to 0.0.0.0:3000
- src/lib/api/types.ts exports all shared types: SessionResponse, TeamType, SubmissionStatus, SectionSummary, Question, QuestionOption, SectionWithQuestions, AnswerPayload (union), ResponseItem, PutResponsesBody
- src/lib/api/client.ts exports createSession, getSession, getSections, getQuestions, putResponses — all with typed params and Bearer token headers; throws { code, message } on non-2xx
- src/hooks/useSession.ts: on mount checks localStorage for stored session_id + token and auto-resumes; exposes createSession, resumeSession, clearSession; persists token + session_id to localStorage
- src/hooks/useSectionList.ts: exposes loadSections(teamType, token) calling GET /api/sections?teamType; returns SectionSummary[]
- src/hooks/useAutoSave.ts: SaveState type exported; markDirty resets 30s idle timer; triggerSave calls PUT /api/responses with 3-retry exponential backoff; navigation never blocked
- src/components/assessment/SaveStateIndicator.tsx: renders Saving / Saved at HH:MM / Unsaved changes / error states with aria-live polite
  </done>
</task>

<task type="auto">
  <name>Task 2: Identity form, resume banner, assessment wizard, progress bar, section screen, and all 6 question renderers</name>
  <files>
    src/components/identity/IdentityForm.tsx
    src/components/identity/ResumeBanner.tsx
    src/components/assessment/AssessmentWizard.tsx
    src/components/assessment/ProgressBar.tsx
    src/components/assessment/SectionScreen.tsx
    src/components/questions/QuestionRouter.tsx
    src/components/questions/SingleChoiceQuestion.tsx
    src/components/questions/MultiChoiceQuestion.tsx
    src/components/questions/LikertQuestion.tsx
    src/components/questions/RankingQuestion.tsx
    src/components/questions/FreeTextShortQuestion.tsx
    src/components/questions/FreeTextLongQuestion.tsx
    src/components/questions/OtherTextReveal.tsx
    src/app/layout.tsx
    src/app/page.tsx
    src/app/assessment/page.tsx
  </files>
  <action>
Implement the full visual respondent flow. All layouts follow UX-Mockup Screen 00 (Identity), Screen 01 (Section), and Screen 02 (Question Widgets). Use Tailwind CSS throughout.

---

### `src/components/identity/IdentityForm.tsx`

UX-Mockup Screen 00. The Start Assessment button is disabled until all 3 fields are valid (US-1.1 AC). Real-time inline validation on blur. Team type dropdown shows section count preview on selection.

```tsx
'use client';
import { useState } from 'react';
import type { TeamType } from '@/lib/api/types';

const TEAM_TYPE_OPTIONS: { value: TeamType; label: string; description: string }[] = [
  { value: 'program_project',       label: 'Program / Project',        description: 'Managing delivery, timelines, or roadmaps' },
  { value: 'platform_engineering',  label: 'Platform Engineering',     description: 'Building or operating developer tooling' },
  { value: 'infrastructure_cloud',  label: 'Infrastructure / Cloud',   description: 'Cloud, infrastructure, or SRE teams' },
  { value: 'data_api_governance',   label: 'Data / API Governance',    description: 'Data standards, APIs, or compliance' },
];

// Section counts per team type from FRD F03 routing table (RTM §3.3)
const SECTION_COUNTS: Record<TeamType, number> = {
  program_project: 5,
  platform_engineering: 7,
  infrastructure_cloud: 6,
  data_api_governance: 6,
};

interface Props {
  onSuccess: (params: { email: string; name: string; teamType: TeamType }) => Promise<void>;
  isLoading?: boolean;
  serverError?: string | null;
  dueDate?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function IdentityForm({ onSuccess, isLoading, serverError, dueDate }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [teamType, setTeamType] = useState<TeamType | ''>('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');

  const emailValid = isValidEmail(email);
  const nameValid = name.trim().length >= 2;
  const canSubmit = emailValid && nameValid && teamType !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !teamType) return;
    await onSuccess({ email: email.trim(), name: name.trim(), teamType });
  };

  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-lg p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Platform Assessment</h1>
          <p className="text-gray-600 mt-1">Help us understand your team's needs and readiness for Developer Platform tooling.</p>
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <span>⏱ ~15–20 minutes</span>
            <span>📋 {teamType ? SECTION_COUNTS[teamType] + ' sections' : 'sections'}</span>
            <span>🔒 Auto-saved</span>
          </div>
        </div>

        {/* Server error (e.g., System Owner email) */}
        {serverError && (
          <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Work Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailError(emailValid || !email ? '' : 'Please enter a valid email address.')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? 'border-red-400' : 'border-gray-300'}`}
              aria-describedby={emailError ? 'email-error' : undefined}
              aria-invalid={!!emailError}
              disabled={isLoading}
            />
            {emailError && <p id="email-error" className="text-red-600 text-xs mt-1">{emailError}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameError(nameValid || !name ? '' : 'Please enter your full name (at least 2 characters).')}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameError ? 'border-red-400' : 'border-gray-300'}`}
              aria-describedby={nameError ? 'name-error' : undefined}
              aria-invalid={!!nameError}
              disabled={isLoading}
            />
            {nameError && <p id="name-error" className="text-red-600 text-xs mt-1">{nameError}</p>}
          </div>

          {/* Team Type */}
          <div>
            <label htmlFor="team-type" className="block text-sm font-medium text-gray-700 mb-1">
              Your Team Type <span className="text-red-500">*</span>
            </label>
            <select
              id="team-type"
              value={teamType}
              onChange={(e) => setTeamType(e.target.value as TeamType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">Select your team type</option>
              {TEAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
              ))}
            </select>
            {/* Section count preview (US-1.1, UX Screen 00) */}
            {teamType && (
              <p className="mt-2 text-sm text-blue-700 bg-blue-50 rounded-md px-3 py-2">
                ℹ You'll complete {SECTION_COUNTS[teamType]} sections tailored to{' '}
                {TEAM_TYPE_OPTIONS.find((o) => o.value === teamType)?.label}.
              </p>
            )}
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isLoading ? 'Starting your assessment…' : 'Start Assessment →'}
          </button>

          {formattedDue && (
            <p className="text-center text-xs text-gray-400">Assessment closes: {formattedDue}</p>
          )}
        </form>
      </div>
    </div>
  );
}
```

---

### `src/components/identity/ResumeBanner.tsx`

UX-Mockup Screen 00 returning-respondent banner. Shown when `is_returning: true`.

```tsx
'use client';
import type { SessionResponse } from '@/lib/api/types';

interface Props {
  session: SessionResponse;
  onContinue: () => void;
}

export function ResumeBanner({ session, onContinue }: Props) {
  const sectionLabel = session.current_section_index + 1;
  const totalSections = session.section_ids_ordered?.length ?? '?';

  const editDeadline = session.due_date
    ? new Date(session.due_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-lg p-8 space-y-5">
        <div className="bg-green-50 border border-green-300 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-900">Welcome back!</p>
              <p className="text-green-800 text-sm mt-1">Your progress has been loaded.</p>
              <p className="text-green-800 text-sm">
                You left off at Section {sectionLabel} of {totalSections}.
              </p>
              {editDeadline && (
                <p className="text-green-700 text-sm mt-2">
                  Edit window open until: {editDeadline}
                </p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          Continue Assessment →
        </button>
      </div>
    </div>
  );
}
```

---

### `src/components/assessment/ProgressBar.tsx`

UX-Mockup Screen 01 step indicator. Segments clickable only when `submission_status === 'submitted'` AND `is_closed === false` (US-0.5 AC, US-5.2 AC).

```tsx
'use client';
import type { SectionSummary } from '@/lib/api/types';

interface Props {
  sections: SectionSummary[];
  currentIndex: number;
  canJump: boolean; // true when submitted + not closed (US-0.5)
  onJump?: (index: number) => void;
}

export function ProgressBar({ sections, currentIndex, canJump, onJump }: Props) {
  return (
    <nav aria-label="Assessment progress" className="flex items-center gap-1 overflow-x-auto py-2">
      {sections.map((section, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        const segmentClass = [
          'flex flex-col items-center flex-1 min-w-0 px-1',
          canJump ? 'cursor-pointer' : 'cursor-default',
        ].join(' ');

        const dotClass = [
          'w-4 h-4 rounded-full border-2 mb-1 transition-colors',
          isCompleted ? 'bg-blue-600 border-blue-600' : '',
          isCurrent ? 'bg-blue-200 border-blue-600' : '',
          !isCompleted && !isCurrent ? 'bg-white border-gray-300' : '',
        ].join(' ');

        const labelClass = 'text-xs text-center leading-tight truncate max-w-full ' +
          (isCurrent ? 'font-semibold text-gray-800' : 'text-gray-500');

        const step = (
          <div
            key={section.section_id}
            className={segmentClass}
            onClick={() => canJump && onJump?.(idx)}
            role={canJump ? 'button' : undefined}
            tabIndex={canJump ? 0 : undefined}
            onKeyDown={(e) => { if (canJump && (e.key === 'Enter' || e.key === ' ')) onJump?.(idx); }}
            aria-label={`${isCompleted ? 'Completed: ' : isCurrent ? 'Current: ' : 'Upcoming: '}Section ${idx + 1}, ${section.title}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div className={dotClass} />
            <span className={labelClass}>{section.title}</span>
          </div>
        );

        return step;
      })}
    </nav>
  );
}
```

---

### `src/components/assessment/SectionScreen.tsx`

Renders one section's questions via QuestionRouter. Shows re-entry banner / closed banner / validation error banner. Handles required-question blocking on Next (US-0.4 AC).

```tsx
'use client';
import { useState, useCallback } from 'react';
import type { Question, AnswerPayload } from '@/lib/api/types';
import { QuestionRouter } from '@/components/questions/QuestionRouter';

interface Props {
  sectionTitle: string;
  questions: Question[];
  answers: Record<string, AnswerPayload>;
  onAnswerChange: (questionId: string, payload: AnswerPayload) => void;
  onNext: () => void;
  onPrevious?: () => void;
  isFirstSection: boolean;
  isLastSection: boolean;
  isReadOnly?: boolean;
  isClosed?: boolean;
  isReEntry?: boolean;
  dueDate?: string;
}

function isFilled(q: Question, answers: Record<string, AnswerPayload>): boolean {
  const a = answers[q.question_id];
  if (!a) return false;
  if (a.type === 'single_choice') return !!a.value;
  if (a.type === 'multi_choice') return a.values.length > 0;
  if (a.type === 'likert') return typeof a.value === 'number';
  if (a.type === 'ranking') return a.order.length > 0;
  if (a.type === 'free_text_short' || a.type === 'free_text_long') return a.value.trim().length > 0;
  return false;
}

export function SectionScreen({
  sectionTitle, questions, answers, onAnswerChange,
  onNext, onPrevious, isFirstSection, isLastSection,
  isReadOnly, isClosed, isReEntry, dueDate,
}: Props) {
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [sectionError, setSectionError] = useState('');

  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const handleNext = useCallback(() => {
    if (isReadOnly) { onNext(); return; }
    // Validate required questions (US-0.4 AC)
    const errors: Record<string, string> = {};
    for (const q of questions) {
      if (q.is_required && !isFilled(q, answers)) {
        errors[q.question_id] = 'This question requires an answer.';
      }
    }
    if (Object.keys(errors).length > 0) {
      setQuestionErrors(errors);
      setSectionError('Please answer all required questions before continuing.');
      return;
    }
    setQuestionErrors({});
    setSectionError('');
    onNext();
  }, [questions, answers, isReadOnly, onNext]);

  return (
    <div className="space-y-6">
      {/* Assessment Closed Banner (US-9.3) */}
      {isClosed && (
        <div role="alert" className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4 flex gap-3">
          <span>🔒</span>
          <p className="text-sm">This assessment is now closed. Your responses are saved and have been submitted to the System Owner.</p>
        </div>
      )}

      {/* Re-Entry Banner (US-9.2) */}
      {isReEntry && !isClosed && (
        <div role="alert" className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4 flex gap-3">
          <span>⚠</span>
          <p className="text-sm">
            You've already submitted your assessment.{' '}
            {formattedDue ? `You can update your answers until ${formattedDue}.` : 'Edit window is open.'}
          </p>
        </div>
      )}

      {/* Section title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{sectionTitle}</h2>
      </div>

      {/* Validation error banner (US-0.4) */}
      {sectionError && (
        <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm">
          ⚠ {sectionError}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((question, idx) => (
          <QuestionRouter
            key={question.question_id}
            question={question}
            questionNumber={idx + 1}
            value={answers[question.question_id] ?? null}
            onChange={(payload) => onAnswerChange(question.question_id, payload)}
            errorMessage={questionErrors[question.question_id]}
            readOnly={isReadOnly || isClosed}
          />
        ))}
      </div>

      {/* Navigation controls (UX Screen 01) */}
      {!isClosed && (
        <div className="flex justify-between pt-6 border-t border-gray-200">
          {!isFirstSection && onPrevious ? (
            <button
              onClick={onPrevious}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isLastSection ? 'Review Answers' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### `src/components/assessment/AssessmentWizard.tsx`

Orchestrates the full section-by-section flow. Manages current section index, answer state, loads section list, loads questions per section, wires useAutoSave. Handles re-entry and closed modes.

```tsx
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionResponse, SectionSummary, Question, AnswerPayload, ResponseItem } from '@/lib/api/types';
import { useSectionList } from '@/hooks/useSectionList';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getQuestions } from '@/lib/api/client';
import { ProgressBar } from './ProgressBar';
import { SectionScreen } from './SectionScreen';
import { SaveStateIndicator } from './SaveStateIndicator';

interface Props {
  session: SessionResponse;
  token: string;
}

export function AssessmentWizard({ session, token }: Props) {
  const router = useRouter();
  const { sections, loadSections } = useSectionList();
  const [currentIndex, setCurrentIndex] = useState(session.current_section_index);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerPayload>>(() => {
    const initial: Record<string, AnswerPayload> = {};
    for (const r of session.saved_responses) {
      initial[r.question_id] = r.answer_payload;
    }
    return initial;
  });
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const teamType = useRef<string>('');

  // Determine display modes from session
  const isReEntry = session.submission_status === 'submitted' && !session.is_closed;
  const isClosed = session.is_closed;
  const canJump = isReEntry; // US-0.5: clickable only when submitted + open

  // Load section list on mount
  useEffect(() => {
    // We need team_type from session — it's stored on respondent; we infer from section_ids_ordered
    // The backend returns section_ids_ordered in SessionResponse; fetch sections for the team type
    // For the section list, we use the JWT which has email — use GET /api/sections with stored team type
    // team_type isn't in SessionResponse directly; call loadSections with the teamType from session metadata
    // Use a placeholder: the backend section API is team-type-aware, so we load using the respondent's
    // section_ids_ordered to re-derive teamType OR we store it in localStorage at session creation.
    // Simplest approach: store teamType in localStorage during identity form creation.
    const storedTeamType = localStorage.getItem('af_team_type') ?? '';
    teamType.current = storedTeamType;
    if (storedTeamType) {
      loadSections(storedTeamType, token);
    }
  }, [token, loadSections]);

  // Load questions for current section
  const currentSection: SectionSummary | null = sections[currentIndex] ?? null;
  useEffect(() => {
    if (!currentSection) return;
    setIsLoadingQuestions(true);
    getQuestions(currentSection.section_id, token)
      .then((data) => setCurrentQuestions(data.questions))
      .catch(console.error)
      .finally(() => setIsLoadingQuestions(false));
  }, [currentSection?.section_id, token]);

  // Build ResponseItem[] for the current section (for auto-save)
  const getResponses = useCallback((): ResponseItem[] =>
    currentQuestions
      .filter((q) => !!answers[q.question_id])
      .map((q) => ({ question_id: q.question_id, answer_payload: answers[q.question_id] })),
    [currentQuestions, answers]
  );

  const { saveState, lastSavedAt, triggerSave, markDirty } = useAutoSave({
    sessionId: session.session_id,
    token,
    sectionId: currentSection?.section_id ?? '',
    currentSectionIndex: currentIndex,
    getResponses,
  });

  const handleAnswerChange = useCallback((questionId: string, payload: AnswerPayload) => {
    setAnswers((prev) => ({ ...prev, [questionId]: payload }));
    markDirty();
  }, [markDirty]);

  const handleNext = useCallback(async () => {
    await triggerSave(); // US-4.1: auto-save on navigation
    if (currentIndex >= sections.length - 1) {
      router.push('/assessment/review');
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, sections.length, triggerSave, router]);

  const handlePrevious = useCallback(async () => {
    await triggerSave(); // US-4.1: auto-save on Previous too
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, [triggerSave]);

  const handleJump = useCallback(async (index: number) => {
    if (!canJump) return;
    await triggerSave();
    setCurrentIndex(index);
  }, [canJump, triggerSave]);

  if (!sections.length || !currentSection) {
    return <div className="flex justify-center items-center h-64 text-gray-500">Loading assessment…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <span className="font-semibold text-gray-800">AssessmentForm-Express</span>
        <SaveStateIndicator saveState={saveState} lastSavedAt={lastSavedAt} />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <ProgressBar
          sections={sections}
          currentIndex={currentIndex}
          canJump={canJump}
          onJump={handleJump}
        />

        <p className="text-sm text-gray-500">
          Section {currentIndex + 1} of {sections.length} — {currentSection.title}
        </p>

        {isLoadingQuestions ? (
          <div className="text-gray-400 py-8 text-center">Loading questions…</div>
        ) : (
          <SectionScreen
            sectionTitle={currentSection.title}
            questions={currentQuestions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onNext={handleNext}
            onPrevious={currentIndex > 0 ? handlePrevious : undefined}
            isFirstSection={currentIndex === 0}
            isLastSection={currentIndex === sections.length - 1}
            isReadOnly={isClosed}
            isClosed={isClosed}
            isReEntry={isReEntry}
            dueDate={session.due_date}
          />
        )}
      </main>
    </div>
  );
}
```

---

### `src/components/questions/OtherTextReveal.tsx`

UX Screen 02 "Other" state machine. Auto-focuses on reveal; clears value on hide (US-2.2 AC).

```tsx
'use client';
import { useEffect, useRef } from 'react';

interface Props {
  isVisible: boolean;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}

export function OtherTextReveal({ isVisible, value, onChange, maxLength = 500 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus(); // US-2.2: auto-focus on reveal
    }
    if (!isVisible && value) {
      onChange(''); // US-2.2: clear value on hide
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="mt-2 pl-6" aria-expanded={isVisible}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder="Please specify your 'Other' answer."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Other text input"
      />
      <p className="text-xs text-gray-400 mt-1 text-right">{value.length}/{maxLength}</p>
    </div>
  );
}
```

---

### `src/components/questions/QuestionRouter.tsx`

Dispatches to the correct renderer by `question.question_type`.

```tsx
'use client';
import type { Question, AnswerPayload } from '@/lib/api/types';
import { SingleChoiceQuestion } from './SingleChoiceQuestion';
import { MultiChoiceQuestion } from './MultiChoiceQuestion';
import { LikertQuestion } from './LikertQuestion';
import { RankingQuestion } from './RankingQuestion';
import { FreeTextShortQuestion } from './FreeTextShortQuestion';
import { FreeTextLongQuestion } from './FreeTextLongQuestion';

interface Props {
  question: Question;
  questionNumber: number;
  value: AnswerPayload | null;
  onChange: (payload: AnswerPayload) => void;
  errorMessage?: string;
  readOnly?: boolean;
}

export function QuestionRouter({ question, questionNumber, value, onChange, errorMessage, readOnly }: Props) {
  const label = (
    <p className="text-sm font-medium text-gray-800 mb-3">
      Q{questionNumber}. {question.question_text}
      {question.is_required && <span className="text-red-500 ml-1">*</span>}
    </p>
  );

  const error = errorMessage && (
    <p className="text-red-600 text-xs mt-1" role="alert">{errorMessage}</p>
  );

  return (
    <div className={`rounded-lg border p-4 ${errorMessage ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
      {label}
      {question.question_type === 'single_choice' && (
        <SingleChoiceQuestion question={question} value={value?.type === 'single_choice' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'multi_choice' && (
        <MultiChoiceQuestion question={question} value={value?.type === 'multi_choice' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'likert' && (
        <LikertQuestion question={question} value={value?.type === 'likert' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'ranking' && (
        <RankingQuestion question={question} value={value?.type === 'ranking' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'free_text_short' && (
        <FreeTextShortQuestion question={question} value={value?.type === 'free_text_short' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'free_text_long' && (
        <FreeTextLongQuestion question={question} value={value?.type === 'free_text_long' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {error}
    </div>
  );
}
```

---

### `src/components/questions/SingleChoiceQuestion.tsx`

Radio buttons with OtherTextReveal (UX Screen 02). Payload shape: `{ type: 'single_choice', value, other_text? }`.

```tsx
'use client';
import type { Question, SingleChoicePayload } from '@/lib/api/types';
import { OtherTextReveal } from './OtherTextReveal';

interface Props {
  question: Question;
  value: SingleChoicePayload | null;
  onChange: (p: SingleChoicePayload) => void;
  readOnly?: boolean;
}

export function SingleChoiceQuestion({ question, value, onChange, readOnly }: Props) {
  const selected = value?.value ?? '';
  const otherText = value?.other_text ?? '';
  const hasOther = question.options.some((o) => o.is_other);

  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <div key={opt.option_id}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={question.question_id}
              value={opt.option_id}
              checked={selected === opt.option_id}
              onChange={() => onChange({ type: 'single_choice', value: opt.option_id, other_text: opt.is_other ? otherText : undefined })}
              disabled={readOnly}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-800">{opt.option_text}</span>
          </label>
          {opt.is_other && (
            <OtherTextReveal
              isVisible={selected === opt.option_id}
              value={otherText}
              onChange={(v) => onChange({ type: 'single_choice', value: opt.option_id, other_text: v })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### `src/components/questions/MultiChoiceQuestion.tsx`

Checkboxes with OtherTextReveal (UX Screen 02). Payload: `{ type: 'multi_choice', values, other_text? }`.

```tsx
'use client';
import type { Question, MultiChoicePayload } from '@/lib/api/types';
import { OtherTextReveal } from './OtherTextReveal';

interface Props {
  question: Question;
  value: MultiChoicePayload | null;
  onChange: (p: MultiChoicePayload) => void;
  readOnly?: boolean;
}

export function MultiChoiceQuestion({ question, value, onChange, readOnly }: Props) {
  const selected = value?.values ?? [];
  const otherText = value?.other_text ?? '';
  const otherOpt = question.options.find((o) => o.is_other);

  const toggle = (optId: string, isOther: boolean) => {
    const next = selected.includes(optId)
      ? selected.filter((v) => v !== optId)
      : [...selected, optId];
    const newOtherText = isOther && !next.includes(optId) ? '' : otherText;
    onChange({ type: 'multi_choice', values: next, other_text: newOtherText || undefined });
  };

  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <div key={opt.option_id}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt.option_id)}
              onChange={() => toggle(opt.option_id, opt.is_other)}
              disabled={readOnly}
              className="accent-blue-600 w-4 h-4"
            />
            <span className="text-sm text-gray-800">{opt.option_text}</span>
          </label>
          {opt.is_other && (
            <OtherTextReveal
              isVisible={selected.includes(opt.option_id)}
              value={otherText}
              onChange={(v) => onChange({ type: 'multi_choice', values: selected, other_text: v || undefined })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### `src/components/questions/LikertQuestion.tsx`

5-point radio group with keyboard arrow navigation and ARIA radiogroup (US-2.3 AC, UX Screen 02).

```tsx
'use client';
import type { Question, LikertPayload } from '@/lib/api/types';

interface Props {
  question: Question;
  value: LikertPayload | null;
  onChange: (p: LikertPayload) => void;
  readOnly?: boolean;
}

export function LikertQuestion({ question, value, onChange, readOnly }: Props) {
  const selected = value?.value ?? null;

  const handleKeyDown = (e: React.KeyboardEvent, current: number) => {
    if (readOnly) return;
    if (e.key === 'ArrowRight' && current < 5) onChange({ type: 'likert', value: (current + 1) as LikertPayload['value'] });
    if (e.key === 'ArrowLeft' && current > 1) onChange({ type: 'likert', value: (current - 1) as LikertPayload['value'] });
  };

  return (
    <div
      role="radiogroup"
      aria-label={`Likert scale 1-5 for: ${question.question_text}`}
      className="space-y-3"
    >
      <div className="flex justify-between text-xs text-gray-500 px-1">
        <span>Strongly Disagree</span>
        <span>Strongly Agree</span>
      </div>
      <div className="flex justify-between gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <label key={n} className="flex flex-col items-center gap-1 cursor-pointer flex-1">
            <input
              type="radio"
              name={question.question_id}
              value={n}
              checked={selected === n}
              onChange={() => onChange({ type: 'likert', value: n })}
              onKeyDown={(e) => handleKeyDown(e, selected ?? 0)}
              disabled={readOnly}
              className="accent-blue-600"
              aria-label={`${n}`}
            />
            <span className="text-sm text-gray-700">{n}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

---

### `src/components/questions/RankingQuestion.tsx`

dnd-kit drag-and-drop primary + numbered input fallback + up/down buttons (US-2.4 AC, UX Screen 02). Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.

```tsx
'use client';
import { useMemo } from 'react';
import type { Question, RankingPayload } from '@/lib/api/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({
  id, label, rank, total, onChange, onMoveUp, onMoveDown, readOnly,
}: {
  id: string; label: string; rank: number; total: number;
  onChange: (v: string) => void; onMoveUp: () => void; onMoveDown: () => void; readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
      {!readOnly && (
        <span
          {...attributes}
          {...listeners}
          className="text-gray-400 cursor-grab text-lg select-none"
          aria-label={`Drag handle for ${label}`}
        >
          ≡
        </span>
      )}
      <span className="flex-1 text-sm text-gray-800">{label}</span>
      <input
        type="number"
        min={1}
        max={total}
        value={rank}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        className="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center"
        aria-label={`Rank for ${label}`}
      />
      {!readOnly && (
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={rank === 1} className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 leading-none" aria-label={`Move ${label} up`}>▲</button>
          <button onClick={onMoveDown} disabled={rank === total} className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 leading-none" aria-label={`Move ${label} down`}>▼</button>
        </div>
      )}
    </div>
  );
}

interface Props {
  question: Question;
  value: RankingPayload | null;
  onChange: (p: RankingPayload) => void;
  readOnly?: boolean;
}

export function RankingQuestion({ question, value, onChange, readOnly }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const order = useMemo(() => {
    if (value?.order && value.order.length === question.options.length) return value.order;
    return question.options.map((o) => o.option_id);
  }, [value, question.options]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(active.id as string);
      const newIdx = order.indexOf(over.id as string);
      onChange({ type: 'ranking', order: arrayMove(order, oldIdx, newIdx) });
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= order.length) return;
    onChange({ type: 'ranking', order: arrayMove(order, index, newIdx) });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Drag to reorder, or enter numbers directly</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((optId, idx) => {
            const opt = question.options.find((o) => o.option_id === optId);
            if (!opt) return null;
            return (
              <SortableItem
                key={optId}
                id={optId}
                label={opt.option_text}
                rank={idx + 1}
                total={order.length}
                onChange={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n >= 1 && n <= order.length) {
                    onChange({ type: 'ranking', order: arrayMove(order, idx, n - 1) });
                  }
                }}
                onMoveUp={() => moveItem(idx, -1)}
                onMoveDown={() => moveItem(idx, 1)}
                readOnly={readOnly}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

---

### `src/components/questions/FreeTextShortQuestion.tsx`

Single-line input, max 500 chars, char counter turns amber at ≥400, red at ≥480 (UX Screen 02, US-2.5 AC).

```tsx
'use client';
import type { Question, FreeTextShortPayload } from '@/lib/api/types';

interface Props {
  question: Question;
  value: FreeTextShortPayload | null;
  onChange: (p: FreeTextShortPayload) => void;
  readOnly?: boolean;
}

const MAX = 500;

export function FreeTextShortQuestion({ question, value, onChange, readOnly }: Props) {
  const text = value?.value ?? '';
  const counterClass = text.length >= 480 ? 'text-red-500' : text.length >= 400 ? 'text-amber-500' : 'text-gray-400';

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => onChange({ type: 'free_text_short', value: e.target.value })}
        maxLength={MAX}
        disabled={readOnly}
        placeholder={question.help_text ?? undefined}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={question.question_text}
      />
      <p className={`text-xs mt-1 text-right ${counterClass}`}>{text.length}/{MAX}</p>
    </div>
  );
}
```

---

### `src/components/questions/FreeTextLongQuestion.tsx`

Textarea with resize handle, max 2000 chars, char counter turns amber at ≥1800, red at ≥1950 (UX Screen 02, US-2.5 AC).

```tsx
'use client';
import type { Question, FreeTextLongPayload } from '@/lib/api/types';

interface Props {
  question: Question;
  value: FreeTextLongPayload | null;
  onChange: (p: FreeTextLongPayload) => void;
  readOnly?: boolean;
}

const MAX = 2000;

export function FreeTextLongQuestion({ question, value, onChange, readOnly }: Props) {
  const text = value?.value ?? '';
  const counterClass = text.length >= 1950 ? 'text-red-500' : text.length >= 1800 ? 'text-amber-500' : 'text-gray-400';

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => onChange({ type: 'free_text_long', value: e.target.value })}
        maxLength={MAX}
        disabled={readOnly}
        rows={5}
        placeholder={question.help_text ?? undefined}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        aria-label={question.question_text}
      />
      <p className={`text-xs mt-1 text-right ${counterClass}`}>{text.length}/{MAX}</p>
    </div>
  );
}
```

---

### `src/app/layout.tsx`

Root layout. No X-Frame-Options DENY headers (enforced by next.config.mjs).

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Developer Platform Assessment',
  description: 'AssessmentForm-Express',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

---

### `src/app/page.tsx`

Landing / Identity Capture route (UX Screen 00). Wires useSession to IdentityForm and ResumeBanner.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { IdentityForm } from '@/components/identity/IdentityForm';
import { ResumeBanner } from '@/components/identity/ResumeBanner';
import type { TeamType } from '@/lib/api/types';

export default function HomePage() {
  const router = useRouter();
  const { session, isLoading, error, createSession, clearSession } = useSession();
  const [showResume, setShowResume] = useState(false);

  // After auto-resume check: if returning, show resume banner
  useEffect(() => {
    if (session?.is_returning) setShowResume(true);
  }, [session]);

  const handleIdentitySubmit = async ({
    email, name, teamType,
  }: { email: string; name: string; teamType: TeamType }) => {
    try {
      localStorage.setItem('af_team_type', teamType); // store for AssessmentWizard
      const sess = await createSession({ email, name, team_type: teamType });
      if (sess.is_returning) {
        setShowResume(true);
      } else {
        router.push('/assessment');
      }
    } catch {
      // error is surfaced via useSession.error
    }
  };

  const handleContinue = () => {
    router.push('/assessment');
  };

  // System Owner role: show error (US-7.3)
  const displayError = error ?? (session?.role === 'system_owner'
    ? 'This email is registered as a System Owner. Please access the dashboard instead.'
    : null);

  if (showResume && session) {
    return <ResumeBanner session={session} onContinue={handleContinue} />;
  }

  return (
    <IdentityForm
      onSuccess={handleIdentitySubmit}
      isLoading={isLoading}
      serverError={displayError}
      dueDate={session?.due_date}
    />
  );
}
```

---

### `src/app/assessment/page.tsx`

Assessment wizard route. Reads session from localStorage (via useSession), renders AssessmentWizard.

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard';

export default function AssessmentPage() {
  const router = useRouter();
  const { session, token, isLoading } = useSession();

  // Guard: no session → redirect to identity form
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/');
    }
  }, [session, isLoading, router]);

  if (isLoading || !session || !token) {
    return <div className="flex justify-center items-center h-screen text-gray-400">Loading…</div>;
  }

  return <AssessmentWizard session={session} token={token} />;
}
```
  </action>
  <verify>
```bash
# Component exports
grep -n "export function IdentityForm" src/components/identity/IdentityForm.tsx && echo "IDENTITY_FORM OK"
grep -n "export function ResumeBanner" src/components/identity/ResumeBanner.tsx && echo "RESUME_BANNER OK"
grep -n "export function AssessmentWizard" src/components/assessment/AssessmentWizard.tsx && echo "WIZARD OK"
grep -n "export function ProgressBar" src/components/assessment/ProgressBar.tsx && echo "PROGRESS_BAR OK"
grep -n "export function SectionScreen" src/components/assessment/SectionScreen.tsx && echo "SECTION_SCREEN OK"
grep -n "export function QuestionRouter" src/components/questions/QuestionRouter.tsx && echo "QUESTION_ROUTER OK"
grep -n "export function OtherTextReveal" src/components/questions/OtherTextReveal.tsx && echo "OTHER_REVEAL OK"

# All 6 question renderers
for f in SingleChoiceQuestion MultiChoiceQuestion LikertQuestion RankingQuestion FreeTextShortQuestion FreeTextLongQuestion; do
  grep -qn "export function $f" "src/components/questions/${f}.tsx" && echo "$f OK" || echo "MISSING: $f"
done

# UX compliance: Next/Previous labels
grep -n "Review Answers\|← Previous" src/components/assessment/SectionScreen.tsx && echo "NAV LABELS OK"

# ARIA in Likert
grep -n "role=\"radiogroup\"\|aria-label" src/components/questions/LikertQuestion.tsx && echo "LIKERT ARIA OK"

# ProgressBar: clickable only when canJump
grep -n "canJump" src/components/assessment/ProgressBar.tsx && echo "JUMP GUARD OK"

# OtherTextReveal: auto-focus and clear on hide
grep -n "auto-focus\|focus()\|onChange.*''" src/components/questions/OtherTextReveal.tsx && echo "OTHER_REVEAL BEHAVIOR OK"

# Char counters in free text
grep -n "amber\|red.*text-" src/components/questions/FreeTextShortQuestion.tsx && echo "COUNTER COLORS OK"
grep -n "amber\|red.*text-" src/components/questions/FreeTextLongQuestion.tsx && echo "LONG_COUNTER COLORS OK"

# dnd-kit imported
grep -n "from '@dnd-kit" src/components/questions/RankingQuestion.tsx && echo "DND-KIT OK"

# Routes exist
ls src/app/page.tsx src/app/assessment/page.tsx && echo "ROUTES OK"

# TypeScript compile
npx tsc --noEmit 2>&1 | head -30 && echo "TSC OK"

# Dev server starts on 0.0.0.0:3000
npm run dev -- --help 2>&1 | head -5 || true
```
  </verify>
  <done>
- IdentityForm: 3-field form (email RFC 5322 validated on blur, name ≥2 chars, team type dropdown with descriptions); Start Assessment disabled until all valid; shows section count preview after team type select; displays server error banner for System Owner email; loading spinner during POST
- ResumeBanner: shows Welcome back message with saved section index and edit deadline from session.due_date; Continue Assessment CTA
- AssessmentWizard: section navigation state machine; stores teamType in localStorage for section list fetch; loads sections via useSectionList; loads questions per section via getQuestions; wires useAutoSave with triggerSave on Next/Previous; handles is_closed (read-only) and isReEntry (re-entry banner) modes; canJump=true only when submitted + not closed
- ProgressBar: filled/current/future dot segments; ARIA step labels; clickable only when canJump=true; keyboard accessible
- SectionScreen: renders QuestionRouter per question; shows re-entry banner and closed banner; validates required questions on Next click; shows section-level error banner and per-field errors on Next failure; Previous hidden on first section; Next label = "Review Answers" on last section; navigation disabled/hidden when closed
- SaveStateIndicator: idle/dirty/saving/saved/error states with aria-live polite
- QuestionRouter: dispatches by question_type to 6 renderers; shows per-question error wrapper with red border
- SingleChoiceQuestion: radio buttons, OtherTextReveal when option.is_other, payload { type: 'single_choice', value, other_text? }
- MultiChoiceQuestion: checkboxes, OtherTextReveal for other option, payload { type: 'multi_choice', values, other_text? }
- LikertQuestion: role=radiogroup, aria-label, keyboard arrow navigation, 5 radio buttons 1-5 with endpoint labels
- RankingQuestion: dnd-kit DndContext + SortableContext drag-and-drop reorder; numbered input fallback; ▲▼ up/down buttons; payload { type: 'ranking', order }
- FreeTextShortQuestion: single-line input, max 500, counter turns amber at 400+, red at 480+
- FreeTextLongQuestion: textarea with resize, max 2000, counter turns amber at 1800+, red at 1950+
- OtherTextReveal: hidden when not selected; auto-focuses on reveal; value cleared on hide; aria-expanded on parent
- src/app/page.tsx: wires useSession → IdentityForm/ResumeBanner; stores teamType in localStorage; routes to /assessment on new session or Continue on resume
- src/app/assessment/page.tsx: reads session from useSession; redirects to / if no session; renders AssessmentWizard
- TypeScript compiles without errors (tsc --noEmit)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API | All respondent-supplied form inputs (email, name, team_type, answer payloads) crossing from the browser into Next.js API routes over the same-origin fetch |
| localStorage→client | session_id and token read from localStorage and used to rehydrate session; tampered values flow into API calls |
| API response→render | Server-returned session data (name, section titles, question text, saved_responses) crossing into React render tree |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01 | Spoofing | `src/hooks/useSession.ts` localStorage token resume | mitigate | On auto-resume, `getSession(sessionId, storedToken)` sends the stored JWT to the server; `jwtMiddleware` (plan 02, `src/lib/auth/jwtMiddleware.ts`) verifies the HS256 signature and expiry. A tampered or expired localStorage token triggers a 401 from the server, which clears localStorage and shows the stale-session error. Client never trusts the token without server verification. |
| T-06-02 | Information disclosure | `src/app/page.tsx` System Owner role detection | mitigate | After `createSession()`, if `session.role === 'system_owner'`, the client immediately surfaces the "This email is registered as a System Owner" error and does NOT navigate to `/assessment`. No respondent form is rendered. The server already returns 403 `SYSTEM_OWNER_CANNOT_RESPOND` from plan 02; this is double-enforcement on the client side. |
| T-06-03 | Tampering | `src/lib/api/client.ts` apiFetch error handling | mitigate | `apiFetch` never silently swallows non-2xx responses; it throws with `{ code, message }` from the server's error envelope. UI components display only the server-provided message string — never raw stack traces or internal error details. |
| T-06-04 | Elevation of privilege | `src/components/assessment/ProgressBar.tsx` section jump | mitigate | `canJump` prop is `true` only when `session.submission_status === 'submitted' && !session.is_closed` (computed in `AssessmentWizard`). The server validates ownership on every PUT /api/responses call via `requireSessionOwner` (plan 04). A user cannot inject a different session_id to jump into another respondent's session — the JWT email check is server-side. |
| T-06-05 | Tampering | `src/components/questions/RankingQuestion.tsx` numbered input | mitigate | Ranked position from numbered input is parsed with `parseInt` and validated against `[1, order.length]` before `arrayMove` is called — malformed or out-of-range values are ignored client-side. The server-side `RankingPayloadSchema` (plan 03) provides a second layer of validation on `PUT /api/responses`. |
| T-06-06 | Information disclosure | `next.config.mjs` framing policy | accept | `X-Frame-Options: SAMEORIGIN` allows same-origin embedding (required per constraint: enterprise portal embedding). Cross-origin framing is blocked. Respondent data is not accessible via CSS/JS injection from a framing page. Residual risk: same-origin pages can embed the form; this is intended enterprise behavior accepted by the project owner. |
</threat_model>

<verification>
## Wave 6 (3a-part1) — Respondent SPA Verification

After all tasks complete:

```bash
# 1. Next.js config — must NOT have X-Frame-Options DENY or frame-ancestors none
grep "DENY" next.config.mjs && echo "FAIL: DENY found" || echo "NO DENY OK"
grep "frame-ancestors.*none" next.config.mjs && echo "FAIL: frame-ancestors none found" || echo "NO FRAME-ANCESTORS-NONE OK"
grep "SAMEORIGIN\|0.0.0.0" next.config.mjs && echo "CONFIG OK"

# 2. All exported hooks and components
grep -n "export function useSession" src/hooks/useSession.ts
grep -n "export function useSectionList" src/hooks/useSectionList.ts
grep -n "export.*useAutoSave\|export type SaveState" src/hooks/useAutoSave.ts
grep -n "export.*createSession\|export.*putResponses" src/lib/api/client.ts

# 3. All 6 question renderers
for f in SingleChoiceQuestion MultiChoiceQuestion LikertQuestion RankingQuestion FreeTextShortQuestion FreeTextLongQuestion; do
  grep -qn "export function $f" "src/components/questions/${f}.tsx" && echo "$f PRESENT" || echo "MISSING $f"
done

# 4. Critical UX behaviors
grep -n "Review Answers" src/components/assessment/SectionScreen.tsx && echo "LAST_SECTION_LABEL OK"
grep -n "Please answer all required" src/components/assessment/SectionScreen.tsx && echo "REQUIRED_BLOCK OK"
grep -n "aria-live" src/components/assessment/SaveStateIndicator.tsx && echo "LIVE_REGION OK"
grep -n "role=\"radiogroup\"" src/components/questions/LikertQuestion.tsx && echo "LIKERT_ARIA OK"
grep -n "canJump" src/components/assessment/ProgressBar.tsx && echo "JUMP_GUARD OK"
grep -n "markDirty\|triggerSave" src/components/assessment/AssessmentWizard.tsx && echo "AUTOSAVE_WIRED OK"

# 5. useAutoSave: 30s idle + 3 retries
grep -n "IDLE_SECONDS\|30" src/hooks/useAutoSave.ts && echo "IDLE_TIMER OK"
grep -n "saveWithRetry\|retries.*3\|retries = 3" src/hooks/useAutoSave.ts && echo "RETRY_OK"

# 6. localStorage persistence
grep -n "af_token\|af_session_id" src/hooks/useSession.ts && echo "LOCALSTORAGE OK"
grep -n "af_team_type" src/app/page.tsx && echo "TEAM_TYPE_STORED OK"

# 7. TypeScript clean compile
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10 || echo "TSC CLEAN"

# 8. Dev server starts (functional smoke test)
# npm run dev &
# sleep 8
# curl -s http://localhost:3000/ | grep -q "Developer Platform Assessment" && echo "PAGE LOADS OK"
# kill %1
```
</verification>

<success_criteria>
- next.config.mjs: X-Frame-Options is SAMEORIGIN (not DENY); no CSP frame-ancestors none; dev/start scripts bind to 0.0.0.0:3000
- All API client functions (createSession, getSession, getSections, getQuestions, putResponses) exported from src/lib/api/client.ts with typed params and Bearer auth headers
- useSession: auto-resumes from localStorage on mount; persists token + session_id; exposes createSession and clearSession
- useAutoSave: triggerSave calls PUT /api/responses with 3-retry exponential backoff (1s/2s/4s); markDirty starts 30s idle timer; navigation never blocked by save failure; SaveState transitions: idle → dirty → saving → saved/error
- useSectionList: loadSections fetches GET /api/sections?teamType and returns SectionSummary[]
- IdentityForm: Start Assessment disabled until email (RFC 5322), name (≥2 non-whitespace), teamType all valid; section count preview after team type select; shows server error for System Owner email; loading state during POST
- ResumeBanner: shows section index and edit deadline from session.due_date on is_returning=true
- AssessmentWizard: Previous hidden on section 0; Next becomes "Review Answers" on last section; triggers auto-save on every Next/Previous; navigates to /assessment/review after last section
- ProgressBar: filled/current/future segments with ARIA step labels; clickable only when submitted + not closed
- SectionScreen: required-question validation on Next click; section-level error banner + per-field red border on failure; re-entry amber banner on isReEntry; closed banner on isClosed; navigation hidden when closed
- All 6 question renderers render correct widget per UX-Mockup Screen 02 spec
- LikertQuestion: role=radiogroup, aria-label, keyboard arrow navigation
- RankingQuestion: dnd-kit drag-and-drop primary; numbered input fallback; ▲▼ buttons
- FreeTextShortQuestion: max 500 chars; counter amber at ≥400, red at ≥480
- FreeTextLongQuestion: textarea with resize; max 2000 chars; counter amber at ≥1800, red at ≥1950
- OtherTextReveal: hidden when unselected; auto-focuses on reveal; value cleared on hide; aria-expanded on parent
- TypeScript compiles without errors (tsc --noEmit)
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/06-SUMMARY.md` with:
- All files created and their key behaviors
- Component API contracts exposed to Wave 3b (AssessmentWizard props, QuestionRouter props, useSession interface)
- Auto-save wiring pattern (useAutoSave + triggerSave on nav + markDirty on input change)
- next.config.mjs framing decision (SAMEORIGIN not DENY — enterprise embedding requirement)
- dnd-kit installation requirements (@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities)
- Any deviations from TechArch or UX-Mockup specs (flag, do not silently diverge)
</output>
