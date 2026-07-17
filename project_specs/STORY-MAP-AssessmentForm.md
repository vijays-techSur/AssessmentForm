# STORY-MAP: AssessmentForm-Express
## User Story Map

| Field | Value |
|---|---|
| **Product Name** | AssessmentForm-Express |
| **Version** | 1.0 |
| **Date** | 2026-07-17 |
| **Related Personas** | PERSONAS-AssessmentForm.md |
| **Related JTBD** | JTBD-AssessmentForm.md |
| **Related Journeys** | JOURNEYS-AssessmentForm.md |
| **Related User Stories** | UserStories-AssessmentForm.md |
| **Related PRD** | PRD-AssessmentForm.md |
| **Status** | Draft |

---

## Overview

This Story Map organizes all 38 user stories into a two-dimensional grid:

- **X-axis (columns):** Journey stages drawn from JOURNEYS-AssessmentForm.md, consolidated into six cross-persona backbone stages that span the complete product experience — from first arrival through system owner data export.
- **Y-axis (rows):** Individual user stories placed at the intersection of journey stage and epic/feature, ordered by priority within each stage.
- **NaC column:** Natural Acceptance Criteria derived from JTBD outcomes. Each NaC is traceable to a specific JTBD functional outcome, contextualized for the journey stage, and expressed as a testable statement. NaC are *not* invented — they are derived from the intersection of JTBD outcome × journey stage × user story.
- **Release column:** Increment assignment based on PRD priority and journey completeness.

### Journey Stage Backbone (X-Axis)

| Stage ID | Stage Name | Personas Active | Journey Source |
|---|---|---|---|
| STG-01 | Arrive & Identify | PER-01, PER-02 | JRN-01.1 S1-2, JRN-02.1 S1 |
| STG-02 | Answer Questions | PER-01, PER-02 | JRN-01.1 S3, JRN-02.1 S2-4 |
| STG-03 | Pause & Persist | PER-01, PER-02 | JRN-01.1 S4-5, JRN-02.1 S3-4 |
| STG-04 | Review & Submit | PER-01, PER-02 | JRN-01.1 S6, JRN-02.1 S5 |
| STG-05 | Return & Edit | PER-01, PER-02 | JRN-01.2, JRN-02.2 |
| STG-06 | Monitor & Export | PER-03 | JRN-03.1, JRN-03.2 |

### SM-ID Convention

Story map entries use `SM-{Epic}.{NN}` (e.g., SM-0.1 maps to US-0.1 in Epic 0).

---

## Story Map Matrix

> Column key: **NaC** = Natural Acceptance Criterion (JTBD-derived, testable). **Rel** = Release.

### STG-01: Arrive & Identify

| SM-ID | Epic | Story | Persona | NaC (JTBD Source) | Rel |
|---|---|---|---|---|---|
| SM-1.1 | Epic 1 (F1) | **US-1.1** — Enter Identity to Start the Assessment | PER-01, PER-02 | *JTBD-01.1 / JTBD-02.1 → Arrive:* Respondent completes name, email, and team-type fields and reaches the first section in under 60 seconds | R1 |
| SM-3.1 | Epic 3 (F3) | **US-3.1** — See Only Sections Relevant to My Team Type | PER-01, PER-02 | *JTBD-01.3 → Identify:* After selecting "Program/Project", no Platform Engineering or Infrastructure/Cloud sections are displayed at any point | R1 |
| SM-3.2 | Epic 3 (F3) | **US-3.2** — Always See the Three Mandatory Sections | PER-01, PER-02 | *JTBD-01.3 → Identify:* General DP Alignment, Current Status, and Feedback & Adaptability sections are always present regardless of team type selected | R1 |
| SM-3.3 | Epic 3 (F3) | **US-3.3** — Have Platform Engineering-Specific Sections Available | PER-02 | *JTBD-02.1 → Identify & Route:* Selecting "Platform Engineering" surfaces 7 sections including CI/CD, Plugin Ecosystem, and Onboarding — no program-level sections appear | R1 |
| SM-3.4 | Epic 3 (F3) | **US-3.4** — Have Data/API Governance-Specific Sections Available | PER-01 | *JTBD-01.3 → Identify:* Selecting "Data/API Governance" routes to 6 sections including Governance & Compliance; Adoption Readiness and Tool Evaluation do not appear | R1 |
| SM-7.1 | Epic 7 (F7) | **US-7.1** — Be Automatically Assigned the Correct Role at Login | PER-03 | *JTBD-03.3 → Configure:* Dana's pre-configured email is recognized at session creation and the JWT is issued with `role: "system_owner"` — no manual role selection required | R1 |
| SM-7.3 | Epic 7 (F7) | **US-7.3** — Be Prevented From Submitting the Assessment as a System Owner | PER-03 | *JTBD-03.2 → Dataset integrity:* Attempting to start an assessment with a System Owner email returns a 403 error before any questions are displayed — no contamination of the response dataset | R1 |

