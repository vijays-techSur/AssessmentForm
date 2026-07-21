import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware/requireSystemOwner';
import { getConfig, patchConfig } from '@/lib/services/configService';
import { jwtVerify } from 'jose';

// GET /api/config — F08 §View Configuration
// TechArch §4.3: AssessmentConfig response shape
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  try {
    const cfg = await getConfig();
    return NextResponse.json(cfg);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CONFIG_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'CONFIG_NOT_FOUND', message: 'Assessment configuration is missing. Please contact a system administrator.' } },
        { status: 500 }
      );
    }
    console.error('[GET /api/config]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not load configuration.' } },
      { status: 500 }
    );
  }
}

// PATCH /api/config — F08 §Update Due Date
// TechArch §4.3: Request body { due_date: string } — returns updated AssessmentConfig
// Side effect: config_audit_log row written
export async function PATCH(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  let body: { due_date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE_FORMAT', message: 'Please provide a valid date and time.' } },
      { status: 400 }
    );
  }

  // Validate due_date is a valid ISO 8601 datetime string
  if (!body.due_date || isNaN(Date.parse(body.due_date))) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE_FORMAT', message: 'Please provide a valid date and time.' } },
      { status: 400 }
    );
  }

  // Extract System Owner email from JWT for audit log
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  let ownerEmail = 'unknown';
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    ownerEmail = (payload.email as string) ?? 'unknown';
  } catch {
    // requireSystemOwner already verified the token; this is a belt-and-suspenders extraction
  }

  try {
    const updated = await patchConfig(body.due_date, ownerEmail);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CONFIG_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'CONFIG_NOT_FOUND', message: 'Assessment configuration is missing. Please contact a system administrator.' } },
        { status: 500 }
      );
    }
    console.error('[PATCH /api/config]', err);
    return NextResponse.json(
      { error: { code: 'CONFIG_UPDATE_FAILED', message: 'Configuration could not be saved. Please try again.' } },
      { status: 500 }
    );
  }
}
