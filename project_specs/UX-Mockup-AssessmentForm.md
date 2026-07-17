# UX Mockup: AssessmentForm-Express

**Project:** AssessmentForm-Express
**Generated:** 2026-07-17
**Based on:** UserStories-AssessmentForm.md, JOURNEYS-AssessmentForm.md, PRD-AssessmentForm.md, FRD-AssessmentForm.md
**User Stories Covered:** US-0.1 – US-9.3 (38 stories across 10 epics)

---

## Overview

AssessmentForm-Express serves two distinct user groups with non-overlapping UI surfaces:

1. **Respondents** (Marcus Reid, Priya Nair): A multi-step SPA assessment form with identity capture, section-by-section navigation, auto-save, and submission/re-entry flows.
2. **System Owners** (Dana Okafor): A role-protected dashboard with a response list, analytics charts, CSV export, and assessment configuration.

### Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Persistent save-state confidence** | The #1 respondent anxiety is data loss. A persistent, real-time save indicator appears on every section screen. (JRN-01.1 Stage 4, JRN-02.1 Stage 3) |
| **Progressive disclosure** | Team type selection at identity capture gates section routing; respondents never see irrelevant sections. (US-3.1, US-3.2) |
| **Re-entry first-class citizen** | Returning respondents (both draft and submitted) are recognized immediately with clear banners and pre-populated forms. (US-1.2, US-5.2, US-9.2) |
| **Confirmation clarity** | Post-submit and post-edit confirmations explicitly distinguish "updated submission" from "new submission" to prevent deduplication anxiety. (JRN-01.2, JRN-02.2) |
| **Section jump on re-entry** | Returning users can jump directly to any completed section via the progress indicator — not forced to navigate sequentially. (JRN-01.2 Stage 3, JRN-02.2 Stage 3) |
| **Dashboard for analysts** | Charts are readable at projection scale; CSV headers are human-readable question text, not IDs. (JRN-03.2) |

### Personas → UI Surface Mapping

| Persona | Primary Surface | Key Flows |
|---------|-----------------|-----------|
| Marcus Reid (non-technical respondent) | Assessment Form | Identity → Section Navigation → Review → Submit → Re-entry |
| Priya Nair (technical respondent) | Assessment Form | Identity (PE routing) → Ranking/Free-text → Submit → Revision |
| Dana Okafor (System Owner) | Dashboard | Config → Monitor → Drill-down → Export → Present |

### Route Map

| Route | Surface | Role |
|-------|---------|------|
| `/` | Landing / Identity Capture | Respondent |
| `/assessment` | Multi-step Assessment Form | Respondent |
| `/assessment/review` | Review & Submit Step | Respondent |
| `/assessment/confirmation` | Submission Confirmation | Respondent |
| `/dashboard` | System Owner Dashboard Home | System Owner |
| `/dashboard/responses/:sessionId` | Individual Response Drill-down | System Owner |
| `/dashboard/analytics` | Analytics Charts Panel | System Owner |
| `/dashboard/config` | Assessment Configuration | System Owner |

---
---

## User Flows

### Flow 00: Respondent Identity & Session Start

**User Stories:** US-1.1, US-1.2, US-1.3, US-3.1, US-7.1, US-7.3
**Personas:** Marcus Reid (JRN-01.1 Stages 1–2), Priya Nair (JRN-02.1 Stage 1)
**Trigger:** Respondent navigates to the assessment URL for the first time or returns to it.

```
[Navigate to /]
    │
    ▼
[Identity Capture Page]
 ─ Email field
 ─ Full Name field
 ─ Team Type dropdown
    │
    ├── localStorage has session_id?
    │       │
    │       └── YES → POST /api/sessions (resume)
    │                   │
    │                   ├── Session found → Show Resume Banner
    │                   │       "Welcome back, {name}. You left off at Section {N}."
    │                   │       → Navigate to /assessment at section N
    │                   │
    │                   └── Session NOT found (stale) → Inline error
    │                           "Your previous session could not be found."
    │                           → Stay on Identity page (clear localStorage)
    │
    └── New user → Validates fields on "Start Assessment"
            │
            ├── Email = System Owner email → Inline error
            │       "This email is registered as a System Owner.
            │        Please access the dashboard instead."
            │       (Stay on Identity page)
            │
            ├── Validation failure → Inline field errors
            │       Email: "Please enter a valid email address."
            │       Name:  "Please enter your full name (at least 2 characters)."
            │
            └── Valid → POST /api/sessions
                    │
                    ├── New respondent (is_returning: false)
                    │       → Store session_id in localStorage
                    │       → Show routing confirmation:
                    │         "You'll see {N} sections tailored to {Team Type}."
                    │       → Navigate to /assessment (section 0)
                    │
                    └── Returning respondent (is_returning: true)
                            → Show Resume Banner + pre-populated answers
                            → Navigate to /assessment at saved section index
```

**Steps:**
1. **Arrive:** Page shows three fields (Email, Name, Team Type) plus a time estimate ("~15–20 min, {N} sections") and **Start Assessment** button (initially disabled).
2. **Fill identity:** Button enables only when all three fields are complete and email format is valid (real-time inline validation).
3. **Team type selection:** Dropdown shows all four options with one-line descriptions. Selection immediately shows a preview of section count: *"You'll complete 7 sections tailored to Platform Engineering."*
4. **Submit:** `POST /api/sessions` → server checks email against System Owner list and existing sessions.
5. **New respondent path:** JWT stored, redirect to `/assessment` section 0 with section list pre-loaded.
6. **Returning respondent path:** Resume Banner displayed; assessment opens at `current_section_index`; all answers pre-populated.
7. **System Owner path:** Error message; no session created; user stays on identity page.

---
---

### Flow 01: Multi-Step Assessment Navigation

**User Stories:** US-0.1, US-0.2, US-0.3, US-0.4, US-2.1–US-2.5, US-3.1–US-3.4, US-4.1, US-4.2
**Personas:** Marcus Reid (JRN-01.1 Stages 3–6), Priya Nair (JRN-02.1 Stages 2–5)
**Trigger:** Respondent reaches `/assessment` after identity capture or session resume.

```
[Section Screen: Section N of M]
 ─ Progress Bar (step indicator)
 ─ Save State Indicator ("Saved at 2:34 PM")
 ─ Section title + question list
    │
    ├── User answers questions (any input)
    │       └── isDirty = true → Save State: "Unsaved changes"
    │               After 30s idle + isDirty → Idle Auto-Save
    │               └── PUT /api/responses/:sessionId
    │                       ├── Success → "Saved at {time}"
    │                       └── Fail    → "Unsaved changes — server error. Retrying…"
    │
    ├── [Previous] clicked (any state)
    │       └── Auto-save current section (no validation required)
    │               → Navigate to Section N-1
    │               → Progress bar updates
    │
    └── [Next] clicked
            │
            ├── Required questions unanswered?
            │       └── YES → Inline section error banner:
            │               "Please answer all required questions before continuing."
            │               Each unanswered field highlighted with error state
            │               Navigation blocked
            │
            └── All required answered → Auto-save triggers
                    │
                    ├── Is this the last section?
                    │       └── YES → Navigate to /assessment/review
                    │
                    └── NO → Navigate to Section N+1
                             Progress bar updates
```

**Question Type Sub-flows:**

```
[Single Choice]           [Multi Choice]            [Likert Scale]
 ○ Option A                ☐ Option A                1  2  3  4  5
 ○ Option B                ☐ Option B               SD ●        SA
 ○ Option C                ☑ Option C                ↑ keyboard ↑
 ○ Other → [text input]    ☐ Other → [text input]    arrow nav

[Ranking]                             [Free Text Short/Long]
 ≡ Item 1 [drag handle] [#1 input]    [________________] 0/500
 ≡ Item 2 [drag handle] [#2 input]    [______________  ]
 ≡ Item 3 [drag handle] [#3 input]    [textarea       ] 0/2000
                                       char counter turns red at 90%+
```

**Steps:**
1. Section renders with question list; required questions marked with asterisk (*).
2. Respondent interacts with question widgets; dirty state tracks unsaved changes.
3. Save State Indicator updates in real time: `Unsaved changes` → `Saving…` → `Saved at {time}`.
4. Idle auto-save fires after 30s of inactivity when dirty.
5. **Next:** Validates required questions; on failure highlights unanswered fields with error state and shows section-level banner.
6. **Next (valid):** Triggers auto-save → navigates to next section; progress bar advances.
7. **Previous:** Always permitted; triggers auto-save; navigates to prior section.
8. Final section **Next** → transitions to Review Step (Section N+1 = Review).

---
---

### Flow 02: Resume & Re-Entry (Draft and Submitted)

