# JOURNEYS: AssessmentForm-Express
## User Journey Maps

| Field | Value |
|---|---|
| **Product Name** | AssessmentForm-Express |
| **Version** | 1.0 |
| **Date** | 2026-07-17 |
| **Related Personas** | PERSONAS-AssessmentForm.md |
| **Related JTBD** | JTBD-AssessmentForm.md |
| **Related PRD** | PRD-AssessmentForm.md |
| **Status** | Draft |

---

## Journey Index

| JRN-ID | Persona | Scenario | Key JTBD | Stages |
|---|---|---|---|---|
| JRN-01.1 | PER-01 Marcus Reid | First-time completion across two sessions | JTBD-01.1, JTBD-01.3 | 6 |
| JRN-01.2 | PER-01 Marcus Reid | Re-entering to correct a hasty answer before the deadline | JTBD-01.2 | 5 |
| JRN-02.1 | PER-02 Priya Nair | Single-session deep technical assessment with ranking and free-text | JTBD-02.1, JTBD-02.3 | 5 |
| JRN-02.2 | PER-02 Priya Nair | Revising submitted answers after a team discussion | JTBD-02.2 | 4 |
| JRN-03.1 | PER-03 Dana Okafor | Launching the assessment and monitoring early participation | JTBD-03.3, JTBD-03.1 | 5 |
| JRN-03.2 | PER-03 Dana Okafor | Closing the window, exporting data, and presenting to the CTO | JTBD-03.2 | 5 |

---

## PER-01: Marcus Reid — Enterprise Team Member (Respondent)

---

### JRN-01.1: First-Time Completion Across Two Sessions

**Persona:** PER-01 (Marcus Reid)

**Scenario:** Marcus receives a link to the assessment from a team lead email. He clicks through, enters his name and email, selects his team type, and works through three sections before his next meeting starts. He closes the browser and returns the next morning to finish and submit. This is the most common respondent journey — a non-technical user fitting the assessment around a busy calendar.

**Related Jobs:** JTBD-01.1 (complete without losing progress), JTBD-01.3 (see only relevant sections)

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Arrive** | Clicks assessment link from team lead email; lands on assessment start page | Start / landing page (F1) | "Let me see what this is. How long is it going to take?" | Cautious, slightly reluctant | No upfront time estimate visible; past surveys have been long and irrelevant | Show "~15–20 min" and section count prominently on the landing page to set expectations |
| **2. Identify** | Enters name and email; selects "Program / Project" from the team type dropdown | Identity + team type screen (F1, F3) | "I hope I'm picking the right team type. Is this the one that applies to me?" | Uncertain | Team type labels may not map cleanly to how Marcus's role is described internally | Provide a one-line description under each team type option to confirm the right choice |
| **3. Answer – Session 1** | Works through General DP Alignment, Current Status sections; answers Likert and single-choice questions; hits a multi-choice question and selects three options | Form sections 1–3 (F0, F2, F3) | "These questions make sense. I can answer these." / "Wait — what does 'plugin extensibility' mean?" | Focused, then confused when technical jargon appears | Occasional DP-specific terminology not explained inline; Marcus guesses rather than skipping | Add brief inline tooltips or parenthetical clarifications for DP-specific terms in non-technical sections |
| **4. Pause** | A calendar reminder fires; Marcus closes the browser tab with answers unsaved manually | Browser close (F4) | "I'll come back to this tomorrow. I hope it saved." | Anxious — has lost form data before | No visible confirmation that progress was auto-saved before he closed the tab | Show a persistent "All answers saved" indicator after each section transition; confirm on browser close |
| **5. Resume** | Opens the assessment link from the original email the next morning; enters email; sees his previous answers pre-populated | Session resume (F1, F4) | "Oh good — it remembered where I was." | Relieved, then re-engaged | None — if auto-save worked; failure here is catastrophic to trust | Display a "Welcome back, Marcus — you left off at Section 3" resume confirmation banner |
| **6. Submit** | Completes remaining two sections (Feedback & Adaptability); reviews the summary step; clicks Submit | Summary / review + submission (F0, F5, F9) | "Did I answer everything correctly? Can I change something after?" | Cautiously confident | Summary view may not clearly highlight which questions were answered vs. skipped | Confirmation page explicitly states the edit deadline: "You can update your answers until [Due Date]" |

