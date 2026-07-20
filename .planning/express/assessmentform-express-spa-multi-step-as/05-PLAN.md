---
phase: 2d-backend-dashboard-config
plan: 05
type: execute
wave: 5
depends_on: [1]
files_modified:
  - src/app/api/dashboard/responses/route.ts
  - src/app/api/dashboard/responses/[sessionId]/route.ts
  - src/app/api/dashboard/analytics/route.ts
  - src/app/api/dashboard/export/csv/route.ts
  - src/app/api/config/route.ts
  - src/lib/services/dashboardService.ts
  - src/lib/services/analyticsService.ts
  - src/lib/services/csvExportService.ts
  - src/lib/services/configService.ts
autonomous: true

features:
  implements: ["F6", "F8"]
  depends_on: ["F7"]
  enables: ["F6", "F8"]

must_haves:
  truths:
    - "System Owner can retrieve a paginated, filtered, sortable list of all respondent sessions"
    - "System Owner can drill down into a single respondent's complete answers across all sections"
    - "System Owner can retrieve aggregated analytics: team-type counts, Likert distributions, ranking averages, choice breakdowns"
    - "System Owner can export all (or filtered) responses as a streaming CSV with correct columns and filename"
    - "System Owner can read current assessment config (due_date, launch_date, computed status)"
    - "System Owner can PATCH assessment due_date; change is written to config_audit_log immediately"
    - "All dashboard and config endpoints return 403 ACCESS_DENIED for non-System-Owner JWTs"
  artifacts:
    - path: "src/lib/services/dashboardService.ts"
      provides: "Paginated response list + individual response fetch"
      exports: ["getResponseList", "getResponseDetail"]
    - path: "src/lib/services/analyticsService.ts"
      provides: "SQL aggregations for all four analytics chart types"
      exports: ["getAnalyticsData"]
    - path: "src/lib/services/csvExportService.ts"
      provides: "Streaming CSV generation flattening JSONB payloads to human-readable strings"
      exports: ["streamCsvExport"]
    - path: "src/lib/services/configService.ts"
      provides: "Assessment config read/update with audit log write"
      exports: ["getConfig", "patchConfig"]
    - path: "src/app/api/dashboard/responses/route.ts"
      provides: "GET /api/dashboard/responses — paginated + filtered response list"
      exports: ["GET"]
    - path: "src/app/api/dashboard/responses/[sessionId]/route.ts"
      provides: "GET /api/dashboard/responses/:sessionId — individual drill-down"
      exports: ["GET"]
    - path: "src/app/api/dashboard/analytics/route.ts"
      provides: "GET /api/dashboard/analytics — aggregated analytics data"
      exports: ["GET"]
    - path: "src/app/api/dashboard/export/csv/route.ts"
      provides: "GET /api/dashboard/export/csv — streaming CSV download"
      exports: ["GET"]
    - path: "src/app/api/config/route.ts"
      provides: "GET + PATCH /api/config — assessment configuration management"
      exports: ["GET", "PATCH"]
  key_links:
    - from: "src/app/api/dashboard/responses/route.ts"
      to: "src/lib/services/dashboardService.ts"
      via: "getResponseList(filters, pagination)"
      pattern: "getResponseList"
    - from: "src/app/api/dashboard/analytics/route.ts"
      to: "src/lib/services/analyticsService.ts"
      via: "getAnalyticsData(teamTypeFilter)"
      pattern: "getAnalyticsData"
    - from: "src/app/api/dashboard/export/csv/route.ts"
      to: "src/lib/services/csvExportService.ts"
      via: "streamCsvExport(filters, res)"
      pattern: "streamCsvExport"
    - from: "src/app/api/config/route.ts"
      to: "src/lib/services/configService.ts"
      via: "getConfig() / patchConfig(due_date, changedBy)"
      pattern: "getConfig|patchConfig"
    - from: "src/lib/services/analyticsService.ts"
      to: "drizzle/schema.ts"
      via: "db queries on responses, questions, sessions, respondents"
      pattern: "db\\.select|db\\.execute"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "drizzle/schema.ts"
      exports: ["sessions", "respondents", "responses", "questions", "sections", "assessmentConfig", "configAuditLog"]
      verify: "grep -n 'export const sessions' drizzle/schema.ts && grep -n 'export const assessmentConfig' drizzle/schema.ts && grep -n 'export const configAuditLog' drizzle/schema.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/lib/services/dashboardService.ts"
      exports: ["getResponseList", "getResponseDetail"]
      shape: |
        getResponseList(params: { page, pageSize, sortBy, sortDir, teamType?, status?, submittedAfter?, submittedBefore?, search? }): Promise<PaginatedResponseList>
        getResponseDetail(sessionId: string): Promise<ResponseDetail>

        PaginatedResponseList = { total: number; page: number; pageSize: number; data: ResponseListItem[]; duplicate_count: number }
        ResponseListItem = { session_id, respondent_name, respondent_email, team_type, submission_status, submitted_at, last_modified_at }
        ResponseDetail = { session_id, respondent_name, respondent_email, team_type, submission_status, submitted_at, sections: [{ section_id, title, answers: [{ question_id, question_text, question_type, answer_payload }] }] }
      verify: "grep -n 'export.*getResponseList' src/lib/services/dashboardService.ts && grep -n 'export.*getResponseDetail' src/lib/services/dashboardService.ts && echo CONTRACT_OK"
    - artifact: "src/lib/services/analyticsService.ts"
      exports: ["getAnalyticsData"]
      shape: |
        getAnalyticsData(teamTypeFilter?: string[]): Promise<AnalyticsData>

        AnalyticsData = {
          response_counts_by_team_type: Record<TeamType, number>,
          likert_distributions: [{ question_id, question_text, distribution: { '1': n, '2': n, '3': n, '4': n, '5': n } }],
          ranking_top_items: [{ question_id, question_text, ranked_items: [{ option_text, average_rank }] }],
          choice_breakdowns: [{ question_id, question_text, counts: [{ option_text, count, percentage }] }]
        }
      verify: "grep -n 'export.*getAnalyticsData' src/lib/services/analyticsService.ts && echo CONTRACT_OK"
    - artifact: "src/lib/services/configService.ts"
      exports: ["getConfig", "patchConfig"]
      shape: |
        getConfig(): Promise<AssessmentConfig>
        patchConfig(due_date: string, changedBy: string): Promise<AssessmentConfig>

        AssessmentConfig = { due_date: string, launch_date: string, status: 'upcoming'|'active'|'closed', last_modified_at: string, last_modified_by: string | null }
      verify: "grep -n 'export.*getConfig' src/lib/services/configService.ts && grep -n 'export.*patchConfig' src/lib/services/configService.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/dashboard/responses/route.ts"
      exports: ["GET"]
      shape: |
        GET /api/dashboard/responses
        Query: page, pageSize, sortBy, sortDir, teamType, status, submittedAfter, submittedBefore, search
        Response 200: PaginatedResponseList (see dashboardService shape)
        Response 403: { error: { code: "ACCESS_DENIED", message: "..." } }
        Response 400: { error: { code: "INVALID_DATE_RANGE", message: "..." } }
      verify: "grep -n 'export.*GET' src/app/api/dashboard/responses/route.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/dashboard/analytics/route.ts"
      exports: ["GET"]
      shape: |
        GET /api/dashboard/analytics
        Query: teamType (optional, multi-value)
        Response 200: AnalyticsData (see analyticsService shape)
        Response 403: { error: { code: "ACCESS_DENIED", message: "..." } }
        Response 500: { error: { code: "ANALYTICS_ERROR", message: "..." } }
      verify: "grep -n 'export.*GET' src/app/api/dashboard/analytics/route.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/dashboard/export/csv/route.ts"
      exports: ["GET"]
      shape: |
        GET /api/dashboard/export/csv
        Response: text/csv stream, Content-Disposition: attachment; filename="assessment-responses-YYYY-MM-DD.csv"
        Columns: respondent_name, respondent_email, team_type, submission_status, submitted_at, last_modified_at, [one column per question by question_text]
      verify: "grep -n 'export.*GET' src/app/api/dashboard/export/csv/route.ts && echo CONTRACT_OK"
    - artifact: "src/app/api/config/route.ts"
      exports: ["GET", "PATCH"]
      shape: |
        GET /api/config → AssessmentConfig
        PATCH /api/config body: { due_date: string } → AssessmentConfig (updated)
        Side effect: writes config_audit_log row
        Response 400: { error: { code: "INVALID_DATE_FORMAT", message: "..." } }
        Response 403: { error: { code: "ACCESS_DENIED", message: "..." } }
      verify: "grep -n 'export.*GET\|export.*PATCH' src/app/api/config/route.ts && echo CONTRACT_OK"
