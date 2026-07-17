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
**Errors:** `400 INVALID_DATE_RANGE`, `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`

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
