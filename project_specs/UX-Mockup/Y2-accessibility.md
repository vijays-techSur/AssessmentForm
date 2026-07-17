---

## Accessibility Notes

Target standard: **WCAG 2.1 AA** (referenced in PRD §6 Non-Functional Requirements and US-0.1, US-0.2, US-2.3).

---

### Color Contrast

| Element | Foreground | Background | Min Ratio | Notes |
|---------|------------|------------|-----------|-------|
| Body text | #1A1A1A | #FFFFFF | 4.5:1 | Normal text |
| Primary button label | #FFFFFF | Brand primary | 4.5:1 | Check brand color |
| Error text | #C0392B (or equivalent) | #FFFFFF | 4.5:1 | AA compliance for error messages |
| Save indicator ("Saved") | #217346 | #FFFFFF | 4.5:1 | Green sufficient if dark enough |
| Placeholder text | ≥ #767676 | #FFFFFF | 4.5:1 | Avoid lighter grays |
| Chart bars — team type colors | — | White background | 3:1 (UI component) | Ensure sufficient contrast + use patterns/labels as secondary cue |
| Amber banner text | #7D4A00 (dark amber) | #FFF3CD (light amber) | 4.5:1 | Validate; do not use pure yellow text |

**Note:** Do not rely on color alone to convey meaning (e.g., error states must also use icon + text, not just red color).

---

### Keyboard Navigation

#### Assessment Form

| Control | Keyboard Interaction |
|---------|---------------------|
| Identity page fields | Tab through Email → Name → Team Type → CTA |
| Team Type dropdown | Arrow keys to select option; Enter to confirm |
| Radio buttons (single choice, Likert) | Tab to group; Arrow keys to move between options; Space/Enter to select |
| Checkboxes (multi-choice) | Tab to each checkbox; Space to toggle |
| Ranking drag-and-drop | Tab to item; Enter/Space to grab; Arrow keys to reorder; Enter/Space to drop |
| Ranking numbered input | Tab to each number field; type rank directly |
| Free text short | Tab focus; standard text input |
| Free text long | Tab focus; standard textarea; resize handle also Tab-accessible |
| Previous / Next buttons | Tab to button; Enter/Space to activate |
| Progress bar segments (re-entry) | Tab to segment; Enter/Space to jump |
| "Other" reveal | Tab to "Other" option; select it → focus moves to text input |

#### Dashboard

| Control | Keyboard Interaction |
|---------|---------------------|
| Search field | Tab focus; type to search |
| Filter checkboxes | Tab to each; Space to toggle |
| Status radio filter | Tab to group; Arrow keys |
| Date range pickers | Tab to each; keyboard date entry supported |
| Table column headers | Tab to sortable headers; Enter to toggle sort |
| Table rows | Tab to row; Enter to navigate to detail |
| Pagination controls | Tab through Previous / Page numbers / Next |
| Export CSV button | Tab; Enter to activate |

#### Focus Management

- **Section transitions:** When navigating to a new section, focus is moved to the section heading (`<h2>`) at the top of the new section. (US-0.1 acceptance criterion: "Keyboard focus is managed correctly on section transition.")
- **Error state:** When Next is pressed and validation fails, focus moves to the section-level error banner. User can Tab through individual field errors.
- **Dialog open:** Focus moves to the dialog; trapped within dialog until dismissed. Focus returns to trigger element on dismiss.
- **Resume banner:** Focus moves to banner on page load for returning respondents.

---

### Screen Reader Considerations

#### ARIA Roles and Labels

| Element | ARIA Pattern |
|---------|-------------|
| Progress bar | `role="progressbar"` with `aria-valuenow="{current}"` `aria-valuemin="1"` `aria-valuemax="{total}"` `aria-label="Assessment progress: Section {N} of {M}"` |
| Progress bar segments (clickable) | `role="button"` `aria-label="Go to Section {N}: {title}"` `aria-current="step"` on active |
| Single-choice question | `role="radiogroup"` `aria-labelledby="{questionId}-label"` |
| Likert scale | `role="radiogroup"` `aria-labelledby="{questionId}-label"` `aria-describedby="{questionId}-scale-description"` |
| "Other" text input | `aria-expanded="true/false"` on parent container; input has `aria-required="true"` when "Other" selected |
| Save state indicator | `role="status"` `aria-live="polite"` — screen reader announces changes without interrupting user flow |
| Error messages (field-level) | `aria-describedby="{fieldId}-error"` on input; error `<span>` with `role="alert"` |
| Section-level error banner | `role="alert"` `aria-live="assertive"` — announces immediately on Next press |
| Contextual banners (re-entry, closed) | `role="banner"` (if inside `<header>`) or `role="region"` `aria-label="Assessment status"` |
| Ranking list | `role="list"` with `role="listitem"` per item; drag handle: `role="button"` `aria-label="Drag to reorder {item name}"` `aria-grabbed="true/false"` |
| Dashboard table | `<table>` with proper `<caption>`, `<th scope="col">` headers, `aria-sort="ascending/descending"` on active sort column |
| Status badges (Submitted/Draft) | `aria-label="Status: Submitted"` or `aria-label="Status: Draft"` |
| Assessment status badge (header) | `aria-label="Assessment status: Active"` |

#### Live Regions

| Region | `aria-live` | Used For |
|--------|-------------|---------|
| Save state indicator | `polite` | Save status updates (non-urgent) |
| Section-level validation error | `assertive` | Immediate announcement on Next press failure |
| Resume / re-entry banner | `polite` | Initial load; not time-sensitive |
| Export progress | `polite` | "Generating export…" / "Export complete" |

---

### Touch and Motor Accessibility

- All interactive elements: minimum touch target size **44×44px** (WCAG 2.5.5)
- Ranking ▲▼ buttons: 44px minimum; serve as motor-accessible alternative to drag-and-drop
- Form fields: minimum height 44px on mobile
- Spacing between interactive elements: minimum 8px to prevent accidental activation

---

### Text and Language

- All error messages are in plain language (no error codes shown to users).
- Team type descriptions (one-liners in dropdown) help non-technical respondents make confident selections.
- Required field indicator: asterisk (*) with legend text "* Required field" near the form (or per-section).
- Time estimates and due dates use unambiguous formats: "Friday, July 31, 2026 at 5:00 PM EDT" (no relative dates like "in 2 weeks").

---

*End of UX-Mockup-AssessmentForm.md*
*Document generated: 2026-07-17 | Project: AssessmentForm-Express | Version: 1.0*
*User Stories coverage: US-0.1–US-9.3 (38 stories, 10 epics)*