**User Stories:** US-1.2, US-1.3, US-4.3, US-5.2, US-5.3, US-5.4, US-9.2, US-9.3
**Personas:** Marcus Reid (JRN-01.2), Priya Nair (JRN-02.2)
**Trigger:** Returning respondent navigates to the assessment URL after a prior session.

```
[Navigate to /]
    │
    ▼
[Identity Page — detect localStorage session_id]
    │
    ├── session_id present → auto-fill email → POST /api/sessions
    │
    └── No session_id → standard Identity form
            └── Respondent enters email → POST /api/sessions
                    │
                    └── Server finds existing session
                            ↓
[Server returns: submission_status, due_date, is_closed, saved_responses]
    │
    ├── is_closed = true (past due date)
    │       → Navigate to /assessment (read-only mode)
    │       → "Assessment Closed" Banner on every section (non-dismissible)
    │       "This assessment is now closed. Your responses are saved
    │        and have been submitted to the System Owner."
    │       → All inputs rendered as read-only text
    │       → Previous/Next navigation still works (review only)
    │       → Save/Submit controls hidden
    │
    ├── submission_status = submitted, is_closed = false (edit window open)
    │       → Navigate to /assessment (editable, re-entry mode)
    │       → "Re-Entry Banner" on every section (non-dismissible):
    │         "You've already submitted your assessment.
    │          You can update your answers until {due_date}."
    │       → All answers pre-populated and editable
    │       → Auto-save active; Submit button present on Review Step
    │       → Section progress indicator supports direct section jump
    │
    └── submission_status = draft, is_closed = false
            → Resume Banner (section N, where they left off)
            "Welcome back, {name}. Your progress has been loaded.
             You left off at section {N}."
            → Navigate to /assessment at section N
            → All answers pre-populated
```

**Section Jump Navigation (Re-entry):**

```
Progress Bar (clickable on re-entry):
[✓ Section 1] [✓ Section 2] [● Section 3] [○ Section 4] [○ Section 5]
     ↑click           ↑click         ↑current
  → jump to 1     → jump to 2    (sequential only for new users)
```

**Steps:**
1. Identity page detects `session_id` in localStorage; auto-submits or lets user enter email.
2. Server returns session state including `submission_status`, `is_closed`, `due_date`, and all `saved_responses`.
3. Client determines display mode: **Read-Only**, **Re-Entry Editable**, or **Draft Resume**.
4. Appropriate persistent banner displayed on every section throughout the session.
5. All previously saved answers pre-populated before first section renders (no empty→filled flash).
6. For re-entry and submitted sessions: progress indicator segments are clickable for direct section jump.
7. Auto-save continues to function normally in re-entry editable mode.
8. Token expiry mid-session → 401 intercepted → modal: *"Your session expired. Please log in again — your last saved answers are preserved."* → redirect to identity page.

---
---

### Flow 03: Review, Submit & Confirmation

**User Stories:** US-0.3, US-0.4, US-5.1, US-5.4, US-9.1, US-9.2
**Personas:** Marcus Reid (JRN-01.1 Stage 6, JRN-01.2 Stage 5), Priya Nair (JRN-02.1 Stage 5)
**Trigger:** Respondent clicks **Next** on the final section of the assessment.

```
[Final Section — Next clicked]
    │
    └── Auto-save + Navigate to /assessment/review
            │
            ▼
    [Review Step]
     ─ All sections listed with read-only answers
     ─ Each section has [Edit] link
     ─ Unanswered required questions highlighted
     ─ [Submit Assessment] button
            │
            ├── [Edit] clicked on Section N
            │       → Navigate to /assessment (Section N, edit mode)
            │       → User edits → clicks Next
            │       → Navigation returns to /assessment/review
            │         (not Section N+1 — review-return mode)
            │
            ├── Unanswered required questions present
            │       → Submit button shows inline alert above it:
            │         "Please complete all required questions before submitting."
            │         Sections with gaps highlighted; each listed with section name
            │
            └── All required answered → [Submit Assessment] clicked
                    │
                    ├── Client-side due date check → past due
                    │       Inline error: "The assessment due date has passed."
                    │
                    └── POST /api/submissions/:sessionId
                            │
                            ├── 403 ASSESSMENT_CLOSED
                            │       Inline error banner on Review Step
                            │
                            ├── 400 MANDATORY_QUESTIONS_INCOMPLETE
                            │       Highlight missing sections
                            │
                            └── 200 Success
                                    → Navigate to /assessment/confirmation
```

**Confirmation Screen flow:**

```
[/assessment/confirmation]
 ─ "Assessment Submitted!" heading
 ─ "Thank you, {name}. Your assessment has been submitted successfully."
 ─ Edit window notice:
   "You can return to edit your responses until
    {Day, Month DD, YYYY at HH:MM timezone}."
 ─ [Return to Assessment] button → /assessment/review (edit mode)

   If this is an updated (re-)submission:
 ─ "Your submission has been updated. This replaces your previous response."
 ─ Timestamp of last modification shown
```

**Steps:**
1. Review Step renders all sections in read-only format with section-level **Edit** links.
2. Unanswered required questions are highlighted with an amber warning chip on the relevant section.
3. Edit flow: user returns to a section, edits, clicks Next → system returns directly to Review Step (not next section in sequence).
4. Submit button: disabled if any required questions unanswered; enabled when all satisfied.
5. `POST /api/submissions/:sessionId` → server performs final due-date and completeness check.
6. On success: navigate to `/assessment/confirmation` (not accessible by direct URL without a successful submit).
7. Confirmation page shows personalized message, edit window deadline, and **Return to Assessment** button.
8. On re-submission (update): confirmation message distinguishes update from new submission.

---
---

### Flow 04: System Owner Dashboard — Monitor & Analyze

**User Stories:** US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-7.1, US-7.2, US-8.1
**Personas:** Dana Okafor (JRN-03.1, JRN-03.2)
**Trigger:** System Owner navigates to `/dashboard` with a valid System Owner JWT.

```
[Navigate to /dashboard]
    │
    ├── No JWT / Respondent JWT → 403 ACCESS_DENIED
    │       Client shows: "You do not have permission to access this page."
    │       Redirect to /
    │
    └── Valid System Owner JWT
            │
            ▼
    [Dashboard Home]
     ─ Assessment Status badge (Active / Closed / Upcoming)
     ─ Summary stats: Total responses, Submitted, Draft
     ─ Team Type coverage bar (4/4 types represented ✓ or ⚠)
     ─ Response List table (first page, submitted_at DESC)
     ─ [Export CSV] button
     ─ [Analytics] tab/link
     ─ [Settings/Config] link
            │
            ├── [Search / Filter bar] → GET /api/dashboard/responses?filters
            │       ─ Search: name or email (partial match)
            │       ─ Team Type: multi-select checkboxes
            │       ─ Status: All / Submitted / Draft
            │       ─ Date range: submitted_after, submitted_before
            │       Active filters reflected in URL params
            │       No results: "No responses match your current filters."
            │
            ├── [Click any row]
            │       → Navigate to /dashboard/responses/:sessionId
            │         [Individual Response View]
            │          ─ Back button (preserves filter state)
            │          ─ Respondent name, email, team type, status, timestamps
            │          ─ All sections + answers in read-only format
            │          ─ Same question-type widgets as assessment (non-interactive)
            │
            ├── [Export CSV] clicked
            │       GET /api/dashboard/export/csv?{active filters}
            │       ├── Success → file download: assessment-responses-{date}.csv
            │       │            human-readable column headers (question text)
            │       └── Error → "Export could not be generated. Please try again."
            │
            └── [Analytics] tab
                    → GET /api/dashboard/analytics
                    ─ Response counts by team type (horizontal bar chart)
                    ─ Likert distributions per question (stacked bar)
                    ─ Top-ranked items per ranking question (ranked list)
                    ─ Choice breakdowns (pie / horizontal bar)
                    All charts respond to active team type filter
                    Error: "Analytics could not be loaded. Please refresh."
```

**Steps:**
1. Route guard checks JWT role on client side before rendering dashboard (no flash of content).
2. Dashboard home loads with assessment status badge, summary stats, team type coverage check, and response list.
3. Team type coverage check: *"4/4 team types represented ✓"* or *"3/4 ⚠ — Infrastructure/Cloud has 0 responses"*.
4. Response list: paginated 25/page; sortable column headers; each row has respondent name, email, team type, status badge, submitted_at, last_modified_at.
5. Row click → individual response view in ≤ 2 clicks; back button returns with filter state intact.
6. Export CSV: respects active filters; filename `assessment-responses-{YYYY-MM-DD}.csv`.
7. Analytics tab: all charts use server-aggregated data; filter by team type applies globally to all charts.

---

### Flow 05: Assessment Configuration

**User Stories:** US-8.1, US-8.2, US-8.3
**Personas:** Dana Okafor (JRN-03.1 Stages 1–2)
**Trigger:** System Owner clicks **Settings** / **Config** from dashboard.

