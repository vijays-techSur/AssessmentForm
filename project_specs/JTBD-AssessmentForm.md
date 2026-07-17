# JTBD: AssessmentForm-Express
## Jobs-to-be-Done Document

| Field | Value |
|---|---|
| **Product Name** | AssessmentForm-Express |
| **Version** | 1.0 |
| **Date** | 2026-07-17 |
| **Related Personas** | PERSONAS-AssessmentForm.md |
| **Related PRD** | PRD-AssessmentForm.md |
| **Status** | Draft |

---

## JTBD Summary Table

| JTBD-ID | Persona | Job Statement (condensed) | Priority |
|---|---|---|---|
| JTBD-01.1 | PER-01 Marcus Reid | Complete a focused, relevant assessment without losing progress mid-session | P0 |
| JTBD-01.2 | PER-01 Marcus Reid | Confidently submit and correct responses before the deadline closes | P0 |
| JTBD-01.3 | PER-01 Marcus Reid | Navigate only sections relevant to my team type, not irrelevant technical content | P0 |
| JTBD-02.1 | PER-02 Priya Nair | Express technically nuanced, priority-ordered capability expectations | P0 |
| JTBD-02.2 | PER-02 Priya Nair | Revise submitted answers after a team discussion within the edit window | P0 |
| JTBD-02.3 | PER-02 Priya Nair | Provide open-ended context beyond predefined answer options | P0 |
| JTBD-03.1 | PER-03 Dana Okafor | Monitor participation across all team types during the live collection window | P0 |
| JTBD-03.2 | PER-03 Dana Okafor | Produce a clean, analysis-ready dataset for the CTO decision brief | P0 |
| JTBD-03.3 | PER-03 Dana Okafor | Configure and control the assessment window without engineering intervention | P1 |

---

## PER-01: Marcus Reid — Enterprise Team Member (Respondent)

---

### JTBD-01.1: Complete a Focused Assessment Without Losing Progress

**Job Statement:**
When I sit down to complete the DP assessment between back-to-back meetings, I want to answer questions at my own pace across one or two sittings, so I can submit a complete and thoughtful response without starting over if my session is interrupted.

**Current Alternatives:**
- Rushes through online surveys in one sitting, submitting incomplete or poorly considered answers to avoid losing progress
- Leaves browser tabs open for days hoping not to accidentally close them
- Copies answers into a notepad as a personal backup

**Hiring Criteria:**
- Auto-saves responses on every section transition without requiring manual action
- On return visit, all previously entered answers are pre-populated exactly as left
- A visible save-state indicator ("Saved" / "Saving…") reassures the respondent that progress is safe
- Assessment completes in under 20 minutes across one or two sessions for a typical non-technical respondent

**Success Measure:** Respondent with 2+ interruptions across 2 sessions reports zero lost answers on return and completes submission within 20 minutes total.

**Related Features:** F0, F1, F4
**Priority:** P0

---

### JTBD-01.2: Submit with Confidence and Correct Mistakes Before the Deadline

**Job Statement:**
When I realize I answered a question hastily or want to reconsider a response after more thought, I want to re-enter the assessment and update my answers before the due date, so I can ensure my submission accurately reflects my team's actual position.

**Current Alternatives:**
- Sends a follow-up email to the coordinator asking for a correction — often goes unacknowledged
- Resubmits a new form entry with a slightly different name to "replace" the original — creating duplicates
- Accepts the wrong answer and hopes it doesn't skew the results

**Hiring Criteria:**
- Post-submission confirmation clearly states the edit deadline (e.g., "You can return to edit until July 31")
- Re-entering with the same email pre-populates all prior answers in editable mode
- One email address maps to exactly one submission — no duplicate entries in the dataset
- After the deadline, a read-only view confirms the assessment is closed, not a confusing blank form

**Success Measure:** Respondent successfully locates, edits, and re-submits one changed answer within 3 minutes of re-entering the form, without creating a duplicate submission.

**Related Features:** F1, F5, F9
**Priority:** P0

---

### JTBD-01.3: Navigate Only Sections Relevant to My Team Role

