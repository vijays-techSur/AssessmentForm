# FIPS 199 Security Categorization — AssessmentForm-Express
**Project:** AssessmentForm
**Standard:** NIST FIPS 199 — Standards for Security Categorization of Federal Information and Information Systems
**Companion:** NIST SP 800-53 Rev 5 — Security and Privacy Controls
**Version:** 1.0
**Date:** 2026-08-12
**Status:** Draft

---

## 1. Overview

This document establishes the security categorization for **AssessmentForm-Express** in accordance with NIST FIPS Publication 199, *Standards for Security Categorization of Federal Information and Information Systems*. The categorization is expressed across three security objectives — Confidentiality, Integrity, and Availability — and serves as the authoritative baseline for control selection under NIST SP 800-53 Rev 5.

AssessmentForm-Express is an enterprise-internal single-page application (SPA) that enables cross-functional development teams to self-assess their readiness for three Developer Platform (DP) tools: Backstage, Red Hat Developer Hub, and Harness IDP. The system collects respondent identity (email address and display name), team type classification, and structured assessment answers (Likert scale, single/multi-choice, ranking, and free text). A System Owner dashboard aggregates responses into analytics charts and exportable datasets for DP tool adoption decision-making.

The system is deployed internally within the enterprise network on a shared PostgreSQL database (dedicated `assessmentform` schema), running Next.js 16 on port 4000, with JWT HS256 authentication and Drizzle ORM. It is not externally public-facing. It processes no payment data, health data, or regulated PII beyond email address and display name. The primary security risk profile is data integrity (assessment results inform enterprise tool selection) and limited confidentiality (internal respondent identities and opinions).

---

## 2. Security Objectives

The following definitions from FIPS 199 apply throughout this document when assigning impact levels to information types and determining the overall system security category.

| Level | Confidentiality | Integrity | Availability |
|---|---|---|---|
| **Low** | Unauthorized disclosure would have a **limited** adverse effect on operations, assets, or individuals | Unauthorized modification or destruction would have a **limited** adverse effect on operations, assets, or individuals | Disruption would have a **limited** adverse effect on operations; workarounds exist |
| **Moderate** | Unauthorized disclosure would have a **serious** adverse effect — significant degradation of capability, harm to individuals, or financial loss | Unauthorized modification or destruction would have a **serious** adverse effect — degradation of operations or significant harm | Disruption would have a **serious** adverse effect — significant reduction in capability for a meaningful time |
| **High** | Unauthorized disclosure would have a **severe or catastrophic** effect — loss of life, major financial damage, or mission failure | Unauthorized modification or destruction would have a **severe or catastrophic** effect | Disruption would have a **severe or catastrophic** effect — loss of primary mission capability |

---

## 3. System Identification

| Attribute | Value |
|---|---|
| **System Name** | AssessmentForm-Express |
| **Acronym** | AssessmentForm |
| **System Type** | Enterprise-internal web SPA |
| **Deployment** | Internal enterprise network; not public-facing |
| **Technology Stack** | Next.js 16 (port 4000), Node.js REST API, PostgreSQL (`assessmentform` schema), Drizzle ORM |
| **Authentication** | JWT HS256; email + display name identity (no SSO in v1) |
| **User Population** | Internal enterprise employees across 4 team types; System Owner dashboard users |
| **Operating Window** | Active assessment window (~2 weeks per cycle); System Owner dashboard available continuously |
| **Data Classification** | Internal / Sensitive-Internal (non-regulated) |
| **External Interfaces** | None; isolated to internal enterprise network |
| **Regulated Data** | None (no PHI, PII regulated under HIPAA/GDPR, payment data, or federal CUI) |

---

## 4. Information Types

The following information types are processed, stored, or transmitted by AssessmentForm-Express. Each is assessed independently across the three FIPS 199 security objectives. Impact levels are assigned based on the worst-case realistic consequence of a security failure for each type within the enterprise-internal context.

