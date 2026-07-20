---
phase: 02b-sections-questions
plan: 03
subsystem: sections-questions-api
tags: [sections, questions, routing, validation, zod, drizzle]
dependency_graph:
  requires: [drizzle/schema.ts (sections, sectionRouting, questions, questionOptions tables)]
  provides:
    - src/lib/sections/sectionRoutingService.ts → getSectionsForTeamType
    - src/lib/sections/questionService.ts → getQuestionsForSection
    - src/lib/validation/answerPayloadSchemas.ts → AnswerPayloadSchema (and 6 individual schemas)
    - src/app/api/sections/route.ts → GET /api/sections?teamType
    - src/app/api/sections/[sectionId]/questions/route.ts → GET /api/sections/:sectionId/questions
  affects: [wave 2c PUT /api/responses/:sessionId (AnswerPayloadSchema), wave 3a respondent SPA (section navigation)]
tech_stack:
  patterns: [drizzle-orm parameterized queries, zod v4 discriminated union, Next.js App Router dynamic routes]
key_files:
  created:
    - src/lib/sections/sectionRoutingService.ts
    - src/lib/sections/questionService.ts
    - src/lib/validation/answerPayloadSchemas.ts
    - src/app/api/sections/route.ts
    - src/app/api/sections/[sectionId]/questions/route.ts
  modified: []
decisions:
  - "Used jwtMiddleware callback pattern (req, handler) consistent with existing session routes — plan showed authResult instanceof NextResponse pattern which does not match the actual jwtMiddleware signature"
  - "Zod v4 uses error: string instead of errorMap: () => for union type param — auto-fixed (Rule 1)"
  - "Imported inArray/sql directly at top of sectionRoutingService instead of dynamic import inside function body — cleaner and avoids ESM dynamic import overhead"
  - "params in Next.js 15+ dynamic route handlers is a Promise<{...}> — used await params pattern"
metrics:
  completed_date: "2026-07-20"
  tasks: 2
  files: 5
---

# Phase 02b Plan 03: Sections/Questions API Summary

**One-liner:** Section routing service with mandatory section enforcement + SECTION_LIMIT guard, question fetch service, 6 Zod answer payload schemas, and two JWT-protected API routes.

## What Was Built

### Services

**`src/lib/sections/sectionRoutingService.ts`**
- `getSectionsForTeamType(teamType: TeamType): Promise<SectionSummary[]>` — queries `section_routing` JOIN `sections` for the given team type, enforces mandatory section inclusion (auto-inserts `general_dp_alignment`, `current_status`, `feedback_adaptability` if missing), pins `feedback_adaptability` as last section regardless of routing config `display_order`, applies SECTION_LIMIT_EXCEEDED guard if total > 8 sections, fetches `question_count` per section via aggregated COUNT query
- `isValidTeamType(value: string): value is TeamType` — allowlist guard for 4 valid team type values
- Exports: `getSectionsForTeamType`, `isValidTeamType`, `TeamType`, `SectionSummary`

**`src/lib/sections/questionService.ts`**
- `getQuestionsForSection(sectionId: string): Promise<SectionWithQuestions>` — verifies section exists (throws SECTION_NOT_FOUND 404 if not), fetches all questions ordered by `display_order`, fetches all options in a single batch query using `inArray`, groups options by `question_id`
- Exports: `getQuestionsForSection`, `QuestionOption`, `Question`, `SectionWithQuestions`

### Validation Schemas

**`src/lib/validation/answerPayloadSchemas.ts`** — 6 Zod schemas per TechArch §3.3 and FRD F02:

| Schema | Key Constraints |
|--------|----------------|
| `SingleChoicePayloadSchema` | `type: 'single_choice'`, `value: string min(1)`, `superRefine`: `other_text` required when `value === 'other'` |
| `MultiChoicePayloadSchema` | `type: 'multi_choice'`, `values: string[].min(1)`, `superRefine`: `other_text` required when `'other' in values` |
| `LikertPayloadSchema` | `type: 'likert'`, `value: z.union([1,2,3,4,5])` — rejects non-integer or out-of-range |
| `RankingPayloadSchema` | `type: 'ranking'`, `order: string[].min(1)` |
| `FreeTextShortPayloadSchema` | `type: 'free_text_short'`, `value: string.max(500)` |
| `FreeTextLongPayloadSchema` | `type: 'free_text_long'`, `value: string.max(2000)` |
| `AnswerPayloadSchema` | `z.discriminatedUnion('type', [...all 6...])` — downstream wave 2c import |

### API Routes