---

### STG-02: Answer Questions

| SM-ID | Epic | Story | Persona | NaC (JTBD Source) | Rel |
|---|---|---|---|---|---|
| SM-0.1 | Epic 0 (F0) | **US-0.1** — Navigate the Assessment Section by Section | PER-01, PER-02 | *JTBD-01.1 → Answer – Session 1:* Previous/Next controls transition between sections without a full-page reload; previously entered answers are preserved on return to a section | R1 |
| SM-0.2 | Epic 0 (F0) | **US-0.2** — Track Progress Through the Assessment | PER-01, PER-02 | *JTBD-01.1 → Answer – Session 1:* A persistent step indicator shows "Section N of M" at all times; respondent is never surprised by the number of remaining sections | R1 |
| SM-0.4 | Epic 0 (F0) | **US-0.4** — Be Blocked With Unanswered Required Questions | PER-01, PER-02 | *JTBD-01.2 → Correct:* Clicking Next with a required question blank displays an inline error per unanswered field; navigation is blocked until all required questions on the section are answered | R1 |
| SM-2.1 | Epic 2 (F2) | **US-2.1** — Answer Single-Choice and Multi-Choice Questions | PER-01 | *JTBD-01.1 → Answer – Session 1:* Single-choice renders as radio buttons with one selection enforced; multi-choice renders as checkboxes; both validate correctly before advancing | R1 |
| SM-2.2 | Epic 2 (F2) | **US-2.2** — Add a Custom "Other" Answer to Choice Questions | PER-02 | *JTBD-02.3 → Add "Other" Free-Text Context:* Selecting "Other" on a multi-choice question reveals an inline free-text input (≤ 500 chars with visible counter); deselecting "Other" hides and clears the field | R1 |
| SM-2.3 | Epic 2 (F2) | **US-2.3** — Rate Agreement on a Likert Scale | PER-01 | *JTBD-01.1 → Answer – Session 1:* Likert questions render 5 labeled radio buttons; the selected integer value (1–5) is stored and validated server-side; keyboard arrow-key navigation is functional | R1 |
| SM-2.4 | Epic 2 (F2) | **US-2.4** — Rank Items by Priority Using Drag-and-Drop or Numbered Input | PER-02 | *JTBD-02.1 → Complete Ranking Questions:* Priya can rank 5 capability items in under 2 minutes using drag-and-drop or numbered fallback; the ranked order is preserved identically on navigation away and return | R1 |
| SM-2.5 | Epic 2 (F2) | **US-2.5** — Write Short and Long Free-Text Answers | PER-02 | *JTBD-02.3 → Add "Other" Free-Text Context:* Free-text long renders as a `<textarea>` with a visible resize handle and character counter (max 2000); exceeding the limit shows a clear error before the field is submitted | R1 |

---

### STG-03: Pause & Persist

| SM-ID | Epic | Story | Persona | NaC (JTBD Source) | Rel |
|---|---|---|---|---|---|
| SM-1.2 | Epic 1 (F1) | **US-1.2** — Resume the Assessment After Closing the Browser | PER-01 | *JTBD-01.1 → Resume:* When a returning respondent re-enters their email, all previously saved answers are pre-populated and the assessment opens at the last saved section — no manual re-entry required | R1 |
| SM-1.3 | Epic 1 (F1) | **US-1.3** — Have Session Persisted Across the Assessment Window | PER-02 | *JTBD-01.1 / JTBD-02.2 → Pause:* Session is stored server-side; closing the browser does not lose progress; `session_id` persisted in `localStorage`; no duplicate session records are created for the same email | R1 |
| SM-4.1 | Epic 4 (F4) | **US-4.1** — Have Answers Saved Automatically on Section Navigation | PER-01 | *JTBD-01.1 → Pause:* Auto-save triggers on every Next/Previous action and completes within 3 seconds; a "Saved at {time}" indicator is visible; save failure does not block navigation and retries automatically | R1 |
| SM-4.2 | Epic 4 (F4) | **US-4.2** — Have Answers Saved Periodically While Actively Answering | PER-02 | *JTBD-02.3 → Add "Other" Free-Text Context:* After 30 seconds of idle time with unsaved changes, an automatic background save triggers; the Save State Indicator transitions from "Unsaved changes" → "Saving…" → "Saved at {time}" | R1 |
| SM-4.3 | Epic 4 (F4) | **US-4.3** — Have All Previous Answers Pre-Populated on Return | PER-01 | *JTBD-01.1 → Resume:* On session resume, all question types (single-choice, multi-choice, Likert, ranking, free-text including "Other" text) are restored to their saved state before the first section renders | R1 |
| SM-7.4 | Epic 7 (F7) | **US-7.4** — Have Session Token Expire With a Clear Recovery Path | PER-02 | *JTBD-02.2 → Load Previous Answers:* When a JWT expires mid-session, the client shows a warning that saved progress is preserved and redirects to identity re-entry; on re-authentication, all answers are reloaded from the server | R1 |