| # | Information Type | Description | Confidentiality | Integrity | Availability | Rationale |
|---|---|---|---|---|---|---|
| **IT-1** | Respondent Identity | Email address and display name captured at assessment start; used as session key, deduplication anchor, and dashboard display field | **Moderate** | **Moderate** | **Low** | **C:** Disclosure of employee email/name lists to unauthorized parties (e.g., non-dashboard users) is an internal privacy concern — serious but not catastrophic within the enterprise. **I:** Corruption or spoofing of identity breaks deduplication guarantees; a tampered email key could allow duplicate submissions or misattribute responses, undermining dataset reliability. **A:** Identity data unavailability would prevent session resumption but respondents can simply re-enter their details; limited operational impact. |
| **IT-2** | Assessment Responses | Structured answers to Likert, single/multi-choice, ranking, and free-text questions per respondent per assessment cycle | **Low** | **Moderate** | **Moderate** | **C:** Responses are internal team opinions on enterprise tooling preferences — not trade secrets, PII, or regulated data. Disclosure to other internal employees has limited adverse effect. **I:** Tampered or corrupted response data directly undermines the analytical output that informs DP tool adoption decisions; integrity failure here has serious operational consequences. **A:** The active assessment window is time-bounded (~2 weeks); inability to save or retrieve responses during this window has serious operational impact on respondents and System Owners dependent on the data. |
| **IT-3** | JWT Authentication Tokens | HS256-signed tokens issued at login; scope includes Respondent and Dashboard (System Owner) roles; stored client-side | **Moderate** | **High** | **Low** | **C:** Disclosure of a valid dashboard JWT enables unauthorized access to all respondent data (names, emails, responses); a serious internal privacy and integrity concern. **I:** Forged or tampered tokens could grant unauthorized dashboard privileges or allow a respondent to access the System Owner dashboard, bypassing access controls — a serious to severe integrity failure. **A:** Token unavailability causes session interruption, easily resolved by re-authentication; limited operational impact. |
| **IT-4** | System Owner Dashboard Data | Aggregated response analytics, individual response drill-downs, submission metadata (timestamps, team types, completion status) | **Moderate** | **Moderate** | **Moderate** | **C:** Dashboard data includes individual respondent names, emails, and answers — unauthorized disclosure to non-System-Owner personnel is a serious internal privacy concern. **I:** Corrupted aggregations or falsified analytics would mislead DP tool adoption decisions — a serious business integrity failure. **A:** Dashboard unavailability during the assessment window impedes monitoring and decision-making; System Owners cannot track participation or review responses, causing serious operational delay. |
| **IT-5** | Assessment Configuration | Due date settings, assessment status (active/closed), DP tool set in scope | **Low** | **Moderate** | **Moderate** | **C:** Configuration data is non-sensitive operational metadata; limited adverse effect if disclosed. **I:** Unauthorized modification of the due date (e.g., prematurely closing the assessment window) would deny respondents their edit window and corrupt the dataset; a serious operational impact. **A:** Inability to read or update configuration blocks System Owners from managing the assessment lifecycle; serious impact if assessment cannot be opened, closed, or reconfigured during the active window. |
| **IT-6** | Audit and Edit History | Submission timestamps, last-modified timestamps, and edit records per response | **Low** | **Moderate** | **Low** | **C:** Timestamps and edit counts are non-sensitive; limited disclosure impact. **I:** Tampered audit logs remove accountability for duplicate submission detection and edit window enforcement; a serious integrity concern for data governance. **A:** Audit history is rarely accessed in real-time; its unavailability has limited immediate operational impact. |

---

## 5. Security Categorization

### 5.1 Per-Objective Impact Determination

Applying the FIPS 199 high-water-mark principle, the system impact level for each objective is the **maximum** impact level across all information types.

| Security Objective | IT-1 | IT-2 | IT-3 | IT-4 | IT-5 | IT-6 | **System Level** |
|---|---|---|---|---|---|---|---|
| **Confidentiality** | Moderate | Low | Moderate | Moderate | Low | Low | **Moderate** |
| **Integrity** | Moderate | Moderate | High | Moderate | Moderate | Moderate | **High** |
| **Availability** | Low | Moderate | Low | Moderate | Moderate | Low | **Moderate** |