```
[Dashboard → Settings link]
    │
    ▼
[/dashboard/config — Assessment Configuration Panel]
 ─ Current due date: {date + time + timezone}
 ─ Launch date: {date}
 ─ Status: Active / Closed / Upcoming (computed dynamically)
 ─ Last modified by: {email} at {timestamp}
 ─ [Edit Due Date] button
    │
    └── [Edit Due Date] clicked
            │
            ▼
    [Date/Time Picker (inline or modal)]
     Pre-populated with current due date
     ─ [Cancel] → back to Config Panel (no change)
     ─ [Save] → Confirmation Dialog
            │
            ├── Invalid date format
            │       Inline error: "Please provide a valid date and time."
            │
            └── Valid date → [Confirmation Dialog]
                    "You are about to change the assessment due date
                     from {current} to {new}.
                     This will take effect immediately for all respondents. Confirm?"
                    ─ [Cancel] → back to Config Panel (no change)
                    ─ [Confirm] → PATCH /api/config/due-date
                            │
                            ├── Success → Config Panel updates
                            │       Status badge refreshes
                            │       "Due date updated successfully."
                            │
                            └── Error → "Could not save configuration. Please try again."
```

**Steps:**
1. Config Panel always visible from dashboard settings link (System Owner only; 403 for Respondents).
2. All fields read-only by default; **Edit Due Date** opens the date/time picker.
3. Confirmation dialog shows both old and new dates clearly, with a caution statement about immediate effect.
4. Cancel at any point reverts to no change.
5. Successful save: Config Panel reflects new due date immediately; `config_audit_log` entry written.
6. If new due date is in the past: assessment status transitions to `Closed` immediately; respondents in-session see read-only mode on next action.

---
---

## Screen Designs

### Screen 00: Landing / Identity Capture

**Route:** `/`
**Purpose:** Capture respondent identity (email, name, team type) and initialize or resume a session.
**User Stories:** US-1.1, US-1.2, US-7.1, US-7.3
**Personas:** Marcus Reid (JRN-01.1 Stages 1–2), Priya Nair (JRN-02.1 Stage 1)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express                        [Help link]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Developer Platform Assessment                              │
│  ─────────────────────────────                              │
│  Help us understand your team's needs and readiness         │
│  for Developer Platform tooling.                            │
│                                                             │
│  ⏱ ~15–20 minutes  │  📋 {N} sections  │  🔒 Auto-saved    │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  Work Email Address *                        │           │
│  │  [_______________________________________]   │           │
│  │  (inline error appears here if invalid)      │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  Full Name *                                 │           │
│  │  [_______________________________________]   │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  Your Team Type *                            │           │
│  │  [Select your team type              ▼]      │           │
│  │                                              │           │
│  │  DROPDOWN OPTIONS (expanded):                │           │
│  │  ○ Program / Project                         │           │
│  │    Managing delivery, timelines, or roadmaps │           │
│  │  ○ Platform Engineering                      │           │
│  │    Building or operating developer tooling   │           │
│  │  ○ Infrastructure / Cloud                    │           │
│  │    Cloud, infrastructure, or SRE teams       │           │
│  │  ○ Data / API Governance                     │           │
│  │    Data standards, APIs, or compliance       │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  After selecting team type:                  │           │
│  │  ℹ You'll complete 7 sections tailored to    │           │
│  │    Platform Engineering.                     │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  [        Start Assessment →        ]  (primary CTA)        │
│  (disabled until all 3 fields valid)                        │
│                                                             │
│  Assessment closes: {due_date formatted}                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Returning respondent — Resume Banner (replaces hero text area):**
```
┌────────────────────────────────────────────────────────────┐
│  ✅  Welcome back, Marcus.                                  │
│      Your progress has been loaded.                        │
│      You left off at Section 3 of 5.                       │
│      Edit window open until: Fri, July 31, 2026 at 5:00 PM │
│                                                            │
│  [  Continue Assessment →  ]                               │
└────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Start/Continue CTA | Bottom of form, full-width |
| Primary | Form fields (email, name, team type) | Center, stacked vertically |
| Secondary | Time estimate + section count | Metadata row below title |
| Secondary | Team type description (one-liner per option) | Dropdown sub-text |
| Secondary | Section count preview (after team type select) | Info box below dropdown |
| Tertiary | Due date notice | Footer of card |
| Tertiary | Help link | Top-right header |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default (new) | All fields empty; CTA disabled (grayed out) | N/A |
| Filling in (partial) | Fields populated; CTA still disabled | Real-time inline validation on blur |
| Ready to submit | All fields valid; CTA enabled (primary color) | Team type shows section preview |
| Email error | Red border + inline error below email field | "Please enter a valid email address." |
| Name error | Red border + inline error below name field | "Please enter your full name (at least 2 characters)." |
| System Owner email | Red error banner above CTA | "This email is registered as a System Owner. Please access the dashboard instead." |
| Returning (draft) | Resume banner; fields pre-filled; CTA = "Continue" | "Welcome back, {name}. You left off at Section N." |
| Returning (submitted, edit open) | Resume banner with edit deadline | "Your submission is on file. Edits accepted until {date}." |
| Session expired / stale | Warning banner | "Your previous session could not be found. Please re-enter your details." |
| Loading (POST in flight) | CTA shows spinner; fields disabled | "Starting your assessment…" |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Email field | `<input type="email">` | RFC 5322 validation on blur; real-time format check |
| Full Name field | `<input type="text">` | Min 2 non-whitespace chars; validated on blur |
| Team Type dropdown | `<select>` / custom listbox | Four options with descriptions; triggers section count preview on selection |
| Start Assessment CTA | Primary button | Disabled until all 3 fields valid; submits `POST /api/sessions` |
| Continue Assessment CTA (returning) | Primary button | Pre-filled; submits `POST /api/sessions`; navigates to saved section |

---
---

### Screen 01: Multi-Step Assessment Form (Section View)

**Route:** `/assessment`
**Purpose:** Present one section at a time with question widgets, progress indicator, save state, and navigation controls.
**User Stories:** US-0.1, US-0.2, US-0.4, US-3.1, US-3.2, US-4.1, US-4.2
**Personas:** Marcus Reid (JRN-01.1 Stages 3–4), Priya Nair (JRN-02.1 Stages 2–4)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express             Saved at 2:34 PM  💾    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ● ────────── ○ ────────── ○ ────────── ○ ────────── ○     │
│  1            2            3            4            5      │
│  Gen DP  Current Status  [Sect 3]  [Sect 4]  Feedback      │
│                                                             │
│  Section 2 of 5 — Current Status                           │
│  ─────────────────────────────────                          │
│                                                             │
│  [RE-ENTRY BANNER — if applicable]                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠  You've already submitted your assessment.         │   │
│  │    You can update your answers until July 31, 2026.  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ASSESSMENT CLOSED BANNER — if applicable]                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔒  This assessment is now closed. Your responses    │   │
│  │     are saved and have been submitted.               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Q1. How would you rate your team's current adoption of     │
│      developer platform tooling? *                          │
│  [Question widget — see Screen 02]                          │
│                                                             │
│  Q2. Which DP tools does your team currently use? *         │
│  [Question widget — see Screen 02]                          │
│                                                             │
│  Q3. Describe any integration blockers your team faces.     │
│  [Question widget — see Screen 02]                          │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  [VALIDATION ERROR BANNER — shown on failed Next]          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠  Please answer all required questions before       │   │
│  │    continuing.                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← Previous]                         [Next →]             │
│  (hidden on Section 1)         (becomes "Review" on last)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Current question list | Main content area (center) |
| Primary | Navigation controls (Previous / Next) | Bottom of page, sticky |
| Primary | Validation errors (on Next attempt) | Below each failing field + section banner |
| Secondary | Progress bar / step indicator | Top of page, always visible |
| Secondary | Save state indicator | Top-right header |
| Secondary | Section title and subtitle | Above question list |
| Secondary | Re-entry / Assessment Closed banner | Below section title, above questions |
| Tertiary | Required marker (*) per question label | Inline in question label |
| Tertiary | Character counters (free text) | Below text inputs |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default (first visit) | All questions empty; navigation active | Save indicator: "Unsaved changes" initially |
| Answering (dirty) | Fields partially filled; save indicator = "Unsaved changes" | 30s idle → auto-save triggers |
| Saving | Save indicator shows spinner + "Saving…" | Navigation still enabled during save |
| Saved | Save indicator: "Saved at {HH:MM AM/PM}" | Green check icon |
| Save failed (retry) | Save indicator: "Unsaved changes — server error. Retrying…" | Auto-retry up to 3× |
| Save failed (permanent) | Save indicator: "Could not save. Please try again." | Manual retry option |
| Validation error | Section-level banner + per-field red border/error text | Fields scroll into view on error |
| Read-only (closed) | All inputs replaced with static text; no controls | "Assessment is now closed." banner |
| Re-entry (edit open) | All inputs editable; amber banner at top | "You can update answers until {date}." |
| Section transition | Brief loading state (< 1s) | SPA transition, no full reload |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Progress bar segments | Clickable (re-entry mode only) | Direct jump to any completed section |
| Previous button | Secondary button | Always permitted; triggers auto-save |
| Next button | Primary button | Validates required fields; triggers auto-save on pass |
| Next → "Review" | Primary button (last section) | Label changes to "Review Answers" on final section |
| Save state indicator | Read-only status chip | Updates in real time; not interactive |

---
---

### Screen 02: Question Type Widgets (Component Detail)

**Route:** `/assessment` (embedded in section view)
**Purpose:** Define the UI component for each of the six question types and the "Other" conditional reveal.
**User Stories:** US-2.1, US-2.2, US-2.3, US-2.4, US-2.5
**Personas:** Marcus Reid (US-2.1, US-2.3), Priya Nair (US-2.2, US-2.4, US-2.5)

#### Single-Choice (Radio)

```
┌──────────────────────────────────────────────────────────┐
│  Q. How does your team currently track platform needs? * │
│                                                          │
│  ○ We use a formal requirements document                 │
│  ○ We use informal team discussions                      │
│  ○ We rely on individual team leads                      │
│  ○ Other                                                 │
│    └─► [______________________________________] 0/500    │
│        (revealed only when "Other" is selected)          │
│        "Please specify your 'Other' answer."             │
│        (error shown if blank on Next)                    │
└──────────────────────────────────────────────────────────┘
```

#### Multi-Choice (Checkbox)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Which DP tools does your team currently use?  *      │
│     (Select all that apply)                              │
│                                                          │
│  ☐ Backstage                                             │
│  ☑ GitHub Actions                                        │
│  ☐ Harness IDP                                           │
│  ☐ None of the above                                     │
│  ☑ Other                                                 │
│    └─► [GitLab Enterprise CI/CD pipelines____] 23/500    │
│        char counter turns red at ≥ 450 chars             │
└──────────────────────────────────────────────────────────┘
```

