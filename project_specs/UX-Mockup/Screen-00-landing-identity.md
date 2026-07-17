---

## Screen Designs

### Screen 00: Landing / Identity Capture

**Route:** `/`
**Purpose:** Capture respondent identity (email, name, team type) and initialize or resume a session.
**User Stories:** US-1.1, US-1.2, US-7.1, US-7.3
**Personas:** Marcus Reid (JRN-01.1 Stages 1–2), Priya Nair (JRN-02.1 Stage 1)

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AssessmentForm-Express                        [Help link]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Developer Platform Assessment                              │
│  ─────────────────────────────                              │
│  Help us understand your team's needs and readiness         │
│  for Developer Platform tooling.                            │
│                                                             │
│  ⏱ ~15–20 minutes  │  📋 {N} sections  │  🔒 Auto-saved    │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  Work Email Address *                        │           │
│  │  [_______________________________________]   │           │
│  │  (inline error appears here if invalid)      │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  Full Name *                                 │           │
│  │  [_______________________________________]   │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  Your Team Type *                            │           │
│  │  [Select your team type              ▼]      │           │
│  │                                              │           │
│  │  DROPDOWN OPTIONS (expanded):                │           │
│  │  ○ Program / Project                         │           │
│  │    Managing delivery, timelines, or roadmaps │           │
│  │  ○ Platform Engineering                      │           │
│  │    Building or operating developer tooling   │           │
│  │  ○ Infrastructure / Cloud                    │           │
│  │    Cloud, infrastructure, or SRE teams       │           │
│  │  ○ Data / API Governance                     │           │
│  │    Data standards, APIs, or compliance       │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  After selecting team type:                  │           │
│  │  ℹ You'll complete 7 sections tailored to    │           │
│  │    Platform Engineering.                     │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  [        Start Assessment →        ]  (primary CTA)        │
│  (disabled until all 3 fields valid)                        │
│                                                             │
│  Assessment closes: {due_date formatted}                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Returning respondent — Resume Banner (replaces hero text area):**
```
┌────────────────────────────────────────────────────────────┐
│  ✅  Welcome back, Marcus.                                  │
│      Your progress has been loaded.                        │
│      You left off at Section 3 of 5.                       │
│      Edit window open until: Fri, July 31, 2026 at 5:00 PM │
│                                                            │
│  [  Continue Assessment →  ]                               │
└────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Start/Continue CTA | Bottom of form, full-width |
| Primary | Form fields (email, name, team type) | Center, stacked vertically |
| Secondary | Time estimate + section count | Metadata row below title |
| Secondary | Team type description (one-liner per option) | Dropdown sub-text |
| Secondary | Section count preview (after team type select) | Info box below dropdown |
| Tertiary | Due date notice | Footer of card |
| Tertiary | Help link | Top-right header |

#### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default (new) | All fields empty; CTA disabled (grayed out) | N/A |
| Filling in (partial) | Fields populated; CTA still disabled | Real-time inline validation on blur |
| Ready to submit | All fields valid; CTA enabled (primary color) | Team type shows section preview |
| Email error | Red border + inline error below email field | "Please enter a valid email address." |
| Name error | Red border + inline error below name field | "Please enter your full name (at least 2 characters)." |
| System Owner email | Red error banner above CTA | "This email is registered as a System Owner. Please access the dashboard instead." |
| Returning (draft) | Resume banner; fields pre-filled; CTA = "Continue" | "Welcome back, {name}. You left off at Section N." |
| Returning (submitted, edit open) | Resume banner with edit deadline | "Your submission is on file. Edits accepted until {date}." |
| Session expired / stale | Warning banner | "Your previous session could not be found. Please re-enter your details." |
| Loading (POST in flight) | CTA shows spinner; fields disabled | "Starting your assessment…" |

#### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Email field | `<input type="email">` | RFC 5322 validation on blur; real-time format check |
| Full Name field | `<input type="text">` | Min 2 non-whitespace chars; validated on blur |
| Team Type dropdown | `<select>` / custom listbox | Four options with descriptions; triggers section count preview on selection |
| Start Assessment CTA | Primary button | Disabled until all 3 fields valid; submits `POST /api/sessions` |
| Continue Assessment CTA (returning) | Primary button | Pre-filled; submits `POST /api/sessions`; navigates to saved section |

---