---

<objective>
Implement the System Owner backend for wave 2d: dashboard API (response list, individual drill-down, analytics aggregations, streaming CSV export) and assessment configuration management (read/update due date, audit log write).

Purpose: Enables the System Owner Dashboard SPA (wave 3c) to present all response data, analytics charts, and config management with correct server-side data. Also enables the assessment status badge and due-date enforcement used by all respondent flows.
Output: 5 service modules (dashboardService, analyticsService, csvExportService, configService) + 5 API route handlers covering GET /api/dashboard/responses, GET /api/dashboard/responses/:sessionId, GET /api/dashboard/analytics, GET /api/dashboard/export/csv, GET /api/config, PATCH /api/config.
</objective>

<feature_dependencies>
Implements: F6: System Owner Dashboard (response list with pagination/filter/sort/search, individual drill-down, analytics aggregations, CSV export, 60s polling summary counts via API), F8: Assessment Configuration Management (due_date CRUD, status computation, config_audit_log write)
Depends on: F7: Role-Based Access Control (requireSystemOwner middleware from wave 2a — must be applied on every route handler in this plan)
Enables: F6 frontend (wave 3c ResponseTable, FilterPanel, AnalyticsPanel, ConfigPanel), F8 frontend (ConfigPanel date picker + audit log display)
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
@drizzle/schema.ts
@src/lib/db.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: dashboardService, analyticsService — response list, drill-down, analytics aggregations</name>
  <files>
    src/lib/services/dashboardService.ts
    src/lib/services/analyticsService.ts
    src/app/api/dashboard/responses/route.ts
    src/app/api/dashboard/responses/[sessionId]/route.ts
    src/app/api/dashboard/analytics/route.ts
  </files>
  <action>
Implement dashboardService.ts and analyticsService.ts plus their corresponding API route handlers. All routes MUST apply requireSystemOwner middleware from wave 2a (import from `@/lib/middleware`).

---

### `src/lib/services/dashboardService.ts`

