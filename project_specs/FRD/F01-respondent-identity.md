---

## F01: Respondent Identity & Session Management

**Description:** Before entering the assessment, respondents identify themselves by providing their email address and full name on a landing/start page. This identity is stored server-side and functions as the session key for all subsequent actions — auto-save, deduplication, resume-on-return, and edit-window enforcement. No password, SSO, or OAuth is required in v1.

**Terminology:**
- **Identity Capture:** The landing page step where the respondent provides email + name.
- **Session Key:** The respondent's email address, used as the primary deduplication and lookup key.
- **Returning Respondent:** A respondent whose email already exists in the `sessions` table (has a prior draft or submission).
- **New Respondent:** A respondent whose email does not exist in the `sessions` table.
- **Resume Banner:** A UI notification shown to a returning respondent confirming their progress has been loaded.

**Sub-features:**
- Email + name capture form on the assessment start page
- Server-side session creation on first visit
- Returning respondent detection and progress reload
- Resume banner/confirmation for returning respondents
- Session persistence across browser close and re-open
- Team type selection on the start page (captured alongside identity)

**Process:**
1. Respondent navigates to the assessment URL.
2. System displays the Identity Capture form requesting: email address, full name, team type (dropdown).
3. Respondent fills in fields and clicks **Start Assessment** (or **Continue Assessment** if a session token exists in browser storage).
4. Client submits identity to `POST /api/sessions`.
5. Server looks up email in the `sessions` table:
   - **New respondent:** Creates a new session record with status `draft`, stores email + name + team type + `created_at`. Returns a `session_id` (UUID) and `is_returning: false`.
   - **Returning respondent:** Loads existing session record. Returns `session_id`, `is_returning: true`, `current_section_index`, and all previously saved responses.
6. Client stores `session_id` in browser `localStorage` (or a session cookie) for subsequent requests.
7. If `is_returning: true`, client displays the Resume Banner: _"Welcome back, {name}. Your progress has been loaded. You left off at section {N}."_
8. System checks due date (see F05): if assessment is closed, returning respondents see a read-only view regardless of draft status.
9. Assessment workflow begins at the respondent's `current_section_index` (0 for new, persisted value for returning).

**Inputs:**
- `email` (string, required): Respondent's email address. Used as session key.
- `name` (string, required): Respondent's full name. Stored for display and dashboard identification.
- `team_type` (enum, required): One of `program_project`, `platform_engineering`, `infrastructure_cloud`, `data_api_governance`.

**Outputs:**
- `session_id` (uuid): Unique identifier for this respondent's session. Stored client-side.
- `is_returning` (boolean): Whether a prior session was found.
- `current_section_index` (integer): Section to resume at (0 for new respondents).
- `saved_responses` (array): All previously saved response objects for pre-population (empty array for new respondents).
- `submission_status` (enum: `none` | `draft` | `submitted`): Current state of the respondent's assessment.

**Validation:**
- `email` must match RFC 5322 email format (validated both client-side and server-side).
- `email` must not be blank; max length 254 characters.
- `name` must not be blank; min 2 characters, max 200 characters; must contain at least one non-whitespace character.
- `team_type` must be one of the four valid enum values; invalid values rejected with `INVALID_TEAM_TYPE`.
- If the JWT presented to `POST /api/sessions` has `role === "system_owner"` (dashboard JWT), return `SYSTEM_OWNER_CANNOT_RESPOND` error — Dashboard Users may not submit assessments from the respondent flow in v1.
- Duplicate session creation for the same email is handled by upsert (return existing session, not a new one).

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Email format invalid | 400 | `INVALID_EMAIL_FORMAT` | "Please enter a valid email address." |
| Name blank or too short | 400 | `INVALID_NAME` | "Please enter your full name (at least 2 characters)." |
| Team type not recognized | 400 | `INVALID_TEAM_TYPE` | "Please select a valid team type." |
| Dashboard JWT (role: system_owner) used in respondent flow | 403 | `SYSTEM_OWNER_CANNOT_RESPOND` | "Dashboard users cannot submit assessments as respondents. Please use the respondent login." |
| Session creation fails (DB error) | 500 | `SESSION_CREATE_FAILED` | "Unable to start your session. Please try again." |
| Session not found on resume (stale localStorage) | 404 | `SESSION_NOT_FOUND` | "Your previous session could not be found. Please re-enter your details." |

**API Surface (this feature):** `POST /api/sessions`, `GET /api/sessions/:sessionId` — see `Y1-api.md` §Sessions.

**Schema Surface (this feature):** Uses `sessions` and `respondents` tables — see `Y0-schema.md` §Sessions.

---
