import { db } from '@/lib/db';
import { sections, sectionRouting, questions } from '../../../drizzle/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

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
 * 5. Fetch question_count per section via count query on questions table.
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

  // FRD F03 §Validation: Identify missing mandatory sections
  const missingMandatoryIds: string[] = [];
  for (const mandatoryId of MANDATORY_SECTION_IDS) {
    if (!routedIds.has(mandatoryId)) {
      // Log server warning (FRD: MANDATORY_SECTION_AUTO_INSERTED — server log only)
      console.warn(
        `[sectionRoutingService] MANDATORY_SECTION_AUTO_INSERTED: ${mandatoryId} was missing from routing config for team_type=${teamType}. Auto-inserting.`
      );
      missingMandatoryIds.push(mandatoryId);
    }
  }

  // Fetch section metadata for any auto-inserted mandatory sections in one query
  let allRows = [...routingRows];
  if (missingMandatoryIds.length > 0) {
    const missingRows = await db
      .select({
        section_id: sections.id,
        display_order: sections.display_order,
        title: sections.title,
        description: sections.description,
        is_mandatory: sections.is_mandatory,
      })
      .from(sections)
      .where(inArray(sections.id, missingMandatoryIds));

    // Append with placeholder display_order (will be re-ordered below)
    for (const row of missingRows) {
      allRows.push({ ...row, display_order: -1 });
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

  // Fetch question counts per section using a count query for efficiency
  const sectionIds = ordered.map((r) => r.section_id);

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