```typescript
import { db } from '@/lib/db';
import { sessions, respondents, responses, questions, sections } from '../../../drizzle/schema';
import { eq, ilike, or, and, gte, lte, sql, asc, desc, count } from 'drizzle-orm';

export type ResponseListParams = {
  page?: number;       // 1-based, default 1
  pageSize?: number;   // default 25, max 100
  sortBy?: string;     // 'submitted_at'|'name'|'email'|'team_type'|'status'|'last_modified_at'
  sortDir?: 'asc' | 'desc';  // default 'desc'
  teamType?: string[];        // multi-select
  status?: 'all' | 'submitted' | 'draft';  // default 'all'
  submittedAfter?: string;    // ISO date, inclusive
  submittedBefore?: string;   // ISO date, inclusive
  search?: string;            // partial name or email match, case-insensitive
};

// GET /api/dashboard/responses — F06 §Response List View
// TechArch §4.3: PaginatedResponseList
export async function getResponseList(params: ResponseListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const sortDir = params.sortDir === 'asc' ? asc : desc;

  // Build dynamic WHERE conditions
  const conditions: ReturnType<typeof and>[] = [];

  if (params.status && params.status !== 'all') {
    conditions.push(eq(sessions.submission_status, params.status));
  }

  if (params.teamType && params.teamType.length > 0) {
    conditions.push(
      sql`${respondents.team_type} = ANY(${params.teamType})`
    );
  }

  if (params.submittedAfter) {
    conditions.push(gte(sessions.submitted_at, params.submittedAfter));
  }

  if (params.submittedBefore) {
    conditions.push(lte(sessions.submitted_at, params.submittedBefore));
  }

  if (params.search) {
    // F06: case-insensitive partial match against name and email
    conditions.push(
      or(
        ilike(respondents.name, `%${params.search}%`),
        ilike(respondents.email, `%${params.search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort column
  const sortColumnMap: Record<string, unknown> = {
    submitted_at:     sessions.submitted_at,
    name:             respondents.name,
    email:            respondents.email,
    team_type:        respondents.team_type,
    status:           sessions.submission_status,
    last_modified_at: sessions.last_modified_at,
  };
  const sortCol = sortColumnMap[params.sortBy ?? 'submitted_at'] ?? sessions.submitted_at;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        session_id:        sessions.id,
        respondent_name:   respondents.name,
        respondent_email:  respondents.email,
        team_type:         respondents.team_type,
        submission_status: sessions.submission_status,
        submitted_at:      sessions.submitted_at,
        last_modified_at:  sessions.last_modified_at,
      })
      .from(sessions)
      .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
      .where(whereClause)
      .orderBy(sortDir(sortCol as Parameters<typeof asc>[0]))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(sessions)
      .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
      .where(whereClause),
  ]);

  // F06: duplicate_count is always 0 in correct system (UNIQUE email constraint)
  return {
    total: Number(totalResult[0]?.count ?? 0),
    page,
    pageSize,
    data: rows,
    duplicate_count: 0,
  };
}

// GET /api/dashboard/responses/:sessionId — F06 §Individual Response View
// TechArch §4.3: ResponseDetail
export async function getResponseDetail(sessionId: string) {
  const sessionRow = await db
    .select({
      session_id:        sessions.id,
      respondent_name:   respondents.name,
      respondent_email:  respondents.email,
      team_type:         respondents.team_type,
      submission_status: sessions.submission_status,
      submitted_at:      sessions.submitted_at,
      section_ids_ordered: sessions.section_ids_ordered,
    })
    .from(sessions)
    .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (sessionRow.length === 0) return null;

  const session = sessionRow[0];
  const sectionOrder = (session.section_ids_ordered as string[]) ?? [];

  // Fetch all sections for this respondent's ordered section list
  const sectionRows = await db
    .select({ id: sections.id, title: sections.title })
    .from(sections)
    .where(sql`${sections.id} = ANY(${sectionOrder})`);

  const sectionMap = new Map(sectionRows.map(s => [s.id, s.title]));

  // Fetch all questions for these sections with their saved answers
  const answerRows = await db
    .select({
      section_id:     questions.section_id,
      question_id:    questions.id,
      question_text:  questions.question_text,
      question_type:  questions.question_type,
      answer_payload: responses.answer_payload,
    })
    .from(questions)
    .leftJoin(
      responses,
      and(eq(responses.question_id, questions.id), eq(responses.session_id, sessionId))
    )
    .where(sql`${questions.section_id} = ANY(${sectionOrder})`)
    .orderBy(asc(questions.display_order));

  // Group answers by section in the respondent's section order
  const sectionAnswers = new Map<string, typeof answerRows>();
  for (const row of answerRows) {
    if (!sectionAnswers.has(row.section_id)) sectionAnswers.set(row.section_id, []);
    sectionAnswers.get(row.section_id)!.push(row);
  }

  const sectionDetails = sectionOrder
    .filter(sid => sectionMap.has(sid))
    .map(sid => ({
      section_id: sid,
      title: sectionMap.get(sid)!,
      answers: (sectionAnswers.get(sid) ?? []).map(a => ({
        question_id:    a.question_id,
        question_text:  a.question_text,
        question_type:  a.question_type,
        answer_payload: a.answer_payload ?? null,
      })),
    }));

  return {
    session_id:        session.session_id,
    respondent_name:   session.respondent_name,
    respondent_email:  session.respondent_email,
    team_type:         session.team_type,
    submission_status: session.submission_status,
    submitted_at:      session.submitted_at,
    sections:          sectionDetails,
  };
}
```

---

### `src/lib/services/analyticsService.ts`

```typescript
import { db } from '@/lib/db';
import { responses, questions, sessions, respondents, questionOptions } from '../../../drizzle/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';

// GET /api/dashboard/analytics — F06 §Analytics Panel
// TechArch §4.2: AnalyticsData interface
// All aggregations use submitted sessions only (draft responses excluded from analytics)

