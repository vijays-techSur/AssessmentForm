import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSystemOwnerEmail, signJwt } from '@/lib/auth/authService';

// FRD F07: System Owner login flow — no team_type; no respondent session created
// TechArch §4.3: POST /api/auth/login
// TechArch §5.1: System Owner JWT expires in 8 hours

const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .email('Please enter a valid email address.'),
  name: z.string().min(1, 'Name is required').max(200),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      const emailError = parsed.error.issues.find((i) => i.path[0] === 'email');
      if (emailError) {
        return NextResponse.json(
          { error: { code: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { email, name } = parsed.data;

    // TechArch §5.1: Verify email exists in system_owner_emails (active, case-insensitive)
    const isSO = await isSystemOwnerEmail(email);
    if (!isSO) {
      return NextResponse.json(
        { error: { code: 'NOT_A_SYSTEM_OWNER', message: 'This email address is not registered as a System Owner.' } },
        { status: 403 }
      );
    }

    // TechArch §5.1: Sign JWT with role=system_owner, 8h expiry
    const token = await signJwt({ session_id: null, email, role: 'system_owner' }, '8h');

    // Decode exp from token for response (avoid re-verifying)
    const parts = token.split('.');
    const payloadDecoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const expiresAt = new Date(payloadDecoded.exp * 1000).toISOString();

    return NextResponse.json({
      token,
      role: 'system_owner',
      email,
      name,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[POST /api/auth/login] Unexpected error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