---

### STG-04: Review & Submit

| SM-ID | Epic | Story | Persona | NaC (JTBD Source) | Rel |
|---|---|---|---|---|---|
| SM-0.3 | Epic 0 (F0) | **US-0.3** — Review All Answers Before Submitting | PER-01, PER-02 | *JTBD-01.2 → Submit:* After the last section, a Review Step shows all sections and answers in read-only format with per-section Edit links; required unanswered questions are highlighted before the Submit button is active | R1 |
| SM-5.1 | Epic 5 (F5) | **US-5.1** — Submit the Assessment Exactly Once | PER-01 | *JTBD-01.2 → Submit:* The Submit button appears only on the Review Step; clicking it transitions the session from `draft` to `submitted`; a second submission from the same email is prevented by the system | R1 |
| SM-7.2 | Epic 7 (F7) | **US-7.2** — Be Blocked From Accessing the Dashboard as a Respondent | PER-01 | *JTBD-01.2 → Submit:* Navigating to `/dashboard` with a Respondent JWT returns 403 `ACCESS_DENIED`; no dashboard content flashes before the error; respondents cannot read any other respondent's session data | R1 |
| SM-9.1 | Epic 9 (F9) | **US-9.1** — Receive a Clear Confirmation After Submitting | PER-01 | *JTBD-01.2 → Submit:* The Confirmation Screen displays "Assessment Submitted!", the respondent's name, and the edit deadline formatted as "Day, Month DD, YYYY at HH:MM timezone" — visible immediately after a successful 200 response | R2 |

---

### STG-05: Return & Edit

| SM-ID | Epic | Story | Persona | NaC (JTBD Source) | Rel |
|---|---|---|---|---|---|
| SM-5.2 | Epic 5 (F5) | **US-5.2** — Edit Submitted Answers Before the Due Date | PER-02 | *JTBD-02.2 → Load Previous Answers:* A returning submitted respondent within the edit window sees a re-entry banner with the due date; the form is fully editable and all question types (including ranking order and "Other" text) are pre-populated exactly | R1 |
| SM-5.3 | Epic 5 (F5) | **US-5.3** — See a Read-Only View After the Assessment Due Date | PER-01 | *JTBD-01.2 → Re-submit:* After the due date, all form inputs are read-only; a persistent banner states "This assessment is now closed"; Previous/Next navigation still works for reviewing; server-side enforces 403 `ASSESSMENT_CLOSED` on save attempts | R1 |
| SM-5.4 | Epic 5 (F5) | **US-5.4** — Be Prevented From Submitting After the Due Date | PER-01 | *JTBD-01.2 → Re-submit:* Attempting to submit after the due date returns a clear error message; draft sessions are also locked; the due-date check is enforced server-side on every submission attempt | R1 |
| SM-9.2 | Epic 9 (F9) | **US-9.2** — See a Re-Entry Banner When Returning After Submitting | PER-02 | *JTBD-02.2 → Load Previous Answers:* A non-dismissible banner appears at the top of every section during a re-entry edit session, displaying the exact due date from `assessment_config`; the form is fully editable beneath the banner | R2 |
| SM-9.3 | Epic 9 (F9) | **US-9.3** — See a Clear "Assessment Closed" Message After the Due Date | PER-01 | *JTBD-01.2 → Re-submit:* After the due date, a dismissible "Assessment is now closed" banner appears on every section view; all question inputs are non-interactive; server-side 403 is returned for any save attempt | R2 |

---

### STG-06: Monitor & Export

