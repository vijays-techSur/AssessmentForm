'use client';

interface Props {
  name: string;
  dueDate: string | null;
  wasResubmit: boolean;
  lastModifiedAt?: string;
  email?: string;
  onReturn: () => void;
}

function formatDueDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// SubmissionConfirmation — UX-Mockup Screen 04 (/assessment/confirmation)
// TechArch §2.1 SPEC-COMP: SubmissionConfirmation.tsx
// US-9.1 AC: Shown only after successful POST /api/submissions/:sessionId
// US-9.2 AC: Re-submit variant shows "Assessment Updated!" and no-duplicate message
export function SubmissionConfirmation({ name, dueDate, wasResubmit, lastModifiedAt, email, onReturn }: Props) {
  const formattedDue = dueDate ? formatDueDate(dueDate) : null;

  const formattedLastModified = lastModifiedAt
    ? new Date(lastModifiedAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-lg p-8 space-y-6 text-center">
        {/* Success icon */}
        <div className="text-5xl">✅</div>

        {/* Heading — first submit vs update */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {wasResubmit ? 'Assessment Updated!' : 'Assessment Submitted!'}
          </h1>

          {/* Personalized message — US-9.1 AC */}
          {wasResubmit ? (
            <div className="mt-3 space-y-1">
              <p className="text-gray-700 text-sm">
                Your submission has been updated{name ? `, ${name}` : ''}.
              </p>
              {/* US-9.1 AC re-submit variant: "no duplicate created" */}
              <p className="text-gray-600 text-sm">
                This replaces your previous response — no duplicate was created.
              </p>
              {email && (
                <p className="text-gray-500 text-xs mt-1">
                  One record exists for {email}
                </p>
              )}
              {formattedLastModified && (
                <p className="text-gray-500 text-xs">
                  Last modified: {formattedLastModified}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-700 text-sm mt-3">
              Thank you{name ? `, ${name}` : ''}. Your assessment has been submitted successfully.
            </p>
          )}
        </div>

        {/* Edit window notice card — US-9.1 AC */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-left">
          {formattedDue ? (
            <>
              <div className="flex items-start gap-2">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-blue-800 font-medium text-sm">
                    {wasResubmit ? 'Edit window closes:' : 'You can return to edit your responses until:'}
                  </p>
                  <p className="text-blue-900 font-semibold text-base mt-1">{formattedDue}</p>
                </div>
              </div>
              <p className="text-blue-700 text-xs mt-3">
                To update your answers, revisit this link and re-enter your email address.
              </p>
            </>
          ) : (
            // US-9.1 AC: due_date unavailable fallback
            <p className="text-blue-700 text-sm">
              Contact the System Owner for deadline information.
            </p>
          )}
        </div>

        {/* Return to Assessment button — US-9.1 AC: navigates to Review Step in editable mode */}
        <button
          onClick={onReturn}
          className="w-full py-3 px-4 rounded-lg border border-blue-600 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          Return to Assessment to Review / Edit Answers
        </button>
      </div>
    </div>
  );
}
