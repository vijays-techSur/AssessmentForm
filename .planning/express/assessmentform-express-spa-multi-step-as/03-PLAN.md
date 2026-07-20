---
phase: 02b-sections-questions
plan: 03
type: execute
wave: 3
depends_on: [1]
files_modified:
  - src/lib/sections/sectionRoutingService.ts
  - src/lib/sections/questionService.ts
  - src/lib/validation/answerPayloadSchemas.ts
  - src/app/api/sections/route.ts
  - src/app/api/sections/[sectionId]/questions/route.ts
autonomous: true

features:
  implements: ["F2", "F3"]
  depends_on: ["F1", "F3"]
  enables: ["F4", "F5", "F6", "F9"]

must_haves:
  truths:
    - "GET /api/sections?teamType=program_project returns 5 sections in the exact order: general_dp_alignment → current_status → platform_needs → tool_evaluation → feedback_adaptability"
    - "GET /api/sections?teamType=platform_engineering returns 7 sections in the correct order"
    - "GET /api/sections?teamType=infrastructure_cloud returns 6 sections in the correct order"
    - "GET /api/sections?teamType=data_api_governance returns 6 sections in the correct order"
    - "Mandatory sections (general_dp_alignment, current_status, feedback_adaptability) are always present and feedback_adaptability is always last"
    - "GET /api/sections returns 400 INVALID_TEAM_TYPE for unknown teamType values"
    - "GET /api/sections returns 500 SECTION_LIMIT_EXCEEDED if routing config returns > 8 sections"
    - "GET /api/sections/:sectionId/questions returns section id, title, and ordered questions with options"
    - "GET /api/sections/:sectionId/questions returns 404 SECTION_NOT_FOUND for unknown sectionId"
    - "All 6 Zod answer payload schemas validate correct payloads and reject invalid ones with typed errors"
    - "single_choice Zod schema: requires type='single_choice', value (string); when value='other', other_text is required"
    - "multi_choice Zod schema: requires type='multi_choice', values (string[]), min 1 element; when 'other' in values, other_text is required"
    - "likert Zod schema: requires type='likert', value as integer enum [1,2,3,4,5]"
    - "ranking Zod schema: requires type='ranking', order as non-empty string[]"
    - "free_text_short Zod schema: requires type='free_text_short', value string max 500 chars"
    - "free_text_long Zod schema: requires type='free_text_long', value string max 2000 chars"
  artifacts:
    - path: "src/lib/sections/sectionRoutingService.ts"
      provides: "getSectionsForTeamType — queries section_routing, enforces mandatory sections, returns ordered SectionSummary[]"
      exports: ["getSectionsForTeamType"]
    - path: "src/lib/sections/questionService.ts"
      provides: "getQuestionsForSection — queries questions + question_options for a section, returns SectionWithQuestions"
      exports: ["getQuestionsForSection"]
    - path: "src/lib/validation/answerPayloadSchemas.ts"
      provides: "Zod schemas for all 6 answer payload types and union AnswerPayloadSchema"
      exports:
        - "SingleChoicePayloadSchema"
        - "MultiChoicePayloadSchema"
        - "LikertPayloadSchema"
        - "RankingPayloadSchema"
        - "FreeTextShortPayloadSchema"
        - "FreeTextLongPayloadSchema"
        - "AnswerPayloadSchema"
    - path: "src/app/api/sections/route.ts"
      provides: "GET /api/sections?teamType endpoint"
      exports: ["GET"]
    - path: "src/app/api/sections/[sectionId]/questions/route.ts"
      provides: "GET /api/sections/:sectionId/questions endpoint"
      exports: ["GET"]
  key_links:
    - from: "src/app/api/sections/route.ts"
      to: "src/lib/sections/sectionRoutingService.ts"
      via: "getSectionsForTeamType(teamType)"
      pattern: "getSectionsForTeamType"
    - from: "src/app/api/sections/[sectionId]/questions/route.ts"
      to: "src/lib/sections/questionService.ts"
      via: "getQuestionsForSection(sectionId)"
      pattern: "getQuestionsForSection"
    - from: "src/lib/sections/sectionRoutingService.ts"
      to: "drizzle/schema.ts"
      via: "db.select on sectionRouting + sections tables"
      pattern: "sectionRouting|sections"
    - from: "src/lib/sections/questionService.ts"
      to: "drizzle/schema.ts"
      via: "db.select on questions + questionOptions tables"
      pattern: "questions|questionOptions"
    - from: "src/lib/validation/answerPayloadSchemas.ts"
      to: "src/app/api/responses/[sessionId]/route.ts"
      via: "AnswerPayloadSchema.parse() on PUT body (wave 2c)"
      pattern: "AnswerPayloadSchema"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "drizzle/schema.ts"
      exports: ["sections", "sectionRouting", "questions", "questionOptions"]
      verify: "grep -n 'export const sections' drizzle/schema.ts && grep -n 'export const sectionRouting' drizzle/schema.ts && grep -n 'export const questions' drizzle/schema.ts && grep -n 'export const questionOptions' drizzle/schema.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/lib/sections/sectionRoutingService.ts"
      exports: ["getSectionsForTeamType"]
      shape: |
        export async function getSectionsForTeamType(teamType: TeamType): Promise<SectionSummary[]>
        // Returns ordered SectionSummary[] for the given team type.
        // Enforces mandatory sections always present; feedback_adaptability always last.
        // Throws SECTION_ROUTING_EMPTY if no sections found; SECTION_LIMIT_EXCEEDED if > 8 sections.
        // SectionSummary: { section_id, title, description, is_mandatory, display_order, question_count }
      verify: "grep -n 'export async function getSectionsForTeamType' src/lib/sections/sectionRoutingService.ts && echo CONTRACT_OK"
    - artifact: "src/lib/sections/questionService.ts"
      exports: ["getQuestionsForSection"]
      shape: |
        export async function getQuestionsForSection(sectionId: string): Promise<SectionWithQuestions>
        // Returns { section_id, title, questions: Question[] } where each Question includes options: QuestionOption[]
        // Throws SECTION_NOT_FOUND (404) if sectionId does not exist in sections table.
        // Question: { question_id, question_text, question_type, is_required, has_other, display_order, help_text, options }
        // QuestionOption: { option_id, option_text, display_order, is_other }
      verify: "grep -n 'export async function getQuestionsForSection' src/lib/sections/questionService.ts && echo CONTRACT_OK"
    - artifact: "src/lib/validation/answerPayloadSchemas.ts"
      exports:
        - "SingleChoicePayloadSchema"
        - "MultiChoicePayloadSchema"
        - "LikertPayloadSchema"
        - "RankingPayloadSchema"
        - "FreeTextShortPayloadSchema"
        - "FreeTextLongPayloadSchema"
        - "AnswerPayloadSchema"
      shape: |
        // Exact payload shapes from TechArch §3.3 and FRD F02:
        // SingleChoicePayloadSchema: z.discriminatedUnion on value field or superRefine — value: string, other_text?: string (required when value === 'other')
        // MultiChoicePayloadSchema: values: z.string().array().min(1), other_text?: string (required when values includes 'other')
        // LikertPayloadSchema: value: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
        // RankingPayloadSchema: order: z.string().array().min(1)
        // FreeTextShortPayloadSchema: value: z.string().max(500)
        // FreeTextLongPayloadSchema: value: z.string().max(2000)
        // AnswerPayloadSchema: z.discriminatedUnion('type', [...all 6 schemas...])
      verify: "grep -n 'export const AnswerPayloadSchema' src/lib/validation/answerPayloadSchemas.ts && grep -n 'SingleChoicePayloadSchema' src/lib/validation/answerPayloadSchemas.ts && grep -n 'LikertPayloadSchema' src/lib/validation/answerPayloadSchemas.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/sections/route.ts"
      exports: ["GET"]
      shape: |
        // GET /api/sections?teamType={teamType}
        // Auth: Bearer JWT (jwtMiddleware applied)
        // Response 200: { sections: SectionSummary[] }
        // Response 400: { error: { code: "INVALID_TEAM_TYPE", message: "..." } }
        // Response 500: { error: { code: "SECTION_ROUTING_EMPTY" | "SECTION_LIMIT_EXCEEDED", message: "..." } }
      verify: "grep -n 'export async function GET' src/app/api/sections/route.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/sections/[sectionId]/questions/route.ts"
      exports: ["GET"]
      shape: |
        // GET /api/sections/:sectionId/questions
        // Auth: Bearer JWT (jwtMiddleware applied)
        // Response 200: SectionWithQuestions { section_id, title, questions: Question[] }
        // Response 404: { error: { code: "SECTION_NOT_FOUND", message: "..." } }
      verify: "grep -n 'export async function GET' src/app/api/sections/\\[sectionId\\]/questions/route.ts && echo CONTRACT_OK"
