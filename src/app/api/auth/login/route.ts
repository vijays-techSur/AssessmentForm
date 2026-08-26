import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signJwt } from '@/lib/auth/authService';

// Dashboard login — open to all users with a valid email address.
// No system_owner_emails check — any respondent or user can access the dashboard.
// TechArch §4.3: POST /api/auth/login
// JWT expires in 8 hours; role: "system_owner" (used for dashboard API auth).
// Request: { email: string }

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

    // Issue dashboard JWT — all authenticated users get dashboard access
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
