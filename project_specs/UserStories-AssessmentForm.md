# User Stories: AssessmentForm-Express
**Project:** AssessmentForm
**Version:** 1.0
**Date:** 2026-07-17
**Status:** Draft
**Based on:** PRD-AssessmentForm.md v1.0, FRD-AssessmentForm.md v1.0, PERSONAS-AssessmentForm.md v1.0

---

## Personas

| ID | Name | Role |
|---|---|---|
| PER-01 | Marcus Reid | Enterprise Team Member (non-technical respondent — Program/Project or Data/API Governance) |
| PER-02 | Priya Nair | Platform Engineering Respondent (technical, high expertise) |
| PER-03 | Dana Okafor | System Owner / DP Adoption Lead |

---

## Priority Definitions

| Level | Meaning |
|---|---|
| **P0** | Critical — must be present for the product to function at all |
| **P1** | High — needed before launch for a complete user experience |
| **P2** | Medium — valuable but deferrable to a follow-on iteration |
| **P3** | Low — nice-to-have; explicitly out of scope for v1 |

---

## Epic 0: Multi-Step Assessment Workflow (F0)

*The core SPA navigation skeleton: section-by-section traversal, visual progress, and a pre-submission review step — all without full-page reloads.*

---

### US-0.1: Navigate the Assessment Section by Section
**As a** Marcus Reid, **I want to** move through the assessment one section at a time using Previous and Next controls, **so that** I can focus on a manageable set of questions without feeling overwhelmed by the full form at once.

**Acceptance Criteria:**
- [ ] A **Next** button advances to the next section; a **Previous** button returns to the prior section
- [ ] Navigating between sections does not trigger a full-page reload (SPA transition)
- [ ] Previously entered answers on a section are preserved when navigating away and returning
- [ ] The **Previous** button is hidden or disabled on the first section; the **Next** button becomes **Review** on the last section
- [ ] Keyboard focus is managed correctly on section transition (WCAG 2.1 AA)

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Track Progress Through the Assessment
**As a** Marcus Reid, **I want to** see a persistent progress indicator showing which section I'm on and how many remain, **so that** I know how much of the assessment is left and feel confident I won't be surprised by additional sections.

**Acceptance Criteria:**
- [ ] A step bar or breadcrumb is visible at all times during the assessment, showing current section and total section count (e.g., "Section 2 of 6")
- [ ] Completed sections are visually distinguished from the current and upcoming sections
- [ ] The progress indicator updates immediately on each section transition
- [ ] The indicator is accessible to screen readers (ARIA labels reflect current step)

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.3: Review All Answers Before Submitting
**As a** Marcus Reid, **I want to** see a summary of all my answers before I submit, **so that** I can catch mistakes or gaps before the assessment is finalized.

**Acceptance Criteria:**
- [ ] After the last section's **Next** is clicked, a Review Step screen is presented displaying all sections and their answers in read-only format
- [ ] Each section on the Review Step has an **Edit** link that returns to that section in edit mode
- [ ] After editing from the Review Step, navigating forward (Next) returns the respondent to the Review Step (not the next sequential section)
- [ ] The Review Step has a clearly labelled **Submit** button
- [ ] Required unanswered questions are highlighted on the Review Step with a clear indication of which section they belong to

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.4: Be Blocked From Advancing With Unanswered Required Questions
**As a** Marcus Reid, **I want to** receive an inline error when I try to advance past a section with unanswered required questions, **so that** I don't accidentally submit an incomplete assessment.

**Acceptance Criteria:**
- [ ] Clicking **Next** with any required question unanswered displays an inline error: "Please answer all required questions before continuing."
- [ ] Each unanswered required question is individually highlighted with an error state
- [ ] The navigation is blocked until all required questions on the current section are answered
- [ ] Optional questions do not trigger blocking errors when left blank
- [ ] Error messages are associated with their respective fields for screen reader accessibility

**Priority:** P0 | **Feature Ref:** F0

---

## Epic 1: Respondent Identity & Session Management (F1)

*Email + name identity capture at the start, server-side session creation, returning-respondent detection, and session persistence across browser close/reopen.*

---

### US-1.1: Enter Identity to Start the Assessment
**As a** Marcus Reid, **I want to** provide my email address, full name, and team type to start the assessment, **so that** my progress can be saved and associated with my identity throughout the process.

