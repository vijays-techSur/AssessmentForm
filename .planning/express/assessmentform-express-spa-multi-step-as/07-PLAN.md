---
phase: 3b-frontend-review-submit-confirmation
plan: 07
type: execute
wave: 7
depends_on: [2, 4, 6]
files_modified:
  - src/components/assessment/ReviewStep.tsx
  - src/components/assessment/SubmissionConfirmation.tsx
  - src/components/assessment/AuthGuard.tsx
  - src/lib/api/client.ts
  - src/app/assessment/review/page.tsx
  - src/app/assessment/confirmation/page.tsx
autonomous: true

features:
  implements: ["F0", "F5", "F9"]
  depends_on: ["F1", "F4"]
  enables: ["F6", "F7"]

must_haves:
  truths:
    - "The Review Step at /assessment/review renders all sections and their saved answers in read-only format, with an [Edit] link per section"
    - "Each [Edit] link navigates to that section in edit mode; pressing Next from that section returns to /assessment/review (not the next sequential section)"
    - "Unanswered required questions are listed with a warning banner on the Review Step; the Submit button is disabled until all required questions are answered"
    - "The Submit Assessment button calls POST /api/submissions/:sessionId and navigates to /assessment/confirmation on 200 success"
    - "The Confirmation screen at /assessment/confirmation shows 'Assessment Submitted!' with respondent name, formatted due date, and a Return to Assessment button (first-submit variant)"
    - "The Confirmation screen shows 'Assessment Updated!' with last-modified timestamp and no-duplicate reassurance for a re-submission within the edit window"
    - "Direct navigation to /assessment/confirmation without a prior successful submission redirects to /assessment/review"
    - "The re-entry amber banner 'You've already submitted your assessment. You can update your answers until {due_date}.' appears on every section when submission_status=submitted and is_closed=false"
    - "The Assessment Closed banner with variant message (submitted vs draft) appears on every section when is_closed=true, and all form inputs become read-only with no Save/Submit controls visible"
    - "AuthGuard blocks unauthenticated or System Owner-role users from accessing /assessment/review and /assessment/confirmation, redirecting to /"
  artifacts:
    - path: "src/components/assessment/ReviewStep.tsx"
      provides: "ReviewStep — read-only section/answer summary, Edit links per section, completeness check, Submit button calling POST /api/submissions/:sessionId"
      exports: ["ReviewStep"]
    - path: "src/components/assessment/SubmissionConfirmation.tsx"
      provides: "SubmissionConfirmation — post-submit screen with first-submit and re-submit variants, Return to Assessment button"
      exports: ["SubmissionConfirmation"]
    - path: "src/components/assessment/AuthGuard.tsx"
      provides: "AuthGuard — client-side route guard; redirects to / if no JWT or System Owner role"
      exports: ["AuthGuard"]
    - path: "src/app/assessment/review/page.tsx"
      provides: "/assessment/review page — wraps ReviewStep with AuthGuard and session hydration"
      exports: ["default"]
    - path: "src/app/assessment/confirmation/page.tsx"
      provides: "/assessment/confirmation page — wraps SubmissionConfirmation; redirects if no prior submit"
      exports: ["default"]
  key_links:
    - from: "src/components/assessment/ReviewStep.tsx"
      to: "src/lib/api/client.ts"
      via: "submitAssessment(sessionId, token) → POST /api/submissions/:sessionId"
      pattern: "submitAssessment|POST.*submissions"
    - from: "src/app/assessment/review/page.tsx"
      to: "src/components/assessment/ReviewStep.tsx"
      via: "renders ReviewStep with session + token from localStorage/useSession"
      pattern: "ReviewStep"
    - from: "src/app/assessment/confirmation/page.tsx"
      to: "src/components/assessment/SubmissionConfirmation.tsx"
      via: "reads confirmationData from sessionStorage; redirects if absent"
      pattern: "SubmissionConfirmation|confirmationData"
    - from: "src/components/assessment/AuthGuard.tsx"
      to: "src/hooks/useSession.ts"
      via: "reads token/session from useSession; redirects to / if unauthorized"
      pattern: "useSession|AuthGuard"

integration_contracts:
  requires:
    - from_plan: "02"
      artifact: "src/app/api/sessions/[sessionId]/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export.*GET' 'src/app/api/sessions/[sessionId]/route.ts' && echo CONTRACT_OK"
    - from_plan: "04"
      artifact: "src/app/api/submissions/[sessionId]/route.ts"
      exports: ["POST"]
      verify: "grep -n 'export.*POST' 'src/app/api/submissions/[sessionId]/route.ts' && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/components/assessment/AssessmentWizard.tsx"
      exports: ["AssessmentWizard"]
      verify: "grep -n 'export.*AssessmentWizard' src/components/assessment/AssessmentWizard.tsx && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/components/questions/QuestionRouter.tsx"
      exports: ["QuestionRouter"]
      verify: "grep -n 'export.*QuestionRouter' src/components/questions/QuestionRouter.tsx && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/hooks/useSession.ts"
      exports: ["useSession"]
      verify: "grep -n 'export.*useSession' src/hooks/useSession.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/lib/api/client.ts"
      exports: ["getSession", "getQuestions"]
      verify: "grep -n 'export.*getSession' src/lib/api/client.ts && grep -n 'export.*getQuestions' src/lib/api/client.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/components/assessment/ReviewStep.tsx"
      exports: ["ReviewStep"]
      shape: |
        export function ReviewStep(props: {
          session: SessionResponse;
          token: string;
          onEditSection: (sectionIndex: number) => void;
          onSubmitSuccess: (result: SubmitResult) => void;
        }): JSX.Element
        // SubmitResult: { submitted_at: string; due_date: string; edit_window_open: boolean; was_resubmit: boolean }
      verify: "grep -n 'export.*ReviewStep' src/components/assessment/ReviewStep.tsx && echo CONTRACT_OK"
    - artifact: "src/components/assessment/SubmissionConfirmation.tsx"
      exports: ["SubmissionConfirmation"]
      shape: |
        export function SubmissionConfirmation(props: {
          name: string;
          dueDate: string;
          wasResubmit: boolean;
          lastModifiedAt?: string;
          email?: string;
          onReturn: () => void;
        }): JSX.Element
      verify: "grep -n 'export.*SubmissionConfirmation' src/components/assessment/SubmissionConfirmation.tsx && echo CONTRACT_OK"
    - artifact: "src/components/assessment/AuthGuard.tsx"
      exports: ["AuthGuard"]
      shape: |
        // Consumed by Wave 3c (dashboard) for System Owner route protection
        export function AuthGuard(props: {
          children: React.ReactNode;
          requiredRole?: 'respondent' | 'system_owner';
        }): JSX.Element | null
      verify: "grep -n 'export.*AuthGuard' src/components/assessment/AuthGuard.tsx && echo CONTRACT_OK"
    - artifact: "src/lib/api/client.ts"
      exports: ["submitAssessment"]
      shape: |
        export async function submitAssessment(
          sessionId: string,
          token: string
        ): Promise<{ submitted: true; submitted_at: string; due_date: string; edit_window_open: boolean }>
      verify: "grep -n 'export.*submitAssessment' src/lib/api/client.ts && echo CONTRACT_OK"
