# FRD: AssessmentForm-Express
**Project:** AssessmentForm  
**Version:** 1.0  
**Date:** 2026-07-17  
**Status:** Draft  
**Based on:** PRD-AssessmentForm.md v1.0

---

## Scope

This Functional Requirements Document specifies the detailed behavior of every feature in AssessmentForm-Express — an enterprise-internal SPA that enables cross-functional teams to self-assess their readiness for and expectations of Developer Platform (DP) tools (Backstage, Red Hat Developer Hub, Harness IDP). It covers all inputs, outputs, validation rules, error states, API surface, and database schema for v1 MVP delivery.

---

## Conventions

- **Feature IDs:** `F{nn}` (zero-padded) match PRD feature numbers exactly (e.g., F0 → F00).
- **Field types:** `string`, `integer`, `boolean`, `enum`, `timestamp`, `uuid`, `text` follow PostgreSQL/standard type naming.
- **Required vs Optional:** `(required)` / `(optional)` follow each field.
- **HTTP verbs:** All API endpoints use standard REST conventions (GET, POST, PUT, PATCH, DELETE).
- **Error codes:** `SCREAMING_SNAKE_CASE` identifiers are used in API error responses (see `Y2-errors.md`).
- **References:** `see F{nn} §{section}` means refer to the named section inside that feature chunk.
- **Cross-feature specs:** Full DDL lives in `Y0-schema.md`; full API specs in `Y1-api.md`; error catalog in `Y2-errors.md`; integrations in `Y3-integrations.md`.

---

## Master Table of Contents

| Chunk | Feature / Section |
|-------|------------------|
| `F00-multi-step-workflow.md` | F0: Multi-Step Assessment Workflow |
| `F01-respondent-identity.md` | F1: Respondent Identity & Session Management |
| `F02-question-types.md` | F2: Question Types Engine |
| `F03-section-routing.md` | F3: Team-Type-Specific Section Routing |
| `F04-auto-save.md` | F4: Auto-Save & Progress Persistence |
| `F05-duplicate-prevention.md` | F5: Duplicate Submission Prevention & Edit Window |
| `F06-dashboard.md` | F6: System Owner Dashboard |
| `F07-rbac.md` | F7: Role-Based Access Control |
| `F08-config-management.md` | F8: Assessment Configuration Management |
| `F09-submission-confirmation.md` | F9: Submission Confirmation & Respondent Feedback |
| `Y0-schema.md` | Database Schema (DDL) |
| `Y1-api.md` | REST API Endpoint Catalog |
| `Y2-errors.md` | Cross-Feature Error Catalog |
| `Y3-integrations.md` | External Integration Points |

---

## Cross-Cutting Terminology

| Term | Definition |
|------|-----------|
| **Respondent** | An enterprise team member who completes the assessment form. Identified by email + name. |
| **System Owner** | A privileged user who can view all responses, analytics, and configure assessment settings. Identified by a pre-configured email address. |
| **Assessment** | The full multi-step questionnaire consisting of sections and questions. |
| **Section** | A logical grouping of 5–6 related questions within the assessment. Max 7–8 sections per assessment. |
| **Team Type** | One of four respondent categories: Program/Project, Platform Engineering, Infrastructure/Cloud, Data/API Governance. Determines which optional sections are shown. |
| **DP Tool** | A Developer Platform tool being evaluated. Fixed set in v1: Backstage, Red Hat Developer Hub, Harness IDP. |
| **Submission** | A finalized (deliberate "Submit" action) set of answers from a respondent. |
| **Draft** | A partially-completed assessment that has been auto-saved but not yet submitted. |
| **Due Date** | The configurable deadline after which no further edits to submissions are accepted. |
| **Session** | A server-side record linking a respondent's email to their current draft/submission state. |
| **Edit Window** | The period between a respondent's first submission and the assessment due date during which edits are permitted. |
| **Mandatory Section** | A section required for all team types: General DP Alignment, Current Status, Feedback & Adaptability. |
| **Optional Section** | A section displayed only for specific team types based on routing configuration. |
| **Auto-Save** | Automatic background persistence of a respondent's current answers without requiring a deliberate save action. |
| **Response** | A single answer to a single question by a respondent. |
| **Completion Status** | Indicates whether a respondent has submitted (`submitted`) or has a draft in progress (`draft`). |

---

## Non-Functional Requirements Summary

| Category | Requirement |
|----------|-------------|
| Performance | Section loads ≤ 1 second on standard enterprise network |
| Auto-save latency | Completes within 3 seconds of trigger |
| Availability | 99.5% uptime during active 2-week assessment window |
| Scalability | 500 concurrent respondents without degradation |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2 major versions) |
| Accessibility | WCAG 2.1 AA for all form elements and navigation |
| Security | Dashboard accessible only to System Owner role |
| Data Privacy | Respondent email/name stored; no external data sharing |
| Auditability | Submission timestamps and last-modified per response stored |
| Dashboard refresh | The dashboard response summary (counts by team type, total/submitted/draft) auto-refreshes via client-side polling every 60 seconds while the System Owner has the dashboard open. Individual response list rows do not auto-refresh; the System Owner applies filters or reloads to see new rows. The idle timeout for polling resets if the System Owner navigates away from the dashboard. |

---
---

## F00: Multi-Step Assessment Workflow

**Description:** The core SPA workflow presents the assessment as an ordered sequence of section screens rendered within a single page. Respondents navigate forward and backward through sections using explicit Previous/Next controls without triggering full-page reloads. A persistent visual progress indicator is always visible, and a final Review step lets respondents verify all answers before submitting. This feature is the navigational skeleton that all other features plug into.

**Terminology:**
- **Section Screen:** The rendered view of a single section containing its 5–6 questions, rendered client-side.
- **Step Bar / Progress Indicator:** A persistent UI element showing total sections, current section index, and completion status per section.
- **Review Step:** A read-only summary screen shown before the final Submit action, displaying all answers across all sections.
- **SPA Transition:** Client-side section change with no full HTTP page reload (React state or router-based).
- **Section Index:** Zero-based integer position of the current section in the respondent's section list (team-type-specific ordered list).

**Sub-features:**
- Section-by-section navigation (Previous / Next controls)
- Visual progress indicator (step bar or breadcrumb) always visible
- Maximum 7–8 sections, 5–6 questions per section
- Smooth SPA transitions (no full page reload)
- Pre-submission Review step with all answers displayed
- Back navigation from Review to any section for edits
- Keyboard accessibility for all navigation controls
- **Direct section jump for returning users:** When a respondent returns to edit a submitted assessment (within the edit window), the progress indicator items are clickable, allowing direct navigation to any section without stepping through sequentially. Jump navigation is available only when `submission_status === "submitted"` and `is_closed === false`. (See F05 §Re-Edit Within Edit Window.)

**Process:**
1. Respondent completes identity entry (see F01) and team type selection (see F03).
2. System computes the respondent's ordered section list based on team type routing (see F03 §Process).
3. System renders the first section (index 0) and displays the progress indicator showing `1 / N` where N is total sections.
4. Respondent answers questions on the current section screen.
5. Respondent clicks **Next**:
   a. Client performs in-section validation (see §Validation below).
   b. If validation passes, system triggers auto-save (see F04).
   c. System advances to next section (index + 1), updating progress indicator.
6. Respondent clicks **Previous**: system returns to prior section (index - 1) without validation; previously entered answers are preserved.
7. Steps 4–6 repeat until the respondent reaches the last section and clicks **Next**, which transitions to the **Review Step**.
8. Review Step displays all sections and their answers in read-only format with an **Edit** link per section.
9. Respondent clicks **Edit** on any section from Review: system returns to that section in edit mode; from there Next/Previous navigation eventually returns to Review.
10. Respondent clicks **Submit** on the Review Step: see F05 (duplicate check) and F09 (confirmation).

**Inputs:**
- `current_section_index` (integer, required): Zero-based position of the current section.
- `section_list` (array of section objects, required): Computed per team type (see F03).
- `direction` (enum: `next` | `previous` | `jump`, required): Navigation action requested.
- `target_section_index` (integer, required for `jump`): Target section for jump navigation from Review.

**Outputs:**
- Updated section screen rendered in the SPA viewport.
- Updated progress indicator reflecting new `current_section_index`.
- Auto-save triggered on `next` action (see F04 §Process).

**Validation:**
- **Next action only:** All required questions in the current section must have a non-empty answer before advancing. Optional questions may be left blank.
- **Previous action:** No validation required; backward navigation is always permitted.
- **Jump action (from Review):** No validation; allows free navigation back into any section.
- Section count must be between 3 (3 mandatory sections minimum) and 8 (hard cap).
- Questions per section must be between 1 and 6.

