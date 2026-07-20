---
phase: 02a-auth-session
plan: 02
subsystem: auth-session-backend
tags: [auth, jwt, sessions, middleware, respondent, system-owner]
dependency_graph:
  requires: [drizzle/schema.ts (plan 01), src/lib/db.ts (plan 01)]
  provides: [src/lib/auth/authService.ts, src/lib/auth/jwtMiddleware.ts, src/lib/auth/requireSystemOwner.ts, src/lib/auth/requireSessionOwner.ts, src/lib/session/sessionService.ts, src/app/api/auth/login/route.ts, src/app/api/sessions/route.ts, src/app/api/sessions/[sessionId]/route.ts]
  affects: [all downstream waves 2b-2d that consume jwtMiddleware/requireSystemOwner/requireSessionOwner]
tech_stack:
  added: [jose (HS256 JWT), zod v4 (request validation)]
  patterns: [middleware-chain (jwtMiddleware → role-guard → handler), upsert-by-LOWER-email, singleton-config-is_closed]
key_files:
  created:
    - src/types/auth.ts
    - src/lib/auth/authService.ts
    - src/lib/auth/jwtMiddleware.ts
    - src/lib/auth/requireSystemOwner.ts
    - src/lib/auth/requireSessionOwner.ts
    - src/lib/session/sessionService.ts
    - src/app/api/auth/login/route.ts
    - src/app/api/sessions/route.ts
    - src/app/api/sessions/[sessionId]/route.ts
  modified: []
decisions:
  - "jose (not jsonwebtoken) for JWT — Edge Runtime compatible per TechArch §6.2"
  - "Zod v4 z.enum requires 'as const' tuple — errorMap replaced by error callback per Zod v4 API"
  - "jwtMiddleware uses err.code === ERR_JWT_EXPIRED (jose error code) rather than checking err.name === JWTExpired string"
metrics:
  duration: "~20 minutes"
  completed: "2026-07-20"
  tasks_completed: 2
  files_created: 9
---

# Phase 02a Plan 02: Auth & Session Backend Summary

**One-liner:** HS256 JWT auth with dual identity flows (8h system_owner / 24h respondent) + upsert-by-email session management with LOWER() case-insensitive lookups and middleware chain (jwtMiddleware → requireSystemOwner/requireSessionOwner → handler).

## What Was Built

### Files Created (8 source files + 1 type file = 9 total)

| File | Purpose |
|------|---------|
| `src/types/auth.ts` | Shared `JwtPayload`, `AuthenticatedRequest`, `UserRole` types |
| `src/lib/auth/authService.ts` | `signJwt` (HS256/jose), `verifyJwt`, `isSystemOwnerEmail` (LOWER() parameterized) |
| `src/lib/auth/jwtMiddleware.ts` | Bearer token extraction + verification; 401 AUTH_REQUIRED/TOKEN_EXPIRED/TOKEN_INVALID |
| `src/lib/auth/requireSystemOwner.ts` | 403 ACCESS_DENIED guard for system_owner role enforcement |
| `src/lib/auth/requireSessionOwner.ts` | DB-verified session ownership (JOIN sessions→respondents); 404/403 on mismatch |
| `src/lib/session/sessionService.ts` | `createOrResumeSession` + `getSessionById` — core respondent session CRUD |
| `src/app/api/auth/login/route.ts` | POST /api/auth/login — System Owner login |
| `src/app/api/sessions/route.ts` | POST /api/sessions — respondent session create/resume |
| `src/app/api/sessions/[sessionId]/route.ts` | GET /api/sessions/:sessionId — load session with saved_responses |

### Key Behaviors Implemented

**POST /api/auth/login:**
- Zod validation: email (RFC 5322, max 254) + name (required)
- `isSystemOwnerEmail(email)` → LOWER(system_owner_emails.email) = LOWER(input), active=true, parameterized SQL
- On match: `signJwt({ session_id: null, email, role: 'system_owner' }, '8h')` → 200 `{ token, role, email, name, expires_at }`
- Errors: 400 INVALID_EMAIL_FORMAT, 403 NOT_A_SYSTEM_OWNER

**POST /api/sessions:**
- Zod validation: email + name (≥2 non-whitespace chars) + team_type enum (as const tuple per Zod v4)
- `isSystemOwnerEmail` check → 403 SYSTEM_OWNER_CANNOT_RESPOND if matched
- `createOrResumeSession`: LOWER(email) lookup → if exists: is_returning=true, team_type LOCKED; if new: INSERT respondents + sessions; 24h respondent JWT
- Returns full `SessionResponse` with is_closed computed server-side from assessment_config.due_date

