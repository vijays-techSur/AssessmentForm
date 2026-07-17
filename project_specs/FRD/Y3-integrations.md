---

## External Integration Points

> AssessmentForm-Express v1 is designed to minimize external dependencies. All core functionality is self-contained. External integrations are limited to optional enhancements.

---

### INT-01: Email Notification (Stretch Goal — v1 Optional)

**Purpose:** Send submission confirmation emails to respondents upon successful submission (see F09).

**Trigger:** Successful `POST /api/submissions/:sessionId` response (status 200).

**Integration Type:** Outbound HTTP call to an internal enterprise email relay or SMTP service.

**Contract:**
- Server calls internal email service endpoint or SMTP relay with:
  - `to`: respondent email
  - `subject`: `"Assessment Submitted — Developer Platform Evaluation"`
  - `body`: Plain-text or HTML template including respondent name and due date.
- Email service returns success/failure. Failure is logged only; it does not block the submission flow or surface an error to the respondent.

**Configuration:**
- Email relay hostname/URL: environment variable `EMAIL_RELAY_URL`.
- From address: environment variable `EMAIL_FROM_ADDRESS`.
- Feature is disabled if `EMAIL_RELAY_URL` is not set (graceful no-op).

**Error Handling:** `EMAIL_SEND_FAILED` logged server-side; no retry; no respondent-facing error (see Y2-errors.md).

**Out of scope for v1:** Two-way email (reply tracking), delivery receipts, template customization via dashboard.

---

### INT-02: Enterprise Deployment Infrastructure

**Purpose:** Host the SPA and backend API within the enterprise's internal network.

**Integration Type:** Deployment — not a runtime API dependency.

**Details:**
- The application is deployed as a containerized Node.js/Next.js service.
- No external CDN or public cloud endpoints are required.
- Database (PostgreSQL) is hosted within the enterprise network.
- All traffic is internal (no public internet exposure required for v1).

**Configuration Dependencies:**
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Signing secret for JWT tokens.
- `EMAIL_RELAY_URL` (optional): For stretch-goal email notifications.
- `EMAIL_FROM_ADDRESS` (optional): Sender address for confirmation emails.

---

### INT-03: No SSO / OAuth in v1

**Purpose:** Explicitly document the absence of SSO integration as a v1 constraint.

**Decision:** Email + name identity is used in lieu of enterprise SSO (Azure AD, Okta, etc.). This reduces deployment complexity and SSO configuration dependencies.

**Future consideration:** If SSO is required in a future version, the `sessions` and `respondents` tables can be extended with an `sso_provider` and `external_user_id` column. The `POST /api/sessions` endpoint would be replaced or augmented with an OIDC callback endpoint. This is out of scope for v1.

---

### INT-04: No AI/ML Integration in v1

**Purpose:** Explicitly document the absence of AI/ML analysis as a v1 constraint.

**Decision:** All analytics are computed via standard SQL aggregations (GROUP BY, AVG, COUNT). No external AI/ML APIs, LLM calls, or model inference pipelines are used in v1.

**Future consideration:** Response sentiment analysis or automated theme detection could be added as a post-submission enrichment step. The `responses` table's `JSONB answer_payload` column is structured to support future analytical overlays without schema changes.

---
