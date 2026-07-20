---
phase: 02a-auth-session
plan: 02
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/lib/auth/authService.ts
  - src/lib/auth/jwtMiddleware.ts
  - src/lib/auth/requireSystemOwner.ts
  - src/lib/auth/requireSessionOwner.ts
  - src/lib/session/sessionService.ts
  - src/app/api/auth/login/route.ts
  - src/app/api/sessions/route.ts
  - src/app/api/sessions/[sessionId]/route.ts
autonomous: true

features:
  implements: ["F1", "F7"]
  depends_on: ["F1", "F7"]
  enables: ["F2", "F3", "F4", "F5", "F6", "F8", "F9"]

must_haves:
  truths:
    - "POST /api/auth/login issues a System Owner JWT (role: system_owner, 8h expiry) when email exists in system_owner_emails"
    - "POST /api/auth/login returns 403 NOT_A_SYSTEM_OWNER when email is not in system_owner_emails"
    - "POST /api/sessions creates a new respondent+session record and returns SessionResponse with is_returning: false for new emails"
    - "POST /api/sessions upserts and returns existing session with is_returning: true for known emails"
    - "POST /api/sessions returns 403 SYSTEM_OWNER_CANNOT_RESPOND when a System Owner email is submitted in the respondent flow"
    - "GET /api/sessions/:sessionId returns full SessionResponse (saved_responses, is_closed, due_date) for the session owner"
    - "GET /api/sessions/:sessionId returns 403 SESSION_ACCESS_DENIED when JWT email does not match session respondent email"
    - "jwtMiddleware verifies signature and expiry; returns 401 AUTH_REQUIRED (no header), 401 TOKEN_EXPIRED (expired), 401 TOKEN_INVALID (tampered)"
    - "requireSystemOwner rejects respondent JWTs on dashboard routes with 403 ACCESS_DENIED"
    - "requireSessionOwner verifies session belongs to authenticated email; returns 403 SESSION_ACCESS_DENIED on mismatch"
  artifacts:
    - path: "src/lib/auth/authService.ts"
      provides: "signJwt, verifyJwt, isSystemOwnerEmail helpers"
      exports: ["signJwt", "verifyJwt", "isSystemOwnerEmail"]
    - path: "src/lib/auth/jwtMiddleware.ts"
      provides: "jwtMiddleware — extracts and verifies JWT from Authorization header; attaches req.user"
      exports: ["jwtMiddleware"]
    - path: "src/lib/auth/requireSystemOwner.ts"
      provides: "requireSystemOwner — rejects non-system_owner role with 403 ACCESS_DENIED"
      exports: ["requireSystemOwner"]
    - path: "src/lib/auth/requireSessionOwner.ts"
      provides: "requireSessionOwner — verifies session_id belongs to JWT email"
      exports: ["requireSessionOwner"]
    - path: "src/lib/session/sessionService.ts"
      provides: "createOrResumeSession, getSessionById — core session CRUD"
      exports: ["createOrResumeSession", "getSessionById"]
    - path: "src/app/api/auth/login/route.ts"
      provides: "POST /api/auth/login endpoint — System Owner login"
      exports: ["POST"]
    - path: "src/app/api/sessions/route.ts"
      provides: "POST /api/sessions endpoint — create or resume respondent session"
      exports: ["POST"]
    - path: "src/app/api/sessions/[sessionId]/route.ts"
      provides: "GET /api/sessions/:sessionId endpoint — load session with saved_responses"
      exports: ["GET"]
  key_links:
    - from: "src/app/api/auth/login/route.ts"
      to: "src/lib/auth/authService.ts"
      via: "isSystemOwnerEmail + signJwt"
      pattern: "isSystemOwnerEmail|signJwt"
    - from: "src/app/api/sessions/route.ts"
      to: "src/lib/session/sessionService.ts"
      via: "createOrResumeSession"
      pattern: "createOrResumeSession"
    - from: "src/app/api/sessions/[sessionId]/route.ts"
      to: "src/lib/auth/jwtMiddleware.ts"
      via: "jwtMiddleware then requireSessionOwner"
      pattern: "jwtMiddleware|requireSessionOwner"
    - from: "src/lib/session/sessionService.ts"
      to: "drizzle/schema.ts"
      via: "db.select/insert/update on respondents + sessions tables"
      pattern: "db\\.select|db\\.insert|db\\.update"
    - from: "src/lib/auth/authService.ts"
      to: "process.env.JWT_SECRET"
      via: "jose SignJWT / jwtVerify"
      pattern: "JWT_SECRET"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "drizzle/schema.ts"
      exports: ["systemOwnerEmails", "respondents", "sessions", "responses", "assessmentConfig"]
      verify: "grep -n 'export const systemOwnerEmails' drizzle/schema.ts && grep -n 'export const sessions' drizzle/schema.ts && grep -n 'export const responses' drizzle/schema.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "src/lib/db.ts"
      exports: ["db"]
      verify: "grep -n 'export const db' src/lib/db.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/lib/auth/jwtMiddleware.ts"
      exports: ["jwtMiddleware"]
      shape: |
        // Attaches req.user = { session_id: string | null, email: string, role: 'respondent' | 'system_owner' }
        // to NextRequest after verifying Authorization: Bearer {JWT}
        // Returns NextResponse 401 on missing/expired/invalid JWT
        export async function jwtMiddleware(
          req: NextRequest,
          handler: (req: AuthenticatedRequest) => Promise<NextResponse>
        ): Promise<NextResponse>
      verify: "grep -n 'export.*jwtMiddleware' src/lib/auth/jwtMiddleware.ts && echo CONTRACT_OK"
    - artifact: "src/lib/auth/requireSystemOwner.ts"
      exports: ["requireSystemOwner"]
      shape: |
        // Wraps a handler; returns 403 ACCESS_DENIED if req.user.role !== 'system_owner'
        export function requireSystemOwner(
          handler: (req: AuthenticatedRequest) => Promise<NextResponse>
        ): (req: AuthenticatedRequest) => Promise<NextResponse>
      verify: "grep -n 'export.*requireSystemOwner' src/lib/auth/requireSystemOwner.ts && echo CONTRACT_OK"
    - artifact: "src/lib/auth/requireSessionOwner.ts"
      exports: ["requireSessionOwner"]
      shape: |
        // Verifies session_id path param belongs to req.user.email (respondent isolation)
        // Returns 403 SESSION_ACCESS_DENIED on mismatch
        export function requireSessionOwner(
          handler: (req: AuthenticatedRequest, sessionId: string) => Promise<NextResponse>
        ): (req: AuthenticatedRequest, ctx: { params: { sessionId: string } }) => Promise<NextResponse>
      verify: "grep -n 'export.*requireSessionOwner' src/lib/auth/requireSessionOwner.ts && echo CONTRACT_OK"
    - artifact: "src/lib/auth/authService.ts"
      exports: ["signJwt", "verifyJwt", "isSystemOwnerEmail"]
      shape: |
        export async function signJwt(payload: { session_id: string | null; email: string; role: UserRole }, expiresIn: string): Promise<string>
        export async function verifyJwt(token: string): Promise<JwtPayload>
        export async function isSystemOwnerEmail(email: string): Promise<boolean>
      verify: "grep -n 'export.*signJwt' src/lib/auth/authService.ts && grep -n 'export.*isSystemOwnerEmail' src/lib/auth/authService.ts && echo CONTRACT_OK"
    - artifact: "src/lib/session/sessionService.ts"
      exports: ["createOrResumeSession", "getSessionById"]
      shape: |
        export async function createOrResumeSession(input: { email: string; name: string; team_type: TeamType }): Promise<SessionResponse>
        export async function getSessionById(sessionId: string, callerEmail: string): Promise<SessionResponse>
      verify: "grep -n 'export.*createOrResumeSession' src/lib/session/sessionService.ts && grep -n 'export.*getSessionById' src/lib/session/sessionService.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/auth/login/route.ts"
      exports: ["POST"]
      shape: |
        // POST /api/auth/login
        // Request: { email: string, name: string }
        // Response 200: { token: string, role: "system_owner", email: string, expires_at: string }
        // Errors: 400 INVALID_EMAIL_FORMAT, 403 NOT_A_SYSTEM_OWNER
      verify: "grep -n 'export.*POST' src/app/api/auth/login/route.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/sessions/route.ts"
      exports: ["POST"]
      shape: |
        // POST /api/sessions
        // Request: { email: string, name: string, team_type: TeamType }
        // Response 200: SessionResponse
        // Errors: 400 INVALID_EMAIL_FORMAT, 400 INVALID_NAME, 400 INVALID_TEAM_TYPE, 403 SYSTEM_OWNER_CANNOT_RESPOND, 500 SESSION_CREATE_FAILED
      verify: "grep -n 'export.*POST' src/app/api/sessions/route.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/sessions/[sessionId]/route.ts"
      exports: ["GET"]
      shape: |
        // GET /api/sessions/:sessionId — Auth: Bearer JWT, Role: Respondent (own session)
        // Response 200: SessionResponse (includes saved_responses, is_closed, due_date)
        // Errors: 401 AUTH_REQUIRED, 403 SESSION_ACCESS_DENIED, 404 SESSION_NOT_FOUND
      verify: "grep -n 'export.*GET' src/app/api/sessions/[sessionId]/route.ts && echo CONTRACT_OK"
