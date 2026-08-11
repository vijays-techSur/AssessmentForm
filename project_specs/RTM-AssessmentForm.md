# Requirements Traceability Matrix: AssessmentForm-Express
**Project:** AssessmentForm  
**Version:** 1.0  
**Date:** 2026-07-20  
**Status:** Draft  
**Based on:** PRD-AssessmentForm.md v1.0 · FRD-AssessmentForm.md v1.0 · TechArch-AssessmentForm.md v1.0 · UserStories-AssessmentForm.md v1.0

---

## 1. Overview

This Requirements Traceability Matrix (RTM) provides bidirectional traceability between all AssessmentForm-Express specification documents. It ensures that every business requirement defined in the Product Requirements Document (PRD) is implemented through a functional specification in the Functional Requirements Document (FRD), grounded in a technical decision in the Technical Architecture (TechArch), exercised by at least one User Story, and verifiable through concrete test cases.

The RTM spans ten product features (F0–F9) covering the full scope of the AssessmentForm-Express v1 MVP: from the multi-step SPA workflow and question engine, through auto-save and deduplication, to the System Owner dashboard and configuration management. Two additional cross-cutting concerns — security/data protection and external integrations — are traced separately.

Traceability is bidirectional: the main matrix reads forward from PRD feature to test case, and the reverse traceability section reads backward from test case to PRD. This structure ensures no requirement is orphaned, no user story is unanchored, and no test case exists without a traceable business rationale.

All IDs used in this document are extracted directly from the source specification documents. PRD feature IDs follow the `F{n}` prefix; FRD functional requirement chunks follow the `F{nn}` chunk notation (zero-padded); TechArch specifications are referenced by their component/section identifiers; User Story IDs follow the `US-{epic}.{story}` convention; and test case IDs follow the `TEST-{feature}-{nn}` convention defined in this document.

---

## 2. Requirements Summary

### 2.1 PRD Features (Source of Truth)

| Feature ID | Feature Name | Priority | Scope | Story Count |
|------------|--------------|----------|-------|-------------|
| F0 | Multi-Step Assessment Workflow | P0 | MVP | 5 |
| F1 | Respondent Identity & Session Management | P0 | MVP | 3 |
| F2 | Question Types Engine | P0 | MVP | 5 |
| F3 | Team-Type-Specific Section Routing | P0 | MVP | 4 |
| F4 | Auto-Save & Progress Persistence | P0 | MVP | 3 |
| F5 | Duplicate Submission Prevention & Edit Window | P0 | MVP | 4 |
| F6 | System Owner Dashboard | P0 | MVP | 5 |
| F7 | Role-Based Access Control | P0 | MVP | 4 |
| F8 | Assessment Configuration Management | P1 | Pre-launch | 3 |
| F9 | Submission Confirmation & Respondent Feedback | P1 | Pre-launch | 3 |

**Total:** 10 features · 39 user stories · 8 P0 features · 2 P1 features

### 2.2 Non-Functional Requirements

- **Performance:** Section loads ≤ 1 second; auto-save completes within 3 seconds
- **Availability:** 99.5% uptime during the active 2-week assessment window
- **Scalability:** 500 concurrent respondents without degradation
- **Browser Support:** Chrome, Firefox, Safari, Edge (latest 2 major versions)
- **Accessibility:** WCAG 2.1 AA for all form elements and navigation
- **Security:** Dashboard requires a valid dashboard JWT (any authenticated user); data isolation enforced per respondent
- **Data Privacy:** Respondent email/name stored; no external data sharing
- **Auditability:** Submission timestamps and last-modified per response stored
- **Data Integrity:** No response data lost due to browser closure, network interruption, or session timeout

### 2.3 FRD Functional Requirement Chunks

| FRD Chunk | Description | PRD Feature |
|-----------|-------------|-------------|
| F00 | Multi-Step Assessment Workflow | F0 |
| F01 | Respondent Identity & Session Management | F1 |
| F02 | Question Types Engine | F2 |
| F03 | Team-Type-Specific Section Routing | F3 |
| F04 | Auto-Save & Progress Persistence | F4 |
| F05 | Duplicate Submission Prevention & Edit Window | F5 |
| F06 | System Owner Dashboard | F6 |
| F07 | Role-Based Access Control | F7 |
| F08 | Assessment Configuration Management | F8 |
| F09 | Submission Confirmation & Respondent Feedback | F9 |
| Y0 | Database Schema (DDL) | All |
| Y1 | REST API Endpoint Catalog | All |
| Y2 | Cross-Feature Error Catalog | All |
| Y3 | External Integration Points | INT-01 – INT-04 |

### 2.4 TechArch Specification Areas

| Spec Area | TechArch Section | Covers |
|-----------|-----------------|--------|
| SPEC-ARCH | §1 Architectural Overview | Layered monolith, Next.js App Router, SPA pattern |
| SPEC-COMP | §2 Component Architecture | Frontend components, backend modules, services, middleware |
| SPEC-DATA | §3 Data Model | DDL, ER diagram, answer payload shapes, seed data |
| SPEC-API | §4 API Design | API conventions, TypeScript interfaces, endpoint reference |
| SPEC-SEC | §5 Security Architecture | JWT auth, authorization matrix, data protection, due date enforcement |
| SPEC-STACK | §6 Technology Stack | React, Next.js, PostgreSQL, Drizzle ORM, Recharts, dnd-kit, Zod |
| SPEC-INT | §7 Integration Points | Email relay, deployment infrastructure, SSO/AI non-integrations |

---

## 3. Primary Traceability Matrix

This table provides forward traceability: PRD Feature → FRD Chunk → TechArch Spec → User Stories → Test Cases.

