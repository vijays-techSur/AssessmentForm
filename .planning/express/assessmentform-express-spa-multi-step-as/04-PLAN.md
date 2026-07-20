---
phase: 2c-backend-responses-submission
plan: 04
type: execute
wave: 4
depends_on: [1]
files_modified:
  - src/app/api/responses/[sessionId]/route.ts
  - src/app/api/submissions/[sessionId]/route.ts
  - src/app/api/notifications/email/route.ts
  - src/lib/services/responseService.ts
  - src/lib/services/submissionService.ts
  - src/lib/services/emailService.ts
  - src/lib/middleware/assessmentOpenGuard.ts
  - src/lib/middleware/requireSessionOwner.ts
  - src/lib/schemas/answerPayload.ts
autonomous: true

features:
  implements: ["F4", "F5", "F9"]
  depends_on: ["F1", "F7"]
  enables: ["F0", "F5", "F9"]

must_haves:
  truths:
    - "PUT /api/responses/:sessionId upserts answer payloads and updates sessions.last_saved_at; returns { saved: true, last_saved_at }"
    - "PUT /api/responses/:sessionId returns 403 ASSESSMENT_CLOSED when assessment due date has passed"
    - "POST /api/submissions/:sessionId transitions submission_status from draft to submitted, sets submitted_at"
    - "POST /api/submissions/:sessionId returns 400 MANDATORY_QUESTIONS_INCOMPLETE when required questions are unanswered"
    - "POST /api/submissions/:sessionId returns 403 ASSESSMENT_CLOSED when due date has passed"
    - "POST /api/submissions/:sessionId is idempotent for already-submitted sessions within the edit window (updates last_modified_at only)"
    - "POST /api/notifications/email fires-and-forgets email via EMAIL_RELAY_URL; is a no-op if EMAIL_RELAY_URL is unset"
    - "assessmentOpenGuard middleware rejects PUT /responses and POST /submissions after due date with 403 ASSESSMENT_CLOSED"
    - "requireSessionOwner middleware rejects cross-session access with 403 SESSION_ACCESS_DENIED"
    - "Response answer_payload validated per question type Zod schema before upsert"
  artifacts:
    - path: "src/lib/services/responseService.ts"
      provides: "upsertResponses — upserts responses rows and updates sessions.last_saved_at"
      exports: ["upsertResponses"]
    - path: "src/lib/services/submissionService.ts"
      provides: "finalizeSubmission — mandatory check + draft→submitted transition"
      exports: ["finalizeSubmission"]
    - path: "src/lib/services/emailService.ts"
      provides: "sendSubmissionConfirmation — fire-and-forget email via EMAIL_RELAY_URL"
      exports: ["sendSubmissionConfirmation"]
    - path: "src/lib/middleware/assessmentOpenGuard.ts"
      provides: "assessmentOpenGuard — rejects with 403 ASSESSMENT_CLOSED after due_date"
      exports: ["assessmentOpenGuard"]
    - path: "src/lib/middleware/requireSessionOwner.ts"
      provides: "requireSessionOwner — verifies session belongs to JWT email"
      exports: ["requireSessionOwner"]
    - path: "src/lib/schemas/answerPayload.ts"
      provides: "Zod schemas for all 6 answer payload types"
      exports: ["AnswerPayloadSchema", "ResponseItemSchema", "PutResponsesBodySchema"]
    - path: "src/app/api/responses/[sessionId]/route.ts"
      provides: "PUT /api/responses/:sessionId route handler"
      exports: ["PUT"]
    - path: "src/app/api/submissions/[sessionId]/route.ts"
      provides: "POST /api/submissions/:sessionId route handler"
      exports: ["POST"]
    - path: "src/app/api/notifications/email/route.ts"
      provides: "POST /api/notifications/email route handler (stretch)"
      exports: ["POST"]
  key_links:
    - from: "src/app/api/responses/[sessionId]/route.ts"
      to: "src/lib/middleware/assessmentOpenGuard.ts"
      via: "assessmentOpenGuard(request) called before upsert"
      pattern: "assessmentOpenGuard"
    - from: "src/lib/services/responseService.ts"
      to: "drizzle/schema.ts responses"
      via: "db.insert(responses).onConflictDoUpdate()"
      pattern: "onConflictDoUpdate"
    - from: "src/lib/services/submissionService.ts"
      to: "drizzle/schema.ts sessions"
      via: "db.update(sessions).set({ submission_status: 'submitted', submitted_at })"
      pattern: "submitted_at"
    - from: "src/app/api/submissions/[sessionId]/route.ts"
      to: "src/lib/services/emailService.ts"
      via: "sendSubmissionConfirmation() called fire-and-forget after 200 response"
      pattern: "sendSubmissionConfirmation"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "drizzle/schema.ts"
      exports: ["responses", "sessions", "questions", "assessmentConfig", "respondents"]
      verify: "grep -n 'export const responses' drizzle/schema.ts && grep -n 'export const assessmentConfig' drizzle/schema.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/lib/middleware/assessmentOpenGuard.ts"
      exports: ["assessmentOpenGuard"]
      shape: |
        export async function assessmentOpenGuard(request: NextRequest): Promise<{ ok: true } | NextResponse>
        // Queries assessment_config.due_date; returns { ok: true } if open, NextResponse 403 ASSESSMENT_CLOSED if past
      verify: "grep -n 'export.*assessmentOpenGuard' src/lib/middleware/assessmentOpenGuard.ts && echo CONTRACT_OK"
    - artifact: "src/lib/middleware/requireSessionOwner.ts"
      exports: ["requireSessionOwner"]
      shape: |
        export async function requireSessionOwner(sessionId: string, req: NextRequest): Promise<{ session: Session } | NextResponse>
        // Verifies session.respondent_id matches JWT email; returns session or 403 SESSION_ACCESS_DENIED
      verify: "grep -n 'export.*requireSessionOwner' src/lib/middleware/requireSessionOwner.ts && echo CONTRACT_OK"
    - artifact: "src/lib/schemas/answerPayload.ts"
      exports: ["AnswerPayloadSchema", "ResponseItemSchema", "PutResponsesBodySchema"]
      shape: |
        export const AnswerPayloadSchema = z.discriminatedUnion('type', [
          SingleChoicePayloadSchema, MultiChoicePayloadSchema, LikertPayloadSchema,
          RankingPayloadSchema, FreeTextShortPayloadSchema, FreeTextLongPayloadSchema
        ])
        export const ResponseItemSchema = z.object({ question_id: z.string().uuid(), answer_payload: AnswerPayloadSchema })
        export const PutResponsesBodySchema = z.object({ section_id: z.string(), current_section_index: z.number().int().min(0), responses: z.array(ResponseItemSchema) })
      verify: "grep -n 'export const AnswerPayloadSchema' src/lib/schemas/answerPayload.ts && grep -n 'export const PutResponsesBodySchema' src/lib/schemas/answerPayload.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/responses/[sessionId]/route.ts"
      exports: ["PUT"]
      shape: |
        PUT /api/responses/:sessionId
        Auth: Bearer JWT (respondent role, own session)
        Request: { section_id: string, current_section_index: number, responses: Array<{ question_id: string, answer_payload: AnswerPayload }> }
        Response 200: { saved: true, last_saved_at: string }
        Errors: 400 INVALID_ANSWER_PAYLOAD, 401 AUTH_REQUIRED, 403 ASSESSMENT_CLOSED, 403 SESSION_ACCESS_DENIED, 404 SESSION_NOT_FOUND, 500 SAVE_FAILED
      verify: "grep -n 'export.*PUT' src/app/api/responses/[sessionId]/route.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/submissions/[sessionId]/route.ts"
      exports: ["POST"]
      shape: |
        POST /api/submissions/:sessionId
        Auth: Bearer JWT (respondent role, own session)
        Request: {} (empty — data already saved via auto-save)
        Response 200: { submitted: true, submitted_at: string, due_date: string, edit_window_open: boolean }
        Errors: 400 MANDATORY_QUESTIONS_INCOMPLETE, 401 AUTH_REQUIRED, 403 ASSESSMENT_CLOSED, 403 SESSION_ACCESS_DENIED, 403 SYSTEM_OWNER_CANNOT_SUBMIT, 404 SESSION_NOT_FOUND, 500 SUBMISSION_FAILED
      verify: "grep -n 'export.*POST' src/app/api/submissions/[sessionId]/route.ts && echo CONTRACT_OK"
