# PRD: AssessmentForm-Express
**Project:** AssessmentForm
**Version:** 1.0
**Date:** 2026-07-17
**Status:** Draft

---

## 1. Executive Summary

AssessmentForm-Express is an enterprise-internal single-page application (SPA) that enables cross-functional teams to self-assess their readiness for and expectations of Developer Platform (DP) tools — specifically Backstage, Red Hat Developer Hub, and Harness IDP. Different team types complete a structured, role-tailored multi-step assessment, while System Owners gain access to a dedicated dashboard for aggregated analytics and data-driven adoption decision-making.

---

## 2. Problem Statement

Enterprise adoption decisions for Developer Platform tooling are often made without structured, team-level input. The gaps this creates are significant:

- **No baseline data:** Different teams — Platform Engineering, Infrastructure, Program/Project, Data/API Governance — have distinct needs that are rarely captured in a consistent format.
- **Manual aggregation burden:** When team leads do collect feedback, it's typically via ad-hoc emails or spreadsheets, making aggregation error-prone and time-consuming.
- **Tool selection mismatch:** Without nuanced input on capability expectations, organizations risk selecting a DP tool that fits one team type well but fails others.
- **Lack of accountability:** Without identity-based deduplication and edit windows, assessment data is unreliable — respondents cannot update their answers as thinking evolves during the assessment period.

AssessmentForm-Express addresses these gaps by providing a structured, guided assessment experience with reliable data collection, deduplication, edit windows, and consolidated analytics for decision makers.

---

## 3. Product Vision

> *Enable every team in the enterprise to efficiently express their Developer Platform needs so that System Owners can make confident, data-driven tool adoption decisions.*

**Strategic Goals:**

- Deliver a frictionless, multi-step SPA assessment experience tailored to four distinct enterprise team types
- Capture nuanced team preferences using varied question formats (Likert, Ranking, Choice, Free text)
- Ensure data integrity through email-based identity, auto-save, deduplication, and a configurable edit window
- Provide System Owners with actionable analytics — aggregated charts, filtered views, and individual response drill-down
- Keep scope lean for v1: three fixed DP tools (Backstage, Red Hat Developer Hub, Harness IDP), email/name identity (no SSO), web SPA only

---

## 4. Technical Architecture

| Layer | Technology |
|---|---|
| Frontend | React / Next.js (SPA) |
| Backend API | Node.js REST API (or Next.js API routes) |
| Database | Persistent relational or document store (PostgreSQL or MongoDB) |
| Auth | Email + name identity (no SSO in v1) |
| Hosting | Internal enterprise deployment |
| State Management | Client-side session + server-side auto-save |
| Analytics | Server-side aggregation, rendered via charting library (e.g., Recharts, Chart.js) |

**Key Architecture Decisions:**

- **SPA architecture** — Single-page experience reduces navigation friction across multi-step form sections
- **Email/name identity (not SSO)** — Simpler onboarding; no SSO dependency for enterprise rollout in v1
- **Role-based UI separation** — Respondents see the assessment form; System Owners see the dashboard; no complex RBAC needed
- **Fixed DP tools in v1** — Scoped to Backstage, Red Hat Developer Hub, and Harness IDP to keep the assessment focused

---

## 5. Feature Requirements

### F0: Multi-Step Assessment Workflow
**Description:** The core SPA workflow presents the assessment as a series of sequential, navigable sections. Respondents move forward and backward through sections without full page reloads. Progress is visually indicated so respondents know where they are in the assessment at all times.

**Capabilities:**
- Section-by-section navigation with previous/next controls
- Visual progress indicator (e.g., step bar or breadcrumbs) showing current section and total sections
- Maximum 7–8 sections per assessment; 5–6 questions per section
- Smooth client-side transitions between sections (no full page reloads)
- Summary/review step before final submission

**Priority:** P0 (Critical — MVP core)

---

### F1: Respondent Identity & Session Management
**Description:** Respondents identify themselves via email address and name at the start of the assessment. This identity is used to associate saved progress, prevent duplicate submissions, and allow re-entry for edits before the due date. No SSO or password is required in v1.

**Capabilities:**
- Email + name capture on the assessment landing/start page
- Identity stored server-side and used as the session key
- Session persistence so respondents can close the browser and resume later
- Clear confirmation when a returning respondent is recognized and their progress is loaded

**Priority:** P0 (Critical — MVP core; required for auto-save and deduplication)

---

### F2: Question Types Engine
**Description:** The assessment supports five question types to capture nuanced team preferences. Each section can mix question types as needed by the assessment design. An "Other" free-text option is available where applicable for choice-based questions.