---

#### Key Moments

- **Decision Point:** Stage 2 — Team type selection. If Marcus picks the wrong type, he'll see irrelevant sections and either answer inaccurately or abandon.
- **Risk of Abandonment:** Stage 3 — If DP jargon in questions is unexplained, Marcus guesses or stops. This is the most common drop-off trigger for non-technical respondents.
- **Risk of Abandonment:** Stage 4 — If auto-save fails silently and Marcus loses session 1 data on return, he will not restart. Trust is permanently broken.
- **Delight Opportunity:** Stage 5 — Seeing all previous answers pre-populated is a "this actually works" moment that builds lasting confidence in the tool.

#### Success Outcome

Marcus completes all relevant sections across two sessions with zero lost answers, and receives a confirmation page that clearly states the edit deadline — satisfying JTBD-01.1's success measure (2+ interruptions, zero lost answers, ≤ 20 min total).

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Arrive | F1 (Identity / Start page) |
| Identify | F1 (Identity), F3 (Team-type routing) |
| Answer – Session 1 | F0 (Multi-step workflow), F2 (Question types), F3 (Section routing) |
| Pause | F4 (Auto-save) |
| Resume | F1 (Session resume), F4 (Progress persistence) |
| Submit | F0 (Summary step), F5 (Deduplication), F9 (Confirmation) |

---

### JRN-01.2: Re-Entering to Correct a Hasty Answer Before the Deadline

**Persona:** PER-01 (Marcus Reid)

**Scenario:** Marcus submitted the assessment two days ago during a rushed afternoon. He realizes he mis-selected a Likert option in the "Current Status" section — he clicked "Strongly Agree" when he meant "Neutral." He re-opens the link, re-enters his email, and navigates directly to that section to fix the one answer and re-submit.

**Related Jobs:** JTBD-01.2 (submit with confidence and correct mistakes before deadline)

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Return** | Re-clicks the assessment link from his original email; enters his email address on the start page | Start page / identity (F1) | "I hope I can still change it. I don't want to accidentally start over." | Nervous — fears data loss or creating a duplicate | No immediate indication whether a submission exists or whether edits are still allowed | Immediately show: "Welcome back, Marcus — your submission is on file. You can edit until [Due Date]." |
| **2. Recognize** | System loads his previous submission in editable mode; a banner confirms the edit window | Banner + pre-populated form (F5, F9) | "Good — it's all still here. And I have until [date]." | Relieved | If banner is subtle or missing, Marcus may not realize the form is pre-populated and editable vs. a blank restart | Use a visually distinct banner at the top of each section: "Editing your saved submission" |
| **3. Navigate** | Uses Previous / Next to navigate to Section 2 (Current Status) | Section navigation (F0) | "I need section 2. Can I jump there or do I have to click through?" | Impatient | No direct section jump — must step through sequentially | Allow direct section jump from a progress indicator or section list when returning to an existing submission |
| **4. Correct** | Changes the Likert answer from "Strongly Agree" to "Neutral"; verifies other answers look right | Section 2 (F0, F2, F4) | "That's the one. Okay. Everything else looks correct." | Focused, then satisfied | None if the correction is straightforward; friction if the save state is unclear after a single answer change | Auto-save the change immediately; show "Change saved" inline |
| **5. Re-submit** | Clicks through summary step and re-submits; sees updated confirmation | Summary + confirmation (F0, F9) | "It says submitted. I'm done. Same record, right — not a new one?" | Satisfied but slightly uncertain about deduplication | Confirmation message doesn't explicitly confirm "your previous submission has been updated" | Confirmation screen: "Your submission has been updated. This replaces your previous response." |

