# PERSONAS: AssessmentForm-Express

| Field | Value |
|---|---|
| **Product Name** | AssessmentForm-Express |
| **Version** | 1.0 |
| **Date** | 2026-07-17 |
| **Related PRD** | PRD-AssessmentForm.md |
| **Status** | Draft |

---

## Persona Summary

| ID | Name | Role | Primary Goal |
|---|---|---|---|
| PER-01 | Marcus Reid | Enterprise Team Member (Respondent) | Complete the assessment accurately and efficiently in a single focused session or across multiple sittings, confident that progress is saved |
| PER-02 | Priya Nair | Platform Engineering Respondent | Express nuanced, technically precise capability expectations for DP tooling so the platform team's specific needs are fairly represented |
| PER-03 | Dana Okafor | System Owner / DP Adoption Lead | Aggregate and analyze team assessment data to make a confident, defensible DP tool selection recommendation |

---

## PER-01: Marcus Reid
**Enterprise Team Member — Program/Project or Data/API Governance Respondent**

### Role & Context

Marcus is a mid-level program manager on a cross-functional program team at a large enterprise. He coordinates delivery across 8–12 team members and regularly interfaces with Platform Engineering and Infrastructure leads. He spends most of his workday in Confluence, Jira, and email — not in developer tooling directly. When the Developer Platform assessment is announced, Marcus receives a link and a two-week deadline to complete it. He isn't deeply familiar with Backstage or Harness IDP, but he has strong opinions about workflow integration, visibility, and how a new platform tool would affect his team's delivery cadence. He typically completes the assessment in one or two sittings from his laptop, fitting it in between meetings.

Marcus represents the broadest respondent segment: non-technical or lightly technical team members from Program/Project and Data/API Governance team types who need the form to guide them, not assume expertise.

### Goals

- Complete the assessment in under 20 minutes without needing to understand the DP tools in depth (F0, F2, F3)
- Save progress mid-way and return to finish without losing answers (F4)
- Feel confident that his submission was recorded and that he can correct mistakes before the deadline (F5, F9)
- See questions that are relevant to his team type — not questions intended for infrastructure engineers (F3)

### Pain Points

- No existing structured channel to express his team's DP tool preferences — feedback has been ad-hoc emails that go nowhere (PRD §2)
- Has started online forms before only to lose all progress when a browser tab crashes or a meeting interrupts
- Receives generic surveys that include irrelevant technical questions, causing confusion and incomplete answers
- Doesn't know if his input was ever recorded or whether he can go back and revise it after submitting prematurely

### Technical Expertise

**Low to Intermediate** — Comfortable with web apps, SaaS tools, and form-based workflows. Has no command-line experience and minimal familiarity with developer platform tooling (Backstage, Harness IDP). Relies on descriptive labels and clear UI affordances; does not tolerate ambiguous UX.

### Top Tasks

1. **Start assessment and identify team type** — selects Program/Project or Data/API Governance at the entry screen (F1, F3)
2. **Answer section questions** — works through Likert, single-choice, and short free-text questions section by section (F0, F2)
3. **Pause and resume later** — closes browser mid-way, returns the next day, and expects saved answers to be pre-populated (F4, F1)
4. **Review and submit** — reads the summary/review step and submits with confidence (F0, F9)
5. **Return to edit before deadline** — re-enters with his email, sees his previous answers, adjusts one response (F5, F9)

### Success Criteria

- Completes the full assessment in ≤ 20 minutes across one or two sessions
- Zero lost responses when resuming after closing the browser
- Immediately recognizes which team-type sections apply to him — never sees an empty or irrelevant section
- Receives clear post-submission confirmation message with the edit deadline displayed

---

## PER-02: Priya Nair
**Platform Engineering Respondent**

### Role & Context

Priya is a senior platform engineer who owns the internal developer tooling roadmap for her business unit. She has hands-on experience evaluating Backstage and Harness IDP and has strong, technically grounded opinions about plugin ecosystems, CI/CD integration depth, and team onboarding overhead. She is skeptical of surveys that oversimplify complex tooling tradeoffs into yes/no checkboxes. When she receives the assessment link, she treats it as an opportunity to formally document her team's capability gap analysis — something she's been doing informally in Notion.