**Error States:**
| Scenario | Behavior | Error Code | Message |
|----------|----------|------------|---------|
| Required question unanswered on Next | Inline field error; navigation blocked | `REQUIRED_QUESTION_UNANSWERED` | "Please answer all required questions before continuing." |
| Section list empty (routing failure) | Full-page error state shown | `SECTION_LIST_EMPTY` | "Unable to load assessment sections. Please refresh or contact support." |
| Section index out of bounds | System clamps to nearest valid index (0 or last) | `SECTION_INDEX_OOB` | (silent correction; no user-facing message) |
| Assessment due date passed on Next | Navigation blocked; read-only mode engaged | `ASSESSMENT_CLOSED` | "This assessment is now closed. Your responses have been saved in read-only mode." |

**API Surface (this feature):** Navigation is client-side state management only; no dedicated navigation API call. Auto-save on `next` is handled by F04 API (`PUT /api/responses/:sessionId`). Section list retrieval: `GET /api/sections?teamType={teamType}` — see `Y1-api.md` §Sections.

**Schema Surface (this feature):** No dedicated navigation table. Uses `sessions` (current section index tracked as `current_section_index`) and `sections` table — see `Y0-schema.md` §Sessions and §Sections.

---
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
- If respondent email matches a System Owner email (see F07), return `SYSTEM_OWNER_CANNOT_RESPOND` error — System Owners may not submit assessments from the respondent flow in v1.
- Duplicate session creation for the same email is handled by upsert (return existing session, not a new one).

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Email format invalid | 400 | `INVALID_EMAIL_FORMAT` | "Please enter a valid email address." |
| Name blank or too short | 400 | `INVALID_NAME` | "Please enter your full name (at least 2 characters)." |
| Team type not recognized | 400 | `INVALID_TEAM_TYPE` | "Please select a valid team type." |
| System Owner email used in respondent flow | 403 | `SYSTEM_OWNER_CANNOT_RESPOND` | "This email is registered as a System Owner. Please access the dashboard instead." |
| Session creation fails (DB error) | 500 | `SESSION_CREATE_FAILED` | "Unable to start your session. Please try again." |
| Session not found on resume (stale localStorage) | 404 | `SESSION_NOT_FOUND` | "Your previous session could not be found. Please re-enter your details." |

**API Surface (this feature):** `POST /api/sessions`, `GET /api/sessions/:sessionId` — see `Y1-api.md` §Sessions.

**Schema Surface (this feature):** Uses `sessions` and `respondents` tables — see `Y0-schema.md` §Sessions.

---
---

## F02: Question Types Engine

**Description:** The assessment supports five distinct question types to capture nuanced team preferences across sentiment, priority, selection, and open-ended feedback dimensions. Each section may contain a mix of question types. The engine renders the appropriate UI widget for each type, validates input per type's rules, and serializes answers into a uniform response format for storage and analytics.

**Terminology:**
- **Question Type:** The rendering and interaction mode of a question. One of: `single_choice`, `multi_choice`, `likert`, `ranking`, `free_text_short`, `free_text_long`.
- **Option:** A discrete selectable item in a `single_choice`, `multi_choice`, or `ranking` question.
- **"Other" Option:** A special option that, when selected, reveals a free-text input field allowing the respondent to enter a custom value. Applicable to `single_choice` and `multi_choice` types only.
- **Likert Scale:** A 5-point scale with labeled endpoints (e.g., 1 = Strongly Disagree → 5 = Strongly Agree).
- **Ranking:** An ordered list where the respondent assigns priority positions (1 = highest priority) to all items.
- **Free Text Short:** A single-line input, suitable for brief answers (≤ 500 characters).
- **Free Text Long:** A multi-line textarea for open-ended responses (≤ 2000 characters).
- **Answer Payload:** The serialized value of a respondent's answer to a question, stored in the `responses` table.

**Sub-features:**
- Single-choice question rendering and answer capture
- Multi-choice question rendering and answer capture
- Likert scale (5-point) question rendering and answer capture
- Ranking question rendering (drag-and-drop + numbered fallback) and answer capture
- Free text short (single-line) question rendering and answer capture
- Free text long (multi-line textarea) question rendering and answer capture
- "Other" option with conditional free-text reveal on applicable choice questions
- Uniform answer serialization for all types

**Process:**

**Single-Choice:**
1. System renders a list of radio buttons, one per option.
2. If an "Other" option is configured, it appears as the last radio item.
3. Respondent selects one option. If "Other" is selected, a text input field is revealed below the radio.
4. Answer stored as `{ "type": "single_choice", "value": "option_id" }` or `{ "type": "single_choice", "value": "other", "other_text": "..." }`.

**Multi-Choice:**
1. System renders a list of checkboxes, one per option.
2. If an "Other" option is configured, it appears as the last checkbox item.
3. Respondent may select one or more options. If "Other" is checked, a text input field is revealed.
4. Answer stored as `{ "type": "multi_choice", "values": ["option_id_1", "option_id_2"], "other_text": "..." }`.

**Likert Scale:**
1. System renders 5 radio buttons labeled 1–5 with descriptive labels at each end (e.g., "Strongly Disagree" / "Strongly Agree").
2. Respondent selects one value.
3. Answer stored as `{ "type": "likert", "value": 3 }` (integer 1–5).

**Ranking:**
1. System renders a list of items in their default order.
2. **Primary interaction:** Drag-and-drop reordering of items.
3. **Fallback interaction:** Numbered input fields (1 to N) next to each item for browsers/devices where drag-and-drop is impractical.
4. Respondent arranges all items into a ranked order (all items must be assigned a unique position).
5. Answer stored as `{ "type": "ranking", "order": ["item_id_1", "item_id_3", "item_id_2"] }` — array represents ranked order, index 0 = rank 1 (highest priority).

**Free Text Short:**
1. System renders a single-line `<input type="text">`.
2. Character counter shown; max 500 characters enforced client-side and server-side.
3. Answer stored as `{ "type": "free_text_short", "value": "..." }`.

**Free Text Long:**
1. System renders a `<textarea>` with visible resize handle.
2. Character counter shown; max 2000 characters enforced.
3. Answer stored as `{ "type": "free_text_long", "value": "..." }`.

**"Other" Reveal Logic:**
1. Client monitors the selection state of the choice question.
2. When "Other" is selected/checked: the `other_text` input is revealed with `aria-expanded: true`.
3. When "Other" is deselected/unchecked: the `other_text` input is hidden and its value is cleared.
4. `other_text` is required if "Other" is selected (see §Validation).

**Inputs (per question type):**
- `question_id` (uuid, required): Identifies which question is being answered.
- `question_type` (enum, required): Determines rendering and validation rules.
- `options` (array of `{id, label}`, required for single_choice / multi_choice / ranking): Available options.
- `has_other` (boolean, optional, default false): Whether the "Other" option is available.
- `is_required` (boolean, required): Whether an answer is mandatory.
- `answer_payload` (object, required on save): The structured answer value (varies by type as described above).

**Outputs:**
- Rendered question widget with appropriate input controls.
- `answer_payload` object for storage on save (see F04).
- Inline validation error messages when answer fails validation.

**Validation:**
- **Single-choice (required):** Exactly one option must be selected; `other_text` required (1–500 chars) if "Other" selected.
- **Multi-choice (required):** At least one option must be checked; `other_text` required (1–500 chars) if "Other" checked.
- **Likert (required):** Value must be an integer in range [1, 5].
- **Ranking (required):** All items must be assigned a unique rank; no two items may share the same position; positions are contiguous from 1 to N.
- **Free text short:** Max 500 characters. If required, value must be non-empty after trimming whitespace.
- **Free text long:** Max 2000 characters. If required, value must be non-empty after trimming whitespace.
- **Optional questions:** Any question with `is_required: false` may be left unanswered; partial answers (e.g., "Other" selected but `other_text` blank) are not permitted — either answer fully or leave blank.
- `question_type` in the answer payload must match the stored `question_type` in the `questions` table; mismatch rejected server-side.

**Error States:**
| Scenario | Behavior | Error Code | Message |
|----------|----------|------------|---------|
| Required question unanswered | Inline error; blocks Next navigation | `REQUIRED_QUESTION_UNANSWERED` | "This question requires an answer." |
| "Other" selected but `other_text` blank | Inline error on `other_text` input | `OTHER_TEXT_REQUIRED` | "Please specify your 'Other' answer." |
| Likert value out of range [1,5] | Input clamped client-side; rejected server-side | `INVALID_LIKERT_VALUE` | "Please select a value between 1 and 5." |
| Ranking items not all ranked | Inline error listing unranked items | `RANKING_INCOMPLETE` | "Please assign a rank to all items." |
| Ranking duplicate positions | Inline error | `RANKING_DUPLICATE_POSITION` | "Each item must have a unique rank." |
| Free text exceeds character limit | Character counter turns red; server-side rejection | `FREE_TEXT_TOO_LONG` | "Your answer exceeds the maximum length of {limit} characters." |
| Unknown question type in payload | 400 from server | `UNKNOWN_QUESTION_TYPE` | "Invalid question type submitted." |

**API Surface (this feature):** Question rendering data is delivered as part of section content via `GET /api/sections/:sectionId/questions`. Answers are saved via `PUT /api/responses/:sessionId` — see `Y1-api.md` §Questions and §Responses.