**Capabilities:**
- **Single-choice:** Radio button selection from a list of options
- **Multi-choice:** Checkbox selection from a list of options (with optional "Other" free-text field)
- **Likert scale:** 5-point scale (e.g., Strongly Disagree → Strongly Agree) for sentiment/agreement questions
- **Ranking:** Drag-and-drop or numbered ordering of a list of items by priority
- **Free text (short):** Single-line text input for brief answers
- **Free text (long):** Multi-line textarea for open-ended responses
- "Other" option appended to any choice-based question, revealing a free-text input when selected

**Priority:** P0 (Critical — MVP core)

---

### F3: Team-Type-Specific Section Routing
**Description:** Based on the team type selected by the respondent at the start of the assessment, the system presents the relevant set of sections. Mandatory sections are always shown; optional sections are shown or skipped based on team type relevance.

**Capabilities:**
- Team type selection at the start of assessment: Program/Project, Platform Engineering, Infrastructure/Cloud, Data/API Governance
- **Mandatory sections (all team types):**
  - General DP Alignment
  - Current Status
  - Feedback & Adaptability
- **Optional sections:** Up to 4–5 additional sections, surfaced or skipped based on the selected team type
- Section routing logic is configuration-driven (not hardcoded) to allow future team type additions
- Respondents see only the sections relevant to their team type — no empty or irrelevant sections displayed

**Priority:** P0 (Critical — MVP core)

---

### F4: Auto-Save & Progress Persistence
**Description:** As respondents answer questions, their responses are automatically saved to the backend. This ensures no data is lost if the browser is closed, the session times out, or the respondent needs to return later. Auto-save is tied to the respondent's email identity.

**Capabilities:**
- Responses saved automatically on section navigation (next/previous) and periodically during active answering
- Save state indicator (e.g., "Saved" / "Saving…" / "Unsaved changes") visible to respondents
- On return visit, previously saved answers are pre-populated in the form
- Partial submissions retained in a draft state; only a deliberate "Submit" action finalizes the submission

**Priority:** P0 (Critical — MVP core)

---

### F5: Duplicate Submission Prevention & Edit Window
**Description:** Each respondent email address is limited to one submission. The system prevents duplicate entries and allows respondents to update their responses until a configurable due date. After the due date, responses are locked and no further edits are accepted.

**Capabilities:**
- One submission allowed per email address; system rejects or warns on duplicate submission attempts
- If a respondent has already submitted, returning to the form pre-populates their answers in editable mode (if within the edit window)
- Configurable due date stored in system settings (default: ~2 weeks from assessment launch)
- After due date, the form transitions to a read-only view for the respondent with a clear "Assessment closed" message
- System Owners can view and configure the due date from the dashboard

**Priority:** P0 (Critical — MVP core)

---

### F6: System Owner Dashboard
**Description:** System Owners have a dedicated dashboard view that provides access to all submissions, filtering and search capabilities, and visual analytics. This is the primary tool for System Owners to analyze assessment results and inform DP tool adoption decisions.

**Capabilities:**
- Secure dashboard route accessible only to System Owner role
- **Response list view:** Table of all submissions with respondent name, email, team type, submission date, and completion status
- **Search & filter:** Filter responses by team type, submission date range, and completion status; search by name or email
- **Individual response view:** Drill-down into any single respondent's full answers
- **Analytics charts:** Aggregated visualizations including:
  - Response counts by team type
  - Likert scale distribution per question
  - Top-ranked items per ranking question
  - Choice question breakdown (pie/bar charts)
- **Export:** CSV export of all responses for offline analysis

**Priority:** P0 (Critical — MVP core)

---

### F7: Role-Based Access Control
**Description:** The system supports two roles: Respondent and System Owner. Respondents access only the assessment form and their own responses. System Owners access the dashboard with full analytics. Access is determined at login by email identity — System Owner emails are pre-configured in the system.

**Capabilities:**
- Two roles: Respondent and System Owner
- System Owner accounts identified by pre-configured email list (admin configuration)
- Respondents cannot access the dashboard or other respondents' data
- System Owners can access the dashboard and all response data, but cannot submit an assessment as a respondent (or can do so from a separate respondent context)
- No complex RBAC or permission hierarchy needed in v1

**Priority:** P0 (Critical — MVP core)

---

### F8: Assessment Configuration Management
**Description:** System Owners can configure key assessment parameters without a code deploy. This includes the due date, and potentially the set of DP tools being evaluated. Configuration is managed from the System Owner dashboard.

**Capabilities:**
- Configure and update the assessment due date from the dashboard
- View current assessment status (active, closed, upcoming)
- Ability to re-open a closed assessment for a new collection window (future iterations)
- Configuration changes take effect immediately for all respondents