**Acceptance Criteria:**
- [ ] The assessment landing page displays fields for email address, full name, and a team type dropdown before showing any questions
- [ ] The **Start Assessment** button is enabled only after all three fields are completed
- [ ] Email is validated for proper format (RFC 5322) with an inline error if invalid: "Please enter a valid email address."
- [ ] Name requires at least 2 non-whitespace characters; invalid name shows: "Please enter your full name (at least 2 characters)."
- [ ] Team type dropdown shows all four options: Program/Project, Platform Engineering, Infrastructure/Cloud, Data/API Governance
- [ ] Submitting with a System Owner email displays: "This email is registered as a System Owner. Please access the dashboard instead."

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.2: Resume the Assessment After Closing the Browser
**As a** Marcus Reid, **I want to** return to the assessment the next day and have my previous progress loaded automatically, **so that** I don't have to re-enter answers I already provided.

**Acceptance Criteria:**
- [ ] When a returning respondent re-enters their email, the system detects the existing session and loads all previously saved answers
- [ ] A Resume Banner is displayed: "Welcome back, {name}. Your progress has been loaded. You left off at section {N}."
- [ ] The assessment opens at the last saved section index, not section 1
- [ ] All previously answered questions are pre-populated with the saved values
- [ ] If the stored session token is stale or not found, the error message is: "Your previous session could not be found. Please re-enter your details."

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.3: Have My Session Persisted Across the Assessment Window
**As a** Priya Nair, **I want to** have my session and answers stored server-side throughout the two-week assessment window, **so that** I can leave, return, and revise my answers without losing data regardless of browser or device state.

**Acceptance Criteria:**
- [ ] Session is stored server-side, not only in browser memory, so closing the browser does not lose progress
- [ ] `session_id` is persisted in `localStorage` for automatic session resume on return
- [ ] Session expiry for respondents is set to 24 hours to cover multi-day usage patterns
- [ ] If assessment is closed (past due date) on return, the system shows a read-only view regardless of draft status
- [ ] No duplicate session records are created for the same email — an existing session is returned (upsert behavior)

**Priority:** P0 | **Feature Ref:** F1

---

## Epic 2: Question Types Engine (F2)

*Six question type renderers — single-choice, multi-choice, Likert, ranking, free text short, free text long — plus conditional "Other" reveal logic.*

---

### US-2.1: Answer Single-Choice and Multi-Choice Questions
**As a** Marcus Reid, **I want to** select one or multiple options from a list using radio buttons or checkboxes, **so that** I can clearly express my team's preferences from the provided options.

**Acceptance Criteria:**
- [ ] Single-choice questions render as a list of radio buttons; only one option can be selected at a time
- [ ] Multi-choice questions render as a list of checkboxes; multiple options may be selected simultaneously
- [ ] Required single-choice: exactly one option must be selected before advancing; error: "This question requires an answer."
- [ ] Required multi-choice: at least one checkbox must be checked before advancing
- [ ] Deselecting all options on a required multi-choice question re-triggers the validation error on the next **Next** attempt

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.2: Add a Custom "Other" Answer to Choice Questions
**As a** Priya Nair, **I want to** enter a custom free-text answer when the predefined options don't cover my team's specific needs, **so that** my team's unique requirements are captured accurately rather than forced into an imperfect option.

**Acceptance Criteria:**
- [ ] An "Other" option appears as the last item on choice questions where it is configured
- [ ] Selecting/checking "Other" reveals a text input field inline below the option
- [ ] Deselecting "Other" hides the text input and clears its value
- [ ] The "Other" text input is required when "Other" is selected; blank submission shows: "Please specify your 'Other' answer."
- [ ] "Other" text is limited to 500 characters; a character counter is visible
- [ ] The "Other" reveal/hide is accessible (`aria-expanded` toggled correctly)

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.3: Rate Agreement on a Likert Scale
**As a** Marcus Reid, **I want to** rate my level of agreement or sentiment on a 5-point scale, **so that** I can express nuanced opinions beyond simple yes/no answers.

**Acceptance Criteria:**
- [ ] Likert questions render 5 radio buttons labeled 1–5 with descriptive endpoint labels (e.g., "Strongly Disagree" / "Strongly Agree")
- [ ] Exactly one value must be selected for required Likert questions
- [ ] The selected value is stored as an integer 1–5 in the answer payload
- [ ] Invalid values (outside 1–5) are rejected server-side with error: "Please select a value between 1 and 5."
- [ ] Likert scale is keyboard-navigable using arrow keys (WCAG 2.1 AA)

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.4: Rank Items by Priority Using Drag-and-Drop or Numbered Input
**As a** Priya Nair, **I want to** rank a list of DP tool capabilities by priority using drag-and-drop or numbered inputs, **so that** I can precisely communicate which capabilities matter most to my team — not just whether they matter.