---

<objective>
Implement the complete authentication and session management backend for Wave 2a. This covers two separate identity flows: System Owner login (POST /api/auth/login → role: system_owner JWT, 8h) and Respondent session create/resume (POST /api/sessions → role: respondent JWT, 24h). Also implements GET /api/sessions/:sessionId for returning-respondent detection and saved_responses hydration. The middleware stack (jwtMiddleware, requireSystemOwner, requireSessionOwner) is created here and consumed by every downstream wave.

Purpose: Without this wave, no API in waves 2b–2d can enforce auth, and no frontend (3a–3c) can authenticate users or resume sessions.
Output: authService.ts, jwtMiddleware.ts, requireSystemOwner.ts, requireSessionOwner.ts, sessionService.ts, and three API route handlers. All downstream waves consume jwtMiddleware and the middleware guards.
</objective>

<feature_dependencies>
Implements: F1: Respondent Identity & Session Management (POST /api/sessions, GET /api/sessions/:sessionId, sessionService.ts — upsert, returning-respondent detection, saved_responses, is_closed), F7: Role-Based Access Control (POST /api/auth/login, authService.ts, JWT role claim, jwtMiddleware, requireSystemOwner, requireSessionOwner)
Depends on: F1 + F7 schema (wave 1 — system_owner_emails, respondents, sessions, responses, assessment_config tables)
Enables: F2, F3 (sections/questions API needs jwtMiddleware), F4, F5 (responses/submissions API needs requireSessionOwner + assessmentOpenGuard), F6, F8 (dashboard/config API needs requireSystemOwner), F9 (submission flow needs session auth)
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@project_specs/TechArch-AssessmentForm.md
@project_specs/FRD-AssessmentForm.md
@.planning/express/assessmentform-express-spa-multi-step-as/01-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement authService, JWT middleware stack, and POST /api/auth/login</name>
  <files>
    src/lib/auth/authService.ts
    src/lib/auth/jwtMiddleware.ts
    src/lib/auth/requireSystemOwner.ts
    src/lib/auth/requireSessionOwner.ts
    src/types/auth.ts
    src/app/api/auth/login/route.ts
  </files>
  <action>
