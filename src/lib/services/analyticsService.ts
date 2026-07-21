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
      let optionCountRows: { option_id: string; count: number }[];
      if (q.question_type === 'single_choice') {
        optionCountRows = (await db.execute(
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
        optionCountRows = (await db.execute(
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
      const counts = optionCountRows
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