> **Note on IT-3 Integrity — High:** JWT token integrity is rated High because a forged or tampered HS256 token directly bypasses all access control, granting unauthorized access to the System Owner dashboard and all respondent data. This is the single driver of the High integrity rating. While the system is internal-only and non-critical infrastructure, a forged dashboard token has severe consequences within the system's trust model.

### 5.2 Overall System Security Category

```
SC AssessmentForm-Express = {(Confidentiality, MODERATE), (Integrity, HIGH), (Availability, MODERATE)}
```

**Overall System Security Category: HIGH**

Per FIPS 199 rules: if **any** single security objective reaches **High**, the overall system categorization is **High**. The Integrity objective reaches High due to JWT token integrity (IT-3). All other objectives are Moderate.

### 5.3 Categorization Justification

AssessmentForm-Express is an internal enterprise tool with a narrow active window and no regulated data. The High categorization is driven exclusively by the integrity of authentication tokens (IT-3). A forged JWT would allow any internal user to assume System Owner privileges, access all respondent names, emails, and assessment answers, and potentially manipulate assessment configuration. The consequence — unauthorized control of a dataset that directly informs an enterprise-wide tool adoption decision — is appropriately classified as severe within the system's scope.

Confidentiality and Availability remain Moderate because: the data involved is internal (no regulated PII, no external exposure), the respondent population is limited to enterprise employees, and the system has a defined time-bounded operating window with tolerable short-duration downtime.

---

## 6. NIST SP 800-53 Control Baseline

The applicable control baseline for a **High-impact system** under NIST SP 800-53 Rev 5 is the **High baseline**, with tailoring for the enterprise-internal, non-federal context. The following controls are prioritized based on the specific risk profile of AssessmentForm-Express.

| Control Family | Selected Controls | Priority | Rationale |
|---|---|---|---|
| **AC – Access Control** | AC-2, AC-3, AC-6, AC-7, AC-14, AC-17 | Critical | Enforce two-role access model (Respondent vs. Dashboard User); least privilege; account lockout on repeated failed logins; restrict dashboard access to authenticated JWT holders only |
| **AU – Audit and Accountability** | AU-2, AU-3, AU-6, AU-9, AU-12 | Critical | Log all authentication events, dashboard access, configuration changes, and submission events; protect audit logs from tampering; support System Owner review of access patterns |
| **IA – Identification and Authentication** | IA-2, IA-5, IA-6, IA-8 | Critical | Authenticate all users before dashboard access; enforce strong JWT secret management (HS256 key); obscure failed login feedback; identify both respondents and dashboard users |
| **SC – System and Communications Protection** | SC-8, SC-12, SC-13, SC-28 | Critical | Encrypt data in transit (TLS 1.2+) for all API calls; manage cryptographic keys (JWT signing secret) securely; encrypt sensitive data at rest in PostgreSQL |
| **SI – System and Information Integrity** | SI-2, SI-3, SI-7, SI-10 | Critical | Patch Node.js/Next.js dependencies; validate all input server-side (prevent injection, XSS); verify integrity of response data before aggregation; input validation on all API endpoints |
| **CM – Configuration Management** | CM-2, CM-3, CM-6, CM-8 | High | Maintain baseline configuration for Next.js, PostgreSQL, and JWT settings; control changes to assessment configuration (due date, tool set); maintain system component inventory |
| **IR – Incident Response** | IR-2, IR-4, IR-5, IR-6 | High | Define and train on incident response for unauthorized dashboard access or data tampering; detect and respond to anomalous login patterns; report incidents to enterprise security team |
| **RA – Risk Assessment** | RA-3, RA-5 | High | Conduct vulnerability scanning on the Next.js stack and PostgreSQL; reassess risk at each new assessment cycle launch |
| **SA – System and Services Acquisition** | SA-8, SA-15 | Moderate | Apply secure design principles (least privilege, fail-safe defaults, complete mediation) in development; review third-party libraries (Drizzle ORM, Recharts, charting dependencies) |
| **CP – Contingency Planning** | CP-2, CP-9, CP-10 | Moderate | Database backup plan for the PostgreSQL `assessmentform` schema; recovery procedures to restore data within the active 2-week window; test recovery before each assessment cycle |
| **MA – Maintenance** | MA-2, MA-4 | Moderate | Controlled maintenance windows that avoid the active assessment period; remote maintenance requires authenticated, encrypted sessions only |
| **PS – Personnel Security** | PS-3, PS-6 | Low | Background screening for personnel with System Owner dashboard access; acceptable use agreements covering assessment data handling |