**Acceptance Criteria:**
- [ ] Ranking questions render a list of items that can be reordered via drag-and-drop (primary interaction)
- [ ] A numbered input fallback is available next to each item for users where drag-and-drop is impractical
- [ ] All items must be assigned a unique rank before advancing; incomplete ranking shows: "Please assign a rank to all items."
- [ ] Duplicate rank positions show: "Each item must have a unique rank."
- [ ] The answer payload stores items as an ordered array (index 0 = rank 1 = highest priority)
- [ ] Drag-and-drop functionality is tested and functional on Chrome, Firefox, Safari, and Edge (latest 2 major versions)

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.5: Write Short and Long Free-Text Answers
**As a** Priya Nair, **I want to** enter brief or detailed open-ended responses for questions that need free-form input, **so that** I can document specific integration requirements or constraints that no predefined option captures.

**Acceptance Criteria:**
- [ ] Free text short renders as a single-line `<input type="text">` with a character counter; max 500 characters
- [ ] Free text long renders as a `<textarea>` with a visible resize handle and character counter; max 2000 characters
- [ ] Character counters turn red when approaching or exceeding the limit
- [ ] Exceeding the character limit shows: "Your answer exceeds the maximum length of {limit} characters."
- [ ] Required free text fields: value must be non-empty after trimming whitespace before advancing
- [ ] Both field types enforce character limits client-side and server-side

**Priority:** P0 | **Feature Ref:** F2

---

## Epic 3: Team-Type-Specific Section Routing (F3)

*Configuration-driven logic that presents each respondent only the sections relevant to their team type, always including the three mandatory sections.*

---

### US-3.1: See Only Sections Relevant to My Team Type
**As a** Marcus Reid, **I want to** be presented only the sections that apply to my team type after I select it at the start, **so that** I don't waste time on irrelevant questions and the assessment feels tailored to my role.

**Acceptance Criteria:**
- [ ] After selecting a team type, the system computes and loads only the sections mapped to that team type
- [ ] No empty or irrelevant sections are displayed at any point during the assessment
- [ ] Section count is between 5 and 8 depending on team type (3 mandatory + team-type-specific optional sections)
- [ ] The progress indicator reflects the actual total sections for the respondent's team type (not a static global count)
- [ ] Changing team type on re-entry with an existing session does not break section routing

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.2: Always See the Three Mandatory Sections Regardless of Team Type
**As a** Marcus Reid, **I want to** always see the General DP Alignment, Current Status, and Feedback & Adaptability sections, **so that** my baseline input is captured consistently alongside all other respondents.

**Acceptance Criteria:**
- [ ] General DP Alignment always appears as the first section for all team types
- [ ] Current Status always appears as the second section for all team types
- [ ] Feedback & Adaptability always appears as the last section for all team types
- [ ] If a mandatory section is accidentally omitted from the routing configuration, the system auto-inserts it (no user-facing error)
- [ ] Mandatory sections cannot be skipped regardless of question completion status

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.3: Have Platform Engineering-Specific Sections Available
**As a** Priya Nair, **I want to** be routed to Platform Engineering-specific sections (Platform Needs, Tool Evaluation, Integration Requirements, Adoption Readiness), **so that** my team's distinct technical requirements are captured in dedicated sections and not mixed with program-team questions.

**Acceptance Criteria:**
- [ ] Selecting "Platform Engineering" team type routes to: General DP Alignment → Current Status → Platform Needs & Capability Requirements → Tool Evaluation Criteria → Integration & Ecosystem Requirements → Adoption Readiness & Constraints → Feedback & Adaptability (7 sections)
- [ ] Sections specific to other team types (e.g., Governance & Compliance) do not appear for Platform Engineering respondents
- [ ] Section routing is configuration-driven (stored in `section_routing` table); no hardcoded team-type logic in application code
- [ ] The effective section list is cached in the session so resume preserves the same routing

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.4: Have Data/API Governance-Specific Sections Available
**As a** Marcus Reid (as a Data/API Governance team member), **I want to** be routed to the Governance & Compliance and other relevant sections, **so that** my team's governance and integration concerns are properly captured.

**Acceptance Criteria:**
- [ ] Selecting "Data/API Governance" team type routes to: General DP Alignment → Current Status → Governance & Compliance Requirements → Platform Needs & Capability Requirements → Integration & Ecosystem Requirements → Feedback & Adaptability (6 sections)
- [ ] The Adoption Readiness and Tool Evaluation sections do not appear for Data/API Governance respondents
- [ ] Section routing for all four team types is verified and matches the v1 routing table in the FRD