---

#### Key Moments

- **Decision Point:** Stage 1 — If the system doesn't recognize Marcus's email immediately and show his existing submission, he may create a duplicate entry or give up.
- **Risk of Abandonment:** Stage 3 — Forced sequential navigation to reach one section in a 7-section form is a friction multiplier; a returning user needs direct jump navigation. **Addressed by US-0.5:** Progress indicator items are clickable for direct section jump when `submission_status === "submitted"` and within the edit window.
- **Delight Opportunity:** Stage 5 — An explicit "updated, not duplicated" confirmation message eliminates post-submission anxiety for the respondent and maintains data integrity trust.

#### Success Outcome

Marcus edits one answer and re-submits within 3 minutes of re-entry, with explicit confirmation that his previous submission was updated (not duplicated) — satisfying JTBD-01.2's success measure.

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Return | F1 (Session recognition) |
| Recognize | F5 (Edit window enforcement), F9 (Banner confirmation) |
| Navigate | F0 (Section navigation — direct jump via clickable progress indicator; US-0.5) |
| Correct | F0, F2 (Question types), F4 (Auto-save) |
| Re-submit | F0 (Summary), F5 (Deduplication), F9 (Updated confirmation) |

---

## PER-02: Priya Nair — Platform Engineering Respondent

---

### JRN-02.1: Single-Session Deep Technical Assessment with Ranking and Free-Text

**Persona:** PER-02 (Priya Nair)

**Scenario:** Priya sets aside 40 minutes on a Thursday afternoon to formally complete the assessment. She selects "Platform Engineering" as her team type and moves through sections dedicated to CI/CD integration, plugin ecosystem, and onboarding automation. She uses drag-and-drop ranking to order capabilities by priority and adds detailed free-text responses where predefined options don't capture her team's specific integration requirements. She submits at the end of the session.

**Related Jobs:** JTBD-02.1 (express technically precise, priority-ordered expectations), JTBD-02.3 (provide specific context beyond predefined options)

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Identify & Route** | Enters name and email; selects "Platform Engineering" as team type | Identity + team type screen (F1, F3) | "Good — let me make sure this routes me to the platform-specific sections, not the PM stuff." | Confident and purposeful | If the routing is unclear or shows generic sections first, Priya immediately loses confidence in the tool | Confirm routing immediately: "You'll see Platform Engineering sections: CI/CD Integration, Plugin Ecosystem, Onboarding." |
| **2. Navigate Technical Sections** | Moves through mandatory sections (General DP Alignment, Current Status), then into Platform Engineering-specific sections | Sections 1–3 (F0, F3) | "These first two sections are fine. Now I want to get into the real technical content." | Engaged, slightly impatient with mandatory general sections | Mandatory general sections may feel redundant to an expert who just wants to express technical priorities | Keep mandatory sections short (3–4 questions max); progress bar signals how soon platform-specific sections appear |
| **3. Complete Ranking Questions** | Drags capability items into priority order for CI/CD integration ranking question | Ranking question component (F2, F4) | "Okay — CI/CD depth is #1 for us. Let me move plugin extensibility to #3. Does this auto-save?" | Focused and analytical | Drag-and-drop may be finicky on a trackpad; if items snap back to original order, trust in data fidelity collapses | Provide numbered fallback input alongside drag-and-drop; show item order numbers updating in real time; save on each reorder |
| **4. Add "Other" Free-Text Context** | On a multi-choice question about supported SCM providers, selects "Other" and types a 200-character custom integration requirement | Multi-choice + "Other" free-text (F2, F4) | "None of these exactly covers our GitLab Enterprise setup. Let me add it manually." | Methodical, satisfied at having a mechanism for specifics | Character limit not communicated; Priya may over-write and hit a hard limit without warning | Show character counter once typing begins; set limit generously (500+ chars for technical context); auto-save "Other" text |
| **5. Submit** | Completes long free-text field in Feedback section; reviews summary; submits | Summary + confirmation (F0, F9) | "Good. Now I need to review this with my team lead next week — can I still come back and change things?" | Satisfied but forward-thinking about potential revision | Confirmation doesn't explicitly explain the edit window in engineer-actionable terms | Confirmation states: "You can return and update your submission until [Due Date]. Re-enter with the same email." |

