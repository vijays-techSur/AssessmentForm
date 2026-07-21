import { z } from 'zod';

// ─── Per-type payload schemas (from TechArch §3.3 + FRD F02 §Validation) ──────

export const SingleChoicePayloadSchema = z.object({
  type: z.literal('single_choice'),
  value: z.string().min(1),           // option UUID or 'other'
  other_text: z.string().min(1).max(500).optional(),
}).refine(
  (d) => d.value !== 'other' || (d.other_text && d.other_text.trim().length > 0),
  { message: 'other_text is required when value is "other"', path: ['other_text'] }
);

export const MultiChoicePayloadSchema = z.object({
  type: z.literal('multi_choice'),
  values: z.array(z.string().min(1)).min(1),  // At least one option
  other_text: z.string().min(1).max(500).optional(),
}).refine(
  (d) => !d.values.includes('other') || (d.other_text && d.other_text.trim().length > 0),
  { message: 'other_text is required when "other" is in values', path: ['other_text'] }
);

export const LikertPayloadSchema = z.object({
  type: z.literal('likert'),
  // FRD F02: value must be integer in range [1, 5]; INVALID_LIKERT_VALUE if outside
  value: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

export const RankingPayloadSchema = z.object({
  type: z.literal('ranking'),
  // FRD F02: array of option UUIDs in ranked order; index 0 = rank 1 (highest priority)
  // All items must be assigned a unique position — validated in route handler against question options
  order: z.array(z.string().min(1)).min(1),
});

export const FreeTextShortPayloadSchema = z.object({
  type: z.literal('free_text_short'),
  value: z.string().max(500),  // FRD F02: max 500 chars; FREE_TEXT_TOO_LONG if exceeded
});

export const FreeTextLongPayloadSchema = z.object({
  type: z.literal('free_text_long'),
  value: z.string().max(2000),  // FRD F02: max 2000 chars; FREE_TEXT_TOO_LONG if exceeded
});

// Discriminated union — `type` field selects the branch (from TechArch §3.3)
export const AnswerPayloadSchema = z.discriminatedUnion('type', [
  SingleChoicePayloadSchema,
  MultiChoicePayloadSchema,
  LikertPayloadSchema,
  RankingPayloadSchema,
  FreeTextShortPayloadSchema,
  FreeTextLongPayloadSchema,
]);

export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;

// ─── PUT /api/responses/:sessionId request body schema ────────────────────────
// From TechArch §4.3 PUT /api/responses/:sessionId

export const ResponseItemSchema = z.object({
  question_id: z.string().uuid(),
  answer_payload: AnswerPayloadSchema,
});

export const PutResponsesBodySchema = z.object({
  section_id: z.string().min(1),
  current_section_index: z.number().int().min(0),
  // FRD F04: Empty responses array is valid (intentional blank for optional questions)
  responses: z.array(ResponseItemSchema),
});

export type ResponseItem = z.infer<typeof ResponseItemSchema>;
export type PutResponsesBody = z.infer<typeof PutResponsesBodySchema>;