#### Likert Scale (5-point)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Our team is ready to adopt a new DP tool today. *    │
│                                                          │
│  Strongly                                  Strongly      │
│  Disagree   1     2     3     4     5      Agree         │
│             ○     ○     ●     ○     ○                    │
│             │←── keyboard arrow navigation ──►│          │
│                                                          │
│  (ARIA role="radiogroup"; aria-label="Likert scale 1-5") │
└──────────────────────────────────────────────────────────┘
```

#### Ranking (Drag-and-Drop + Numbered Fallback)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Rank the following capabilities by priority. *       │
│     (Drag to reorder, or enter numbers directly)         │
│                                                          │
│  ≡  CI/CD Pipeline Integration           [  1  ▲▼]      │
│  ≡  Plugin Extensibility                 [  3  ▲▼]      │
│  ≡  Onboarding Automation                [  2  ▲▼]      │
│  ≡  Software Catalog                     [  4  ▲▼]      │
│  ≡  Developer Portal Customization       [  5  ▲▼]      │
│                                                          │
│  ≡ = drag handle (touch/mouse drag)                      │
│  [n] = numbered input fallback (type rank directly)      │
│  ▲▼ = up/down move buttons (keyboard accessible)         │
│                                                          │
│  Error state:                                            │
│  ⚠ "Please assign a rank to all items."                  │
│  ⚠ "Each item must have a unique rank." (on duplicate)   │
└──────────────────────────────────────────────────────────┘
```

#### Free Text Short (Single-line)

```
┌──────────────────────────────────────────────────────────┐
│  Q. What is the primary DP capability gap your team has? │
│     (optional)                                           │
│                                                          │
│  [____________________________________________] 42/500   │
│  (single-line input; char counter; max 500)              │
│  Counter turns amber at 400+, red at 480+                │
└──────────────────────────────────────────────────────────┘
```

#### Free Text Long (Textarea)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Describe your team's specific integration             │
│     requirements in detail.  *                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ We use GitLab Enterprise with self-hosted runners. │  │
│  │ Our pipeline requires...                           │  │
│  │                                                    │  │
│  │                                                  ↕│  │  ← resize handle
│  └────────────────────────────────────────────────────┘  │
│  187/2000                                                │
│  Counter turns amber at 1800+, red at 1950+              │
│  Error: "Your answer exceeds the maximum length of        │
│          2000 characters."                               │
└──────────────────────────────────────────────────────────┘
```

#### "Other" Conditional Reveal

```
State machine:
  "Other" unselected → text input: hidden (display: none; aria-hidden: true)
  "Other" selected   → text input: visible (aria-expanded: true on parent)
                        auto-focus moves to text input
  "Other" deselected → text input: hidden again; value CLEARED