---

<objective>
Implement the section routing API (GET /api/sections?teamType), the questions API (GET /api/sections/:sectionId/questions), the sectionRoutingService (mandatory section enforcement + SECTION_LIMIT_EXCEEDED guard), the questionService (questions + options fetch), and all 6 Zod answer payload validation schemas consumed by wave 2c's response auto-save endpoint.

Purpose: Provides the data layer that the respondent SPA (wave 3a) needs to render section navigation and question widgets, and the validation schemas that wave 2c's PUT /api/responses/:sessionId uses to validate answer payloads before persistence.
Output: sectionRoutingService.ts, questionService.ts, answerPayloadSchemas.ts, GET /api/sections route, GET /api/sections/:sectionId/questions route.
</objective>

<feature_dependencies>
Implements: F2: Question Types Engine (GET /api/sections/:sectionId/questions, all 6 Zod answer payload schemas), F3: Team-Type-Specific Section Routing (GET /api/sections?teamType, sectionRoutingService with mandatory section enforcement and SECTION_LIMIT_EXCEEDED guard)
Depends on: F1: Respondent Identity & Session Management (jwtMiddleware from wave 2a plan 02 must authenticate requests to sections/questions APIs)
Enables: F4: Auto-Save & Progress Persistence (wave 2c uses AnswerPayloadSchema for PUT /api/responses validation), F5: Duplicate Submission Prevention (wave 2c submissions check section list), F6: System Owner Dashboard (dashboard needs section/question metadata for analytics)
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@project_specs/TechArch-AssessmentForm.md
@project_specs/FRD-AssessmentForm.md
@.planning/express/assessmentform-express-spa-multi-step-as/01-PLAN.md
@.planning/express/assessmentform-express-spa-multi-step-as/02-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement sectionRoutingService, questionService, and all 6 Zod answer payload schemas</name>
  <files>
    src/lib/sections/sectionRoutingService.ts
    src/lib/sections/questionService.ts
    src/lib/validation/answerPayloadSchemas.ts
  </files>
  <action>