### 6.1 Priority Tailoring Notes

- **JWT Secret Management (IA-5, SC-12):** The HS256 signing secret is the single most critical security artifact in this system. It must be stored as an environment variable or secrets manager entry — never hardcoded. Rotation procedures must be defined.
- **Input Validation (SI-10):** All question-response payloads (free text, ranking arrays, choice selections) must be validated server-side. Free-text fields are the primary injection surface.
- **Dashboard Access (AC-3, AC-14):** The dashboard is open to any user with a valid JWT — there is no pre-configured allowlist. This design decision increases the importance of strong JWT issuance controls and audit logging of all dashboard logins.
- **Shared Database (SC-28, CM-8):** The `assessmentform` schema resides on a shared platform PostgreSQL instance. Schema-level isolation, least-privilege DB user credentials, and coordination with the platform DB team are required.

---

## 7. Compliance Checklist

The following requirements must be satisfied prior to production launch and verified at each subsequent assessment cycle. Items marked **Critical** are gating requirements; the system must not launch without them.

### Authentication & Access Control
- [ ] **[Critical]** JWT signing secret (HS256) stored in environment variable or enterprise secrets manager — not hardcoded in source code or committed to version control
- [ ] **[Critical]** JWT expiration configured (recommended: 1-hour access token; refresh or re-login required)
- [ ] **[Critical]** Dashboard route (`/dashboard` and all `/api/admin/*` endpoints) rejects requests without a valid, unexpired JWT
- [ ] **[Critical]** Respondent-role JWTs cannot access dashboard endpoints — role claim enforced server-side on every request
- [ ] **[High]** Failed login attempts logged with IP address and timestamp
- [ ] **[High]** Login endpoint rate-limited to prevent brute-force attacks on the email + JWT issuance flow
- [ ] **[Moderate]** Session timeout enforced; stale JWTs rejected even if not expired (via token versioning or server-side revocation list if feasible)

### Data Protection
- [ ] **[Critical]** All API communication over HTTPS/TLS 1.2+ in the enterprise deployment environment
- [ ] **[Critical]** PostgreSQL connection uses SSL; credentials stored as environment variables
- [ ] **[Critical]** Respondent email and name stored only in the `assessmentform` schema; no replication to external services
- [ ] **[High]** Free-text response fields sanitized server-side before storage and before rendering in dashboard (prevent stored XSS)
- [ ] **[High]** Database user for the application has minimum required privileges (SELECT, INSERT, UPDATE on `assessmentform` schema only — no DROP, no cross-schema access)
- [ ] **[Moderate]** Sensitive fields (email addresses) masked or paginated in dashboard list views to limit bulk harvesting

### Input Validation & Integrity
- [ ] **[Critical]** All API endpoints validate request payloads server-side — type, length, allowed values, enum constraints for question types
- [ ] **[Critical]** Duplicate submission prevention enforced at the database level (unique constraint on respondent email per assessment cycle) — not solely in application logic
- [ ] **[High]** Assessment configuration changes (due date) require re-authentication confirmation or separate admin confirmation step
- [ ] **[High]** Edit window enforcement validated server-side on every save and submit request — not solely in client-side UI logic
- [ ] **[Moderate]** Response payload size limits enforced on free-text fields to prevent denial-of-service via oversized payloads