**Priority:** P0 | **Feature Ref:** F3

---

## Epic 4: Auto-Save & Progress Persistence (F4)

*Background persistence of answers on section navigation and idle timeout, with a visible save state indicator and pre-population on resume.*

---

### US-4.1: Have My Answers Saved Automatically When Navigating Between Sections
**As a** Marcus Reid, **I want to** have my answers automatically saved when I click Next or Previous, **so that** I never lose progress due to a browser crash, tab close, or meeting interruption.

**Acceptance Criteria:**
- [ ] Auto-save is triggered on every **Next** and **Previous** navigation action
- [ ] Auto-save completes within 3 seconds of navigation trigger
- [ ] A Save State Indicator is always visible during the assessment, showing "Saving…" during save and "Saved at {time}" after success
- [ ] Navigation to the next/previous section proceeds regardless of auto-save outcome (save failure does not block navigation)
- [ ] If auto-save fails, the indicator shows: "Unsaved changes — server error. Retrying…" and retries up to 3 times with exponential backoff

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.2: Have My Answers Saved Periodically While I'm Actively Answering
**As a** Priya Nair, **I want to** have my detailed long-form answers saved automatically after a period of inactivity, **so that** I don't lose content I've typed if I get pulled into a meeting without clicking Next first.

**Acceptance Criteria:**
- [ ] Auto-save is triggered after 30 seconds of idle time when unsaved changes exist ("dirty state")
- [ ] The idle timer resets on any user interaction (keystroke, click, selection change)
- [ ] The Save State Indicator transitions from "Unsaved changes" to "Saving…" to "Saved at {time}" during idle auto-save
- [ ] If a section transition occurs during a mid-flight idle save, the save completes and no answers are lost
- [ ] The idle timeout interval is configurable (server-side) without a code deploy

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.3: Have All My Previous Answers Pre-Populated When I Return
**As a** Marcus Reid, **I want to** see all my previously entered answers filled in when I return to the assessment, **so that** I can continue or review without re-entering anything I already answered.

**Acceptance Criteria:**
- [ ] On session resume, the system fetches all saved responses from the server and pre-populates each question field
- [ ] Single-choice, multi-choice, Likert, ranking, and free-text fields are all restored to their saved state
- [ ] "Other" text fields are restored if "Other" was previously selected
- [ ] The Save State Indicator shows "Saved at {last_saved_at timestamp}" immediately on resume
- [ ] Pre-population completes before the first section is rendered (no visible empty → filled flash)

**Priority:** P0 | **Feature Ref:** F4

---

## Epic 5: Duplicate Submission Prevention & Edit Window (F5)

*One-submission-per-email enforcement, deliberate Submit action, configurable edit window, and post-due-date read-only mode.*

---

### US-5.1: Submit the Assessment Exactly Once
**As a** Marcus Reid, **I want to** finalize my assessment with a deliberate Submit action, **so that** I'm confident my responses are officially recorded rather than tentatively saved.

**Acceptance Criteria:**
- [ ] The **Submit** button is present only on the Review Step, not on individual section screens
- [ ] Clicking **Submit** transitions the session from `draft` to `submitted` status
- [ ] All mandatory section questions must be answered before submission is accepted; incomplete submission shows: "Please complete all required questions before submitting."
- [ ] A successful submission navigates to the Confirmation Screen (see F9)
- [ ] Only one submitted session per email address is permitted; the system prevents creation of a second submission

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.2: Edit My Submitted Answers Before the Due Date
**As a** Priya Nair, **I want to** return to the assessment after submitting and update my answers before the due date, **so that** I can revise my rankings after discussing priorities with my team lead without losing my original submission.

**Acceptance Criteria:**
- [ ] A returning respondent who has already submitted sees a re-entry banner: "You've already submitted your assessment. You can update your answers until {due_date}."
- [ ] The form is fully editable during the edit window (before due date) for submitted respondents
- [ ] Auto-save continues to work normally for edits within the edit window
- [ ] Edited answers are persisted immediately via auto-save; no need to re-submit to preserve changes
- [ ] `last_modified_at` is updated on each save; `submitted_at` remains unchanged

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.3: See a Read-Only View After the Assessment Due Date
**As a** Marcus Reid, **I want to** be shown a read-only version of my answers when I return after the deadline, **so that** I understand the assessment is closed and can review what I submitted.