**Schema Surface (this feature):** Uses `questions`, `question_options`, and `responses` tables — see `Y0-schema.md` §Questions.

---
---

## F03: Team-Type-Specific Section Routing

**Description:** When a respondent selects their team type at the start of the assessment, the system computes a personalized, ordered list of sections to present. All respondents see the three mandatory sections; additional optional sections are included or excluded based on the team type's configuration. The routing logic is data-driven (stored in configuration tables) rather than hardcoded, enabling future team types and section changes without code deploys.

**Terminology:**
- **Section Routing Configuration:** A database-backed mapping of team types to the ordered list of sections they should receive.
- **Mandatory Section:** A section always included regardless of team type. In v1: `general_dp_alignment`, `current_status`, `feedback_adaptability`.
- **Optional Section:** A section included only when its routing configuration maps it to the respondent's team type.
- **Section Order:** The presentation order of sections. Mandatory sections appear first (in fixed order), followed by team-type-specific optional sections.
- **Effective Section List:** The final ordered list of sections computed for a specific respondent based on their team type.

**Sub-features:**
- Team type selection at assessment start (see F01 §Process step 2)
- Mandatory section enforcement for all team types
- Optional section inclusion based on team type routing configuration
- Configuration-driven routing table (not hardcoded)
- Effective Section List computed on session creation and cached in `sessions`
- Display of only relevant sections (no empty or irrelevant section screens)

**Process:**
1. Respondent selects `team_type` on the start page (see F01).
2. System calls `GET /api/sections?teamType={team_type}` to retrieve the Effective Section List.
3. Server queries the `section_routing` table for all sections mapped to the given `team_type`, joined with the `sections` table for ordering and metadata.
4. Server enforces that all three mandatory sections are always included (even if accidentally omitted from routing config — system adds them).
5. Server returns sections in the configured display order:
   - Position 1: General DP Alignment (mandatory)
   - Position 2: Current Status (mandatory)
   - Position 3–7: Team-type-specific optional sections (per routing config)
   - Position Last: Feedback & Adaptability (mandatory, always last)
6. Client stores the Effective Section List in component state and begins the assessment workflow (see F00 §Process step 2).
7. The `sessions` record is updated with `section_ids_ordered` (JSON array of section IDs in display order) so the effective list is preserved for resume.

**v1 Section Roster:**

| Section ID | Section Title | Type |
|------------|---------------|------|
| `general_dp_alignment` | General DP Alignment | Mandatory |
| `current_status` | Current Status | Mandatory |
| `feedback_adaptability` | Feedback & Adaptability | Mandatory |
| `platform_needs` | Platform Needs & Capability Requirements | Optional |
| `tool_evaluation` | Tool Evaluation Criteria | Optional |
| `integration_requirements` | Integration & Ecosystem Requirements | Optional |
| `adoption_readiness` | Adoption Readiness & Constraints | Optional |
| `governance_compliance` | Governance & Compliance Requirements | Optional |

**v1 Team-Type Section Routing:**

| Team Type | Mandatory Sections | Optional Sections Included |
|-----------|-------------------|---------------------------|
| Program/Project | All 3 mandatory | `platform_needs`, `tool_evaluation` |
| Platform Engineering | All 3 mandatory | `platform_needs`, `tool_evaluation`, `integration_requirements`, `adoption_readiness` |
| Infrastructure/Cloud | All 3 mandatory | `integration_requirements`, `adoption_readiness`, `tool_evaluation` |
| Data/API Governance | All 3 mandatory | `governance_compliance`, `platform_needs`, `integration_requirements` |

**Inputs:**
- `team_type` (enum, required): The respondent's team type. One of `program_project`, `platform_engineering`, `infrastructure_cloud`, `data_api_governance`.

**Outputs:**
- `sections` (array of section objects, ordered): Each object contains `section_id`, `title`, `description`, `is_mandatory`, `display_order`, `question_count`.
- Total section count: 5–8 depending on team type (3 mandatory + 2–5 optional).

**Validation:**
- `team_type` must be one of the four valid enum values (server rejects invalid values with `INVALID_TEAM_TYPE`).
- Minimum 3 sections (all mandatory) must be returned; system error if fewer computed.
- Maximum 8 sections hard cap enforced server-side; configuration exceeding this is rejected at config-save time (see F08).
- Each section must have at least 1 and at most 6 questions (enforced at question configuration time, not here).
- Mandatory sections `general_dp_alignment`, `current_status`, `feedback_adaptability` must always appear for all team types; if missing from config, system auto-inserts them.
- `feedback_adaptability` must always be the last section in display order; system enforces this during section list construction regardless of configured order.
- **Team type is locked after session creation.** On re-entry, the `team_type` field on the start page displays the stored value in read-only format. The server ignores any `team_type` submitted in a `POST /api/sessions` call for an existing session and returns the stored value. This prevents section-list changes that would invalidate existing saved responses.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid team type | 400 | `INVALID_TEAM_TYPE` | "The selected team type is not recognized." |
| No sections found for team type | 500 | `SECTION_ROUTING_EMPTY` | "No sections configured for this team type. Please contact support." |
| Mandatory section missing from routing config | Logged as server warning; auto-corrected | `MANDATORY_SECTION_AUTO_INSERTED` | (server log only; no user-facing message) |
| Section count exceeds 8 | 500 | `SECTION_LIMIT_EXCEEDED` | "Assessment configuration error: too many sections. Please contact support." |

**API Surface (this feature):** `GET /api/sections?teamType={teamType}` — see `Y1-api.md` §Sections.

**Schema Surface (this feature):** Uses `sections`, `section_routing`, and `sessions` (for `section_ids_ordered`) tables — see `Y0-schema.md` §Sections.

---
---

## F04: Auto-Save & Progress Persistence

**Description:** As respondents answer questions, their progress is automatically persisted to the backend without requiring manual action. Auto-save fires on section navigation (Next/Previous) and on a periodic idle timer while the respondent is actively answering. On return visits, saved answers are pre-populated so respondents resume exactly where they left off. Only a deliberate "Submit" action on the Review Step finalizes the submission.

**Terminology:**
- **Auto-Save Trigger:** An event that initiates a background save: section navigation or idle timeout.
- **Save State Indicator:** A persistent UI element showing the current save status: `Saved`, `Saving…`, or `Unsaved changes`.
- **Idle Timeout:** A configurable inactivity period (default 30 seconds) after which auto-save fires if there are unsaved changes. Configured via server-side environment variable `AUTO_SAVE_IDLE_SECONDS` (default: `30`). Not configurable from the dashboard.
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
   - Yes: Render form in editable mode with "re-edit" banner (see F09 §re-entry banner). Progress indicator items are clickable for direct section jump.
   - No: Render form in read-only mode with "Assessment closed" message.
4. Respondent makes changes; auto-save applies normally (see F04).
5. **Auto-save is the sole mechanism for persisting edits within the edit window.** The Submit button is presented on the Review Step as an optional re-confirmation gesture, but clicking it is not required — auto-saved changes are final. Clicking Submit again updates `sessions.last_modified_at` only; `submitted_at` remains unchanged and no second submission record is created.
6. Server updates `sessions.last_modified_at = NOW()` on each auto-save; `submission_status` remains `submitted`.

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
---

## F06: System Owner Dashboard

**Description:** System Owners have a dedicated, role-protected dashboard that provides comprehensive visibility into all assessment submissions. The dashboard offers a paginated response list, search and filter controls, individual response drill-down, aggregated analytics charts, and CSV export. It is the primary tool for System Owners to monitor assessment progress and analyze results for DP tool adoption decisions.

**Terminology:**
- **Response List View:** A paginated table of all sessions with key metadata columns.
- **Individual Response View:** A drill-down screen showing a single respondent's complete answers for all sections.
- **Analytics Panel:** The section of the dashboard containing aggregated charts and statistics.
- **Completion Status Filter:** Filter by `draft` (started but not submitted) vs `submitted`.
- **CSV Export:** A downloadable file containing all response data in comma-separated format.
- **Respondent Row:** A single row in the response list table, representing one respondent's session.

**Sub-features:**
- Secure dashboard route (System Owner role only; see F07)
- Response list view: paginated table with sortable columns
- Search by respondent name or email
- Filter by team type, submission date range, completion status
- Individual response drill-down view
- Analytics charts: response count by team type, Likert distributions, ranking top items, choice breakdowns
- CSV export of all responses
- Assessment status banner (active, closed, upcoming) and quick link to configuration (see F08)

**Process:**

**Dashboard Load:**
1. System Owner navigates to `/dashboard`.
2. Server verifies System Owner role (see F07 §Process). Unauthorized users redirected to `/` with `ACCESS_DENIED` error.
3. Server returns dashboard home with:
   - Assessment status (active/closed/upcoming) from `assessment_config`.
   - Summary stats: total responses, submitted count, draft count, team type breakdown.
   - Response list (first page, default sort: `submitted_at DESC`).

