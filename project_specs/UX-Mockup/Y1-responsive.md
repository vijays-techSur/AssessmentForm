---

## Responsive Considerations

AssessmentForm-Express is a web SPA for enterprise internal use. Primary device is **desktop** (enterprise workstations and laptops). Tablet support is expected; mobile is best-effort. The dashboard is explicitly desktop-first due to table/chart complexity.

### Breakpoints

| Breakpoint | Label | Range | Priority |
|------------|-------|-------|----------|
| Large Desktop | `lg` | ≥ 1280px | Primary (Dashboard) |
| Desktop | `md` | 1024px – 1279px | Primary (Assessment) |
| Tablet | `sm` | 768px – 1023px | Supported |
| Mobile | `xs` | < 768px | Best-effort (assessment form only) |

---

### Assessment Form — Responsive Layouts

#### Desktop (≥ 1024px)

```
┌──────────────── 1024px+ ────────────────────────────────┐
│  Header (full-width): Logo + Save State Indicator        │
├─────────────────────────────────────────────────────────┤
│  Progress Bar (full-width, 5–7 labeled segments)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Contextual Banner — full width if applicable]         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Section Title                                  │   │
│  │                                                 │   │
│  │  Question list (single column, centered max-   │   │
│  │  width ~720px for readability)                  │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [← Previous]                            [Next →]      │
└─────────────────────────────────────────────────────────┘
```

- Question area max-width: 720px, centered
- Navigation buttons: bottom of page, spread left/right
- Progress bar: all section labels visible

#### Tablet (768px – 1023px)

```
┌─────────────── 768px – 1023px ─────────────────────────┐
│  Header: Logo (compact) + Save State (abbreviated)       │
├─────────────────────────────────────────────────────────┤
│  Progress Bar: segment dots + current section label      │
│  "Section 2 of 5 — Current Status"                      │
├─────────────────────────────────────────────────────────┤
│  [Contextual Banner — full width]                       │
│                                                         │
│  Question list (full width, 16px padding sides)         │
│                                                         │
│  [← Previous]                            [Next →]      │
└─────────────────────────────────────────────────────────┘
```

- Progress bar: show dots only (no labels); current section title shown as text below bar
- Ranking drag-and-drop: supported; ▲▼ buttons more prominent
- "Other" text inputs: full width

#### Mobile (< 768px) — Assessment Form Only

```
┌───── < 768px ──────────────────────────────────────────┐
│  Header: Logo + "Saved ✅" (icon only on smallest)      │
├─────────────────────────────────────────────────────────┤
│  Progress: "Section 2 / 5" (text only; no bar)          │
├─────────────────────────────────────────────────────────┤
│  [Contextual Banner — truncated if long]                │
│                                                         │
│  Questions stacked, full width                          │
│  Likert: vertically stacked options (1–5)               │
│  Ranking: numbered input only (drag-and-drop hidden)    │
│                                                         │
│  [← Prev]                              [Next →]        │
└─────────────────────────────────────────────────────────┘
```

- Drag-and-drop ranking replaced by numbered input on touch-only devices
- Likert radio buttons: vertically stacked for touch target size (min 44px)
- Free text inputs: full width; virtual keyboard tested for scroll behavior

---

### Dashboard — Responsive Layouts

The dashboard is desktop-first. Tablet is functional; mobile is degraded but accessible.

#### Large Desktop (≥ 1280px)

```
┌─────────────── 1280px+ ─────────────────────────────────┐
│  Header: Logo + Status Badge + Nav links + Exit          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─── Summary Stats (full row) ───────────────────────┐ │
│  │ Total | Submitted | Draft | Team Coverage (bars)   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─── Filters ─────────────────────────────────────── ┐ │
│  │  Search [____]  Team[✓✓✓✓]  Status(●)  Date[  ][  ]│ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  Response List Table (full width)                       │
│  Pagination                                             │
└─────────────────────────────────────────────────────────┘
```

#### Desktop (1024px – 1279px)

- Identical to large desktop; team type coverage bars may wrap

#### Tablet (768px – 1023px)

- Summary stats collapse to 2-column grid (Total+Submitted | Draft+Coverage)
- Filter bar stacks vertically (search → team type → status → date range)
- Response list: hide `Last Modified` column; show Name, Team Type, Status, Submitted At
- Pagination: compact (Prev | 1 | 2 | Next)

#### Mobile (< 768px) — Dashboard Not Recommended

- Display a prompt: "The dashboard is best viewed on a larger screen."
- Provide basic access: response list in card view (one card per respondent)
- Analytics charts: not rendered at <768px; link to desktop instead
- Export CSV: still accessible

---

### Landing / Identity Page — Responsive

All breakpoints: single-column stacked form. Max-width 480px on desktop, full-width on mobile. No responsive complexity needed; form is inherently narrow.

---