```

#### States (per question widget)

| State | Appearance | Feedback |
|-------|------------|----------|
| Unanswered (optional) | Neutral border | None |
| Unanswered (required, not yet tried) | Neutral border with * label | None |
| Unanswered (required, Next attempted) | Red border + error text below | "This question requires an answer." |
| Answered | Neutral or subtle filled state | None |
| "Other" selected | Radio/checkbox selected + text input revealed | Input auto-focused |
| "Other" blank on Next | Red border on text input | "Please specify your 'Other' answer." |
| Char limit approaching | Amber counter | Visual only |
| Char limit exceeded | Red counter + error text | "Your answer exceeds {limit} characters." |
| Read-only | Static display (no interactive controls) | Answers shown as formatted text |

---
---

### Screen 03: Review & Submit

**Route:** `/assessment/review`
**Purpose:** Display all answers in read-only format across all sections before final submission. Allow editing any section and re-checking completeness.
**User Stories:** US-0.3, US-0.4, US-5.1, US-5.4
**Personas:** Marcus Reid (JRN-01.1 Stage 6), Priya Nair (JRN-02.1 Stage 5)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express             Saved at 2:34 PM  💾    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ● ─────────── ● ─────────── ● ─────────── ● ─────────── ●│
│  1             2             3             4             5  │
│  (all segments filled/completed)            ← Review Step   │
│                                                             │
│  Review Your Answers                                        │
│  ────────────────────                                       │
│  Please review your answers below. Click Edit to make       │
│  changes to any section.                                    │
│                                                             │
│  [COMPLETENESS WARNING — if gaps exist]                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠  Some required questions are unanswered:           │   │
│  │    • Section 2 – Current Status: Q3                  │   │
│  │    • Section 3 – Platform Needs: Q1                  │   │
│  │  Please edit those sections before submitting.       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌── Section 1: General DP Alignment ──────────── [Edit] ┐  │
│  │  Q1. How would you rate…               ●●●○○  [3/5]  │  │
│  │  Q2. Which DP tools…                   ☑ Backstage   │  │
│  │                                        ☑ Other: …    │  │
│  │  Q3. Describe blockers…                [text answer] │  │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌── Section 2: Current Status ────────────────── [Edit] ┐  │
│  │  Q1. Rate current adoption…            ●●○○○  [2/5]  │  │
│  │  Q2. ⚠ (required, unanswered)          —             │  │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  [... remaining sections ...]                               │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  [← Back to Last Section]                                  │
│                                                             │
│  [        Submit Assessment        ]  (primary CTA)         │
│  (disabled if required questions unanswered)                │
│                                                             │
│  By submitting, you confirm these answers reflect your      │
│  team's current assessment. You can edit until {due_date}.  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Submit CTA | Bottom of page, prominent |
| Primary | Completeness warning (if gaps) | Top of review content, amber banner |
| Primary | All section answer summaries | Stacked sections in center |
| Secondary | [Edit] link per section | Top-right of each section card |
| Secondary | Edit window reminder | Below Submit CTA |
| Tertiary | Back to Last Section link | Bottom-left, secondary action |
| Tertiary | Progress bar (all filled) | Top of page |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Complete (all answered) | Submit button enabled; no warning banner | N/A |
| Incomplete (gaps exist) | Submit button disabled; amber warning banner with section + Q refs | "Some required questions are unanswered: {list}" |
| Submitting | Submit button shows spinner; disabled | "Submitting your assessment…" |
| Submit error (ASSESSMENT_CLOSED) | Red error banner | "The assessment due date has passed." |
| Submit error (server) | Red error banner | "Submission could not be processed. Please try again." |
| Unanswered field in summary | Amber chip / dash with ⚠ icon | Question row shows warning marker |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| [Edit] per section | Secondary link/button | Navigates to that section in edit mode; Next returns to Review (not sequential) |
| Back to Last Section | Secondary link | Returns to final section in edit mode |
| Submit Assessment | Primary button | `POST /api/submissions/:sessionId`; disabled if incomplete |
| Progress bar | Non-clickable (on first submit path) | All segments show completed state |

---
---

### Screen 04: Submission Confirmation

**Route:** `/assessment/confirmation`
**Purpose:** Confirm successful submission, communicate the edit window deadline, and offer a path back to the assessment for revisions.
**User Stories:** US-9.1, US-9.2
**Personas:** Marcus Reid (JRN-01.1 Stage 6, JRN-01.2 Stage 5), Priya Nair (JRN-02.1 Stage 5, JRN-02.2 Stage 4)

#### Layout — First Submission

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ✅                                   │
│                                                             │
│            Assessment Submitted!                            │
│            ──────────────────────                           │
│                                                             │
│  Thank you, Marcus. Your assessment has been submitted      │
│  successfully.                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  You can return to edit your responses until:    │   │
│  │                                                      │   │
│  │       Friday, July 31, 2026 at 5:00 PM EDT           │   │
│  │                                                      │   │
│  │  To update your answers, revisit this link and       │   │
│  │  re-enter your email address.                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [  Return to Assessment to Review / Edit Answers  ]        │
│                                                             │
│  (Page only reachable via successful POST /api/submissions) │
│  (Direct URL navigation → redirected to /assessment/review) │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Updated Submission (Re-entry / Re-submit)

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ✅                                   │
│                                                             │
│            Assessment Updated!                              │
│            ─────────────────────                            │
│                                                             │
│  Your submission has been updated, Marcus.                  │
│  This replaces your previous response — no duplicate        │
│  was created.                                               │
│                                                             │
│  Last modified: July 19, 2026 at 10:42 AM EDT               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅  Edit window closes:                             │   │
│  │       Friday, July 31, 2026 at 5:00 PM EDT           │   │
│  │                                                      │   │
│  │  One record exists for priya.nair@company.com        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [  Return to Assessment to Review Answers  ]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Success icon + heading | Top center (large, prominent) |
| Primary | Personalized thank-you message | Below heading |
| Primary | Edit window deadline (date + time + timezone) | Info card, center |
| Secondary | Return to Assessment button | Below info card |
| Secondary | "No duplicate created" (update flow only) | Below heading (reassurance message) |
| Tertiary | Last modified timestamp (update flow) | Below update message |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| First submission | Green ✅ icon; "Submitted!" heading; edit window card | Thank-you message with edit deadline |
| Updated submission | Green ✅ icon; "Updated!" heading; "no duplicate" message | Last modified timestamp shown |
| Due date unavailable | Info card shows fallback | "Contact the System Owner for deadline information." |
| Direct URL access (no submit) | N/A — redirect to /assessment/review | (Transparent to user) |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Return to Assessment | Secondary button | Navigates to `/assessment/review` in editable mode |

---
---

### Screen 05: Re-Entry / Edit Mode

**Route:** `/assessment` (with `submission_status: submitted`, within edit window)
**Purpose:** Allow respondents who have previously submitted to review and update their answers, with a persistent banner making the edit context clear at all times.
**User Stories:** US-5.2, US-5.3, US-9.2, US-9.3
**Personas:** Marcus Reid (JRN-01.2), Priya Nair (JRN-02.2)

#### Layout — Edit Window Open

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express             Saved at 9:12 AM  💾    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✏  Editing your submitted assessment.                │   │
│  │    You can update your answers until:                │   │
│  │    Friday, July 31, 2026 at 5:00 PM EDT              │   │
│  │    (Non-dismissible; persists across all sections)   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ● ─────────── ● ─────────── ● ─────────── ●              │
│  1             2             3             4               │
│  (all segments clickable — direct section jump)             │
│                                                             │
│  Section 3 of 7 — Platform Needs & Capability Requirements  │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  Q1. Rank the following capabilities by priority. *         │
│  [Ranking widget — fully editable]                          │
│                                                             │
│  Q2. Which CI/CD tools does your team currently use? *      │
│  [Multi-choice widget — pre-selected with saved values]     │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  [← Previous]                              [Next →]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Assessment Closed (Read-Only)

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔒  This assessment is now closed.                   │   │
│  │    Your responses are saved and have been            │   │
│  │    submitted to the System Owner.                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ● ─────────── ● ─────────── ● ─────────── ●              │
│  (all segments clickable — review navigation)               │
│                                                             │
│  Section 2 of 5 — Current Status            [READ ONLY]     │
│                                                             │
│  Q1. How would you rate current adoption?                   │
│  ┌────────────────────────────────┐                         │
│  │  ●●●○○  3 / 5 — Neutral        │  (static display)      │
│  └────────────────────────────────┘                         │
│                                                             │
│  Q2. Which tools does your team use?                        │
│  ┌────────────────────────────────┐                         │
│  │  ✓ Backstage                   │                         │
│  │  ✓ GitHub Actions              │  (static display)      │
│  └────────────────────────────────┘                         │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  [← Previous]                              [Next →]         │
│  (navigation still works; no Save or Submit controls)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Edit mode or closed mode banner | Below global header, above progress bar (non-dismissible) |
| Primary | Question widgets (editable or read-only) | Main content area |
| Secondary | Progress bar (clickable) | Below banner |
| Secondary | Section title + read-only label | Above question list |
| Secondary | Auto-save indicator (edit mode only) | Global header |
| Tertiary | Edit window deadline in banner | Within banner text |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Edit window open | Amber/blue "Editing" banner; all inputs active; save indicator shown | Banner persists across every section |
| Assessment closed | Red/neutral "Closed" banner; all inputs static text; controls hidden | Previous/Next work; no Save/Submit |
| Saving during edit | Save indicator: "Saving…" | Navigation not blocked |
| Auto-save error during edit | Save indicator: "Unsaved changes — server error. Retrying…" | 3× retry with backoff |
| Server rejects edit (403 ASSESSMENT_CLOSED) | Banner updates to closed state | "Assessment is closed. Your responses are read-only." |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Progress bar segments | Clickable (always in re-entry mode) | Direct jump to any section |
| Question inputs | Active or static | Editable in edit window; read-only strings when closed |
| Previous / Next | Navigation buttons | Work in both modes; no Save on closed |
| Save state indicator | Read-only chip | Shown in edit mode only |
| Submit (on Review Step) | Primary button | Only in edit-window-open mode |

---
---

### Screen 06: System Owner Dashboard — Home / Response List

**Route:** `/dashboard`
**Purpose:** Give System Owners a full view of all respondents, participation stats, filtering tools, and export capability.
**User Stories:** US-6.1, US-6.2, US-6.3, US-6.5, US-7.2, US-8.1
**Personas:** Dana Okafor (JRN-03.1 Stages 2–5, JRN-03.2 Stages 1–4)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express — System Owner Dashboard            │
│                           [Active ●]  [Settings ⚙]  [Exit]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────── Summary Stats ─────────────────────┐  │
│  │  Total: 27    Submitted: 21    Draft: 6              │  │
│  │                                                       │  │
│  │  Team Type Coverage:                                  │  │
│  │  Program/Project      ████████  8 ✓                   │  │
│  │  Platform Engineering ██████    6 ✓                   │  │
│  │  Infrastructure/Cloud █         1 ⚠ (low)             │  │
│  │  Data/API Governance  ████      4 ✓                   │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  Coverage: 4/4 team types represented ✓               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────── Search & Filters ──────────────────────────┐  │
│  │ 🔍 [Search by name or email…         ]               │  │
│  │                                                       │  │
│  │ Team Type: [✓ All] [Platform Eng] [Infra/Cloud] …    │  │
│  │ Status:    (●) All  ( ) Submitted  ( ) Draft         │  │
│  │ Date:      [From: ________]  [To: ________]          │  │
│  │                                                       │  │
│  │ [Clear Filters]              [Export CSV ↓]          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────── Response List ─────────────────────┐  │
│  │  Name ↕    Email ↕      Team Type ↕  Status  Sub'd ↕ │  │
│  │  ────────────────────────────────────────────────── │  │
│  │  Priya N.  p.nair@…  Platform Eng  Submitted 07/19  │  │
│  │  Marcus R. m.reid@…  Prog/Project  Draft     —      │  │
│  │  [row 3]                                            │  │
│  │  [row 4]                                            │  │
│  │  …                                                  │  │
│  │  ────────────────────────────────────────────────── │  │
│  │  ← Prev   Page 1 of 2   [1] [2]   Next →           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [  Analytics Charts  →  ]  (tab / section link)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Response List Columns

| Column | Sortable | Content |
|--------|----------|---------|
| Name | ✓ | Respondent full name |
| Email | ✓ | Respondent email (copy icon on hover) |
| Team Type | ✓ | One of four team type labels |
| Status | ✓ | Badge: `Submitted` (green) or `Draft` (amber) |
| Submitted At | ✓ (default DESC) | Date + time of submission, or `—` |
| Last Modified | ✗ | Date + time of last auto-save |

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Response list table | Center main area |
| Primary | Search + filter bar | Above response list |
| Primary | Export CSV button | Top-right of filter bar |
| Secondary | Summary stats + team type coverage | Top card |
| Secondary | Assessment status badge (Active/Closed) | Global header |
| Secondary | Pagination controls | Below table |
| Tertiary | Analytics Charts link | Below table / in nav |
| Tertiary | Settings / Config link | Global header |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default (loaded) | Response list, summary stats, no filters active | Default sort: submitted_at DESC |
| Filtering | Active filters shown as chips; table refreshes | URL params updated for bookmarking |
| No results | Table replaced with empty state | "No responses match your current filters." |
| Loading (filter/sort) | Table rows show skeleton loaders | N/A |
| Export in progress | Button shows spinner | "Generating export…" |
| Export error | Error toast | "Export could not be generated. Please try again." |
| Low participation warning | Infrastructure/Cloud row shows ⚠ amber color | Visual alert on coverage bar |
| Unauthorized access | Full page 403 state | "You do not have permission to access this page." |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Search field | `<input type="search">` | Case-insensitive partial match on name + email |
| Team Type filter | Multi-select checkboxes | Combinable with other filters |
| Status filter | Radio group (All/Submitted/Draft) | Single select |
| Date range pickers | Date input pair | submitted_after ≤ submitted_before |
| Column headers (sortable) | Click to toggle ASC/DESC | Indicator arrow on active column |
| Table rows | Clickable | Navigates to `/dashboard/responses/:sessionId` |
| Email address | Copy icon on hover | Copies email to clipboard |
| Export CSV | Button | `GET /api/dashboard/export/csv?{filters}` |
| Pagination controls | Previous/Next + page numbers | 25 rows per page |
| Assessment status badge | Non-interactive | Active (green) / Closed (gray) / Upcoming (blue) |
| [Analytics Charts] link | Navigation | Goes to `/dashboard/analytics` |
| [Settings ⚙] link | Navigation | Goes to `/dashboard/config` |

---
---

### Screen 07: System Owner Dashboard — Analytics Charts

**Route:** `/dashboard/analytics`
**Purpose:** Present aggregated, filterable visualizations of all response data for stakeholder presentation and decision-making.
**User Stories:** US-6.4
**Personas:** Dana Okafor (JRN-03.2 Stage 5)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express — Analytics              [Active ●] │
│  [← Response List]                       [Settings ⚙] [Exit]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───── Global Filter (applies to all charts) ───────────┐  │
│  │  Team Type: [✓ All] [Platform Eng] [Infra] [Data/API] │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  CHART 1: Response Counts by Team Type                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Program / Project      ████████████████  8        │    │
│  │  Platform Engineering   ████████████     6         │    │
│  │  Infrastructure/Cloud   ██               1         │    │
│  │  Data / API Governance  ████████         4         │    │
│  │  (horizontal bar chart)                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  CHART 2: Likert Distributions (per question)               │
│  Q: "Our team is ready to adopt a new DP tool today."       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1-SD  ████  15%                                   │    │
│  │  2     ███████  25%                                 │    │
│  │  3-N   █████████  32%                               │    │
│  │  4     ██████  20%                                  │    │
│  │  5-SA  ███  8%                                      │    │
│  │  (stacked bar / individual bars per point)          │    │
│  └────────────────────────────────────────────────────┘    │
│  [← Q]  Question 2 of 4 Likert questions  [Q →]            │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  CHART 3: Top-Ranked Capabilities (Ranking Questions)       │
│  Q: "Rank DP capabilities by priority."                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  #1  Onboarding Automation          avg rank: 1.8   │    │
│  │  #2  CI/CD Pipeline Integration     avg rank: 2.1   │    │
│  │  #3  Plugin Extensibility           avg rank: 2.9   │    │
│  │  #4  Software Catalog               avg rank: 3.7   │    │
│  │  #5  Developer Portal Customization avg rank: 4.5   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  CHART 4: Choice Question Breakdowns                        │
│  Q: "Which DP tools does your team currently use?"          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ████ Backstage          45%                       │    │
│  │  ████ GitHub Actions     72%                       │    │
│  │  ██   Harness IDP        18%                       │    │
│  │  ████ Other              31%                       │    │
│  │  (horizontal bar or pie chart)                      │    │
│  └────────────────────────────────────────────────────┘    │
│  [← Q]  Question 1 of 6 choice questions  [Q →]            │
│                                                             │
│  Error state:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠  Analytics could not be loaded. Please refresh.   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Four chart groups (counts, Likert, ranking, choice) | Stacked vertically, full width |
| Primary | Global team-type filter | Sticky bar at top of analytics area |
| Secondary | Chart titles + question labels | Above each chart |
| Secondary | Pagination for multi-question chart types | Below each chart group |
| Tertiary | Navigation links (back to response list) | Global header |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton chart placeholders | "Loading analytics…" |
| Loaded | Full charts with data | N/A |
| Filter applied | Charts re-render for filtered segment | Team type filter chip shown as active |
| No data for filter | Chart shows "No data for this filter" | "No responses for {team type} yet." |
| Error | Charts replaced with error banner | "Analytics could not be loaded. Please refresh." |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Team Type filter | Multi-select chips | Filters all charts simultaneously |
| Likert question paginator | Previous/Next arrows | Steps through available Likert questions |
| Choice question paginator | Previous/Next arrows | Steps through available choice questions |
| Chart tooltips | Hover | Shows exact count + percentage on hover |

#### Presentation Mode Consideration (JRN-03.2 Stage 5)

Charts must be readable at 1080p projection resolution:
- Minimum font size: 14px for chart labels
- Minimum bar height: 24px for horizontal bars
- High-contrast color palette (accessible; see Y2-accessibility.md)
- Option to expand individual chart to full-screen (`⛶` expand icon per chart)

---
---

### Screen 08: Assessment Configuration Panel

**Route:** `/dashboard/config`
**Purpose:** Allow System Owners to view and update the assessment due date, and verify current assessment status.
**User Stories:** US-8.1, US-8.2, US-8.3
**Personas:** Dana Okafor (JRN-03.1 Stages 1–2)

#### Layout — Config Panel (Default / Read State)

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express — Assessment Configuration          │
│  [← Dashboard]                              [Settings ⚙]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Assessment Configuration                                   │
│  ─────────────────────────                                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Status          [● Active]                           │  │
│  │                  (computed: Active / Closed / Upcoming)│  │
│  │                                                       │  │
│  │  Launch Date     Monday, July 17, 2026                │  │
│  │                                                       │  │
│  │  Due Date        Friday, July 31, 2026 at 5:00 PM EDT │  │
│  │                                           [Edit ✏]   │  │
│  │                                                       │  │
│  │  Last Modified   July 17, 2026 by dana@company.com    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🔗  Copy Assessment Link                             │  │
│  │      https://assessment.company.com/                  │  │
│  │      [Copy Link]  (one-click clipboard copy)          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Deduplication Status                                 │  │
│  │  ✓ Deduplication applied — 0 duplicate email addresses│  │
│  │    detected across 27 sessions.                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Edit Due Date (Inline Date Picker)

```
┌─────────────────────────────────────────────────────────────┐
│  Due Date        [Edit clicked → field becomes editable]    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  New Due Date & Time                                  │  │
│  │  [  August 7, 2026  ▼]   [ 17:00 ]  [EDT ▼]         │  │
│  │                                                       │  │
│  │  Error: "Please provide a valid date and time."       │  │
│  │  (shown if date is invalid or missing)                │  │
│  │                                                       │  │
│  │  [Cancel]                            [Save Changes]   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Confirmation Dialog (Before Save Takes Effect)

