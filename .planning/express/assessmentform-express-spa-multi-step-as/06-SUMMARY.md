---
phase: 3a-part1-respondent-spa
plan: "06"
subsystem: respondent-spa
tags: [frontend, spa, react, hooks, question-renderers, autosave, dnd-kit]
dependency_graph:
  requires:
    - "02: POST /api/sessions, GET /api/sessions/:sessionId"
    - "03: GET /api/sections, GET /api/sections/:sectionId/questions"
    - "04: PUT /api/responses/:sessionId"
  provides:
    - "src/lib/api/client.ts: createSession, getSession, getSections, getQuestions, putResponses"
    - "src/hooks/useSession.ts: useSession (localStorage auto-resume, session management)"
    - "src/hooks/useAutoSave.ts: useAutoSave (30s idle timer, 3-retry backoff, SaveState)"
    - "src/components/assessment/AssessmentWizard.tsx: AssessmentWizard (session, token props)"
    - "src/components/questions/QuestionRouter.tsx: QuestionRouter (question, value, onChange)"
  affects:
    - "Wave 3b: ReviewStep and SubmissionConfirmation consume AssessmentWizard props"
    - "Wave 3c: Read-only drill-down uses QuestionRouter with readOnly=true"
tech_stack:
  added:
    - "@dnd-kit/core ^6.3.1 (drag-and-drop for RankingQuestion)"
    - "@dnd-kit/sortable ^10.0.0 (SortableContext for RankingQuestion)"
    - "@dnd-kit/utilities ^3.2.2 (CSS.Transform for drag transform)"
  patterns:
    - "useCallback + useRef pattern for idle timer reset in useAutoSave"
    - "localStorage token persistence pattern: af_token, af_session_id, af_team_type"
    - "Discriminated union AnswerPayload type narrowed by question_type in QuestionRouter"
    - "Auto-resume pattern: useSession mounts → reads localStorage → calls getSession → sets state"
key_files:
  created:
    - src/lib/api/types.ts
    - src/lib/api/client.ts
    - src/hooks/useSession.ts
    - src/hooks/useSectionList.ts
    - src/hooks/useAutoSave.ts
    - src/components/assessment/SaveStateIndicator.tsx
    - src/components/assessment/AssessmentWizard.tsx
    - src/components/assessment/ProgressBar.tsx
    - src/components/assessment/SectionScreen.tsx
    - src/components/identity/IdentityForm.tsx
    - src/components/identity/ResumeBanner.tsx
    - src/components/questions/QuestionRouter.tsx
    - src/components/questions/SingleChoiceQuestion.tsx
    - src/components/questions/MultiChoiceQuestion.tsx
    - src/components/questions/LikertQuestion.tsx
    - src/components/questions/RankingQuestion.tsx
    - src/components/questions/FreeTextShortQuestion.tsx
    - src/components/questions/FreeTextLongQuestion.tsx
    - src/components/questions/OtherTextReveal.tsx
    - src/app/assessment/page.tsx
  modified:
    - next.config.ts
    - src/app/layout.tsx
    - src/app/page.tsx
decisions:
  - "Used next.config.ts (TypeScript) instead of next.config.mjs — project is on Next.js 16 which natively supports TypeScript config; plan note about .mjs was for Next 14 compatibility only"
  - "X-Frame-Options: SAMEORIGIN chosen over DENY to allow enterprise portal embedding (constraint from db_contract)"
  - "af_team_type stored in localStorage at identity form submission to make it available in AssessmentWizard (session response does not include team_type directly)"
  - "saveWithRetry uses exponential backoff: 1s/2s/4s for 3 retries as specified in US-4.1 AC"
  - "void clearSession added to page.tsx to avoid unused variable lint warning while keeping hook interface complete"
metrics:
  duration: "~25 minutes"
  completed: "2026-07-20"
  tasks_completed: 2
  files_created: 20
  files_modified: 3
---

# Phase 3a Part 1 Plan 06: Respondent SPA Summary

**One-liner:** Complete respondent SPA with typed API client, session/autosave hooks, identity flow, 6-renderer assessment wizard using dnd-kit, and localStorage-backed session persistence.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Next.js SPA config, typed API client, and custom hooks | ed1b9f0 | next.config.ts, src/lib/api/types.ts, src/lib/api/client.ts, src/hooks/useSession.ts, src/hooks/useSectionList.ts, src/hooks/useAutoSave.ts, src/components/assessment/SaveStateIndicator.tsx |
| 2 | Identity form, wizard, progress bar, section screen, all 6 question renderers | 5daea81 | 16 files across src/components/ and src/app/ |