**Response List View:**
1. Default display: table with columns — Respondent Name, Email, Team Type, Status (draft/submitted), Submitted At, Last Modified At.
2. Pagination: 25 rows per page. Page controls (previous/next/page number).
3. Column headers for Name, Email, Team Type, Status, Submitted At are sortable (ASC/DESC).
4. System Owner applies filters/search (see below); table refreshes via `GET /api/dashboard/responses`.

**Search & Filter:**
- **Search:** Free-text search against `respondents.name` and `respondents.email` (case-insensitive, partial match).
- **Team Type Filter:** Multi-select dropdown; one or more of the four team types.
- **Date Range Filter:** `submitted_after` and `submitted_before` date pickers (inclusive).
- **Status Filter:** `all` | `submitted` | `draft`.
- Filters and search are combinable; all active at once.
- Filter state is reflected in URL query parameters for bookmarking/sharing.

**Individual Response View:**
1. System Owner clicks any row → navigates to `/dashboard/responses/:sessionId`.
2. System renders all sections and questions for the respondent's team type.
3. All answers are shown in read-only format, rendered with the same question-type widgets (see F02) but non-interactive.
4. Back button returns to the response list with filter state preserved.

**Analytics Panel:**
- **Response Counts by Team Type:** Horizontal bar chart. X-axis: count. Y-axis: team types.
- **Likert Distribution per Question:** For each Likert question, a stacked bar showing % of respondents at each point (1–5), filterable by team type.
- **Top-Ranked Items per Ranking Question:** For each ranking question, a ranked list of items by average rank position across all respondents.
- **Choice Question Breakdown:** For each single/multi-choice question, a pie or horizontal bar chart showing option selection frequency.
- All charts filter by the active team type filter when set.
- Charts render using server-aggregated data (`GET /api/dashboard/analytics`).
- **Empty state:** When no submitted responses exist, all chart areas display an empty state message: _"No responses yet. Charts will populate as respondents submit."_ No error is shown; the analytics panel structure is rendered with placeholders.
- **Deduplication status banner:** The response list view displays a banner confirming: _"Deduplication active — 0 duplicate email addresses detected."_ This count is returned by `GET /api/dashboard/responses` as a `duplicate_count` summary field and is always 0 in a correctly functioning system.

**CSV Export:**
1. System Owner clicks **Export CSV**.
2. Client sends `GET /api/dashboard/export/csv` with current filter parameters.
3. Server generates CSV synchronously (or async with download link for large datasets).
4. CSV includes columns: `respondent_name`, `respondent_email`, `team_type`, `submission_status`, `submitted_at`, `last_modified_at`, then one column per question (by question ID / title), with answer values as human-readable strings.
5. File is streamed as `Content-Disposition: attachment; filename="assessment-responses-{date}.csv"`.

**Inputs:**
- `Authorization` header (required): Bearer token identifying the System Owner (see F07).
- Filter params (optional): `teamType`, `status`, `submittedAfter`, `submittedBefore`, `search`, `page`, `pageSize`, `sortBy`, `sortDir`.

**Outputs:**
- Response list: array of session objects with respondent metadata.
- Analytics data: aggregated statistics per chart type.
- CSV file: flat tabular export of all matching responses.

**Validation:**
- Date range: `submitted_after` must be before or equal to `submitted_before`; otherwise 400 `INVALID_DATE_RANGE`.
- `pageSize` max: 100; defaults to 25.
- `page` min: 1; defaults to 1.
- All filter values validated server-side regardless of client-side validation.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Non-System Owner accesses dashboard | 403 | `ACCESS_DENIED` | "You do not have permission to access this page." |
| Invalid date range in filter | 400 | `INVALID_DATE_RANGE` | "The 'from' date must be before or equal to the 'to' date." |
| Session ID not found in individual view | 404 | `RESPONSE_NOT_FOUND` | "The requested response could not be found." |
| Analytics data unavailable | 500 | `ANALYTICS_ERROR` | "Analytics could not be loaded. Please refresh." |
| CSV export fails | 500 | `EXPORT_FAILED` | "Export could not be generated. Please try again." |
| No results match filter | 200 | (empty array) | UI message: "No responses match your current filters." |

**API Surface (this feature):** `GET /api/dashboard/responses`, `GET /api/dashboard/responses/:sessionId`, `GET /api/dashboard/analytics`, `GET /api/dashboard/export/csv` — see `Y1-api.md` §Dashboard.

**Schema Surface (this feature):** Reads from `sessions`, `respondents`, `responses`, `questions`, `sections`, `assessment_config` — see `Y0-schema.md`.

---
---

## F07: Role-Based Access Control

**Description:** The system supports exactly two roles: Respondent and System Owner. Role assignment is determined at session creation by matching the respondent's email against a pre-configured list of System Owner emails stored in `system_owner_emails`. No complex permission hierarchy, OAuth, or SSO is required in v1. Role enforcement happens server-side on every protected API route.

**Terminology:**
- **Respondent Role:** The default role for all non-System-Owner email addresses. Grants access to the assessment form and the respondent's own session data only.
- **System Owner Role:** A privileged role granted to emails listed in `system_owner_emails`. Grants access to the dashboard, all response data, and configuration management.
- **Pre-configured Email List:** The `system_owner_emails` table (or environment-variable list) of email addresses with System Owner access.
- **Protected Route:** An API endpoint or UI route that requires a specific role; returns 403 if the caller's role does not match.
- **JWT Token:** A signed JSON Web Token issued by `POST /api/sessions` that encodes `{ session_id, email, role }`. Used as the bearer token for all subsequent API calls.
- **Role Claim:** The `role` field in the JWT payload: either `"respondent"` or `"system_owner"`.

**Sub-features:**
- Email-to-role mapping at session creation
- JWT generation with role claim
- Server-side role validation on every protected route
- Respondent cannot access dashboard or other respondents' data
- System Owner cannot submit an assessment from the respondent flow (in v1)
- No UI route rendered if role does not match (client-side guard + server-side enforcement)

**Process:**

**Role Determination at Login — Two Separate Entry Points:**

- **Respondents** use `POST /api/sessions` on the assessment start page (email + name + team type).
- **System Owners** use `POST /api/auth/login` on the dedicated dashboard login page (email + name; no team type). The dashboard login page is a distinct UI route (e.g., `/dashboard/login`) separate from the assessment start page.

These are not interchangeable: `POST /api/sessions` accepts `team_type` and returns `session_id` + respondent session context; `POST /api/auth/login` does not accept `team_type`, does not create a respondent session, and returns only a JWT with `role: "system_owner"`.

1. **Respondent flow:** Respondent submits email + name + team_type via `POST /api/sessions`. Server checks email against `system_owner_emails`; if match, returns `SYSTEM_OWNER_CANNOT_RESPOND` (403). Otherwise issues a Respondent JWT and creates/loads the session.
2. **System Owner flow:** System Owner submits email + name via `POST /api/auth/login`. Server checks email against `system_owner_emails`; if no match, returns `NOT_A_SYSTEM_OWNER` (403). If match, issues a System Owner JWT (no session record created).
3. Server issues a signed JWT with payload `{ session_id, email, role, issued_at, expires_at }`. Expiry: 8 hours for System Owners; 24 hours for Respondents.
4. JWT returned to client; stored in `localStorage` or `sessionStorage`.

**System Owner Dashboard Access:**
1. System Owner navigates to `/dashboard`.
2. Client attaches JWT as `Authorization: Bearer {token}` header.
3. Server middleware extracts and verifies JWT signature and expiry.
4. Server checks `role === "system_owner"`; if not, returns 403 `ACCESS_DENIED`.
5. If token expired, returns 401 `TOKEN_EXPIRED`; client redirects to login.

**Respondent Route Protection:**
1. Respondent accesses `/assessment` or any `/api/responses/*` or `/api/sessions/*` endpoint.
2. Server middleware extracts JWT; verifies `role === "respondent"` or `role === "system_owner"` (System Owners are not blocked from reading their own session if it exists, but submit is blocked).
3. `GET /api/dashboard/*` routes: Respondent JWT returns 403 `ACCESS_DENIED`.
4. `GET /api/dashboard/responses/:sessionId`: Only allowed if `role === "system_owner"`; respondents cannot view others' sessions.

**Data Isolation for Respondents:**
1. All `/api/responses/:sessionId` and `/api/sessions/:sessionId` requests validate that the `session_id` in the path belongs to the authenticated user's email (extracted from JWT).
2. If session belongs to a different email, return 403 `SESSION_ACCESS_DENIED`.

**Inputs:**
- `email` (string, required): Used for role lookup.
- `Authorization: Bearer {token}` header (required on all protected routes).

**Outputs:**
- JWT token with `{ session_id, email, role, issued_at, expires_at }`.
- Role-appropriate UI rendered (assessment form for Respondents; dashboard for System Owners).

