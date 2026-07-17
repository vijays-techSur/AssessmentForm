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