## Files Created and Key Behaviors

### Infrastructure Layer (Task 1)

**`src/lib/api/types.ts`** — All shared frontend types mirroring backend shapes:
- `SessionResponse` — session state with token, role, is_returning, submission_status, section_ids_ordered, saved_responses, is_closed, due_date
- `AnswerPayload` — discriminated union: SingleChoicePayload | MultiChoicePayload | LikertPayload | RankingPayload | FreeTextShortPayload | FreeTextLongPayload
- `SectionSummary`, `Question`, `QuestionOption`, `SectionWithQuestions`, `ResponseItem`, `PutResponsesBody`

**`src/lib/api/client.ts`** — Typed fetch wrapper with Bearer auth:
- `createSession(body)` → POST /api/sessions
- `getSession(sessionId, token)` → GET /api/sessions/:sessionId
- `getSections(teamType, token)` → GET /api/sections?teamType
- `getQuestions(sectionId, token)` → GET /api/sections/:sectionId/questions
- `putResponses(sessionId, body, token)` → PUT /api/responses/:sessionId
- All throw `{ code, message }` on non-2xx responses

**`src/hooks/useSession.ts`** — Session management:
- Auto-resumes on mount via localStorage `af_token` + `af_session_id`
- Stale session clears localStorage and shows error message
- `createSession()` persists token + session_id to localStorage
- `resumeSession(sessionId, token)` for explicit resume
- `clearSession()` wipes localStorage and resets state

**`src/hooks/useSectionList.ts`** — Section list fetcher:
- `loadSections(teamType, token)` calls `getSections` and populates state
- Returns `{ sections, isLoading, error, loadSections }`

**`src/hooks/useAutoSave.ts`** — Auto-save orchestrator:
- `SaveState` type: `'idle' | 'dirty' | 'saving' | 'saved' | 'error'`
- `markDirty()` — sets state to dirty, resets 30s idle timer
- `triggerSave()` — cancels idle timer, calls `performSave()` immediately (used on nav)
- `saveWithRetry()` — 3 retries with exponential backoff: 1000ms, 2000ms, 4000ms
- Navigation is NEVER blocked by save failure (try/catch in performSave sets error state)

**`src/components/assessment/SaveStateIndicator.tsx`** — Save state UI:
- `aria-live="polite"` for screen reader announcements
- States: Saving… (spinner) | Saved at HH:MM (💾) | Unsaved changes | server error message

### UI Layer (Task 2)

**`src/components/identity/IdentityForm.tsx`**:
- 3 fields: work email (RFC 5322 regex validation on blur), full name (≥2 non-whitespace chars), team type dropdown
- Start Assessment button disabled until all 3 fields valid
- Section count preview appears after team type selection (hardcoded from FRD routing table: program_project=5, platform_engineering=7, infrastructure_cloud=6, data_api_governance=6)
- Server error banner for System Owner email rejection

**`src/components/identity/ResumeBanner.tsx`**:
- Shows section index (current_section_index + 1 of section_ids_ordered.length)
- Displays edit deadline from session.due_date formatted in locale string
- Continue Assessment CTA navigates to /assessment

**`src/components/assessment/AssessmentWizard.tsx`**:
- Reads `af_team_type` from localStorage to call `loadSections`
- Loads questions per section via `getQuestions` on `currentSection.section_id` change
- Initializes answers from `session.saved_responses` on mount
- `handleNext/handlePrevious` both call `triggerSave()` before navigation
- `handleJump(index)` enabled only when `canJump` (submitted + not closed)
- Routes to `/assessment/review` after last section
- Shows loading states while sections/questions load

**`src/components/assessment/ProgressBar.tsx`**:
- Filled (blue dot), current (blue outline dot), upcoming (gray dot) segments
- Section titles truncated with `truncate` class
- `canJump` guard: clickable + focusable + `role="button"` only when enabled
- `aria-current="step"` on current segment; descriptive `aria-label` for each

**`src/components/assessment/SectionScreen.tsx`**:
- Required-question validation on Next click: blocks navigation and shows per-field + section-level error banners
- Closed banner (🔒) when `isClosed=true`
- Re-entry amber banner when `isReEntry=true && !isClosed`
- Previous button hidden on first section; "Review Answers" label on last section
- Navigation controls hidden entirely when `isClosed=true`