**Acceptance Criteria:**
- [ ] After the due date, all form inputs are rendered as read-only (no editable fields)
- [ ] A banner is displayed at the top of every section: "This assessment is now closed. Your responses are saved and have been submitted to the System Owner."
- [ ] The Save, Submit, and editable navigation controls are hidden in read-only mode
- [ ] Previous/Next navigation still works in read-only mode for reviewing sections
- [ ] Read-only enforcement is applied both client-side (UI) and server-side (auto-save requests rejected with 403 `ASSESSMENT_CLOSED`)

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.4: Be Prevented From Submitting After the Due Date
**As a** Marcus Reid, **I want to** be clearly informed that the due date has passed if I try to submit a draft I haven't finalized, **so that** I understand why my submission was not accepted.

**Acceptance Criteria:**
- [ ] Attempting to submit after the due date returns error: "The assessment due date has passed. No further submissions or edits are accepted."
- [ ] Draft sessions (never submitted) are also locked after the due date — late draft submission is rejected
- [ ] The due date check is performed server-side on every submission attempt; client-side check is a UX convenience only
- [ ] The assessment status transitions to read-only automatically at the due date without requiring any manual action

**Priority:** P0 | **Feature Ref:** F5

---

## Epic 6: System Owner Dashboard (F6)

*Role-protected dashboard with paginated response list, search & filter, individual drill-down, aggregated analytics charts, and CSV export.*

---

### US-6.1: View a Paginated List of All Respondents and Their Status
**As a** Dana Okafor, **I want to** see a table of all respondents with their name, email, team type, completion status, and submission date, **so that** I can monitor participation across the enterprise at a glance.

**Acceptance Criteria:**
- [ ] The dashboard response list displays columns: Respondent Name, Email, Team Type, Status (draft/submitted), Submitted At, Last Modified At
- [ ] Rows are paginated at 25 per page with previous/next/page-number controls
- [ ] Column headers for Name, Email, Team Type, Status, and Submitted At are sortable (click to toggle ASC/DESC)
- [ ] A summary row above the table shows total responses, submitted count, draft count
- [ ] The dashboard loads with default sort: `submitted_at DESC`

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.2: Search and Filter Responses by Team Type, Status, and Date
**As a** Dana Okafor, **I want to** filter the response list by team type, completion status, and date range, and search by name or email, **so that** I can quickly identify under-represented segments or locate a specific respondent's submission.

**Acceptance Criteria:**
- [ ] A search box performs case-insensitive partial-match search against respondent name and email
- [ ] A multi-select team type filter allows filtering by one or more of the four team types simultaneously
- [ ] A status filter offers options: All, Submitted, Draft
- [ ] Date range pickers for "submitted after" and "submitted before" allow filtering by submission date (inclusive)
- [ ] All filters and search are combinable and applied simultaneously
- [ ] Active filter state is reflected in URL query parameters for bookmarking
- [ ] When no results match, the table shows: "No responses match your current filters."

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.3: Drill Into an Individual Respondent's Full Answers
**As a** Dana Okafor, **I want to** click on any respondent row and view their complete answers for all sections, **so that** I can investigate anomalous results or verify data quality for a specific team's input.

**Acceptance Criteria:**
- [ ] Clicking any row in the response list navigates to an individual response view at `/dashboard/responses/:sessionId`
- [ ] The individual response view renders all sections and questions for the respondent's team type in read-only format, using the same question-type widgets as the assessment form
- [ ] All answer types (single-choice, multi-choice, Likert, ranking, free text) are rendered legibly in read-only mode
- [ ] A back button returns to the response list with the previous filter/search state preserved
- [ ] Accessing a non-existent session ID shows: "The requested response could not be found." (404)

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.4: View Aggregated Analytics Charts for All Responses
**As a** Dana Okafor, **I want to** see aggregated visualizations — response counts by team type, Likert distributions, top-ranked items, and choice breakdowns — **so that** I can present data-driven findings in stakeholder meetings without manually rebuilding charts in Excel.

**Acceptance Criteria:**
- [ ] Response counts by team type are shown as a horizontal bar chart
- [ ] For each Likert question, a stacked bar chart shows the percentage of respondents at each point (1–5)
- [ ] For each ranking question, a ranked list shows items ordered by average rank position across all respondents
- [ ] For each single/multi-choice question, a pie or horizontal bar chart shows option selection frequency
- [ ] All charts respond to the active team type filter when set
- [ ] Charts render using server-aggregated data (not client-side raw data); analytics endpoint: `GET /api/dashboard/analytics`
- [ ] If analytics data is unavailable, a graceful error is shown: "Analytics could not be loaded. Please refresh."

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.5: Export All Responses to CSV
**As a** Dana Okafor, **I want to** download all response data as a CSV file, **so that** I can include the full dataset in a formal decision brief without any manual reformatting or post-processing.

