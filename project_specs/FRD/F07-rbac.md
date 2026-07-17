---

## F07: Role-Based Access Control

**Description:** The system supports exactly two roles: Respondent and System Owner. Role assignment is determined at session creation by matching the respondent's email against a pre-configured list of System Owner emails stored in `system_owner_emails`. No complex permission hierarchy, OAuth, or SSO is required in v1. Role enforcement happens server-side on every protected API route.

**Terminology:**
- **Respondent Role:** The default role for all non-System-Owner email addresses. Grants access to the assessment form and the respondent's own session data only.
- **System Owner Role:** A privileged role granted to emails listed in `system_owner_emails`. Grants access to the dashboard, all response data, and configuration management.
- **Pre-configured Email List:** The `system_owner_emails` table (or environment-variable list) of email addresses with System Owner access.
- **Protected Route:** An API endpoint or UI route that requires a specific role; returns 403 if the caller's role does not match.
- **JWT Token:** A signed JSON Web Token issued by `POST /api/sessions` that encodes `{ session_id, email, role }`. Used as the bearer token for all subsequent API calls.
- **Role Claim:** The `role` field in the JWT payload: either `"respondent"` or `"system_owner"`.

**Sub-features:**
- Email-to-role mapping at session creation
- JWT generation with role claim
- Server-side role validation on every protected route
- Respondent cannot access dashboard or other respondents' data
- System Owner cannot submit an assessment from the respondent flow (in v1)
- No UI route rendered if role does not match (client-side guard + server-side enforcement)

**Process:**

**Role Determination at Login:**
1. Respondent or System Owner submits email + name via `POST /api/sessions` or `POST /api/auth/login` (dashboard login).
2. Server checks email against `system_owner_emails` table (case-insensitive).
3. If match found: `role = "system_owner"`.
4. If no match: `role = "respondent"`.
5. Server issues a signed JWT with payload `{ session_id, email, role, issued_at, expires_at }`. Expiry: 8 hours for System Owners; 24 hours for Respondents (to cover resume across days).
6. JWT returned to client; stored in `localStorage` or `sessionStorage`.

**System Owner Dashboard Access:**
1. System Owner navigates to `/dashboard`.
2. Client attaches JWT as `Authorization: Bearer {token}` header.
3. Server middleware extracts and verifies JWT signature and expiry.
4. Server checks `role === "system_owner"`; if not, returns 403 `ACCESS_DENIED`.
5. If token expired, returns 401 `TOKEN_EXPIRED`; client redirects to login.

**Respondent Route Protection:**
1. Respondent accesses `/assessment` or any `/api/responses/*` or `/api/sessions/*` endpoint.
2. Server middleware extracts JWT; verifies `role === "respondent"` or `role === "system_owner"` (System Owners are not blocked from reading their own session if it exists, but submit is blocked).
3. `GET /api/dashboard/*` routes: Respondent JWT returns 403 `ACCESS_DENIED`.
4. `GET /api/dashboard/responses/:sessionId`: Only allowed if `role === "system_owner"`; respondents cannot view others' sessions.

**Data Isolation for Respondents:**
1. All `/api/responses/:sessionId` and `/api/sessions/:sessionId` requests validate that the `session_id` in the path belongs to the authenticated user's email (extracted from JWT).
2. If session belongs to a different email, return 403 `SESSION_ACCESS_DENIED`.

**Inputs:**
- `email` (string, required): Used for role lookup.
- `Authorization: Bearer {token}` header (required on all protected routes).

**Outputs:**
- JWT token with `{ session_id, email, role, issued_at, expires_at }`.
- Role-appropriate UI rendered (assessment form for Respondents; dashboard for System Owners).

**Validation:**
- JWT must be signed with the server's secret key; tampered tokens rejected with `TOKEN_INVALID`.
- JWT expiry enforced; expired tokens rejected with `TOKEN_EXPIRED`.
- `role` claim in JWT must be one of `"respondent"` or `"system_owner"`; any other value rejected.
- System Owner email lookup is case-insensitive.
- Empty `system_owner_emails` table is valid (no System Owners configured); System Owner routes return 403 for all users in this state.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Non-System Owner accesses dashboard route | 403 | `ACCESS_DENIED` | "You do not have permission to access this resource." |
| JWT expired | 401 | `TOKEN_EXPIRED` | "Your session has expired. Please log in again." |
| JWT invalid or tampered | 401 | `TOKEN_INVALID` | "Authentication failed. Please log in again." |
| Respondent attempts to access another session | 403 | `SESSION_ACCESS_DENIED` | "You do not have access to this session." |
| System Owner attempts to submit assessment | 403 | `SYSTEM_OWNER_CANNOT_SUBMIT` | "System Owners cannot submit assessments as respondents." |
| No Authorization header on protected route | 401 | `AUTH_REQUIRED` | "Authentication required. Please log in." |

**API Surface (this feature):** `POST /api/auth/login` (System Owner login), JWT validation middleware applied to all protected routes — see `Y1-api.md` §Auth.

**Schema Surface (this feature):** Uses `system_owner_emails` table — see `Y0-schema.md` §Auth.

---
