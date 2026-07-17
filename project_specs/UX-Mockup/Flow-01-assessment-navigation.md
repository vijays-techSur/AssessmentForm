---

### Flow 01: Multi-Step Assessment Navigation

**User Stories:** US-0.1, US-0.2, US-0.3, US-0.4, US-2.1–US-2.5, US-3.1–US-3.4, US-4.1, US-4.2
**Personas:** Marcus Reid (JRN-01.1 Stages 3–6), Priya Nair (JRN-02.1 Stages 2–5)
**Trigger:** Respondent reaches `/assessment` after identity capture or session resume.

```
[Section Screen: Section N of M]
 ─ Progress Bar (step indicator)
 ─ Save State Indicator ("Saved at 2:34 PM")
 ─ Section title + question list
    │
    ├── User answers questions (any input)
    │       └── isDirty = true → Save State: "Unsaved changes"
    │               After 30s idle + isDirty → Idle Auto-Save
    │               └── PUT /api/responses/:sessionId
    │                       ├── Success → "Saved at {time}"
    │                       └── Fail    → "Unsaved changes — server error. Retrying…"
    │
    ├── [Previous] clicked (any state)
    │       └── Auto-save current section (no validation required)
    │               → Navigate to Section N-1
    │               → Progress bar updates
    │
    └── [Next] clicked
            │
            ├── Required questions unanswered?
            │       └── YES → Inline section error banner:
            │               "Please answer all required questions before continuing."
            │               Each unanswered field highlighted with error state
            │               Navigation blocked
            │
            └── All required answered → Auto-save triggers
                    │
                    ├── Is this the last section?
                    │       └── YES → Navigate to /assessment/review
                    │
                    └── NO → Navigate to Section N+1
                             Progress bar updates
```

**Question Type Sub-flows:**

```
[Single Choice]           [Multi Choice]            [Likert Scale]
 ○ Option A                ☐ Option A                1  2  3  4  5
 ○ Option B                ☐ Option B               SD ●        SA
 ○ Option C                ☑ Option C                ↑ keyboard ↑
 ○ Other → [text input]    ☐ Other → [text input]    arrow nav

[Ranking]                             [Free Text Short/Long]
 ≡ Item 1 [drag handle] [#1 input]    [________________] 0/500
 ≡ Item 2 [drag handle] [#2 input]    [______________  ]
 ≡ Item 3 [drag handle] [#3 input]    [textarea       ] 0/2000
                                       char counter turns red at 90%+
```

**Steps:**
1. Section renders with question list; required questions marked with asterisk (*).
2. Respondent interacts with question widgets; dirty state tracks unsaved changes.
3. Save State Indicator updates in real time: `Unsaved changes` → `Saving…` → `Saved at {time}`.
4. Idle auto-save fires after 30s of inactivity when dirty.
5. **Next:** Validates required questions; on failure highlights unanswered fields with error state and shows section-level banner.
6. **Next (valid):** Triggers auto-save → navigates to next section; progress bar advances.
7. **Previous:** Always permitted; triggers auto-save; navigates to prior section.
8. Final section **Next** → transitions to Review Step (Section N+1 = Review).

---