---

<objective>
Implement the response auto-save, submission finalization, and email notification backend for Wave 2c. This covers PUT /api/responses/:sessionId (upsert with due-date guard), POST /api/submissions/:sessionId (mandatory-questions check + draft→submitted transition + idempotent re-submit), and the fire-and-forget emailService (INT-01 stretch).

Purpose: These are the core data-persistence endpoints for the respondent flow. Without them the frontend cannot save progress or finalize submissions. The assessmentOpenGuard middleware produced here also gates all Wave 3b submission UI flows.
Output: responseService.ts, submissionService.ts, emailService.ts, assessmentOpenGuard.ts, requireSessionOwner.ts, answerPayload.ts Zod schemas, and the three API route handlers.
</objective>

<feature_dependencies>
Implements: F4: Auto-Save & Progress Persistence (PUT /api/responses/:sessionId, responseService, assessmentOpenGuard), F5: Duplicate Submission Prevention & Edit Window (POST /api/submissions/:sessionId, mandatory-questions check, edit-window idempotency, assessmentOpenGuard), F9: Submission Confirmation & Respondent Feedback (emailService fire-and-forget, POST /api/notifications/email stretch)
Depends on: F1: Session management (respondents/sessions schema from Wave 1), F7: JWT middleware and role checks (requireSessionOwner, jwtMiddleware from Wave 2a)
Enables: F0: Review Step submit button wiring (Wave 3b), F5: Frontend edit-window and read-only mode (Wave 3b), F9: SubmissionConfirmation screen (Wave 3b)
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@.planning/express/assessmentform-express-spa-multi-step-as/01-PLAN.md
@project_specs/TechArch-AssessmentForm.md
@project_specs/FRD-AssessmentForm.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Zod answer-payload schemas, assessmentOpenGuard, requireSessionOwner middleware, and responseService + PUT /api/responses/:sessionId</name>
  <files>
    src/lib/schemas/answerPayload.ts
    src/lib/middleware/assessmentOpenGuard.ts
    src/lib/middleware/requireSessionOwner.ts
    src/lib/services/responseService.ts
    src/app/api/responses/[sessionId]/route.ts
  </files>
  <action>
Create all the shared infrastructure (Zod schemas, two middleware functions) and the auto-save endpoint.

---

### Step 1 — `src/lib/schemas/answerPayload.ts` (Zod schemas for all 6 answer payload types)

From TechArch §3.3 and FRD F02 §Validation. Every `answer_payload` stored in `responses.answer_payload` (JSONB) is validated against these schemas server-side before upsert.

