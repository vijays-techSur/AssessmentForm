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