Create the full authentication layer: JWT signing/verification with jose (HS256), role determination by checking system_owner_emails, and the middleware guards consumed by all downstream API routes. Then implement the System Owner login endpoint.

**Step 1 — Create `src/types/auth.ts` — shared auth types:**

```typescript
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
```

**Step 2 — Create `src/lib/auth/authService.ts`:**

Uses `jose` (Edge-compatible) per TechArch §6.2 rationale ("jsonwebtoken uses Node.js crypto, incompatible with Edge").

```typescript
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
```

**Step 3 — Create `src/lib/auth/jwtMiddleware.ts`:**

Applied to all `/api/**` except `POST /api/sessions` and `POST /api/auth/login` (per TechArch §2.4).

```typescript
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
      err instanceof Error && (err.message.includes('expired') || err.name === 'JWTExpired');
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
```

**Step 4 — Create `src/lib/auth/requireSystemOwner.ts`:**

```typescript
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
```

**Step 5 — Create `src/lib/auth/requireSessionOwner.ts`:**

Verifies that the `sessionId` path param's session belongs to the authenticated user's email (respondent data isolation). System Owners bypass this check for dashboard drill-down (TechArch §5.2).

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, respondents } from '../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import type { AuthenticatedRequest } from '@/types/auth';

// TechArch §2.4 + §5.2: requireSessionOwner — session_id in path must belong to JWT email
// System Owners bypass (they can read any session via dashboard; direct session routes still check)
// FRD F07: 403 SESSION_ACCESS_DENIED
export function requireSessionOwner(
  handler: (req: AuthenticatedRequest, sessionId: string) => Promise<NextResponse>
): (req: AuthenticatedRequest, ctx: { params: { sessionId: string } }) => Promise<NextResponse> {
  return async (req: AuthenticatedRequest, ctx: { params: { sessionId: string } }) => {
    const { sessionId } = ctx.params;

    // System Owners: bypass ownership check (but dashboard routes use requireSystemOwner instead)
    if (req.user.role === 'system_owner') {
      return handler(req, sessionId);
    }

    // Respondent: verify session belongs to their email
    const result = await db
      .select({ respondent_email: respondents.email })
      .from(sessions)
      .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Your previous session could not be found. Please re-enter your details.' } },
        { status: 404 }
      );
    }

    // Case-insensitive email comparison (TechArch §5.2 data isolation)
    if (result[0].respondent_email.toLowerCase() !== req.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: { code: 'SESSION_ACCESS_DENIED', message: 'You do not have access to this session.' } },
        { status: 403 }
      );
    }

    return handler(req, sessionId);
  };
}
```

**Step 6 — Create `src/app/api/auth/login/route.ts`:**

From TechArch §4.3:
```
POST /api/auth/login — System Owner Login
Auth: None
Request: { email: string, name: string }
Response 200: { token, role: "system_owner", email, expires_at }
Errors: 400 INVALID_EMAIL_FORMAT, 403 NOT_A_SYSTEM_OWNER
```

```typescript
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
```
  </action>
  <verify>
```bash
# Auth types and service exports
grep -n "export.*signJwt\|export.*verifyJwt\|export.*isSystemOwnerEmail" src/lib/auth/authService.ts && echo "AUTH SERVICE EXPORTS OK"

# Middleware exports
grep -n "export.*jwtMiddleware" src/lib/auth/jwtMiddleware.ts && echo "JWT MIDDLEWARE OK"
grep -n "export.*requireSystemOwner" src/lib/auth/requireSystemOwner.ts && echo "REQUIRE SYSTEM OWNER OK"
grep -n "export.*requireSessionOwner" src/lib/auth/requireSessionOwner.ts && echo "REQUIRE SESSION OWNER OK"

# Login route
grep -n "export.*POST" src/app/api/auth/login/route.ts && echo "LOGIN ROUTE OK"
grep -n "NOT_A_SYSTEM_OWNER\|INVALID_EMAIL_FORMAT" src/app/api/auth/login/route.ts && echo "LOGIN ERROR CODES OK"

# jose library used (not jsonwebtoken — per TechArch §6.2)
grep -n "from 'jose'" src/lib/auth/authService.ts && echo "JOSE USED OK"
grep -n "JWT_SECRET" src/lib/auth/authService.ts && echo "JWT_SECRET REF OK"

# TypeScript compilation check
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"