**Validation:**
- JWT must be signed with the server's secret key; tampered tokens rejected with `TOKEN_INVALID`.
- JWT expiry enforced; expired tokens rejected with `TOKEN_EXPIRED`.
- `role` claim in JWT must be one of `"respondent"` or `"system_owner"`; any other value rejected.
- System Owner email lookup is case-insensitive.
- Empty `system_owner_emails` table is valid (no System Owners configured); System Owner routes return 403 for all users in this state.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Non-System Owner accesses dashboard route | 403 | `ACCESS_DENIED` | "You do not have permission to access this resource." |
| JWT expired | 401 | `TOKEN_EXPIRED` | "Your session has expired. Please log in again." |
| JWT invalid or tampered | 401 | `TOKEN_INVALID` | "Authentication failed. Please log in again." |
| Respondent attempts to access another session | 403 | `SESSION_ACCESS_DENIED` | "You do not have access to this session." |
| System Owner attempts to submit assessment | 403 | `SYSTEM_OWNER_CANNOT_SUBMIT` | "System Owners cannot submit assessments as respondents." |
| No Authorization header on protected route | 401 | `AUTH_REQUIRED` | "Authentication required. Please log in." |

**API Surface (this feature):** `POST /api/auth/login` (System Owner login), JWT validation middleware applied to all protected routes — see `Y1-api.md` §Auth.

**Schema Surface (this feature):** Uses `system_owner_emails` table — see `Y0-schema.md` §Auth.

---
---

## F08: Assessment Configuration Management

**Description:** System Owners can manage key assessment parameters through the dashboard without requiring a code deployment. In v1, the primary configurable parameter is the assessment due date. Configuration changes take effect immediately for all active respondents. The dashboard surfaces the current assessment status (active, closed, upcoming) and provides a confirmation step before any due date change is committed.

**Terminology:**
- **Assessment Config:** A singleton record in `assessment_config` that stores global assessment parameters: `due_date`, `launch_date`, `status`.
- **Assessment Status:** Computed from `launch_date` and `due_date` relative to current time: `upcoming` (before launch), `active` (between launch and due date), `closed` (after due date).
- **Config Panel:** The settings section within the System Owner dashboard for viewing and editing configuration.
- **Confirmation Step:** A UI confirmation dialog shown before saving a due date change, displaying the current and new values.

**Sub-features:**
- View current assessment configuration (due date, launch date, status) from dashboard
- Update assessment due date with confirmation step
- Immediate effect of configuration changes (no cache lag)
- Status badge in dashboard header reflecting current assessment status
- Configuration change audit log (timestamp + System Owner email recorded per change)

**Process:**

**View Configuration:**
1. System Owner navigates to the Config Panel (accessible via dashboard settings link).
2. Client calls `GET /api/config`.
3. Server returns `{ due_date, launch_date, status, last_modified_at, last_modified_by }`.
4. Dashboard renders: current due date, launch date, computed status badge, last modified info.

**Update Due Date:**
1. System Owner clicks **Edit Due Date** in the Config Panel.
2. A date/time picker is shown, pre-populated with the current `due_date`.
3. System Owner selects a new date/time and clicks **Save**.
4. System displays a confirmation dialog:
   - _"You are about to change the assessment due date from {current} to {new}. This will take effect immediately for all respondents. Confirm?"_
5. System Owner confirms.
6. Client sends `PATCH /api/config` with `{ due_date: "..." }` and System Owner's JWT.
7. Server validates the new `due_date` (must be a valid future or past date; no restriction on direction — admins may extend or shorten the window).
8. Server updates `assessment_config.due_date`, sets `last_modified_at = NOW()`, `last_modified_by = {system_owner_email}`.
9. Server logs the change in `config_audit_log`.
10. Server returns updated config object.
11. Dashboard refreshes Config Panel and status badge.

**Assessment Status Computation:**
- `upcoming`: `NOW() < launch_date`
- `active`: `launch_date <= NOW() <= due_date`
- `closed`: `NOW() > due_date`
- Status is computed on every `GET /api/config` call (not stored); stored `launch_date` and `due_date` are the source of truth.

**Inputs:**
- `due_date` (ISO 8601 timestamp, required for update): New due date value.
- System Owner JWT (required): Authorization for all config endpoints.

**Outputs:**
- `assessment_config` record updated.
- `config_audit_log` entry created.
- Updated config object returned to client: `{ due_date, launch_date, status, last_modified_at, last_modified_by }`.

**Validation:**
- Only System Owner role may read or write config; Respondents receive 403 `ACCESS_DENIED`.
- `due_date` must be a valid ISO 8601 datetime string.
- `due_date` may be set to any value (past or future) — System Owners are trusted to manage this; no system-level restriction.
- `launch_date` is set at system initialization and is not editable via the dashboard in v1.
- Config record is a singleton (exactly one row); `PATCH` always updates that row, never inserts.

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Non-System Owner accesses config endpoints | 403 | `ACCESS_DENIED` | "You do not have permission to modify assessment configuration." |
| Invalid `due_date` format | 400 | `INVALID_DATE_FORMAT` | "Please provide a valid date and time." |
| Config record not found (initialization error) | 500 | `CONFIG_NOT_FOUND` | "Assessment configuration is missing. Please contact a system administrator." |
| Database error on config update | 500 | `CONFIG_UPDATE_FAILED` | "Configuration could not be saved. Please try again." |

**API Surface (this feature):** `GET /api/config`, `PATCH /api/config` — see `Y1-api.md` §Config.

**Schema Surface (this feature):** Uses `assessment_config` and `config_audit_log` tables — see `Y0-schema.md` §Config.

---
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
2. Server returns `is_closed: true` and `submission_status`.
3. Client renders all sections in read-only mode.
4. A dismissible banner is shown at the top of every section, with message depending on `submission_status`:
   - **If `submitted`:** _"This assessment is now closed. Your responses are saved and have been submitted to the System Owner."_
   - **If `draft` (never submitted):** _"This assessment is now closed. Your draft responses were not submitted and will not be included in the analysis. Please contact the System Owner if you believe this is an error."_
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
---

## F10: Global Navigation Bar (AppNav)

**ID:** F-NAV-01  
**Description:** A sticky navigation bar (`AppNav` component) rendered in the root layout is persistently visible on all non-dashboard assessment pages. It provides branding, a direct link to the System Owner Dashboard, and a Logout control for authenticated users.

**Sub-features:**
- Global sticky nav bar in the root layout (`app/layout.tsx`)
- Application brand label: "Developer Platform Assessment"
- "System Owner Dashboard" link visible to authenticated users
- "Logout" button shown when a JWT is present in localStorage; clears JWT and redirects to start page on click
- Nav bar does not re-render or flash during SPA section transitions

**Process:**
1. Root layout mounts `AppNav` once; it persists across all client-side navigations within the assessment flow.
2. `AppNav` reads JWT from localStorage on mount to determine logged-in state.
3. If JWT is present: renders brand label + Dashboard link + Logout button.
4. If JWT is absent: renders brand label only (no dashboard link, no logout button).
5. Clicking Logout: clears `localStorage` JWT, clears session state, redirects to `/` (identity capture page).
6. Dashboard link navigates to `/dashboard`.

**Validation:**
- Nav bar is always rendered regardless of assessment progress state.
- Dashboard link is only shown when a valid JWT is present; non-authenticated users do not see it.

**API Surface:** None (client-side only; reads localStorage for auth state).

**Schema Surface:** None.

---
---

## Implementation Bug Fixes (v1 Actual)

The following requirements document bugs discovered and fixed during implementation that deviate from the original spec.

---

### F-SESSION-FIX-01: Session API Returns `team_type`

**Description:** The `POST /api/sessions` and `GET /api/sessions/:sessionId` responses include a `team_type` field in the session response payload. This allows the assessment wizard to load the correct sections on resume without depending on `localStorage` for team type storage.

**Actual behavior:** `team_type` is returned directly from the DB respondent record in the session API response. The wizard reads `team_type` from the API response, not from localStorage.

**Rationale:** localStorage-based `team_type` retrieval creates a failure mode when localStorage is cleared or the session is resumed from a different browser.

---

### F-AUTOSAVE-FIX-01: Auto-Save Uses React Refs to Prevent Stale Closures

**Description:** The auto-save implementation stores all save parameters (session ID, token, current section, responses) in React refs rather than in closure-captured state variables. This prevents the stale closure bug where an idle-timer callback captures outdated values from the initial render.

**Actual behavior:** `useAutoSave` hook stores `sessionId`, `token`, `sectionId`, and `responses` in `useRef` objects updated on every render. The idle timer callback reads from refs, always using the latest values.

---

### F-VALIDATION-FIX-01: `question_id` Validated as `string.min(1)` Not UUID

**Description:** The Zod validation schema for `question_id` in the auto-save endpoint uses `z.string().min(1)` rather than `z.string().uuid()`. The seed data uses deterministic non-RFC-UUID identifiers for questions.