export async function getAnalyticsData(teamTypeFilter?: string[]) {
  // Build optional team type filter
  const teamTypeCondition =
    teamTypeFilter && teamTypeFilter.length > 0
      ? inArray(respondents.team_type, teamTypeFilter)
      : undefined;

  // 1. Response counts by team type (F06: bar chart)
  const countRows = await db
    .select({
      team_type: respondents.team_type,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(sessions)
    .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
    .where(
      and(
        eq(sessions.submission_status, 'submitted'),
        teamTypeCondition
      )
    )
    .groupBy(respondents.team_type);

  const response_counts_by_team_type: Record<string, number> = {
    program_project:      0,
    platform_engineering: 0,
    infrastructure_cloud: 0,
    data_api_governance:  0,
  };
  for (const row of countRows) {
    response_counts_by_team_type[row.team_type] = row.count;
  }

  // Helper: get submitted session IDs for optional team type filter
  const submittedSessionsSubquery = db
    .select({ id: sessions.id })
    .from(sessions)
    .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
    .where(and(eq(sessions.submission_status, 'submitted'), teamTypeCondition));

  // 2. Likert distributions per question (F06: stacked bar — % at each point 1-5)
  const likertQuestions = await db
    .select({ id: questions.id, question_text: questions.question_text })
    .from(questions)
    .where(eq(questions.question_type, 'likert'));

  const likert_distributions = await Promise.all(
    likertQuestions.map(async (q) => {
      const distRows = await db
        .select({
          value: sql<number>`(${responses.answer_payload}->>'value')::int`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(responses)
        .innerJoin(submittedSessionsSubquery.as('sess'), eq(responses.session_id, sql`sess.id`))
        .where(eq(responses.question_id, q.id))
        .groupBy(sql`(${responses.answer_payload}->>'value')::int`);

      const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      for (const row of distRows) {
        if (row.value >= 1 && row.value <= 5) distribution[String(row.value)] = row.count;
      }
      return { question_id: q.id, question_text: q.question_text, distribution };
    })
  );

  // 3. Ranking top items per question (F06: average rank position)
  const rankingQuestions = await db
    .select({ id: questions.id, question_text: questions.question_text })
    .from(questions)
    .where(eq(questions.question_type, 'ranking'));

  const ranking_top_items = await Promise.all(
    rankingQuestions.map(async (q) => {
      // options for this question
      const opts = await db
        .select({ id: questionOptions.id, option_text: questionOptions.option_text })
        .from(questionOptions)
        .where(eq(questionOptions.question_id, q.id));

      // For each response, expand ranking order array and compute 0-based index (rank)
      // avg rank per option_id across all submitted respondents
      const rankRows = await db.execute(
        sql`
          SELECT
            item_id,
            AVG(rank_pos)::float AS average_rank
          FROM (
            SELECT
              session_id,
              jsonb_array_elements_text(answer_payload->'order') AS item_id,
              (ordinality - 1) AS rank_pos
            FROM responses,
              jsonb_array_elements_text(answer_payload->'order') WITH ORDINALITY
            WHERE question_id = ${q.id}
              AND session_id IN (SELECT id FROM sessions WHERE submission_status = 'submitted')
          ) ranked
          GROUP BY item_id
          ORDER BY average_rank ASC
        `
      );

      const optionMap = new Map(opts.map(o => [o.id, o.option_text]));
      const ranked_items = (rankRows.rows as { item_id: string; average_rank: number }[])
        .filter(r => optionMap.has(r.item_id))
        .map(r => ({ option_text: optionMap.get(r.item_id)!, average_rank: r.average_rank }));

      return { question_id: q.id, question_text: q.question_text, ranked_items };
    })
  );

  // 4. Choice breakdowns for single_choice and multi_choice (F06: pie/bar)
  const choiceQuestions = await db
    .select({ id: questions.id, question_text: questions.question_text, question_type: questions.question_type })
    .from(questions)
    .where(inArray(questions.question_type, ['single_choice', 'multi_choice']));

  const choice_breakdowns = await Promise.all(
    choiceQuestions.map(async (q) => {
      const opts = await db
        .select({ id: questionOptions.id, option_text: questionOptions.option_text })
        .from(questionOptions)
        .where(eq(questionOptions.question_id, q.id));

      // Total submitted responses for this question (for percentage calculation)
      const totalResult = await db
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(responses)
        .where(
          and(
            eq(responses.question_id, q.id),
            sql`session_id IN (SELECT id FROM sessions WHERE submission_status = 'submitted')`
          )
        );
      const total = totalResult[0]?.total ?? 1;

      // Count per option_id
      let countRows: { option_id: string; count: number }[];
      if (q.question_type === 'single_choice') {
        countRows = (await db.execute(
          sql`
            SELECT answer_payload->>'value' AS option_id, COUNT(*)::int AS count
            FROM responses
            WHERE question_id = ${q.id}
              AND session_id IN (SELECT id FROM sessions WHERE submission_status = 'submitted')
            GROUP BY answer_payload->>'value'
          `
        )).rows as { option_id: string; count: number }[];
      } else {
        // multi_choice: expand values array
        countRows = (await db.execute(
          sql`
            SELECT jsonb_array_elements_text(answer_payload->'values') AS option_id, COUNT(*)::int AS count
            FROM responses
            WHERE question_id = ${q.id}
              AND session_id IN (SELECT id FROM sessions WHERE submission_status = 'submitted')
            GROUP BY option_id
          `
        )).rows as { option_id: string; count: number }[];
      }

      const optionMap = new Map(opts.map(o => [o.id, o.option_text]));
      const counts = countRows
        .filter(r => optionMap.has(r.option_id) || r.option_id === 'other')
        .map(r => ({
          option_text: optionMap.get(r.option_id) ?? 'Other',
          count: r.count,
          percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
        }));

      return { question_id: q.id, question_text: q.question_text, counts };
    })
  );

  return {
    response_counts_by_team_type,
    likert_distributions,
    ranking_top_items,
    choice_breakdowns,
  };
}
```

---

### API Route Handlers

**`src/app/api/dashboard/responses/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware';
import { getResponseList } from '@/lib/services/dashboardService';

// GET /api/dashboard/responses — F06 §Response List View
// TechArch §4.3: page, pageSize, sortBy, sortDir, teamType, status, submittedAfter, submittedBefore, search
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);

  const submittedAfter  = searchParams.get('submittedAfter') ?? undefined;
  const submittedBefore = searchParams.get('submittedBefore') ?? undefined;

  // Validate date range: submittedAfter must be <= submittedBefore
  if (submittedAfter && submittedBefore && submittedAfter > submittedBefore) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE_RANGE', message: "The 'from' date must be before or equal to the 'to' date." } },
      { status: 400 }
    );
  }

  try {
    const result = await getResponseList({
      page:            Number(searchParams.get('page') ?? 1),
      pageSize:        Number(searchParams.get('pageSize') ?? 25),
      sortBy:          searchParams.get('sortBy') ?? 'submitted_at',
      sortDir:         (searchParams.get('sortDir') as 'asc' | 'desc') ?? 'desc',
      teamType:        searchParams.getAll('teamType'),
      status:          (searchParams.get('status') as 'all' | 'submitted' | 'draft') ?? 'all',
      submittedAfter,
      submittedBefore,
      search:          searchParams.get('search') ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/dashboard/responses]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load responses.' } },
      { status: 500 }
    );
  }
}
```

**`src/app/api/dashboard/responses/[sessionId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware';
import { getResponseDetail } from '@/lib/services/dashboardService';

// GET /api/dashboard/responses/:sessionId — F06 §Individual Response View
// TechArch §4.3: ResponseDetail
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  try {
    const detail = await getResponseDetail(params.sessionId);
    if (!detail) {
      return NextResponse.json(
        { error: { code: 'RESPONSE_NOT_FOUND', message: 'The requested response could not be found.' } },
        { status: 404 }
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error('[GET /api/dashboard/responses/:sessionId]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load response detail.' } },
      { status: 500 }
    );
  }
}
```

**`src/app/api/dashboard/analytics/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware';
import { getAnalyticsData } from '@/lib/services/analyticsService';