**Acceptance Criteria:**
- [ ] An **Export CSV** button is present on the dashboard response list view
- [ ] The exported CSV includes columns: `respondent_name`, `respondent_email`, `team_type`, `submission_status`, `submitted_at`, `last_modified_at`, plus one column per question (by question title) with human-readable answer values
- [ ] The export respects the currently active filter parameters (only matching responses are exported)
- [ ] The file is downloaded with filename format: `assessment-responses-{date}.csv`
- [ ] If the export fails, the error message is: "Export could not be generated. Please try again."

**Priority:** P0 | **Feature Ref:** F6

---

## Epic 7: Role-Based Access Control (F7)

*Two-role model (Respondent / System Owner) enforced via JWT with role claim; server-side protection on all dashboard and data routes.*

---

### US-7.1: Be Automatically Assigned the Correct Role at Login
**As a** Dana Okafor, **I want to** be automatically recognized as a System Owner when I log in with my pre-configured email, **so that** I'm directed to the dashboard without any manual role selection or configuration.

**Acceptance Criteria:**
- [ ] At session creation (`POST /api/sessions`), the server checks the submitted email against the `system_owner_emails` table (case-insensitive)
- [ ] If the email matches, the JWT is issued with `role: "system_owner"`; otherwise `role: "respondent"`
- [ ] System Owner JWT expires after 8 hours; Respondent JWT expires after 24 hours
- [ ] The role claim is embedded in the JWT and verified server-side on every protected API call
- [ ] An empty `system_owner_emails` table results in all users being assigned the Respondent role

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.2: Be Blocked From Accessing the Dashboard as a Respondent
**As a** Marcus Reid, **I want to** be unable to access the System Owner dashboard, **so that** my and other respondents' private assessment data remains confidential.

**Acceptance Criteria:**
- [ ] Navigating to `/dashboard` with a Respondent JWT returns 403 `ACCESS_DENIED`: "You do not have permission to access this page."
- [ ] All `GET /api/dashboard/*` endpoints return 403 for requests with a Respondent role JWT
- [ ] Client-side route guard prevents the dashboard UI from rendering for Respondent-role users (no flash of dashboard content)
- [ ] Respondents cannot access any other respondent's session data via `/api/sessions/:sessionId` or `/api/responses/:sessionId` — ownership is validated against the JWT email

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.3: Be Prevented From Submitting the Assessment as a System Owner
**As a** Dana Okafor, **I want to** be clearly informed that I cannot submit a respondent assessment using my System Owner email, **so that** the dataset is not contaminated with System Owner entries.

**Acceptance Criteria:**
- [ ] Attempting to start an assessment session with a System Owner email returns 403: "This email is registered as a System Owner. Please access the dashboard instead."
- [ ] Attempting to submit (`POST /api/submissions/:sessionId`) with a System Owner JWT returns 403: "System Owners cannot submit assessments as respondents."
- [ ] No respondent session record is created for System Owner email addresses in the `respondents` table
- [ ] The error is shown on the identity capture page, not mid-assessment, preventing any data entry

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.4: Have My Session Token Expire and Be Prompted to Log In Again
**As a** Priya Nair, **I want to** be prompted to re-authenticate when my session token expires, **so that** I'm not unexpectedly logged out mid-assessment without a clear recovery path.

**Acceptance Criteria:**
- [ ] When a JWT expires, the next protected API call returns 401 `TOKEN_EXPIRED`: "Your session has expired. Please log in again."
- [ ] The client intercepts 401 responses and redirects to the identity capture page
- [ ] Any unsaved changes at the time of expiry trigger a warning: "Your session expired. Please log in again to continue — your last saved answers are preserved."
- [ ] On re-authentication, saved progress is loaded from the server (session data is not lost on token expiry)

**Priority:** P0 | **Feature Ref:** F7

---

## Epic 8: Assessment Configuration Management (F8)

*System Owner ability to view and update the assessment due date from the dashboard, with a confirmation step and immediate effect.*

---

### US-8.1: View the Current Assessment Configuration
**As a** Dana Okafor, **I want to** see the current assessment due date, launch date, and status at a glance on the dashboard, **so that** I can verify the assessment is correctly configured before sending the link to team leads.

