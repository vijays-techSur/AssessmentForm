/**
 * emailService — TechArch §2.3, §7.2 INT-01 (stretch goal)
 *
 * sendSubmissionConfirmation: fire-and-forget submission confirmation email.
 *
 * FRD F09: "Optional email confirmation — fire-and-forget; graceful no-op if EMAIL_RELAY_URL unset;
 *           failure logged server-side only."
 *
 * TechArch §7.2: POST /api/notifications/email body: { session_id, email, name, due_date }
 * TechArch §7.2: Failure: LOG only — does not block submission response to respondent.
 * TechArch §7.2: Feature disabled if EMAIL_RELAY_URL env var is not set.
 */
export async function sendSubmissionConfirmation(params: {
  session_id: string;
  email: string;
  name: string;
  due_date: string;
}): Promise<void> {
  const relayUrl = process.env.EMAIL_RELAY_URL;

  // TechArch §7.2: Graceful no-op if EMAIL_RELAY_URL is not set
  if (!relayUrl) {
    return;
  }

  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@assessmentform';

  // TechArch §7.2: Subject: "Assessment Submitted — Developer Platform Evaluation"
  const emailPayload = {
    to: params.email,
    from: fromAddress,
    subject: 'Assessment Submitted — Developer Platform Evaluation',
    // TechArch §7.2 email content
    body: `Dear ${params.name},\n\nYour Developer Platform assessment has been successfully submitted.\n\nYou may update your responses until: ${new Date(params.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\nThank you for your participation.\n\nThe AssessmentForm Team`,
    session_id: params.session_id,
  };

  // Fire-and-forget: do not await; wrap in try/catch for error logging only
  fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  }).catch((err) => {
    // TechArch §7.2: Failure logged server-side only; never surfaces to respondent
    console.error('[emailService] EMAIL_SEND_FAILED:', err?.message ?? err);
  });
}