// GET /api/dashboard/analytics — F06 §Analytics Panel
// TechArch §4.3: AnalyticsData
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const teamTypeFilter = searchParams.getAll('teamType');

  try {
    const analytics = await getAnalyticsData(teamTypeFilter.length > 0 ? teamTypeFilter : undefined);
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[GET /api/dashboard/analytics]', err);
    return NextResponse.json(
      { error: { code: 'ANALYTICS_ERROR', message: 'Analytics could not be loaded. Please refresh.' } },
      { status: 500 }
    );
  }
}
```
  </action>
  <verify>
```bash
grep -n "export.*getResponseList" src/lib/services/dashboardService.ts && echo "dashboardService getResponseList OK"
grep -n "export.*getResponseDetail" src/lib/services/dashboardService.ts && echo "dashboardService getResponseDetail OK"
grep -n "export.*getAnalyticsData" src/lib/services/analyticsService.ts && echo "analyticsService OK"
grep -n "export.*GET" src/app/api/dashboard/responses/route.ts && echo "responses route OK"
grep -n "export.*GET" src/app/api/dashboard/responses/[sessionId]/route.ts && echo "drill-down route OK"
grep -n "export.*GET" src/app/api/dashboard/analytics/route.ts && echo "analytics route OK"
grep -n "requireSystemOwner" src/app/api/dashboard/responses/route.ts && echo "auth guard applied OK"
npx tsc --noEmit 2>&1 | head -30
```
  </verify>
  <done>
- dashboardService.ts exports getResponseList (paginated, sortable by 6 columns, filterable by team_type/status/date range/search) and getResponseDetail (full section+answer drill-down in respondent section order)
- analyticsService.ts exports getAnalyticsData with all four chart aggregations: team-type COUNT, Likert value distribution (1–5), ranking average rank via jsonb_array_elements_text with ordinality, choice option counts + percentage
- GET /api/dashboard/responses validates date range (400 INVALID_DATE_RANGE if after > before) and applies requireSystemOwner (403 ACCESS_DENIED for non-owners)
- GET /api/dashboard/responses/:sessionId returns 404 RESPONSE_NOT_FOUND when session does not exist
- GET /api/dashboard/analytics accepts optional teamType query param (multi-value) and applies requireSystemOwner
- TypeScript compilation passes with no errors in the modified files
  </done>
</task>

<task type="auto">
  <name>Task 2: csvExportService, configService — streaming CSV export + config CRUD with audit log</name>
  <files>
    src/lib/services/csvExportService.ts
    src/lib/services/configService.ts
    src/app/api/dashboard/export/csv/route.ts
    src/app/api/config/route.ts
  </files>
  <action>
Implement csvExportService (streaming CSV via csv-stringify), configService (singleton read/update + audit log write), and their API route handlers. All routes apply requireSystemOwner.

---

### `src/lib/services/csvExportService.ts`

```typescript
import { db } from '@/lib/db';
import { sessions, respondents, responses, questions, sections } from '../../../drizzle/schema';
import { eq, ilike, or, and, gte, lte, asc, sql, inArray } from 'drizzle-orm';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import type { ResponseListParams } from './dashboardService';

// F06 §CSV Export — TechArch §4.3 GET /api/dashboard/export/csv
// Columns: respondent_name, respondent_email, team_type, submission_status,
//          submitted_at, last_modified_at, [one column per question by question_text]
// Answer payloads flattened to human-readable strings.

function flattenAnswerPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  switch (p.type) {
    case 'single_choice':
      return p.value === 'other' ? `Other: ${p.other_text ?? ''}` : String(p.value ?? '');
    case 'multi_choice': {
      const values = (p.values as string[]) ?? [];
      const parts = values.map(v => (v === 'other' ? `Other: ${p.other_text ?? ''}` : v));
      return parts.join('; ');
    }
    case 'likert':
      return String(p.value ?? '');
    case 'ranking':
      return ((p.order as string[]) ?? []).join(' > ');
    case 'free_text_short':
    case 'free_text_long':
      return String(p.value ?? '');
    default:
      return JSON.stringify(payload);
  }
}

