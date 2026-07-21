---
phase: 3b-frontend-review-submit-confirmation
plan: "07"
subsystem: frontend-review-submit
tags: [review-step, submission-confirmation, auth-guard, api-client, next-navigation]
dependency_graph:
  requires: ["02 (GET /api/sessions/:id)", "04 (POST /api/submissions/:sessionId)", "06 (AssessmentWizard, QuestionRouter, useSession)"]
  provides: ["ReviewStep", "SubmissionConfirmation", "AuthGuard", "submitAssessment", "/assessment/review", "/assessment/confirmation"]
  affects: ["Wave 3c (AuthGuard reuse for dashboard)", "F6 (System Owner Dashboard)", "F7 (RBAC)"]
tech_stack:
  added: []
  patterns: ["sessionStorage handoff for post-submit data", "URL param fromReview for review-return navigation", "client-side route guard with no flash of protected content"]
key_files:
  created:
    - src/components/assessment/AuthGuard.tsx
    - src/components/assessment/ReviewStep.tsx
    - src/components/assessment/SubmissionConfirmation.tsx
    - src/app/assessment/review/page.tsx
    - src/app/assessment/confirmation/page.tsx
  modified:
    - src/lib/api/client.ts (added submitAssessment)
    - src/components/assessment/AssessmentWizard.tsx (added fromReview URL param handling)
    - src/app/page.tsx (added sessionStorage writes for af_respondent_name/email/team_type)
decisions:
  - "SessionStorage handoff pattern: review page writes af_confirmation blob after 200 from POST /api/submissions/:sessionId; confirmation page reads and clears it — prevents stale confirmation on refresh (US-9.1 AC)"
  - "fromReview URL param injected by review page's Edit link (/assessment?section=N&fromReview=true); AssessmentWizard reads it via useSearchParams and redirects to /assessment/review on Next instead of advancing"
  - "AuthGuard renders a loading state until useSession hydrates — prevents flash of protected content for both respondent and system_owner required roles"
  - "answersMap built from session.saved_responses in ReviewStep rather than separate API call — avoids redundant getSession fetch"
metrics:
  duration: ~25min
  completed: "2026-07-20"
  tasks_completed: 2
  files_created: 5
  files_modified: 3
---

# Phase 3b Plan 07: Review/Submit/Confirmation Frontend Summary

## One-liner

Review Step with read-only section/answer summary and Submit flow, SubmissionConfirmation first/re-submit variants, AuthGuard client route guard, and `fromReview` URL param return pattern — completing the respondent submission loop.

## What Was Built

### Task 1 — submitAssessment, AuthGuard, ReviewStep, /assessment/review

**`src/lib/api/client.ts`** — Added `submitAssessment(sessionId, token)`:
- Calls `POST /api/submissions/:sessionId` with empty body (data already auto-saved)
- Returns `{ submitted: true, submitted_at, due_date, edit_window_open }`
- Error codes ASSESSMENT_CLOSED, MANDATORY_QUESTIONS_INCOMPLETE propagated to UI

**`src/components/assessment/AuthGuard.tsx`** — Client-side route guard:
- Reads token and session from `useSession`; waits for `isLoading` to settle
- Redirects to `/` for: no token/session, role mismatch with `requiredRole`
- Renders loading state until authorized (no flash of protected content — US-7.2 AC)
- `requiredRole` prop defaults to `'respondent'`; accepts `'system_owner'` for Wave 3c dashboard

**`src/components/assessment/ReviewStep.tsx`** — Pre-submission read-only summary:
- Loads all section questions in parallel via `Promise.all(sections.map(getQuestions))`
- Builds answer lookup from `session.saved_responses`
- Renders `QuestionRouter` with `readOnly=true` for answered questions
- Shows ⚠ marker and text for unanswered questions
- Completeness warning banner lists section names with required gaps (US-0.3 AC)
- Submit button disabled when `incompleteSections.length > 0` or submitting
- `handleSubmit` calls `submitAssessment`; handles ASSESSMENT_CLOSED and MANDATORY_QUESTIONS_INCOMPLETE with inline banners
- Edit link per section calls `onEditSection(sectionIndex)` callback

