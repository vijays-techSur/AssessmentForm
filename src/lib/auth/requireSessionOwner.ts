import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, respondents } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { AuthenticatedRequest } from '@/types/auth';

// TechArch §2.4 + §5.2: requireSessionOwner — session_id in path must belong to JWT email
// System Owners bypass (they can read any session via dashboard; direct session routes still check)
// FRD F07: 403 SESSION_ACCESS_DENIED
export function requireSessionOwner(
  handler: (req: AuthenticatedRequest, sessionId: string) => Promise<NextResponse>
): (req: AuthenticatedRequest, ctx: { params: Promise<{ sessionId: string }> | { sessionId: string } }) => Promise<NextResponse> {
  return async (req: AuthenticatedRequest, ctx: { params: Promise<{ sessionId: string }> | { sessionId: string } }) => {
    const resolvedParams = ctx.params instanceof Promise ? await ctx.params : ctx.params;
    const { sessionId } = resolvedParams;

    // System Owners: bypass ownership check (but dashboard routes use requireSystemOwner instead)
    if (req.user.role === 'system_owner') {
      return handler(req, sessionId);
    }

    // Respondent: verify session belongs to their email
    const result = await db
      .select({ respondent_email: respondents.email })
      .from(sessions)
      .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Your previous session could not be found. Please re-enter your details.' } },
        { status: 404 }
      );
    }

    // Case-insensitive email comparison (TechArch §5.2 data isolation)
    if (result[0].respondent_email.toLowerCase() !== req.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: { code: 'SESSION_ACCESS_DENIED', message: 'You do not have access to this session.' } },
        { status: 403 }
      );
    }

    return handler(req, sessionId);
  };
}
