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
