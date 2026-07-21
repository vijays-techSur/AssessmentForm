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
  value: z.union(
    [
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ],
    {
      error: 'Please select a value between 1 and 5.',
    }
  ),
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

export type SingleChoicePayload  = z.infer<typeof SingleChoicePayloadSchema>;
export type MultiChoicePayload   = z.infer<typeof MultiChoicePayloadSchema>;
export type LikertPayload        = z.infer<typeof LikertPayloadSchema>;
export type RankingPayload       = z.infer<typeof RankingPayloadSchema>;
export type FreeTextShortPayload = z.infer<typeof FreeTextShortPayloadSchema>;
export type FreeTextLongPayload  = z.infer<typeof FreeTextLongPayloadSchema>;
export type AnswerPayload        = z.infer<typeof AnswerPayloadSchema>;