export async function buildCsvExportStream(params: Omit<ResponseListParams, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>) {
  // Build same filter conditions as dashboardService (shared logic)
  const conditions: ReturnType<typeof and>[] = [];
  if (params.status && params.status !== 'all') {
    conditions.push(eq(sessions.submission_status, params.status));
  }
  if (params.teamType && params.teamType.length > 0) {
    conditions.push(sql`${respondents.team_type} = ANY(${params.teamType})`);
  }
  if (params.submittedAfter) {
    conditions.push(gte(sessions.submitted_at, params.submittedAfter));
  }
  if (params.submittedBefore) {
    conditions.push(lte(sessions.submitted_at, params.submittedBefore));
  }
  if (params.search) {
    conditions.push(or(
      ilike(respondents.name, `%${params.search}%`),
      ilike(respondents.email, `%${params.search}%`)
    ));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch all matching sessions (no page limit for CSV)
  const sessionRows = await db
    .select({
      session_id:        sessions.id,
      respondent_name:   respondents.name,
      respondent_email:  respondents.email,
      team_type:         respondents.team_type,
      submission_status: sessions.submission_status,
      submitted_at:      sessions.submitted_at,
      last_modified_at:  sessions.last_modified_at,
    })
    .from(sessions)
    .innerJoin(respondents, eq(sessions.respondent_id, respondents.id))
    .where(whereClause)
    .orderBy(asc(sessions.submitted_at));

  if (sessionRows.length === 0) {
    // Return empty CSV with headers
    const allQs = await db.select({ id: questions.id, question_text: questions.question_text })
      .from(questions).orderBy(asc(questions.display_order));
    const headers = ['respondent_name', 'respondent_email', 'team_type', 'submission_status', 'submitted_at', 'last_modified_at', ...allQs.map(q => q.question_text)];
    return Readable.from([headers.join(',') + '\n']);
  }

  const sessionIds = sessionRows.map(s => s.session_id);

  // Fetch all questions in display order (for column headers)
  const allQuestions = await db
    .select({ id: questions.id, question_text: questions.question_text })
    .from(questions)
    .orderBy(asc(questions.display_order));

  // Fetch all responses for these sessions
  const answerRows = await db
    .select({
      session_id:     responses.session_id,
      question_id:    responses.question_id,
      answer_payload: responses.answer_payload,
    })
    .from(responses)
    .where(inArray(responses.session_id, sessionIds));

  // Index: sessionId → questionId → flattened string
  const answerIndex = new Map<string, Map<string, string>>();
  for (const row of answerRows) {
    if (!answerIndex.has(row.session_id)) answerIndex.set(row.session_id, new Map());
    answerIndex.get(row.session_id)!.set(row.question_id, flattenAnswerPayload(row.answer_payload));
  }

  // Build CSV rows
  const headers = [
    'respondent_name',
    'respondent_email',
    'team_type',
    'submission_status',
    'submitted_at',
    'last_modified_at',
    ...allQuestions.map(q => q.question_text),
  ];

  const dataRows = sessionRows.map(s => [
    s.respondent_name,
    s.respondent_email,
    s.team_type,
    s.submission_status,
    s.submitted_at ?? '',
    s.last_modified_at ?? '',
    ...allQuestions.map(q => answerIndex.get(s.session_id)?.get(q.id) ?? ''),
  ]);

  // Stream via csv-stringify
  const stringifier = stringify({ header: false });
  const rows = [headers, ...dataRows];
  const stream = Readable.from(
    (async function* () {
      for (const row of rows) {
        yield await new Promise<string>((resolve, reject) => {
          stringify([row], (err, output) => {
            if (err) reject(err);
            else resolve(output ?? '');
          });
        });
      }
    })()
  );

  return stream;
}
```

---

### `src/lib/services/configService.ts`

```typescript
import { db } from '@/lib/db';
import { assessmentConfig, configAuditLog } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// F08: Assessment Status Computation
// TechArch §4.2: AssessmentStatus — computed from launch_date and due_date relative to NOW()
function computeStatus(launchDate: string, dueDate: string): 'upcoming' | 'active' | 'closed' {
  const now = new Date();
  if (now < new Date(launchDate)) return 'upcoming';
  if (now > new Date(dueDate)) return 'closed';
  return 'active';
}

// GET /api/config — F08 §View Configuration
// TechArch §4.3: AssessmentConfig
// TechArch: status is computed on every call, NOT stored
export async function getConfig() {
  const rows = await db.select().from(assessmentConfig).where(eq(assessmentConfig.id, 1)).limit(1);
  if (rows.length === 0) {
    throw new Error('CONFIG_NOT_FOUND');
  }
  const cfg = rows[0];
  return {
    due_date:         cfg.due_date,
    launch_date:      cfg.launch_date,
    status:           computeStatus(cfg.launch_date, cfg.due_date),
    last_modified_at: cfg.last_modified_at,
    last_modified_by: cfg.last_modified_by ?? null,
  };
}

// PATCH /api/config — F08 §Update Due Date
// TechArch §4.3: Request body { due_date: string }
// Side effect: writes config_audit_log row (F08 §Outputs)
export async function patchConfig(newDueDate: string, changedBy: string) {
  const rows = await db.select().from(assessmentConfig).where(eq(assessmentConfig.id, 1)).limit(1);
  if (rows.length === 0) throw new Error('CONFIG_NOT_FOUND');

  const current = rows[0];
  const now = new Date().toISOString();

  // Update singleton config row
  await db
    .update(assessmentConfig)
    .set({ due_date: newDueDate, last_modified_at: now, last_modified_by: changedBy })
    .where(eq(assessmentConfig.id, 1));

  // Write audit log entry — F08 §Process step 9
  // TechArch §3.2: config_audit_log: changed_by, field_changed, old_value, new_value
  await db.insert(configAuditLog).values({
    changed_by:    changedBy,
    field_changed: 'due_date',
    old_value:     current.due_date,
    new_value:     newDueDate,
    changed_at:    now,
  });

  return {
    due_date:         newDueDate,
    launch_date:      current.launch_date,
    status:           computeStatus(current.launch_date, newDueDate),
    last_modified_at: now,
    last_modified_by: changedBy,
  };
}
```

---

### `src/app/api/dashboard/export/csv/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware';
import { buildCsvExportStream } from '@/lib/services/csvExportService';
import { NextResponse } from 'next/server';

// GET /api/dashboard/export/csv — F06 §CSV Export
// TechArch §4.3: Content-Disposition: attachment; filename="assessment-responses-YYYY-MM-DD.csv"
// Accepts same filter params as GET /api/dashboard/responses
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `assessment-responses-${date}.csv`;

  try {
    const stream = await buildCsvExportStream({
      teamType:        searchParams.getAll('teamType'),
      status:          (searchParams.get('status') as 'all' | 'submitted' | 'draft') ?? 'all',
      submittedAfter:  searchParams.get('submittedAfter') ?? undefined,
      submittedBefore: searchParams.get('submittedBefore') ?? undefined,
      search:          searchParams.get('search') ?? undefined,
    });

    // Stream CSV as HTTP response
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const csvBody = Buffer.concat(chunks);

    return new NextResponse(csvBody, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/dashboard/export/csv]', err);
    return NextResponse.json(
      { error: { code: 'EXPORT_FAILED', message: 'Export could not be generated. Please try again.' } },
      { status: 500 }
    );
  }
}
```

---

### `src/app/api/config/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireSystemOwner } from '@/lib/middleware';
import { getConfig, patchConfig } from '@/lib/services/configService';
import { jwtVerify } from 'jose';

