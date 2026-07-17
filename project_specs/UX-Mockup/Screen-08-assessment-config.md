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