Create three service/validation modules. All DB queries use parameterized Drizzle ORM — no raw string concatenation.

---

**`src/lib/sections/sectionRoutingService.ts`**

Implements FRD F03 §Process: queries `section_routing` joined with `sections` for the given `team_type`, enforces mandatory section inclusion, forces `feedback_adaptability` last, and applies SECTION_LIMIT_EXCEEDED guard.

```typescript
import { db } from '@/lib/db';
import { sections, sectionRouting } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// FRD F03: The three mandatory sections always present for all team types.
// TechArch §4.3: section order — general_dp_alignment first, feedback_adaptability last.
const MANDATORY_SECTION_IDS = ['general_dp_alignment', 'current_status', 'feedback_adaptability'] as const;
const FEEDBACK_SECTION_ID = 'feedback_adaptability';

// FRD F03 §Validation: Maximum 8 sections hard cap.
const SECTION_LIMIT = 8;

export type TeamType =
  | 'program_project'
  | 'platform_engineering'
  | 'infrastructure_cloud'
  | 'data_api_governance';

// TechArch §4.2 TypeScript Interface: SectionSummary
export interface SectionSummary {
  section_id: string;
  title: string;
  description: string | null;
  is_mandatory: boolean;
  display_order: number;
  question_count: number;
}

const VALID_TEAM_TYPES: TeamType[] = [
  'program_project',
  'platform_engineering',
  'infrastructure_cloud',
  'data_api_governance',
];

export function isValidTeamType(value: string): value is TeamType {
  return VALID_TEAM_TYPES.includes(value as TeamType);
}

/**
 * FRD F03 §Process: Compute the effective ordered section list for a given team type.
 *
 * Steps:
 * 1. Query section_routing JOIN sections for the given team_type (where is_included = true).
 * 2. Auto-insert any missing mandatory sections (log warning: MANDATORY_SECTION_AUTO_INSERTED).
 * 3. Enforce feedback_adaptability is always last.
 * 4. Reject if total sections > 8 (SECTION_LIMIT_EXCEEDED).
 * 5. Fetch question_count per section via subquery count on questions table.
 */
export async function getSectionsForTeamType(teamType: TeamType): Promise<SectionSummary[]> {
  // Query section_routing rows for this team type that are included
  const routingRows = await db
    .select({
      section_id: sectionRouting.section_id,
      display_order: sectionRouting.display_order,
      title: sections.title,
      description: sections.description,
      is_mandatory: sections.is_mandatory,
    })
    .from(sectionRouting)
    .innerJoin(sections, eq(sectionRouting.section_id, sections.id))
    .where(
      and(
        eq(sectionRouting.team_type, teamType),
        eq(sectionRouting.is_included, true)
      )
    )
    .orderBy(sectionRouting.display_order);

  if (routingRows.length === 0) {
    throw Object.assign(new Error('No sections configured for this team type. Please contact support.'), {
      code: 'SECTION_ROUTING_EMPTY',
      statusCode: 500,
    });
  }

  // Build a set of section IDs in the routing result
  const routedIds = new Set(routingRows.map((r) => r.section_id));

  // FRD F03 §Validation: Auto-insert missing mandatory sections
  const autoInserted: string[] = [];
  for (const mandatoryId of MANDATORY_SECTION_IDS) {
    if (!routedIds.has(mandatoryId)) {
      // Log server warning (FRD: MANDATORY_SECTION_AUTO_INSERTED — server log only)
      console.warn(`[sectionRoutingService] MANDATORY_SECTION_AUTO_INSERTED: ${mandatoryId} was missing from routing config for team_type=${teamType}. Auto-inserting.`);
      autoInserted.push(mandatoryId);
    }
  }

  // Fetch section metadata for any auto-inserted mandatory sections
  let allRows = [...routingRows];
  if (autoInserted.length > 0) {
    const missingRows = await db
      .select({
        section_id: sections.id,
        display_order: sections.display_order,
        title: sections.title,
        description: sections.description,
        is_mandatory: sections.is_mandatory,
      })
      .from(sections)
      .where(
        // Use sql`id IN (...)` with parameterized values via drizzle's inArray
        // We use a loop for simplicity since auto-insert is rare (at most 3 rows)
      );
    // Append with placeholder display_order (will be re-ordered below)
    for (const row of missingRows) {
      if (autoInserted.includes(row.section_id)) {
        allRows.push({ ...row, display_order: -1 });
      }
    }
  }

  // Sort: all non-feedback sections by display_order; feedback_adaptability pinned last
  const nonFeedback = allRows
    .filter((r) => r.section_id !== FEEDBACK_SECTION_ID)
    .sort((a, b) => a.display_order - b.display_order);
  const feedbackRow = allRows.find((r) => r.section_id === FEEDBACK_SECTION_ID);

  const ordered = feedbackRow ? [...nonFeedback, feedbackRow] : nonFeedback;

  // FRD F03 §Validation: SECTION_LIMIT_EXCEEDED guard
  if (ordered.length > SECTION_LIMIT) {
    throw Object.assign(new Error('Assessment configuration error: too many sections. Please contact support.'), {
      code: 'SECTION_LIMIT_EXCEEDED',
      statusCode: 500,
    });
  }

  // Fetch question counts per section using a raw count query for efficiency
  const sectionIds = ordered.map((r) => r.section_id);
  const { questions } = await import('../../../drizzle/schema');
  const { sql, inArray } = await import('drizzle-orm');

  const countRows = await db
    .select({
      section_id: questions.section_id,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(questions)
    .where(inArray(questions.section_id, sectionIds))
    .groupBy(questions.section_id);

  const countMap = new Map(countRows.map((r) => [r.section_id, r.count]));

  return ordered.map((r, idx) => ({
    section_id: r.section_id,
    title: r.title,
    description: r.description ?? null,
    is_mandatory: r.is_mandatory,
    display_order: idx + 1,  // Recompute 1-based display_order after reordering
    question_count: countMap.get(r.section_id) ?? 0,
  }));
}
```

