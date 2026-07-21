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