Priya represents technically sophisticated respondents in Platform Engineering and Infrastructure/Cloud team types who need expressive question formats — particularly ranking and multi-choice — to convey priority and nuance. She may also represent other engineers who sit in the Infrastructure/Cloud segment.

### Goals

- Express precise capability priorities using ranked ordering, not just binary selections (F2, F3)
- Ensure her Platform Engineering team's distinct needs (CI/CD integration, plugin extensibility, onboarding automation) are captured in dedicated sections — not lumped into generic program-team questions (F3)
- Submit once, but retain the ability to revise after discussing with her team lead during the edit window (F5)
- Provide open-ended written input where predefined options don't cover her team's specific requirements (F2 — Free text long)

### Pain Points

- Past feedback mechanisms were spreadsheets shared via email — aggregation was inconsistent, and her detailed responses were often condensed or discarded (PRD §2)
- Simple 5-option surveys don't capture capability priority ordering — she needs to rank Backstage vs RHDH vs Harness IDP capabilities by importance, not just flag them
- Submitting prematurely before team discussion means she wants to revise answers — no current mechanism allows that
- Irrelevant questions (e.g., program delivery workflow questions) waste her time during a technical assessment

### Technical Expertise

**High** — Proficient with web developer tools, REST APIs, and platform infrastructure. Comfortable with SPA interfaces, drag-and-drop UI components, and form validation patterns. Will notice and report UX bugs. May try to inspect network requests if curious about how data is stored.

### Top Tasks

1. **Select Platform Engineering team type** — routes immediately into the relevant technical sections, skipping program-level sections (F3)
2. **Complete ranking questions** — uses drag-and-drop (or numbered fallback) to order DP capabilities by priority for her team (F2)
3. **Respond to multi-choice questions with "Other" free text** — selects predefined options plus adds a custom capability not listed (F2)
4. **Write detailed long-form responses** — uses free-text (long) fields to document specific integration requirements (F2)
5. **Re-enter within edit window to revise answers** — returns after a team discussion to update her ranking for CI/CD integration (F5, F9)

### Success Criteria

- Platform Engineering-specific sections appear without requiring her to navigate through irrelevant content
- Ranking questions support both drag-and-drop and keyboard/numbered fallback (accessibility and browser compatibility)
- She can add free-text responses to any multi-choice question via "Other" field
- Edit window is clearly communicated; re-entry pre-populates all her previous answers exactly

---

## PER-03: Dana Okafor
**System Owner / Developer Platform Adoption Lead**

### Role & Context

Dana is the enterprise architect and DP adoption lead responsible for recommending which Developer Platform tool (Backstage, Red Hat Developer Hub, or Harness IDP) the organization should standardize on. She owns the assessment program end-to-end: she configures it, monitors participation during the two-week window, and presents findings to the CTO's office at the close of the period. She accesses the system from her laptop and occasionally from a conference room display during stakeholder briefings.

Dana has no tolerance for unreliable data. She needs to trust that duplicates have been prevented, that every team type is represented, and that the analytics she presents reflect clean, complete submissions. She is the only person with dashboard access. She is not expected to complete the respondent-side assessment herself.

### Goals

- Configure the assessment due date before launch and update it if the collection window needs extending (F8)
- Monitor real-time participation counts by team type throughout the two-week window to identify under-represented segments (F6)
- Drill into individual responses when a result looks anomalous or when a stakeholder asks about a specific team's input (F6)
- Export the full response dataset to CSV for inclusion in a formal decision brief to the CTO's office (F6)
- Present aggregated analytics charts (Likert distributions, ranking results, choice breakdowns) in stakeholder meetings without manually rebuilding charts in Excel (F6)
- Be confident that no duplicate submissions or post-deadline edits have contaminated the dataset (F5, F7)

### Pain Points

- Previous DP tool evaluations relied on ad-hoc spreadsheet aggregation — merging 4 different team leads' Excel files took 2–3 days and introduced errors (PRD §2)
- Without structured input from all four team types, prior tool selection decisions were contested by teams whose needs weren't captured
- Manual deduplication of email responses was error-prone; some respondents submitted multiple times with slight name variations
- No visibility into participation rates during the collection window meant she discovered low response counts only after the deadline

