import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware/requireSystemOwner';
import { getResponseList } from '@/lib/services/dashboardService';

// GET /api/dashboard/responses — F06 §Response List View
// TechArch §4.3: page, pageSize, sortBy, sortDir, teamType, status, submittedAfter, submittedBefore, search
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);

  const submittedAfter  = searchParams.get('submittedAfter') ?? undefined;
  const submittedBefore = searchParams.get('submittedBefore') ?? undefined;

  // Validate date range: submittedAfter must be <= submittedBefore
  if (submittedAfter && submittedBefore && submittedAfter > submittedBefore) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE_RANGE', message: "The 'from' date must be before or equal to the 'to' date." } },
      { status: 400 }
    );
  }

  try {
    const result = await getResponseList({
      page:            Number(searchParams.get('page') ?? 1),
      pageSize:        Number(searchParams.get('pageSize') ?? 25),
      sortBy:          searchParams.get('sortBy') ?? 'submitted_at',
      sortDir:         (searchParams.get('sortDir') as 'asc' | 'desc') ?? 'desc',
      teamType:        searchParams.getAll('teamType'),
      status:          (searchParams.get('status') as 'all' | 'submitted' | 'draft') ?? 'all',
      submittedAfter,
      submittedBefore,
      search:          searchParams.get('search') ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/dashboard/responses]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load responses.' } },
      { status: 500 }
    );
  }
}
