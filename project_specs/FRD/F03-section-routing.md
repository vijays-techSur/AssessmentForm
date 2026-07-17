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
