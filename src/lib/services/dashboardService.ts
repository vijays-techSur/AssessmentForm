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
  const conditions: ReturnType<typeof eq>[] = [];

  if (params.status && params.status !== 'all') {
    conditions.push(eq(sessions.submission_status, params.status));
  }

  if (params.teamType && params.teamType.length > 0) {
    conditions.push(
      sql`${respondents.team_type} = ANY(${params.teamType})` as ReturnType<typeof eq>
    );
  }

  if (params.submittedAfter) {
    conditions.push(gte(sessions.submitted_at, params.submittedAfter) as ReturnType<typeof eq>);
  }

  if (params.submittedBefore) {
    conditions.push(lte(sessions.submitted_at, params.submittedBefore) as ReturnType<typeof eq>);
  }

  if (params.search) {
    // F06: case-insensitive partial match against name and email
    conditions.push(
      or(
        ilike(respondents.name, `%${params.search}%`),
        ilike(respondents.email, `%${params.search}%`)
      ) as ReturnType<typeof eq>
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
