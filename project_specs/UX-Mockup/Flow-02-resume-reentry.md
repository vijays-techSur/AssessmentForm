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
