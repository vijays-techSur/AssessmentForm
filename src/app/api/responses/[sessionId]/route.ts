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
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

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