| SM-ID | Epic | Story | Persona | NaC (JTBD Source) | Rel |
|---|---|---|---|---|---|
| SM-6.1 | Epic 6 (F6) | **US-6.1** — View a Paginated List of All Respondents and Their Status | PER-03 | *JTBD-03.1 → Mid-Window Check:* Dashboard response list shows Name, Email, Team Type, Status, Submitted At, Last Modified At; paginated at 25/page; sortable columns; summary row showing total/submitted/draft counts | R1 |
| SM-6.2 | Epic 6 (F6) | **US-6.2** — Search and Filter Responses by Team Type, Status, and Date | PER-03 | *JTBD-03.1 → Drill Down:* Clicking a single team-type filter immediately narrows the response list to that segment; combined filter + search + date range all apply simultaneously; filter state is preserved in URL parameters | R1 |
| SM-6.3 | Epic 6 (F6) | **US-6.3** — Drill Into an Individual Respondent's Full Answers | PER-03 | *JTBD-03.2 → Drill into Anomaly:* Clicking any respondent row navigates to the full response view in ≤ 2 clicks; all answer types (ranking, free-text, Likert, choice) are rendered legibly in read-only mode; back button preserves filter state | R1 |
| SM-6.4 | Epic 6 (F6) | **US-6.4** — View Aggregated Analytics Charts for All Responses | PER-03 | *JTBD-03.2 → Present Dashboard Charts:* Response counts by team type shown as horizontal bar chart; Likert distributions as stacked bar charts; ranking questions show average rank ordering; all charts respond to active team-type filter | R1 |
| SM-6.5 | Epic 6 (F6) | **US-6.5** — Export All Responses to CSV | PER-03 | *JTBD-03.2 → Export CSV:* Exported CSV contains all submitted responses with human-readable column headers (question text, not codes), respondent name/email/team type/timestamps; respects active filters; no manual post-processing required | R1 |
| SM-8.1 | Epic 8 (F8) | **US-8.1** — View the Current Assessment Configuration | PER-03 | *JTBD-03.3 → Configure:* The Config Panel displays current due date, launch date, and computed status (Active/Closed/Upcoming) at a glance; a status badge is visible in the dashboard header at all times; accessible only to System Owner role | R2 |
| SM-8.2 | Epic 8 (F8) | **US-8.2** — Update the Assessment Due Date With a Confirmation Step | PER-03 | *JTBD-03.3 → Configure:* The date picker for due date is accessible from the Config Panel; saving displays a confirmation dialog showing the old and new dates before committing; the change is logged in `config_audit_log` | R2 |
| SM-8.3 | Epic 8 (F8) | **US-8.3** — Have Configuration Changes Reflected Immediately for Respondents | PER-03 | *JTBD-03.3 → Configure:* After a due date update, the next respondent page load reflects the new deadline in the edit-window banner; if the new due date is in the past, the assessment transitions to `Closed` immediately | R2 |

---

## NaC Derivation Table

Full traceability: **JTBD Outcome → Journey Stage → NaC → Story**