**Acceptance Criteria:**
- [ ] A Config Panel in the dashboard settings shows: current due date, launch date, computed assessment status (Active / Closed / Upcoming), and last-modified info
- [ ] Assessment status is computed dynamically: `Upcoming` if before launch date; `Active` if between launch and due date; `Closed` if after due date
- [ ] A status badge reflecting the current assessment status is visible in the dashboard header at all times
- [ ] Config Panel is accessible via a settings link from the main dashboard view
- [ ] Only System Owner role can access the Config Panel; Respondents receive 403 `ACCESS_DENIED`

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.2: Update the Assessment Due Date With a Confirmation Step
**As a** Dana Okafor, **I want to** update the assessment due date and confirm the change before it takes effect, **so that** I don't accidentally shorten the collection window and lock out respondents who haven't submitted yet.

**Acceptance Criteria:**
- [ ] An **Edit Due Date** control in the Config Panel opens a date/time picker pre-populated with the current due date
- [ ] Clicking **Save** displays a confirmation dialog: "You are about to change the assessment due date from {current} to {new}. This will take effect immediately for all respondents. Confirm?"
- [ ] The change only takes effect after the System Owner confirms; cancelling returns to the Config Panel with no change
- [ ] The new due date takes effect immediately for all active respondents (no cache lag)
- [ ] An invalid date format shows: "Please provide a valid date and time."
- [ ] Every due date change is recorded in `config_audit_log` with the System Owner's email and timestamp

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.3: Have Configuration Changes Reflected Immediately for Respondents
**As a** Dana Okafor, **I want to** be confident that a due date change affects all respondents immediately, **so that** extending the window actually gives respondents more time and closing early locks submissions right away.

**Acceptance Criteria:**
- [ ] After a due date update, the next session load by any respondent reflects the new due date
- [ ] Respondents whose sessions are active at the time of a due date change see the updated deadline on their next page action
- [ ] If the due date is set to a past time, the assessment transitions to `Closed` status immediately and all respondent sessions move to read-only mode
- [ ] No application restart or cache flush is required for configuration changes to take effect

**Priority:** P1 | **Feature Ref:** F8

---

## Epic 9: Submission Confirmation & Respondent Feedback (F9)

*Post-submission confirmation screen, re-entry edit-window banner, and post-due-date read-only closed message.*

---

### US-9.1: Receive a Clear Confirmation After Submitting
**As a** Marcus Reid, **I want to** see a confirmation screen immediately after submitting, **so that** I'm certain my responses were recorded and I know exactly how long I have to make changes.

**Acceptance Criteria:**
- [ ] After a successful submission, the client navigates to a Confirmation Screen (not a generic success toast)
- [ ] The Confirmation Screen displays: "Assessment Submitted!", "Thank you, {name}. Your assessment has been submitted successfully.", and "You can return to edit your responses until {due_date formatted as: Day, Month DD, YYYY at HH:MM timezone}."
- [ ] A **Return to Assessment** button on the Confirmation Screen navigates back to the Review Step in editable mode
- [ ] The Confirmation Screen is only reachable after a successful 200 response from `POST /api/submissions/:sessionId`; direct navigation without submission redirects to the Review Step
- [ ] If due date information is unavailable from the server, the edit window notice reads: "Contact the System Owner for deadline information."

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.2: See a Re-Entry Banner When Returning After Submitting
**As a** Priya Nair, **I want to** see a prominent banner when I return to the assessment after already submitting, **so that** I know I'm editing an already-submitted assessment and understand how much time I have left to revise.

**Acceptance Criteria:**
- [ ] When a submitted respondent returns within the edit window, a persistent re-entry banner is displayed at the top of every section: "You've already submitted your assessment. You can update your answers until {due_date}."
- [ ] The form is fully editable beneath the banner; all question types accept new input
- [ ] The re-entry banner is not dismissible (it persists across all sections during the session)
- [ ] The banner displays the correctly formatted due date from `assessment_config`
- [ ] Auto-save works normally during a re-entry editing session

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.3: See a Clear "Assessment Closed" Message After the Due Date
**As a** Marcus Reid, **I want to** see a clear message that the assessment is closed when I return after the deadline, **so that** I understand my submitted answers are final and have been received.

**Acceptance Criteria:**
- [ ] Returning after the due date shows a dismissible banner on every section: "This assessment is now closed. Your responses are saved and have been submitted to the System Owner."
- [ ] All form inputs are read-only; no editing, saving, or re-submitting is possible
- [ ] Previous/Next navigation still functions to allow the respondent to review their submitted answers
- [ ] The read-only state is enforced server-side; attempts to save via `PUT /api/responses/:sessionId` after the due date return 403 `ASSESSMENT_CLOSED`
- [ ] The "Assessment closed" view is shown for both `submitted` and `draft` sessions after the due date

**Priority:** P1 | **Feature Ref:** F9

---

## Story Index

