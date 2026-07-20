import { NextRequest, NextResponse } from 'next/server';
import { jwtMiddleware } from '@/lib/auth/jwtMiddleware';
import { getQuestionsForSection } from '@/lib/sections/questionService';
import type { AuthenticatedRequest } from '@/types/auth';

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
async function handleGet(
  req: AuthenticatedRequest,
  sectionId: string
): Promise<NextResponse> {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
): Promise<NextResponse> {
  const { sectionId } = await params;
  return jwtMiddleware(request, (authedReq) => handleGet(authedReq, sectionId));
}