```
┌────────────────────────────────────────────────────────┐
│  Confirm Due Date Change                               │
│  ─────────────────────────                             │
│                                                        │
│  You are about to change the assessment due date:      │
│                                                        │
│  From:  Friday, July 31, 2026 at 5:00 PM EDT           │
│  To:    Friday, August 7, 2026 at 5:00 PM EDT          │
│                                                        │
│  ⚠ This will take effect immediately for all active    │
│    respondents. No application restart is required.    │
│                                                        │
│  [  Cancel  ]              [  Confirm Change  ]        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Current due date + Edit button | Config card, center |
| Primary | Assessment status badge | Top of config card |
| Secondary | Launch date | Config card |
| Secondary | Copy Assessment Link | Separate info card below config |
| Secondary | Last modified by (audit info) | Config card footer |
| Tertiary | Deduplication status | Separate status card |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default (read) | All fields read-only; Edit button present | N/A |
| Editing due date | Date/time picker open; Cancel + Save buttons visible | Inline validation |
| Invalid date | Red border on picker; error text | "Please provide a valid date and time." |
| Confirmation dialog | Modal overlay; From → To clearly shown | Caution message about immediate effect |
| Saving | Confirm button shows spinner | "Updating configuration…" |
| Save success | Config card refreshes with new date; success toast | "Due date updated successfully." |
| Save error | Error toast | "Could not save configuration. Please try again." |
| Past date entered | Warning in dialog | "This date is in the past. Setting it will immediately close the assessment." |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| [Edit ✏] due date | Icon button | Opens inline date/time picker |
| Date picker | Date + time input | Pre-populated with current due date |
| [Cancel] | Secondary button | Closes picker; no change made |
| [Save Changes] | Primary button | Opens confirmation dialog |
| [Cancel] in dialog | Secondary button | Closes dialog; no change made |
| [Confirm Change] | Primary button (destructive-adjacent) | `PATCH /api/config/due-date`; takes effect immediately |
| [Copy Link] | Button | Copies assessment URL to clipboard; shows "Copied!" toast |

---
---

## Interaction Patterns

### Pattern 1: Save State Indicator

**User Stories:** US-4.1, US-4.2
**When to use:** Always visible in the global header during the active assessment session.
**Examples:** All assessment section screens (Screens 01, 05)

```
States:
  💾  Unsaved changes           ← dirty state; changes exist, not yet saved
  ⟳   Saving…                  ← PUT /api/responses in flight
  ✅  Saved at 2:34 PM          ← last successful save; timestamp from server
  ⚠   Unsaved — server error. Retrying… ← save failed; auto-retry in progress
  ✗   Could not save. Please try again.  ← after 3 retries; manual retry link shown