**Note on auto-insert:** The `inArray` approach above correctly handles fetching missing mandatory sections. Simplify the auto-insert block: after the initial routing query, fetch all mandatory section metadata in one query using `inArray(sections.id, autoInserted)`, then merge and re-sort as shown.

---

**`src/lib/sections/questionService.ts`**

Implements FRD F02 / TechArch §4.3 `GET /api/sections/:sectionId/questions`. Fetches questions ordered by `display_order`, each with its `question_options` array (also ordered by `display_order`). Throws `SECTION_NOT_FOUND` for unknown section IDs.

```typescript
import { db } from '@/lib/db';
import { sections, questions, questionOptions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// TechArch §4.2 TypeScript Interfaces
export interface QuestionOption {
  option_id: string;
  option_text: string;
  display_order: number;
  is_other: boolean;
}

export interface Question {
  question_id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  has_other: boolean;
  display_order: number;
  help_text: string | null;
  options: QuestionOption[];  // Empty array for likert / free_text types
}

export interface SectionWithQuestions {
  section_id: string;
  title: string;
  questions: Question[];
}

/**
 * FRD F02: Fetch all questions for a section, each with their options.
 * Returns SectionWithQuestions per TechArch §4.2.
 * Throws SECTION_NOT_FOUND (404) if sectionId does not exist.
 */
export async function getQuestionsForSection(sectionId: string): Promise<SectionWithQuestions> {
  // Verify section exists
  const [section] = await db
    .select({ id: sections.id, title: sections.title })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);

  if (!section) {
    throw Object.assign(new Error('Section not found.'), {
      code: 'SECTION_NOT_FOUND',
      statusCode: 404,
    });
  }

  // Fetch questions for this section ordered by display_order
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.section_id, sectionId))
    .orderBy(questions.display_order);

  if (questionRows.length === 0) {
    return { section_id: section.id, title: section.title, questions: [] };
  }

  // Fetch all options for these questions in one query
  const questionIds = questionRows.map((q) => q.id);
  const { inArray } = await import('drizzle-orm');
  const optionRows = await db
    .select()
    .from(questionOptions)
    .where(inArray(questionOptions.question_id, questionIds))
    .orderBy(questionOptions.display_order);

  // Group options by question_id
  const optionsByQuestion = new Map<string, QuestionOption[]>();
  for (const opt of optionRows) {
    if (!optionsByQuestion.has(opt.question_id)) {
      optionsByQuestion.set(opt.question_id, []);
    }
    optionsByQuestion.get(opt.question_id)!.push({
      option_id: opt.id,
      option_text: opt.option_text,
      display_order: opt.display_order,
      is_other: opt.is_other,
    });
  }

  const questionList: Question[] = questionRows.map((q) => ({
    question_id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    is_required: q.is_required,
    has_other: q.has_other,
    display_order: q.display_order,
    help_text: q.help_text ?? null,
    options: optionsByQuestion.get(q.id) ?? [],
  }));

  return {
    section_id: section.id,
    title: section.title,
    questions: questionList,
  };
}
```

---

**`src/lib/validation/answerPayloadSchemas.ts`**

Implements all 6 Zod schemas per TechArch §3.3 exact payload shapes and FRD F02 §Validation rules. These schemas are imported by wave 2c's `PUT /api/responses/:sessionId` to validate `answer_payload` before persistence.

