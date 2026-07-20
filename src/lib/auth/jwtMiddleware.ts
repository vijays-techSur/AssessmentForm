import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from './authService';
import type { AuthenticatedRequest } from '@/types/auth';

// TechArch §2.4: jwtMiddleware — verify JWT signature + expiry; attach req.user
// Error codes per FRD F07: AUTH_REQUIRED (no header), TOKEN_EXPIRED (expired), TOKEN_INVALID (tampered/invalid)
export async function jwtMiddleware(
  req: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Authentication required. Please log in.' } },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);  // strip 'Bearer '
  try {
    const payload = await verifyJwt(token);
    // Attach user to request (cast necessary because NextRequest is sealed)
    (req as AuthenticatedRequest).user = payload;
    return handler(req as AuthenticatedRequest);
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
