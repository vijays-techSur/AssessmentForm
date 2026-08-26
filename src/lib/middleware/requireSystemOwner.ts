import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth/authService';

/**
 * requireSystemOwner — Dashboard auth middleware (open to all authenticated users)
 * Applied to: GET /api/dashboard/**, GET /api/config, PATCH /api/config
 * Verifies JWT signature and expiry. Role check removed — dashboard access is
 * open to any user with a valid dashboard JWT (issued by POST /api/auth/login).
 *
 * Usage (direct await pattern):
 *   const authError = await requireSystemOwner(req);
 *   if (authError) return authError;
 *
 * Returns null on success (caller proceeds), NextResponse on auth failure.
 */
export async function requireSystemOwner(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Authentication required. Please log in.' } },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  try {
    await verifyJwt(token); // verify signature + expiry only — no role restriction
    return null; // Authorized
  } catch (err: unknown) {
    const isExpired =
      err instanceof Error && (err.message.includes('expired') || (err as { code?: string }).code === 'ERR_JWT_EXPIRED');
    if (isExpired) {
      return NextResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'Your session has expired. Please log in again.' } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: { code: 'TOKEN_INVALID', message: 'Authentication failed. Please log in again.' } },
      { status: 401 }
    );
  }
}