**Actual behavior:** Any non-empty string is accepted as a valid `question_id` in API payloads. Referential integrity is still enforced at the database FK level.

---

### F-DB-FIX-01: DB Schema Isolation via Connection String `options=` Parameter

**Description:** The `assessmentform` schema search_path is set via the PostgreSQL connection string `options=-csearch_path%3Dassessmentform%2Cpublic` parameter, not via a `pool.on('connect')` callback.

**Actual behavior:** Setting search_path in `pool.on('connect')` creates an async race condition where the first few queries may execute before the SET command completes. The connection string `options=` approach sets the search_path synchronously at the driver/protocol level.

**Connection string format:**
```
postgres://user:pass@pivota-spec-driven-primary.prod.svc:5432/dbname?options=-csearch_path%3Dassessmentform%2Cpublic
```

---

### F-AUTH-FIX-01: System Owner Email

**Description:** The seeded system owner email is `admin@assessmentform.dev` (not `vijay@gmail.com` or `owner@example.com`). This is the email pre-inserted into the `system_owner_emails` table by the seed script.

---
---

## Database Schema (DDL)

> **Database:** PostgreSQL (or compatible relational store). All timestamps are stored as `TIMESTAMPTZ` (UTC). UUIDs use `gen_random_uuid()` as default. `JSONB` is used for flexible answer payloads.

---

### §Auth — System Owner Emails

```sql
CREATE TABLE system_owner_emails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,              -- Case-insensitive enforced via CHECK/lower()
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by     TEXT,                              -- Email of the admin who added this entry
  is_active    BOOLEAN NOT NULL DEFAULT TRUE      -- Soft-disable without deleting
);

CREATE UNIQUE INDEX idx_system_owner_emails_lower
  ON system_owner_emails (LOWER(email));
```

---

### §Sessions — Respondent Sessions

```sql
CREATE TABLE respondents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  team_type    TEXT NOT NULL
                 CHECK (team_type IN (
                   'program_project',
                   'platform_engineering',
                   'infrastructure_cloud',
                   'data_api_governance'
                 )),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_respondents_email_lower
  ON respondents (LOWER(email));

CREATE TABLE sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id         UUID NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  submission_status     TEXT NOT NULL DEFAULT 'draft'
                          CHECK (submission_status IN ('draft', 'submitted')),
  current_section_index INTEGER NOT NULL DEFAULT 0,
  section_ids_ordered   JSONB NOT NULL DEFAULT '[]', -- Array of section_id strings in display order
  submitted_at          TIMESTAMPTZ,
  last_saved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_respondent_id ON sessions(respondent_id);
CREATE INDEX idx_sessions_submission_status ON sessions(submission_status);
CREATE INDEX idx_sessions_submitted_at ON sessions(submitted_at);
```

---

### §Sections — Sections & Section Routing

```sql
CREATE TABLE sections (
  id              TEXT PRIMARY KEY,            -- e.g., 'general_dp_alignment'
  title           TEXT NOT NULL,
  description     TEXT,
  is_mandatory    BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INTEGER NOT NULL,            -- Global default order; overridden by section_routing
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE section_routing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_type       TEXT NOT NULL
                    CHECK (team_type IN (
                      'program_project',
                      'platform_engineering',
                      'infrastructure_cloud',
                      'data_api_governance'
                    )),
  section_id      TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  display_order   INTEGER NOT NULL,            -- Order of this section for this team type
  is_included     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (team_type, section_id)
);

CREATE INDEX idx_section_routing_team_type ON section_routing(team_type);
```

---

### §Questions — Questions & Options

```sql
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL
                    CHECK (question_type IN (
                      'single_choice',
                      'multi_choice',
                      'likert',
                      'ranking',
                      'free_text_short',
                      'free_text_long'
                    )),
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  has_other       BOOLEAN NOT NULL DEFAULT FALSE,  -- Applicable to single/multi_choice only
  display_order   INTEGER NOT NULL,
  help_text       TEXT,                            -- Optional tooltip/hint text
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_section_id ON questions(section_id);

CREATE TABLE question_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text     TEXT NOT NULL,
  display_order   INTEGER NOT NULL,
  is_other        BOOLEAN NOT NULL DEFAULT FALSE,  -- Marks the special "Other" option
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, display_order)
);

CREATE INDEX idx_question_options_question_id ON question_options(question_id);
```

---

### §Responses — Respondent Answers

```sql
CREATE TABLE responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_payload  JSONB NOT NULL,               -- Structured per question type (see F02)
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)              -- One answer per question per session; upsert on conflict
);

CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);
```

**Answer Payload Shapes (stored in `answer_payload` JSONB):**

```json
// single_choice
{ "type": "single_choice", "value": "option_id_uuid" }
// single_choice with Other
{ "type": "single_choice", "value": "other", "other_text": "Custom value" }

// multi_choice
{ "type": "multi_choice", "values": ["option_id_1", "option_id_2"] }
// multi_choice with Other
{ "type": "multi_choice", "values": ["option_id_1", "other"], "other_text": "Custom value" }

// likert
{ "type": "likert", "value": 4 }

// ranking (array = ranked order; index 0 = rank 1 = highest priority)
{ "type": "ranking", "order": ["option_id_2", "option_id_1", "option_id_3"] }

// free_text_short
{ "type": "free_text_short", "value": "Brief answer text" }

// free_text_long
{ "type": "free_text_long", "value": "Extended open-ended response text..." }
```

---

### §Config — Assessment Configuration

```sql
CREATE TABLE assessment_config (
  id              INTEGER PRIMARY KEY DEFAULT 1
                    CHECK (id = 1),             -- Singleton: only one row allowed
  due_date        TIMESTAMPTZ NOT NULL,
  launch_date     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified_by TEXT                         -- System Owner email
);

CREATE TABLE config_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by      TEXT NOT NULL,                -- System Owner email
  field_changed   TEXT NOT NULL,                -- e.g., 'due_date'
  old_value       TEXT,
  new_value       TEXT
);
```

---

### §Seed Data (v1 Sections)

```sql
INSERT INTO sections (id, title, description, is_mandatory, display_order) VALUES
  ('general_dp_alignment',  'General DP Alignment',                  'Core Developer Platform alignment questions', TRUE,  1),
  ('current_status',        'Current Status',                        'Team current tooling and adoption status',   TRUE,  2),
  ('platform_needs',        'Platform Needs & Capability Requirements', 'Platform-specific capability requirements', FALSE, 3),
  ('tool_evaluation',       'Tool Evaluation Criteria',              'Criteria for evaluating DP tools',           FALSE, 4),
  ('integration_requirements', 'Integration & Ecosystem Requirements', 'Integration and ecosystem requirements',  FALSE, 5),
  ('adoption_readiness',    'Adoption Readiness & Constraints',      'Readiness and blockers for adoption',        FALSE, 6),
  ('governance_compliance', 'Governance & Compliance Requirements',  'Governance and compliance needs',            FALSE, 7),
  ('feedback_adaptability', 'Feedback & Adaptability',               'Open feedback and adaptability questions',  TRUE,  8);
```

---
---

## REST API Endpoint Catalog

> **Base URL:** `/api`  
> **Auth:** All endpoints except `POST /api/sessions` and `POST /api/auth/login` require `Authorization: Bearer {jwt}` header.  
> **Content-Type:** `application/json` (except CSV export).  
> **Error envelope:** `{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }`

---

### §Auth — Authentication

#### `POST /api/auth/login`
System Owner dedicated login. Returns JWT with `role: "system_owner"` if email is in `system_owner_emails`.

**Request:**
```json
{ "email": "owner@example.com", "name": "Jane Smith" }
```
**Response 200:**
```json
{
  "token": "eyJ...",
  "role": "system_owner",
  "email": "owner@example.com",
  "expires_at": "2026-07-18T10:00:00Z"
}
```
**Errors:** `400 INVALID_EMAIL_FORMAT`, `403 NOT_A_SYSTEM_OWNER`

---

### §Sessions — Session Management

#### `POST /api/sessions`
Create or resume a respondent session. Used by both new and returning respondents.

**Request:**
```json
{
  "email": "respondent@example.com",
  "name": "Alex Johnson",
  "team_type": "platform_engineering"
}
```
**Response 200:**
```json
{
  "session_id": "uuid",
  "token": "eyJ...",
  "role": "respondent",
  "is_returning": true,
  "submission_status": "draft",
  "current_section_index": 2,
  "section_ids_ordered": ["general_dp_alignment", "current_status", "platform_needs", "tool_evaluation", "integration_requirements", "adoption_readiness", "feedback_adaptability"],
  "saved_responses": [ { "question_id": "uuid", "answer_payload": { ... } } ],
  "is_closed": false,
  "due_date": "2026-07-31T23:59:59Z"
}
```
**Errors:** `400 INVALID_EMAIL_FORMAT`, `400 INVALID_NAME`, `400 INVALID_TEAM_TYPE`, `403 SYSTEM_OWNER_CANNOT_RESPOND`, `500 SESSION_CREATE_FAILED`