```typescript
import { z } from 'zod';

// ─── FRD F02 / TechArch §3.3: Answer Payload Shapes ──────────────────────────
// The `type` field in each payload MUST match the parent question's question_type.
// These schemas are used for server-side validation in PUT /api/responses/:sessionId (wave 2c).

/**
 * single_choice payload:
 *   { "type": "single_choice", "value": "option-uuid" }
 *   { "type": "single_choice", "value": "other", "other_text": "My custom answer" }
 *
 * FRD F02 §Validation: If value === "other", other_text is required (1–500 chars).
 */
export const SingleChoicePayloadSchema = z
  .object({
    type: z.literal('single_choice'),
    value: z.string().min(1),
    other_text: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.value === 'other' && (!data.other_text || data.other_text.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify your 'Other' answer.",
        path: ['other_text'],
      });
    }
  });

/**
 * multi_choice payload:
 *   { "type": "multi_choice", "values": ["option-uuid-1", "option-uuid-2"] }
 *   { "type": "multi_choice", "values": ["option-uuid-1", "other"], "other_text": "Custom value" }
 *
 * FRD F02 §Validation: At least one value required; if "other" in values, other_text required (1–500 chars).
 */
export const MultiChoicePayloadSchema = z
  .object({
    type: z.literal('multi_choice'),
    values: z.string().array().min(1, 'At least one option must be selected.'),
    other_text: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.values.includes('other') && (!data.other_text || data.other_text.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify your 'Other' answer.",
        path: ['other_text'],
      });
    }
  });

/**
 * likert payload:
 *   { "type": "likert", "value": 4 }
 *
 * FRD F02 §Validation: value must be integer in [1, 5].
 * FRD F02 §Error States: INVALID_LIKERT_VALUE if outside [1,5].
 */
export const LikertPayloadSchema = z.object({
  type: z.literal('likert'),
  value: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ], {
    errorMap: () => ({ message: 'Please select a value between 1 and 5.' }),
  }),
});

/**
 * ranking payload:
 *   { "type": "ranking", "order": ["option-uuid-3", "option-uuid-1", "option-uuid-2"] }
 *
 * FRD F02 §Process Ranking: order is an array of option UUIDs; index 0 = rank 1 (highest priority).
 * FRD F02 §Validation: All items must be ranked; positions contiguous 1..N.
 * Uniqueness of items validated at API layer (requires comparing against DB option list).
 */
export const RankingPayloadSchema = z.object({
  type: z.literal('ranking'),
  order: z.string().array().min(1, 'Please assign a rank to all items.'),
});

/**
 * free_text_short payload:
 *   { "type": "free_text_short", "value": "Brief answer" }
 *
 * FRD F02: max 500 characters enforced client-side and server-side.
 * FRD F02 §Error States: FREE_TEXT_TOO_LONG if > 500 chars.
 */
export const FreeTextShortPayloadSchema = z.object({
  type: z.literal('free_text_short'),
  value: z.string().max(500, 'Your answer exceeds the maximum length of 500 characters.'),
});

/**
 * free_text_long payload:
 *   { "type": "free_text_long", "value": "Extended open-ended response..." }
 *
 * FRD F02: max 2000 characters enforced client-side and server-side.
 * FRD F02 §Error States: FREE_TEXT_TOO_LONG if > 2000 chars.
 */
export const FreeTextLongPayloadSchema = z.object({
  type: z.literal('free_text_long'),
  value: z.string().max(2000, 'Your answer exceeds the maximum length of 2000 characters.'),
});

/**
 * AnswerPayloadSchema — discriminated union on `type` field.
 * Used in PUT /api/responses/:sessionId (wave 2c) to validate each answer_payload.
 * The `type` must match the parent question's question_type (enforced at API layer).
 */
export const AnswerPayloadSchema = z.discriminatedUnion('type', [
  SingleChoicePayloadSchema,
  MultiChoicePayloadSchema,
  LikertPayloadSchema,
  RankingPayloadSchema,
  FreeTextShortPayloadSchema,
  FreeTextLongPayloadSchema,
]);

export type SingleChoicePayload = z.infer<typeof SingleChoicePayloadSchema>;
export type MultiChoicePayload  = z.infer<typeof MultiChoicePayloadSchema>;
export type LikertPayload       = z.infer<typeof LikertPayloadSchema>;
export type RankingPayload      = z.infer<typeof RankingPayloadSchema>;
export type FreeTextShortPayload = z.infer<typeof FreeTextShortPayloadSchema>;
export type FreeTextLongPayload  = z.infer<typeof FreeTextLongPayloadSchema>;
export type AnswerPayload       = z.infer<typeof AnswerPayloadSchema>;
```
  </action>
  <verify>
```bash
# Verify all three files exist with correct exports
grep -n "export async function getSectionsForTeamType" src/lib/sections/sectionRoutingService.ts && echo "ROUTING SERVICE OK"
grep -n "export async function getQuestionsForSection" src/lib/sections/questionService.ts && echo "QUESTION SERVICE OK"
grep -n "export const AnswerPayloadSchema" src/lib/validation/answerPayloadSchemas.ts && echo "ANSWER SCHEMA OK"

# Verify all 6 schemas exist
grep -c "PayloadSchema" src/lib/validation/answerPayloadSchemas.ts | grep -qE "^[67]$" && echo "ALL 6+ SCHEMAS PRESENT"

# Type-check the three files
npx tsc --noEmit --skipLibCheck 2>&1 | head -30 && echo "TSC OK"

# Verify Zod discriminated union covers all 6 types
grep "free_text_long\|free_text_short\|ranking\|likert\|multi_choice\|single_choice" src/lib/validation/answerPayloadSchemas.ts | wc -l
```
  </verify>
  <done>
- src/lib/sections/sectionRoutingService.ts exports getSectionsForTeamType(teamType: TeamType): Promise&lt;SectionSummary[]&gt;
- getSectionsForTeamType auto-inserts missing mandatory sections with MANDATORY_SECTION_AUTO_INSERTED server log
- getSectionsForTeamType always pins feedback_adaptability as last section regardless of routing config
- getSectionsForTeamType throws SECTION_LIMIT_EXCEEDED (500) when ordered list exceeds 8 sections
- getSectionsForTeamType throws SECTION_ROUTING_EMPTY (500) when no routing rows found for team type
- src/lib/sections/questionService.ts exports getQuestionsForSection(sectionId: string): Promise&lt;SectionWithQuestions&gt;
- getQuestionsForSection throws SECTION_NOT_FOUND (404) for unknown sectionId
- getQuestionsForSection returns questions ordered by display_order, each with options ordered by display_order
- src/lib/validation/answerPayloadSchemas.ts exports all 6 individual schemas + AnswerPayloadSchema (discriminated union on 'type')
- SingleChoicePayloadSchema: superRefine enforces other_text required when value === 'other'
- MultiChoicePayloadSchema: values.min(1) enforced; other_text required when 'other' in values
- LikertPayloadSchema: value is z.union of z.literal(1..5) — rejects non-integer or out-of-range values
- FreeTextShortPayloadSchema: value max 500 chars
- FreeTextLongPayloadSchema: value max 2000 chars
- All TypeScript types inferred and exported
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement GET /api/sections and GET /api/sections/:sectionId/questions API routes</name>
  <files>
    src/app/api/sections/route.ts
    src/app/api/sections/[sectionId]/questions/route.ts
  </files>
  <action>
