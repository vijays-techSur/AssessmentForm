import { NextRequest, NextResponse } from 'next/server';
import { jwtMiddleware } from '@/lib/auth/jwtMiddleware';
import { getSectionsForTeamType, isValidTeamType } from '@/lib/sections/sectionRoutingService';
import type { AuthenticatedRequest } from '@/types/auth';

/**
 * GET /api/sections?teamType={teamType}
 *
 * TechArch §4.3: Returns { sections: SectionSummary[] } for the given team type.
 * FRD F03: Mandatory sections always included; feedback_adaptability always last.
 *
 * Auth: Bearer JWT (jwtMiddleware — any authenticated role)
 * Query params:
 *   teamType (required): 'program_project' | 'platform_engineering' | 'infrastructure_cloud' | 'data_api_governance'
 *
 * Response 200: { sections: SectionSummary[] }
 * Response 400: { error: { code: "INVALID_TEAM_TYPE", message: "..." } }
 * Response 401: { error: { code: "AUTH_REQUIRED" | "TOKEN_EXPIRED" | "TOKEN_INVALID", message: "..." } }
 * Response 500: { error: { code: "SECTION_ROUTING_EMPTY" | "SECTION_LIMIT_EXCEEDED", message: "..." } }
 */
async function handleGet(req: AuthenticatedRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const teamType = searchParams.get('teamType');

  // FRD F03 §Validation: teamType must be one of four valid values
  if (!teamType || !isValidTeamType(teamType)) {
    return NextResponse.json(
      { error: { code: 'INVALID_TEAM_TYPE', message: 'The selected team type is not recognized.' } },
      { status: 400 }
    );
  }

  try {
    const sections = await getSectionsForTeamType(teamType);
    return NextResponse.json({ sections }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string; statusCode?: number };
    const code = error.code ?? 'INTERNAL_ERROR';
    const message = error.message ?? 'An unexpected error occurred.';
    const status = error.statusCode ?? 500;
    return NextResponse.json({ error: { code, message } }, { status });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return jwtMiddleware(request, handleGet);
}
