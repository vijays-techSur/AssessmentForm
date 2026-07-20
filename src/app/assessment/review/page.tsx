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

  // Redirect to home if session is missing after loading completes (no AuthGuard wrapper)
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/');
    }
  }, [isLoading, session, router]);

  // Load section list for the respondent's team type as soon as session is available
  useEffect(() => {
    if (session && token && !sectionsLoadStarted.current) {
      sectionsLoadStarted.current = true;
      // Read team type from sessionStorage (written by page.tsx at identity form submit)
      const storedTeamType = sessionStorage.getItem('af_team_type');
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
        {/* Show loading indicator while session is resolving */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            Loading review…
          </div>
        )}
        {/* Render ReviewStep as soon as session and token are available.
            Sections may still be loading — ReviewStep renders heading and
            submit button immediately (with empty sections list) so the page
            is not blank during the async section fetch. */}
        {!isLoading && session && token && (
          <ReviewStep
            session={session}
            token={token}
            sections={sections}
            onEditSection={handleEditSection}
            onSubmitSuccess={handleSubmitSuccess}
          />
        )}
        {/* No session after loading completes — redirect handled by useEffect above */}
      </main>
    </div>
  );
}