### Technical Expertise

**Intermediate** — Comfortable with web dashboards, data tables, and analytics tools (e.g., Tableau, Excel). Not a developer; will not inspect source code. Expects the dashboard to be self-explanatory and reliable. Will use CSV export as her primary data-handoff mechanism.

### Top Tasks

1. **Configure and publish assessment** — sets the due date, verifies the assessment is in "active" state before sending the link to team leads (F8, F5)
2. **Monitor participation by team type** — checks the dashboard 3–5 times per week during the collection window; reviews response counts and completion status per team type (F6)
3. **Filter and review submissions** — filters the response list by team type or completion status to identify gaps or anomalies (F6)
4. **Drill into individual responses** — opens a specific respondent's full answers to investigate an unusual ranking result or verify data quality (F6)
5. **Export data and generate charts** — exports CSV at the end of the window; uses in-dashboard analytics charts for the stakeholder presentation (F6)

### Success Criteria

- Can configure the due date in under 5 minutes without a support ticket or code deploy
- Dashboard shows response counts by team type and completion status, updated in near real-time
- Individual response drill-down is accessible in 2 clicks from the response list
- CSV export contains all submitted responses with no manual post-processing required
- Zero duplicate submissions appear in the final dataset
- All 4 team types are represented in the final response dataset

---

## Persona Relationships

| Interaction | PER-01 (Marcus) | PER-02 (Priya) | PER-03 (Dana) |
|---|---|---|---|
| **PER-01 (Marcus)** | — | No direct interaction | Dana sees Marcus's submission in dashboard; can drill into his answers |
| **PER-02 (Priya)** | No direct interaction | — | Dana filters for Platform Engineering responses; Priya's rankings inform Dana's charts |
| **PER-03 (Dana)** | Dana monitors Marcus's team type participation; sends deadline reminders | Dana monitors Platform Engineering completion rate; reviews Priya's open-ended answers | — |

**Key flow:** Dana launches the assessment → Marcus and Priya receive the link, complete their team-type-specific sections independently → Dana monitors participation and reviews aggregated results → Dana exports data and presents findings.

---

## Feature-Persona Matrix

| Feature | Description | PER-01 Marcus (Program/Project Respondent) | PER-02 Priya (Platform Engineering Respondent) | PER-03 Dana (System Owner) |
|---|---|---|---|---|
| **F0** | Multi-Step Assessment Workflow | **Primary** — core form navigation experience | **Primary** — relies on smooth section navigation and ranking UX | Secondary — reviews how respondents experience the form |
| **F1** | Respondent Identity & Session Management | **Primary** — email/name entry, session resume | **Primary** — re-entry with edit capability | None — does not complete the assessment |
| **F2** | Question Types Engine | **Primary** — Likert, single/multi-choice, short free text | **Primary** — ranking, multi-choice + Other, long free text | None — consumes results, does not answer questions |
| **F3** | Team-Type-Specific Section Routing | **Primary** — routed to Program/Project or Data/API sections | **Primary** — routed exclusively to Platform Engineering sections | Secondary — understands section structure for result interpretation |
| **F4** | Auto-Save & Progress Persistence | **Primary** — pauses and resumes across sessions | **Primary** — mid-session saves protect detailed answers | None |
| **F5** | Duplicate Submission Prevention & Edit Window | **Primary** — returns to edit before deadline | **Primary** — revises after team discussion | **Primary** — relies on deduplication for data integrity |
| **F6** | System Owner Dashboard | None | None | **Primary** — sole user of all dashboard features |
| **F7** | Role-Based Access Control | Secondary — protected from seeing others' data | Secondary — protected from seeing others' data | **Primary** — exclusive dashboard access enforced by RBAC |
| **F8** | Assessment Configuration Management | None | None | **Primary** — configures due date before launch |
| **F9** | Submission Confirmation & Respondent Feedback | **Primary** — needs clear confirmation and edit deadline message | **Primary** — relies on edit window communication to plan team review | Secondary — confirmation messaging supports participation trust |

**Legend:** Primary = main beneficiary / frequent user of this feature | Secondary = benefits indirectly or occasionally | None = not a relevant user of this feature

---

*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
