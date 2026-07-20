import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { systemOwnerEmails } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import type { UserRole, JwtPayload } from '@/types/auth';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
}

// Sign a JWT with role claim. Expiry: '8h' for system_owner, '24h' for respondent.
// TechArch §5.1: JWT payload { session_id, email, role, iat, exp }
export async function signJwt(
  payload: { session_id: string | null; email: string; role: UserRole },
  expiresIn: string  // e.g. '8h' | '24h'
): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

// Verify JWT signature and expiry.
// Returns decoded payload or throws (caller maps to 401 TOKEN_INVALID / TOKEN_EXPIRED).
export async function verifyJwt(token: string): Promise<JwtPayload> {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  return payload as unknown as JwtPayload;
}

// Case-insensitive lookup of email in system_owner_emails (active records only).
// TechArch §5.1: "case-insensitive" — use LOWER(email) parameterized query.
// TechArch §3.2: idx_system_owner_emails_lower index on LOWER(email).
export async function isSystemOwnerEmail(email: string): Promise<boolean> {
  const result = await db
    .select({ id: systemOwnerEmails.id })
    .from(systemOwnerEmails)
    .where(sql`LOWER(${systemOwnerEmails.email}) = LOWER(${email}) AND ${systemOwnerEmails.is_active} = true`)
    .limit(1);
  return result.length > 0;
}
