import { db } from '@/lib/db';
import { sessions, respondents, responses, questions } from '../../../drizzle/schema';
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
  const conditions: ReturnType<typeof eq>[] = [];
  if (params.status && params.status !== 'all') {
    conditions.push(eq(sessions.submission_status, params.status));
  }
  if (params.teamType && params.teamType.length > 0) {
    conditions.push(sql`${respondents.team_type} = ANY(${params.teamType})` as ReturnType<typeof eq>);
  }
  if (params.submittedAfter) {
    conditions.push(gte(sessions.submitted_at, params.submittedAfter) as ReturnType<typeof eq>);
  }
  if (params.submittedBefore) {
    conditions.push(lte(sessions.submitted_at, params.submittedBefore) as ReturnType<typeof eq>);
  }
  if (params.search) {
    conditions.push(or(
      ilike(respondents.name, `%${params.search}%`),
      ilike(respondents.email, `%${params.search}%`)
    ) as ReturnType<typeof eq>);
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

  // Stream via csv-stringify (row-by-row async generator)
  const rows = [headers, ...dataRows];
  const stream = Readable.from(
    (async function* () {
      for (const row of rows) {
        yield await new Promise<string>((resolve, reject) => {
          stringify([row], (err: Error | null | undefined, output: string | undefined) => {
            if (err) reject(err);
            else resolve(output ?? '');
          });
        });
      }
    })()
  );

  return stream;
}
