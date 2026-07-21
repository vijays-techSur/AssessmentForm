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
