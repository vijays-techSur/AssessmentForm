---

## 5. Security Architecture

### 5.1 Authentication

AssessmentForm-Express uses **email-identity + JWT** authentication. There is no password, SSO, or OAuth in v1.

**Respondent flow:**
1. Respondent submits email + name + team_type to `POST /api/sessions`.
2. Server looks up email in `respondents` table (case-insensitive). Creates or loads the session.
3. Server checks email against `system_owner_emails` (case-insensitive): no match → `role = "respondent"`.
4. Server signs a JWT with secret `JWT_SECRET` (HS256):
   ```json
   { "session_id": "uuid", "email": "user@example.com", "role": "respondent", "iat": 1752758400, "exp": 1752844800 }
   ```
   - Token expiry: **24 hours** (covers multi-day resume without re-login).
5. JWT returned to client; stored in `localStorage`.

**System Owner flow:**
1. System Owner submits email + name to `POST /api/auth/login`.
2. Server verifies email exists in `system_owner_emails` (active record, case-insensitive); if not, returns `403 NOT_A_SYSTEM_OWNER`.
3. Server issues JWT with `role = "system_owner"`, expiry **8 hours**.
4. Client stores JWT; attaches as `Authorization: Bearer {token}` on all dashboard requests.

**JWT verification (all protected routes):**
- Signature verified with `JWT_SECRET`; tampered tokens → `401 TOKEN_INVALID`.
- Expiry checked; expired tokens → `401 TOKEN_EXPIRED`.
- `role` claim must be `"respondent"` or `"system_owner"`; any other value → `401 TOKEN_INVALID`.

### 5.2 Authorization Model

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Authorization Matrix                                │
├─────────────────────────────────────────┬────────────────┬────────────────┤
│ Resource                                │ Respondent     │ System Owner   │
├─────────────────────────────────────────┼────────────────┼────────────────┤
│ POST /api/sessions                      │ ✓ (no auth)    │ ✗ (blocked)    │
│ POST /api/auth/login                    │ ✗ (blocked)    │ ✓ (no auth)    │
│ GET /api/sessions/:id (own session)     │ ✓              │ ✓              │
│ GET /api/sessions/:id (other session)   │ ✗ 403          │ ✓              │
│ GET /api/sections?teamType=...          │ ✓              │ ✓              │
│ GET /api/sections/:id/questions         │ ✓              │ ✓              │
│ PUT /api/responses/:sessionId           │ ✓ (own session)│ ✗ 403          │
│ POST /api/submissions/:sessionId        │ ✓ (own session)│ ✗ 403          │
│ GET /api/dashboard/responses            │ ✗ 403          │ ✓              │
│ GET /api/dashboard/responses/:sessionId │ ✗ 403          │ ✓              │
│ GET /api/dashboard/analytics            │ ✗ 403          │ ✓              │
│ GET /api/dashboard/export/csv           │ ✗ 403          │ ✓              │
│ GET /api/config                         │ ✗ 403          │ ✓              │
│ PATCH /api/config                       │ ✗ 403          │ ✓              │
└─────────────────────────────────────────┴────────────────┴────────────────┘
```

**Data isolation enforcement (respondent sessions):**
- Every request to `/api/sessions/:id`, `/api/responses/:id`, `/api/submissions/:id` verifies that the `session_id` path param's `respondent_id` matches the email in the JWT.
- Mismatch returns `403 SESSION_ACCESS_DENIED` — respondents cannot access, modify, or submit other respondents' sessions.

**System Owner restrictions:**
- `POST /api/sessions` rejects System Owner emails with `403 SYSTEM_OWNER_CANNOT_RESPOND`.
- `POST /api/submissions/:id` rejects if `role === "system_owner"` with `403 SYSTEM_OWNER_CANNOT_SUBMIT`.

### 5.3 Data Protection

| Category | Mechanism |
|----------|-----------|
| **Data in transit** | HTTPS enforced via enterprise reverse proxy (TLS 1.2+). App server runs HTTP internally; TLS termination at the network edge. |
| **Data at rest** | PostgreSQL database disk encryption handled by enterprise infrastructure team. |
| **JWT secret** | `JWT_SECRET` injected via environment variable; never committed to source control; 256-bit minimum entropy. |
| **SQL injection** | All database queries use parameterized statements (no string concatenation). Drizzle ORM enforces this. |
| **JSONB payload validation** | Server-side schema validation on every `answer_payload` before persistence; type mismatch returns `400 INVALID_ANSWER_PAYLOAD`. |
| **Input sanitization** | All user-provided strings trimmed and length-bounded server-side; no HTML rendered from user input (React's JSX escaping prevents XSS). |
| **Email case-insensitive matching** | `LOWER(email)` index enforced at DB level prevents case-variation duplicate abuse. |
| **Audit trail** | `config_audit_log` records every `assessment_config` change with timestamp and System Owner email. |
| **Session token storage** | Client stores JWT in `localStorage`; acceptable for an internal enterprise tool. For higher-security deployments, `httpOnly` cookie storage is a drop-in alternative. |

### 5.4 Due Date Enforcement

Due-date checks are **server-side only** — the client may display the due date, but access control decisions are never delegated to the client.

- Every `PUT /api/responses/:sessionId` request checks `assessment_config.due_date > NOW()` before persisting.
- Every `POST /api/submissions/:sessionId` performs the same check.
- Every `GET /api/sessions/:sessionId` response includes `is_closed: boolean` derived from the server-side due-date comparison.
- The `assessmentOpenGuard` middleware (see §2.4) handles this check centrally.

### 5.5 Security Non-Goals (v1)

The following are explicitly out of scope for v1:
- Rate limiting / brute-force protection on `POST /api/sessions` (no password to brute-force).
- CSRF protection (no cookie-based session; JWT in `Authorization` header is CSRF-safe by design).
- Content Security Policy headers beyond default Next.js headers.
- Penetration testing / formal security audit (deferred to pre-launch hardening if required).

---