---

#### Key Moments

- **Decision Point:** Stage 3 — If drag-and-drop reordering is unreliable or ranking snaps back after save, Priya will lose confidence in the entire data collection mechanism and may abandon or flag the issue.
- **Risk of Abandonment:** Stage 1 — If Platform Engineering sections don't appear immediately after routing (if she has to wade through program-level content), she will assess the tool as "not fit for purpose."
- **Delight Opportunity:** Stage 4 — The "Other" free-text mechanism on multi-choice questions is precisely what Priya has been missing in past surveys. Discovering it works smoothly is a high-trust moment.

#### Success Outcome

Priya ranks 5 CI/CD capability items in under 2 minutes, adds 200-character "Other" context on one multi-choice question, and submits — with ranking preserved identically and "Other" text stored verbatim (JTBD-02.1 and JTBD-02.3 success measures).

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Identify & Route | F1 (Identity), F3 (Team-type routing) |
| Navigate Technical Sections | F0 (Multi-step workflow), F3 (Section routing) |
| Complete Ranking Questions | F2 (Ranking question type), F4 (Auto-save on reorder) |
| Add "Other" Free-Text Context | F2 ("Other" option + free text long), F4 (Auto-save) |
| Submit | F0 (Summary), F9 (Confirmation with edit window info) |

---

### JRN-02.2: Revising Submitted Answers After a Team Discussion

**Persona:** PER-02 (Priya Nair)

**Scenario:** Three days after submitting, Priya's team lead reviews her draft notes and flags that the team consensus is that onboarding automation should be ranked #1 (not #3 as she submitted). Priya returns to the form, re-enters with her email, navigates to the CI/CD ranking question, updates the order to reflect the team's consensus, and re-submits.

**Related Jobs:** JTBD-02.2 (revise submitted answers after a team discussion within the edit window)

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Re-enter** | Revisits the assessment URL; enters email; system recognizes previous submission | Identity + recognition (F1, F5) | "I submitted 3 days ago. Is the edit window still open? I need to change the onboarding ranking." | Purposeful, slightly uncertain about edit window status | No persistent notification of the edit window outside the confirmation page; Priya must check by re-entering | Show edit-window deadline prominently on the landing page for returning users: "Edits accepted until [Due Date]" |
| **2. Load Previous Answers** | All previously submitted answers pre-populate in editable mode; a banner confirms edit status | Pre-populated form + banner (F5, F9) | "Perfect — everything is exactly how I left it. I just need to change one ranking." | Confident and focused | If any answer is missing or re-ordered differently from how she submitted, trust in the system erodes immediately | Guarantee exact-state restoration: ranking order, "Other" text, all selections identical to last submission |
| **3. Update Ranking** | Navigates to Platform Engineering / CI/CD section; reorders ranking — moves "Onboarding Automation" from position #3 to #1 | Ranking question (F2, F0, F4) | "Move this to top… good. The numbers updated. Did that auto-save?" | Methodical | Re-ordering may require re-dragging multiple items; numbered fallback input is faster for targeted single changes | Allow direct numeric input alongside drag-and-drop; auto-save each position change; show "Saved" confirmation inline |
| **4. Re-submit** | Proceeds to summary; confirms all other answers unchanged; re-submits | Summary + confirmation (F0, F5, F9) | "One updated record — not a new duplicate. Confirmed?" | Relieved | Confirmation doesn't distinguish between "new submission" and "updated submission" | Confirmation: "Your submission has been updated (not duplicated). One record exists for [email]. Edit window closes [Due Date]." |