# curl smoke test (requires running server + a seeded system_owner_emails row):
# curl -s -X POST http://localhost:3000/api/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"email":"owner@example.com","name":"Test Owner"}' | jq .
```
  </verify>
  <done>
- src/types/auth.ts exports JwtPayload (with session_id, email, role, iat, exp) and AuthenticatedRequest
- src/lib/auth/authService.ts exports signJwt (HS256, jose), verifyJwt, isSystemOwnerEmail (LOWER() case-insensitive, active=true filter)
- src/lib/auth/jwtMiddleware.ts exports jwtMiddleware: 401 AUTH_REQUIRED (no header), 401 TOKEN_EXPIRED (expired), 401 TOKEN_INVALID (tampered)
- src/lib/auth/requireSystemOwner.ts exports requireSystemOwner: 403 ACCESS_DENIED for non-system_owner role
- src/lib/auth/requireSessionOwner.ts exports requireSessionOwner: DB-verified ownership check; 404 SESSION_NOT_FOUND; 403 SESSION_ACCESS_DENIED on mismatch; system_owner bypasses
- src/app/api/auth/login/route.ts POST handler: Zod email validation → isSystemOwnerEmail → signJwt('8h') → { token, role, email, expires_at }; returns 400 INVALID_EMAIL_FORMAT or 403 NOT_A_SYSTEM_OWNER on failures
- jose library used throughout (not jsonwebtoken), matching TechArch §6.2 rationale
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement sessionService, POST /api/sessions, and GET /api/sessions/:sessionId</name>
  <files>
    src/lib/session/sessionService.ts
    src/app/api/sessions/route.ts
    src/app/api/sessions/[sessionId]/route.ts
  </files>
  <action>
Implement the respondent session lifecycle: create-or-resume (upsert by email), returning-respondent detection, saved_responses hydration from the responses table, and is_closed computation from assessment_config.due_date.

**Step 1 — Create `src/lib/session/sessionService.ts`:**

This service is the core of F1. It implements:
- Upsert-by-email (new respondent → create respondents + sessions rows; returning → load existing)
- Team type lock (ignore team_type on existing sessions — FRD F03 constraint)
- is_closed computation from assessment_config.due_date (TechArch §5.4)
- saved_responses hydration (join responses + needed for pre-population)

From TechArch §4.2 TypeScript interfaces, the return shape is `SessionResponse`:
```typescript
interface SessionResponse {
  session_id: string;
  token: string;
  role: UserRole;
  is_returning: boolean;
  submission_status: SubmissionStatus;
  current_section_index: number;
  section_ids_ordered: string[];
  saved_responses: SavedResponse[];
  is_closed: boolean;
  due_date: string;  // ISO 8601
}
```

```typescript
import { db } from '@/lib/db';
import {
  respondents,
  sessions,
  responses,
  assessmentConfig,
} from '../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { signJwt } from '../auth/authService';
import { isSystemOwnerEmail } from '../auth/authService';
import type { UserRole } from '@/types/auth';

export type TeamType =
  | 'program_project'
  | 'platform_engineering'
  | 'infrastructure_cloud'
  | 'data_api_governance';

export type SubmissionStatus = 'draft' | 'submitted';

export interface SavedResponse {
  question_id: string;
  answer_payload: unknown;
}

export interface SessionResponse {
  session_id: string;
  token: string;
  role: UserRole;
  is_returning: boolean;
  submission_status: SubmissionStatus;
  current_section_index: number;
  section_ids_ordered: string[];
  saved_responses: SavedResponse[];
  is_closed: boolean;
  due_date: string;
}

// Fetch assessment config (singleton id=1) and compute is_closed.
// TechArch §5.4: due-date checks are server-side only.
async function getAssessmentStatus(): Promise<{ due_date: string; is_closed: boolean }> {
  const config = await db
    .select({ due_date: assessmentConfig.due_date })
    .from(assessmentConfig)
    .where(eq(assessmentConfig.id, 1))
    .limit(1);

  if (config.length === 0) {
    // No config seeded yet — treat as open (seed script covers this in wave 1)
    const fallback = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    return { due_date: fallback, is_closed: false };
  }

  const dueDate = config[0].due_date;
  const is_closed = new Date() > new Date(dueDate);
  return { due_date: dueDate, is_closed };
}

// Load all saved responses for a session (for pre-population on resume).
async function loadSavedResponses(sessionId: string): Promise<SavedResponse[]> {
  const rows = await db
    .select({
      question_id: responses.question_id,
      answer_payload: responses.answer_payload,
    })
    .from(responses)
    .where(eq(responses.session_id, sessionId));

  return rows.map((r) => ({
    question_id: r.question_id,
    answer_payload: r.answer_payload,
  }));
}

