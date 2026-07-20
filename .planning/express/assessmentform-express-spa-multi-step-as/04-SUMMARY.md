---
phase: 2c-backend-responses-submission
plan: "04"
subsystem: backend-responses-submission
tags: [responses, submissions, auto-save, middleware, email, zod, jwt]
dependency_graph:
  requires: [01-PLAN.md]
  provides:
    - src/lib/schemas/answerPayload.ts
    - src/lib/middleware/assessmentOpenGuard.ts
    - src/lib/middleware/requireSessionOwner.ts
    - src/lib/services/responseService.ts
    - src/lib/services/submissionService.ts
    - src/lib/services/emailService.ts
    - src/app/api/responses/[sessionId]/route.ts
    - src/app/api/submissions/[sessionId]/route.ts
    - src/app/api/notifications/email/route.ts
  affects: [Wave 3a frontend auto-save, Wave 3b submission UI, review step submit button]
tech_stack:
  added: [zod discriminated union schemas, jose jwtVerify]
  patterns: [assessmentOpenGuard middleware, requireSessionOwner middleware, fire-and-forget fetch, onConflictDoUpdate upsert, idempotent re-submission]
key_files:
  created:
    - src/lib/schemas/answerPayload.ts
    - src/lib/middleware/assessmentOpenGuard.ts
    - src/lib/middleware/requireSessionOwner.ts
    - src/lib/services/responseService.ts
    - src/lib/services/submissionService.ts
    - src/lib/services/emailService.ts
    - src/app/api/responses/[sessionId]/route.ts
    - src/app/api/submissions/[sessionId]/route.ts
    - src/app/api/notifications/email/route.ts
  modified: []
decisions:
  - "New middleware in src/lib/middleware/ uses standalone async function signature (not higher-order functions) as specified in plan — coexists with existing src/lib/auth/ higher-order middleware"
  - "assessmentOpenGuard treats DB errors as 'open' to avoid blocking respondents on transient failures"
  - "requireSessionOwner blocks system_owner role (SYSTEM_OWNER_CANNOT_SUBMIT) before DB lookup for efficiency"
  - "sendSubmissionConfirmation fired fire-and-forget on EVERY POST /submissions call (not only first); idempotent re-submits also trigger it since email on re-submit is acceptable per FRD F09"
metrics:
  duration: ~15 minutes
  completed: 2026-07-20
  tasks_completed: 2
  files_created: 9
  files_modified: 0
---

# Phase 2c Plan 04: Backend Responses/Submission — Summary

**One-liner:** Auto-save upsert (UNIQUE onConflictDoUpdate) + mandatory-check draft→submitted transition + fire-and-forget email, all guarded by assessmentOpenGuard + requireSessionOwner middleware with full FRD F04/F05/F09 error codes.

## What Was Built

### Services and Middleware Implemented

| Artifact | Role | Key Behavior |
|----------|------|-------------|
| `src/lib/schemas/answerPayload.ts` | Zod validation | Discriminated union over 6 question types; FRD F02 char limits (500/2000); `other_text` refinements for `single_choice`/`multi_choice` |
| `src/lib/middleware/assessmentOpenGuard.ts` | Due-date gate | Queries `assessment_config.due_date` live on every call; returns `{ ok: true }` or 403 `ASSESSMENT_CLOSED`; DB errors treated as open |
| `src/lib/middleware/requireSessionOwner.ts` | Auth + ownership | Verifies JWT via `jose jwtVerify`; blocks `system_owner` role with `SYSTEM_OWNER_CANNOT_SUBMIT`; returns 403 `SESSION_ACCESS_DENIED` on email mismatch; 404 `SESSION_NOT_FOUND` for unknown session |
| `src/lib/services/responseService.ts` | Auto-save persistence | `upsertResponses`: `INSERT ... onConflictDoUpdate` on UNIQUE(session_id, question_id); updates `sessions.last_saved_at` + `current_section_index` |
| `src/lib/services/submissionService.ts` | Submission finalization | `finalizeSubmission`: mandatory questions check via `inArray(section_ids_ordered, is_required)`, idempotent re-submit (updates `last_modified_at` only), draft→submitted transition |
| `src/lib/services/emailService.ts` | Email notification | `sendSubmissionConfirmation`: fire-and-forget `fetch` to `EMAIL_RELAY_URL`; graceful no-op when env var unset; errors logged only |