---

<objective>
Implement Wave 3b: the Review & Submit step, Submission Confirmation screen, re-entry/edit-mode amber banner, closed-assessment read-only state, and the AuthGuard client-side route guard.

Purpose: These screens close the respondent submission loop — without ReviewStep and SubmissionConfirmation the form has no finalization path; without the re-entry and closed-state banners returning respondents have no context for their edit window or read-only mode. AuthGuard protects the review and confirmation routes.
Output: ReviewStep.tsx, SubmissionConfirmation.tsx, AuthGuard.tsx, updated client.ts (submitAssessment), /assessment/review/page.tsx, /assessment/confirmation/page.tsx.
</objective>

<feature_dependencies>
Implements: F0: Multi-Step Assessment Workflow — Review Step (US-0.3: read-only section/answer summary, Edit links per section, Submit on Review only; US-0.5: section jump clickable on progress bar during re-entry edit, already implemented in ProgressBar from Wave 06 via canJump prop), F5: Duplicate Submission Prevention & Edit Window — re-entry amber banner (US-5.2), Assessment Closed banner with submitted vs draft variant (US-5.3, US-5.4), submit disabled after due date, F9: Submission Confirmation & Respondent Feedback — Confirmation screen first-submit and update variants (US-9.1, US-9.2, US-9.3)
Depends on: F1: Session management (useSession, GET /api/sessions/:id from Wave 02 plan 02), F4: Response auto-save and submission API (POST /api/submissions/:sessionId from Wave 04 plan 04), F0/F2/F3/F4: AssessmentWizard, QuestionRouter, hooks from Wave 06 plan 06
Enables: F6: System Owner Dashboard (AuthGuard component reused for dashboard route protection in Wave 3c), F7: Role-Based Access Control (AuthGuard enforces JWT role checks client-side)
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
@.planning/express/assessmentform-express-spa-multi-step-as/04-PLAN.md
@.planning/express/assessmentform-express-spa-multi-step-as/06-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: submitAssessment API client function, AuthGuard, ReviewStep component, and /assessment/review page</name>
  <files>
    src/lib/api/client.ts
    src/components/assessment/AuthGuard.tsx
    src/components/assessment/ReviewStep.tsx
    src/app/assessment/review/page.tsx
  </files>
  <action>
Add the submitAssessment function to the existing API client, implement the AuthGuard route guard, implement ReviewStep (the pre-submission summary screen), and wire the /assessment/review route page.

---

### Step 1 — Add `submitAssessment` to `src/lib/api/client.ts`

The existing client.ts (from plan 06) exports createSession, getSession, getSections, getQuestions, putResponses. Append submitAssessment without modifying existing exports.

```typescript
// POST /api/submissions/:sessionId — finalize submission (plan 04)
// TechArch §4.3: POST /api/submissions/:sessionId
// Request: {} (empty — data already saved via auto-save)
// Response 200: { submitted: true, submitted_at: string, due_date: string, edit_window_open: boolean }
// Errors: 400 MANDATORY_QUESTIONS_INCOMPLETE, 401 AUTH_REQUIRED, 403 ASSESSMENT_CLOSED, 403 SYSTEM_OWNER_CANNOT_SUBMIT, 404 SESSION_NOT_FOUND, 500 SUBMISSION_FAILED
export async function submitAssessment(
  sessionId: string,
  token: string
): Promise<{ submitted: true; submitted_at: string; due_date: string; edit_window_open: boolean }> {
  return apiFetch<{ submitted: true; submitted_at: string; due_date: string; edit_window_open: boolean }>(
    `/api/submissions/${sessionId}`,
    { method: 'POST', body: JSON.stringify({}), token }
  );
}
```

---

### Step 2 — `src/components/assessment/AuthGuard.tsx`

Client-side route guard. Reads token and session from useSession. Redirects to / if:
- No token in localStorage (unauthenticated)
- Token exists but session role is 'system_owner' (wrong role for respondent pages)
- requiredRole is 'system_owner' but role is 'respondent' (for future dashboard pages in Wave 3c)

Per UX-Mockup §Route Map: /assessment/review and /assessment/confirmation require a respondent JWT. Direct URL access without a session must redirect to /.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'respondent' | 'system_owner';
}