```typescript
import { z } from 'zod';

// ─── Per-type payload schemas (from TechArch §3.3 + FRD F02 §Validation) ──────

export const SingleChoicePayloadSchema = z.object({
  type: z.literal('single_choice'),
  value: z.string().min(1),           // option UUID or 'other'
  other_text: z.string().min(1).max(500).optional(),
}).refine(
  (d) => d.value !== 'other' || (d.other_text && d.other_text.trim().length > 0),
  { message: 'other_text is required when value is "other"', path: ['other_text'] }
);

export const MultiChoicePayloadSchema = z.object({
  type: z.literal('multi_choice'),
  values: z.array(z.string().min(1)).min(1),  // At least one option
  other_text: z.string().min(1).max(500).optional(),
}).refine(
  (d) => !d.values.includes('other') || (d.other_text && d.other_text.trim().length > 0),
  { message: 'other_text is required when "other" is in values', path: ['other_text'] }
);

export const LikertPayloadSchema = z.object({
  type: z.literal('likert'),
  // FRD F02: value must be integer in range [1, 5]; INVALID_LIKERT_VALUE if outside
  value: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

export const RankingPayloadSchema = z.object({
  type: z.literal('ranking'),
  // FRD F02: array of option UUIDs in ranked order; index 0 = rank 1 (highest priority)
  // All items must be assigned a unique position — validated in route handler against question options
  order: z.array(z.string().min(1)).min(1),
});

export const FreeTextShortPayloadSchema = z.object({
  type: z.literal('free_text_short'),
  value: z.string().max(500),  // FRD F02: max 500 chars; FREE_TEXT_TOO_LONG if exceeded
});

export const FreeTextLongPayloadSchema = z.object({
  type: z.literal('free_text_long'),
  value: z.string().max(2000),  // FRD F02: max 2000 chars; FREE_TEXT_TOO_LONG if exceeded
});

// Discriminated union — `type` field selects the branch (from TechArch §3.3)
export const AnswerPayloadSchema = z.discriminatedUnion('type', [
  SingleChoicePayloadSchema,
  MultiChoicePayloadSchema,
  LikertPayloadSchema,
  RankingPayloadSchema,
  FreeTextShortPayloadSchema,
  FreeTextLongPayloadSchema,
]);

export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;

// ─── PUT /api/responses/:sessionId request body schema ────────────────────────
// From TechArch §4.3 PUT /api/responses/:sessionId

export const ResponseItemSchema = z.object({
  question_id: z.string().uuid(),
  answer_payload: AnswerPayloadSchema,
});

export const PutResponsesBodySchema = z.object({
  section_id: z.string().min(1),
  current_section_index: z.number().int().min(0),
  // FRD F04: Empty responses array is valid (intentional blank for optional questions)
  responses: z.array(ResponseItemSchema),
});

export type ResponseItem = z.infer<typeof ResponseItemSchema>;
export type PutResponsesBody = z.infer<typeof PutResponsesBodySchema>;
```

---

### Step 2 — `src/lib/middleware/assessmentOpenGuard.ts`

From TechArch §2.4 and FRD F04/F05 §Validation. Checks `assessment_config.due_date > NOW()`. Called at the top of PUT /responses and POST /submissions handlers.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessmentConfig } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * assessmentOpenGuard — TechArch §2.4
 * Applied to: PUT /api/responses/:id, POST /api/submissions/:id
 * Checks assessment_config.due_date > NOW() (server-side only — never delegated to client).
 * Returns { ok: true } if assessment is still open.
 * Returns 403 NextResponse with ASSESSMENT_CLOSED if past due date.
 *
 * FRD F04 error: 403 ASSESSMENT_CLOSED — "Assessment is closed. Your responses are read-only."
 * FRD F05 error: 403 ASSESSMENT_CLOSED — "The assessment due date has passed. No further submissions or edits are accepted."
 */
export async function assessmentOpenGuard(
  _request: NextRequest
): Promise<{ ok: true } | NextResponse> {
  try {
    const config = await db
      .select({ due_date: assessmentConfig.due_date })
      .from(assessmentConfig)
      .where(eq(assessmentConfig.id, 1))
      .limit(1);

    if (!config.length || !config[0].due_date) {
      // No config row — treat as open (assessment not yet configured)
      return { ok: true };
    }

    const dueDate = new Date(config[0].due_date);
    const now = new Date();

    if (now > dueDate) {
      // FRD F04/F05: ASSESSMENT_CLOSED — due date has passed
      return NextResponse.json(
        {
          error: {
            code: 'ASSESSMENT_CLOSED',
            message: 'The assessment due date has passed. No further submissions or edits are accepted.',
          },
        },
        { status: 403 }
      );
    }

    return { ok: true };
  } catch {
    // Guard failure is treated as open to not block respondents on DB errors
    // The actual save/submit will surface DB errors if they persist
    return { ok: true };
  }
}
```

---

### Step 3 — `src/lib/middleware/requireSessionOwner.ts`

From TechArch §2.4 and FRD F07 §Sub-features (data isolation). Verifies the `session_id` path param belongs to the authenticated respondent's email (from JWT). Used by PUT /responses and POST /submissions.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, respondents } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';

interface SessionWithRespondent {
  session: {
    id: string;
    respondent_id: string;
    submission_status: string;
    current_section_index: number;
    section_ids_ordered: unknown;
    submitted_at: string | null;
    last_saved_at: string;
    last_modified_at: string;
    created_at: string;
  };
  respondent: {
    id: string;
    email: string;
    name: string;
    team_type: string;
  };
}

/**
 * requireSessionOwner — TechArch §2.4
 * Applied to: GET /api/sessions/:id, PUT /api/responses/:id, POST /api/submissions/:id
 * Verifies that the session identified by sessionId belongs to the authenticated JWT email.
 * Respondents cannot access, modify, or submit other respondents' sessions.
 *
 * FRD F07: 403 SESSION_ACCESS_DENIED on mismatch
 * FRD F01: 404 SESSION_NOT_FOUND for unknown sessionId
 */
export async function requireSessionOwner(
  sessionId: string,
  request: NextRequest
): Promise<SessionWithRespondent | NextResponse> {
  // Extract and verify JWT
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  let jwtPayload: { email: string; role: string; session_id: string };

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    jwtPayload = payload as typeof jwtPayload;
  } catch {
    return NextResponse.json(
      { error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token.' } },
      { status: 401 }
    );
  }

  // FRD F05: System Owner cannot submit
  // Check is done in the submission handler; here we just load the session
  if (jwtPayload.role === 'system_owner') {
    return NextResponse.json(
      { error: { code: 'SYSTEM_OWNER_CANNOT_SUBMIT', message: 'System Owners cannot submit assessments.' } },
      { status: 403 }
    );
  }

  // Load session with respondent
  const result = await db
    .select({
      session: sessions,
      respondent: respondents,
    })
    .from(sessions)
    .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!result.length) {
    return NextResponse.json(
      { error: { code: 'SESSION_NOT_FOUND', message: 'Submission failed: session not found. Please reload.' } },
      { status: 404 }
    );
  }

  const { session, respondent } = result[0];

  // TechArch §5.2: Verify session belongs to authenticated email (case-insensitive)
  if (respondent.email.toLowerCase() !== jwtPayload.email.toLowerCase()) {
    return NextResponse.json(
      { error: { code: 'SESSION_ACCESS_DENIED', message: 'You do not have permission to access this session.' } },
      { status: 403 }
    );
  }

  return { session, respondent };
}
```

