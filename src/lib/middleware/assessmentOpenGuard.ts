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
