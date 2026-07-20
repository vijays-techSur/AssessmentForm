import type { NextRequest } from 'next/server';

export type UserRole = 'respondent' | 'system_owner';

export interface JwtPayload {
  session_id: string | null;  // null for system_owner (no respondent session)
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends NextRequest {
  user: JwtPayload;
}
