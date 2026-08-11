---

## 7. Integration Points

### 7.1 Integration Summary

AssessmentForm-Express v1 is designed to minimize external dependencies. All core functionality is self-contained within the Next.js application and PostgreSQL database. The only external integration is an optional email relay for submission confirmation.

| ID | Integration | Type | Status |
|----|-------------|------|--------|
| INT-01 | Enterprise Email Relay (SMTP) | Outbound HTTP / SMTP | Optional stretch goal |
| INT-02 | Enterprise Deployment Infrastructure | Deployment | Required |
| INT-03 | SSO / OAuth | — | Explicitly out of scope for v1 |
| INT-04 | AI/ML Analysis | — | Explicitly out of scope for v1 |

---

### 7.2 INT-01: Email Relay (Stretch Goal)

**Purpose:** Send submission confirmation emails to respondents upon successful assessment submission (F09).

**Trigger:** Successful `POST /api/submissions/:sessionId` (HTTP 200 response).

**Flow:**
```
Next.js Server
    │
    │ POST /api/submissions/:sessionId → success
    │
    ▼
emailService.ts  ──────────────►  Enterprise Email Relay
    │              (fire-and-forget   (SMTP / internal HTTP)
    │               async call)
    │
    ▼
Failure: LOG only — does not block submission response to respondent
```

**Configuration:**
- `EMAIL_RELAY_URL` — relay endpoint or SMTP host. Feature disabled if unset (graceful no-op).
- `EMAIL_FROM_ADDRESS` — sender address (e.g. `noreply@enterprise.com`).

**Email content:**
- Subject: `"Assessment Submitted — Developer Platform Evaluation"`
- Body: Plain-text with respondent name and due date (HTML optional).

**Error handling:** `EMAIL_SEND_FAILED` logged server-side. No retry. No respondent-facing error. Submission is confirmed regardless of email delivery.

**Out of scope:** Two-way email tracking, delivery receipts, template management via dashboard.

---

### 7.3 INT-02: Enterprise Deployment Infrastructure

**Purpose:** Host the SPA and backend API within the enterprise internal network.

**Deployment artifact:** Single Docker container image.

**Runtime requirements:**
- Node.js 20 LTS (provided by base image `node:20-alpine`).
- PostgreSQL 16 shared DB at `pivota-spec-driven-primary.prod.svc:5432` reachable via `DATABASE_URL`.
- Port 4000 exposed internally; TLS termination handled by enterprise reverse proxy.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` exported at process level to allow platform-internal TLS connections.

**Network requirements:**
- All traffic is internal; no public internet exposure required.
- PostgreSQL platform-shared DB accessible from the container; app uses schema `assessmentform` via `options=-csearch_path%3Dassessmentform%2Cpublic` in the connection string (set at connection string level, not via `pool.on('connect')`, to avoid async race conditions).
- Optional: Email relay accessible from the container if `EMAIL_RELAY_URL` is configured.

**Configuration injection:** All environment variables injected at container startup (not baked into image).

---

### 7.4 INT-03: No SSO in v1 (Explicit Non-Integration)

Email + name identity is used in lieu of enterprise SSO (Azure AD, Okta, Google Workspace, etc.). This eliminates SSO configuration dependencies for the initial rollout.

**Future migration path:** The `respondents` table can be extended with `sso_provider TEXT` and `external_user_id TEXT` columns. `POST /api/sessions` would be augmented with an OIDC callback endpoint. The JWT role model is unchanged — `role` claim would still be determined by `system_owner_emails` lookup.

---

### 7.5 INT-04: No AI/ML in v1 (Explicit Non-Integration)

All analytics are computed via standard PostgreSQL aggregations (`GROUP BY`, `AVG`, `COUNT`). No external AI/ML APIs, LLM inference, or embedding pipelines are used.

**Future migration path:** The `responses.answer_payload` JSONB column's structured format supports analytical overlays without schema changes. A post-submission enrichment job could add an `analysis_payload JSONB` column to `responses` and populate it asynchronously.

---
