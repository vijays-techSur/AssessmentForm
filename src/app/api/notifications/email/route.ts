import { NextRequest, NextResponse } from 'next/server';
import { sendSubmissionConfirmation } from '@/lib/services/emailService';
import { z } from 'zod';

const EmailNotificationSchema = z.object({
  session_id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  due_date: z.string().min(1),
});

/**
 * POST /api/notifications/email — Submission Confirmation Email (stretch goal)
 * TechArch §4.3
 *
 * Internal server-to-server only (no external auth; called from submissionService).
 * Fire-and-forget: always returns 200 { sent: true }.
 * Failure logged server-side only; never surfaced to respondent.
 * No-op if EMAIL_RELAY_URL env var is not set.
 *
 * Request: { session_id, email, name, due_date }
 * Response 200: { sent: true }
 * Errors: 500 EMAIL_SEND_FAILED (logged only — response still 200)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ sent: false, error: 'Invalid body' }, { status: 400 });
  }

  const parsed = EmailNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ sent: false, error: 'Invalid parameters' }, { status: 400 });
  }

  // Fire-and-forget — always return 200 regardless of email outcome
  sendSubmissionConfirmation(parsed.data);

  return NextResponse.json({ sent: true }, { status: 200 });
}