**`src/app/api/sections/route.ts`** — `GET /api/sections?teamType`
- JWT auth via `jwtMiddleware` (any authenticated role)
- Validates `teamType` via `isValidTeamType()` allowlist → 400 INVALID_TEAM_TYPE
- Delegates to `getSectionsForTeamType()`, propagates SECTION_ROUTING_EMPTY/SECTION_LIMIT_EXCEEDED (500)
- Returns `{ sections: SectionSummary[] }` on success

**`src/app/api/sections/[sectionId]/questions/route.ts`** — `GET /api/sections/:sectionId/questions`
- JWT auth via `jwtMiddleware` (any authenticated role)
- `sectionId` used only in parameterized Drizzle `eq(sections.id, sectionId)` — no SQL injection surface
- Delegates to `getQuestionsForSection()`, propagates SECTION_NOT_FOUND (404)
- Returns `SectionWithQuestions` directly

## Integration Contracts Fulfilled

- **Wave 2c** (`PUT /api/responses/:sessionId`) can `import { AnswerPayloadSchema } from '@/lib/validation/answerPayloadSchemas'` to validate `answer_payload` before persistence
- **Wave 3a** (respondent SPA) can call `GET /api/sections?teamType` and `GET /api/sections/:sectionId/questions` to render section navigation and question widgets
- Both APIs require Bearer JWT — any authenticated respondent or system_owner role accepted

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] jwtMiddleware callback pattern mismatch**
- **Found during:** Task 2 implementation
- **Issue:** Plan showed `const authResult = await jwtMiddleware(request)` then `if (authResult instanceof NextResponse) return authResult;`. Actual `jwtMiddleware` signature is `(req: NextRequest, handler: (req: AuthenticatedRequest) => Promise<NextResponse>): Promise<NextResponse>` — requires a handler callback.
- **Fix:** Used `jwtMiddleware(request, handleGet)` callback pattern (consistent with `src/app/api/sessions/[sessionId]/route.ts`)
- **Files modified:** `src/app/api/sections/route.ts`, `src/app/api/sections/[sectionId]/questions/route.ts`

**2. [Rule 1 - Bug] Zod v4 errorMap API change**
- **Found during:** Task 1 TypeScript type check
- **Issue:** Plan used `errorMap: () => ({ message: '...' })` for `z.union()` second argument. Zod v4.4.3 uses `error: string` instead.
- **Fix:** Changed `errorMap: () => ({ message: '...' })` to `error: 'Please select a value between 1 and 5.'`
- **Files modified:** `src/lib/validation/answerPayloadSchemas.ts`

**3. [Rule 1 - Bug] Next.js 15 dynamic route params are Promise**
- **Found during:** Task 2 — Next.js 15+ App Router
- **Issue:** Dynamic route `{ params }` must be awaited as `Promise<{ sectionId: string }>` in Next.js 15+.
- **Fix:** `const { sectionId } = await params;` before passing to handler.
- **Files modified:** `src/app/api/sections/[sectionId]/questions/route.ts`

**4. [Simplification] Static imports instead of dynamic imports in service**
- **Found during:** Task 1 implementation
- **Issue:** Plan used `await import('drizzle-orm')` inside the function body for `inArray`, `sql`. This is unnecessary since drizzle-orm is a compile-time dependency.
- **Fix:** Imported `inArray`, `sql`, and `questions` at the top of the file statically.
- **Files modified:** `src/lib/sections/sectionRoutingService.ts`

## Self-Check

### Files Exist
- [x] `src/lib/sections/sectionRoutingService.ts` — FOUND
- [x] `src/lib/sections/questionService.ts` — FOUND
- [x] `src/lib/validation/answerPayloadSchemas.ts` — FOUND
- [x] `src/app/api/sections/route.ts` — FOUND
- [x] `src/app/api/sections/[sectionId]/questions/route.ts` — FOUND

### Commits
- e205ff7: feat(02b-03): implement sectionRoutingService, questionService, and Zod answer payload schemas
- df4624c: feat(02b-03): implement GET /api/sections and GET /api/sections/:sectionId/questions routes

### TypeScript: PASS (tsc --noEmit --skipLibCheck exits 0)

### Zod Schema Smoke Tests: ALL PASS
- likert valid (3): PASS
- likert invalid (6): PASS (correctly rejected)
- single_choice other without other_text: PASS (correctly rejected)
- single_choice other with other_text: PASS
- multi_choice empty values: PASS (correctly rejected)
- free_text_short over 500: PASS (correctly rejected)
- free_text_long over 2000: PASS (correctly rejected)

## Self-Check: PASSED
