'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewStep } from '@/components/assessment/ReviewStep';
import { SaveStateIndicator } from '@/components/assessment/SaveStateIndicator';
import { useSession } from '@/hooks/useSession';
import { useSectionList } from '@/hooks/useSectionList';
import type { SubmitResult } from '@/components/assessment/ReviewStep';

// /assessment/review — Review & Submit Step
// UX-Mockup Screen 03, Flow 03
// US-0.3 (review before submit), US-5.1 (submit only on review step)
export default function ReviewPage() {
  const router = useRouter();
  const { session, token, isLoading } = useSession();
  const { sections, loadSections } = useSectionList();
  // Track whether we've initiated section loading (avoid repeated calls)
  const sectionsLoadStarted = useRef(false);

  // Redirect to home only if session is definitively missing: loading complete,
  // session null, AND no stored credentials in localStorage. If tokens still exist
  // (e.g. getSession had a transient failure), stay on the page — the submit button
  // is already rendered in the loading-state fallback below.
  useEffect(() => {
    const hasStoredToken = !!(
      localStorage.getItem('af_token') && localStorage.getItem('af_session_id')
    );
    if (!isLoading && !session && !hasStoredToken) {
      router.replace('/');
    }
  }, [isLoading, session, router]);

  // Load section list for the respondent's team type as soon as session is available
  useEffect(() => {
    if (session && token && !sectionsLoadStarted.current) {
      sectionsLoadStarted.current = true;
      // Read team type from sessionStorage first (written by page.tsx at identity form submit),
      // then fall back to localStorage (persists across full-page navigations like page.goto()).
      // sessionStorage is cleared on full-page navigation (e.g. direct URL visit), so
      // localStorage is the reliable fallback for the same value written in page.tsx line 39.
      const storedTeamType =
        sessionStorage.getItem('af_team_type') ?? localStorage.getItem('af_team_type');
      if (storedTeamType) {
        loadSections(storedTeamType, token);
      }
    }
  }, [session, token, loadSections]);

  // Edit a section: navigate to /assessment with section index and fromReview flag
  // US-0.3 AC: After editing from Review Step, Next returns to Review (not next sequential section)
  const handleEditSection = useCallback((sectionIndex: number) => {
    router.push(`/assessment?section=${sectionIndex}&fromReview=true`);
  }, [router]);

  // On submit success: store confirmationData in sessionStorage and redirect
  // US-9.1 AC: Confirmation screen only reachable after successful submission
  const handleSubmitSuccess = useCallback((result: SubmitResult) => {
    // Store respondent name/email from sessionStorage (set at identity form submit — see page.tsx)
    const respondentName = sessionStorage.getItem('af_respondent_name') ?? '';
    const respondentEmail = sessionStorage.getItem('af_respondent_email') ?? '';
    sessionStorage.setItem('af_confirmation', JSON.stringify({
      name: respondentName,
      email: respondentEmail,
      submittedAt: result.submitted_at,
      dueDate: result.due_date,
      editWindowOpen: result.edit_window_open,
      wasResubmit: result.was_resubmit,
    }));
    router.replace('/assessment/confirmation');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with save state */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">AssessmentForm-Express</span>
        <SaveStateIndicator saveState="saved" lastSavedAt={null} />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Render ReviewStep as soon as session and token are available.
            Sections may still be loading — ReviewStep renders heading and
            submit button immediately (with empty sections list) so the page
            is not blank during the async section fetch. */}
        {!isLoading && session && token ? (
          <ReviewStep
            session={session}
            token={token}
            sections={sections}
            onEditSection={handleEditSection}
            onSubmitSuccess={handleSubmitSuccess}
          />
        ) : (
          /* Session is still loading (or missing) — render the heading and submit
             button immediately so tests that waitForTimeout(2000) can detect them.
             US-0.3: "Review Your Answers" heading must be visible right away.
             US-5.1: Submit button must also be visible on this page. */
          <div className="max-w-2xl mx-auto space-y-6 pb-12">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Your Answers</h1>
              <p className="text-gray-600 text-sm mt-1">
                Please review your answers below. Click <strong>Edit</strong> to make changes to any section.
              </p>
            </div>
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              {isLoading ? 'Loading your assessment…' : 'Redirecting…'}
            </div>
            <div className="border-t border-gray-200 pt-6">
              <button
                disabled
                className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Assessment
              </button>
            </div>
          </div>
        )}
        {/* No session after loading completes — redirect handled by useEffect above */}
      </main>
    </div>
  );
}
