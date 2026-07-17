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