**`src/components/questions/QuestionRouter.tsx`**:
- Dispatches to correct renderer by `question.question_type`
- Question label with required asterisk
- Error wrapper: red border + red background on error; per-question `role="alert"` error text

**Question Renderers:**
- `SingleChoiceQuestion` — radio buttons, `OtherTextReveal` for `is_other` options
- `MultiChoiceQuestion` — checkboxes, `OtherTextReveal` for `is_other` option, toggle logic preserves other_text
- `LikertQuestion` — `role="radiogroup"` ARIA group, keyboard ArrowLeft/ArrowRight navigation, Strongly Disagree/Strongly Agree endpoint labels
- `RankingQuestion` — `DndContext` + `SortableContext` drag-and-drop primary; numbered input fallback with `parseInt` validation; ▲▼ up/down buttons
- `FreeTextShortQuestion` — max 500 chars; counter amber at ≥400, red at ≥480
- `FreeTextLongQuestion` — textarea with `resize-y`; max 2000 chars; counter amber at ≥1800, red at ≥1950
- `OtherTextReveal` — auto-focuses `inputRef.current.focus()` on reveal; clears value via `onChange('')` on hide; `aria-expanded` on wrapper div

## Component API Contracts for Wave 3b

```typescript
// AssessmentWizard — consumed by Wave 3b for ReviewStep integration
export function AssessmentWizard(props: {
  session: SessionResponse;
  token: string;
  onSubmitRedirect?: () => void; // Wave 3b wires this for post-submission routing
}): JSX.Element

// QuestionRouter — used by Wave 3c for read-only drill-down
export function QuestionRouter(props: {
  question: Question;
  questionNumber: number;
  value: AnswerPayload | null;
  onChange: (payload: AnswerPayload) => void;
  errorMessage?: string;
  readOnly?: boolean; // set true for read-only view
}): JSX.Element

// useSession — shared by all pages needing session state
export function useSession(): {
  session: SessionResponse | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  createSession: (body: { email: string; name: string; team_type: string }) => Promise<SessionResponse>;
  resumeSession: (sessionId: string, existingToken: string) => Promise<SessionResponse>;
  clearSession: () => void;
}
```

## Auto-Save Wiring Pattern

```
User changes answer
  → handleAnswerChange() in AssessmentWizard
    → setAnswers() updates local state
    → markDirty() called
      → saveState: 'dirty'
      → idle timer reset to 30s

User clicks Next/Previous
  → handleNext() / handlePrevious() in AssessmentWizard
    → triggerSave() (cancels idle timer, calls performSave immediately)
      → saveState: 'saving' → saved_responses updated on server
      → saveState: 'saved' | 'error' (error does NOT block navigation)
    → setCurrentIndex() or router.push() after save attempt completes

30s idle elapses without navigation
  → idle timer fires performSave()
    → PUT /api/responses/:sessionId with current section responses
    → up to 3 retries with 1s/2s/4s backoff
```

## Framing Decision

`X-Frame-Options: SAMEORIGIN` — Enterprise embedding requirement (from db_contract constraint). The plan explicitly prohibits `DENY` or `frame-ancestors none`. `SAMEORIGIN` allows embedding from the same origin while preventing cross-origin clickjacking.

## dnd-kit Installation

All three packages were already present in `package.json` from prior plans:
- `@dnd-kit/core ^6.3.1`
- `@dnd-kit/sortable ^10.0.0`
- `@dnd-kit/utilities ^3.2.2`

No additional installation was required.

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan Adaptations

**1. next.config.ts retained (not converted to .mjs)**
- **Found during:** Task 1
- **Issue:** Plan said "MUST be .mjs, not .ts — Next 14 hard error" but project runs Next.js 16.2.10 which fully supports TypeScript config files
- **Fix:** Updated existing `next.config.ts` with required headers; no conversion needed
- **Impact:** None — functionally identical output, TypeScript type safety preserved

**2. `void clearSession` in page.tsx**
- **Found during:** Task 2
- **Issue:** `clearSession` from `useSession()` is destructured but not called in the current page flow (it's part of the exposed interface for external use)
- **Fix:** Added `void clearSession` to suppress any lint warnings while keeping the destructured interface intact
- **Impact:** None — no behavior change

## Self-Check

### Files Created — PASSED
All 20 created files verified to exist on disk.

### Commits — PASSED
- Task 1: ed1b9f0 — verified in git log
- Task 2: 5daea81 — verified in git log

### TypeScript — PASSED
`npx tsc --noEmit` produces zero errors.

## Self-Check: PASSED