| JTBD-ID | JTBD Outcome (Condensed) | Journey Stage | NaC (Testable Statement) | Story |
|---|---|---|---|---|
| JTBD-01.1 | Zero data loss on session resume | STG-03: Pause — JRN-01.1 S4 | Given a respondent who partially completed section 2 and closed the browser, when they re-enter with the same email, then all previously entered answers are pre-populated with no manual action required | US-1.2, US-4.3 |
| JTBD-01.1 | 20-minute completion target | STG-02: Answer — JRN-01.1 S3 | Given a non-technical Program/Project respondent, when they complete all relevant sections across one or two sessions, then total active answering time is ≤ 20 minutes | US-0.1, US-0.2 |
| JTBD-01.1 | Visible save-state indicator | STG-03: Pause — JRN-01.1 S4 | Given an active assessment session, when the respondent navigates between sections, then a "Saved at {time}" indicator is visible within 3 seconds of navigation | US-4.1, US-4.2 |
| JTBD-01.1 | Session server-side persistence | STG-03: Pause — JRN-01.1 S4 | Given a respondent who closes the browser tab, when they re-open the assessment URL and enter their email, then the session is loaded from the server — not browser memory | US-1.3 |
| JTBD-01.2 | Single-submission edit | STG-05: Return — JRN-01.2 S1-2 | Given a respondent who has submitted, when they re-enter before the due date, then the form loads in editable mode pre-populated with prior answers and no second submission record is created | US-5.2, US-5.1 |
| JTBD-01.2 | Post-submission edit deadline visible | STG-04: Submit — JRN-01.1 S6 | Given a respondent who has just submitted, when the confirmation screen loads, then it displays the edit deadline date prominently alongside "Your assessment has been submitted" | US-9.1 |
| JTBD-01.2 | No late submission accepted | STG-05: Return — JRN-01.2 S5 | Given a respondent attempting to submit after the due date, when they click Submit, then the server returns an error and the session transitions to read-only with no new record created | US-5.3, US-5.4 |
| JTBD-01.2 | Re-entry recognized immediately | STG-05: Return — JRN-01.2 S1 | Given a returning respondent, when they enter their email on the start page, then the system shows "Welcome back — your submission is on file. You can edit until {Due Date}" without additional steps | US-1.2, US-9.2 |
| JTBD-01.3 | Relevant section routing | STG-01: Identify — JRN-01.1 S2 | Given a respondent who selects "Program/Project" team type, when the assessment loads, then no Platform Engineering or Infrastructure/Cloud-specific sections are displayed | US-3.1, US-3.2 |
| JTBD-01.3 | Required sections always present | STG-01: Identify — JRN-01.1 S2 | Given any team type selection, when the section list is computed, then General DP Alignment, Current Status, and Feedback & Adaptability are always included | US-3.2 |
| JTBD-01.3 | Blocked from irrelevant content | STG-01: Identify — JRN-01.1 S2 | Given a respondent who completes a Program/Project assessment, when they answer 100% of displayed questions, then they encounter zero empty or inapplicable sections | US-3.1, US-3.4 |
| JTBD-02.1 | Ranking persistence | STG-03: Pause — JRN-02.1 S3 | Given a respondent who drag-and-drops a ranking question to a custom order, when they navigate away and return, then the ranking order is identical to what was saved | US-4.3, US-2.4 |
| JTBD-02.1 | Ranking accessibility fallback | STG-02: Answer — JRN-02.1 S3 | Given a respondent using keyboard navigation, when they encounter a ranking question, then they can reorder items via numbered input without drag-and-drop | US-2.4 |
| JTBD-02.1 | Platform Engineering routing | STG-01: Identify — JRN-02.1 S1 | Given a respondent who selects "Platform Engineering", when sections load, then CI/CD Integration, Plugin Ecosystem, and Onboarding Automation sections appear without program-level sections | US-3.3 |
| JTBD-02.2 | Revised submission is sole record | STG-05: Return — JRN-02.2 S4 | Given a respondent who re-enters after submitting and changes a ranking answer, when they re-submit, then the dashboard shows exactly one response record for their email with the updated answer | US-5.1, US-5.2 |
| JTBD-02.2 | Exact-state restoration on re-entry | STG-05: Return — JRN-02.2 S2 | Given a returned respondent within the edit window, when the form loads, then all ranking positions, "Other" text, and all selections are identical to the last submission | US-4.3, US-5.2 |
| JTBD-02.2 | Edit window banner on re-entry | STG-05: Return — JRN-02.2 S1 | Given a returning respondent within the edit window, when they land on any section, then a non-dismissible banner shows "You can update your answers until {due_date}" | US-9.2 |
| JTBD-02.3 | "Other" free-text preserved verbatim | STG-03: Pause — JRN-02.1 S4 | Given a respondent who selects "Other" on a multi-choice question and enters 200 characters of text, when they save and re-enter the next day, then the full text is pre-populated verbatim | US-2.2, US-4.3 |
| JTBD-02.3 | Character limit communicated | STG-02: Answer — JRN-02.1 S4 | Given a respondent typing in an "Other" or free-text long field, when they begin typing, then a character counter is visible; at 500 characters the counter turns red and further characters are blocked | US-2.2, US-2.5 |
| JTBD-03.1 | Real-time team-type counts | STG-06: Monitor — JRN-03.1 S3 | Given an active assessment window, when a new respondent submits, then the dashboard response count for their team type increments within 60 seconds without a page refresh | US-6.1 |
| JTBD-03.1 | One-click team-type filter | STG-06: Monitor — JRN-03.1 S4 | Given the dashboard response list, when the System Owner clicks a single team type filter, then the list immediately shows only that team type's responses with no additional navigation required | US-6.2 |
| JTBD-03.1 | Individual drill-down in ≤ 2 clicks | STG-06: Monitor — JRN-03.1 S4 | Given the dashboard response list, when the System Owner clicks a respondent row, then the full answer set for that respondent is visible in at most 2 clicks from the list | US-6.3 |
| JTBD-03.2 | Export completeness | STG-06: Monitor — JRN-03.2 S4 | Given a closed assessment with N submissions, when the System Owner exports CSV, then the file contains all N rows with human-readable column headers and no duplicate respondent email addresses | US-6.5 |
| JTBD-03.2 | Dashboard charts presentation-ready | STG-06: Monitor — JRN-03.2 S5 | Given the analytics dashboard, when displayed at 1080p projection, then Likert distributions, ranking results, and choice breakdowns are legible; charts respond to active team-type filters | US-6.4 |
| JTBD-03.2 | Deduplication guarantee visible | STG-06: Monitor — JRN-03.2 S2 | Given the response list view, when the System Owner reviews it, then a deduplication status banner is visible confirming zero duplicate email addresses were detected | US-5.1, US-6.1 |
| JTBD-03.3 | Due date update propagation | STG-06: Configure — JRN-03.1 S1 | Given an active assessment, when the System Owner updates the due date from the dashboard, then the respondent edit-window banner reflects the new date on the next page load without any code deployment | US-8.3 |
| JTBD-03.3 | Configuration guard | STG-06: Configure — JRN-03.1 S1 | Given the System Owner entering a new due date, when they click Save, then a confirmation dialog displays the old and new dates before the change is committed | US-8.2 |
| JTBD-03.3 | Role-enforced dashboard access | STG-06: Configure — JRN-03.1 S1-2 | Given Dana's System Owner email, when she logs in, then she is automatically routed to the dashboard with full access — and a Respondent-role attempt to access `/dashboard` is blocked with 403 | US-7.1, US-7.2 |