---

#### Key Moments

- **Decision Point:** Stage 2 — If the pre-populated ranking order doesn't exactly match her previous submission, Priya will file a bug report and lose trust in the dataset's accuracy.
- **Delight Opportunity:** Stage 4 — A confirmation screen that explicitly states "updated, not duplicated" and shows a timestamp is what differentiates this product from ad-hoc email revision workflows.

#### Success Outcome

Priya updates her CI/CD ranking (onboarding automation from #3 to #1) and re-submits — the dashboard shows exactly one record for her email with the updated answer (JTBD-02.2 success measure).

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Re-enter | F1 (Session recognition), F5 (Edit window check) |
| Load Previous Answers | F5 (Edit mode), F9 (Edit banner) |
| Update Ranking | F2 (Ranking), F0 (Navigation — direct jump via clickable progress indicator; US-0.5), F4 (Auto-save) |
| Re-submit | F0 (Summary), F5 (Deduplication), F9 (Updated confirmation) |

---

## PER-03: Dana Okafor — System Owner / DP Adoption Lead

---

### JRN-03.1: Launching the Assessment and Monitoring Early Participation

**Persona:** PER-03 (Dana Okafor)

**Scenario:** Dana configures the assessment due date, verifies that the assessment is in "Active" state, and sends the link to team leads. Five days in, she opens the dashboard to check participation rates per team type. She discovers that Infrastructure/Cloud has only 1 response versus 8 expected and issues a targeted reminder to that team lead — all without any manual data gathering or developer intervention.

**Related Jobs:** JTBD-03.3 (configure assessment window without engineering), JTBD-03.1 (monitor participation across team types)

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Configure** | Logs into System Owner dashboard; opens Assessment Configuration; sets due date to July 31 using date picker; confirms the change dialog | Configuration panel (F8, F7) | "I need to set the window before I send the link. Two weeks from today." | Focused and deliberate | Date picker may be non-obvious if nested deep in settings; confirmation dialog wording must be unambiguous | Surface due date configuration prominently on the dashboard home; show current status (Active / Closed) alongside it |
| **2. Verify & Launch** | Checks dashboard status shows "Active"; copies the respondent assessment URL; pastes into a team communication email | Dashboard status + URL (F7, F8) | "Is there a single link I can share? Let me make sure it's actually live." | Mildly anxious — wants certainty before distributing | No obvious "copy assessment link" button; status indicator may not be visually prominent enough | Add a "Copy assessment link" button adjacent to the Active status indicator on dashboard home |
| **3. Mid-Window Check (Day 5)** | Returns to dashboard; views response counts by team type on the participation summary | Dashboard — participation summary (F6) | "Platform Engineering has 4. Infrastructure has only 1. That's way too low." | Alert and proactive | Dashboard may display raw counts without expected-vs.-actual comparison; Dana must mentally calculate the gap | Show expected counts per team type (configurable) alongside actual counts; highlight under-represented segments in amber/red |
| **4. Drill Down** | Clicks "Infrastructure/Cloud" filter; reviews the one submitted response; notes it's from a team lead, not an engineer | Dashboard — filtered response list (F6) | "Who submitted? Is this the right person, or just the team lead doing it on behalf of everyone?" | Analytical | Individual row doesn't immediately show job role — only name and email | Add optional "Role/Title" column to response list or include it in respondent identity capture (F1) |
| **5. Act on Insight** | Copies the Infrastructure/Cloud team lead's email from the response list; sends a targeted reminder email | Response list (F6) | "I can email directly from here — wait, no, I need to copy the address." | Slightly frustrated | No "send reminder" action in the dashboard; must leave to email manually | Add a "Copy email" icon per row; stretch: bulk-copy emails for a filtered team type segment |

---

#### Key Moments

- **Decision Point:** Stage 1 — If the due date configuration takes more than 5 minutes or requires a developer, Dana's confidence in the self-service promise of the product is undermined from day one.
- **Risk of Abandonment:** Stage 3 — If the dashboard lacks expected-vs.-actual participation context, Dana cannot quickly identify under-represented segments and falls back to manual spreadsheet tracking.
- **Delight Opportunity:** Stage 3 — A color-coded participation summary that flags low-response segments without requiring calculation is the clearest demonstration that the product replaces Dana's current manual workflow.

#### Success Outcome

Dana configures the due date in under 5 minutes, confirms Active status, and on day 5 identifies the under-represented Infrastructure/Cloud segment in under 10 minutes — without any manual data gathering (JTBD-03.3 and JTBD-03.1 success measures).

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Configure | F8 (Assessment config), F7 (RBAC — dashboard access) |
| Verify & Launch | F7 (RBAC), F8 (Status display) |
| Mid-Window Check | F6 (Dashboard — participation summary) |
| Drill Down | F6 (Filter + individual response list) |
| Act on Insight | F6 (Response list with contact detail) |

---

### JRN-03.2: Closing the Window, Exporting Data, and Presenting to the CTO

**Persona:** PER-03 (Dana Okafor)

**Scenario:** The two-week assessment window closes. Dana opens the dashboard, confirms the status has transitioned to "Closed," reviews final submission counts to confirm all four team types are represented, exports the full response dataset as CSV, and then presents three analytics charts live from the dashboard during the CTO stakeholder briefing — without rebuilding anything in Excel.

**Related Jobs:** JTBD-03.2 (produce a clean, analysis-ready dataset for the decision brief)

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Confirm Closure** | Logs in on day 15; dashboard shows "Closed" status; final response counts displayed by team type | Dashboard — status + summary (F6, F8) | "Closed. Good. Let me verify all four team types have responses before I export." | Focused and methodical | If any team type shows zero submissions, Dana has a presentation problem; she needs to know immediately | Show a "Coverage check" summary: 4/4 team types represented ✓ or 3/4 ⚠ with specific missing type named |
| **2. Review Final Dataset** | Opens the full response list; scans for any anomalies — unusual names, suspected duplicates, incomplete submissions | Response list (F6) | "Are there any obvious duplicates? Any incomplete submissions I should exclude?" | Analytical, slightly cautious | Duplicates should be prevented by F5, but Dana still scans manually — she needs visible deduplication confirmation | Add a banner: "Deduplication applied — 0 duplicate email addresses detected." Makes the guarantee visible |
| **3. Drill into Anomaly** | Notices an unusual ranking result from one Platform Engineering respondent; clicks to open full response | Individual response drill-down (F6) | "Why did they rank onboarding automation dead last? Let me read their free-text." | Curious and investigative | Drill-down must be accessible in ≤ 2 clicks; any more and Dana loses momentum during pre-presentation prep | Single click on a respondent row opens full response panel in a side drawer or modal — no extra navigation step |
| **4. Export CSV** | Clicks "Export CSV" from the dashboard; file downloads immediately; she opens it to verify structure | CSV export (F6) | "Is every column I need here? Team type, submission date, all question answers?" | Pragmatic | CSV column headers may be technical IDs rather than readable question text — requires mapping before use | Export CSV with human-readable column headers (question text, not Q1/Q2 codes); include respondent name, email, team type, timestamp |
| **5. Present Dashboard Charts** | Opens the dashboard on the conference room display; navigates to analytics charts — Likert distributions, ranking results, choice breakdowns | Analytics charts (F6) | "This is what I'll show. I need the team-type chart first, then the ranking chart." | Confident | Charts may be designed for individual analysis, not for projection on a large display (font size, contrast) | Ensure charts are readable at 1080p projection; add a "presentation mode" that maximizes chart area and hides admin UI chrome |

---

#### Key Moments

- **Decision Point:** Stage 1 — If any of the four team types shows zero submissions on day 15, Dana's presentation is incomplete. The dashboard must surface this gap with enough clarity to prompt action.
- **Risk of Abandonment:** Stage 4 — If the CSV has unusable column headers (e.g., `q_003_opt_2`), Dana falls back to the manual spreadsheet workflow the product was meant to replace. This is a high-impact failure mode.
- **Delight Opportunity:** Stage 5 — Presenting live analytics charts directly from the dashboard without rebuilding them in Excel is the primary ROI moment for Dana — and the most visible proof of product value to the CTO's office.

#### Success Outcome

Dana exports a clean, complete CSV with human-readable headers on day 15, confirms all 4 team types are represented, and presents three dashboard analytics charts live in the stakeholder meeting — no manual post-processing required (JTBD-03.2 success measure).

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Confirm Closure | F6 (Dashboard status), F8 (Assessment status) |
| Review Final Dataset | F6 (Response list), F5 (Deduplication guarantee) |
| Drill into Anomaly | F6 (Individual response drill-down) |
| Export CSV | F6 (CSV export) |
| Present Dashboard Charts | F6 (Analytics charts) |

---

## Cross-Journey Patterns

### Common Pain Points Across Journeys

- **Confirmation ambiguity on re-submission (JRN-01.2, JRN-02.2):** Both Marcus and Priya, when returning to edit a submitted assessment, share the same anxiety: "Did I just create a duplicate, or update the existing record?" The product must explicitly distinguish "updated submission" from "new submission" in the confirmation messaging. A single sentence ("This updates your previous response — no duplicate created") resolves this for both personas.

- **Save-state uncertainty (JRN-01.1, JRN-02.1):** Both non-technical (Marcus) and technical (Priya) respondents are anxious about whether their answers are safely persisted, particularly for complex inputs (ranking order, "Other" free text). A persistent, real-time "Saved" indicator is the single highest-ROI UX investment for respondent trust across both personas.

- **Section routing confidence (JRN-01.1, JRN-02.1):** Marcus needs assurance he won't see irrelevant technical sections; Priya needs assurance she won't wade through program-level content. Both pain points resolve with the same mechanism: immediate post-routing confirmation showing which sections the user will encounter.

- **Edit window discoverability (JRN-01.1, JRN-01.2, JRN-02.2):** The edit window deadline is critical information for all respondents, but it only surfaces prominently at the confirmation page. All three re-entry journeys (JRN-01.2, JRN-02.2) show that users must re-discover this information on re-entry. The deadline should be visible on the landing page for returning users, not only in the post-submission confirmation.

### Shared Opportunities

- **Direct section jump on re-entry:** Both Marcus (JRN-01.2, Stage 3) and Priya (JRN-02.2, Stage 3) need to navigate to a specific section when returning to edit. Sequential next/previous navigation through all sections is a significant friction multiplier for returning users. **Addressed by US-0.5:** A section progress indicator that doubles as direct navigation (click to jump) is available during edit-window re-entry sessions, solving both journeys simultaneously.

- **Role-appropriate terminology in section questions:** Marcus struggles with DP jargon (JRN-01.1, Stage 3); Priya finds generic program-management language irrelevant (JRN-02.1, Stage 2). Both are partially addressed by section routing (F3), but inline tooltips and question-level tone calibration per section type provide the remaining fix.

- **Dashboard data visibility gap (JRN-03.1, JRN-03.2):** Dana needs expected-vs.-actual participation context (JRN-03.1) and human-readable CSV headers (JRN-03.2). Both are data-presentation choices within F6 that can be addressed with a single, user-centered dashboard design pass — they share the same root cause: dashboard outputs designed for system completeness rather than analyst usability.

---

## Journey-to-JTBD Traceability

| Journey | Stage | JTBD-ID | Expected Outcome |
|---|---|---|---|
| JRN-01.1 | 1. Arrive | JTBD-01.1 | Time estimate visible; respondent proceeds without anxiety about length |
| JRN-01.1 | 2. Identify | JTBD-01.3 | Team type selection routes respondent to relevant sections only |
| JRN-01.1 | 3. Answer – Session 1 | JTBD-01.3 | No Platform Engineering sections appear; Marcus answers 100% of displayed questions |
| JRN-01.1 | 4. Pause | JTBD-01.1 | Auto-save triggers on section exit; progress confirmed before browser close |
| JRN-01.1 | 5. Resume | JTBD-01.1 | All previous answers pre-populated on return; zero lost responses |
| JRN-01.1 | 6. Submit | JTBD-01.2 | Confirmation screen shows edit deadline prominently |
| JRN-01.2 | 1. Return | JTBD-01.2 | System recognizes returning respondent and loads editable submission immediately |
| JRN-01.2 | 2. Recognize | JTBD-01.2 | Edit window banner visible; respondent confirmed within edit period |
| JRN-01.2 | 3. Navigate | JTBD-01.2 | Respondent reaches target section without excessive friction |
| JRN-01.2 | 4. Correct | JTBD-01.2 | Single answer change auto-saved; respondent does not need to re-answer other sections |
| JRN-01.2 | 5. Re-submit | JTBD-01.2 | One record per email; confirmation distinguishes update from duplicate |
| JRN-02.1 | 1. Identify & Route | JTBD-02.1 | Platform Engineering sections surfaced immediately; no program-level sections shown |
| JRN-02.1 | 2. Navigate Technical Sections | JTBD-02.1 | Mandatory sections are short; platform-specific sections follow without extra navigation |
| JRN-02.1 | 3. Complete Ranking Questions | JTBD-02.1 | Drag-and-drop and numbered fallback both functional; ranking saved on each reorder |
| JRN-02.1 | 4. Add "Other" Free-Text | JTBD-02.3 | "Other" option available on multi-choice; text preserved on save and re-entry |
| JRN-02.1 | 5. Submit | JTBD-02.2 | Confirmation communicates edit window clearly for planned team-review revision |
| JRN-02.2 | 1. Re-enter | JTBD-02.2 | Edit window deadline visible on landing; returning user recognized immediately |
| JRN-02.2 | 2. Load Previous Answers | JTBD-02.2 | All answers — including ranking order and "Other" text — pre-populated exactly |
| JRN-02.2 | 3. Update Ranking | JTBD-02.2 | Ranking reorder saved immediately; numbered fallback available for precise single-item change |
| JRN-02.2 | 4. Re-submit | JTBD-02.2 | Dashboard shows exactly one record for Priya's email with updated ranking |
| JRN-03.1 | 1. Configure | JTBD-03.3 | Due date set via date picker in < 5 minutes; confirmation dialog prevents accidental change |
| JRN-03.1 | 2. Verify & Launch | JTBD-03.3 | Assessment status shows "Active"; respondent link clearly available |
| JRN-03.1 | 3. Mid-Window Check | JTBD-03.1 | Response counts by team type visible; under-represented segments flagged |
| JRN-03.1 | 4. Drill Down | JTBD-03.1 | Individual response accessible in ≤ 2 clicks from response list |
| JRN-03.1 | 5. Act on Insight | JTBD-03.1 | Respondent contact detail available for targeted outreach without leaving dashboard |
| JRN-03.2 | 1. Confirm Closure | JTBD-03.2 | "Closed" status displayed; all 4 team types confirmed represented |
| JRN-03.2 | 2. Review Final Dataset | JTBD-03.2 | Deduplication guarantee visible; zero duplicate records in response list |
| JRN-03.2 | 3. Drill into Anomaly | JTBD-03.2 | Full response view accessible in ≤ 2 clicks including ranking and free-text fields |
| JRN-03.2 | 4. Export CSV | JTBD-03.2 | CSV contains all responses with human-readable headers; no post-processing required |
| JRN-03.2 | 5. Present Dashboard Charts | JTBD-03.2 | Analytics charts readable at projection scale; team-type and ranking charts available live |

---

*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