| Story ID | Title | Persona | Priority | Feature Ref |
|---|---|---|---|---|
| US-0.1 | Navigate the Assessment Section by Section | Marcus Reid | P0 | F0 |
| US-0.2 | Track Progress Through the Assessment | Marcus Reid | P0 | F0 |
| US-0.3 | Review All Answers Before Submitting | Marcus Reid | P0 | F0 |
| US-0.4 | Be Blocked With Unanswered Required Questions | Marcus Reid | P0 | F0 |
| US-1.1 | Enter Identity to Start the Assessment | Marcus Reid | P0 | F1 |
| US-1.2 | Resume the Assessment After Closing the Browser | Marcus Reid | P0 | F1 |
| US-1.3 | Have Session Persisted Across the Assessment Window | Priya Nair | P0 | F1 |
| US-2.1 | Answer Single-Choice and Multi-Choice Questions | Marcus Reid | P0 | F2 |
| US-2.2 | Add a Custom "Other" Answer to Choice Questions | Priya Nair | P0 | F2 |
| US-2.3 | Rate Agreement on a Likert Scale | Marcus Reid | P0 | F2 |
| US-2.4 | Rank Items by Priority Using Drag-and-Drop or Numbered Input | Priya Nair | P0 | F2 |
| US-2.5 | Write Short and Long Free-Text Answers | Priya Nair | P0 | F2 |
| US-3.1 | See Only Sections Relevant to My Team Type | Marcus Reid | P0 | F3 |
| US-3.2 | Always See the Three Mandatory Sections | Marcus Reid | P0 | F3 |
| US-3.3 | Have Platform Engineering-Specific Sections Available | Priya Nair | P0 | F3 |
| US-3.4 | Have Data/API Governance-Specific Sections Available | Marcus Reid | P0 | F3 |
| US-4.1 | Have Answers Saved Automatically on Section Navigation | Marcus Reid | P0 | F4 |
| US-4.2 | Have Answers Saved Periodically While Actively Answering | Priya Nair | P0 | F4 |
| US-4.3 | Have All Previous Answers Pre-Populated on Return | Marcus Reid | P0 | F4 |
| US-5.1 | Submit the Assessment Exactly Once | Marcus Reid | P0 | F5 |
| US-5.2 | Edit Submitted Answers Before the Due Date | Priya Nair | P0 | F5 |
| US-5.3 | See a Read-Only View After the Assessment Due Date | Marcus Reid | P0 | F5 |
| US-5.4 | Be Prevented From Submitting After the Due Date | Marcus Reid | P0 | F5 |
| US-6.1 | View a Paginated List of All Respondents and Their Status | Dana Okafor | P0 | F6 |
| US-6.2 | Search and Filter Responses by Team Type, Status, and Date | Dana Okafor | P0 | F6 |
| US-6.3 | Drill Into an Individual Respondent's Full Answers | Dana Okafor | P0 | F6 |
| US-6.4 | View Aggregated Analytics Charts for All Responses | Dana Okafor | P0 | F6 |
| US-6.5 | Export All Responses to CSV | Dana Okafor | P0 | F6 |
| US-7.1 | Be Automatically Assigned the Correct Role at Login | Dana Okafor | P0 | F7 |
| US-7.2 | Be Blocked From Accessing the Dashboard as a Respondent | Marcus Reid | P0 | F7 |
| US-7.3 | Be Prevented From Submitting the Assessment as a System Owner | Dana Okafor | P0 | F7 |
| US-7.4 | Have Session Token Expire With a Clear Recovery Path | Priya Nair | P0 | F7 |
| US-8.1 | View the Current Assessment Configuration | Dana Okafor | P1 | F8 |
| US-8.2 | Update the Assessment Due Date With a Confirmation Step | Dana Okafor | P1 | F8 |
| US-8.3 | Have Configuration Changes Reflected Immediately | Dana Okafor | P1 | F8 |
| US-9.1 | Receive a Clear Confirmation After Submitting | Marcus Reid | P1 | F9 |
| US-9.2 | See a Re-Entry Banner When Returning After Submitting | Priya Nair | P1 | F9 |
| US-9.3 | See a Clear "Assessment Closed" Message After the Due Date | Marcus Reid | P1 | F9 |

**Total: 38 user stories across 10 epics**

---

## Priority Breakdown

| Priority | Stories | Features |
|---|---|---|
| **P0** — Critical MVP | 32 | F0, F1, F2, F3, F4, F5, F6, F7 |
| **P1** — High / Pre-launch | 6 | F8, F9 |
| **P2** — Medium / Deferrable | 0 | — |
| **P3** — Out of scope for v1 | 0 | — |

---

*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