---

## Release Planning

### R1: "Core Assessment Experience" — MVP

**Theme:** Every persona can complete their primary journey end-to-end. Respondents can start, navigate, save, and submit. System Owner can monitor and export. Security is enforced.

**JTBD Addressed:** JTBD-01.1, JTBD-01.2 (partial), JTBD-01.3, JTBD-02.1, JTBD-02.2 (partial), JTBD-02.3, JTBD-03.1, JTBD-03.2, JTBD-03.3 (partial)

**Stories Included (32 stories):**

| Story | Epic | Priority | Journey Coverage |
|---|---|---|---|
| US-0.1 | F0 | P0 | STG-02 |
| US-0.2 | F0 | P0 | STG-02 |
| US-0.3 | F0 | P0 | STG-04 |
| US-0.4 | F0 | P0 | STG-02 |
| US-1.1 | F1 | P0 | STG-01 |
| US-1.2 | F1 | P0 | STG-03 |
| US-1.3 | F1 | P0 | STG-03 |
| US-2.1 | F2 | P0 | STG-02 |
| US-2.2 | F2 | P0 | STG-02 |
| US-2.3 | F2 | P0 | STG-02 |
| US-2.4 | F2 | P0 | STG-02 |
| US-2.5 | F2 | P0 | STG-02 |
| US-3.1 | F3 | P0 | STG-01 |
| US-3.2 | F3 | P0 | STG-01 |
| US-3.3 | F3 | P0 | STG-01 |
| US-3.4 | F3 | P0 | STG-01 |
| US-4.1 | F4 | P0 | STG-03 |
| US-4.2 | F4 | P0 | STG-03 |
| US-4.3 | F4 | P0 | STG-03 |
| US-5.1 | F5 | P0 | STG-04 |
| US-5.2 | F5 | P0 | STG-05 |
| US-5.3 | F5 | P0 | STG-05 |
| US-5.4 | F5 | P0 | STG-05 |
| US-6.1 | F6 | P0 | STG-06 |
| US-6.2 | F6 | P0 | STG-06 |
| US-6.3 | F6 | P0 | STG-06 |
| US-6.4 | F6 | P0 | STG-06 |
| US-6.5 | F6 | P0 | STG-06 |
| US-7.1 | F7 | P0 | STG-01 |
| US-7.2 | F7 | P0 | STG-04 |
| US-7.3 | F7 | P0 | STG-01 |
| US-7.4 | F7 | P0 | STG-03 |

**Persona Coverage — R1:**

| Persona | Journey Completed in R1 | Gaps |
|---|---|---|
| PER-01 Marcus | Full journey: Arrive → Identify → Answer → Pause → Resume → Review → Submit → Read-only after deadline | Post-submission confirmation screen (US-9.1) deferred to R2; Marcus sees functional submit but minimal confirmation messaging |
| PER-02 Priya | Full journey: Identify & Route → Technical Sections → Ranking → "Other" Free-Text → Submit → Re-entry Edit | Re-entry banner (US-9.2) deferred to R2; Priya can edit but banner communication is reduced |
| PER-03 Dana | Full journey: Dashboard access → Response list → Filter → Drill-down → Analytics → CSV export | Config panel (US-8.1–8.3) deferred to R2; due date must be set at deployment in R1 |

**R1 completes journeys:** JRN-01.1 (full), JRN-01.2 (full, without explicit updated-submission confirmation copy), JRN-02.1 (full), JRN-02.2 (full, without re-entry banner polish), JRN-03.1 (partial — no config panel), JRN-03.2 (full)

---

### R2: "Trust, Clarity & Control" — Pre-Launch Polish

**Theme:** Respondent trust signals (confirmation screens, edit window banners, closed-assessment messaging) and System Owner self-service configuration. Completes all journeys.

**JTBD Addressed:** JTBD-01.2 (completes), JTBD-02.2 (completes), JTBD-03.3 (completes)

**Stories Included (6 stories):**

| Story | Epic | Priority | Journey Coverage |
|---|---|---|---|
| US-8.1 | F8 | P1 | STG-06 |
| US-8.2 | F8 | P1 | STG-06 |
| US-8.3 | F8 | P1 | STG-06 |
| US-9.1 | F9 | P1 | STG-04 |
| US-9.2 | F9 | P1 | STG-05 |
| US-9.3 | F9 | P1 | STG-05 |

