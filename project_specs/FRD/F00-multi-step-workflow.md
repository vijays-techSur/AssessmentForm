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
