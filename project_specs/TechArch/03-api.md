---

## 4. API Design

### 4.1 API Conventions

- **Base URL:** `/api`
- **Auth:** `Authorization: Bearer {JWT}` required on all endpoints except `POST /api/sessions` and `POST /api/auth/login`.
- **Content-Type:** `application/json` for all requests and responses (except CSV export: `text/csv`).
- **Error envelope:**
  ```json
  { "error": { "code": "SCREAMING_SNAKE_CASE", "message": "Human-readable description" } }
  ```
- **Timestamps:** ISO 8601 / UTC (e.g. `"2026-07-17T14:34:22Z"`).
- **Pagination:** `page` (1-based), `pageSize` (default 25, max 100), `total` in response.

---

### 4.2 TypeScript Interfaces

```typescript
// ─── Shared Enums ─────────────────────────────────────────────────────────────

export type TeamType =
  | 'program_project'
  | 'platform_engineering'
  | 'infrastructure_cloud'
  | 'data_api_governance';

export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'likert'
  | 'ranking'
  | 'free_text_short'
  | 'free_text_long';

export type SubmissionStatus = 'draft' | 'submitted';
export type UserRole = 'respondent' | 'system_owner';
export type AssessmentStatus = 'upcoming' | 'active' | 'closed';

// ─── Answer Payloads ──────────────────────────────────────────────────────────

export interface SingleChoicePayload {
  type: 'single_choice';
  value: string;           // option UUID or 'other'
  other_text?: string;     // required when value === 'other'
}

export interface MultiChoicePayload {
  type: 'multi_choice';
  values: string[];        // array of option UUIDs, may include 'other'
  other_text?: string;     // required when 'other' is in values
}

export interface LikertPayload {
  type: 'likert';
  value: 1 | 2 | 3 | 4 | 5;
}

export interface RankingPayload {
  type: 'ranking';
  order: string[];         // option UUIDs in ranked order; index 0 = rank 1
}

export interface FreeTextShortPayload {
  type: 'free_text_short';
  value: string;           // max 500 chars
}

export interface FreeTextLongPayload {
  type: 'free_text_long';
  value: string;           // max 2000 chars
}

export type AnswerPayload =
  | SingleChoicePayload
  | MultiChoicePayload
  | LikertPayload
  | RankingPayload
  | FreeTextShortPayload
  | FreeTextLongPayload;

// ─── Session & Respondent ─────────────────────────────────────────────────────

export interface SessionResponse {
  session_id: string;
  token: string;
  role: UserRole;
  is_returning: boolean;
  submission_status: SubmissionStatus;
  current_section_index: number;
  section_ids_ordered: string[];
  saved_responses: SavedResponse[];
  is_closed: boolean;
  due_date: string;        // ISO 8601
}

export interface SavedResponse {
  question_id: string;
  answer_payload: AnswerPayload;
}

// ─── Sections & Questions ─────────────────────────────────────────────────────

export interface SectionSummary {
  section_id: string;
  title: string;
  description: string | null;
  is_mandatory: boolean;
  display_order: number;
  question_count: number;
}

export interface QuestionOption {
  option_id: string;
  option_text: string;
  display_order: number;
  is_other: boolean;
}

export interface Question {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  has_other: boolean;
  display_order: number;
  help_text: string | null;
  options: QuestionOption[];  // empty for likert / free_text types
}

export interface SectionWithQuestions {
  section_id: string;
  title: string;
  questions: Question[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface ResponseListItem {
  session_id: string;
  respondent_name: string;
  respondent_email: string;
  team_type: TeamType;
  submission_status: SubmissionStatus;
  submitted_at: string | null;
  last_modified_at: string;
}

export interface PaginatedResponseList {
  total: number;
  page: number;
  pageSize: number;
  data: ResponseListItem[];
}

export interface ResponseDetail {
  session_id: string;
  respondent_name: string;
  respondent_email: string;
  team_type: TeamType;
  submission_status: SubmissionStatus;
  submitted_at: string | null;
  sections: Array<{
    section_id: string;
    title: string;
    answers: Array<{
      question_id: string;
      question_text: string;
      question_type: QuestionType;
      answer_payload: AnswerPayload | null;
    }>;
  }>;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  response_counts_by_team_type: Record<TeamType, number>;
  likert_distributions: Array<{
    question_id: string;
    question_text: string;
    distribution: { '1': number; '2': number; '3': number; '4': number; '5': number };
  }>;
  ranking_top_items: Array<{
    question_id: string;
    question_text: string;
    ranked_items: Array<{ option_text: string; average_rank: number }>;
  }>;
  choice_breakdowns: Array<{
    question_id: string;
    question_text: string;
    counts: Array<{ option_text: string; count: number; percentage: number }>;
  }>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface AssessmentConfig {
  due_date: string;
  launch_date: string;
  status: AssessmentStatus;
  last_modified_at: string;
  last_modified_by: string | null;
}
```

