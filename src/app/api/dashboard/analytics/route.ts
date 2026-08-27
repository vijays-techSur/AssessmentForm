import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware/requireSystemOwner';
import { getAnalyticsData } from '@/lib/services/analyticsService';

// GET /api/dashboard/analytics — F06 §Analytics Panel
// TechArch §4.3: AnalyticsData
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const teamTypeFilter = searchParams.getAll('teamType');

  try {
    const analytics = await getAnalyticsData(teamTypeFilter.length > 0 ? teamTypeFilter : undefined);
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[GET /api/dashboard/analytics]', err);
    return NextResponse.json(
      { error: { code: 'ANALYTICS_ERROR', message: 'Analytics could not be loaded. Please refresh.' } },
      { status: 500 }
    );
  }
}
