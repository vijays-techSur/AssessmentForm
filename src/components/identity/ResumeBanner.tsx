'use client';
import type { SessionResponse } from '@/lib/api/types';

interface Props {
  session: SessionResponse;
  onContinue: () => void;
}

export function ResumeBanner({ session, onContinue }: Props) {
  const sectionLabel = session.current_section_index + 1;
  const totalSections = session.section_ids_ordered?.length ?? '?';

  const editDeadline = session.due_date
    ? new Date(session.due_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-lg p-8 space-y-5">
        <div className="bg-green-50 border border-green-300 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-900">Welcome back!</p>
              <p className="text-green-800 text-sm mt-1">Your progress has been loaded.</p>
              <p className="text-green-800 text-sm">
                You left off at Section {sectionLabel} of {totalSections}.
              </p>
              {editDeadline && (
                <p className="text-green-700 text-sm mt-2">
                  Edit window open until: {editDeadline}
                </p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onContinue}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          Continue Assessment →
        </button>
      </div>
    </div>
  );
}