// GET /api/config — F08 §View Configuration
// TechArch §4.3: AssessmentConfig response shape
export async function GET(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  try {
    const cfg = await getConfig();
    return NextResponse.json(cfg);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CONFIG_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'CONFIG_NOT_FOUND', message: 'Assessment configuration is missing. Please contact a system administrator.' } },
        { status: 500 }
      );
    }
    console.error('[GET /api/config]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not load configuration.' } },
      { status: 500 }
    );
  }
}

// PATCH /api/config — F08 §Update Due Date
// TechArch §4.3: Request body { due_date: string } — returns updated AssessmentConfig
// Side effect: config_audit_log row written
export async function PATCH(req: NextRequest) {
  const authError = await requireSystemOwner(req);
  if (authError) return authError;

  let body: { due_date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE_FORMAT', message: 'Please provide a valid date and time.' } },
      { status: 400 }
    );
  }

  // Validate due_date is a valid ISO 8601 datetime string
  if (!body.due_date || isNaN(Date.parse(body.due_date))) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE_FORMAT', message: 'Please provide a valid date and time.' } },
      { status: 400 }
    );
  }

  // Extract System Owner email from JWT for audit log
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  let ownerEmail = 'unknown';
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    ownerEmail = (payload.email as string) ?? 'unknown';
  } catch {
    // requireSystemOwner already verified the token; this is a belt-and-suspenders extraction
  }

  try {
    const updated = await patchConfig(body.due_date, ownerEmail);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CONFIG_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'CONFIG_NOT_FOUND', message: 'Assessment configuration is missing. Please contact a system administrator.' } },
        { status: 500 }
      );
    }
    console.error('[PATCH /api/config]', err);
    return NextResponse.json(
      { error: { code: 'CONFIG_UPDATE_FAILED', message: 'Configuration could not be saved. Please try again.' } },
      { status: 500 }
    );
  }
}
```
  </action>
  <verify>
```bash
grep -n "export.*buildCsvExportStream" src/lib/services/csvExportService.ts && echo "csvExportService OK"
grep -n "export.*getConfig\|export.*patchConfig" src/lib/services/configService.ts && echo "configService OK"
grep -n "export.*GET" src/app/api/dashboard/export/csv/route.ts && echo "csv export route OK"
grep -n "export.*GET\|export.*PATCH" src/app/api/config/route.ts && echo "config route OK"
grep -n "requireSystemOwner" src/app/api/dashboard/export/csv/route.ts && echo "csv auth guard OK"
grep -n "requireSystemOwner" src/app/api/config/route.ts && echo "config auth guard OK"
grep -n "config_audit_log\|configAuditLog" src/lib/services/configService.ts && echo "audit log write OK"
grep -n "Content-Disposition.*attachment" src/app/api/dashboard/export/csv/route.ts && echo "CSV Content-Disposition OK"
npx tsc --noEmit 2>&1 | head -30
```
  </verify>
  <done>
- csvExportService.ts exports buildCsvExportStream; flattens all 6 answer payload types to human-readable strings; columns are: respondent_name, respondent_email, team_type, submission_status, submitted_at, last_modified_at, then one column per question (by question_text); respects same filter params as response list
- configService.ts exports getConfig (returns due_date, launch_date, computed status, last_modified_at, last_modified_by) and patchConfig (updates singleton row + writes config_audit_log with field_changed="due_date", old_value, new_value, changed_by)
- GET /api/dashboard/export/csv streams response with Content-Type: text/csv and Content-Disposition: attachment; filename="assessment-responses-YYYY-MM-DD.csv"; returns 500 EXPORT_FAILED on error
- GET /api/config returns AssessmentConfig with dynamically computed status; returns 500 CONFIG_NOT_FOUND if singleton missing
- PATCH /api/config validates due_date is valid ISO 8601 (400 INVALID_DATE_FORMAT if not); extracts System Owner email from JWT for audit log; returns updated AssessmentConfig; returns 500 CONFIG_UPDATE_FAILED on DB error
- Both config routes enforce requireSystemOwner (403 ACCESS_DENIED for respondent JWTs)
- TypeScript compilation passes with no errors in the modified files
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| {client→API (dashboard)} | HTTP requests from the System Owner browser SPA to /api/dashboard/* and /api/config — JWT in Authorization header crosses into protected server handlers |
| {webhook→handler} | N/A — no webhook surface in this plan |
| {db→render (CSV)} | Stored respondent data (names, emails, free-text answers) extracted from DB and streamed into CSV response — stored content crosses into HTTP response |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01 | Elevation of privilege | All 5 route handlers (`/api/dashboard/responses/route.ts`, `/api/dashboard/responses/[sessionId]/route.ts`, `/api/dashboard/analytics/route.ts`, `/api/dashboard/export/csv/route.ts`, `/api/config/route.ts`) | mitigate | Every handler calls `requireSystemOwner(req)` as the first statement before any DB access; returns 403 `ACCESS_DENIED` if JWT is absent, expired, tampered, or has `role !== "system_owner"`. Applied in `src/lib/middleware` (wave 2a). |
| T-05-02 | Information disclosure | `src/lib/services/csvExportService.ts` — respondent email + free-text answers in CSV stream | mitigate | Access is gated by `requireSystemOwner` in the route handler. DB queries use Drizzle ORM parameterized queries — no raw string concatenation. No respondent data appears in server logs or error responses (catch blocks log `err` object, not the row data). |
| T-05-03 | Tampering | `src/app/api/config/route.ts` PATCH — `due_date` injection via request body | mitigate | `due_date` is validated with `isNaN(Date.parse(body.due_date))` before use; passed to `patchConfig` which binds it as a parameterized Drizzle value in the `UPDATE` statement — never string-concatenated into SQL. |
| T-05-04 | Denial of service | `src/lib/services/analyticsService.ts` — raw SQL `jsonb_array_elements_text` expansion over all responses | accept | Analytics is a System Owner-only route; the user population is small and trusted (pre-configured emails). For v1 scale (≤500 respondents), the aggregation queries are bounded. Risk owner: engineering team; accepted for v1 MVP. Add query timeout or materialized view cache in a follow-on if response counts grow beyond 10k. |
| T-05-05 | Information disclosure | `src/app/api/config/route.ts` — JWT re-parsed to extract `email` for audit log | mitigate | Token is re-verified with `jwtVerify(token, secret)` using the same `JWT_SECRET` as `requireSystemOwner`. Extraction is belt-and-suspenders; if it fails, `ownerEmail` defaults to `'unknown'` and the PATCH still completes — audit log entry is written with `'unknown'` rather than leaking the failure. No token content is returned in response. |
| T-05-06 | Tampering | `src/lib/services/dashboardService.ts` — `search` query param passed to `ilike` | mitigate | `ilike` parameter is passed as a bound value via Drizzle ORM (`ilike(respondents.name, \`%${params.search}%\`)`). Drizzle generates `$1` parameterized SQL — the `%` wildcards are in the application string, not in user-controlled SQL. No SQL injection vector. |
</threat_model>

