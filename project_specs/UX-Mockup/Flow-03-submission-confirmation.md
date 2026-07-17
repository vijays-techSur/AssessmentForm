---

### Flow 03: Review, Submit & Confirmation

**User Stories:** US-0.3, US-0.4, US-5.1, US-5.4, US-9.1, US-9.2
**Personas:** Marcus Reid (JRN-01.1 Stage 6, JRN-01.2 Stage 5), Priya Nair (JRN-02.1 Stage 5)
**Trigger:** Respondent clicks **Next** on the final section of the assessment.

```
[Final Section — Next clicked]
    │
    └── Auto-save + Navigate to /assessment/review
            │
            ▼
    [Review Step]
     ─ All sections listed with read-only answers
     ─ Each section has [Edit] link
     ─ Unanswered required questions highlighted
     ─ [Submit Assessment] button
            │
            ├── [Edit] clicked on Section N
            │       → Navigate to /assessment (Section N, edit mode)
            │       → User edits → clicks Next
            │       → Navigation returns to /assessment/review
            │         (not Section N+1 — review-return mode)
            │
            ├── Unanswered required questions present
            │       → Submit button shows inline alert above it:
            │         "Please complete all required questions before submitting."
            │         Sections with gaps highlighted; each listed with section name
            │
            └── All required answered → [Submit Assessment] clicked
                    │
                    ├── Client-side due date check → past due
                    │       Inline error: "The assessment due date has passed."
                    │
                    └── POST /api/submissions/:sessionId
                            │
                            ├── 403 ASSESSMENT_CLOSED
                            │       Inline error banner on Review Step
                            │
                            ├── 400 MANDATORY_QUESTIONS_INCOMPLETE
                            │       Highlight missing sections
                            │
                            └── 200 Success
                                    → Navigate to /assessment/confirmation
```

**Confirmation Screen flow:**

```
[/assessment/confirmation]
 ─ "Assessment Submitted!" heading
 ─ "Thank you, {name}. Your assessment has been submitted successfully."
 ─ Edit window notice:
   "You can return to edit your responses until
    {Day, Month DD, YYYY at HH:MM timezone}."
 ─ [Return to Assessment] button → /assessment/review (edit mode)

   If this is an updated (re-)submission:
 ─ "Your submission has been updated. This replaces your previous response."
 ─ Timestamp of last modification shown
```

**Steps:**
1. Review Step renders all sections in read-only format with section-level **Edit** links.
2. Unanswered required questions are highlighted with an amber warning chip on the relevant section.
3. Edit flow: user returns to a section, edits, clicks Next → system returns directly to Review Step (not next section in sequence).
4. Submit button: disabled if any required questions unanswered; enabled when all satisfied.
5. `POST /api/submissions/:sessionId` → server performs final due-date and completeness check.
6. On success: navigate to `/assessment/confirmation` (not accessible by direct URL without a successful submit).
7. Confirmation page shows personalized message, edit window deadline, and **Return to Assessment** button.
8. On re-submission (update): confirmation message distinguishes update from new submission.

---
