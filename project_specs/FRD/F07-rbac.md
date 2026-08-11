---

## F07: Role-Based Access Control

**Description:** The system supports exactly two roles: Respondent and Dashboard User. The dashboard is open to any user with a valid email — no allowlist or pre-configured email list is required. Dashboard Users log in via `POST /api/auth/login` and receive a JWT with `role: "system_owner"` (the technical claim name). Respondents access the assessment form via `POST /api/sessions`. No complex permission hierarchy, OAuth, or SSO is required in v1. Role enforcement happens server-side on every protected API route.

**Terminology:**
- **Respondent Role:** The default role for users who log in via `POST /api/sessions`. Grants access to the assessment form and the respondent's own session data only.
- **Dashboard User Role:** Any user who logs in via `POST /api/auth/login` with a valid email. Grants access to the dashboard, all response data, and configuration management. JWT role claim is `"system_owner"` (technical name).
- **Protected Route:** An API endpoint or UI route that requires a specific role; returns 403 if the caller's role does not match.
- **JWT Token:** A signed JSON Web Token issued by `POST /api/sessions` or `POST /api/auth/login` that encodes `{ session_id, email, role }`. Used as the bearer token for all subsequent API calls.
- **Role Claim:** The `role` field in the JWT payload: either `"respondent"` or `"system_owner"`.

**Sub-features:**
- Role determination at login based on which endpoint is used (not email allowlist)
- JWT generation with role claim
- Server-side role validation on every protected route
- Respondent cannot access dashboard or other respondents' data
- Dashboard User cannot submit an assessment from the respondent flow (in v1)
- No UI route rendered if role does not match (client-side guard + server-side enforcement)

**Process:**

**Role Determination at Login:**
1. User submits email + name via `POST /api/sessions` (respondent flow) or `POST /api/auth/login` (dashboard login).
2. For `POST /api/auth/login`: any valid email is accepted; server issues JWT with `role = "system_owner"`. No allowlist check is performed.
3. For `POST /api/sessions`: server issues JWT with `role = "respondent"`.
4. Server issues a signed JWT with payload `{ session_id, email, role, issued_at, expires_at }`. Expiry: 8 hours for Dashboard Users; 24 hours for Respondents (to cover resume across days).
5. JWT returned to client; stored in `localStorage` or `sessionStorage`.

**Dashboard Access:**
1. Dashboard User navigates to `/dashboard`.
2. Client attaches JWT as `Authorization: Bearer {token}` header.
3. Server middleware extracts and verifies JWT signature and expiry.
4. Server checks `role === "system_owner"`; if not, returns 403 `ACCESS_DENIED`.
5. If token expired, returns 401 `TOKEN_EXPIRED`; client redirects to login.

**Respondent Route Protection:**
1. Respondent accesses `/assessment` or any `/api/responses/*` or `/api/sessions/*` endpoint.
2. Server middleware extracts JWT; verifies `role === "respondent"` or `role === "system_owner"` (Dashboard Users are not blocked from reading their own session if it exists, but submit is blocked).
3. `GET /api/dashboard/*` routes: Respondent JWT returns 403 `ACCESS_DENIED`.
4. `GET /api/dashboard/responses/:sessionId`: Only allowed if `role === "system_owner"`; respondents cannot view others' sessions.

**Data Isolation for Respondents:**
1. All `/api/responses/:sessionId` and `/api/sessions/:sessionId` requests validate that the `session_id` in the path belongs to the authenticated user's email (extracted from JWT).
2. If session belongs to a different email, return 403 `SESSION_ACCESS_DENIED`.

**Inputs:**
- `email` (string, required): Used to identify the user. For dashboard login, any valid email is accepted.
- `Authorization: Bearer {token}` header (required on all protected routes).

**Outputs:**
- JWT token with `{ session_id, email, role, issued_at, expires_at }`.
- Role-appropriate UI rendered (assessment form for Respondents; dashboard for Dashboard Users).

**Validation:**
- JWT must be signed with the server's secret key; tampered tokens rejected with `TOKEN_INVALID`.
- JWT expiry enforced; expired tokens rejected with `TOKEN_EXPIRED`.
- `role` claim in JWT must be one of `"respondent"` or `"system_owner"`; any other value rejected.
- Email must be a valid RFC 5322 address; invalid format rejected with `INVALID_EMAIL_FORMAT`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Respondent JWT used on dashboard route | 403 | `ACCESS_DENIED` | "You do not have permission to access this resource." |
| JWT expired | 401 | `TOKEN_EXPIRED` | "Your session has expired. Please log in again." |
| JWT invalid or tampered | 401 | `TOKEN_INVALID` | "Authentication failed. Please log in again." |
| Respondent attempts to access another session | 403 | `SESSION_ACCESS_DENIED` | "You do not have access to this session." |
| Dashboard JWT used in submission endpoint | 403 | `SYSTEM_OWNER_CANNOT_SUBMIT` | "Dashboard users cannot submit assessments as respondents." |
| No Authorization header on protected route | 401 | `AUTH_REQUIRED` | "Authentication required. Please log in." |

**API Surface (this feature):** `POST /api/auth/login` (dashboard login — any valid email accepted), JWT validation middleware applied to all protected routes — see `Y1-api.md` §Auth.

**Schema Surface (this feature):** The `system_owner_emails` table exists in the DB schema but is no longer used for access control. See `Y0-schema.md` §Auth.

---
