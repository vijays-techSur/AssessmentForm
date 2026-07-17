---

## F04: Auto-Save & Progress Persistence

**Description:** As respondents answer questions, their progress is automatically persisted to the backend without requiring manual action. Auto-save fires on section navigation (Next/Previous) and on a periodic idle timer while the respondent is actively answering. On return visits, saved answers are pre-populated so respondents resume exactly where they left off. Only a deliberate "Submit" action on the Review Step finalizes the submission.

**Terminology:**
- **Auto-Save Trigger:** An event that initiates a background save: section navigation or idle timeout.
- **Save State Indicator:** A persistent UI element showing the current save status: `Saved`, `Saving…`, or `Unsaved changes`.
- **Idle Timeout:** A configurable inactivity period (default 30 seconds) after which auto-save fires if there are unsaved changes.
- **Draft State:** The `submission_status` value `draft` — answers are saved but not submitted.
- **Dirty State:** The client-side flag indicating unsaved changes exist since the last successful auto-save.
- **Pre-population:** On resume, the system fills in previously saved answers into the form fields automatically.

**Sub-features:**
- Auto-save on Next/Previous section navigation
- Periodic auto-save on idle timeout (default 30 seconds) when dirty state is active
- Save State Indicator always visible during assessment
- Pre-population of saved answers on resume
- Draft state retention until explicit Submit action
- Conflict detection (prevent overwrite of newer server state with older client state)

**Process:**

**Auto-Save on Navigation (Next/Previous):**
1. Respondent clicks Next or Previous.
2. Client collects all current answer payloads for the visible section.
3. Client sets Save State Indicator to `Saving…`.
4. Client sends `PUT /api/responses/:sessionId` with the current section's answer array and updated `current_section_index`.
5. Server persists (upserts) each answer in the `responses` table. Updates `sessions.current_section_index` and `sessions.last_saved_at`.
6. Server returns 200 with updated `last_saved_at` timestamp.
7. Client sets Save State Indicator to `Saved` with timestamp (e.g., `Saved at 2:34 PM`).
8. Client transitions to next/previous section.

**Periodic Auto-Save (Idle Timeout):**
1. Client tracks dirty state: any change to an answer field sets `isDirty = true`.
2. After 30 seconds of idle (no user interaction) while `isDirty = true`, client fires auto-save.
3. Steps 3–7 from Navigation flow above apply.
4. If the section transitions mid-save, the save still completes; no answer is lost.

**On Resume (Returning Respondent):**
1. Session load (`GET /api/sessions/:sessionId`) returns `saved_responses` array.
2. Client matches each response to its `question_id` and pre-populates the corresponding field.
3. Client restores `current_section_index` to the last saved value.
4. Save State Indicator shows `Saved at {last_saved_at}`.

**Inputs:**
- `session_id` (uuid, required): Identifies the respondent's session.
- `section_id` (string, required): The section being saved.
- `current_section_index` (integer, required): Current navigation position.
- `responses` (array, required): Array of `{ question_id, answer_payload }` objects for the current section.

**Outputs:**
- `last_saved_at` (timestamp): Server-confirmed save timestamp returned to client.
- Save State Indicator updated to `Saved` with the returned timestamp.
- `responses` table rows upserted (created or updated) for each question in the section.

**Validation:**
- `session_id` must exist in the `sessions` table; orphaned saves rejected with `SESSION_NOT_FOUND`.
- If `sessions.submission_status` is `submitted` AND the due date has passed, auto-save is rejected with `ASSESSMENT_CLOSED` (see F05).
- If `sessions.submission_status` is `submitted` AND the due date has NOT passed, auto-save is accepted (respondent is editing within the edit window).
- `answer_payload` for each response must conform to its question type schema (see F02 §Validation).
- Empty `responses` array is valid (saves section with no answers — indicates intentional blank for optional questions).
- `current_section_index` must be within the bounds of the respondent's `section_ids_ordered` array.

**Error States:**
| Scenario | HTTP Status | Error Code | Message (client UI) |
|----------|-------------|------------|---------------------|
| Session not found | 404 | `SESSION_NOT_FOUND` | Save State Indicator: `Save failed — session not found. Please reload.` |
| Assessment closed (due date passed) | 403 | `ASSESSMENT_CLOSED` | Save State Indicator: `Assessment is closed. Your responses are read-only.` |
| Server error during save | 500 | `SAVE_FAILED` | Save State Indicator: `Unsaved changes — server error. Retrying…` (auto-retry 3×) |
| Network timeout | N/A (client) | `NETWORK_TIMEOUT` | Save State Indicator: `Unsaved changes — check your connection.` |
| Answer payload schema mismatch | 400 | `INVALID_ANSWER_PAYLOAD` | Inline question-level error shown; save of valid answers proceeds |

**Retry Behavior:**
- On `SAVE_FAILED` or `NETWORK_TIMEOUT`, client retries auto-save up to 3 times with exponential backoff (1s, 2s, 4s).
- After 3 failed retries, Save State Indicator shows `Unsaved changes — could not save. Please try again.` and stops retrying automatically.
- Navigation (Next/Previous) is not blocked by save failures; respondent can continue answering; next navigation attempt triggers another save.

**API Surface (this feature):** `PUT /api/responses/:sessionId` — see `Y1-api.md` §Responses.

**Schema Surface (this feature):** Uses `responses` and `sessions` (for `current_section_index`, `last_saved_at`) tables — see `Y0-schema.md` §Responses.

---
