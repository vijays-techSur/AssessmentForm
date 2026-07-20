import { NextResponse } from 'next/server';
import type { AuthenticatedRequest } from '@/types/auth';

// TechArch §2.4: requireSystemOwner — rejects non-system_owner on /api/dashboard/** and /api/config
// FRD F07: 403 ACCESS_DENIED
export function requireSystemOwner(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): (req: AuthenticatedRequest) => Promise<NextResponse> {
  return async (req: AuthenticatedRequest) => {
    if (req.user.role !== 'system_owner') {
      return NextResponse.json(
        { error: { code: 'ACCESS_DENIED', message: 'You do not have permission to access this resource.' } },
        { status: 403 }
      );
    }
    return handler(req);
  };
}