**Job Statement:**
When I start the assessment as a Program/Project team member, I want to see only the sections and questions that apply to my team's work, so I can focus on providing useful answers rather than being confused or slowed down by irrelevant technical content.

**Current Alternatives:**
- Skips questions that don't seem to apply — leaving blanks that lower perceived data quality
- Answers infrastructure questions with guesses to avoid submitting an incomplete form
- Abandons the assessment mid-way due to frustration with irrelevant questions

**Hiring Criteria:**
- Team type is selected once at the start and drives all subsequent section visibility
- No empty, inapplicable, or "N/A by default" sections are displayed
- Mandatory sections (General DP Alignment, Current Status, Feedback & Adaptability) always appear
- Role-specific optional sections are surfaced or hidden automatically based on the selected team type

**Success Measure:** PER-01 respondent completing a Program/Project path encounters zero Platform Engineering-specific sections and answers 100% of displayed questions without skipping.

**Related Features:** F0, F3
**Priority:** P0

---

## PER-02: Priya Nair — Platform Engineering Respondent

---

### JTBD-02.1: Express Technically Precise, Priority-Ordered Capability Expectations

**Job Statement:**
When I evaluate DP tools on behalf of my platform engineering team, I want to rank capabilities (CI/CD integration, plugin extensibility, onboarding automation) in order of importance rather than just selecting yes/no, so I can ensure the assessment data accurately reflects my team's actual priority ordering — not just a flat list of interests.

**Current Alternatives:**
- Uses a private Notion doc to rank capabilities and shares it informally with the team lead
- Adds ranking context in a survey's free-text comment field, which rarely survives aggregation
- Flags the limitation to the System Owner verbally after submitting

**Hiring Criteria:**
- Ranking questions support drag-and-drop reordering with a numbered fallback for accessibility and browser compatibility
- Ranking results are preserved exactly on save and resume — no reordering on reload
- Platform Engineering-specific sections (CI/CD, plugin ecosystem, onboarding) appear without navigating through program-level sections
- Answers reflect the full priority spectrum, not just binary selection

**Success Measure:** Priya can rank 5 capability items by priority in under 2 minutes using either drag-and-drop or keyboard/numbered input, with ranking preserved identically on re-entry.

**Related Features:** F2, F3, F4
**Priority:** P0

---

### JTBD-02.2: Revise Submitted Answers After a Team Discussion

**Job Statement:**
When I submit the assessment before reviewing it with my team lead and later discover our priorities have shifted, I want to re-enter the form within the edit window and update my responses, so I can ensure the final submission reflects a consensus view rather than my initial individual take.

**Current Alternatives:**
- Accepts the submitted answers as final — team consensus is captured nowhere
- Asks a colleague to submit a separate entry, creating duplicate data
- Emails the System Owner requesting a manual edit — which is ad hoc and unreliable

**Hiring Criteria:**
- Re-entry with the same email pre-populates all previously submitted answers in fully editable mode
- A clear banner communicates the remaining edit window (e.g., "You can update your answers until [Due Date]")
- Any changes to ranking, multi-choice, or free-text answers are saved and finalized on re-submission
- System confirms updated submission with a new timestamp confirmation

**Success Measure:** Priya re-enters after a 3-day gap, changes her CI/CD ranking position from #2 to #1, and re-submits — the dashboard shows only one submission from her email with the updated answer.

**Related Features:** F1, F5, F9
**Priority:** P0

---

### JTBD-02.3: Provide Specific Context Beyond Predefined Answer Options

**Job Statement:**
When predefined answer choices don't cover a specific integration requirement or capability nuance my team has, I want to add free-text context alongside or instead of selecting a predefined option, so I can ensure my team's specific technical requirements are formally documented and not lost.

**Current Alternatives:**
- Selects the closest available option even when it doesn't match — introducing inaccuracy
- Relies entirely on a separate free-text comment field at the end, which may be overlooked in analysis
- Documents requirements in a separate email to the System Owner outside the assessment

**Hiring Criteria:**
- Multi-choice questions include an "Other — please specify" option that reveals a free-text input on selection
- Free-text (long) fields are available for open-ended questions requiring detailed technical explanation
- "Other" text is preserved on save and pre-populated on resume/re-entry
- Character limits (if any) are clearly communicated and generous enough for technical descriptions

