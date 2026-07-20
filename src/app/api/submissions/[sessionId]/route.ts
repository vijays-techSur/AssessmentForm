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
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

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
