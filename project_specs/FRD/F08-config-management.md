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