**Success Measure:** Priya selects "Other" on a multi-choice question, enters a 200-character technical specification, saves, and the text is intact verbatim when she re-enters the form the following day.

**Related Features:** F2, F4
**Priority:** P0

---

## PER-03: Dana Okafor — System Owner / DP Adoption Lead

---

### JTBD-03.1: Monitor Participation Across All Team Types During the Live Window

**Job Statement:**
When the two-week assessment window is open, I want to see real-time participation counts broken down by team type and completion status, so I can identify under-represented segments early enough to send targeted reminders before the deadline passes.

**Current Alternatives:**
- Sends a group email asking team leads for manual headcount — responses are slow and inconsistent
- Discovers low response rates only after the window closes, when it's too late to act
- Maintains a personal spreadsheet of expected vs. received responses, updated manually by email

**Hiring Criteria:**
- Dashboard displays response counts per team type (Program/Project, Platform Engineering, Infrastructure/Cloud, Data/API Governance) updated in near real-time
- Completion status (started vs. submitted) is visible per respondent row
- Filter capability allows drilling to a specific team type's response list in one click
- Dashboard is accessible from any browser without requiring a code deploy or system restart

**Success Measure:** Dana checks the dashboard on day 5 of the window, identifies that Infrastructure/Cloud has only 1 response vs. 8 expected, and issues a targeted reminder — all within 10 minutes and without any manual data gathering.

**Related Features:** F6, F7
**Priority:** P0

---

### JTBD-03.2: Produce a Clean, Analysis-Ready Dataset for the Decision Brief

**Job Statement:**
When the collection window closes, I want to export all submissions as a structured CSV and present aggregated analytics charts directly from the dashboard, so I can deliver a defensible, data-backed DP tool recommendation to the CTO's office without days of manual spreadsheet work.

**Current Alternatives:**
- Collects 4 Excel files from team leads, spends 2–3 days merging and deduplicating manually
- Rebuilds charts in Excel from raw data — error-prone and time-consuming
- Presents preliminary findings informally because a polished data summary isn't ready in time

**Hiring Criteria:**
- CSV export contains all submitted responses including respondent name, email, team type, submission date, and all question answers — no post-processing required
- In-dashboard analytics include: response counts by team type, Likert distribution per question, top-ranked items per ranking question, choice question breakdowns (pie/bar charts)
- Individual response drill-down accessible in ≤ 2 clicks from the response list
- Zero duplicate submissions appear in the exported dataset due to email-based deduplication enforcement

**Success Measure:** Dana exports the final CSV on day 15 and presents three dashboard charts in the stakeholder meeting — the dataset requires no manual cleaning, and all 4 team types are represented.

**Related Features:** F5, F6, F7
**Priority:** P0

---

### JTBD-03.3: Configure and Control the Assessment Window Without Engineering Support

**Job Statement:**
When I need to launch the assessment or extend the collection period due to low early participation, I want to set or update the due date directly from the dashboard, so I can respond to real-world participation dynamics without filing a support ticket or waiting for a code deployment.

**Current Alternatives:**
- Emails the development team to update a config value — typically a 1–2 day turnaround
- Hardcodes the deadline in the original communication and cannot change it without re-sending confusing update emails
- Operates the assessment on a fixed date regardless of whether all teams have responded

**Hiring Criteria:**
- Due date is configurable from the System Owner dashboard with a date picker control
- A confirmation prompt prevents accidental changes (e.g., "Are you sure you want to change the due date to August 5?")
- The updated due date takes effect immediately for all respondents, including post-submission banners
- Current assessment status (Active / Closed) is displayed prominently on the dashboard

**Success Measure:** Dana updates the due date from July 31 to August 5 in under 5 minutes via the dashboard, and the new deadline immediately appears in the respondent's edit-window banner without any code deployment.

**Related Features:** F5, F8
**Priority:** P1

---

## Outcome-to-Feature Traceability