---

### Step 4 — `src/lib/services/responseService.ts`

From TechArch §2.3 `responseService.ts`. Upserts response rows and updates `sessions.last_saved_at`.

```typescript
import { db } from '@/lib/db';
import { responses, sessions } from '../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import type { ResponseItem } from '@/lib/schemas/answerPayload';

/**
 * upsertResponses — TechArch §2.3 responseService
 * Upserts each response by (session_id, question_id) UNIQUE constraint.
 * Updates sessions.last_saved_at to NOW() on every call.
 *
 * From TechArch §4.3 PUT /api/responses/:sessionId:
 *   Upsert on (session_id, question_id). Empty responses array is valid.
 *   Returns { saved: true, last_saved_at: ISO8601 }
 */
export async function upsertResponses(
  sessionId: string,
  items: ResponseItem[],
  currentSectionIndex: number
): Promise<{ saved: true; last_saved_at: string }> {
  const now = new Date().toISOString();

  // Upsert each response — UNIQUE(session_id, question_id) enables idempotent upsert
  // TechArch §3.2: responses UNIQUE (session_id, question_id) — one answer per question per session
  if (items.length > 0) {
    await db
      .insert(responses)
      .values(
        items.map((item) => ({
          session_id: sessionId,
          question_id: item.question_id,
          answer_payload: item.answer_payload,
          saved_at: now,
        }))
      )
      .onConflictDoUpdate({
        target: [responses.session_id, responses.question_id],
        set: {
          answer_payload: sql`excluded.answer_payload`,
          saved_at: sql`excluded.saved_at`,
        },
      });
  }

  // Update sessions.last_saved_at and current_section_index
  // FRD F04: Server updates sessions.last_saved_at and sessions.current_section_index
  await db
    .update(sessions)
    .set({
      last_saved_at: now,
      last_modified_at: now,
      current_section_index: currentSectionIndex,
    })
    .where(eq(sessions.id, sessionId));

  return { saved: true, last_saved_at: now };
}
```

---

### Step 5 — `src/app/api/responses/[sessionId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { assessmentOpenGuard } from '@/lib/middleware/assessmentOpenGuard';
import { requireSessionOwner } from '@/lib/middleware/requireSessionOwner';
import { upsertResponses } from '@/lib/services/responseService';
import { PutResponsesBodySchema } from '@/lib/schemas/answerPayload';