**Persona Coverage — R2:**

| Persona | Journey Completed in R2 | Adds to R1 |
|---|---|---|
| PER-01 Marcus | JRN-01.2 fully complete with explicit "Your submission has been updated" confirmation | US-9.1 (confirmation screen), US-9.3 (closed message) |
| PER-02 Priya | JRN-02.2 fully complete with non-dismissible re-entry banner and edit-deadline communication | US-9.2 (re-entry banner) |
| PER-03 Dana | JRN-03.1 fully complete with self-service due date configuration from dashboard | US-8.1, US-8.2, US-8.3 |

**R2 completes journeys:** JRN-01.2 (confirmation copy complete), JRN-02.2 (banner complete), JRN-03.1 (config panel complete)

---

## Coverage Analysis

### 6.1 Persona Coverage by Release

| Persona | R1 Primary Journey Complete | R2 Primary Journey Complete | Notes |
|---|---|---|---|
| PER-01 Marcus | ✅ Yes — JRN-01.1, JRN-01.2 functional | ✅ Yes — JRN-01.2 fully polished (confirmation copy, closed message) | Full coverage after R2 |
| PER-02 Priya | ✅ Yes — JRN-02.1, JRN-02.2 functional | ✅ Yes — JRN-02.2 fully polished (re-entry banner) | Full coverage after R2 |
| PER-03 Dana | ✅ Yes — JRN-03.2 full; JRN-03.1 partial (no config panel) | ✅ Yes — JRN-03.1 complete with self-service config | Full coverage after R2 |

### 6.2 JTBD Coverage by Release

| JTBD-ID | R1 | R2 | Coverage Note |
|---|---|---|---|
| JTBD-01.1 | ✅ Full | — | Auto-save, resume, persistence all in R1 |
| JTBD-01.2 | ⚠️ Partial | ✅ Full | Mechanics in R1; confirmation messaging complete in R2 |
| JTBD-01.3 | ✅ Full | — | Section routing fully addressed in R1 |
| JTBD-02.1 | ✅ Full | — | Ranking, routing, fallback all in R1 |
| JTBD-02.2 | ⚠️ Partial | ✅ Full | Edit mechanics in R1; re-entry banner/UX complete in R2 |
| JTBD-02.3 | ✅ Full | — | "Other" free-text and long free-text in R1 |
| JTBD-03.1 | ✅ Full | — | Dashboard, filter, drill-down all in R1 |
| JTBD-03.2 | ✅ Full | — | CSV export and analytics charts in R1 |
| JTBD-03.3 | ⚠️ Partial | ✅ Full | RBAC in R1; self-service config panel in R2 |

### 6.3 Journey Stage Coverage

| Stage | R1 Stories | R2 Stories | Coverage |
|---|---|---|---|
| STG-01: Arrive & Identify | US-1.1, US-3.1, US-3.2, US-3.3, US-3.4, US-7.1, US-7.3 | — | ✅ Full in R1 |
| STG-02: Answer Questions | US-0.1, US-0.2, US-0.4, US-2.1, US-2.2, US-2.3, US-2.4, US-2.5 | — | ✅ Full in R1 |
| STG-03: Pause & Persist | US-1.2, US-1.3, US-4.1, US-4.2, US-4.3, US-7.4 | — | ✅ Full in R1 |
| STG-04: Review & Submit | US-0.3, US-5.1, US-7.2 | US-9.1 | ✅ Functional in R1; messaging polished in R2 |
| STG-05: Return & Edit | US-5.2, US-5.3, US-5.4 | US-9.2, US-9.3 | ✅ Functional in R1; UX trust signals in R2 |
| STG-06: Monitor & Export | US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-7.1, US-7.3 | US-8.1, US-8.2, US-8.3 | ✅ Full visibility in R1; self-service config in R2 |

### 6.4 Gap Analysis

**Journey stages with no mapped stories:**
- None. All six backbone stages have at least one R1 story.

**JTBD outcomes with no derived NaC:**
- None. All 9 JTBD outcomes have at least one derived NaC in the NaC Derivation Table.

**Orphan stories (not mapped to any journey stage):**
- None. All 38 user stories (US-0.1 through US-9.3) are placed on the map.

**Journey stages partially served in R1 (addressed in R2):**
- STG-04 (Review & Submit): US-9.1 (confirmation screen) deferred to R2 — functional submission works but messaging is minimal.
- STG-05 (Return & Edit): US-9.2 (re-entry banner) and US-9.3 (closed message) deferred to R2 — edit mechanics functional but trust-signal communication is reduced.
- STG-06 (Monitor & Export): US-8.1–8.3 (config panel) deferred to R2 — Dana cannot self-serve the due date in R1 without a code deploy.

