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
