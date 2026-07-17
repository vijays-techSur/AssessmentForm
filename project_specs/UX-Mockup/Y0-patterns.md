---

## Interaction Patterns

### Pattern 1: Save State Indicator

**User Stories:** US-4.1, US-4.2
**When to use:** Always visible in the global header during the active assessment session.
**Examples:** All assessment section screens (Screens 01, 05)

```
States:
  💾  Unsaved changes           ← dirty state; changes exist, not yet saved
  ⟳   Saving…                  ← PUT /api/responses in flight
  ✅  Saved at 2:34 PM          ← last successful save; timestamp from server
  ⚠   Unsaved — server error. Retrying… ← save failed; auto-retry in progress
  ✗   Could not save. Please try again.  ← after 3 retries; manual retry link shown
```

**Behavior:**
- Indicator is always visible; positioned top-right in header.
- Does not block navigation (Previous / Next) even on error state.
- On retry exhaustion, manual retry link is shown alongside the error text.
- On session resume: immediately shows `Saved at {last_saved_at}`.

---

### Pattern 2: Inline Validation Errors

**User Stories:** US-0.4, US-2.1–US-2.5, US-1.1
**When to use:** On form fields when validation fails (Next pressed or blur from field).
**Examples:** Identity page (Screen 00), all question types (Screen 02)

```
Field-level error pattern:
  ┌─────────────────────────────────────┐
  │  Question Label *                    │
  │  [_________________________]         │
  │  ⚠ Error message text here.         │
  └─────────────────────────────────────┘

  - Red border on the input element
  - Error text in red below the field
  - Error text associated with field via aria-describedby
  - Error clears as soon as the field becomes valid
```

**Section-level error banner (on Next press with multiple errors):**
```
  ┌──────────────────────────────────────────────┐
  │  ⚠  Please answer all required questions     │
  │     before continuing.                        │
  └──────────────────────────────────────────────┘
  + Each failing field individually highlighted
```

---

### Pattern 3: Persistent Contextual Banners

**User Stories:** US-1.2, US-5.2, US-5.3, US-9.2, US-9.3
**When to use:** Whenever a user's session context deviates from the standard first-time experience.
**Examples:** Screens 01, 05

| Banner Type | Color / Icon | Dismissible | When Shown |
|-------------|-------------|-------------|------------|
| Resume (draft) | Blue / ℹ | Yes (once dismissed) | Returning draft respondent, first section |
| Re-entry (submitted, edit open) | Amber / ✏ | No | Every section, until session ends |
| Assessment Closed | Gray / 🔒 | No | Every section after due date |
| Session Expired | Red / ⚠ | Via re-auth | When 401 intercepted mid-session |

**Placement:** Immediately below the global header; above the progress bar. Full-width.

---

### Pattern 4: Confirmation Dialogs (Destructive / Consequential Actions)

**User Stories:** US-8.2
**When to use:** Before any action with immediate, irreversible, or far-reaching effects.
**Examples:** Assessment config due date change (Screen 08)

```
Dialog structure:
  ┌──────────────────────────────────────┐
  │  [Action Title]                      │
  │  ─────────────────────────           │
  │  Clear description of what will      │
  │  happen and who will be affected.    │
  │                                      │
  │  From: {current state}               │
  │  To:   {new state}                   │
  │                                      │
  │  ⚠ [Impact warning if applicable]   │
  │                                      │
  │  [Cancel]       [Confirm Action]     │
  └──────────────────────────────────────┘
```

**Rules:**
- Default focus on **Cancel** (safer action) to prevent accidental confirm.
- Confirm button is primary; Cancel is secondary.
- Pressing Escape = Cancel.
- Clicking backdrop = Cancel.

---

### Pattern 5: Progress Bar / Step Indicator

**User Stories:** US-0.2, US-3.1
**When to use:** Always visible during assessment sections.
**Examples:** Screens 01, 03, 05

```
New respondent (forward navigation only):
  ● ─── ○ ─── ○ ─── ○ ─── ○
  1     2     3     4     5
  (filled = current; empty = upcoming; check = completed)

After completing sections:
  ✓ ─── ✓ ─── ● ─── ○ ─── ○
  1     2     3     4     5

Re-entry mode (all clickable):
  ✓ ─── ✓ ─── ✓ ─── ✓ ─── ●
  [1]   [2]   [3]   [4]   [5]   ← each segment clickable for direct jump
```

**Accessibility:** `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Individual steps have `aria-label="Section {N}: {title}, {status}"`. Keyboard: Tab to segment → Enter/Space to jump (re-entry only).

---

### Pattern 6: Empty & Loading States

**When to use:** Tables, charts, and lists that depend on async data.

| Context | Loading State | Empty State |
|---------|--------------|-------------|
| Response list | Skeleton rows (4–5 ghost rows) | "No responses match your current filters." |
| Analytics charts | Skeleton chart placeholders | "No data available for the current filters." |
| Individual response | Full-page skeleton | 404: "The requested response could not be found." |
| Dashboard initial load | Summary stat skeletons + table skeletons | (should always have data once System Owner logs in) |

---

### Pattern 7: Ranking Widget Interaction

**User Stories:** US-2.4
**Dual interaction model:**

```
Primary (drag-and-drop):
  ≡ Item A  [  1  ]   ← mouse/touch drag the row
  ≡ Item B  [  2  ]
  ≡ Item C  [  3  ]

  On drag start: dragged row gains elevation/shadow
  On drop: position numbers update in real time
  Auto-save triggered after each successful reorder

Fallback (numbered input):
  ≡ Item A  [  1  ▲▼]  ← type directly OR use ▲▼ buttons
  ≡ Item B  [  3  ▲▼]
  ≡ Item C  [  2  ▲▼]

  Duplicate detection: if two items share a rank,
  both highlighted amber with error: "Each item must have a unique rank."
```

---
