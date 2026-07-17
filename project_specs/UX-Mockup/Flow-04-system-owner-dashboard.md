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