| PRD Feature | FRD Chunk | TechArch Spec | User Stories | Test Cases |
|-------------|-----------|---------------|--------------|------------|
| F0: Multi-Step Workflow | F00 | SPEC-COMP (AssessmentWizard, ProgressBar, SectionScreen, ReviewStep), SPEC-API §4.3 | US-0.1, US-0.2, US-0.3, US-0.4, US-0.5 | TEST-F0-01 through TEST-F0-10 |
| F1: Identity & Session Mgmt | F01 | SPEC-COMP (IdentityForm, useSession, ResumeBanner), SPEC-DATA (respondents, sessions), SPEC-API (POST /api/sessions, GET /api/sessions/:id) | US-1.1, US-1.2, US-1.3 | TEST-F1-01 through TEST-F1-08 |
| F2: Question Types Engine | F02 | SPEC-COMP (QuestionRouter, all question renderers, OtherTextReveal), SPEC-DATA (questions, question_options, responses), SPEC-API (GET /api/sections/:id/questions) | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5 | TEST-F2-01 through TEST-F2-14 |
| F3: Section Routing | F03 | SPEC-COMP (useSectionList, sectionRoutingService), SPEC-DATA (sections, section_routing), SPEC-API (GET /api/sections?teamType) | US-3.1, US-3.2, US-3.3, US-3.4 | TEST-F3-01 through TEST-F3-08 |
| F4: Auto-Save & Persistence | F04 | SPEC-COMP (useAutoSave, SaveStateIndicator), SPEC-DATA (responses, sessions.last_saved_at), SPEC-API (PUT /api/responses/:sessionId) | US-4.1, US-4.2, US-4.3 | TEST-F4-01 through TEST-F4-07 |
| F5: Duplicate Prevention & Edit Window | F05 | SPEC-COMP (submissionService, assessmentOpenGuard middleware), SPEC-DATA (sessions.submission_status, assessment_config.due_date), SPEC-API (POST /api/submissions/:sessionId) | US-5.1, US-5.2, US-5.3, US-5.4, US-0.5 | TEST-F5-01 through TEST-F5-08 |
| F6: System Owner Dashboard | F06 | SPEC-COMP (ResponseTable, FilterPanel, SearchBar, AnalyticsPanel, charts/, ConfigPanel), SPEC-DATA (all tables read), SPEC-API (GET /api/dashboard/*) | US-6.1, US-6.2, US-6.3, US-6.4, US-6.5 | TEST-F6-01 through TEST-F6-12 |
| F7: Role-Based Access Control | F07 | SPEC-SEC (§5.1 Auth, §5.2 Authorization Matrix), SPEC-COMP (authService, jwtMiddleware, requireSystemOwner, AuthGuard), SPEC-API (POST /api/auth/login) | US-7.1, US-7.2, US-7.3, US-7.4 | TEST-F7-01 through TEST-F7-10 |
| F8: Configuration Management | F08 | SPEC-COMP (configService, ConfigPanel, GET/PATCH /api/config), SPEC-DATA (assessment_config, config_audit_log) | US-8.1, US-8.2, US-8.3 | TEST-F8-01 through TEST-F8-06 |
| F9: Submission Confirmation | F09 | SPEC-COMP (SubmissionConfirmation), SPEC-INT §7.2 (email relay), SPEC-API (POST /api/notifications/email stretch) | US-9.1, US-9.2, US-9.3 | TEST-F9-01 through TEST-F9-06 |

---

## 4. Requirements Detail

### F0: Multi-Step Assessment Workflow

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Section-by-section navigation with Previous/Next controls
  - FRD: Navigation via `direction` enum (`next` | `previous` | `jump`); Previous never triggers validation; Next triggers in-section validation then auto-save (F04)
  - TechArch: `AssessmentWizard.tsx` (wizard container), `SectionScreen.tsx` (section render), client-side state management (no dedicated navigation API call)
- Visual progress indicator always visible
  - FRD: Step Bar reflects `current_section_index` out of total section count; section completion status per item
  - TechArch: `ProgressBar.tsx` component; ARIA labels required for screen reader accessibility (WCAG 2.1 AA)
- Maximum 7–8 sections, 5–6 questions per section
  - FRD: Hard cap enforced server-side; section count 3–8; questions 1–6 per section
  - TechArch: Enforced at `sectionRoutingService.ts` and `SECTION_LIMIT_EXCEEDED` error guard
- Smooth SPA transitions (no full page reload)
  - FRD: SPA Transition = client-side React state / router; no HTTP page reload on navigation
  - TechArch: Next.js App Router client-side navigation; React component state
- Pre-submission Review Step
  - FRD: Read-only summary of all sections/answers; Edit link per section; Submit button only on Review Step
  - TechArch: `ReviewStep.tsx` component
- Back navigation from Review to any section
  - FRD: Jump action from Review Step; no validation on jump
  - TechArch: `direction: "jump"` with `target_section_index` parameter
- Keyboard accessibility
  - FRD: Keyboard focus managed correctly on section transition; WCAG 2.1 AA
  - TechArch: Tailwind CSS WCAG 2.1 AA primitives; dnd-kit keyboard support for ranking
- Direct section jump for returning editors
  - FRD: Progress indicator items clickable only when `submission_status === "submitted"` AND `is_closed === false`
  - TechArch: Conditional rendering in `ProgressBar.tsx` based on session state

**Key Error Codes:** `REQUIRED_QUESTION_UNANSWERED`, `SECTION_LIST_EMPTY`, `SECTION_INDEX_OOB`, `ASSESSMENT_CLOSED`

---

### F1: Respondent Identity & Session Management

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Email + name capture on start page
  - FRD: `email` (RFC 5322, max 254 chars), `name` (min 2 chars, max 200 chars), `team_type` (enum); all required
  - TechArch: `IdentityForm.tsx`, `validators.ts` (client-side), Zod schema (server-side)
- Identity stored server-side as session key
  - FRD: `POST /api/sessions` creates `respondents` + `sessions` records; email is the upsert key
  - TechArch: `sessionService.ts`; `respondents` table with `LOWER(email)` unique index; `sessions` table
- Session persistence across browser close/reopen
  - FRD: `session_id` (UUID) stored in browser `localStorage`; Respondent JWT expiry 24 hours
  - TechArch: `useSession.ts` hook; `localStorage` read on page load; JWT signed with `JWT_SECRET` (HS256)
- Returning respondent detection and progress reload
  - FRD: Server returns `is_returning: true`, `current_section_index`, `saved_responses`
  - TechArch: `sessionService.ts` upsert logic; `ResumeBanner.tsx` component
- Team type selection on start page
  - FRD: `team_type` captured at identity step; locked after first session creation
  - TechArch: Dropdown in `IdentityForm.tsx`; server ignores `team_type` for existing sessions

**Key API Endpoints:** `POST /api/sessions`, `GET /api/sessions/:sessionId`  
**Key Error Codes:** `INVALID_EMAIL_FORMAT`, `INVALID_NAME`, `INVALID_TEAM_TYPE`, `SYSTEM_OWNER_CANNOT_RESPOND`, `SESSION_NOT_FOUND`, `SESSION_CREATE_FAILED`

---

### F2: Question Types Engine

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Single-choice (radio button)
  - FRD: Renders radio buttons; answer payload `{ type: "single_choice", value: "option_id" }`; required = exactly one selected
  - TechArch: `SingleChoiceQuestion.tsx`; `QuestionRouter.tsx`; Zod validation on `answer_payload`
- Multi-choice (checkbox)
  - FRD: Renders checkboxes; answer payload `{ type: "multi_choice", values: [...] }`; required = at least one checked
  - TechArch: `MultiChoiceQuestion.tsx`
- Likert scale (5-point)
  - FRD: 5 radio buttons labeled 1–5 with endpoint labels; value stored as integer 1–5; rejected outside [1,5] server-side
  - TechArch: `LikertQuestion.tsx`; keyboard-navigable with arrow keys (WCAG 2.1 AA)
- Ranking (drag-and-drop + numbered fallback)
  - FRD: Primary = drag-and-drop reorder; fallback = numbered inputs; all items must have unique position; payload `{ type: "ranking", order: [...] }`
  - TechArch: `RankingQuestion.tsx`; dnd-kit library (accessible, keyboard-navigable); tested on all 4 target browsers
- Free text short (single-line, ≤500 chars)
  - FRD: `<input type="text">`; character counter; limit enforced client-side and server-side
  - TechArch: `FreeTextShortQuestion.tsx`; `FREE_TEXT_TOO_LONG` error at server
- Free text long (textarea, ≤2000 chars)
  - FRD: `<textarea>` with resize handle; character counter; limit enforced client-side and server-side
  - TechArch: `FreeTextLongQuestion.tsx`
- "Other" option with conditional free-text reveal
  - FRD: Applicable to `single_choice` and `multi_choice` only; `other_text` required when "Other" selected; `aria-expanded` toggled; value cleared on deselect
  - TechArch: `OtherTextReveal.tsx` shared component

**Key API Endpoints:** `GET /api/sections/:sectionId/questions`, `PUT /api/responses/:sessionId`  
**Key Error Codes:** `OTHER_TEXT_REQUIRED`, `INVALID_LIKERT_VALUE`, `RANKING_INCOMPLETE`, `RANKING_DUPLICATE_POSITION`, `FREE_TEXT_TOO_LONG`, `UNKNOWN_QUESTION_TYPE`

---

### F3: Team-Type-Specific Section Routing

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Team type selection at assessment start
  - FRD: Four valid values: `program_project`, `platform_engineering`, `infrastructure_cloud`, `data_api_governance`; locked after session creation
  - TechArch: Captured in `IdentityForm.tsx`; stored in `respondents.team_type`
- Mandatory sections always included (all team types)
  - FRD: `general_dp_alignment` (pos 1), `current_status` (pos 2), `feedback_adaptability` (always last); auto-inserted if missing from config
  - TechArch: `sectionRoutingService.ts` enforces mandatory section inclusion and ordering
- Optional sections based on routing configuration
  - FRD: Configuration-driven `section_routing` table; not hardcoded; 5 optional sections defined in v1
  - TechArch: `section_routing` table with `UNIQUE(team_type, section_id)`; `sectionRoutingService.ts`

**v1 Section Roster:**

| Section ID | Title | Type |
|------------|-------|------|
| `general_dp_alignment` | General DP Alignment | Mandatory |
| `current_status` | Current Status | Mandatory |
| `feedback_adaptability` | Feedback & Adaptability | Mandatory |
| `platform_needs` | Platform Needs & Capability Requirements | Optional |
| `tool_evaluation` | Tool Evaluation Criteria | Optional |
| `integration_requirements` | Integration & Ecosystem Requirements | Optional |
| `adoption_readiness` | Adoption Readiness & Constraints | Optional |
| `governance_compliance` | Governance & Compliance Requirements | Optional |

**v1 Team-Type Routing:**

| Team Type | Total Sections | Sections (in order) |
|-----------|---------------|---------------------|
| Program/Project | 5 | general_dp_alignment → current_status → platform_needs → tool_evaluation → feedback_adaptability |
| Platform Engineering | 7 | general_dp_alignment → current_status → platform_needs → tool_evaluation → integration_requirements → adoption_readiness → feedback_adaptability |
| Infrastructure/Cloud | 6 | general_dp_alignment → current_status → integration_requirements → adoption_readiness → tool_evaluation → feedback_adaptability |
| Data/API Governance | 6 | general_dp_alignment → current_status → governance_compliance → platform_needs → integration_requirements → feedback_adaptability |

**Key API Endpoints:** `GET /api/sections?teamType={teamType}`  
**Key Error Codes:** `INVALID_TEAM_TYPE`, `SECTION_ROUTING_EMPTY`, `MANDATORY_SECTION_AUTO_INSERTED`, `SECTION_LIMIT_EXCEEDED`

---

### F4: Auto-Save & Progress Persistence

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Auto-save on section navigation (Next/Previous)
  - FRD: `PUT /api/responses/:sessionId` called on every Next/Previous; upserts `(session_id, question_id)` in `responses` table; updates `sessions.last_saved_at`
  - TechArch: `useAutoSave.ts` hook; `responseService.ts`; Save State Indicator transitions: `Unsaved → Saving… → Saved at {time}`
- Periodic auto-save on idle timeout (30s, configurable via `AUTO_SAVE_IDLE_SECONDS`)
  - FRD: Dirty-state tracking; fires after 30 seconds of inactivity when `isDirty = true`; idle timer resets on any user interaction
  - TechArch: `useAutoSave.ts` timer logic; `AUTO_SAVE_IDLE_SECONDS` env var (no dashboard control)
- Save State Indicator always visible
  - FRD: Three states: `Saved`, `Saving…`, `Unsaved changes`; shown with timestamp on success
  - TechArch: `SaveStateIndicator.tsx`
- Pre-population of saved answers on resume
  - FRD: `GET /api/sessions/:sessionId` returns `saved_responses`; client matches to `question_id` and pre-populates
  - TechArch: `useSession.ts` + individual question renderer pre-population; completes before first section renders
- Retry behavior on save failure
  - FRD: 3 retries with exponential backoff (1s, 2s, 4s); navigation not blocked by save failure
  - TechArch: `useAutoSave.ts` retry logic; `SAVE_FAILED`, `NETWORK_TIMEOUT` error codes

**Key API Endpoints:** `PUT /api/responses/:sessionId`  
**Key Error Codes:** `SESSION_NOT_FOUND`, `ASSESSMENT_CLOSED`, `SAVE_FAILED`, `NETWORK_TIMEOUT`, `INVALID_ANSWER_PAYLOAD`

---

### F5: Duplicate Submission Prevention & Edit Window

**PRD Capabilities → FRD Sub-features → TechArch Components**

- One submission per email address
  - FRD: `UNIQUE(email)` on `respondents` table; upsert behavior on `POST /api/sessions`; no second session record per email
  - TechArch: DB constraint `idx_respondents_email_lower`; `sessionService.ts` upsert
- Deliberate Submit action (draft → submitted transition)
  - FRD: `POST /api/submissions/:sessionId`; checks all mandatory questions answered; sets `submission_status = submitted`, `submitted_at = NOW()`
  - TechArch: `submissionService.ts`; Submit button only on `ReviewStep.tsx`
- Edit window: edits permitted before due date
  - FRD: Returning submitted respondent sees editable form + re-entry banner if `is_closed === false`; auto-save is sufficient (re-submit is optional re-confirmation only)
  - TechArch: `GET /api/sessions/:sessionId` returns `is_closed: boolean`; `assessmentOpenGuard` middleware
- Post-due-date read-only mode
  - FRD: If `is_closed === true`, all sections render read-only; `PUT /api/responses/:sessionId` rejected with 403 `ASSESSMENT_CLOSED`; enforcement server-side only
  - TechArch: `assessmentOpenGuard` middleware; `SectionScreen.tsx` read-only mode
- Direct section jump for returning editors
  - FRD: Progress indicator items clickable when `submission_status === "submitted"` AND `is_closed === false`
  - TechArch: Conditional state in `ProgressBar.tsx`; `direction: "jump"` navigation

**Key API Endpoints:** `POST /api/submissions/:sessionId`, `GET /api/sessions/:sessionId`  
**Key Error Codes:** `ASSESSMENT_CLOSED`, `MANDATORY_QUESTIONS_INCOMPLETE`, `SYSTEM_OWNER_CANNOT_SUBMIT`, `SUBMISSION_FAILED`

---

### F6: System Owner Dashboard

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Secure dashboard route (System Owner role only)
  - FRD: Server verifies `role === "system_owner"` on every `/api/dashboard/**` call; 403 `ACCESS_DENIED` for Respondents
  - TechArch: `requireSystemOwner` middleware; `AuthGuard.tsx` client-side route guard
- Response list view (paginated, sortable)
  - FRD: 25 rows/page (max 100); columns: Name, Email, Team Type, Status, Submitted At, Last Modified At; sortable by Name, Email, Team Type, Status, Submitted At
  - TechArch: `ResponseTable.tsx`; `GET /api/dashboard/responses` with pagination params
- Search & filter
  - FRD: Free-text search (name or email, case-insensitive partial match); team type multi-select; date range pickers; status filter; combinable; URL query parameter sync
  - TechArch: `FilterPanel.tsx`, `SearchBar.tsx`, `useDashboardFilters.ts`
- Individual response drill-down
  - FRD: `/dashboard/responses/:sessionId`; read-only render of all sections/answers using same question-type widgets
  - TechArch: `ResponseDetailView.tsx`; `GET /api/dashboard/responses/:sessionId`
- Analytics charts
  - FRD: Response counts by team type (bar chart); Likert distribution per question (stacked bar); top-ranked items per ranking question; choice breakdown (pie/bar); filter-responsive; empty state handled; `GET /api/dashboard/analytics`
  - TechArch: `AnalyticsPanel.tsx`; `TeamTypeBarChart.tsx`, `LikertDistributionChart.tsx`, `RankingTopItemsChart.tsx`, `ChoiceBreakdownChart.tsx`; Recharts library; `analyticsService.ts`
- CSV export
  - FRD: Streaming CSV via `GET /api/dashboard/export/csv`; respects active filters; columns: respondent metadata + one column per question; filename `assessment-responses-{date}.csv`
  - TechArch: `csvExportService.ts`; csv-stringify library (streaming); `Content-Disposition: attachment`
- Dashboard auto-refresh
  - FRD: Summary counts (total/submitted/draft) poll every 60 seconds; individual response rows do not auto-refresh
  - TechArch: Client-side polling interval in dashboard page component

**Key API Endpoints:** `GET /api/dashboard/responses`, `GET /api/dashboard/responses/:sessionId`, `GET /api/dashboard/analytics`, `GET /api/dashboard/export/csv`  
**Key Error Codes:** `ACCESS_DENIED`, `INVALID_DATE_RANGE`, `RESPONSE_NOT_FOUND`, `ANALYTICS_ERROR`, `EXPORT_FAILED`

---

### F7: Role-Based Access Control

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Two roles: Respondent and Dashboard User (System Owner)
  - FRD: Role determined by which login endpoint is used — `POST /api/auth/login` issues `role: "system_owner"` to any valid email; `POST /api/sessions` issues `role: "respondent"`
  - TechArch: `authService.ts`; JWT payload `{ session_id, email, role, iat, exp }`; HS256 signed with `JWT_SECRET`
- Dashboard login flow (separate from respondent flow)
  - FRD: `POST /api/auth/login` (no team_type; no respondent session created); any valid email accepted; dashboard JWT expires in 8 hours
  - TechArch: `/api/auth/login/route.ts`; `authService.ts`
- Respondent login flow
  - FRD: `POST /api/sessions` (with team_type); Respondent JWT expires in 24 hours
  - TechArch: `/api/sessions/route.ts`
- Server-side role enforcement
  - FRD: `jwtMiddleware` verifies signature and expiry on all protected routes; `requireSystemOwner` rejects Respondent JWTs on dashboard routes; `requireSessionOwner` prevents cross-session data access
  - TechArch: Middleware stack: `jwtMiddleware`, `requireSystemOwner`, `requireSessionOwner`, `assessmentOpenGuard`, `requestLogger`
- Respondent data isolation
  - FRD: `/api/sessions/:id`, `/api/responses/:id`, `/api/submissions/:id` verify that `session_id` belongs to authenticated email; 403 `SESSION_ACCESS_DENIED` on mismatch
  - TechArch: `requireSessionOwner` middleware

**Key API Endpoints:** `POST /api/auth/login`, `POST /api/sessions`  
**Key Error Codes:** `AUTH_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `ACCESS_DENIED`, `SESSION_ACCESS_DENIED`, `SYSTEM_OWNER_CANNOT_RESPOND`, `SYSTEM_OWNER_CANNOT_SUBMIT`

---

### F8: Assessment Configuration Management

**PRD Capabilities → FRD Sub-features → TechArch Components**

- View current assessment configuration
  - FRD: `GET /api/config` returns `{ due_date, launch_date, status, last_modified_at, last_modified_by }`; status computed dynamically from timestamps
  - TechArch: `ConfigPanel.tsx`; `configService.ts`; `assessment_config` singleton table (`CHECK (id = 1)`)
- Update assessment due date with confirmation step
  - FRD: `PATCH /api/config { due_date }`; confirmation dialog shows before commit; change takes effect immediately; writes `config_audit_log` entry
  - TechArch: `configService.ts`; `config_audit_log` table; date picker in `ConfigPanel.tsx`
- Immediate effect of configuration changes
  - FRD: Every `GET /api/sessions/:sessionId` includes `due_date` and `is_closed`; no caching; respondents see new deadline on next page action
  - TechArch: Server computes `is_closed` on every session load from live `assessment_config.due_date`

**Key API Endpoints:** `GET /api/config`, `PATCH /api/config`  
**Key Error Codes:** `CONFIG_NOT_FOUND`, `CONFIG_UPDATE_FAILED`, `INVALID_DATE_FORMAT`, `ACCESS_DENIED`

---

### F9: Submission Confirmation & Respondent Feedback

**PRD Capabilities → FRD Sub-features → TechArch Components**

- Post-submission confirmation screen
  - FRD: Rendered only after successful 200 from `POST /api/submissions/:sessionId`; displays name, "Assessment Submitted!", edit window notice with formatted due date; Return to Assessment button
  - TechArch: `SubmissionConfirmation.tsx`; client navigates to confirmation after 200 response
- Re-entry banner for returning submitted respondents (within edit window)
  - FRD: Persistent banner (not dismissible) on every section when `submission_status === "submitted"` AND `is_closed === false`; "You've already submitted. You can update your answers until {due_date}."
  - TechArch: Conditional banner rendered in `SectionScreen.tsx` or `AssessmentWizard.tsx` based on session state
- Read-only "Assessment closed" message after due date
  - FRD: Dismissible banner per section; message varies by `submission_status` (`submitted` vs `draft`); no Save/Submit/edit controls active; Previous/Next still functional for review
  - TechArch: `SectionScreen.tsx` read-only mode; `assessmentOpenGuard` rejects all save/submit API calls
- Optional email confirmation (v1 stretch)
  - FRD: `POST /api/notifications/email`; fire-and-forget; graceful no-op if `EMAIL_RELAY_URL` unset; failure logged server-side only
  - TechArch: `emailService.ts`; `EMAIL_RELAY_URL` env var; INT-01 integration

**Key API Endpoints:** `POST /api/submissions/:sessionId`, `POST /api/notifications/email` (stretch)  
**Key Error Codes:** `INVALID_CONFIRMATION_STATE`, `EMAIL_SEND_FAILED`

---

## 5. Test Case Coverage Matrix

This section defines the complete test case inventory for each feature and maps test cases to user stories and acceptance criteria.

### 5.1 F0: Multi-Step Assessment Workflow

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F0-01 | Next button advances to next section without page reload | SPA transition; no full-page reload | US-0.1 | Section index increments; URL does not reload |
| TEST-F0-02 | Previous button returns to prior section without validation | Previously entered answers preserved | US-0.1 | Section index decrements; answers intact |
| TEST-F0-03 | Previous button hidden on first section | Previous disabled/hidden on section 0 | US-0.1 | Button absent or disabled |
| TEST-F0-04 | Next button becomes Review on last section | Final section Next becomes Review | US-0.1 | Button label changes to "Review" |
| TEST-F0-05 | Progress indicator shows current section and total count | "Section N of M" visible; updates on transition | US-0.2 | Indicator updates correctly on each step |
| TEST-F0-06 | Completed sections visually distinguished | Completed sections have different visual state | US-0.2 | CSS class / visual state differs |
| TEST-F0-07 | Review Step shows all answers in read-only format | All sections and answers displayed; Edit link per section | US-0.3 | All answers rendered; no input controls editable |
| TEST-F0-08 | Edit link from Review returns to section in edit mode | Back from Review returns to that section | US-0.3 | Section renders in editable mode |
| TEST-F0-09 | Next on unanswered required question shows inline error | Navigation blocked; inline error shown | US-0.4 | Error message "Please answer all required questions before continuing." shown |
| TEST-F0-10 | Direct section jump available only in edit mode (submitted session) | Progress indicator clickable only when submitted + not closed | US-0.5 | Jump navigation active for submitted; inactive for new respondent |

---

### 5.2 F1: Respondent Identity & Session Management

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F1-01 | Invalid email format blocked client-side and server-side | RFC 5322 validation; error "Please enter a valid email address." | US-1.1 | 400 `INVALID_EMAIL_FORMAT`; inline error shown |
| TEST-F1-02 | Name with fewer than 2 non-whitespace characters rejected | Error: "Please enter your full name (at least 2 characters)." | US-1.1 | 400 `INVALID_NAME` |
| TEST-F1-03 | System Owner email blocked in respondent flow | Error: "This email is registered as a System Owner." | US-1.1 | 403 `SYSTEM_OWNER_CANNOT_RESPOND` |
| TEST-F1-04 | New respondent session created with correct defaults | New session: status=draft, section_index=0, empty saved_responses | US-1.1 | Session created; is_returning=false |
| TEST-F1-05 | Returning respondent detected and Resume Banner displayed | "Welcome back, {name}. Your progress has been loaded. You left off at section {N}." | US-1.2 | is_returning=true; Resume Banner shown |
| TEST-F1-06 | Returning respondent resumes at saved section index | Assessment opens at last saved section, not section 0 | US-1.2 | current_section_index matches saved value |
| TEST-F1-07 | Session persists in localStorage across browser close | session_id stored in localStorage; auto-resume on reload | US-1.3 | localStorage key set; session loaded on return |
| TEST-F1-08 | Duplicate session not created for same email (upsert) | No second session record per email | US-1.3 | POST /api/sessions returns existing session |

---

### 5.3 F2: Question Types Engine

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F2-01 | Single-choice renders radio buttons; only one selectable | One selection at a time | US-2.1 | Radio input; only one selected state |
| TEST-F2-02 | Required single-choice blocks Next when unanswered | Error: "This question requires an answer." | US-2.1 | `REQUIRED_QUESTION_UNANSWERED` shown |
| TEST-F2-03 | Multi-choice renders checkboxes; multiple selectable | Multiple checkboxes checked simultaneously | US-2.1 | Multiple selections preserved |
| TEST-F2-04 | Required multi-choice blocks Next when no option checked | At least one option required | US-2.1 | Validation error on Next |
| TEST-F2-05 | "Other" option reveals text input when selected | Text input revealed; aria-expanded=true | US-2.2 | Input visible; aria-expanded toggles |
| TEST-F2-06 | "Other" text required when "Other" selected | Error: "Please specify your 'Other' answer." | US-2.2 | `OTHER_TEXT_REQUIRED` shown |
| TEST-F2-07 | "Other" text cleared and hidden when "Other" deselected | Input hidden; value cleared | US-2.2 | Input not visible; other_text empty |
| TEST-F2-08 | Likert renders 5 radio buttons with endpoint labels | 5 options labeled 1–5 with descriptive endpoints | US-2.3 | 5 radio inputs with labels |
| TEST-F2-09 | Likert value outside [1,5] rejected server-side | 400 `INVALID_LIKERT_VALUE` | US-2.3 | Server rejects invalid payload |
| TEST-F2-10 | Ranking allows drag-and-drop reordering | Items reorderable via drag-and-drop | US-2.4 | Order changes reflect in answer payload |
| TEST-F2-11 | Ranking numbered fallback input works | Numbered input accepted as alternative | US-2.4 | Payload updated via number input |
| TEST-F2-12 | Ranking blocks Next when items not all ranked | Error: "Please assign a rank to all items." | US-2.4 | `RANKING_INCOMPLETE` shown |
| TEST-F2-13 | Free text short enforces 500-character limit | Character counter turns red; server rejects over limit | US-2.5 | `FREE_TEXT_TOO_LONG` at 501 chars |
| TEST-F2-14 | Free text long enforces 2000-character limit | Character counter turns red; server rejects over limit | US-2.5 | `FREE_TEXT_TOO_LONG` at 2001 chars |

---

### 5.4 F3: Team-Type-Specific Section Routing

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F3-01 | Program/Project team type returns 5 sections in correct order | general_dp_alignment → current_status → platform_needs → tool_evaluation → feedback_adaptability | US-3.1, US-3.3 | Section list matches routing table |
| TEST-F3-02 | Platform Engineering returns 7 sections in correct order | Includes platform_needs, tool_evaluation, integration_requirements, adoption_readiness | US-3.3 | 7 sections; order matches FRD |
| TEST-F3-03 | Infrastructure/Cloud returns 6 sections in correct order | Includes integration_requirements, adoption_readiness, tool_evaluation | US-3.1 | 6 sections; order matches FRD |
| TEST-F3-04 | Data/API Governance returns 6 sections in correct order | Includes governance_compliance, platform_needs, integration_requirements | US-3.4 | 6 sections; order matches FRD |
| TEST-F3-05 | Mandatory sections always present for all team types | general_dp_alignment always first; feedback_adaptability always last | US-3.2 | Mandatory sections present regardless of team type |
| TEST-F3-06 | Team type locked after session creation | Re-entry start page shows team type read-only; server ignores submitted team_type | US-3.1 | team_type field read-only; server returns stored value |
| TEST-F3-07 | Missing mandatory section auto-inserted by server | Auto-correction logged; no user-facing error | US-3.2 | `MANDATORY_SECTION_AUTO_INSERTED` in server log; section present in list |
| TEST-F3-08 | Section count exceeding 8 rejected | 500 `SECTION_LIMIT_EXCEEDED` | US-3.1 | Error returned; assessment not loadable with bad config |

---

### 5.5 F4: Auto-Save & Progress Persistence

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F4-01 | Auto-save fires on Next navigation | Save State Indicator shows "Saving…" then "Saved at {time}" | US-4.1 | PUT /api/responses/:sessionId called on Next |
| TEST-F4-02 | Auto-save fires on Previous navigation | Save triggered on Previous as well as Next | US-4.1 | PUT called on Previous navigation |
| TEST-F4-03 | Auto-save completes within 3 seconds | Save confirmed within 3 second SLA | US-4.1 | Response received within 3 seconds |
| TEST-F4-04 | Auto-save retries 3 times on failure with backoff | Indicator shows "Retrying…"; retries at 1s, 2s, 4s | US-4.1 | 3 retry attempts logged; final failure message shown |
| TEST-F4-05 | Idle auto-save triggers after 30 seconds of inactivity | Save fires after 30s idle when dirty | US-4.2 | PUT called 30 seconds after last interaction |
| TEST-F4-06 | Previously saved answers pre-populated on session resume | All answer types restored from saved_responses | US-4.3 | All fields filled before first section renders |
| TEST-F4-07 | Save State Indicator shows last_saved_at timestamp on resume | "Saved at {last_saved_at}" shown immediately on load | US-4.3 | Timestamp displayed from server value |

---

### 5.6 F5: Duplicate Submission Prevention & Edit Window

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F5-01 | Submit button only on Review Step | Submit not on section screens | US-5.1 | No Submit button on section screens |
| TEST-F5-02 | Successful submission transitions status to "submitted" | session.submission_status = "submitted"; submitted_at set | US-5.1 | POST /api/submissions/:sessionId returns 200 |
| TEST-F5-03 | Incomplete mandatory questions block submission | Error: "Please complete all required questions before submitting." | US-5.1 | 400 `MANDATORY_QUESTIONS_INCOMPLETE` |
| TEST-F5-04 | Re-entry within edit window shows editable form + re-entry banner | Banner: "You've already submitted. You can update your answers until {due_date}." | US-5.2 | is_closed=false; form editable; banner shown |
| TEST-F5-05 | Auto-save within edit window persists edits | last_modified_at updated; submitted_at unchanged | US-5.2 | PUT /api/responses accepted; timestamps correct |
| TEST-F5-06 | Re-entry after due date shows read-only form | All inputs non-editable; "Assessment closed" banner shown | US-5.3 | is_closed=true; no editable inputs |
| TEST-F5-07 | Auto-save after due date rejected with 403 | PUT /api/responses returns 403 `ASSESSMENT_CLOSED` | US-5.3 | Server rejects save |
| TEST-F5-08 | Draft submission after due date rejected | Attempting Submit after due date returns `ASSESSMENT_CLOSED` | US-5.4 | 403 `ASSESSMENT_CLOSED` on POST /api/submissions |

---

### 5.7 F6: System Owner Dashboard

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F6-01 | Dashboard loads with paginated response list (25 per page, sorted submitted_at DESC) | Response list rendered with correct columns and default sort | US-6.1 | Table shows 25 rows; sorted by submitted_at DESC |
| TEST-F6-02 | Summary stats show total, submitted, draft counts | Summary row above table displays correct counts | US-6.1 | Counts match DB state |
| TEST-F6-03 | Column headers sortable (ASC/DESC) | Clicking Name, Email, Team Type, Status, Submitted At toggles sort | US-6.1 | Sort order changes on column header click |
| TEST-F6-04 | Free-text search filters by name and email (case-insensitive) | Partial match search returns correct rows | US-6.2 | Results match search query |
| TEST-F6-05 | Team type multi-select filter limits results | Selecting one or more team types filters table | US-6.2 | Only selected team types shown |
| TEST-F6-06 | Date range filter by submission date (inclusive) | submittedAfter / submittedBefore filters applied | US-6.2 | Rows outside range not shown |
| TEST-F6-07 | Filter state reflected in URL query parameters | Active filters in URL for bookmarking | US-6.2 | URL params match active filters |
| TEST-F6-08 | Individual response drill-down shows all answers read-only | All sections/answers rendered; same question-type widgets | US-6.3 | All answer types legible; no editable inputs |
| TEST-F6-09 | Back button from drill-down preserves filter state | Filter/search state restored on return | US-6.3 | Filter params maintained in URL |
| TEST-F6-10 | Analytics charts render with server-aggregated data | Bar chart, stacked bars, ranked list, pie/bar all render | US-6.4 | All chart types visible; data from /api/dashboard/analytics |
| TEST-F6-11 | Empty analytics state shows placeholder message | "No responses yet. Charts will populate as respondents submit." | US-6.4 | Placeholder shown when no submitted responses |
| TEST-F6-12 | CSV export downloads file with correct columns and filename | File named assessment-responses-{date}.csv; all required columns | US-6.5 | Download initiated; columns match FRD spec |

---

### 5.8 F7: Role-Based Access Control

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F7-01 | Any valid email logged in via POST /api/auth/login is assigned system_owner role and redirected to dashboard | JWT role=system_owner; client routed to /dashboard | US-7.1 | role claim correct; dashboard accessible |
| TEST-F7-02 | Email submitted via POST /api/sessions assigned respondent role | JWT role=respondent; client routed to /assessment | US-7.1 | role claim correct |
| TEST-F7-03 | System Owner JWT expires after 8 hours | 401 TOKEN_EXPIRED returned after 8h | US-7.1 | Expiry enforced at server |
| TEST-F7-04 | Respondent JWT expires after 24 hours | 401 TOKEN_EXPIRED returned after 24h | US-7.4 | Expiry enforced at server |
| TEST-F7-05 | Respondent accessing /dashboard returns 403 | 403 ACCESS_DENIED; dashboard UI not rendered | US-7.2 | Client-side guard prevents flash; server returns 403 |
| TEST-F7-06 | Respondent cannot access another respondent's session | 403 SESSION_ACCESS_DENIED | US-7.2 | Server rejects cross-session access |
| TEST-F7-07 | Dashboard JWT (role: system_owner) blocked in respondent identity flow | Error: "Dashboard users cannot submit assessments as respondents." | US-7.3 | 403 SYSTEM_OWNER_CANNOT_RESPOND |
| TEST-F7-08 | System Owner JWT blocked from submitting | 403 SYSTEM_OWNER_CANNOT_SUBMIT | US-7.3 | Server rejects submission by System Owner |
| TEST-F7-09 | Expired JWT prompts re-login with unsaved changes warning | Warning: "Your session expired. Please log in again — your last saved answers are preserved." | US-7.4 | 401 returned; client intercepts and shows warning |
| TEST-F7-10 | Tampered JWT rejected | 401 TOKEN_INVALID | US-7.4 | Signature verification fails |

---

### 5.9 F8: Assessment Configuration Management

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F8-01 | Config Panel shows due date, launch date, and computed status | Status dynamically computed: Upcoming / Active / Closed | US-8.1 | GET /api/config returns all fields; status correct |
| TEST-F8-02 | Status badge visible in dashboard header at all times | Badge reflects current assessment status | US-8.1 | Badge updates without page reload |
| TEST-F8-03 | Due date update requires confirmation dialog | Confirmation shows current and new date before saving | US-8.2 | Dialog displayed; cancel = no change |
| TEST-F8-04 | Confirmed due date update takes effect immediately | PATCH /api/config; next respondent session load reflects new date | US-8.2, US-8.3 | GET /api/sessions returns updated is_closed/due_date |
| TEST-F8-05 | Config change written to audit log | config_audit_log row created with changed_by, field_changed, old_value, new_value | US-8.2 | DB row exists after PATCH |
| TEST-F8-06 | Respondent access to config endpoints returns 403 | 403 ACCESS_DENIED for respondent JWT | US-8.1 | Server rejects respondent access to /api/config |

---

### 5.10 F9: Submission Confirmation & Respondent Feedback

| Test ID | Test Description | Acceptance Criteria | User Story | Pass Condition |
|---------|-----------------|---------------------|------------|----------------|
| TEST-F9-01 | Confirmation screen shown after successful submission | "Assessment Submitted!"; name; edit window notice with formatted due date | US-9.1 | Confirmation screen rendered after 200 response |
| TEST-F9-02 | Confirmation screen not accessible without prior submission | Direct navigation to confirmation redirects to Review Step | US-9.1 | INVALID_CONFIRMATION_STATE → redirect |
| TEST-F9-03 | Return to Assessment button navigates to Review Step in editable mode | Button returns to Review Step | US-9.1 | Review Step rendered after clicking button |
| TEST-F9-04 | Re-entry banner displayed for submitted respondents within edit window | Persistent banner "You've already submitted… until {due_date}." | US-9.2 | Banner present on every section; not dismissible |
| TEST-F9-05 | Assessment closed message shown after due date (submitted session) | "This assessment is now closed. Your responses are saved and have been submitted to the System Owner." | US-9.3 | Message shown; form read-only |
| TEST-F9-06 | Assessment closed message shown after due date (draft session) | "This assessment is now closed. Your draft responses were not submitted…" | US-9.3 | Correct message for draft status |

---

### 5.11 Test Coverage Summary

| Feature | User Stories | Test Cases | Coverage |
|---------|-------------|------------|----------|
| F0: Multi-Step Workflow | 5 | 10 | All user story ACs covered |
| F1: Identity & Session Mgmt | 3 | 8 | All user story ACs covered |
| F2: Question Types Engine | 5 | 14 | All question types and validation paths covered |
| F3: Section Routing | 4 | 8 | All 4 team types + mandatory enforcement |
| F4: Auto-Save & Persistence | 3 | 7 | Navigation, idle, resume, retry flows |
| F5: Duplicate Prevention & Edit Window | 4 (+US-0.5) | 8 | Submit, edit window, read-only, post-due-date |
| F6: System Owner Dashboard | 5 | 12 | List, search, filter, drill-down, analytics, CSV |
| F7: Role-Based Access Control | 4 | 10 | Role assignment, expiry, isolation, blocking |
| F8: Configuration Management | 3 | 6 | View, update, audit log, RBAC |
| F9: Submission Confirmation | 3 | 6 | Confirmation, re-entry, closed state |
| **TOTAL** | **39** | **89** | **Full feature coverage** |

---

## 6. Reverse Traceability (Test → PRD)

| Test Case Range | Feature | PRD Requirement | User Story |
|----------------|---------|-----------------|------------|
| TEST-F0-01 to TEST-F0-10 | F0 | Section-by-section navigation; visual progress; review step; required question blocking; direct jump | US-0.1 through US-0.5 |
| TEST-F1-01 to TEST-F1-08 | F1 | Email + name identity; session creation; returning respondent; session persistence | US-1.1 through US-1.3 |
| TEST-F2-01 to TEST-F2-14 | F2 | Six question types; "Other" reveal; validation per type | US-2.1 through US-2.5 |
| TEST-F3-01 to TEST-F3-08 | F3 | Team-type routing; mandatory sections; optional sections; section lock | US-3.1 through US-3.4 |
| TEST-F4-01 to TEST-F4-07 | F4 | Auto-save on navigation; idle auto-save; pre-population; retry | US-4.1 through US-4.3 |
| TEST-F5-01 to TEST-F5-08 | F5 | One submission per email; deliberate submit; edit window; post-due-date lock | US-5.1 through US-5.4 |
| TEST-F6-01 to TEST-F6-12 | F6 | Response list; search/filter; drill-down; analytics; CSV export | US-6.1 through US-6.5 |
| TEST-F7-01 to TEST-F7-10 | F7 | Role assignment; JWT expiry; dashboard blocking; data isolation | US-7.1 through US-7.4 |
| TEST-F8-01 to TEST-F8-06 | F8 | Config view; due date update; audit log; RBAC enforcement | US-8.1 through US-8.3 |
| TEST-F9-01 to TEST-F9-06 | F9 | Confirmation screen; re-entry banner; closed state message | US-9.1 through US-9.3 |

---

## 7. Non-Functional Requirements Traceability

| NFR Category | Requirement | TechArch Implementation | Test Approach |
|-------------|-------------|------------------------|---------------|
| Performance | Section loads ≤ 1 second | Next.js App Router SSR shell; client-side SPA transitions; connection pool max 20 | Load test: 500 concurrent users; measure section load latency |
| Auto-save latency | Auto-save completes within 3 seconds | `useAutoSave.ts` with 3s SLA; TEST-F4-03 | Performance test: save request response time |
| Availability | 99.5% uptime during 2-week window | Single Docker container; PostgreSQL 15+; enterprise infrastructure | Uptime monitoring during assessment window |
| Data Integrity | No response data lost on browser close | Server-side auto-save on every navigation; idle timer; retry logic | Resilience test: interrupt browser mid-session; verify data persistence |
| Security | Dashboard requires valid dashboard JWT (any authenticated user) | `requireSystemOwner` middleware; `AuthGuard.tsx`; JWT HS256 | TEST-F7-01 through TEST-F7-10; penetration check |
| Scalability | 500 concurrent respondents | Connection pool (max 20); stateless API routes; PostgreSQL | Load test at 500 concurrent sessions |
| Browser Support | Chrome, Firefox, Safari, Edge (latest 2 major versions) | dnd-kit (all browsers); Tailwind CSS; standard fetch API | Cross-browser test suite on all 4 browsers |
| Accessibility | WCAG 2.1 AA | Tailwind CSS WCAG primitives; ARIA labels on progress indicator; dnd-kit keyboard support | Automated axe-core scan + manual screen reader testing |
| Data Privacy | No external data sharing | No external API calls except optional SMTP relay; internal network only | Architecture review; no external endpoint calls in production logs |
| Auditability | Timestamps + last-modified stored | `sessions.submitted_at`, `sessions.last_modified_at`, `responses.saved_at`, `config_audit_log` | DB query verification; audit log entry after each config change |

---

## 8. Integration Traceability

| Integration ID | Description | FRD Reference | TechArch Reference | Status |
|---------------|-------------|---------------|-------------------|--------|
| INT-01 | Enterprise Email Relay (SMTP) | Y3-integrations §INT-01 | §7.2 INT-01; `emailService.ts`; `EMAIL_RELAY_URL` env var | Optional stretch goal |
| INT-02 | Enterprise Deployment Infrastructure | Y3-integrations §INT-02 | §1.3 Deployment Topology; Docker container; PostgreSQL 15+ | Required |
| INT-03 | SSO / OAuth | Y3-integrations §INT-03 | §7.4 INT-03 (explicitly out of scope) | Out of scope v1 |
| INT-04 | AI/ML Analysis | Y3-integrations §INT-04 | §7.5 INT-04 (explicitly out of scope) | Out of scope v1 |

---

## 9. Change Management

| Version | Date | Author | Change Description | Impact |
|---------|------|--------|-------------------|--------|
| 1.0 | 2026-07-20 | RTM Generator | Initial RTM created from PRD v1.0, FRD v1.0, TechArch v1.0, UserStories v1.0 | Baseline |

### Change Control Process

1. Any change to PRD features, FRD requirements, TechArch specifications, or User Stories requires an RTM update before implementation begins.
2. RTM version is incremented on every source document change that affects traceability links.
3. Test case coverage must be re-validated when requirement changes occur.
4. Breaking changes (scope additions, feature removal) require stakeholder sign-off before RTM update.

---

## 10. Approval & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner / Sponsor | | | |
| Engineering Lead | | | |
| QA Lead | | | |
| System Owner (Business) | | | |
| Security Review | | | |

### Approval Criteria

Before this RTM is baselined:
- [ ] All PRD features (F0–F9) have at least one FRD chunk, one TechArch specification, and one user story traced
- [ ] All 39 user stories are linked to a PRD feature and have at least one test case
- [ ] All 89 test cases are linked to a user story and acceptance criteria
- [ ] No orphaned requirements (FRD chunks without PRD linkage)
- [ ] No orphaned test cases (test cases without user story linkage)
- [ ] Non-functional requirements traceability validated by Engineering Lead
- [ ] Integration traceability reviewed by Engineering Lead
- [ ] Change management process acknowledged by all approvers

---

## 11. Traceability Completeness Check

| Check | Status | Notes |
|-------|--------|-------|
| All PRD features (F0–F9) traced to FRD | ✓ Complete | 10/10 features traced |
| All FRD chunks (F00–F09, Y0–Y3) traced to PRD | ✓ Complete | All chunks linked |
| All FRD chunks traced to TechArch | ✓ Complete | Component, data, API, and security specs linked |
| All 39 User Stories traced to PRD feature | ✓ Complete | All stories have Feature Ref |
| All 39 User Stories have test case coverage | ✓ Complete | 89 test cases across 10 features |
| Non-functional requirements traced | ✓ Complete | 10 NFR categories linked to TechArch |
| Integration points documented | ✓ Complete | 4 integrations (2 in-scope, 2 explicit non-integrations) |
| Error codes referenced in test cases | ✓ Complete | Key error codes listed per feature |
| FIPS document | N/A | No FIPS-AssessmentForm.md generated for this project |
| Business Case / CBA | N/A | Not referenced in scope; internal enterprise tool |

---

*Document generated: 2026-07-20 | Project: AssessmentForm-Express | RTM Version: 1.0*  
*Source documents: PRD v1.0 · FRD v1.0 · TechArch v1.0 · UserStories v1.0 · PROJECT.md (2026-07-17)*
