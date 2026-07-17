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
