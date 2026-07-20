import { db } from '@/lib/db';
import { sections, questions, questionOptions } from '../../../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';

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
