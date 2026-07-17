---

## F09: Submission Confirmation & Respondent Feedback

**Description:** After a respondent submits the assessment, they receive a clear confirmation screen that acknowledges their submission and communicates the edit window deadline. When a previously-submitted respondent returns before the due date, a re-entry banner informs them they can still edit. After the due date, a read-only view with an "Assessment closed" message is displayed. This feature ensures respondents always know the current state of their submission.

**Terminology:**
- **Confirmation Screen:** The screen shown immediately after a successful first submission.
- **Re-entry Banner:** A persistent notification shown to a returning respondent who has already submitted but is within the edit window.
- **Assessment Closed Message:** The message displayed when a respondent (or returning respondent) accesses the form after the due date has passed.
- **Email Confirmation:** An optional stretch-goal email notification sent to the respondent upon submission (v1: only if email infrastructure is available).

**Sub-features:**
- Post-submission confirmation screen with due date displayed
- Re-entry banner for returning submitted respondents within the edit window
- Read-only mode with "Assessment closed" message after due date
- Optional email confirmation on submission (v1 stretch goal)

**Process:**

**Post-Submission Confirmation (First Submit):**
1. System receives 200 response from `POST /api/submissions/:sessionId` (see F05 §Process step 6).
2. Client navigates to the Confirmation Screen.
3. Confirmation Screen displays:
   - Heading: _"Assessment Submitted!"_
   - Body: _"Thank you, {name}. Your assessment has been submitted successfully."_
   - Edit window notice: _"You can return to edit your responses until {due_date formatted as: Day, Month DD, YYYY at HH:MM timezone}."_
   - Button: **Return to Assessment** (navigates back to the Review Step in editable mode).
4. (Stretch) If email infrastructure is available: Server sends a confirmation email to `respondents.email` with the same content as the confirmation screen.

**Re-entry Before Due Date (Returning Submitted Respondent):**
1. Respondent returns to the assessment URL. Client sends `POST /api/sessions` with their email.
2. Server returns `submission_status: submitted`, `is_returning: true`, `is_closed: false`.
3. Client renders the assessment form starting at `current_section_index` with a persistent re-entry banner at the top:
   - _"You've already submitted your assessment. You can update your answers until {due_date}."_
4. Form is fully editable. Auto-save works normally.
5. Respondent may optionally click **Submit** again to explicitly re-confirm their answers (updates `last_modified_at`; no change to `submitted_at`).

**Re-entry After Due Date (Assessment Closed):**
1. Respondent returns to the assessment URL. Client sends `POST /api/sessions` with their email.
2. Server returns `is_closed: true`.
3. Client renders all sections in read-only mode.
4. A dismissible banner is shown at the top of every section:
   - _"This assessment is now closed. Your responses are saved and have been submitted to the System Owner."_
5. No Save, Submit, or navigation controls are active. Previous/Next buttons navigate read-only sections for review purposes only.

**Inputs:**
- `session_id` (uuid, required): Used to fetch respondent name and due date for confirmation screen.
- `due_date` (timestamp, from `assessment_config`): Displayed in confirmation and re-entry banner.
- `name` (string, from session): Personalization in confirmation screen.

**Outputs:**
- Confirmation Screen rendered client-side after successful submit.
- Re-entry banner rendered when `submission_status === "submitted"` and `is_closed === false`.
- Read-only form rendered when `is_closed === true`.
- (Stretch) Confirmation email sent to respondent's email address.

**Validation:**
- Confirmation Screen is only rendered after a successful 200 response from `POST /api/submissions/:sessionId`; client does not navigate to it on error.
- `due_date` must be present in the server response for the edit window notice to be displayed; if absent, display: _"Contact the System Owner for deadline information."_
- Read-only mode must be enforced both client-side (UI) and server-side (API rejections); client-side alone is insufficient.

**Error States:**
| Scenario | Behavior | Error Code | Message |
|----------|----------|------------|---------|
| Confirmation screen loaded without a successful submit | Redirect to Review Step | `INVALID_CONFIRMATION_STATE` | (no user-facing message; silent redirect) |
| Due date not available from server | Edit window notice replaced | — | "Contact the System Owner for deadline information." |
| Email confirmation fails to send (stretch) | Logged server-side; no user-facing error | `EMAIL_SEND_FAILED` | (server log only; confirmation screen still shown) |

**API Surface (this feature):** Uses `POST /api/sessions` (resume check), `POST /api/submissions/:sessionId` (finalize), `GET /api/config` (due date retrieval for display). Optional: `POST /api/notifications/email` (stretch) — see `Y1-api.md` §Submissions and §Notifications.

**Schema Surface (this feature):** Reads from `sessions` (`submission_status`, `submitted_at`, `name`), `assessment_config` (`due_date`) — see `Y0-schema.md`.

---