<verification>
## Wave 5 (2d backend) — Verification

After all tasks complete, verify:

```bash
# 1. Service exports all present
grep -n "export.*getResponseList\|export.*getResponseDetail" src/lib/services/dashboardService.ts && echo "dashboardService EXPORTS OK"
grep -n "export.*getAnalyticsData" src/lib/services/analyticsService.ts && echo "analyticsService EXPORTS OK"
grep -n "export.*buildCsvExportStream" src/lib/services/csvExportService.ts && echo "csvExportService EXPORTS OK"
grep -n "export.*getConfig\|export.*patchConfig" src/lib/services/configService.ts && echo "configService EXPORTS OK"

# 2. All routes apply requireSystemOwner
for f in \
  src/app/api/dashboard/responses/route.ts \
  src/app/api/dashboard/responses/[sessionId]/route.ts \
  src/app/api/dashboard/analytics/route.ts \
  src/app/api/dashboard/export/csv/route.ts \
  src/app/api/config/route.ts; do
  grep -l "requireSystemOwner" "$f" && echo "$f: auth guard OK"
done

# 3. Config audit log write present
grep -n "config_audit_log\|configAuditLog" src/lib/services/configService.ts && echo "AUDIT LOG WRITE OK"

# 4. CSV Content-Disposition header correct
grep -n "assessment-responses" src/app/api/dashboard/export/csv/route.ts && echo "CSV FILENAME PATTERN OK"

# 5. TypeScript compiles clean
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"

# 6. Integration smoke test (requires DATABASE_URL)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer FAKE_TOKEN" \
  http://localhost:3000/api/dashboard/responses | grep -q "401\|403" && echo "AUTH ENFORCEMENT OK"
```
</verification>

<success_criteria>
- GET /api/dashboard/responses: returns PaginatedResponseList with correct columns; supports page, pageSize (max 100), sortBy (6 columns), sortDir, teamType (multi), status, submittedAfter, submittedBefore (inclusive), search (case-insensitive partial match on name+email); returns 400 INVALID_DATE_RANGE when after > before; returns duplicate_count field (always 0 for correct system)
- GET /api/dashboard/responses/:sessionId: returns ResponseDetail with sections in respondent's section_ids_ordered order and all questions + saved answers (null if unanswered); returns 404 RESPONSE_NOT_FOUND for unknown sessionId
- GET /api/dashboard/analytics: returns all four aggregation types — team-type counts, Likert value distributions (1–5 buckets), ranking average ranks (using jsonb_array_elements_text ordinality), choice option counts + percentage; teamType filter applied when provided
- GET /api/dashboard/export/csv: streams CSV with Content-Disposition attachment; filename matches assessment-responses-YYYY-MM-DD.csv; column order: 6 metadata columns then one column per question in display_order; answer payloads rendered as human-readable strings; respects same filter params as response list
- GET /api/config: returns { due_date, launch_date, status (computed), last_modified_at, last_modified_by }; status is dynamically computed: 'upcoming' | 'active' | 'closed'; returns 500 CONFIG_NOT_FOUND if singleton missing
- PATCH /api/config: validates due_date is valid ISO 8601 (400 INVALID_DATE_FORMAT otherwise); updates assessment_config singleton; writes config_audit_log row with changed_by (System Owner email from JWT), field_changed='due_date', old_value, new_value; returns updated AssessmentConfig
- All 5 route handlers return 403 ACCESS_DENIED for non-System-Owner JWTs before any DB access
- TypeScript compiles without errors across all modified files
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/05-SUMMARY.md` with:
- Services implemented (dashboardService, analyticsService, csvExportService, configService) and their exported functions
- API endpoints implemented with exact response shapes
- Analytics aggregation strategy (SQL GROUP BY, jsonb_array_elements_text for ranking, JSONB extraction for Likert/choice)
- CSV flattening strategy per answer payload type
- Config audit log write pattern (patchConfig always writes before returning)
- Any deviations from TechArch or FRD (flag conflicts, do not silently diverge)
</output>