```

**Behavior:**
- Indicator is always visible; positioned top-right in header.
- Does not block navigation (Previous / Next) even on error state.
- On retry exhaustion, manual retry link is shown alongside the error text.
- On session resume: immediately shows `Saved at {last_saved_at}`.

---

### Pattern 2: Inline Validation Errors

**User Stories:** US-0.4, US-2.1–US-2.5, US-1.1
**When to use:** On form fields when validation fails (Next pressed or blur from field).
**Examples:** Identity page (Screen 00), all question types (Screen 02)

```
Field-level error pattern:
  ┌─────────────────────────────────────┐
  │  Question Label *                    │
  │  [_________________________]         │
  │  ⚠ Error message text here.         │
  └─────────────────────────────────────┘

  - Red border on the input element
  - Error text in red below the field
  - Error text associated with field via aria-describedby
  - Error clears as soon as the field becomes valid
```

**Section-level error banner (on Next press with multiple errors):**
```
  ┌──────────────────────────────────────────────┐
  │  ⚠  Please answer all required questions     │
  │     before continuing.                        │
  └──────────────────────────────────────────────┘
  + Each failing field individually highlighted
```

---

### Pattern 3: Persistent Contextual Banners

**User Stories:** US-1.2, US-5.2, US-5.3, US-9.2, US-9.3
**When to use:** Whenever a user's session context deviates from the standard first-time experience.
**Examples:** Screens 01, 05

| Banner Type | Color / Icon | Dismissible | When Shown |
|-------------|-------------|-------------|------------|
| Resume (draft) | Blue / ℹ | Yes (once dismissed) | Returning draft respondent, first section |
| Re-entry (submitted, edit open) | Amber / ✏ | No | Every section, until session ends |
| Assessment Closed | Gray / 🔒 | No | Every section after due date |
| Session Expired | Red / ⚠ | Via re-auth | When 401 intercepted mid-session |

**Placement:** Immediately below the global header; above the progress bar. Full-width.

---

### Pattern 4: Confirmation Dialogs (Destructive / Consequential Actions)

**User Stories:** US-8.2
**When to use:** Before any action with immediate, irreversible, or far-reaching effects.
**Examples:** Assessment config due date change (Screen 08)

```
Dialog structure:
  ┌──────────────────────────────────────┐
  │  [Action Title]                      │
  │  ─────────────────────────           │
  │  Clear description of what will      │
  │  happen and who will be affected.    │
  │                                      │
  │  From: {current state}               │
  │  To:   {new state}                   │
  │                                      │
  │  ⚠ [Impact warning if applicable]   │
  │                                      │
  │  [Cancel]       [Confirm Action]     │
  └──────────────────────────────────────┘
```

**Rules:**
- Default focus on **Cancel** (safer action) to prevent accidental confirm.
- Confirm button is primary; Cancel is secondary.
- Pressing Escape = Cancel.
- Clicking backdrop = Cancel.

---

### Pattern 5: Progress Bar / Step Indicator

**User Stories:** US-0.2, US-3.1
**When to use:** Always visible during assessment sections.
**Examples:** Screens 01, 03, 05

```
New respondent (forward navigation only):
  ● ─── ○ ─── ○ ─── ○ ─── ○
  1     2     3     4     5
  (filled = current; empty = upcoming; check = completed)

After completing sections:
  ✓ ─── ✓ ─── ● ─── ○ ─── ○
  1     2     3     4     5

Re-entry mode (all clickable):
  ✓ ─── ✓ ─── ✓ ─── ✓ ─── ●
  [1]   [2]   [3]   [4]   [5]   ← each segment clickable for direct jump
```

**Accessibility:** `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Individual steps have `aria-label="Section {N}: {title}, {status}"`. Keyboard: Tab to segment → Enter/Space to jump (re-entry only).

---

### Pattern 6: Empty & Loading States

**When to use:** Tables, charts, and lists that depend on async data.

| Context | Loading State | Empty State |
|---------|--------------|-------------|
| Response list | Skeleton rows (4–5 ghost rows) | "No responses match your current filters." |
| Analytics charts | Skeleton chart placeholders | "No data available for the current filters." |
| Individual response | Full-page skeleton | 404: "The requested response could not be found." |
| Dashboard initial load | Summary stat skeletons + table skeletons | (should always have data once System Owner logs in) |

---

### Pattern 7: Ranking Widget Interaction

**User Stories:** US-2.4
**Dual interaction model:**

```
Primary (drag-and-drop):
  ≡ Item A  [  1  ]   ← mouse/touch drag the row
  ≡ Item B  [  2  ]
  ≡ Item C  [  3  ]

  On drag start: dragged row gains elevation/shadow
  On drop: position numbers update in real time
  Auto-save triggered after each successful reorder

Fallback (numbered input):
  ≡ Item A  [  1  ▲▼]  ← type directly OR use ▲▼ buttons
  ≡ Item B  [  3  ▲▼]
  ≡ Item C  [  2  ▲▼]

  Duplicate detection: if two items share a rank,
  both highlighted amber with error: "Each item must have a unique rank."
```

---
---

## Responsive Considerations

AssessmentForm-Express is a web SPA for enterprise internal use. Primary device is **desktop** (enterprise workstations and laptops). Tablet support is expected; mobile is best-effort. The dashboard is explicitly desktop-first due to table/chart complexity.

### Breakpoints

| Breakpoint | Label | Range | Priority |
|------------|-------|-------|----------|
| Large Desktop | `lg` | ≥ 1280px | Primary (Dashboard) |
| Desktop | `md` | 1024px – 1279px | Primary (Assessment) |
| Tablet | `sm` | 768px – 1023px | Supported |
| Mobile | `xs` | < 768px | Best-effort (assessment form only) |

---

### Assessment Form — Responsive Layouts

#### Desktop (≥ 1024px)

```
┌──────────────── 1024px+ ────────────────────────────────┐
│  Header (full-width): Logo + Save State Indicator        │
├─────────────────────────────────────────────────────────┤
│  Progress Bar (full-width, 5–7 labeled segments)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Contextual Banner — full width if applicable]         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Section Title                                  │   │
│  │                                                 │   │
│  │  Question list (single column, centered max-   │   │
│  │  width ~720px for readability)                  │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [← Previous]                            [Next →]      │
└─────────────────────────────────────────────────────────┘
```

- Question area max-width: 720px, centered
- Navigation buttons: bottom of page, spread left/right
- Progress bar: all section labels visible

#### Tablet (768px – 1023px)

```
┌─────────────── 768px – 1023px ─────────────────────────┐
│  Header: Logo (compact) + Save State (abbreviated)       │
├─────────────────────────────────────────────────────────┤
│  Progress Bar: segment dots + current section label      │
│  "Section 2 of 5 — Current Status"                      │
├─────────────────────────────────────────────────────────┤
│  [Contextual Banner — full width]                       │
│                                                         │
│  Question list (full width, 16px padding sides)         │
│                                                         │
│  [← Previous]                            [Next →]      │
└─────────────────────────────────────────────────────────┘
```

- Progress bar: show dots only (no labels); current section title shown as text below bar
- Ranking drag-and-drop: supported; ▲▼ buttons more prominent
- "Other" text inputs: full width