### API Routes Created

| Route | Method | Handler Chain | Response |
|-------|--------|--------------|----------|
| `PUT /api/responses/:sessionId` | PUT | assessmentOpenGuard → requireSessionOwner → Zod validate → upsertResponses | `{ saved: true, last_saved_at: ISO8601 }` |
| `POST /api/submissions/:sessionId` | POST | requireSessionOwner → assessmentOpenGuard → finalizeSubmission → sendSubmissionConfirmation | `{ submitted: true, submitted_at, due_date, edit_window_open }` |
| `POST /api/notifications/email` | POST | Zod validate body → sendSubmissionConfirmation | `{ sent: true }` (always 200) |

### Error Code Inventory (FRD F04/F05/F09)

| Code | HTTP | Location | Trigger |
|------|------|----------|---------|
| `AUTH_REQUIRED` | 401 | requireSessionOwner | Missing `Authorization: Bearer` header |
| `TOKEN_INVALID` | 401 | requireSessionOwner | Invalid/expired JWT |
| `ASSESSMENT_CLOSED` | 403 | assessmentOpenGuard | `NOW() > assessment_config.due_date` |
| `SYSTEM_OWNER_CANNOT_SUBMIT` | 403 | requireSessionOwner | JWT `role === 'system_owner'` |
| `SESSION_ACCESS_DENIED` | 403 | requireSessionOwner | Session email ≠ JWT email |
| `SESSION_NOT_FOUND` | 404 | requireSessionOwner / finalizeSubmission | Unknown `sessionId` |
| `INVALID_ANSWER_PAYLOAD` | 400 | PUT /responses route | Zod `safeParse` failure on body |
| `SAVE_FAILED` | 500 | PUT /responses route | DB error during upsert |
| `MANDATORY_QUESTIONS_INCOMPLETE` | 400 | finalizeSubmission | Required questions not answered |
| `SUBMISSION_FAILED` | 500 | POST /submissions route | Unexpected DB error |

### Integration Contract Fulfillment

**What Wave 3a/3b frontend can now consume:**

- **PUT /api/responses/:sessionId** — Auto-save on every section navigation; returns `last_saved_at` for UI indicator
- **POST /api/submissions/:sessionId** — Submit button on Review step; returns `edit_window_open` for conditional read-only mode
- **assessmentOpenGuard** — Exportable middleware for any future closed-assessment checks
- **requireSessionOwner** — Standalone middleware usable in any respondent-scoped route

**Enables:**
- F0: Review Step submit button wiring (Wave 3b)
- F5: Frontend edit-window and read-only mode (Wave 3b)
- F9: SubmissionConfirmation screen (Wave 3b)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `2c35ef7` | Zod schemas, assessmentOpenGuard, requireSessionOwner, responseService, PUT /responses |
| Task 2 | `4634a2d` | submissionService, emailService, POST /submissions, POST /notifications/email |

## Deviations from Plan

**None** — Plan executed exactly as written.

The new middleware in `src/lib/middleware/` uses the standalone async function signature specified in the plan (as opposed to the higher-order function pattern in `src/lib/auth/`). Both patterns coexist — the new middleware is used by the new routes (responses/submissions) while the existing auth middleware serves existing routes (sessions/auth).

## Self-Check

| File | Exists |
|------|--------|
| src/lib/schemas/answerPayload.ts | ✓ |
| src/lib/middleware/assessmentOpenGuard.ts | ✓ |
| src/lib/middleware/requireSessionOwner.ts | ✓ |
| src/lib/services/responseService.ts | ✓ |
| src/lib/services/submissionService.ts | ✓ |
| src/lib/services/emailService.ts | ✓ |
| src/app/api/responses/[sessionId]/route.ts | ✓ |
| src/app/api/submissions/[sessionId]/route.ts | ✓ |
| src/app/api/notifications/email/route.ts | ✓ |

TypeScript: `npx tsc --noEmit` — **PASSED** (zero errors)

## Self-Check: PASSED