// FRD F01 §Process steps 4–9: Create or resume a respondent session.
// - New respondent: INSERT respondents + sessions; is_returning=false
// - Returning respondent: SELECT existing; is_returning=true; team_type LOCKED (ignored on resume)
// - System Owner email blocked with SYSTEM_OWNER_CANNOT_RESPOND (caller validates before calling this)
export async function createOrResumeSession(input: {
  email: string;
  name: string;
  team_type: TeamType;
}): Promise<SessionResponse> {
  const { email, name, team_type } = input;
  const { due_date, is_closed } = await getAssessmentStatus();

  // TechArch §3.2: idx_respondents_email_lower uses LOWER(email) — case-insensitive lookup
  const existingRespondent = await db
    .select()
    .from(respondents)
    .where(sql`LOWER(${respondents.email}) = LOWER(${email})`)
    .limit(1);

  let respondentId: string;
  let isReturning: boolean;

  if (existingRespondent.length > 0) {
    // Returning respondent — team_type is LOCKED (FRD F03 constraint: server ignores submitted team_type)
    respondentId = existingRespondent[0].id;
    isReturning = true;
  } else {
    // New respondent — insert into respondents
    const newRespondent = await db
      .insert(respondents)
      .values({ email, name, team_type })
      .returning();
    respondentId = newRespondent[0].id;
    isReturning = false;
  }

  // Find or create session for this respondent
  const existingSession = await db
    .select()
    .from(sessions)
    .where(eq(sessions.respondent_id, respondentId))
    .limit(1);

  let sessionId: string;
  let submission_status: SubmissionStatus;
  let current_section_index: number;
  let section_ids_ordered: string[];

  if (existingSession.length > 0) {
    const s = existingSession[0];
    sessionId = s.id;
    submission_status = s.submission_status as SubmissionStatus;
    current_section_index = s.current_section_index;
    section_ids_ordered = (s.section_ids_ordered as string[]) ?? [];
  } else {
    // Create new session for this respondent
    const newSession = await db
      .insert(sessions)
      .values({
        respondent_id: respondentId,
        submission_status: 'draft',
        current_section_index: 0,
        section_ids_ordered: [],
      })
      .returning();
    const s = newSession[0];
    sessionId = s.id;
    submission_status = 'draft';
    current_section_index = 0;
    section_ids_ordered = [];
  }

  // Load saved responses for pre-population (empty array for new respondents)
  const saved_responses = isReturning ? await loadSavedResponses(sessionId) : [];

  // TechArch §5.1: Respondent JWT expires in 24 hours
  const token = await signJwt({ session_id: sessionId, email, role: 'respondent' }, '24h');

  return {
    session_id: sessionId,
    token,
    role: 'respondent',
    is_returning: isReturning,
    submission_status,
    current_section_index,
    section_ids_ordered,
    saved_responses,
    is_closed,
    due_date,
  };
}

// FRD F01: GET /api/sessions/:sessionId — load session for returning respondent
// Used by useSession hook on page load to hydrate state from localStorage session_id
export async function getSessionById(
  sessionId: string,
  callerEmail: string
): Promise<SessionResponse> {
  const { due_date, is_closed } = await getAssessmentStatus();

  // Join sessions → respondents
  const result = await db
    .select({
      session_id: sessions.id,
      submission_status: sessions.submission_status,
      current_section_index: sessions.current_section_index,
      section_ids_ordered: sessions.section_ids_ordered,
      respondent_email: respondents.email,
    })
    .from(sessions)
    .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (result.length === 0) {
    throw Object.assign(new Error('SESSION_NOT_FOUND'), { code: 'SESSION_NOT_FOUND', status: 404 });
  }

  const row = result[0];

  // Ownership check — caller (jwtMiddleware) already verified token; requireSessionOwner
  // validates path ownership, but service double-checks for safety
  if (row.respondent_email.toLowerCase() !== callerEmail.toLowerCase()) {
    throw Object.assign(new Error('SESSION_ACCESS_DENIED'), { code: 'SESSION_ACCESS_DENIED', status: 403 });
  }

  const saved_responses = await loadSavedResponses(sessionId);

  // Re-sign JWT for the session (fresh token with updated exp; same role)
  const token = await signJwt(
    { session_id: sessionId, email: callerEmail, role: 'respondent' },
    '24h'
  );

  return {
    session_id: row.session_id,
    token,
    role: 'respondent',
    is_returning: true,
    submission_status: row.submission_status as SubmissionStatus,
    current_section_index: row.current_section_index,
    section_ids_ordered: (row.section_ids_ordered as string[]) ?? [],
    saved_responses,
    is_closed,
    due_date,
  };
}
```

**Step 2 — Create `src/app/api/sessions/route.ts` — POST /api/sessions:**

From TechArch §4.3:
```
POST /api/sessions
Auth: None
Request: { email: string, name: string, team_type: TeamType }
Response 200: SessionResponse
Errors: 400 INVALID_EMAIL_FORMAT, 400 INVALID_NAME, 400 INVALID_TEAM_TYPE,
        403 SYSTEM_OWNER_CANNOT_RESPOND, 500 SESSION_CREATE_FAILED
