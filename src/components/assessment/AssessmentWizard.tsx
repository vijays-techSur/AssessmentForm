'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SessionResponse, SectionSummary, Question, AnswerPayload, ResponseItem } from '@/lib/api/types';
import { useSectionList } from '@/hooks/useSectionList';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getQuestions } from '@/lib/api/client';
import { ProgressBar } from './ProgressBar';
import { SectionScreen } from './SectionScreen';
import { SaveStateIndicator } from './SaveStateIndicator';

interface Props {
  session: SessionResponse;
  token: string;
  onSubmitRedirect?: () => void;
}

export function AssessmentWizard({ session, token }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // US-0.3 AC: fromReview param signals edit-from-review mode; Next returns to /assessment/review
  const fromReview = searchParams.get('fromReview') === 'true';
  const initialSection = parseInt(searchParams.get('section') ?? '', 10);
  const { sections, loadSections } = useSectionList();
  // Use section index from URL param when navigating back from review (US-0.3 AC)
  const [currentIndex, setCurrentIndex] = useState(
    !isNaN(initialSection) && initialSection >= 0 ? initialSection : session.current_section_index
  );
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerPayload>>(() => {
    const initial: Record<string, AnswerPayload> = {};
    for (const r of session.saved_responses) {
      initial[r.question_id] = r.answer_payload;
    }
    return initial;
  });
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const teamType = useRef<string>('');

  // Determine display modes from session
  const isReEntry = session.submission_status === 'submitted' && !session.is_closed;
  const isClosed = session.is_closed;
  const canJump = isReEntry; // US-0.5: clickable only when submitted + open

  // Load section list on mount
  useEffect(() => {
    // Store teamType in localStorage at session creation (see page.tsx)
    // then read it back here to fetch the correct section list
    const storedTeamType = localStorage.getItem('af_team_type') ?? '';
    teamType.current = storedTeamType;
    if (storedTeamType) {
      loadSections(storedTeamType, token);
    }
  }, [token, loadSections]);

  // Load questions for current section
  const currentSection: SectionSummary | null = sections[currentIndex] ?? null;
  useEffect(() => {
    if (!currentSection) return;
    setIsLoadingQuestions(true);
    getQuestions(currentSection.section_id, token)
      .then((data) => setCurrentQuestions(data.questions))
      .catch(console.error)
      .finally(() => setIsLoadingQuestions(false));
  }, [currentSection?.section_id, token]);

  // Build ResponseItem[] for the current section (for auto-save)
  const getResponses = useCallback((): ResponseItem[] =>
    currentQuestions
      .filter((q) => !!answers[q.question_id])
      .map((q) => ({ question_id: q.question_id, answer_payload: answers[q.question_id] })),
    [currentQuestions, answers]
  );

  const { saveState, lastSavedAt, triggerSave, markDirty } = useAutoSave({
    sessionId: session.session_id,
    token,
    sectionId: currentSection?.section_id ?? '',
    currentSectionIndex: currentIndex,
    getResponses,
  });

  const handleAnswerChange = useCallback((questionId: string, payload: AnswerPayload) => {
    setAnswers((prev) => ({ ...prev, [questionId]: payload }));
    markDirty();
  }, [markDirty]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleNext = useCallback(async () => {
    setSaveError(null);
    const saved = await triggerSave(); // US-4.1: auto-save on navigation
    if (!saved) {
      setSaveError('Your answers could not be saved. Please check your connection and try again.');
      return;
    }
    if (fromReview) {
      // US-0.3 AC: After editing from Review Step, Next returns to Review Step (not next sequential section)
      router.push('/assessment/review');
      return;
    }
    if (currentIndex >= sections.length - 1) {
      router.push('/assessment/review');
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, sections.length, triggerSave, router, fromReview]);

  const handlePrevious = useCallback(async () => {
    setSaveError(null);
    const saved = await triggerSave(); // US-4.1: auto-save on Previous too
    if (!saved) {
      setSaveError('Your answers could not be saved. Please check your connection and try again.');
      return;
    }
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, [triggerSave]);

  const handleJump = useCallback(async (index: number) => {
    if (!canJump) return;
    setSaveError(null);
    const saved = await triggerSave();
    if (!saved) {
      setSaveError('Your answers could not be saved. Please check your connection and try again.');
      return;
    }
    setCurrentIndex(index);
  }, [canJump, triggerSave]);

  if (!sections.length || !currentSection) {
    return <div className="flex justify-center items-center h-64 text-gray-500">Loading assessment…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <span className="font-semibold text-gray-800">Developer Platform Assessment</span>
        <SaveStateIndicator saveState={saveState} lastSavedAt={lastSavedAt} />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <ProgressBar
          sections={sections}
          currentIndex={currentIndex}
          canJump={canJump}
          onJump={handleJump}
        />

        <p className="text-sm text-gray-500">
          Section {currentIndex + 1} of {sections.length} — {currentSection.title}
        </p>

        {saveError && (
          <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm">
            ⚠ {saveError}
          </div>
        )}

        {isLoadingQuestions ? (
          <div className="text-gray-400 py-8 text-center">Loading questions…</div>
        ) : (
          <SectionScreen
            sectionTitle={currentSection.title}
            questions={currentQuestions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onNext={handleNext}
            onPrevious={currentIndex > 0 ? handlePrevious : undefined}
            isFirstSection={currentIndex === 0}
            isLastSection={currentIndex === sections.length - 1}
            isReadOnly={isClosed}
            isClosed={isClosed}
            isReEntry={isReEntry}
            dueDate={session.due_date}
          />
        )}
      </main>
    </div>
  );
}
