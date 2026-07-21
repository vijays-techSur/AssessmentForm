import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSystemOwnerEmail, signJwt } from '@/lib/auth/authService';

// FRD F07: System Owner login flow — no team_type; no respondent session created
// TechArch §4.3: POST /api/auth/login
// TechArch §5.1: System Owner JWT expires in 8 hours
// Request: { email: string } — separate from respondent /api/sessions flow

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' } },
        { status: 400 }
      );
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' } },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim();

    // TechArch §5.1: Verify email exists in system_owner_emails (active, case-insensitive)
    const isSO = await isSystemOwnerEmail(normalizedEmail);
    if (!isSO) {
      return NextResponse.json(
        { error: { code: 'NOT_A_SYSTEM_OWNER', message: 'This email is not registered as a System Owner.' } },
        { status: 403 }
      );
    }

    // TechArch §5.1: Sign JWT with role=system_owner, 8h expiry
    // Payload: { email, role: "system_owner", iat, exp } per TechArch §4.3
    const token = await signJwt({ session_id: null, email: normalizedEmail, role: 'system_owner' }, '8h');

    return NextResponse.json({
      token,
      role: 'system_owner',
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('[POST /api/auth/login] Unexpected error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