```

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSystemOwnerEmail } from '@/lib/auth/authService';
import { createOrResumeSession } from '@/lib/session/sessionService';
import type { TeamType } from '@/lib/session/sessionService';

// FRD F01 §Validation: email RFC 5322, name min 2 chars, team_type enum
const VALID_TEAM_TYPES: TeamType[] = [
  'program_project',
  'platform_engineering',
  'infrastructure_cloud',
  'data_api_governance',
];

const SessionCreateSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .email('Please enter a valid email address.'),
  name: z
    .string()
    .min(2, 'Please enter your full name (at least 2 characters).')
    .max(200, 'Name is too long')
    .refine((v) => v.trim().length >= 2, 'Please enter your full name (at least 2 characters).'),
  team_type: z.enum(
    ['program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance'],
    { errorMap: () => ({ message: 'Please select a valid team type.' }) }
  ),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = SessionCreateSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues;
      const emailIssue = issues.find((i) => i.path[0] === 'email');
      const nameIssue = issues.find((i) => i.path[0] === 'name');
      const teamTypeIssue = issues.find((i) => i.path[0] === 'team_type');

      if (emailIssue) {
        return NextResponse.json(
          { error: { code: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' } },
          { status: 400 }
        );
      }
      if (nameIssue) {
        return NextResponse.json(
          { error: { code: 'INVALID_NAME', message: 'Please enter your full name (at least 2 characters).' } },
          { status: 400 }
        );
      }
      if (teamTypeIssue) {
        return NextResponse.json(
          { error: { code: 'INVALID_TEAM_TYPE', message: 'Please select a valid team type.' } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: issues[0].message } },
        { status: 400 }
      );
    }

    const { email, name, team_type } = parsed.data;

    // FRD F01 §Validation: System Owner email blocked in respondent flow
    // FRD F07: "SYSTEM_OWNER_CANNOT_RESPOND" — System Owners may not submit assessments
    const isSO = await isSystemOwnerEmail(email);
    if (isSO) {
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_OWNER_CANNOT_RESPOND',
            message: 'This email is registered as a System Owner. Please access the dashboard instead.',
          },
        },
        { status: 403 }
      );
    }

    const sessionResponse = await createOrResumeSession({ email, name, team_type: team_type as TeamType });
    return NextResponse.json(sessionResponse);
  } catch (err) {
    console.error('[POST /api/sessions] Error:', err);
    return NextResponse.json(
      { error: { code: 'SESSION_CREATE_FAILED', message: 'Unable to start your session. Please try again.' } },
      { status: 500 }
    );
  }
}
```

**Step 3 — Create `src/app/api/sessions/[sessionId]/route.ts` — GET /api/sessions/:sessionId:**

From TechArch §4.3:
```
GET /api/sessions/:sessionId
Auth: Bearer JWT
Role: Respondent (own session)
Response 200: SessionResponse
Errors: 401 AUTH_REQUIRED, 403 SESSION_ACCESS_DENIED, 404 SESSION_NOT_FOUND
```

Middleware chain: `jwtMiddleware` → `requireSessionOwner` → handler.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtMiddleware } from '@/lib/auth/jwtMiddleware';
import { requireSessionOwner } from '@/lib/auth/requireSessionOwner';
import { getSessionById } from '@/lib/session/sessionService';
import type { AuthenticatedRequest } from '@/types/auth';

