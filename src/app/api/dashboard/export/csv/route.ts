import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware/requireSystemOwner';
import { buildCsvExportStream } from '@/lib/services/csvExportService';

// GET /api/dashboard/export/csv — F06 §CSV Export
// TechArch §4.3: Content-Disposition: attachment; filename="assessment-responses-YYYY-MM-DD.csv"
// Accepts same filter params as GET /api/dashboard/responses
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url, 'http://localhost');

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `assessment-responses-${date}.csv`;

  try {
    const stream = await buildCsvExportStream({
      teamType:        searchParams.getAll('teamType'),
      status:          (searchParams.get('status') as 'all' | 'submitted' | 'draft') ?? 'all',
      submittedAfter:  searchParams.get('submittedAfter') ?? undefined,
      submittedBefore: searchParams.get('submittedBefore') ?? undefined,
      search:          searchParams.get('search') ?? undefined,
    });

    // Collect stream into buffer and respond
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const csvBody = Buffer.concat(chunks);

    return new NextResponse(csvBody, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/dashboard/export/csv]', err);
    return NextResponse.json(
      { error: { code: 'EXPORT_FAILED', message: 'Export could not be generated. Please try again.' } },
      { status: 500 }
    );
  }
}
