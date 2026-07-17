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