**GET /api/sessions/:sessionId:**
- Middleware chain: `jwtMiddleware` → `requireSessionOwner` → `handleGet`
- `getSessionById`: JOIN sessions→respondents, ownership double-check (email match), saved_responses hydrated from responses table, fresh 24h token re-signed
- Errors: 401 AUTH_REQUIRED/TOKEN_EXPIRED/TOKEN_INVALID (jwtMiddleware), 403 SESSION_ACCESS_DENIED (requireSessionOwner), 404 SESSION_NOT_FOUND

## JWT Strategy

| Property | Value |
|----------|-------|
| Algorithm | HS256 (symmetric, jose library) |
| Secret | `process.env.JWT_SECRET` (fail-closed: throws on missing) |
| System Owner expiry | 8 hours (`'8h'`) |
| Respondent expiry | 24 hours (`'24h'`) |
| Payload | `{ session_id: string \| null, email: string, role: UserRole, iat: number, exp: number }` |
| Library | `jose` (Edge Runtime compatible, not `jsonwebtoken`) |

## Middleware Chain Pattern

All downstream waves 2b–2d MUST follow this pattern:

```typescript
// For system_owner endpoints:
export async function GET(req: NextRequest): Promise<NextResponse> {
  return jwtMiddleware(req, requireSystemOwner(handleGet));
}

// For respondent session endpoints:
export async function GET(req: NextRequest, ctx: { params: { sessionId: string } }): Promise<NextResponse> {
  return jwtMiddleware(req, (authedReq) =>
    requireSessionOwner(handleGet)(authedReq, ctx)
  );
}
```

**Note:** `requireSessionOwner` wraps a handler that takes `(req, sessionId)` — the sessionId is extracted from `ctx.params` and passed directly to the inner handler.

## Session Upsert Logic

```
POST /api/sessions:
  1. Validate email/name/team_type (Zod)
  2. isSystemOwnerEmail(email) → 403 if matched
  3. SELECT respondents WHERE LOWER(email) = LOWER(input)
  4. If exists: respondentId from existing row, isReturning=true (team_type LOCKED)
  5. If not: INSERT respondents { email, name, team_type }; isReturning=false
  6. SELECT sessions WHERE respondent_id = respondentId
  7. If exists: load submission_status, current_section_index, section_ids_ordered
  8. If not: INSERT sessions { respondent_id, status='draft', index=0, ids=[] }
  9. If isReturning: loadSavedResponses(sessionId) → saved_responses array
  10. getAssessmentStatus() → { due_date, is_closed } from assessment_config id=1
  11. signJwt({ session_id, email, role:'respondent' }, '24h')
  12. Return SessionResponse
```

**is_closed computation:** `new Date() > new Date(config.due_date)` — pure server-side, no client clock trust.

**Fallback (no assessment_config row):** 14-day future due_date, is_closed=false — prevents blocking before seeding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod v4 z.enum API incompatibility**
- **Found during:** Task 2, TypeScript compilation
- **Issue:** `z.enum(['a','b'], { errorMap: ... })` is Zod v3 API. Zod v4 requires `as const` tuple and `error` callback instead of `errorMap`.
- **Fix:** Changed to `z.enum([...] as const, { error: () => ({ message: '...' }) })`
- **Files modified:** `src/app/api/sessions/route.ts`
- **Commit:** 0e3eaab

**2. [Rule 1 - Bug] jose error code check hardened**
- **Found during:** Task 1 review
- **Issue:** Plan used `err.name === 'JWTExpired'` but jose v6 uses `err.code === 'ERR_JWT_EXPIRED'` as the reliable discriminant
- **Fix:** Updated jwtMiddleware to check `err.code === 'ERR_JWT_EXPIRED'` in addition to message-based check
- **Files modified:** `src/lib/auth/jwtMiddleware.ts`
- **Commit:** 8f76844

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/types/auth.ts | ✅ Found |
| src/lib/auth/authService.ts | ✅ Found |
| src/lib/auth/jwtMiddleware.ts | ✅ Found |
| src/lib/auth/requireSystemOwner.ts | ✅ Found |
| src/lib/auth/requireSessionOwner.ts | ✅ Found |
| src/lib/session/sessionService.ts | ✅ Found |
| src/app/api/auth/login/route.ts | ✅ Found |
| src/app/api/sessions/route.ts | ✅ Found |
| src/app/api/sessions/[sessionId]/route.ts | ✅ Found |
| Commit 8f76844 (Task 1) | ✅ Found |
| Commit 0e3eaab (Task 2) | ✅ Found |
| TypeScript compilation | ✅ Clean (no errors) |