#### Mobile (< 768px) — Assessment Form Only

```
┌───── < 768px ──────────────────────────────────────────┐
│  Header: Logo + "Saved ✅" (icon only on smallest)      │
├─────────────────────────────────────────────────────────┤
│  Progress: "Section 2 / 5" (text only; no bar)          │
├─────────────────────────────────────────────────────────┤
│  [Contextual Banner — truncated if long]                │
│                                                         │
│  Questions stacked, full width                          │
│  Likert: vertically stacked options (1–5)               │
│  Ranking: numbered input only (drag-and-drop hidden)    │
│                                                         │
│  [← Prev]                              [Next →]        │
└─────────────────────────────────────────────────────────┘
```

- Drag-and-drop ranking replaced by numbered input on touch-only devices
- Likert radio buttons: vertically stacked for touch target size (min 44px)
- Free text inputs: full width; virtual keyboard tested for scroll behavior

---

### Dashboard — Responsive Layouts

The dashboard is desktop-first. Tablet is functional; mobile is degraded but accessible.

#### Large Desktop (≥ 1280px)

```
┌─────────────── 1280px+ ─────────────────────────────────┐
│  Header: Logo + Status Badge + Nav links + Exit          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─── Summary Stats (full row) ───────────────────────┐ │
│  │ Total | Submitted | Draft | Team Coverage (bars)   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─── Filters ─────────────────────────────────────── ┐ │
│  │  Search [____]  Team[✓✓✓✓]  Status(●)  Date[  ][  ]│ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  Response List Table (full width)                       │
│  Pagination                                             │
└─────────────────────────────────────────────────────────┘
```

#### Desktop (1024px – 1279px)

- Identical to large desktop; team type coverage bars may wrap

#### Tablet (768px – 1023px)

- Summary stats collapse to 2-column grid (Total+Submitted | Draft+Coverage)
- Filter bar stacks vertically (search → team type → status → date range)
- Response list: hide `Last Modified` column; show Name, Team Type, Status, Submitted At
- Pagination: compact (Prev | 1 | 2 | Next)

#### Mobile (< 768px) — Dashboard Not Recommended

- Display a prompt: "The dashboard is best viewed on a larger screen."
- Provide basic access: response list in card view (one card per respondent)
- Analytics charts: not rendered at <768px; link to desktop instead
- Export CSV: still accessible

---

### Landing / Identity Page — Responsive

All breakpoints: single-column stacked form. Max-width 480px on desktop, full-width on mobile. No responsive complexity needed; form is inherently narrow.

---
---

## Accessibility Notes

Target standard: **WCAG 2.1 AA** (referenced in PRD §6 Non-Functional Requirements and US-0.1, US-0.2, US-2.3).

---

### Color Contrast

| Element | Foreground | Background | Min Ratio | Notes |
|---------|------------|------------|-----------|-------|
| Body text | #1A1A1A | #FFFFFF | 4.5:1 | Normal text |
| Primary button label | #FFFFFF | Brand primary | 4.5:1 | Check brand color |
| Error text | #C0392B (or equivalent) | #FFFFFF | 4.5:1 | AA compliance for error messages |
| Save indicator ("Saved") | #217346 | #FFFFFF | 4.5:1 | Green sufficient if dark enough |
| Placeholder text | ≥ #767676 | #FFFFFF | 4.5:1 | Avoid lighter grays |
| Chart bars — team type colors | — | White background | 3:1 (UI component) | Ensure sufficient contrast + use patterns/labels as secondary cue |
| Amber banner text | #7D4A00 (dark amber) | #FFF3CD (light amber) | 4.5:1 | Validate; do not use pure yellow text |

**Note:** Do not rely on color alone to convey meaning (e.g., error states must also use icon + text, not just red color).

---

### Keyboard Navigation

#### Assessment Form

| Control | Keyboard Interaction |
|---------|---------------------|
| Identity page fields | Tab through Email → Name → Team Type → CTA |
| Team Type dropdown | Arrow keys to select option; Enter to confirm |
| Radio buttons (single choice, Likert) | Tab to group; Arrow keys to move between options; Space/Enter to select |
| Checkboxes (multi-choice) | Tab to each checkbox; Space to toggle |
| Ranking drag-and-drop | Tab to item; Enter/Space to grab; Arrow keys to reorder; Enter/Space to drop |
| Ranking numbered input | Tab to each number field; type rank directly |
| Free text short | Tab focus; standard text input |
| Free text long | Tab focus; standard textarea; resize handle also Tab-accessible |
| Previous / Next buttons | Tab to button; Enter/Space to activate |
| Progress bar segments (re-entry) | Tab to segment; Enter/Space to jump |
| "Other" reveal | Tab to "Other" option; select it → focus moves to text input |

#### Dashboard

| Control | Keyboard Interaction |
|---------|---------------------|
| Search field | Tab focus; type to search |
| Filter checkboxes | Tab to each; Space to toggle |
| Status radio filter | Tab to group; Arrow keys |
| Date range pickers | Tab to each; keyboard date entry supported |
| Table column headers | Tab to sortable headers; Enter to toggle sort |
| Table rows | Tab to row; Enter to navigate to detail |
| Pagination controls | Tab through Previous / Page numbers / Next |
| Export CSV button | Tab; Enter to activate |

#### Focus Management

- **Section transitions:** When navigating to a new section, focus is moved to the section heading (`<h2>`) at the top of the new section. (US-0.1 acceptance criterion: "Keyboard focus is managed correctly on section transition.")
- **Error state:** When Next is pressed and validation fails, focus moves to the section-level error banner. User can Tab through individual field errors.
- **Dialog open:** Focus moves to the dialog; trapped within dialog until dismissed. Focus returns to trigger element on dismiss.
- **Resume banner:** Focus moves to banner on page load for returning respondents.

---

### Screen Reader Considerations

#### ARIA Roles and Labels

| Element | ARIA Pattern |
|---------|-------------|
| Progress bar | `role="progressbar"` with `aria-valuenow="{current}"` `aria-valuemin="1"` `aria-valuemax="{total}"` `aria-label="Assessment progress: Section {N} of {M}"` |
| Progress bar segments (clickable) | `role="button"` `aria-label="Go to Section {N}: {title}"` `aria-current="step"` on active |
| Single-choice question | `role="radiogroup"` `aria-labelledby="{questionId}-label"` |
| Likert scale | `role="radiogroup"` `aria-labelledby="{questionId}-label"` `aria-describedby="{questionId}-scale-description"` |
| "Other" text input | `aria-expanded="true/false"` on parent container; input has `aria-required="true"` when "Other" selected |
| Save state indicator | `role="status"` `aria-live="polite"` — screen reader announces changes without interrupting user flow |
| Error messages (field-level) | `aria-describedby="{fieldId}-error"` on input; error `<span>` with `role="alert"` |
| Section-level error banner | `role="alert"` `aria-live="assertive"` — announces immediately on Next press |
| Contextual banners (re-entry, closed) | `role="banner"` (if inside `<header>`) or `role="region"` `aria-label="Assessment status"` |
| Ranking list | `role="list"` with `role="listitem"` per item; drag handle: `role="button"` `aria-label="Drag to reorder {item name}"` `aria-grabbed="true/false"` |
| Dashboard table | `<table>` with proper `<caption>`, `<th scope="col">` headers, `aria-sort="ascending/descending"` on active sort column |
| Status badges (Submitted/Draft) | `aria-label="Status: Submitted"` or `aria-label="Status: Draft"` |
| Assessment status badge (header) | `aria-label="Assessment status: Active"` |

#### Live Regions

| Region | `aria-live` | Used For |
|--------|-------------|---------|
| Save state indicator | `polite` | Save status updates (non-urgent) |
| Section-level validation error | `assertive` | Immediate announcement on Next press failure |
| Resume / re-entry banner | `polite` | Initial load; not time-sensitive |
| Export progress | `polite` | "Generating export…" / "Export complete" |

---

### Touch and Motor Accessibility

- All interactive elements: minimum touch target size **44×44px** (WCAG 2.5.5)
- Ranking ▲▼ buttons: 44px minimum; serve as motor-accessible alternative to drag-and-drop
- Form fields: minimum height 44px on mobile
- Spacing between interactive elements: minimum 8px to prevent accidental activation

---

### Text and Language

- All error messages are in plain language (no error codes shown to users).
- Team type descriptions (one-liners in dropdown) help non-technical respondents make confident selections.
- Required field indicator: asterisk (*) with legend text "* Required field" near the form (or per-section).
- Time estimates and due dates use unambiguous formats: "Friday, July 31, 2026 at 5:00 PM EDT" (no relative dates like "in 2 weeks").

---

*End of UX-Mockup-AssessmentForm.md*
*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
*User Stories coverage: US-0.1–US-9.3 (38 stories, 10 epics)*