---

### 4.3 Endpoint Reference

#### `POST /api/auth/login` — Dashboard Login

| Field | Value |
|-------|-------|
| Auth | None |
| Role | Any authenticated user (dashboard JWT issued to any valid email) |

**Request body:**
```json
{ "email": "user@example.com", "name": "Jane Smith" }
```
**Response 200:** `{ token, role: "system_owner", email, expires_at }`  
**Behavior:** Any valid email is accepted. No allowlist check is performed.  
**Errors:** `400 INVALID_EMAIL_FORMAT`

---

#### `POST /api/sessions` — Create or Resume Session

| Field | Value |
|-------|-------|
| Auth | None |
| Role | Respondent |

**Request body:**
```json
{ "email": "respondent@example.com", "name": "Alex Johnson", "team_type": "platform_engineering" }
```
**Response 200:** `SessionResponse`  
**Behavior:** Upsert — returns existing session if email matches; creates new session otherwise.  
**Errors:** `400 INVALID_EMAIL_FORMAT`, `400 INVALID_NAME`, `400 INVALID_TEAM_TYPE`, `403 SYSTEM_OWNER_CANNOT_RESPOND`, `500 SESSION_CREATE_FAILED`

---

#### `GET /api/sessions/:sessionId` — Load Session

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent (own session) |

**Response 200:** `SessionResponse`  
**Errors:** `401 AUTH_REQUIRED`, `403 SESSION_ACCESS_DENIED`, `404 SESSION_NOT_FOUND`

---

#### `GET /api/sections?teamType={teamType}` — Section List

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent |

**Query params:** `teamType` (required)  
**Response 200:** `{ sections: SectionSummary[] }`  
**Errors:** `400 INVALID_TEAM_TYPE`, `500 SECTION_ROUTING_EMPTY`, `500 SECTION_LIMIT_EXCEEDED`

---

#### `GET /api/sections/:sectionId/questions` — Questions for Section

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Any authenticated |

**Response 200:** `SectionWithQuestions`  
**Errors:** `401 AUTH_REQUIRED`, `404 SECTION_NOT_FOUND`

---

#### `PUT /api/responses/:sessionId` — Auto-Save Responses

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent (own session) |

**Request body:**
```json
{
  "section_id": "platform_needs",
  "current_section_index": 3,
  "responses": [
    { "question_id": "uuid", "answer_payload": { "type": "likert", "value": 4 } }
  ]
}
```
**Response 200:** `{ saved: true, last_saved_at: "ISO8601" }`  
**Behavior:** Upsert on `(session_id, question_id)`. Empty `responses` array is valid.  
**Retry:** Client retries 3× on failure with exponential backoff (1s, 2s, 4s).  
**Errors:** `400 INVALID_ANSWER_PAYLOAD`, `401 AUTH_REQUIRED`, `403 ASSESSMENT_CLOSED`, `403 SESSION_ACCESS_DENIED`, `404 SESSION_NOT_FOUND`, `500 SAVE_FAILED`

