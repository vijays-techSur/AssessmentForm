---

## F05: Duplicate Submission Prevention & Edit Window

**Description:** Each respondent email address may have exactly one submission in the system. The system prevents duplicate entries and enforces a configurable edit window: respondents may update their submitted answers at any time before the assessment due date. After the due date, all submissions are locked and the form transitions to a read-only view. System Owners can view and update the due date from the configuration dashboard (see F08).

**Terminology:**
- **First Submission:** The initial deliberate "Submit" action that transitions `submission_status` from `draft` to `submitted`.
- **Edit Window:** The period from a respondent's first submission until the assessment due date, during which re-edits are permitted.
- **Due Date:** The configurable timestamp (ISO 8601, stored in `assessment_config`) after which no further edits are accepted. Default: 14 days from assessment launch.
- **Locked State:** Post-due-date state in which all `submitted` responses become read-only.
- **Read-Only Mode:** The form renders all questions and saved answers but no input controls are editable; Submit and Save controls are hidden.
- **Duplicate Attempt:** A submit action by an email address that already has a `submitted` session record (should not occur in normal flow; prevented by pre-check).

**Sub-features:**
- One-submission-per-email enforcement
- Deliberate Submit action (from Review Step) to transition draft → submitted
- Edit window enforcement: allow re-edit of submitted answers before due date
- Post-due-date read-only mode for respondents
- Due date check on every session load and every auto-save
- Clear UI messaging for both edit-window-open and assessment-closed states

**Process:**

**First Submission:**
1. Respondent clicks **Submit** on the Review Step.
2. Client sends `POST /api/submissions/:sessionId`.
3. Server checks: Is `sessions.submission_status` already `submitted`?
   - If `submitted`: This is a re-submission attempt within the edit window (see Re-Edit flow below).
   - If `draft`: Continue to step 4.
4. Server checks: Is the current timestamp before the assessment `due_date` in `assessment_config`?
   - If past due date: Return 403 `ASSESSMENT_CLOSED`. Client shows "Assessment is now closed."
   - If before due date: Continue to step 5.
5. Server sets `sessions.submission_status = submitted`, `sessions.submitted_at = NOW()`, `sessions.last_modified_at = NOW()`.
6. Server returns 200 with `{ submitted: true, due_date: "...", edit_window_open: true }`.
7. Client transitions to submission confirmation screen (see F09).

**Re-Edit Within Edit Window:**
1. Returning respondent loads session (GET /api/sessions/:sessionId).
2. Server returns `submission_status: submitted` and due date.
3. Client checks: Is current timestamp before due date?
   - Yes: Render form in editable mode with "re-edit" banner (see F09 §re-entry banner).
   - No: Render form in read-only mode with "Assessment closed" message.
4. Respondent makes changes; auto-save applies normally (see F04).
5. Respondent clicks **Submit** again (or auto-save persists changes without re-submission needed — edits are live on save).
6. Server updates `sessions.last_modified_at = NOW()`; `submission_status` remains `submitted`.

**Post-Due-Date Enforcement:**
1. On every `GET /api/sessions/:sessionId` response, server includes `{ is_closed: true/false, due_date: "..." }`.
2. If `is_closed: true`, client renders all sections in read-only mode regardless of `submission_status`.
3. All `PUT /api/responses/:sessionId` requests are rejected with 403 `ASSESSMENT_CLOSED` if `is_closed: true`.

**Inputs:**
- `session_id` (uuid, required): Identifies the respondent session being submitted.
- Assessment `due_date` (timestamp, from `assessment_config`): Compared against `NOW()` at submission time.

**Outputs:**
- `submission_status` updated to `submitted` in `sessions` table.
- `submitted_at` timestamp set.
- `{ submitted: true, due_date, edit_window_open }` returned to client.

**Validation:**
- `session_id` must exist; unknown session IDs rejected with `SESSION_NOT_FOUND`.
- All mandatory section questions must be answered before submission is accepted (`MANDATORY_QUESTIONS_INCOMPLETE`).
- If `submission_status` is `submitted` AND `NOW() > due_date`: reject further edits with `ASSESSMENT_CLOSED`.
- If `submission_status` is `draft` AND `NOW() > due_date`: reject submission with `ASSESSMENT_CLOSED` (late draft, no submission allowed).
- A session where the email matches a System Owner email cannot be submitted (see F07); rejected with `SYSTEM_OWNER_CANNOT_SUBMIT`.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Due date has passed | 403 | `ASSESSMENT_CLOSED` | "The assessment due date has passed. No further submissions or edits are accepted." |
| Mandatory questions not fully answered | 400 | `MANDATORY_QUESTIONS_INCOMPLETE` | "Please complete all required questions before submitting." |
| Session not found | 404 | `SESSION_NOT_FOUND` | "Submission failed: session not found. Please reload." |
| System Owner attempting submission | 403 | `SYSTEM_OWNER_CANNOT_SUBMIT` | "System Owners cannot submit assessments." |
| Database error on submission | 500 | `SUBMISSION_FAILED` | "Submission could not be processed. Please try again." |

**API Surface (this feature):** `POST /api/submissions/:sessionId` (finalize), `GET /api/sessions/:sessionId` (due date check included) — see `Y1-api.md` §Submissions.

**Schema Surface (this feature):** Uses `sessions` (`submission_status`, `submitted_at`, `last_modified_at`) and `assessment_config` (`due_date`) — see `Y0-schema.md` §Sessions and §Config.

---