Create the two Next.js App Router route handlers. Both require JWT authentication via `jwtMiddleware` from wave 2a (plan 02). Use the standard error envelope from TechArch §4.1: `{ "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." } }`.

**`src/app/api/sections/route.ts`**

Implements `GET /api/sections?teamType={teamType}` per TechArch §4.3.

Auth: Bearer JWT required (any authenticated role — respondent or system_owner).
Query param: `teamType` (required) — one of the 4 valid team type enum values.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtMiddleware } from '@/lib/auth/jwtMiddleware';
import { getSectionsForTeamType, isValidTeamType } from '@/lib/sections/sectionRoutingService';

/**
 * GET /api/sections?teamType={teamType}
 *
 * TechArch §4.3: Returns { sections: SectionSummary[] } for the given team type.
 * FRD F03: Mandatory sections always included; feedback_adaptability always last.
 *
 * Auth: Bearer JWT (jwtMiddleware — any authenticated role)
 * Query params:
 *   teamType (required): 'program_project' | 'platform_engineering' | 'infrastructure_cloud' | 'data_api_governance'
 *
 * Response 200: { sections: SectionSummary[] }
 * Response 400: { error: { code: "INVALID_TEAM_TYPE", message: "..." } }
 * Response 401: { error: { code: "AUTH_REQUIRED" | "TOKEN_EXPIRED" | "TOKEN_INVALID", message: "..." } }
 * Response 500: { error: { code: "SECTION_ROUTING_EMPTY" | "SECTION_LIMIT_EXCEEDED", message: "..." } }
 */
