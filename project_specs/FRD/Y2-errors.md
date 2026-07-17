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