---

#### `POST /api/submissions/:sessionId` — Finalize Submission

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Respondent (own session) |

**Request body:** `{}` (empty; data already saved via auto-save)  
**Response 200:**
```json
{ "submitted": true, "submitted_at": "ISO8601", "due_date": "ISO8601", "edit_window_open": true }
```
**Behavior:** Transitions `draft → submitted`. Re-submitting within edit window is a no-op (updates `last_modified_at`).  
**Errors:** `400 MANDATORY_QUESTIONS_INCOMPLETE`, `401 AUTH_REQUIRED`, `403 ASSESSMENT_CLOSED`, `403 SESSION_ACCESS_DENIED`, `403 SYSTEM_OWNER_CANNOT_SUBMIT`, `404 SESSION_NOT_FOUND`, `500 SUBMISSION_FAILED`

---

#### `GET /api/dashboard/responses` — Paginated Response List

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `pageSize` | integer | 25 | Max 100 |
| `sortBy` | string | `submitted_at` | Sort column |
| `sortDir` | `asc`\|`desc` | `desc` | Sort direction |
| `teamType` | string (multi) | — | Filter by team type |
| `status` | `all`\|`submitted`\|`draft` | `all` | Completion status filter |
| `submittedAfter` | ISO date | — | Inclusive date filter |
| `submittedBefore` | ISO date | — | Inclusive date filter |
| `search` | string | — | Partial name or email match |

**Response 200:** `PaginatedResponseList`  
**Errors:** `400 INVALID_DATE_RANGE`, `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`

---

#### `GET /api/dashboard/responses/:sessionId` — Individual Response

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Response 200:** `ResponseDetail`  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `404 RESPONSE_NOT_FOUND`

---

#### `GET /api/dashboard/analytics` — Analytics Data

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Query params:** `teamType` (optional, multi-select)  
**Response 200:** `AnalyticsData`  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 ANALYTICS_ERROR`

---

#### `GET /api/dashboard/export/csv` — CSV Export

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |
| Response type | `text/csv` |

**Query params:** Same as `GET /api/dashboard/responses` (filters applied to export).  
**Response headers:** `Content-Disposition: attachment; filename="assessment-responses-YYYY-MM-DD.csv"`  
**Columns:** `respondent_name`, `respondent_email`, `team_type`, `submission_status`, `submitted_at`, `last_modified_at`, then one column per question (by question ID / title).  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 EXPORT_FAILED`

---

#### `GET /api/config` — Assessment Configuration

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Response 200:** `AssessmentConfig`  
**Errors:** `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 CONFIG_NOT_FOUND`

---

#### `PATCH /api/config` — Update Due Date

| Field | Value |
|-------|-------|
| Auth | Bearer JWT |
| Role | Dashboard JWT required (any authenticated user) |

**Request body:** `{ "due_date": "2026-08-07T23:59:59Z" }`  
**Response 200:** `AssessmentConfig` (updated)  
**Side effect:** Writes a row to `config_audit_log`.  
**Errors:** `400 INVALID_DATE_FORMAT`, `401 AUTH_REQUIRED`, `403 ACCESS_DENIED`, `500 CONFIG_UPDATE_FAILED`

---

#### `POST /api/notifications/email` — Submission Confirmation Email *(v1 stretch)*

| Field | Value |
|-------|-------|
| Auth | Internal server-to-server only |
| Role | Internal |

**Request body:** `{ session_id, email, name, due_date }`  
**Response 200:** `{ sent: true }`  
**Behavior:** Fire-and-forget. Failure logged; never surfaces to respondent. No-op if `EMAIL_RELAY_URL` env var is not set.  
**Errors:** `500 EMAIL_SEND_FAILED` (logged only)

---