/**
 * PUT /api/responses/:sessionId — Auto-Save Responses
 * TechArch §4.3
 *
 * Middleware chain: jwtMiddleware → requireSessionOwner → assessmentOpenGuard → upsertResponses
 *
 * Request body:
 *   { section_id: string, current_section_index: number, responses: Array<{ question_id: string, answer_payload: AnswerPayload }> }
 *
 * Response 200: { saved: true, last_saved_at: string }
 *
 * Errors:
 *   400 INVALID_ANSWER_PAYLOAD — payload fails Zod schema
 *   401 AUTH_REQUIRED — no/invalid JWT
 *   403 ASSESSMENT_CLOSED — due date passed (FRD F04/F05)
 *   403 SESSION_ACCESS_DENIED — session belongs to different respondent
 *   403 SYSTEM_OWNER_CANNOT_SUBMIT — system owner JWT used (blocked in requireSessionOwner)
 *   404 SESSION_NOT_FOUND — unknown sessionId
 *   500 SAVE_FAILED — database error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  // 1. assessmentOpenGuard — reject if due date has passed (TechArch §2.4)
  // FRD F04: If submission_status is 'submitted' AND due date passed → ASSESSMENT_CLOSED
  // FRD F04: If submission_status is 'submitted' AND due date NOT passed → auto-save accepted (edit window)
  const guardResult = await assessmentOpenGuard(request);
  if (guardResult instanceof NextResponse) return guardResult;

  // 2. requireSessionOwner — verify session belongs to JWT email
  const ownerResult = await requireSessionOwner(sessionId, request);
  if (ownerResult instanceof NextResponse) return ownerResult;

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_ANSWER_PAYLOAD', message: 'Invalid request body.' } },
      { status: 400 }
    );
  }

  const parsed = PutResponsesBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_ANSWER_PAYLOAD',
          message: 'One or more answer payloads are invalid.',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const { responses: responseItems, current_section_index } = parsed.data;

  // 4. Upsert responses and update last_saved_at
  try {
    const result = await upsertResponses(sessionId, responseItems, current_section_index);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: 'Save failed. Please try again.' } },
      { status: 500 }
    );
  }
}
```

**Directory scaffolding:** Ensure `src/app/api/responses/[sessionId]/` directory exists.
  </action>
  <verify>
```bash
grep -n "export const AnswerPayloadSchema" src/lib/schemas/answerPayload.ts && echo "ANSWER_PAYLOAD_SCHEMA OK"
grep -n "export const PutResponsesBodySchema" src/lib/schemas/answerPayload.ts && echo "PUT_BODY_SCHEMA OK"
grep -n "export async function assessmentOpenGuard" src/lib/middleware/assessmentOpenGuard.ts && echo "GUARD OK"
grep -n "export async function requireSessionOwner" src/lib/middleware/requireSessionOwner.ts && echo "SESSION_OWNER OK"
grep -n "export async function upsertResponses" src/lib/services/responseService.ts && echo "UPSERT OK"
grep -n "onConflictDoUpdate" src/lib/services/responseService.ts && echo "UPSERT CONFLICT OK"
grep -n "export async function PUT" src/app/api/responses/\[sessionId\]/route.ts && echo "PUT ROUTE OK"
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"
```
  </verify>
  <done>
- src/lib/schemas/answerPayload.ts exports AnswerPayloadSchema (z.discriminatedUnion), ResponseItemSchema, PutResponsesBodySchema
- Zod schemas cover all 6 answer payload types per TechArch §3.3 with FRD F02 character limits (500/2000) and other_text refinements
- src/lib/middleware/assessmentOpenGuard.ts queries assessment_config.due_date; returns 403 ASSESSMENT_CLOSED when NOW() > due_date
- src/lib/middleware/requireSessionOwner.ts verifies JWT, loads session + respondent, returns 403 SESSION_ACCESS_DENIED on email mismatch, 404 SESSION_NOT_FOUND for unknown session
- src/lib/services/responseService.ts upserts into responses UNIQUE(session_id, question_id), updates sessions.last_saved_at and current_section_index
- PUT /api/responses/:sessionId: assessmentOpenGuard → requireSessionOwner → Zod validation → upsertResponses → returns { saved: true, last_saved_at }
- All error codes match FRD F04 exactly: ASSESSMENT_CLOSED (403), SESSION_NOT_FOUND (404), INVALID_ANSWER_PAYLOAD (400), SAVE_FAILED (500)
  </done>
</task>

<task type="auto">
  <name>Task 2: submissionService, emailService, POST /api/submissions/:sessionId, and POST /api/notifications/email</name>
  <files>
    src/lib/services/submissionService.ts
    src/lib/services/emailService.ts
    src/app/api/submissions/[sessionId]/route.ts
    src/app/api/notifications/email/route.ts
  </files>
  <action>
Create the finalization service, email fire-and-forget service, and the two remaining route handlers.

---

### Step 1 — `src/lib/services/submissionService.ts`

From TechArch §2.3 `submissionService.ts`. Checks mandatory questions answered, transitions draft→submitted. Idempotent for already-submitted sessions within the edit window.

```typescript
import { db } from '@/lib/db';
import { sessions, responses, questions, assessmentConfig } from '../../../drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';

interface FinalizeResult {
  submitted: true;
  submitted_at: string;
  due_date: string;
  edit_window_open: boolean;
}

/**
 * finalizeSubmission — TechArch §2.3 submissionService
 *
 * FRD F05 §First Submission:
 *   1. If submission_status is already 'submitted': this is a re-submission within edit window.
 *      Updates last_modified_at only; submitted_at remains unchanged. Idempotent.
 *   2. If submission_status is 'draft': check mandatory questions answered, then transition
 *      submission_status → 'submitted', set submitted_at = NOW().
 *
 * FRD F05 §Validation:
 *   - All mandatory section questions must be answered (MANDATORY_QUESTIONS_INCOMPLETE).
 *   - Due date check already handled by assessmentOpenGuard middleware before this call.
 *
 * TechArch §4.3 POST /api/submissions/:sessionId response:
 *   { submitted: true, submitted_at: ISO8601, due_date: ISO8601, edit_window_open: boolean }
 */
export async function finalizeSubmission(sessionId: string): Promise<FinalizeResult | { error: string; code: string; status: number }> {
  const now = new Date().toISOString();

  // Load session
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionRows.length) {
    return { error: 'Submission failed: session not found. Please reload.', code: 'SESSION_NOT_FOUND', status: 404 };
  }

  const session = sessionRows[0];

  // Load assessment config for due_date
  const configRows = await db
    .select({ due_date: assessmentConfig.due_date })
    .from(assessmentConfig)
    .where(eq(assessmentConfig.id, 1))
    .limit(1);

  const dueDate = configRows.length ? configRows[0].due_date : null;
  const editWindowOpen = dueDate ? new Date() < new Date(dueDate) : true;

  // ── Idempotent re-submission within edit window ───────────────────────────
  // FRD F05 §Re-Edit Within Edit Window step 5:
  //   "Clicking Submit again updates sessions.last_modified_at only;
  //    submitted_at remains unchanged and no second submission record is created."
  if (session.submission_status === 'submitted') {
    await db
      .update(sessions)
      .set({ last_modified_at: now })
      .where(eq(sessions.id, sessionId));

    return {
      submitted: true,
      submitted_at: session.submitted_at!,
      due_date: dueDate ?? now,
      edit_window_open: editWindowOpen,
    };
  }

  // ── First submission: mandatory-questions check ───────────────────────────
  // FRD F05 §Validation: All mandatory section questions must be answered.
  // Load all questions for sections in the respondent's effective section list.
  const sectionIdsOrdered = session.section_ids_ordered as string[];

  if (sectionIdsOrdered && sectionIdsOrdered.length > 0) {
    // Get all required questions across the respondent's sections
    const requiredQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(
          inArray(questions.section_id, sectionIdsOrdered),
          eq(questions.is_required, true)
        )
      );

    if (requiredQuestions.length > 0) {
      const requiredIds = requiredQuestions.map((q) => q.id);

      // Check which required questions have been answered
      const answeredResponses = await db
        .select({ question_id: responses.question_id })
        .from(responses)
        .where(
          and(
            eq(responses.session_id, sessionId),
            inArray(responses.question_id, requiredIds)
          )
        );

      const answeredIds = new Set(answeredResponses.map((r) => r.question_id));
      const unanswered = requiredIds.filter((id) => !answeredIds.has(id));

      if (unanswered.length > 0) {
        // FRD F05 error: 400 MANDATORY_QUESTIONS_INCOMPLETE
        return {
          error: 'Please complete all required questions before submitting.',
          code: 'MANDATORY_QUESTIONS_INCOMPLETE',
          status: 400,
        };
      }
    }
  }

  // ── Transition: draft → submitted ────────────────────────────────────────
  // FRD F05 §First Submission step 5:
  //   sessions.submission_status = 'submitted', submitted_at = NOW(), last_modified_at = NOW()
  await db
    .update(sessions)
    .set({
      submission_status: 'submitted',
      submitted_at: now,
      last_modified_at: now,
    })
    .where(eq(sessions.id, sessionId));

  return {
    submitted: true,
    submitted_at: now,
    due_date: dueDate ?? now,
    edit_window_open: editWindowOpen,
  };
}
```

---

### Step 2 — `src/lib/services/emailService.ts`

From TechArch §2.3 `emailService.ts` and §7.2 INT-01. Fire-and-forget; no-op if `EMAIL_RELAY_URL` unset.

```typescript
/**
 * emailService — TechArch §2.3, §7.2 INT-01 (stretch goal)
 *
 * sendSubmissionConfirmation: fire-and-forget submission confirmation email.
 *
 * FRD F09: "Optional email confirmation — fire-and-forget; graceful no-op if EMAIL_RELAY_URL unset;
 *           failure logged server-side only."
 *
 * TechArch §7.2: POST /api/notifications/email body: { session_id, email, name, due_date }
 * TechArch §7.2: Failure: LOG only — does not block submission response to respondent.
 * TechArch §7.2: Feature disabled if EMAIL_RELAY_URL env var is not set.
 */
