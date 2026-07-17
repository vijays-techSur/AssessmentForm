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
