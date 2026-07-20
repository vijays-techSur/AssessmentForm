import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth/authService';

/**
 * requireSystemOwner — TechArch §2.4
 * Applied to: GET /api/dashboard/**, GET /api/config, PATCH /api/config
 * Verifies JWT signature, expiry, and that role === 'system_owner'.
 *
 * FRD F07: 403 ACCESS_DENIED for non-system_owner JWTs
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
    const payload = await verifyJwt(token);
    if (payload.role !== 'system_owner') {
      return NextResponse.json(
        { error: { code: 'ACCESS_DENIED', message: 'You do not have permission to access this resource.' } },
        { status: 403 }
      );
    }
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