| JTBD-ID | Related Feature(s) | Expected Outcome |
|---|---|---|
| JTBD-01.1 | F0, F1, F4 | Respondent completes assessment across 2 sessions with zero data loss |
| JTBD-01.2 | F1, F5, F9 | Respondent edits and re-submits before deadline; one record per email in dataset |
| JTBD-01.3 | F0, F3 | Respondent sees only team-relevant sections; no irrelevant questions presented |
| JTBD-02.1 | F2, F3, F4 | Platform Engineering-specific ranking questions captured with full priority ordering |
| JTBD-02.2 | F1, F5, F9 | Revised submission reflects team consensus; no duplicate record created |
| JTBD-02.3 | F2, F4 | "Other" free-text preserved verbatim; technical specifics captured in dataset |
| JTBD-03.1 | F6, F7 | Real-time team-type participation visible; under-represented segments identified proactively |
| JTBD-03.2 | F5, F6, F7 | Clean CSV export + dashboard charts ready for CTO presentation; zero duplicates |
| JTBD-03.3 | F5, F8 | Due date updated from dashboard in < 5 min; change propagates immediately |

---

## NaC Preview

> **Note:** These are candidate Natural Acceptance Criteria to be refined in STORY-MAP. Each criterion is derived from the job's success measure and expressed as a testable statement.

| JTBD-ID | Outcome | Candidate Natural Acceptance Criterion |
|---|---|---|
| JTBD-01.1 | Zero data loss on session resume | Given a respondent who partially completed section 2 and closed the browser, when they re-enter with the same email, then all previously entered answers are pre-populated with no manual action required |
| JTBD-01.1 | 20-minute completion target | Given a non-technical Program/Project respondent, when they complete all relevant sections, then total active answering time across sessions is ≤ 20 minutes |
| JTBD-01.2 | Single-submission edit | Given a respondent who has submitted, when they re-enter before the due date, then the form loads in editable mode pre-populated with their prior answers and no second submission record is created |
| JTBD-01.2 | Post-submission clarity | Given a respondent who has just submitted, when the confirmation screen loads, then it displays the edit deadline date prominently alongside the "Your assessment has been submitted" message |
| JTBD-01.3 | Relevant section routing | Given a respondent who selects "Program/Project" team type, when the assessment loads, then no Platform Engineering or Infrastructure/Cloud-specific sections are displayed |
| JTBD-02.1 | Ranking persistence | Given a respondent who drag-and-drops a ranking question to a custom order, when they navigate away and return, then the ranking order is identical to what was saved |
| JTBD-02.1 | Ranking accessibility fallback | Given a respondent using keyboard navigation, when they encounter a ranking question, then they can reorder items via numbered input without drag-and-drop |
| JTBD-02.2 | Revised submission is sole record | Given a respondent who re-enters after submitting and changes a ranking answer, when they re-submit, then the dashboard shows exactly one response record for their email with the updated answer |
| JTBD-02.3 | "Other" free-text preserved | Given a respondent who selects "Other" on a multi-choice question and enters 200 characters of text, when they save and re-enter the next day, then the full text is pre-populated verbatim |
| JTBD-03.1 | Real-time team-type counts | Given an active assessment window, when a new respondent submits, then the dashboard response count for their team type increments within 60 seconds without a page refresh |
| JTBD-03.1 | One-click team-type filter | Given the dashboard response list, when the System Owner clicks "Platform Engineering" filter, then the list shows only Platform Engineering responses with no additional steps |
| JTBD-03.2 | Export completeness | Given a closed assessment with 20 submissions, when the System Owner exports CSV, then the file contains all 20 rows with no duplicate respondent email addresses |
| JTBD-03.2 | Individual drill-down | Given the dashboard response list, when the System Owner clicks a respondent row, then the full answer set for that respondent is visible in ≤ 2 clicks |
| JTBD-03.3 | Due date update propagation | Given an active assessment, when the System Owner updates the due date from the dashboard, then the respondent edit-window banner reflects the new date within one page reload |
| JTBD-03.3 | Configuration guard | Given the System Owner entering a new due date, when they click Save, then a confirmation dialog displays the old and new dates before the change is committed |

---

*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