async function handleGet(
  req: AuthenticatedRequest,
  sessionId: string
): Promise<NextResponse> {
  try {
    const sessionResponse = await getSessionById(sessionId, req.user.email);
    return NextResponse.json(sessionResponse);
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string };
    if (e.code === 'SESSION_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Your previous session could not be found. Please re-enter your details.' } },
        { status: 404 }
      );
    }
    if (e.code === 'SESSION_ACCESS_DENIED') {
      return NextResponse.json(
        { error: { code: 'SESSION_ACCESS_DENIED', message: 'You do not have access to this session.' } },
        { status: 403 }
      );
    }
    console.error('[GET /api/sessions/:sessionId] Error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}

// Route handler: jwtMiddleware → requireSessionOwner → handleGet
// TechArch §2.4: jwtMiddleware applied; requireSessionOwner verifies ownership
export async function GET(
  req: NextRequest,
  ctx: { params: { sessionId: string } }
): Promise<NextResponse> {
  return jwtMiddleware(req, (authedReq) =>
    requireSessionOwner(handleGet)(authedReq, ctx)
  );
}
```
  </action>
  <verify>
```bash
# Service exports
grep -n "export.*createOrResumeSession\|export.*getSessionById" src/lib/session/sessionService.ts && echo "SESSION SERVICE EXPORTS OK"

# Route exports
grep -n "export.*POST" src/app/api/sessions/route.ts && echo "SESSIONS POST OK"
grep -n "export.*GET" "src/app/api/sessions/[sessionId]/route.ts" && echo "SESSIONS GET OK"

# Error codes present per FRD F01
grep -n "SESSION_CREATE_FAILED\|INVALID_EMAIL_FORMAT\|INVALID_NAME\|INVALID_TEAM_TYPE\|SYSTEM_OWNER_CANNOT_RESPOND" src/app/api/sessions/route.ts && echo "SESSION ERROR CODES OK"
grep -n "SESSION_NOT_FOUND\|SESSION_ACCESS_DENIED" "src/app/api/sessions/[sessionId]/route.ts" && echo "GET SESSION ERROR CODES OK"

# is_closed computed from assessment_config (TechArch §5.4)
grep -n "is_closed\|due_date\|assessmentConfig" src/lib/session/sessionService.ts && echo "IS_CLOSED COMPUTED OK"

# Team type lock (FRD F03 — server ignores team_type for existing sessions)
grep -n "LOCKED\|isReturning\|existingRespondent" src/lib/session/sessionService.ts && echo "TEAM TYPE LOCK OK"

# LOWER() used for email lookup (TechArch §3.2 case-insensitive)
grep -n "LOWER" src/lib/session/sessionService.ts && echo "LOWER EMAIL LOOKUP OK"

# Middleware chain wired in GET route
grep -n "jwtMiddleware\|requireSessionOwner" "src/app/api/sessions/[sessionId]/route.ts" && echo "MIDDLEWARE CHAIN OK"

# TypeScript compilation
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"

# Functional smoke tests (requires running server + seeded DB):
# New respondent (expect is_returning=false):
# curl -s -X POST http://localhost:3000/api/sessions \
#   -H "Content-Type: application/json" \
#   -d '{"email":"alex@test.com","name":"Alex Test","team_type":"platform_engineering"}' | jq '{is_returning,session_id,role}'
#
# Same email again (expect is_returning=true):
# curl -s -X POST http://localhost:3000/api/sessions \
#   -H "Content-Type: application/json" \
#   -d '{"email":"alex@test.com","name":"Alex Test","team_type":"platform_engineering"}' | jq '{is_returning,submission_status}'
#
# Invalid email (expect 400 INVALID_EMAIL_FORMAT):
# curl -s -X POST http://localhost:3000/api/sessions \
#   -H "Content-Type: application/json" \
#   -d '{"email":"notanemail","name":"Test","team_type":"program_project"}' | jq .
#
# GET session without auth (expect 401 AUTH_REQUIRED):
# curl -s http://localhost:3000/api/sessions/some-uuid | jq .
```
  </verify>
  <done>
- src/lib/session/sessionService.ts:
  - createOrResumeSession: LOWER(email) case-insensitive upsert; new respondents get is_returning=false; returning get is_returning=true with saved_responses hydrated; team_type locked on resume; 24h respondent JWT signed; is_closed computed from assessment_config.due_date
  - getSessionById: JOIN sessions→respondents; ownership double-check (email match); saved_responses loaded; is_closed + due_date from config; fresh 24h token returned
- src/app/api/sessions/route.ts POST: Zod validation (email RFC 5322, name min 2 chars + non-whitespace, team_type enum) → isSystemOwnerEmail → createOrResumeSession; all FRD F01 error codes returned (INVALID_EMAIL_FORMAT, INVALID_NAME, INVALID_TEAM_TYPE, SYSTEM_OWNER_CANNOT_RESPOND, SESSION_CREATE_FAILED)
- src/app/api/sessions/[sessionId]/route.ts GET: jwtMiddleware → requireSessionOwner → getSessionById; SESSION_NOT_FOUND (404) and SESSION_ACCESS_DENIED (403) handled
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API | Untrusted email/name/team_type fields from POST /api/sessions and POST /api/auth/login crossing into server handlers |
| JWT→handler | JWT from Authorization header crossing into jwtMiddleware; tampered or expired tokens must be rejected before any handler runs |
| session path param→DB | sessionId path param from client crossing into requireSessionOwner DB lookup; must verify ownership before serving data |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Spoofing | `src/lib/auth/jwtMiddleware.ts` JWT verification | mitigate | `jose jwtVerify` verifies HS256 signature against `process.env.JWT_SECRET`; any tampered token throws and returns `401 TOKEN_INVALID` in the catch block. Expired tokens detected via jose's built-in expiry check → `401 TOKEN_EXPIRED`. No unsigned or algorithm-none tokens accepted (alg: 'HS256' pinned). |
| T-02-02 | Elevation of privilege | `src/app/api/sessions/route.ts` SYSTEM_OWNER_CANNOT_RESPOND | mitigate | `isSystemOwnerEmail(email)` called before `createOrResumeSession`; System Owner email triggers immediate `403 SYSTEM_OWNER_CANNOT_RESPOND`, preventing a System Owner from obtaining a respondent-role JWT by submitting the identity form. Uses LOWER() parameterized query — not string interpolation. |
| T-02-03 | Information disclosure | `src/lib/auth/requireSessionOwner.ts` cross-session access | mitigate | Every request to `/api/sessions/:id` calls `requireSessionOwner` which does a DB JOIN to verify `respondents.email` matches `req.user.email` (case-insensitive). Mismatch returns `403 SESSION_ACCESS_DENIED` — no session data leaked to wrong caller. |
| T-02-04 | Spoofing | `src/lib/auth/authService.ts` isSystemOwnerEmail case-variation | mitigate | Lookup uses `LOWER(system_owner_emails.email) = LOWER(input_email)` parameterized SQL, hitting the `idx_system_owner_emails_lower` index (created in wave 1). Prevents `Admin@example.com` vs `admin@example.com` bypass. |
| T-02-05 | Tampering | `src/app/api/sessions/route.ts` input fields | mitigate | Zod schema validates email (RFC 5322, max 254), name (min 2 non-whitespace chars, max 200), team_type (strict enum). All Drizzle ORM queries are parameterized — no string interpolation of user input into SQL. |
| T-02-06 | Information disclosure | `src/lib/auth/authService.ts` JWT_SECRET | mitigate | `JWT_SECRET` read from `process.env` only inside `getJwtSecret()`; never logged, never serialized into API responses, never concatenated into strings. `getJwtSecret()` throws if env var missing (fail-closed). |
</threat_model>

<verification>
## Wave 2a — Auth/Session Backend Verification

After all tasks complete, run:

```bash
# 1. All source files exist
ls src/lib/auth/authService.ts src/lib/auth/jwtMiddleware.ts \
   src/lib/auth/requireSystemOwner.ts src/lib/auth/requireSessionOwner.ts \
   src/lib/session/sessionService.ts \
   src/app/api/auth/login/route.ts \
   src/app/api/sessions/route.ts \
   "src/app/api/sessions/[sessionId]/route.ts" && echo "ALL FILES PRESENT"

# 2. Integration contract spot-checks
grep -n 'export.*signJwt' src/lib/auth/authService.ts && echo "signJwt CONTRACT OK"
grep -n 'export.*isSystemOwnerEmail' src/lib/auth/authService.ts && echo "isSystemOwnerEmail CONTRACT OK"
grep -n 'export.*jwtMiddleware' src/lib/auth/jwtMiddleware.ts && echo "jwtMiddleware CONTRACT OK"
grep -n 'export.*requireSystemOwner' src/lib/auth/requireSystemOwner.ts && echo "requireSystemOwner CONTRACT OK"
grep -n 'export.*requireSessionOwner' src/lib/auth/requireSessionOwner.ts && echo "requireSessionOwner CONTRACT OK"
grep -n 'export.*createOrResumeSession' src/lib/session/sessionService.ts && echo "createOrResumeSession CONTRACT OK"
grep -n 'export.*getSessionById' src/lib/session/sessionService.ts && echo "getSessionById CONTRACT OK"

# 3. jose (not jsonwebtoken) — TechArch §6.2 requirement
grep "from 'jose'" src/lib/auth/authService.ts && echo "JOSE LIBRARY OK"
! grep -r "jsonwebtoken" src/lib/ && echo "NO JSONWEBTOKEN OK"

# 4. Error codes complete — FRD F01 + F07
grep "NOT_A_SYSTEM_OWNER" src/app/api/auth/login/route.ts && echo "F7 LOGIN ERROR CODE OK"
grep "SYSTEM_OWNER_CANNOT_RESPOND" src/app/api/sessions/route.ts && echo "F7 SESSION BLOCK OK"
grep "SESSION_NOT_FOUND\|SESSION_ACCESS_DENIED" "src/app/api/sessions/[sessionId]/route.ts" && echo "F1 GET SESSION ERROR CODES OK"
grep "TOKEN_EXPIRED\|TOKEN_INVALID\|AUTH_REQUIRED" src/lib/auth/jwtMiddleware.ts && echo "F7 JWT ERROR CODES OK"
grep "ACCESS_DENIED" src/lib/auth/requireSystemOwner.ts && echo "F7 ACCESS DENIED OK"

# 5. TypeScript no errors
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10 || echo "TSC CLEAN"

# 6. Security: LOWER() used for all email comparisons
grep -n "LOWER" src/lib/auth/authService.ts src/lib/session/sessionService.ts && echo "CASE INSENSITIVE EMAIL OK"

# 7. Functional smoke tests (server must be running: npm run dev)
# Test: missing auth header → 401 AUTH_REQUIRED
# curl -s http://localhost:3000/api/sessions/any-id | jq '.error.code'
# Expected: "AUTH_REQUIRED"

# Test: POST /api/sessions with system owner email → 403
# Insert a row: psql $DATABASE_URL -c "INSERT INTO system_owner_emails (email) VALUES ('owner@test.com') ON CONFLICT DO NOTHING"
# curl -s -X POST http://localhost:3000/api/sessions \
#   -H "Content-Type: application/json" \
#   -d '{"email":"owner@test.com","name":"Test Owner","team_type":"program_project"}' | jq '.error.code'
# Expected: "SYSTEM_OWNER_CANNOT_RESPOND"

# Test: POST /api/auth/login with that email → 200 with system_owner token
# curl -s -X POST http://localhost:3000/api/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"email":"owner@test.com","name":"Test Owner"}' | jq '{role,expires_at}'
# Expected: {"role":"system_owner","expires_at":"..."}
```
</verification>

<success_criteria>
- POST /api/auth/login: validates email, checks system_owner_emails (case-insensitive, active=true), issues HS256 JWT with role=system_owner and 8h expiry; 400 INVALID_EMAIL_FORMAT; 403 NOT_A_SYSTEM_OWNER
- POST /api/sessions: Zod validates (email RFC 5322, name ≥2 non-whitespace chars, team_type enum), blocks System Owner emails with 403 SYSTEM_OWNER_CANNOT_RESPOND, upserts respondent+session by LOWER(email), returns SessionResponse with is_returning flag, 24h respondent JWT, is_closed from assessment_config.due_date
- GET /api/sessions/:sessionId: jwtMiddleware + requireSessionOwner chain; returns full SessionResponse including saved_responses array for pre-population, is_closed, due_date; 401/403/404 on auth/ownership/not-found failures
- jwtMiddleware: 401 AUTH_REQUIRED (missing header), 401 TOKEN_EXPIRED (jose JWTExpired), 401 TOKEN_INVALID (tampered signature or invalid alg)
- requireSystemOwner: 403 ACCESS_DENIED for non-system_owner role; composable wrapper usable by waves 2d, 3c
- requireSessionOwner: DB-verified ownership (JOIN sessions→respondents, LOWER(email) comparison); 404 SESSION_NOT_FOUND; 403 SESSION_ACCESS_DENIED; system_owner bypasses for dashboard use
- authService.isSystemOwnerEmail uses LOWER() parameterized query (not string interpolation) — case-spoofing blocked
- jose library used throughout (not jsonwebtoken) — Edge Runtime compatible per TechArch §6.2
- TypeScript compiles without errors (npx tsc --noEmit)
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/02-SUMMARY.md` with:
- What was built (all 8 files, key behaviors)
- JWT strategy (HS256, jose, 8h SO / 24h respondent, payload shape)
- Middleware chain pattern (jwtMiddleware → requireSystemOwner or requireSessionOwner → handler) — downstream waves 2b–2d must follow this pattern
- Session upsert logic (LOWER(email), team_type lock, is_returning, is_closed from assessment_config)
- Any deviations from TechArch or FRD (flag, do not silently diverge)
</output>
