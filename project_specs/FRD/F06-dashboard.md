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
