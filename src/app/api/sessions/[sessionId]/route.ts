import { NextRequest, NextResponse } from 'next/server';
import { jwtMiddleware } from '@/lib/auth/jwtMiddleware';
import { requireSessionOwner } from '@/lib/auth/requireSessionOwner';
import { getSessionById } from '@/lib/session/sessionService';
import type { AuthenticatedRequest } from '@/types/auth';

async function handleGet(
  req: AuthenticatedRequest,
  sessionId: string
): Promise<NextResponse> {
  try {
    const sessionResponse = await getSessionById(sessionId, req.user.email);
    return NextResponse.json(sessionResponse);
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string };
    if (e.code === 'SESSION_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Your previous session could not be found. Please re-enter your details.' } },
        { status: 404 }
      );
    }
    if (e.code === 'SESSION_ACCESS_DENIED') {
      return NextResponse.json(
        { error: { code: 'SESSION_ACCESS_DENIED', message: 'You do not have access to this session.' } },
        { status: 403 }
      );
    }
    console.error('[GET /api/sessions/:sessionId] Error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}

// Route handler: jwtMiddleware → requireSessionOwner → handleGet
// TechArch §2.4: jwtMiddleware applied; requireSessionOwner verifies ownership
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  return jwtMiddleware(req, (authedReq) =>
    requireSessionOwner(handleGet)(authedReq, ctx)
  );
}