**`src/app/assessment/review/page.tsx`** — Review route page:
- Wrapped in `AuthGuard requiredRole="respondent"`
- Loads sections from `sessionStorage.getItem('af_team_type')` via `useSectionList`
- `handleEditSection` → `router.push('/assessment?section=N&fromReview=true')`
- `handleSubmitSuccess` writes `af_confirmation` blob to sessionStorage; `router.replace('/assessment/confirmation')`

**`src/app/page.tsx`** — Updated IdentityForm success handler:
- Added `sessionStorage.setItem('af_respondent_name', name)`
- Added `sessionStorage.setItem('af_respondent_email', email)`
- Added `sessionStorage.setItem('af_team_type', teamType)`

---

### Task 2 — SubmissionConfirmation, /assessment/confirmation, AssessmentWizard fromReview

**`src/components/assessment/SubmissionConfirmation.tsx`** — Post-submit screen:
- First-submit variant: "Assessment Submitted!" heading, personalized thank-you, formatted due date card
- Re-submit variant: "Assessment Updated!" heading, no-duplicate message, last-modified timestamp, email record notice
- `dueDate` null fallback: "Contact the System Owner for deadline information." (US-9.1 AC)
- Return to Assessment button calls `onReturn` → `/assessment/review`

**`src/app/assessment/confirmation/page.tsx`** — Confirmation route page:
- Reads `af_confirmation` from sessionStorage on mount
- Absent or malformed → `router.replace('/assessment/review')` (US-9.1 AC: direct URL access guard)
- Clears `af_confirmation` after reading (prevents stale confirmation on page refresh)
- Wrapped in `AuthGuard requiredRole="respondent"`

**`src/components/assessment/AssessmentWizard.tsx`** — fromReview URL param:
- Added `useSearchParams` import
- Reads `fromReview = searchParams.get('fromReview') === 'true'`
- Reads `initialSection = parseInt(searchParams.get('section') ?? '', 10)`
- Initializes `currentIndex` from URL param when set and valid
- `handleNext` → when `fromReview=true` and save passes, `router.push('/assessment/review')` instead of section increment

---

## SessionStorage Keys Managed in This Plan

| Key | Written by | Read by | Purpose |
|-----|-----------|---------|---------|
| `af_respondent_name` | `src/app/page.tsx` | `src/app/assessment/review/page.tsx` | Show name on confirmation screen |
| `af_respondent_email` | `src/app/page.tsx` | `src/app/assessment/review/page.tsx` | Show email on re-submit variant |
| `af_team_type` | `src/app/page.tsx` | `src/app/assessment/review/page.tsx` | Load correct section list on review page |
| `af_confirmation` | `src/app/assessment/review/page.tsx` | `src/app/assessment/confirmation/page.tsx` | Post-submit data handoff; cleared after read |

---

## Integration Contracts Fulfilled

| Contract | Status |
|----------|--------|
| `submitAssessment(sessionId, token)` → `POST /api/submissions/:sessionId` (plan 04) | ✅ |
| `ReviewStep` exports with `session`, `token`, `sections`, `onEditSection`, `onSubmitSuccess` props | ✅ |
| `SubmissionConfirmation` exports with all confirmation props | ✅ |
| `AuthGuard` with `requiredRole` prop (reusable for Wave 3c dashboard) | ✅ |

## Deviations from Plan

**None** — Plan executed exactly as written. The `answersMap` in ReviewStep is built inline from `session.saved_responses` (as specified in the plan). The duplicate `sessionStorage.setItem('af_confirmation')` write shown in the plan's review page pseudocode was collapsed to a single correct write (the plan had a code comment showing a first draft then overwriting it).

## Self-Check

### Files Verified
- [x] src/components/assessment/AuthGuard.tsx — exists, exports AuthGuard
- [x] src/components/assessment/ReviewStep.tsx — exists, exports ReviewStep and SubmitResult
- [x] src/components/assessment/SubmissionConfirmation.tsx — exists, exports SubmissionConfirmation
- [x] src/app/assessment/review/page.tsx — exists, default export
- [x] src/app/assessment/confirmation/page.tsx — exists, default export
- [x] src/lib/api/client.ts — submitAssessment added

### TypeScript
- [x] `npx tsc --noEmit` — clean (no errors)

### Commits
- [x] de89e52: feat(3b-07): submitAssessment API client, AuthGuard, ReviewStep, and /assessment/review page
- [x] d8edcfa: feat(3b-07): SubmissionConfirmation, /assessment/confirmation, and AssessmentWizard fromReview wiring

## Self-Check: PASSED