---

#### `GET /api/sessions/:sessionId`
Load an existing session (e.g., on page refresh, using stored token).

**Response 200:** Same shape as `POST /api/sessions` response above.  
**Errors:** `401 AUTH_REQUIRED`, `403 SESSION_ACCESS_DENIED`, `404 SESSION_NOT_FOUND`

---

### §Sections — Section & Question Retrieval

#### `GET /api/sections?teamType={teamType}`
Returns the ordered list of sections for the given team type.

**Query params:** `teamType` (required): one of the four team type enum values.

**Response 200:**
```json
{
  "sections": [
    {
      "section_id": "general_dp_alignment",
      "title": "General DP Alignment",
      "description": "Core Developer Platform alignment questions",
      "is_mandatory": true,
      "display_order": 1,
      "question_count": 5
    }
  ]
}
```
**Errors:** `400 INVALID_TEAM_TYPE`, `500 SECTION_ROUTING_EMPTY`, `500 SECTION_LIMIT_EXCEEDED`

---

#### `GET /api/sections/:sectionId/questions`
Returns all questions and their options for a single section.

**Response 200:**
```json
{
  "section_id": "platform_needs",
  "title": "Platform Needs & Capability Requirements",
  "questions": [
    {
      "question_id": "uuid",
      "question_text": "How important is self-service portal capability?",
      "question_type": "likert",
      "is_required": true,
      "has_other": false,
      "display_order": 1,
      "help_text": null,
      "options": []
    },
    {
      "question_id": "uuid",
      "question_text": "Which DP tools has your team previously evaluated?",
      "question_type": "multi_choice",
      "is_required": false,
      "has_other": true,
      "display_order": 2,
      "help_text": null,
      "options": [
        { "option_id": "uuid", "option_text": "Backstage", "display_order": 1, "is_other": false },
        { "option_id": "uuid", "option_text": "Red Hat Developer Hub", "display_order": 2, "is_other": false },
        { "option_id": "uuid", "option_text": "Harness IDP", "display_order": 3, "is_other": false },
        { "option_id": "uuid", "option_text": "Other", "display_order": 4, "is_other": true }
      ]
    }
  ]
}
```
**Errors:** `401 AUTH_REQUIRED`, `404 SECTION_NOT_FOUND`

---

### §Responses — Answer Auto-Save

#### `PUT /api/responses/:sessionId`
Upsert answers for one section. Called by auto-save on navigation and idle timeout.

**Request:**
```json
{
  "section_id": "platform_needs",
  "current_section_index": 3,
  "responses": [
    { "question_id": "uuid", "answer_payload": { "type": "likert", "value": 4 } },
    { "question_id": "uuid", "answer_payload": { "type": "multi_choice", "values": ["opt_uuid_1"], "other_text": "" } }
  ]
}
```
**Response 200:**
```json
{ "saved": true, "last_saved_at": "2026-07-17T14:34:22Z" }
```
**Errors:** `400 INVALID_ANSWER_PAYLOAD`, `401 AUTH_REQUIRED`, `403 ASSESSMENT_CLOSED`, `403 SESSION_ACCESS_DENIED`, `404 SESSION_NOT_FOUND`, `500 SAVE_FAILED`

---

### §Submissions — Final Submission

#### `POST /api/submissions/:sessionId`
Finalize a submission. Transitions `submission_status` from `draft` to `submitted` (or re-confirms an already-submitted session within the edit window).

**Request body:** `{}` (empty; all data already saved via auto-save)

**Response 200:**
```json
{
  "submitted": true,
  "submitted_at": "2026-07-17T15:00:00Z",
  "due_date": "2026-07-31T23:59:59Z",
  "edit_window_open": true
}
```
**Errors:** `400 MANDATORY_QUESTIONS_INCOMPLETE`, `401 AUTH_REQUIRED`, `403 ASSESSMENT_CLOSED`, `403 SESSION_ACCESS_DENIED`, `403 SYSTEM_OWNER_CANNOT_SUBMIT`, `404 SESSION_NOT_FOUND`, `500 SUBMISSION_FAILED`

---

### §Dashboard — System Owner Dashboard

#### `GET /api/dashboard/responses`
Paginated list of all respondent sessions. System Owner only.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 25 | Rows per page (max 100) |
| `sortBy` | string | `submitted_at` | Column to sort |
| `sortDir` | enum | `desc` | `asc` or `desc` |
| `teamType` | string (multi) | — | Filter by team type |
| `status` | enum | `all` | `all`, `submitted`, `draft` |
| `submittedAfter` | ISO date | — | Filter by submission date |
| `submittedBefore` | ISO date | — | Filter by submission date |
| `search` | string | — | Name or email partial match |

**Response 200:**
```json
{
  "total": 87,
  "page": 1,
  "pageSize": 25,
  "submitted_count": 72,
  "draft_count": 15,
  "duplicate_count": 0,
  "data": [
    {
      "session_id": "uuid",
      "respondent_name": "Alex Johnson",
      "respondent_email": "alex@example.com",
      "team_type": "platform_engineering",
      "submission_status": "submitted",
      "submitted_at": "2026-07-17T15:00:00Z",
      "last_modified_at": "2026-07-17T15:05:00Z"
    }
  ]
}
```
> `duplicate_count` is the count of email addresses appearing in more than one session record. In a correctly operating system this is always `0` (enforced by F5). The dashboard renders this as a deduplication status banner. **Errors:** `400 INVALID_DATE_RANGE`, `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`

---

#### `GET /api/dashboard/responses/:sessionId`
Full response detail for a single respondent. System Owner only.

**Response 200:**
```json
{
  "session_id": "uuid",
  "respondent_name": "Alex Johnson",
  "respondent_email": "alex@example.com",
  "team_type": "platform_engineering",
  "submission_status": "submitted",
  "submitted_at": "2026-07-17T15:00:00Z",
  "sections": [
    {
      "section_id": "platform_needs",
      "title": "Platform Needs & Capability Requirements",
      "answers": [
        { "question_id": "uuid", "question_text": "...", "question_type": "likert", "answer_payload": { "type": "likert", "value": 4 } }
      ]
    }
  ]
}
```
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `404 RESPONSE_NOT_FOUND`

---

#### `GET /api/dashboard/analytics`
Aggregated analytics data for all charts. System Owner only.

**Query params:** `teamType` (optional multi-select filter).

**Response 200:**
```json
{
  "response_counts_by_team_type": {
    "program_project": 22,
    "platform_engineering": 30,
    "infrastructure_cloud": 18,
    "data_api_governance": 17
  },
  "likert_distributions": [
    {
      "question_id": "uuid",
      "question_text": "How important is self-service portal capability?",
      "distribution": { "1": 3, "2": 5, "3": 12, "4": 25, "5": 15 }
    }
  ],
  "ranking_top_items": [
    {
      "question_id": "uuid",
      "question_text": "Rank DP tools by preference",
      "ranked_items": [
        { "option_text": "Backstage", "average_rank": 1.8 },
        { "option_text": "Red Hat Developer Hub", "average_rank": 2.1 },
        { "option_text": "Harness IDP", "average_rank": 2.9 }
      ]
    }
  ],
  "choice_breakdowns": [
    {
      "question_id": "uuid",
      "question_text": "Which DP tools has your team previously evaluated?",
      "counts": [
        { "option_text": "Backstage", "count": 45, "percentage": 51.7 },
        { "option_text": "Other", "count": 8, "percentage": 9.2 }
      ]
    }
  ]
}
```
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 ANALYTICS_ERROR`

---

#### `GET /api/dashboard/export/csv`
Stream CSV export of all matching responses. System Owner only.

**Query params:** Same as `GET /api/dashboard/responses` (filters applied to export).

**Response 200:**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="assessment-responses-{YYYY-MM-DD}.csv"`
- Body: CSV rows — one row per respondent, one column per question.

**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 EXPORT_FAILED`

---

### §Config — Assessment Configuration

#### `GET /api/config`
Returns current assessment configuration. System Owner only.

**Response 200:**
```json
{
  "due_date": "2026-07-31T23:59:59Z",
  "launch_date": "2026-07-17T00:00:00Z",
  "status": "active",
  "last_modified_at": "2026-07-17T09:00:00Z",
  "last_modified_by": "owner@example.com"
}
```
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 CONFIG_NOT_FOUND`

---

#### `PATCH /api/config`
Update the assessment due date. System Owner only.

**Request:**
```json
{ "due_date": "2026-08-07T23:59:59Z" }
```
**Response 200:** Same shape as `GET /api/config` response above.  
**Errors:** `400 INVALID_DATE_FORMAT`, `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 CONFIG_UPDATE_FAILED`

---

### §Notifications — Email Confirmation (Stretch)

#### `POST /api/notifications/email` *(v1 stretch goal)*
Send submission confirmation email to respondent. Called internally by the server after successful submission if email infrastructure is configured.