**Priority:** P1 (High — needed before launch)

---

### F9: Submission Confirmation & Respondent Feedback
**Description:** After a respondent submits the assessment, they receive clear confirmation of their submission. If they return before the due date, the system clearly communicates that they can still edit their responses.

**Capabilities:**
- Post-submission confirmation page/message: "Your assessment has been submitted. You can return to edit your responses until [Due Date]."
- Email confirmation of submission (optional for v1; low-cost addition if email infrastructure exists)
- On re-entry before due date: banner indicating "You've already submitted. You can update your answers until [Due Date]."
- On re-entry after due date: read-only view with "Assessment closed" message

**Priority:** P1 (High — important for respondent trust and clarity)

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Form sections load within 1 second on standard enterprise network conditions |
| Auto-save latency | Auto-save completes within 3 seconds of triggering (section navigation or idle timeout) |
| Availability | Targeting 99.5% uptime during the active assessment window (~2 weeks) |
| Data integrity | No response data lost due to browser closure, network interruption, or session timeout |
| Security | Dashboard accessible only to System Owner role; respondents cannot access others' data |
| Scalability | Support up to 500 concurrent respondents without degradation (enterprise internal scale) |
| Browser support | Modern browsers: Chrome, Firefox, Safari, Edge (latest 2 major versions) |
| Accessibility | WCAG 2.1 AA compliance for form elements and navigation |
| Data privacy | Responses stored with email/name; System Owners see all responses; no external data sharing |
| Auditability | Submission timestamps and edit history (last-modified) stored per response |

---

## 7. Success Metrics

- **Completion rate:** ≥ 80% of respondents who start the assessment complete and submit it
- **Auto-save reliability:** 0 reported cases of lost progress due to system error during the 2-week window
- **Duplicate prevention:** 0 duplicate submissions per respondent email in the final dataset
- **Dashboard adoption:** System Owners access the dashboard at least 3 times during the assessment window to monitor progress
- **Time-to-complete:** Average assessment completion time under 20 minutes per respondent
- **Data quality:** ≥ 90% of submitted responses have all mandatory section questions answered
- **Team type coverage:** All 4 team types represented in the final response dataset

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low respondent participation | Medium | High | Keep assessment short (max 7–8 sections, 5–6 questions each); mandatory sections minimal; send clear communication with due date |
| Auto-save failures causing data loss | Low | High | Implement server-side persistence on every section transition; show save state indicator; test under network degradation |
| Ranking question UX friction | Medium | Medium | Provide both drag-and-drop and numbered input fallback for ranking questions; test with representative users before launch |
| System Owner misconfigures due date | Low | Medium | Require confirmation before saving due date changes; display current due date prominently on dashboard |
| Email identity spoofing / duplicate abuse | Low | Medium | Duplicate prevention is by email; communicate acceptable use policy; System Owner can audit suspicious entries via dashboard |
| Scope creep on question types | Medium | Medium | Freeze question type spec at F2 definition; any additions require explicit scope change approval |
| Browser compatibility issues with Ranking drag-and-drop | Low | Low | Implement numbered fallback; test on all target browsers before launch |

---

## 9. Feature Index

| ID | Feature | Priority | Scope |
|---|---|---|---|
| F0 | Multi-Step Assessment Workflow | P0 | MVP |
| F1 | Respondent Identity & Session Management | P0 | MVP |
| F2 | Question Types Engine | P0 | MVP |
| F3 | Team-Type-Specific Section Routing | P0 | MVP |
| F4 | Auto-Save & Progress Persistence | P0 | MVP |
| F5 | Duplicate Submission Prevention & Edit Window | P0 | MVP |
| F6 | System Owner Dashboard | P0 | MVP |
| F7 | Role-Based Access Control | P0 | MVP |
| F8 | Assessment Configuration Management | P1 | Pre-launch |
| F9 | Submission Confirmation & Respondent Feedback | P1 | Pre-launch |

**Priority Legend:**
- **P0** — Critical; must be present for the product to function at all
- **P1** — High; needed before launch for a complete user experience
- **P2** — Medium; valuable but deferrable to a follow-on iteration
- **P3** — Low; nice-to-have; explicitly out of scope for v1

---

## 10. Out of Scope (v1)

- Mobile native app — web SPA is sufficient for enterprise internal tools
- Real-time collaboration or multi-user simultaneous editing
- External SSO / OAuth — email/name identity is sufficient for v1
- Payment or billing — internal enterprise tool
- AI/ML response analysis — deferred; basic analytics charts cover v1 needs
- Additional DP tools beyond Backstage, Red Hat Developer Hub, and Harness IDP
- Email notifications to respondents (submission confirmation email is optional stretch goal)

---

*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