// AuthGuard — TechArch §2.4 (client-side route guard; no flash of protected content)
// For respondent pages (default): redirects to / if no token or role === 'system_owner'
// For dashboard pages (requiredRole='system_owner'): redirects to / if role !== 'system_owner'
// US-7.2 AC: Respondents cannot see dashboard. US-7.3 AC: System Owners cannot access respondent flows.
export function AuthGuard({ children, requiredRole = 'respondent' }: Props) {
  const router = useRouter();
  const { session, token, isLoading } = useSession();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return; // Wait for session auto-resume to complete

    if (!token || !session) {
      // No session — redirect to identity capture
      router.replace('/');
      return;
    }

    const role = session.role;

    if (requiredRole === 'respondent' && role !== 'respondent') {
      // System Owner tried to access respondent flow
      router.replace('/');
      return;
    }

    if (requiredRole === 'system_owner' && role !== 'system_owner') {
      // Respondent tried to access dashboard
      router.replace('/');
      return;
    }

    setAuthorized(true);
  }, [isLoading, token, session, requiredRole, router]);

  // Render nothing until authorized (no flash of protected content — US-7.2 AC)
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

### Step 3 — `src/components/assessment/ReviewStep.tsx`

UX-Mockup Screen 03. Renders all saved sections/answers in read-only format. Shows completeness warning. Submit button calls POST /api/submissions/:sessionId. Edit link per section triggers onEditSection callback (which the parent page uses to navigate back to that section with a `fromReview=true` flag so Next returns to review rather than advancing sequentially).

Key behaviors per acceptance criteria:
- US-0.3: All sections shown with read-only answers; Edit link per section
- US-5.1: Submit button only on Review Step (not on section screens)
- US-5.1 / US-5.4: Inline error if ASSESSMENT_CLOSED returned
- US-5.1: 400 MANDATORY_QUESTIONS_INCOMPLETE → highlight missing sections

```tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionResponse, Question, AnswerPayload, SectionSummary } from '@/lib/api/types';
import { getQuestions, submitAssessment } from '@/lib/api/client';
import { QuestionRouter } from '@/components/questions/QuestionRouter';

export interface SubmitResult {
  submitted_at: string;
  due_date: string;
  edit_window_open: boolean;
  was_resubmit: boolean;
}

interface SectionAnswerSummary {
  section: SectionSummary;
  questions: Question[];
}

interface Props {
  session: SessionResponse;
  token: string;
  sections: SectionSummary[];
  onEditSection: (sectionIndex: number) => void;
  onSubmitSuccess: (result: SubmitResult) => void;
}

// Derive human-readable display value for an answer payload (for read-only summary)
// The QuestionRouter with readOnly=true handles all rendering — we just need to pass the value through
function hasAnswer(q: Question, answers: Record<string, AnswerPayload>): boolean {
  const a = answers[q.question_id];
  if (!a) return false;
  if (a.type === 'single_choice') return !!a.value;
  if (a.type === 'multi_choice') return a.values.length > 0;
  if (a.type === 'likert') return typeof a.value === 'number';
  if (a.type === 'ranking') return a.order.length > 0;
  if (a.type === 'free_text_short' || a.type === 'free_text_long') return a.value.trim().length > 0;
  return false;
}

// ReviewStep — UX-Mockup Screen 03 (/assessment/review)
// TechArch §2.1 SPEC-COMP: ReviewStep.tsx
export function ReviewStep({ session, token, sections, onEditSection, onSubmitSuccess }: Props) {
  const [sectionData, setSectionData] = useState<SectionAnswerSummary[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [incompleteSections, setIncompleteSections] = useState<string[]>([]);

  // Build answer lookup from session.saved_responses
  const answersMap: Record<string, AnswerPayload> = {};
  for (const r of session.saved_responses) {
    answersMap[r.question_id] = r.answer_payload as AnswerPayload;
  }

  // Load questions for all sections in parallel
  useEffect(() => {
    async function loadAllQuestions() {
      setLoadingQuestions(true);
      try {
        const results = await Promise.all(
          sections.map(async (s) => ({
            section: s,
            questions: (await getQuestions(s.section_id, token)).questions,
          }))
        );
        setSectionData(results);

        // Identify sections with unanswered required questions (US-0.3 AC)
        const gaps: string[] = [];
        for (const { section, questions } of results) {
          const hasGap = questions.some((q) => q.is_required && !hasAnswer(q, answersMap));
          if (hasGap) gaps.push(section.title);
        }
        setIncompleteSections(gaps);
      } finally {
        setLoadingQuestions(false);
      }
    }
    if (sections.length > 0) loadAllQuestions();
  }, [sections, token]);

  const handleSubmit = useCallback(async () => {
    if (incompleteSections.length > 0) return; // Guard: button should already be disabled
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const result = await submitAssessment(session.session_id, token);
      // Determine if this is a re-submission (session was already submitted before)
      const wasResubmit = session.submission_status === 'submitted';
      onSubmitSuccess({
        submitted_at: result.submitted_at,
        due_date: result.due_date,
        edit_window_open: result.edit_window_open,
        was_resubmit: wasResubmit,
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'ASSESSMENT_CLOSED') {
        setSubmitError('The assessment due date has passed. No further submissions are accepted.');
      } else if (e.code === 'MANDATORY_QUESTIONS_INCOMPLETE') {
        setSubmitError('Please complete all required questions before submitting.');
      } else {
        setSubmitError('Submission could not be processed. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  }, [session, token, incompleteSections, onSubmitSuccess]);

  const formattedDue = session.due_date
    ? new Date(session.due_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        Loading your answers for review…
      </div>
    );
  }

  const isSubmitDisabled = incompleteSections.length > 0 || submitLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page heading (UX Screen 03) */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Your Answers</h1>
        <p className="text-gray-600 text-sm mt-1">
          Please review your answers below. Click <strong>Edit</strong> to make changes to any section.
        </p>
      </div>

      {/* Completeness warning (US-0.3 AC, US-5.1 AC) */}
      {incompleteSections.length > 0 && (
        <div role="alert" className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-1">⚠ Some required questions are unanswered:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {incompleteSections.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
          <p className="mt-2">Please edit those sections before submitting.</p>
        </div>
      )}

      {/* Submit error banner */}
      {submitError && (
        <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm">
          ⚠ {submitError}
        </div>
      )}

      {/* Section summary cards (UX Screen 03) */}
      {sectionData.map(({ section, questions }, sectionIndex) => {
        const sectionHasGap = questions.some((q) => q.is_required && !hasAnswer(q, answersMap));
        return (
          <div
            key={section.section_id}
            className={`border rounded-lg p-5 space-y-4 ${sectionHasGap ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-base">
                Section {sectionIndex + 1}: {section.title}
              </h2>
              {/* Edit link — US-0.3 AC: Each section has an Edit link returning to that section */}
              <button
                onClick={() => onEditSection(sectionIndex)}
                className="text-blue-600 text-sm hover:underline font-medium"
                aria-label={`Edit Section ${sectionIndex + 1}: ${section.title}`}
              >
                Edit
              </button>
            </div>

            {/* Read-only question list using QuestionRouter with readOnly=true */}
            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const answered = hasAnswer(q, answersMap);
                return (
                  <div key={q.question_id}>
                    {answered ? (
                      <QuestionRouter
                        question={q}
                        questionNumber={qIdx + 1}
                        value={answersMap[q.question_id] ?? null}
                        onChange={() => {/* read-only: no-op */}}
                        readOnly
                      />
                    ) : (
                      <div className="flex items-start gap-2 py-2">
                        <span className="text-amber-600">⚠</span>
                        <div>
                          <span className="text-sm text-gray-700">
                            Q{qIdx + 1}. {q.question_text}
                            {q.is_required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {q.is_required ? 'Required — not yet answered' : 'Not answered'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Navigation and Submit (UX Screen 03) */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        {formattedDue && (
          <p className="text-xs text-gray-500 text-center">
            By submitting, you confirm these answers reflect your team's current assessment.
            You can edit until {formattedDue}.
          </p>
        )}

        {/* Submit Assessment — US-5.1 AC: Submit button is ONLY on Review Step */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          aria-busy={submitLoading}
        >
          {submitLoading ? 'Submitting your assessment…' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
}
```

---

### Step 4 — `src/app/assessment/review/page.tsx`

Route page for /assessment/review. Wraps ReviewStep with AuthGuard. Loads section list and session from useSession. Handles Edit-section navigation (appending `?fromReview=true` so the section screen's Next returns to /assessment/review instead of the next sequential section — per US-0.3 AC: "After editing from the Review Step, navigating forward returns the respondent to the Review Step").

On Submit success: stores confirmationData in sessionStorage and navigates to /assessment/confirmation.

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/assessment/AuthGuard';
import { ReviewStep } from '@/components/assessment/ReviewStep';
import { SaveStateIndicator } from '@/components/assessment/SaveStateIndicator';
import { useSession } from '@/hooks/useSession';
import { useSectionList } from '@/hooks/useSectionList';
import type { SubmitResult } from '@/components/assessment/ReviewStep';

// /assessment/review — Review & Submit Step
// UX-Mockup Screen 03, Flow 03
// US-0.3 (review before submit), US-5.1 (submit only on review step)
export default function ReviewPage() {
  const router = useRouter();
  const { session, token } = useSession();
  const { sections, loadSections } = useSectionList();
  const [sectionsLoaded, setSectionsLoaded] = useState(false);

  // Load section list for the respondent's team type
  useEffect(() => {
    if (session && token && !sectionsLoaded) {
      const teamType = session.section_ids_ordered.length > 0
        ? undefined // sections already ordered — use section_ids_ordered
        : undefined;
      // Use respondent's saved section order from session; fall back to API
      // The session.section_ids_ordered from plan 02 has the ordered IDs; but SectionSummary
      // objects are needed (with title, etc.) — loadSections by team type
      // We need team type from the respondents table; not directly in session.
      // The AssessmentWizard fetches sections by teamType; for the review page,
      // we reload using the stored section list from sessionStorage if available,
      // or trigger a re-fetch. Store team type in sessionStorage at identity form submit.
      const storedTeamType = sessionStorage.getItem('af_team_type');
      if (storedTeamType && token) {
        loadSections(storedTeamType, token).finally(() => setSectionsLoaded(true));
      } else {
        setSectionsLoaded(true); // Cannot load sections without team type; ReviewStep handles gracefully
      }
    }
  }, [session, token, sectionsLoaded, loadSections]);

  // Edit a section: navigate to /assessment with section index and fromReview flag
  // US-0.3 AC: After editing from Review Step, Next returns to Review (not next sequential section)
  const handleEditSection = useCallback((sectionIndex: number) => {
    router.push(`/assessment?section=${sectionIndex}&fromReview=true`);
  }, [router]);

  // On submit success: store confirmationData in sessionStorage and redirect
  // US-9.1 AC: Confirmation screen only reachable after successful submission
  const handleSubmitSuccess = useCallback((result: SubmitResult) => {
    sessionStorage.setItem('af_confirmation', JSON.stringify({
      name: session?.saved_responses ? '' : '', // name not in session; read from respondent name stored at login
      submittedAt: result.submitted_at,
      dueDate: result.due_date,
      editWindowOpen: result.edit_window_open,
      wasResubmit: result.was_resubmit,
      email: '', // stored at session creation
    }));
    // Store full result including respondent name from sessionStorage (set at identity form submit)
    const respondentName = sessionStorage.getItem('af_respondent_name') ?? '';
    const respondentEmail = sessionStorage.getItem('af_respondent_email') ?? '';
    sessionStorage.setItem('af_confirmation', JSON.stringify({
      name: respondentName,
      email: respondentEmail,
      submittedAt: result.submitted_at,
      dueDate: result.due_date,
      editWindowOpen: result.edit_window_open,
      wasResubmit: result.was_resubmit,
    }));
    router.replace('/assessment/confirmation');
  }, [session, router]);

  if (!session || !token) {
    return null; // AuthGuard handles redirect
  }

  return (
    <AuthGuard requiredRole="respondent">
      <div className="min-h-screen bg-gray-50">
        {/* Header with save state */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm">AssessmentForm-Express</span>
          <SaveStateIndicator saveState="saved" lastSavedAt={null} />
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          {session && token && sectionsLoaded ? (
            <ReviewStep
              session={session}
              token={token}
              sections={sections}
              onEditSection={handleEditSection}
              onSubmitSuccess={handleSubmitSuccess}
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              Loading review…
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
```

**Implementation note on respondent name/email:** The IdentityForm (plan 06) should store `af_respondent_name` and `af_respondent_email` in sessionStorage when the user successfully starts their session. Add these two sessionStorage.setItem calls to the IdentityForm's `onSuccess` callback wiring in `src/app/page.tsx` (the identity page). This enables the confirmation page and review page to display the respondent's name without requiring an extra API call.

Update `src/app/page.tsx` at the point where the session is created successfully to add:
```typescript
sessionStorage.setItem('af_respondent_name', /* name from form */);
sessionStorage.setItem('af_respondent_email', /* email from form */);
sessionStorage.setItem('af_team_type', /* teamType from form */);
```
  </action>
  <verify>
```bash
# API client: submitAssessment added
grep -n "export.*submitAssessment" src/lib/api/client.ts && echo "SUBMIT_ASSESSMENT OK"
grep -n "POST.*submissions" src/lib/api/client.ts && echo "SUBMISSIONS_ENDPOINT OK"

# AuthGuard exports
grep -n "export.*AuthGuard" src/components/assessment/AuthGuard.tsx && echo "AUTHGUARD OK"
grep -n "requiredRole\|router.replace" src/components/assessment/AuthGuard.tsx && echo "AUTHGUARD REDIRECT OK"

# ReviewStep exports and key elements
grep -n "export.*ReviewStep\|export.*SubmitResult" src/components/assessment/ReviewStep.tsx && echo "REVIEWSTEP EXPORTS OK"
grep -n "Submit Assessment\|submitAssessment\|ASSESSMENT_CLOSED\|MANDATORY_QUESTIONS_INCOMPLETE" src/components/assessment/ReviewStep.tsx && echo "REVIEWSTEP SUBMIT OK"
grep -n "onEditSection\|Edit.*section\|readOnly" src/components/assessment/ReviewStep.tsx && echo "REVIEWSTEP EDIT LINKS OK"

# Review page
grep -n "ReviewStep\|AuthGuard\|handleSubmitSuccess\|handleEditSection" src/app/assessment/review/page.tsx && echo "REVIEW_PAGE OK"
grep -n "af_confirmation\|router.replace.*confirmation" src/app/assessment/review/page.tsx && echo "CONFIRMATION_REDIRECT OK"

# TypeScript
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"
```
  </verify>
  <done>
- src/lib/api/client.ts: exports submitAssessment(sessionId, token) calling POST /api/submissions/:sessionId; typed return shape matches plan 04 contract ({ submitted: true, submitted_at, due_date, edit_window_open })
- src/components/assessment/AuthGuard.tsx: redirects to / when token absent, when role mismatches requiredRole; renders loading state until authorized; no flash of protected content
- src/components/assessment/ReviewStep.tsx: loads all section questions in parallel via getQuestions; renders read-only QuestionRouter per answered question; shows ⚠ marker for unanswered required questions; completeness warning banner lists section names; Submit button disabled when incompleteSections.length > 0; calls submitAssessment on click; handles ASSESSMENT_CLOSED and MANDATORY_QUESTIONS_INCOMPLETE errors with inline banners; calls onSubmitSuccess with SubmitResult on 200
- src/app/assessment/review/page.tsx: wrapped in AuthGuard (requiredRole='respondent'); loads sections from sessionStorage team_type; wires onEditSection → router.push(/assessment?section=N&fromReview=true); wires onSubmitSuccess → sessionStorage af_confirmation + router.replace(/assessment/confirmation)
  </done>
</task>

<task type="auto">
  <name>Task 2: SubmissionConfirmation component, /assessment/confirmation page, and re-entry/closed-state banner wiring in AssessmentWizard</name>
  <files>
    src/components/assessment/SubmissionConfirmation.tsx
    src/app/assessment/confirmation/page.tsx
    src/components/assessment/AssessmentWizard.tsx
  </files>
  <action>
Implement the Submission Confirmation screen (first-submit and update variants), its route page with redirect guard, and update AssessmentWizard to pass the is_closed/isReEntry/dueDate props through to SectionScreen and to handle the `fromReview=true` URL param so Next returns to /assessment/review instead of advancing to the next section.

---

### Step 1 — `src/components/assessment/SubmissionConfirmation.tsx`

UX-Mockup Screen 04. Two variants:
- First submission: "Assessment Submitted!" heading, thank-you, edit window card
- Re-submission (update): "Assessment Updated!" heading, no-duplicate reassurance, last modified timestamp

US-9.1 AC: Return to Assessment button navigates to /assessment/review in editable mode.
US-9.1 AC: If due_date unavailable, edit window notice reads "Contact the System Owner for deadline information."

```tsx
'use client';
import { useRouter } from 'next/navigation';

interface Props {
  name: string;
  dueDate: string | null;
  wasResubmit: boolean;
  lastModifiedAt?: string;
  email?: string;
  onReturn: () => void;
}

function formatDueDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// SubmissionConfirmation — UX-Mockup Screen 04 (/assessment/confirmation)
// TechArch §2.1 SPEC-COMP: SubmissionConfirmation.tsx
// US-9.1 AC: Shown only after successful POST /api/submissions/:sessionId
// US-9.2 AC: Re-submit variant shows "Assessment Updated!" and no-duplicate message
export function SubmissionConfirmation({ name, dueDate, wasResubmit, lastModifiedAt, email, onReturn }: Props) {
  const formattedDue = dueDate ? formatDueDate(dueDate) : null;

  const formattedLastModified = lastModifiedAt
    ? new Date(lastModifiedAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-lg p-8 space-y-6 text-center">
        {/* Success icon */}
        <div className="text-5xl">✅</div>

        {/* Heading — first submit vs update */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {wasResubmit ? 'Assessment Updated!' : 'Assessment Submitted!'}
          </h1>

          {/* Personalized message — US-9.1 AC */}
          {wasResubmit ? (
            <div className="mt-3 space-y-1">
              <p className="text-gray-700 text-sm">
                Your submission has been updated{name ? `, ${name}` : ''}.
              </p>
              {/* US-9.1 AC re-submit variant: "no duplicate created" */}
              <p className="text-gray-600 text-sm">
                This replaces your previous response — no duplicate was created.
              </p>
              {email && (
                <p className="text-gray-500 text-xs mt-1">
                  One record exists for {email}
                </p>
              )}
              {formattedLastModified && (
                <p className="text-gray-500 text-xs">
                  Last modified: {formattedLastModified}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-700 text-sm mt-3">
              Thank you{name ? `, ${name}` : ''}. Your assessment has been submitted successfully.
            </p>
          )}
        </div>

        {/* Edit window notice card — US-9.1 AC */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-left">
          {formattedDue ? (
            <>
              <div className="flex items-start gap-2">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-blue-800 font-medium text-sm">
                    {wasResubmit ? 'Edit window closes:' : 'You can return to edit your responses until:'}
                  </p>
                  <p className="text-blue-900 font-semibold text-base mt-1">{formattedDue}</p>
                </div>
              </div>
              <p className="text-blue-700 text-xs mt-3">
                To update your answers, revisit this link and re-enter your email address.
              </p>
            </>
          ) : (
            // US-9.1 AC: due_date unavailable fallback
            <p className="text-blue-700 text-sm">
              Contact the System Owner for deadline information.
            </p>
          )}
        </div>

        {/* Return to Assessment button — US-9.1 AC: navigates to Review Step in editable mode */}
        <button
          onClick={onReturn}
          className="w-full py-3 px-4 rounded-lg border border-blue-600 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          Return to Assessment to Review / Edit Answers
        </button>
      </div>
    </div>
  );
}
```

---

### Step 2 — `src/app/assessment/confirmation/page.tsx`

Route page for /assessment/confirmation.

US-9.1 AC: "The Confirmation Screen is only reachable after a successful 200 response from POST /api/submissions/:sessionId; direct navigation without submission redirects to the Review Step."

Implementation: The review page stores `af_confirmation` in sessionStorage after a successful submit (Task 1). This page reads it on mount; if absent, redirects to /assessment/review.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/assessment/AuthGuard';
import { SubmissionConfirmation } from '@/components/assessment/SubmissionConfirmation';

interface ConfirmationData {
  name: string;
  email: string;
  submittedAt: string;
  dueDate: string | null;
  editWindowOpen: boolean;
  wasResubmit: boolean;
}

// /assessment/confirmation — Submission Confirmation Screen
// UX-Mockup Screen 04, Flow 03 §Confirmation Screen flow
// US-9.1 AC: Only reachable after successful POST /api/submissions — direct nav redirects to review
export default function ConfirmationPage() {
  const router = useRouter();
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // US-9.1 AC: Check for confirmationData written by review page after successful submit
    const raw = sessionStorage.getItem('af_confirmation');
    if (!raw) {
      // No confirmation data — direct URL navigation without a submission → redirect to review
      router.replace('/assessment/review');
      return;
    }
    try {
      const data = JSON.parse(raw) as ConfirmationData;
      setConfirmationData(data);
      // Clear the marker so a page refresh redirects back to review (prevent stale confirmation)
      sessionStorage.removeItem('af_confirmation');
    } catch {
      router.replace('/assessment/review');
      return;
    }
    setChecked(true);
  }, [router]);

  const handleReturn = () => {
    // US-9.1 AC: Return to Assessment button navigates to Review Step in editable mode
    router.push('/assessment/review');
  };

  if (!checked || !confirmationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="respondent">
      <SubmissionConfirmation
        name={confirmationData.name}
        dueDate={confirmationData.dueDate}
        wasResubmit={confirmationData.wasResubmit}
        lastModifiedAt={confirmationData.submittedAt}
        email={confirmationData.email}
        onReturn={handleReturn}
      />
    </AuthGuard>
  );
}
```

---

### Step 3 — Update `src/components/assessment/AssessmentWizard.tsx`

The AssessmentWizard from plan 06 already passes `isReEntry` and `isClosed` props to SectionScreen (which renders the appropriate banners). However, two behaviors need to be added/confirmed:

**a) `fromReview` URL param handling (US-0.3 AC):**
When navigating back from Review Step to a section for editing, the URL is `/assessment?section=N&fromReview=true`. When the user clicks Next in this mode, they should return to /assessment/review (not advance to the next section).

Add `fromReview` URL param reading to AssessmentWizard. When `fromReview=true` and the user clicks Next (and validation passes), navigate to /assessment/review instead of sectionIndex+1.

**b) `sessionStorage.setItem` for `af_respondent_name` / `af_respondent_email` / `af_team_type`:**
This must be done in the identity form success handler. The IdentityForm's `onSuccess` is called in `src/app/page.tsx`. Add the three sessionStorage writes there.

Read the current AssessmentWizard implementation from plan 06 (the full file was provided in the plan) and make the following targeted edits:

**In `src/components/assessment/AssessmentWizard.tsx`:**

At the top of the component, after existing imports, add:
```typescript
import { useSearchParams } from 'next/navigation';
```

Inside the component function, read the URL param:
```typescript
const searchParams = useSearchParams();
const fromReview = searchParams.get('fromReview') === 'true';
const initialSection = parseInt(searchParams.get('section') ?? '0', 10);
```

Update the initial state initialization:
```typescript
// Use section index from URL param when navigating back from review (US-0.3 AC)
const [currentSectionIndex, setCurrentSectionIndex] = useState(
  !isNaN(initialSection) && initialSection >= 0 ? initialSection : session.current_section_index
);
```

Update the Next button handler (handleNext / onNext callback): when `fromReview` is true and validation passes and save succeeds, instead of incrementing section index, navigate to /assessment/review:
```typescript
const router = useRouter();

// In the handleNext function, after auto-save succeeds:
if (fromReview) {
  // US-0.3 AC: After editing from Review Step, Next returns to Review Step
  router.push('/assessment/review');
  return;
}
// Otherwise normal next-section progression
setCurrentSectionIndex((prev) => prev + 1);
```

**In `src/app/page.tsx` (IdentityForm success handler):**

After session is created successfully (inside the onSuccess callback or the POST /api/sessions success handler), add:
```typescript
sessionStorage.setItem('af_respondent_name', params.name);
sessionStorage.setItem('af_respondent_email', params.email);
sessionStorage.setItem('af_team_type', params.teamType);
```

These three writes enable the Review page to load section data and the Confirmation page to display the respondent's name without extra API calls.

**Important:** Only make the minimal targeted changes to AssessmentWizard.tsx and page.tsx. Do NOT rewrite the entire files. Read the existing content first (from the 06-PLAN.md implementation) and insert/update the specific sections described above.
  </action>
  <verify>
```bash
# SubmissionConfirmation exports
grep -n "export.*SubmissionConfirmation" src/components/assessment/SubmissionConfirmation.tsx && echo "CONFIRMATION_COMPONENT OK"
grep -n "Assessment Submitted\|Assessment Updated\|Contact the System Owner" src/components/assessment/SubmissionConfirmation.tsx && echo "CONFIRMATION_VARIANTS OK"
grep -n "Return to Assessment\|onReturn" src/components/assessment/SubmissionConfirmation.tsx && echo "CONFIRMATION_RETURN OK"

# Confirmation page: redirect guard
grep -n "af_confirmation\|router.replace.*review" src/app/assessment/confirmation/page.tsx && echo "CONFIRMATION_GUARD OK"
grep -n "SubmissionConfirmation\|AuthGuard" src/app/assessment/confirmation/page.tsx && echo "CONFIRMATION_PAGE OK"

# AssessmentWizard: fromReview handling
grep -n "fromReview\|useSearchParams" src/components/assessment/AssessmentWizard.tsx && echo "FROM_REVIEW OK"
grep -n "router.push.*review" src/components/assessment/AssessmentWizard.tsx && echo "REVIEW_RETURN OK"

# page.tsx: sessionStorage writes for confirmation data
grep -n "af_respondent_name\|af_respondent_email\|af_team_type" src/app/page.tsx && echo "SESSION_STORAGE_WRITES OK"

# All route pages exist
ls src/app/assessment/review/page.tsx src/app/assessment/confirmation/page.tsx && echo "ROUTE_PAGES OK"

# TypeScript
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"
```
  </verify>
  <done>
- src/components/assessment/SubmissionConfirmation.tsx: first-submit variant ("Assessment Submitted!" + thank-you + formatted due date card); re-submit variant ("Assessment Updated!" + no-duplicate message + last-modified + email); due_date null fallback "Contact the System Owner for deadline information."; Return to Assessment button calls onReturn → /assessment/review
- src/app/assessment/confirmation/page.tsx: reads af_confirmation from sessionStorage; absent or invalid → router.replace('/assessment/review'); clears sessionStorage entry after reading (prevents stale confirmation on refresh); wrapped in AuthGuard (requiredRole='respondent'); passes all ConfirmationData props to SubmissionConfirmation
- src/components/assessment/AssessmentWizard.tsx: reads fromReview and section URL params with useSearchParams; initializes currentSectionIndex from URL param when set; handleNext navigates to /assessment/review (via router.push) when fromReview=true and validation+save passes, instead of incrementing to next section
- src/app/page.tsx: writes af_respondent_name, af_respondent_email, af_team_type to sessionStorage in the IdentityForm onSuccess callback after successful session creation
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API (submissions) | Respondent-controlled sessionId path param and JWT crossing into POST /api/submissions/:sessionId; result data crossing back into SubmissionConfirmation render |
| localStorage→AuthGuard | JWT token read from localStorage crossing into AuthGuard role check; tampered localStorage must not grant unauthorized access |
| sessionStorage→ConfirmationPage | af_confirmation blob read from sessionStorage and parsed as JSON; malformed data must not crash the page or expose wrong data |
| client→API (getQuestions for review) | section_id values crossing into GET /api/sections/:sectionId/questions; result rendered read-only in ReviewStep |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-01 | Elevation of privilege | `src/components/assessment/AuthGuard.tsx` — localStorage JWT bypass | mitigate | AuthGuard reads token from useSession (which reads localStorage), but token validity is enforced server-side on every API call. A forged/tampered localStorage token will be rejected by jwtMiddleware (401 TOKEN_INVALID) on any protected API call. AuthGuard is a UX convenience only; it prevents UI render for wrong-role users but server-side enforcement is the trust anchor. |
| T-07-02 | Tampering | `src/components/assessment/ReviewStep.tsx` — submitAssessment with spoofed session_id | mitigate | submitAssessment calls POST /api/submissions/:sessionId with the JWT from useSession. The server's requireSessionOwner middleware (plan 04) verifies the session_id path param belongs to the authenticated JWT email — a respondent cannot submit another respondent's session by crafting a URL. Returns 403 SESSION_ACCESS_DENIED. |
| T-07-03 | Repudiation | `src/app/assessment/confirmation/page.tsx` — direct URL access to confirmation without submission | mitigate | Confirmation page reads `af_confirmation` from sessionStorage; absent → router.replace('/assessment/review'). The `af_confirmation` key is only written by the review page after a verified 200 from POST /api/submissions/:sessionId. A respondent cannot reach the confirmation screen without a real server-confirmed submission. |
| T-07-04 | Tampering | `src/app/assessment/confirmation/page.tsx` — forged af_confirmation in sessionStorage | accept | Respondent controls their own browser's sessionStorage; they could write a forged af_confirmation to display a fake confirmation screen to themselves. The actual submission state is server-side; a forged UI display has no effect on the DB. Residual risk owned by the respondent; no data integrity concern for the System Owner or dataset. |
| T-07-05 | Information disclosure | `src/components/assessment/ReviewStep.tsx` — read-only rendering of all saved answers | mitigate | ReviewStep renders saved_responses from the authenticated session only. All getQuestions API calls use the respondent's own JWT; requireSessionOwner (plan 04) on PUT /responses and the JWT-gated GET /api/sessions ensure cross-respondent data cannot be loaded. QuestionRouter readOnly=true prevents any modification of displayed values. |
| T-07-06 | Denial of service | `src/components/assessment/ReviewStep.tsx` — parallel getQuestions for all sections | mitigate | Promise.all across 5–7 sections (max 7 per FRD F03 routing table). Each getQuestions call is a lightweight indexed DB read with a hard section limit (SECTION_LIMIT_EXCEEDED guard in plan 03 sectionRoutingService). Enterprise-internal load; 500 concurrent users is the defined scale ceiling (NFR). |
</threat_model>

<verification>
## Wave 7 (3b) — Review/Submit/Confirmation Frontend Verification

After both tasks complete:

```bash
# 1. All source files exist
ls src/components/assessment/ReviewStep.tsx \
   src/components/assessment/SubmissionConfirmation.tsx \
   src/components/assessment/AuthGuard.tsx \
   src/app/assessment/review/page.tsx \
   src/app/assessment/confirmation/page.tsx && echo "ALL FILES PRESENT"

# 2. Integration contract verification
grep -n "export.*submitAssessment" src/lib/api/client.ts && echo "submitAssessment CONTRACT OK"
grep -n "export.*ReviewStep" src/components/assessment/ReviewStep.tsx && echo "ReviewStep CONTRACT OK"
grep -n "export.*SubmissionConfirmation" src/components/assessment/SubmissionConfirmation.tsx && echo "SubmissionConfirmation CONTRACT OK"
grep -n "export.*AuthGuard" src/components/assessment/AuthGuard.tsx && echo "AuthGuard CONTRACT OK"

# 3. Key acceptance criteria signals
grep -n "ASSESSMENT_CLOSED\|MANDATORY_QUESTIONS_INCOMPLETE" src/components/assessment/ReviewStep.tsx && echo "ERROR_CODES OK"
grep -n "Submit Assessment\|submitAssessment" src/components/assessment/ReviewStep.tsx && echo "SUBMIT_BUTTON_ON_REVIEW_ONLY OK"
grep -n "Contact the System Owner" src/components/assessment/SubmissionConfirmation.tsx && echo "DUE_DATE_FALLBACK OK"
grep -n "Assessment Updated\|Assessment Submitted" src/components/assessment/SubmissionConfirmation.tsx && echo "VARIANTS OK"
grep -n "af_confirmation\|router.replace.*review" src/app/assessment/confirmation/page.tsx && echo "CONFIRMATION_GUARD OK"

# 4. fromReview param wiring (US-0.3 AC)
grep -n "fromReview\|useSearchParams" src/components/assessment/AssessmentWizard.tsx && echo "FROM_REVIEW_PARAM OK"

# 5. sessionStorage writes for confirmation data
grep -n "af_respondent_name\|af_team_type" src/app/page.tsx && echo "SESSIONSTORAGE_WRITES OK"

# 6. No Submit button on section screens (US-5.1 AC)
# Submit button exists only in ReviewStep, not SectionScreen
grep -n "Submit Assessment" src/components/assessment/SectionScreen.tsx 2>/dev/null && echo "ERROR: Submit on SectionScreen" || echo "NO_SUBMIT_ON_SECTION OK"
grep -n "Submit Assessment" src/components/assessment/ReviewStep.tsx && echo "SUBMIT_ON_REVIEW OK"

# 7. TypeScript clean
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10 || echo "TSC CLEAN"
```
</verification>

<success_criteria>
- ReviewStep renders all sections and saved answers read-only using QuestionRouter (readOnly=true); displays completeness warning listing section names when any required question is unanswered; Submit button disabled and warning shown for incomplete answers; Edit link per section navigates to that section with fromReview=true so Next returns to /assessment/review
- ReviewStep.submitAssessment: calls POST /api/submissions/:sessionId; on 200 calls onSubmitSuccess with SubmitResult; on ASSESSMENT_CLOSED shows "The assessment due date has passed."; on MANDATORY_QUESTIONS_INCOMPLETE shows "Please complete all required questions before submitting."
- SubmissionConfirmation: first-submit variant shows "Assessment Submitted!" + personalized thank-you + formatted due date card; re-submit variant shows "Assessment Updated!" + no-duplicate message + last-modified + email; due_date null → "Contact the System Owner for deadline information."; Return button navigates to /assessment/review
- /assessment/confirmation: reads af_confirmation from sessionStorage; redirects to /assessment/review when absent (direct URL access guard per US-9.1 AC); clears marker after reading; wrapped in AuthGuard
- AuthGuard: no flash of protected content (renders loading until authorized); redirects to / for no-token, wrong-role, or System Owner accessing respondent routes; usable by Wave 3c dashboard pages with requiredRole='system_owner'
- AssessmentWizard: fromReview URL param causes Next (when validation passes) to push /assessment/review instead of advancing section index; section URL param initializes starting section for edit-from-review flow
- src/app/page.tsx: writes af_respondent_name, af_respondent_email, af_team_type to sessionStorage on successful session creation
- TypeScript compiles without errors (npx tsc --noEmit)
- Submit button is ONLY present in ReviewStep — not in SectionScreen or any other component (US-5.1 AC)
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/07-SUMMARY.md` with:
- Components implemented (ReviewStep, SubmissionConfirmation, AuthGuard)
- API client function added (submitAssessment)
- Route pages created (/assessment/review, /assessment/confirmation)
- Confirmation redirect guard mechanism (sessionStorage af_confirmation pattern)
- fromReview URL param pattern for review-return navigation
- sessionStorage keys written for cross-component data sharing (af_respondent_name, af_respondent_email, af_team_type, af_confirmation)
- Integration contract fulfillment for Wave 3c (AuthGuard with requiredRole prop)
- Any deviations from UX-Mockup or UserStories specs
</output>