**Request:**
```json
{ "session_id": "uuid", "email": "respondent@example.com", "name": "Alex Johnson", "due_date": "2026-07-31T23:59:59Z" }
```
**Response 200:** `{ "sent": true }`  
**Errors:** `500 EMAIL_SEND_FAILED` (logged only; does not surface to respondent)

---
---

## Cross-Feature Error Catalog

> All error responses use the envelope: `{ "error": { "code": "ERROR_CODE", "message": "Human-readable description" } }`  
> Client-side errors (network, validation) are listed with `N/A` for HTTP status.

---

### Authentication & Authorization Errors

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `AUTH_REQUIRED` | 401 | F07 | No `Authorization` header or missing JWT on protected route | Re-authenticate |
| `TOKEN_EXPIRED` | 401 | F07 | JWT past its `expires_at` timestamp | Re-authenticate |
| `TOKEN_INVALID` | 401 | F07 | JWT signature invalid or payload tampered | Re-authenticate |
| `ACCESS_DENIED` | 403 | F06, F07, F08 | Authenticated user lacks required role (e.g., Respondent on dashboard route) | No |
| `SESSION_ACCESS_DENIED` | 403 | F07 | Authenticated user's email does not match the session being accessed | No |
| `NOT_A_SYSTEM_OWNER` | 403 | F07 | Email not found in `system_owner_emails` on System Owner login attempt | No |
| `SYSTEM_OWNER_CANNOT_RESPOND` | 403 | F01, F07 | System Owner email used in respondent identity flow | No |
| `SYSTEM_OWNER_CANNOT_SUBMIT` | 403 | F05, F07 | System Owner JWT used in submission endpoint | No |

---

### Session & Identity Errors

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `INVALID_EMAIL_FORMAT` | 400 | F01 | Email does not match RFC 5322 format | Fix input |
| `INVALID_NAME` | 400 | F01 | Name blank, too short (< 2 chars), or too long (> 200 chars) | Fix input |
| `INVALID_TEAM_TYPE` | 400 | F01, F03 | `team_type` not one of the four valid enum values | Fix input |
| `SESSION_NOT_FOUND` | 404 | F01, F04, F05 | `session_id` not found in `sessions` table | Re-authenticate |
| `SESSION_CREATE_FAILED` | 500 | F01 | Database error during session creation | Retry (auto) |
| `INVALID_CONFIRMATION_STATE` | N/A (client) | F09 | Confirmation screen loaded without a prior successful submit | Redirect |

---

### Assessment Workflow Errors

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `REQUIRED_QUESTION_UNANSWERED` | N/A (client) | F00, F02 | Required question in current section has no answer; blocks Next navigation | Fix input |
| `SECTION_LIST_EMPTY` | 500 | F00, F03 | No sections computed for the respondent's team type | Contact support |
| `SECTION_INDEX_OOB` | N/A (client) | F00 | Navigation target index is out of bounds; silently clamped | No |
| `SECTION_ROUTING_EMPTY` | 500 | F03 | No routing configuration found for team type | Contact support |
| `SECTION_LIMIT_EXCEEDED` | 500 | F03 | Routing config would result in > 8 sections | Contact support |
| `SECTION_NOT_FOUND` | 404 | Y1-api | Section ID not found in `sections` table | N/A |

---

### Question & Answer Errors

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `INVALID_ANSWER_PAYLOAD` | 400 | F02, F04 | `answer_payload` structure does not match expected schema for `question_type` | Fix input |
| `OTHER_TEXT_REQUIRED` | N/A (client) | F02 | "Other" option selected but `other_text` field is blank | Fix input |
| `INVALID_LIKERT_VALUE` | 400 | F02 | Likert value not an integer in [1, 5] | Fix input |
| `RANKING_INCOMPLETE` | N/A (client) | F02 | Not all ranking items have been assigned a position | Fix input |
| `RANKING_DUPLICATE_POSITION` | N/A (client) | F02 | Two ranking items share the same position | Fix input |
| `FREE_TEXT_TOO_LONG` | 400 | F02 | Free text answer exceeds character limit (500 short / 2000 long) | Fix input |
| `UNKNOWN_QUESTION_TYPE` | 400 | F02 | `answer_payload.type` does not match any known question type | Fix input |

---

### Save & Submission Errors

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `SAVE_FAILED` | 500 | F04 | Database error during auto-save; client retries 3× with backoff | Auto-retry |
| `NETWORK_TIMEOUT` | N/A (client) | F04 | Auto-save HTTP request timed out | Auto-retry |
| `ASSESSMENT_CLOSED` | 403 | F04, F05 | Due date has passed; saves and submissions rejected | No |
| `MANDATORY_QUESTIONS_INCOMPLETE` | 400 | F05 | Mandatory section questions not all answered; submission blocked | Fix input |
| `SUBMISSION_FAILED` | 500 | F05 | Database error during submission finalization | Retry |

---

### Configuration Errors

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `CONFIG_NOT_FOUND` | 500 | F08 | `assessment_config` singleton record missing (initialization error) | Contact support |
| `CONFIG_UPDATE_FAILED` | 500 | F08 | Database error saving config change | Retry |
| `INVALID_DATE_FORMAT` | 400 | F08 | `due_date` not a valid ISO 8601 datetime string | Fix input |

---

### Dashboard Errors

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `RESPONSE_NOT_FOUND` | 404 | F06 | Session ID not found when accessing individual response view | N/A |
| `ANALYTICS_ERROR` | 500 | F06 | Server-side aggregation error for analytics charts | Retry |
| `EXPORT_FAILED` | 500 | F06 | CSV generation or streaming error | Retry |
| `INVALID_DATE_RANGE` | 400 | F06 | Filter `submittedAfter` is after `submittedBefore` | Fix input |

---

### Notification Errors (Stretch)

| Code | HTTP Status | Feature | Description | Retry? |
|------|-------------|---------|-------------|--------|
| `EMAIL_SEND_FAILED` | 500 | F09 | Email infrastructure error; logged server-side only; no user-facing impact | Server log |

---
---

## External Integration Points

> AssessmentForm-Express v1 is designed to minimize external dependencies. All core functionality is self-contained. External integrations are limited to optional enhancements.

---

### INT-01: Email Notification (Stretch Goal — v1 Optional)

**Purpose:** Send submission confirmation emails to respondents upon successful submission (see F09).

**Trigger:** Successful `POST /api/submissions/:sessionId` response (status 200).

**Integration Type:** Outbound HTTP call to an internal enterprise email relay or SMTP service.

**Contract:**
- Server calls internal email service endpoint or SMTP relay with:
  - `to`: respondent email
  - `subject`: `"Assessment Submitted — Developer Platform Evaluation"`
  - `body`: Plain-text or HTML template including respondent name and due date.
- Email service returns success/failure. Failure is logged only; it does not block the submission flow or surface an error to the respondent.

**Configuration:**
- Email relay hostname/URL: environment variable `EMAIL_RELAY_URL`.
- From address: environment variable `EMAIL_FROM_ADDRESS`.
- Feature is disabled if `EMAIL_RELAY_URL` is not set (graceful no-op).

**Error Handling:** `EMAIL_SEND_FAILED` logged server-side; no retry; no respondent-facing error (see Y2-errors.md).

**Out of scope for v1:** Two-way email (reply tracking), delivery receipts, template customization via dashboard.

---

### INT-02: Enterprise Deployment Infrastructure

**Purpose:** Host the SPA and backend API within the enterprise's internal network.

**Integration Type:** Deployment — not a runtime API dependency.

**Details:**
- The application is deployed as a containerized Node.js/Next.js service.
- No external CDN or public cloud endpoints are required.
- Database (PostgreSQL) is hosted within the enterprise network.
- All traffic is internal (no public internet exposure required for v1).

**Configuration Dependencies:**
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Signing secret for JWT tokens.
- `EMAIL_RELAY_URL` (optional): For stretch-goal email notifications.
- `EMAIL_FROM_ADDRESS` (optional): Sender address for confirmation emails.

---

### INT-03: No SSO / OAuth in v1

**Purpose:** Explicitly document the absence of SSO integration as a v1 constraint.

**Decision:** Email + name identity is used in lieu of enterprise SSO (Azure AD, Okta, etc.). This reduces deployment complexity and SSO configuration dependencies.

**Future consideration:** If SSO is required in a future version, the `sessions` and `respondents` tables can be extended with an `sso_provider` and `external_user_id` column. The `POST /api/sessions` endpoint would be replaced or augmented with an OIDC callback endpoint. This is out of scope for v1.

---

### INT-04: No AI/ML Integration in v1

**Purpose:** Explicitly document the absence of AI/ML analysis as a v1 constraint.

**Decision:** All analytics are computed via standard SQL aggregations (GROUP BY, AVG, COUNT). No external AI/ML APIs, LLM calls, or model inference pipelines are used in v1.

**Future consideration:** Response sentiment analysis or automated theme detection could be added as a post-submission enrichment step. The `responses` table's `JSONB answer_payload` column is structured to support future analytical overlays without schema changes.

---