export async function GET(request: NextRequest) {
  // jwtMiddleware: verify JWT signature + expiry; returns error response on failure
  const authResult = await jwtMiddleware(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const teamType = searchParams.get('teamType');

  // FRD F03 §Validation: teamType must be one of four valid values
  if (!teamType || !isValidTeamType(teamType)) {
    return NextResponse.json(
      { error: { code: 'INVALID_TEAM_TYPE', message: 'The selected team type is not recognized.' } },
      { status: 400 }
    );
  }

  try {
    const sections = await getSectionsForTeamType(teamType);
    return NextResponse.json({ sections }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string; statusCode?: number };
    const code = error.code ?? 'INTERNAL_ERROR';
    const message = error.message ?? 'An unexpected error occurred.';
    const status = error.statusCode ?? 500;
    return NextResponse.json({ error: { code, message } }, { status });
  }
}
```

---

**`src/app/api/sections/[sectionId]/questions/route.ts`**

Implements `GET /api/sections/:sectionId/questions` per TechArch §4.3.

Auth: Bearer JWT required (any authenticated role).
Path param: `sectionId` (text slug from the `sections` table, e.g. `general_dp_alignment`).

Create the directory: `src/app/api/sections/[sectionId]/questions/`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtMiddleware } from '@/lib/auth/jwtMiddleware';
import { getQuestionsForSection } from '@/lib/sections/questionService';

/**
 * GET /api/sections/:sectionId/questions
 *
 * TechArch §4.3: Returns SectionWithQuestions for the given section.
 * FRD F02: Each question includes type, options (ordered), is_required, has_other, help_text.
 *
 * Auth: Bearer JWT (jwtMiddleware — any authenticated role)
 * Path param: sectionId — text slug (e.g. 'general_dp_alignment')
 *
 * Response 200: SectionWithQuestions { section_id, title, questions: Question[] }
 * Response 401: { error: { code: "AUTH_REQUIRED" | "TOKEN_EXPIRED" | "TOKEN_INVALID", message: "..." } }
 * Response 404: { error: { code: "SECTION_NOT_FOUND", message: "..." } }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  // jwtMiddleware: verify JWT signature + expiry
  const authResult = await jwtMiddleware(request);
  if (authResult instanceof NextResponse) return authResult;

  const { sectionId } = params;

  if (!sectionId || typeof sectionId !== 'string') {
    return NextResponse.json(
      { error: { code: 'SECTION_NOT_FOUND', message: 'Section not found.' } },
      { status: 404 }
    );
  }

  try {
    const sectionWithQuestions = await getQuestionsForSection(sectionId);
    return NextResponse.json(sectionWithQuestions, { status: 200 });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string; statusCode?: number };
    const code = error.code ?? 'INTERNAL_ERROR';
    const message = error.message ?? 'An unexpected error occurred.';
    const status = error.statusCode ?? 500;
    return NextResponse.json({ error: { code, message } }, { status });
  }
}
```

**Directory creation note:** Next.js App Router requires the directory path `src/app/api/sections/[sectionId]/questions/` to exist with `route.ts` inside it. Create the full directory structure before writing the file.
  </action>
  <verify>
```bash
# Verify route files exist with GET exports
grep -n "export async function GET" src/app/api/sections/route.ts && echo "SECTIONS ROUTE OK"
grep -n "export async function GET" "src/app/api/sections/[sectionId]/questions/route.ts" && echo "QUESTIONS ROUTE OK"

# Verify jwtMiddleware is imported in both routes
grep -n "jwtMiddleware" src/app/api/sections/route.ts && echo "SECTIONS AUTH OK"
grep -n "jwtMiddleware" "src/app/api/sections/[sectionId]/questions/route.ts" && echo "QUESTIONS AUTH OK"

# Verify error codes are used correctly
grep -n "INVALID_TEAM_TYPE" src/app/api/sections/route.ts && echo "TEAM TYPE ERROR OK"
grep -n "SECTION_NOT_FOUND" "src/app/api/sections/[sectionId]/questions/route.ts" && echo "SECTION NOT FOUND ERROR OK"

# Type check
npx tsc --noEmit --skipLibCheck 2>&1 | head -20 && echo "TSC OK"

# Verify directory structure
ls src/app/api/sections/
ls "src/app/api/sections/[sectionId]/questions/"
```
  </verify>
  <done>
- src/app/api/sections/route.ts exports GET handler for GET /api/sections?teamType
- GET /api/sections: validates teamType via isValidTeamType(); returns 400 INVALID_TEAM_TYPE for unknown values
- GET /api/sections: calls getSectionsForTeamType(); propagates SECTION_ROUTING_EMPTY (500) and SECTION_LIMIT_EXCEEDED (500)
- GET /api/sections: requires Bearer JWT via jwtMiddleware (any authenticated role per TechArch §5.2)
- GET /api/sections: returns { sections: SectionSummary[] } on success
- src/app/api/sections/[sectionId]/questions/route.ts exports GET handler
- GET /api/sections/:sectionId/questions: requires Bearer JWT via jwtMiddleware
- GET /api/sections/:sectionId/questions: calls getQuestionsForSection(); propagates SECTION_NOT_FOUND (404)
- GET /api/sections/:sectionId/questions: returns SectionWithQuestions on success
- Both routes use standard error envelope { error: { code, message } } per TechArch §4.1
- Directory src/app/api/sections/[sectionId]/questions/ exists with route.ts inside
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API (sections) | Respondent-supplied `teamType` query parameter crossing into GET /api/sections handler |
| client→API (questions) | Respondent-supplied `sectionId` path parameter crossing into GET /api/sections/:sectionId/questions handler |
| JWT→middleware | Bearer token from Authorization header crossing into jwtMiddleware for verification |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Spoofing | `src/app/api/sections/route.ts` jwtMiddleware | mitigate | `jwtMiddleware` (from plan 02, `src/lib/auth/jwtMiddleware.ts`) verifies JWT signature with `JWT_SECRET` and checks expiry before any business logic executes. Unauthenticated requests return 401 AUTH_REQUIRED before reaching `getSectionsForTeamType`. |
| T-03-02 | Tampering | `src/app/api/sections/route.ts` teamType validation | mitigate | `isValidTeamType()` in `sectionRoutingService.ts` uses an explicit allowlist of 4 enum values. Any value outside the allowlist returns 400 INVALID_TEAM_TYPE before touching the DB. No string interpolation into SQL — Drizzle parameterized `eq(sectionRouting.team_type, teamType)` query. |
| T-03-03 | Tampering | `src/app/api/sections/[sectionId]/questions/route.ts` sectionId path param | mitigate | `sectionId` is used only in a parameterized Drizzle `eq(sections.id, sectionId)` query — not interpolated into raw SQL. A non-existent sectionId returns 404 SECTION_NOT_FOUND from the DB lookup; no SQL injection surface. |
| T-03-04 | Information disclosure | `src/lib/sections/sectionRoutingService.ts` error messages | mitigate | Error throws expose only the code + message strings defined in this plan (SECTION_ROUTING_EMPTY, SECTION_LIMIT_EXCEEDED). Stack traces are NOT forwarded to the client — the catch block in the route handler maps only `error.code` and `error.message` to the response. |
| T-03-05 | Elevation of privilege | `src/lib/validation/answerPayloadSchemas.ts` payload type confusion | mitigate | `AnswerPayloadSchema` uses `z.discriminatedUnion('type', [...])` — the `type` field must exactly match one of the 6 literals. A mismatched type returns a Zod parse error; the consuming route (wave 2c, `PUT /api/responses/:sessionId`) returns 400 INVALID_ANSWER_PAYLOAD. The `type` in the payload is additionally cross-checked against `questions.question_type` from the DB at the API layer (wave 2c task). |
| T-03-06 | Denial of service | `src/lib/sections/sectionRoutingService.ts` SECTION_LIMIT_EXCEEDED | accept | If routing config is maliciously or accidentally set to > 8 sections, the guard returns 500 SECTION_LIMIT_EXCEEDED — it does not continue processing. Config writes (wave 2d PATCH /api/config and future admin tooling) are protected by requireSystemOwner. Residual risk: a malicious System Owner could cause a routing config DOS; accepted as internal enterprise tool without external untrusted users at the System Owner role. |
</threat_model>

<verification>
## Wave 3 (2b) — Sections/Questions API Verification

After all tasks complete, verify:

```bash
# 1. All service files present with correct exports
grep -n "export async function getSectionsForTeamType" src/lib/sections/sectionRoutingService.ts && echo "ROUTING SERVICE OK"
grep -n "export async function getQuestionsForSection" src/lib/sections/questionService.ts && echo "QUESTION SERVICE OK"
grep -n "export const AnswerPayloadSchema" src/lib/validation/answerPayloadSchemas.ts && echo "UNION SCHEMA OK"

# 2. All 6 individual schemas present
for schema in SingleChoicePayloadSchema MultiChoicePayloadSchema LikertPayloadSchema RankingPayloadSchema FreeTextShortPayloadSchema FreeTextLongPayloadSchema; do
  grep -q "export const $schema" src/lib/validation/answerPayloadSchemas.ts && echo "$schema OK" || echo "MISSING: $schema"
done

# 3. Route handlers present
grep -n "export async function GET" src/app/api/sections/route.ts && echo "SECTIONS ROUTE OK"
grep -n "export async function GET" "src/app/api/sections/[sectionId]/questions/route.ts" && echo "QUESTIONS ROUTE OK"

# 4. Auth applied in both routes
grep -q "jwtMiddleware" src/app/api/sections/route.ts && echo "SECTIONS AUTH OK"
grep -q "jwtMiddleware" "src/app/api/sections/[sectionId]/questions/route.ts" && echo "QUESTIONS AUTH OK"

# 5. Error codes from FRD F02/F03 present
grep -q "INVALID_TEAM_TYPE" src/app/api/sections/route.ts && echo "INVALID_TEAM_TYPE ERROR OK"
grep -q "SECTION_LIMIT_EXCEEDED" src/lib/sections/sectionRoutingService.ts && echo "LIMIT GUARD OK"
grep -q "SECTION_ROUTING_EMPTY" src/lib/sections/sectionRoutingService.ts && echo "EMPTY GUARD OK"
grep -q "SECTION_NOT_FOUND" src/lib/sections/questionService.ts && echo "NOT FOUND GUARD OK"

# 6. TypeScript compiles without errors
npx tsc --noEmit --skipLibCheck 2>&1 | head -30 && echo "TSC PASS"

# 7. Zod schema runtime validation smoke test
npx tsx -e "
import { AnswerPayloadSchema, LikertPayloadSchema } from './src/lib/validation/answerPayloadSchemas';
const valid = LikertPayloadSchema.safeParse({ type: 'likert', value: 3 });
const invalid = LikertPayloadSchema.safeParse({ type: 'likert', value: 6 });
console.log('likert valid (3):', valid.success ? 'PASS' : 'FAIL ' + JSON.stringify(valid.error?.issues));
console.log('likert invalid (6):', !invalid.success ? 'PASS (correctly rejected)' : 'FAIL (should have failed)');

const sc = AnswerPayloadSchema.safeParse({ type: 'single_choice', value: 'other' });
console.log('single_choice other without other_text:', !sc.success ? 'PASS (correctly rejected)' : 'FAIL');

const scValid = AnswerPayloadSchema.safeParse({ type: 'single_choice', value: 'other', other_text: 'my text' });
console.log('single_choice other with other_text:', scValid.success ? 'PASS' : 'FAIL');
" 2>&1
```
</verification>

<success_criteria>
- GET /api/sections?teamType=program_project returns 5 sections in exact FRD F03 order: general_dp_alignment → current_status → platform_needs → tool_evaluation → feedback_adaptability
- GET /api/sections?teamType=platform_engineering returns 7 sections in correct order (including integration_requirements, adoption_readiness)
- GET /api/sections?teamType=infrastructure_cloud returns 6 sections; GET ?teamType=data_api_governance returns 6 sections (including governance_compliance)
- feedback_adaptability is always the last section for all 4 team types regardless of routing config display_order
- Missing mandatory sections auto-inserted with MANDATORY_SECTION_AUTO_INSERTED server log (no user-facing error)
- Section count > 8 returns 500 SECTION_LIMIT_EXCEEDED
- GET /api/sections?teamType=invalid returns 400 INVALID_TEAM_TYPE
- GET /api/sections/:sectionId/questions returns SectionWithQuestions with ordered questions and options
- GET /api/sections/nonexistent/questions returns 404 SECTION_NOT_FOUND
- Both routes return 401 (AUTH_REQUIRED / TOKEN_EXPIRED / TOKEN_INVALID) without valid JWT
- AnswerPayloadSchema discriminated union correctly validates all 6 payload types
- LikertPayloadSchema rejects values outside [1, 5]
- SingleChoicePayloadSchema requires other_text when value === 'other'
- MultiChoicePayloadSchema requires other_text when 'other' in values; rejects empty values array
- FreeTextShortPayloadSchema rejects values > 500 chars; FreeTextLongPayloadSchema rejects > 2000 chars
- TypeScript compiles without errors (tsc --noEmit --skipLibCheck)
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/03-SUMMARY.md` with:
- What was built (services, route handlers, validation schemas)
- Key implementation decisions (mandatory section enforcement strategy, Zod discriminated union approach)
- Integration contracts fulfilled (what schemas/functions downstream waves 2c and 3a can import)
- Any deviations from TechArch or FRD specs (flag conflicts, do not silently diverge)
</output>
