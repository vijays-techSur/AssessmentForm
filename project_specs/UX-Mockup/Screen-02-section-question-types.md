---

### Screen 02: Question Type Widgets (Component Detail)

**Route:** `/assessment` (embedded in section view)
**Purpose:** Define the UI component for each of the six question types and the "Other" conditional reveal.
**User Stories:** US-2.1, US-2.2, US-2.3, US-2.4, US-2.5
**Personas:** Marcus Reid (US-2.1, US-2.3), Priya Nair (US-2.2, US-2.4, US-2.5)

#### Single-Choice (Radio)

```
┌──────────────────────────────────────────────────────────┐
│  Q. How does your team currently track platform needs? * │
│                                                          │
│  ○ We use a formal requirements document                 │
│  ○ We use informal team discussions                      │
│  ○ We rely on individual team leads                      │
│  ○ Other                                                 │
│    └─► [______________________________________] 0/500    │
│        (revealed only when "Other" is selected)          │
│        "Please specify your 'Other' answer."             │
│        (error shown if blank on Next)                    │
└──────────────────────────────────────────────────────────┘
```

#### Multi-Choice (Checkbox)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Which DP tools does your team currently use?  *      │
│     (Select all that apply)                              │
│                                                          │
│  ☐ Backstage                                             │
│  ☑ GitHub Actions                                        │
│  ☐ Harness IDP                                           │
│  ☐ None of the above                                     │
│  ☑ Other                                                 │
│    └─► [GitLab Enterprise CI/CD pipelines____] 23/500    │
│        char counter turns red at ≥ 450 chars             │
└──────────────────────────────────────────────────────────┘
```

#### Likert Scale (5-point)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Our team is ready to adopt a new DP tool today. *    │
│                                                          │
│  Strongly                                  Strongly      │
│  Disagree   1     2     3     4     5      Agree         │
│             ○     ○     ●     ○     ○                    │
│             │←── keyboard arrow navigation ──►│          │
│                                                          │
│  (ARIA role="radiogroup"; aria-label="Likert scale 1-5") │
└──────────────────────────────────────────────────────────┘
```

#### Ranking (Drag-and-Drop + Numbered Fallback)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Rank the following capabilities by priority. *       │
│     (Drag to reorder, or enter numbers directly)         │
│                                                          │
│  ≡  CI/CD Pipeline Integration           [  1  ▲▼]      │
│  ≡  Plugin Extensibility                 [  3  ▲▼]      │
│  ≡  Onboarding Automation                [  2  ▲▼]      │
│  ≡  Software Catalog                     [  4  ▲▼]      │
│  ≡  Developer Portal Customization       [  5  ▲▼]      │
│                                                          │
│  ≡ = drag handle (touch/mouse drag)                      │
│  [n] = numbered input fallback (type rank directly)      │
│  ▲▼ = up/down move buttons (keyboard accessible)         │
│                                                          │
│  Error state:                                            │
│  ⚠ "Please assign a rank to all items."                  │
│  ⚠ "Each item must have a unique rank." (on duplicate)   │
└──────────────────────────────────────────────────────────┘
```

#### Free Text Short (Single-line)

```
┌──────────────────────────────────────────────────────────┐
│  Q. What is the primary DP capability gap your team has? │
│     (optional)                                           │
│                                                          │
│  [____________________________________________] 42/500   │
│  (single-line input; char counter; max 500)              │
│  Counter turns amber at 400+, red at 480+                │
└──────────────────────────────────────────────────────────┘
```

#### Free Text Long (Textarea)

```
┌──────────────────────────────────────────────────────────┐
│  Q. Describe your team's specific integration             │
│     requirements in detail.  *                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ We use GitLab Enterprise with self-hosted runners. │  │
│  │ Our pipeline requires...                           │  │
│  │                                                    │  │
│  │                                                  ↕│  │  ← resize handle
│  └────────────────────────────────────────────────────┘  │
│  187/2000                                                │
│  Counter turns amber at 1800+, red at 1950+              │
│  Error: "Your answer exceeds the maximum length of        │
│          2000 characters."                               │
└──────────────────────────────────────────────────────────┘
```

#### "Other" Conditional Reveal

```
State machine:
  "Other" unselected → text input: hidden (display: none; aria-hidden: true)
  "Other" selected   → text input: visible (aria-expanded: true on parent)
                        auto-focus moves to text input
  "Other" deselected → text input: hidden again; value CLEARED
```

#### States (per question widget)

| State | Appearance | Feedback |
|-------|------------|----------|
| Unanswered (optional) | Neutral border | None |
| Unanswered (required, not yet tried) | Neutral border with * label | None |
| Unanswered (required, Next attempted) | Red border + error text below | "This question requires an answer." |
| Answered | Neutral or subtle filled state | None |
| "Other" selected | Radio/checkbox selected + text input revealed | Input auto-focused |
| "Other" blank on Next | Red border on text input | "Please specify your 'Other' answer." |
| Char limit approaching | Amber counter | Visual only |
| Char limit exceeded | Red counter + error text | "Your answer exceeds {limit} characters." |
| Read-only | Static display (no interactive controls) | Answers shown as formatted text |

---