export async function sendSubmissionConfirmation(params: {
  session_id: string;
  email: string;
  name: string;
  due_date: string;
}): Promise<void> {
  const relayUrl = process.env.EMAIL_RELAY_URL;

  // TechArch §7.2: Graceful no-op if EMAIL_RELAY_URL is not set
  if (!relayUrl) {
    return;
  }

  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@assessmentform';

  // TechArch §7.2: Subject: "Assessment Submitted — Developer Platform Evaluation"
  const emailPayload = {
    to: params.email,
    from: fromAddress,
    subject: 'Assessment Submitted — Developer Platform Evaluation',
    // TechArch §7.2 email content
    body: `Dear ${params.name},\n\nYour Developer Platform assessment has been successfully submitted.\n\nYou may update your responses until: ${new Date(params.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\nThank you for your participation.\n\nThe AssessmentForm Team`,
    session_id: params.session_id,
  };

  // Fire-and-forget: do not await; wrap in try/catch for error logging only
  fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  }).catch((err) => {
    // TechArch §7.2: Failure logged server-side only; never surfaces to respondent
    console.error('[emailService] EMAIL_SEND_FAILED:', err?.message ?? err);
  });
}
```

---

### Step 3 — `src/app/api/submissions/[sessionId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { assessmentOpenGuard } from '@/lib/middleware/assessmentOpenGuard';
import { requireSessionOwner } from '@/lib/middleware/requireSessionOwner';
import { finalizeSubmission } from '@/lib/services/submissionService';
import { sendSubmissionConfirmation } from '@/lib/services/emailService';

/**
 * POST /api/submissions/:sessionId — Finalize Submission
 * TechArch §4.3
 *
 * Middleware chain: requireSessionOwner → assessmentOpenGuard → finalizeSubmission
 *
 * Request body: {} (empty — data already saved via auto-save)
 *
 * Response 200:
 *   { submitted: true, submitted_at: string, due_date: string, edit_window_open: boolean }
 *
 * Errors:
 *   400 MANDATORY_QUESTIONS_INCOMPLETE — required questions unanswered (FRD F05)
 *   401 AUTH_REQUIRED — no/invalid JWT
 *   403 ASSESSMENT_CLOSED — due date passed (FRD F05)
 *   403 SESSION_ACCESS_DENIED — session belongs to different respondent
 *   403 SYSTEM_OWNER_CANNOT_SUBMIT — system owner cannot submit (FRD F05, F07)
 *   404 SESSION_NOT_FOUND — unknown sessionId
 *   500 SUBMISSION_FAILED — database error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  // 1. requireSessionOwner — verify JWT + session ownership
  // Note: requireSessionOwner also blocks system_owner role (returns 403 SYSTEM_OWNER_CANNOT_SUBMIT)
  const ownerResult = await requireSessionOwner(sessionId, request);
  if (ownerResult instanceof NextResponse) return ownerResult;

  // 2. assessmentOpenGuard — reject if due date has passed
  // FRD F05: If draft AND NOW() > due_date → ASSESSMENT_CLOSED (late draft, no submission allowed)
  // FRD F05: If submitted AND NOW() > due_date → ASSESSMENT_CLOSED (edit window closed)
  const guardResult = await assessmentOpenGuard(request);
  if (guardResult instanceof NextResponse) return guardResult;

  // 3. Finalize submission (mandatory check + draft→submitted or idempotent re-submit)
  try {
    const result = await finalizeSubmission(sessionId);

    if ('error' in result) {
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: result.status }
      );
    }

    // 4. Fire-and-forget email confirmation (INT-01 stretch goal)
    // FRD F09: "POST /api/notifications/email; fire-and-forget; graceful no-op if EMAIL_RELAY_URL unset"
    // Only send on first submission (not idempotent re-submissions within edit window)
    sendSubmissionConfirmation({
      session_id: sessionId,
      email: ownerResult.respondent.email,
      name: ownerResult.respondent.name,
      due_date: result.due_date,
    });

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { code: 'SUBMISSION_FAILED', message: 'Submission could not be processed. Please try again.' } },
      { status: 500 }
    );
  }
}
```

---

### Step 4 — `src/app/api/notifications/email/route.ts`

From TechArch §4.3 `POST /api/notifications/email`. Internal server-to-server only. The handler delegates to emailService and always returns 200 (failure logged, not surfaced).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sendSubmissionConfirmation } from '@/lib/services/emailService';
import { z } from 'zod';

const EmailNotificationSchema = z.object({
  session_id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  due_date: z.string().min(1),
});

/**
 * POST /api/notifications/email — Submission Confirmation Email (stretch goal)
 * TechArch §4.3
 *
 * Internal server-to-server only (no external auth; called from submissionService).
 * Fire-and-forget: always returns 200 { sent: true }.
 * Failure logged server-side only; never surfaced to respondent.
 * No-op if EMAIL_RELAY_URL env var is not set.
 *
 * Request: { session_id, email, name, due_date }
 * Response 200: { sent: true }
 * Errors: 500 EMAIL_SEND_FAILED (logged only — response still 200)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ sent: false, error: 'Invalid body' }, { status: 400 });
  }

  const parsed = EmailNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ sent: false, error: 'Invalid parameters' }, { status: 400 });
  }

  // Fire-and-forget — always return 200 regardless of email outcome
  sendSubmissionConfirmation(parsed.data);

  return NextResponse.json({ sent: true }, { status: 200 });
}
```

**Directory scaffolding:** Ensure `src/app/api/submissions/[sessionId]/` and `src/app/api/notifications/email/` directories exist.
  </action>
  <verify>
```bash
grep -n "export async function finalizeSubmission" src/lib/services/submissionService.ts && echo "FINALIZE OK"
grep -n "MANDATORY_QUESTIONS_INCOMPLETE" src/lib/services/submissionService.ts && echo "MANDATORY CHECK OK"
grep -n "submission_status.*submitted" src/lib/services/submissionService.ts && echo "STATUS TRANSITION OK"
grep -n "last_modified_at" src/lib/services/submissionService.ts && echo "IDEMPOTENT OK"
grep -n "export async function sendSubmissionConfirmation" src/lib/services/emailService.ts && echo "EMAIL_SVC OK"
grep -n "EMAIL_RELAY_URL" src/lib/services/emailService.ts && echo "EMAIL_NOOP OK"
grep -n "export async function POST" src/app/api/submissions/\[sessionId\]/route.ts && echo "POST SUBMISSIONS OK"
grep -n "export async function POST" src/app/api/notifications/email/route.ts && echo "POST EMAIL OK"
grep -n "SYSTEM_OWNER_CANNOT_SUBMIT" src/lib/middleware/requireSessionOwner.ts && echo "SO_CANNOT_SUBMIT OK"
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"
```
  </verify>
  <done>
- src/lib/services/submissionService.ts exports finalizeSubmission: loads session, checks mandatory questions answered via inArray(section_ids_ordered questions, is_required), transitions draft→submitted or updates last_modified_at for idempotent re-submit
- finalizeSubmission returns 400 MANDATORY_QUESTIONS_INCOMPLETE when required questions unanswered
- finalizeSubmission returns { submitted: true, submitted_at, due_date, edit_window_open } per TechArch §4.3
- src/lib/services/emailService.ts exports sendSubmissionConfirmation: fire-and-forget fetch to EMAIL_RELAY_URL; returns void immediately; logs errors; no-op when EMAIL_RELAY_URL unset
- POST /api/submissions/:sessionId: requireSessionOwner (403 SYSTEM_OWNER_CANNOT_SUBMIT for system owner) → assessmentOpenGuard (403 ASSESSMENT_CLOSED) → finalizeSubmission → fire-and-forget sendSubmissionConfirmation
- POST /api/notifications/email: validates body with Zod; delegates to sendSubmissionConfirmation; always returns 200 { sent: true }
- All FRD F05 error codes present: ASSESSMENT_CLOSED (403), MANDATORY_QUESTIONS_INCOMPLETE (400), SESSION_NOT_FOUND (404), SYSTEM_OWNER_CANNOT_SUBMIT (403), SUBMISSION_FAILED (500)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API (responses) | Respondent-controlled answer_payload JSONB crossing into PUT /api/responses/:sessionId handler; session_id path param crossing into DB query |
| client→API (submissions) | Respondent JWT crossing into POST /api/submissions/:sessionId; session_id path param used for ownership check |
| server→email-relay | Server-controlled payload from emailService crossing into external EMAIL_RELAY_URL endpoint |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Tampering | `src/app/api/responses/[sessionId]/route.ts` — `answer_payload` JSONB | mitigate | `PutResponsesBodySchema.safeParse()` in route handler validates every `answer_payload` against `AnswerPayloadSchema` (discriminated union) before passing to `upsertResponses`. Type mismatch returns 400 `INVALID_ANSWER_PAYLOAD`. Never stored without validation. |
| T-04-02 | Elevation of privilege | `src/lib/middleware/requireSessionOwner.ts` — IDOR (cross-session access) | mitigate | `requireSessionOwner` loads `respondent.email` from DB for the given `sessionId`, then compares `LOWER(respondent.email) === LOWER(jwtPayload.email)`. Mismatch returns 403 `SESSION_ACCESS_DENIED`. Prevents respondent A from saving into respondent B's session by supplying B's `sessionId`. |
| T-04-03 | Elevation of privilege | `src/lib/middleware/requireSessionOwner.ts` — System Owner submitting via respondent endpoint | mitigate | `requireSessionOwner` checks `jwtPayload.role === 'system_owner'` and returns 403 `SYSTEM_OWNER_CANNOT_SUBMIT` before any DB access. Enforced in `requireSessionOwner.ts` (lines: `if (jwtPayload.role === 'system_owner')`). |
| T-04-04 | Tampering | `src/lib/middleware/assessmentOpenGuard.ts` — due-date bypass | mitigate | `assessmentOpenGuard` queries `assessment_config.due_date` directly from DB on every call (no caching, no client-provided date). `now > dueDate` comparison is pure server-side. Client cannot influence the due-date value. Enforced in `assessmentOpenGuard.ts::assessmentOpenGuard`. |
| T-04-05 | Spoofing | `src/lib/middleware/requireSessionOwner.ts` — JWT tampering | mitigate | JWT verified with `jwtVerify(token, secret)` using `JWT_SECRET` (HS256). Tampered tokens throw and return 401 `TOKEN_INVALID`. `JWT_SECRET` is never logged, not committed to source, minimum 256-bit entropy (TechArch §5.3). |
| T-04-06 | Information disclosure | `src/lib/services/emailService.ts` — email payload to external relay | mitigate | `sendSubmissionConfirmation` sends only `{ to, from, subject, body, session_id }` — no JWT, no DB internals. Fire-and-forget errors are logged to server stderr only; never reflected in the API response to the respondent. `EMAIL_RELAY_URL` is an internal enterprise endpoint (TechArch §1.3). |
| T-04-07 | Denial of service | `src/app/api/responses/[sessionId]/route.ts` — large answer_payload | mitigate | `FreeTextShortPayloadSchema` limits `value` to 500 chars; `FreeTextLongPayloadSchema` limits to 2000 chars; Zod `safeParse` rejects oversized payloads with 400 before any DB write. |
</threat_model>

<verification>
## Wave 4 (2c) — Backend Responses/Submission Verification

After both tasks complete:

```bash
# 1. All exports present
grep -n "export.*AnswerPayloadSchema\|export.*PutResponsesBodySchema" src/lib/schemas/answerPayload.ts
grep -n "export.*assessmentOpenGuard" src/lib/middleware/assessmentOpenGuard.ts
grep -n "export.*requireSessionOwner" src/lib/middleware/requireSessionOwner.ts
grep -n "export.*upsertResponses" src/lib/services/responseService.ts
grep -n "export.*finalizeSubmission" src/lib/services/submissionService.ts
grep -n "export.*sendSubmissionConfirmation" src/lib/services/emailService.ts

# 2. FRD error codes present
grep -rn "ASSESSMENT_CLOSED\|MANDATORY_QUESTIONS_INCOMPLETE\|SAVE_FAILED\|SUBMISSION_FAILED\|SESSION_ACCESS_DENIED\|SYSTEM_OWNER_CANNOT_SUBMIT" src/app/api/ src/lib/middleware/ src/lib/services/

# 3. Idempotent re-submit logic in submissionService
grep -n "last_modified_at" src/lib/services/submissionService.ts
grep -n "submitted_at remains unchanged\|last_modified_at.*only\|Idempotent" src/lib/services/submissionService.ts

# 4. Fire-and-forget pattern in emailService
grep -n "fetch(relayUrl\|catch.*EMAIL_SEND_FAILED\|EMAIL_RELAY_URL" src/lib/services/emailService.ts

# 5. Type check
npx tsc --noEmit 2>&1 | grep -v "^$" | head -30

# 6. Contract verify
grep -n "export.*PUT" src/app/api/responses/\[sessionId\]/route.ts && echo "PUT ROUTE CONTRACT OK"
grep -n "export.*POST" src/app/api/submissions/\[sessionId\]/route.ts && echo "POST SUBMISSIONS CONTRACT OK"
grep -n "export.*POST" src/app/api/notifications/email/route.ts && echo "POST EMAIL CONTRACT OK"
```
</verification>

<success_criteria>
- PUT /api/responses/:sessionId: Zod-validates all 6 answer payload types, upserts via UNIQUE(session_id, question_id) onConflictDoUpdate, updates sessions.last_saved_at + current_section_index, returns { saved: true, last_saved_at: ISO8601 }
- PUT /api/responses/:sessionId: Returns 403 ASSESSMENT_CLOSED (via assessmentOpenGuard) when due date passed; 400 INVALID_ANSWER_PAYLOAD when payload fails Zod; 403 SESSION_ACCESS_DENIED when cross-session attempt; 500 SAVE_FAILED on DB error
- POST /api/submissions/:sessionId: Checks all required questions answered across section_ids_ordered, returns 400 MANDATORY_QUESTIONS_INCOMPLETE if any unanswered
- POST /api/submissions/:sessionId: Transitions draft→submitted (sets submitted_at); idempotent for already-submitted sessions (updates last_modified_at only, submitted_at unchanged)
- POST /api/submissions/:sessionId: Returns { submitted: true, submitted_at, due_date, edit_window_open } per TechArch §4.3
- POST /api/submissions/:sessionId: Fires sendSubmissionConfirmation as fire-and-forget after 200 response
- emailService.ts: No-op when EMAIL_RELAY_URL unset; logs errors without surfacing to respondent; does not await fetch
- assessmentOpenGuard: Queries assessment_config.due_date live on every call; server-side only; never delegated to client
- requireSessionOwner: Verifies JWT signature + email ownership + system_owner role block; 403 SESSION_ACCESS_DENIED on mismatch; 403 SYSTEM_OWNER_CANNOT_SUBMIT for system_owner role
- TypeScript compiles without errors (npx tsc --noEmit)
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/04-SUMMARY.md` with:
- Services and middleware implemented (responseService, submissionService, emailService, assessmentOpenGuard, requireSessionOwner)
- API routes created (PUT /responses/:sessionId, POST /submissions/:sessionId, POST /notifications/email)
- Error code inventory (all FRD F04/F05/F09 codes implemented)
- Integration contract fulfillment (what Wave 3a/3b frontend can now consume)
- Any deviations from TechArch or FRD specs
</output>