**Risks identified from gap analysis:**
- **R1 risk — Edit window discoverability:** Without US-9.1 and US-9.2, respondents who submit in R1 receive no explicit edit deadline communication. This directly affects JTBD-01.2 and JTBD-02.2 and is the highest-priority R2 item.
- **R1 risk — Dana's configuration dependency:** Without US-8.1–8.3, Dana must rely on a code deploy to set the due date. This creates a deployment dependency that should be resolved before launch (hence P1).

---

## NaC-to-Acceptance Criteria Mapping

Verifies that NaC derived from JTBD align with the acceptance criteria defined in UserStories-AssessmentForm.md.

| NaC Statement | Story | AC Alignment | Verdict |
|---|---|---|---|
| All previously entered answers pre-populated with no manual action on return | US-1.2 | AC: "system detects existing session and loads all previously saved answers"; "All previously answered questions are pre-populated" | ✅ Aligned |
| "Saved at {time}" indicator visible within 3 seconds of navigation | US-4.1 | AC: "Save State Indicator is always visible… showing 'Saved at {time}' after success"; "Auto-save completes within 3 seconds" | ✅ Aligned |
| No Platform Engineering sections displayed for Program/Project respondents | US-3.1 | AC: "system computes and loads only the sections mapped to that team type"; "No empty or irrelevant sections are displayed" | ✅ Aligned |
| Ranking order identical on navigation away and return | US-4.3, US-2.4 | US-4.3 AC: "ranking… restored to their saved state"; US-2.4 AC: "payload stores items as an ordered array" | ✅ Aligned |
| Numbered input fallback available for ranking | US-2.4 | AC: "A numbered input fallback is available next to each item" | ✅ Aligned |
| One response record per email after re-submission | US-5.1, US-5.2 | US-5.1 AC: "Only one submitted session per email address is permitted"; US-5.2 AC: "no need to re-submit to preserve changes" | ✅ Aligned |
| Confirmation screen shows edit deadline prominently | US-9.1 | AC: "You can return to edit your responses until {due_date formatted as…}" | ✅ Aligned |
| After due date: 403 `ASSESSMENT_CLOSED` returned on save | US-5.3, US-5.4 | US-5.3 AC: "auto-save requests rejected with 403 `ASSESSMENT_CLOSED`"; US-5.4 AC: "due date check is performed server-side on every submission attempt" | ✅ Aligned |
| Dashboard team-type count increments within 60 seconds | US-6.1 | AC: "summary row above the table shows total responses, submitted count, draft count"; implied near-real-time from JTBD-03.1 | ✅ Aligned (NaC adds the 60s specificity from JTBD NaC preview) |
| One-click team-type filter narrows response list | US-6.2 | AC: "A multi-select team type filter allows filtering by one or more of the four team types simultaneously" | ✅ Aligned |
| Full response view in ≤ 2 clicks | US-6.3 | AC: "Clicking any row in the response list navigates to an individual response view" (single click = 1 click from list = ≤ 2 clicks) | ✅ Aligned |
| CSV with human-readable column headers, no post-processing | US-6.5 | AC: "one column per question (by question title) with human-readable answer values" | ✅ Aligned |
| Confirmation dialog shows old and new due dates before commit | US-8.2 | AC: "confirmation dialog: 'You are about to change the assessment due date from {current} to {new}'" | ✅ Aligned |
| Due date banner updated on next page load after config change | US-8.3 | AC: "next session load by any respondent reflects the new due date"; "Respondents… see the updated deadline on their next page action" | ✅ Aligned |
| Non-dismissible re-entry banner with due date | US-9.2 | AC: "persistent re-entry banner is displayed at the top of every section"; "The re-entry banner is not dismissible" | ✅ Aligned |
| Session token expiry warning with saved-data reassurance | US-7.4 | AC: "Any unsaved changes at the time of expiry trigger a warning: 'Your session expired… your last saved answers are preserved'" | ✅ Aligned |
| Platform Engineering sections surfaced; no program-level content | US-3.3 | AC: "routes to: General DP Alignment → Current Status → Platform Needs… → Feedback & Adaptability (7 sections)"; "Sections specific to other team types… do not appear" | ✅ Aligned |
| System Owner email blocked from respondent assessment entry | US-7.3 | AC: "Attempting to start an assessment session with a System Owner email returns 403" | ✅ Aligned |

**Result:** All 18 NaC-to-AC mappings are aligned. No NaC contradicts or exceeds the acceptance criteria defined in UserStories-AssessmentForm.md. NaC in most cases are equal to or more specific than the AC (adding measurable thresholds from JTBD success measures), which is the intended relationship.

---

*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