### Audit & Accountability
- [ ] **[Critical]** All authentication events (login success, login failure, JWT issuance) logged with timestamp, email, and source IP
- [ ] **[High]** All dashboard access events logged (page loads, individual response views, CSV exports, configuration changes)
- [ ] **[High]** Submission and edit events logged with respondent email, timestamp, and action type (draft save, submit, edit)
- [ ] **[High]** Audit logs protected from modification by application-tier database user (write-only or append-only log table pattern)
- [ ] **[Moderate]** Log retention policy defined — minimum 90 days post assessment window close, or per enterprise policy

### Availability & Continuity
- [ ] **[High]** PostgreSQL `assessmentform` schema included in enterprise DB backup schedule; backup frequency at least daily during active assessment window
- [ ] **[High]** Recovery time objective (RTO) defined for the assessment window: system must be restorable within 4 hours of failure during the active 2-week period
- [ ] **[High]** Maintenance windows scheduled outside the active assessment period (or change-freeze enforced during assessment window)
- [ ] **[Moderate]** Auto-save failure handling: client displays "Unsaved changes" warning and retries before data loss occurs; errors surfaced to user
- [ ] **[Moderate]** 99.5% uptime target documented and monitored during the active assessment window

### Dependency & Configuration Security
- [ ] **[High]** Next.js, Node.js, and all npm dependencies scanned for known vulnerabilities (CVE) before launch (e.g., `npm audit`)
- [ ] **[High]** Drizzle ORM queries reviewed to confirm parameterized queries / prepared statements used throughout — no raw SQL string interpolation
- [ ] **[Moderate]** Environment-specific configuration (dev vs. production) clearly separated; no development credentials or debug flags in production build
- [ ] **[Moderate]** CORS policy configured to allow only enterprise-internal origin domains
- [ ] **[Low]** Security headers configured on Next.js responses: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`

### Privacy & Data Governance
- [ ] **[High]** Data retention policy defined for assessment responses — confirm with enterprise data governance team how long response data is retained post decision
- [ ] **[High]** Respondents informed (on the landing page) of what data is collected, who can see it, and how long it is retained
- [ ] **[Moderate]** System Owner CSV export access logged; exported files treated as sensitive-internal data
- [ ] **[Moderate]** Confirm with enterprise legal/privacy team that email + name collection for internal employees requires no additional consent mechanism under applicable policy

---

## 8. Residual Risks & Accepted Limitations

The following risks are acknowledged given the v1 design decisions and enterprise-internal deployment context. They are recorded for System Owner awareness and future iteration planning.

| Risk | Description | Accepted Limitation | Recommended Mitigation |
|---|---|---|---|
| **No SSO** | Email + name identity without SSO means the system cannot verify that a respondent is an actual employee; email spoofing is possible | Accepted for v1 — internal trust model assumed | Add SSO (OIDC/SAML) in v2; or restrict dashboard login to corporate email domain only |
| **Open Dashboard Login** | Any user with a valid email can obtain a dashboard JWT — no pre-configured allowlist | Accepted per PRD (F7 design decision) | Monitor dashboard login audit log; implement domain-based allowlist (corporate email domain) as a near-term control |
| **Shared Database** | `assessmentform` schema on a shared platform DB — a misconfigured DB user could access other schemas | Accepted — rely on platform DB team controls | Enforce least-privilege DB credentials; request schema-level network isolation if available |
| **HS256 JWT** | Symmetric signing means any party with the secret can forge tokens | Accepted — HS256 appropriate for single-service internal deployment | Rotate JWT secret per assessment cycle; consider RS256 (asymmetric) in v2 for stronger non-repudiation |
| **No MFA** | No multi-factor authentication on dashboard login | Accepted for v1 simplicity | Prioritize MFA for System Owner accounts in v2 or when SSO is added |

---

*Document generated: 2026-08-12 | Project: AssessmentForm-Express | Standard: NIST FIPS 199 + SP 800-53 Rev 5 | Version: 1.0*
