import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSystemOwnerEmail } from '@/lib/auth/authService';
import { createOrResumeSession } from '@/lib/session/sessionService';
import type { TeamType } from '@/lib/session/sessionService';

// FRD F01 §Validation: email RFC 5322, name min 2 chars, team_type enum
const VALID_TEAM_TYPES: TeamType[] = [
  'program_project',
  'platform_engineering',
  'infrastructure_cloud',
  'data_api_governance',
];

const SessionCreateSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .email('Please enter a valid email address.'),
  name: z
    .string()
    .min(2, 'Please enter your full name (at least 2 characters).')
    .max(200, 'Name is too long')
    .refine((v) => v.trim().length >= 2, 'Please enter your full name (at least 2 characters).'),
  team_type: z.enum(
    ['program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance'] as const,
    { error: () => ({ message: 'Please select a valid team type.' }) }
  ),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = SessionCreateSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues;
      const emailIssue = issues.find((i) => i.path[0] === 'email');
      const nameIssue = issues.find((i) => i.path[0] === 'name');
      const teamTypeIssue = issues.find((i) => i.path[0] === 'team_type');

      if (emailIssue) {
        return NextResponse.json(
          { error: { code: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' } },
          { status: 400 }
        );
      }
      if (nameIssue) {
        return NextResponse.json(
          { error: { code: 'INVALID_NAME', message: 'Please enter your full name (at least 2 characters).' } },
          { status: 400 }
        );
      }
      if (teamTypeIssue) {
        return NextResponse.json(
          { error: { code: 'INVALID_TEAM_TYPE', message: 'Please select a valid team type.' } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: issues[0].message } },
        { status: 400 }
      );
    }

    const { email, name, team_type } = parsed.data;

    // FRD F01 §Validation: System Owner email blocked in respondent flow
    // FRD F07: "SYSTEM_OWNER_CANNOT_RESPOND" — System Owners may not submit assessments
    const isSO = await isSystemOwnerEmail(email);
    if (isSO) {
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_OWNER_CANNOT_RESPOND',
            message: 'This email is registered as a System Owner. Please access the dashboard instead.',
          },
        },
        { status: 403 }
      );
    }

    const sessionResponse = await createOrResumeSession({ email, name, team_type: team_type as TeamType });
    return NextResponse.json(sessionResponse);
  } catch (err) {
    console.error('[POST /api/sessions] Error:', err);
    return NextResponse.json(
      { error: { code: 'SESSION_CREATE_FAILED', message: 'Unable to start your session. Please try again.' } },
      { status: 500 }
    );
  }
}

// Suppress unused variable warning for VALID_TEAM_TYPES — used as documentation/reference
void VALID_TEAM_TYPES;
