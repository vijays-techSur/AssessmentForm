// ─── Session types (from plan 02 sessionService.ts) ──────────────────────────

export type TeamType =
  | 'program_project'
  | 'platform_engineering'
  | 'infrastructure_cloud'
  | 'data_api_governance';

export type SubmissionStatus = 'draft' | 'submitted';

export interface SavedResponse {
  question_id: string;
  answer_payload: AnswerPayload;
}

export interface SessionResponse {
  session_id: string;
  token: string;
  role: 'respondent' | 'system_owner';
  is_returning: boolean;
  submission_status: SubmissionStatus;
  current_section_index: number;
  section_ids_ordered: string[];
  saved_responses: SavedResponse[];
  is_closed: boolean;
  due_date: string; // ISO 8601
}

// ─── Section/Question types (from plan 03) ───────────────────────────────────

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
  question_type:
    | 'single_choice'
    | 'multi_choice'
    | 'likert'
    | 'ranking'
    | 'free_text_short'
    | 'free_text_long';
  is_required: boolean;
  has_other: boolean;
  display_order: number;
  help_text: string | null;
  options: QuestionOption[];
}

export interface SectionWithQuestions {
  section_id: string;
  title: string;
  questions: Question[];
}

// ─── Answer payload types (mirror plan 03 answerPayloadSchemas) ──────────────

export interface SingleChoicePayload { type: 'single_choice'; value: string; other_text?: string }
export interface MultiChoicePayload  { type: 'multi_choice'; values: string[]; other_text?: string }
export interface LikertPayload       { type: 'likert'; value: 1 | 2 | 3 | 4 | 5 }
export interface RankingPayload      { type: 'ranking'; order: string[] }
export interface FreeTextShortPayload { type: 'free_text_short'; value: string }
export interface FreeTextLongPayload  { type: 'free_text_long'; value: string }

export type AnswerPayload =
  | SingleChoicePayload
  | MultiChoicePayload
  | LikertPayload
  | RankingPayload
  | FreeTextShortPayload
  | FreeTextLongPayload;

export interface ResponseItem {
  question_id: string;
  answer_payload: AnswerPayload;
}

export interface PutResponsesBody {
  section_id: string;
  current_section_index: number;
  responses: ResponseItem[];
}
