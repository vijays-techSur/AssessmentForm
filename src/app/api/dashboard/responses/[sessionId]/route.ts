import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware/requireSystemOwner';
import { getResponseDetail } from '@/lib/services/dashboardService';

// GET /api/dashboard/responses/:sessionId — F06 §Individual Response View
// TechArch §4.3: ResponseDetail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  const { sessionId } = await params;

  try {
    const detail = await getResponseDetail(sessionId);
    if (!detail) {
      return NextResponse.json(
        { error: { code: 'RESPONSE_NOT_FOUND', message: 'The requested response could not be found.' } },
        { status: 404 }
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error('[GET /api/dashboard/responses/:sessionId]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load response detail.' } },
      { status: 500 }
    );
  }
}
