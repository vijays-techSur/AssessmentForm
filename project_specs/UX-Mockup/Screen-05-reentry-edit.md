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
