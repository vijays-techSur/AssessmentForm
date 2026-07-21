'use client';
import { useState, useEffect, useCallback } from 'react';
import type { SessionResponse, Question, AnswerPayload, SectionSummary } from '@/lib/api/types';
import { getQuestions, submitAssessment } from '@/lib/api/client';
import { QuestionRouter } from '@/components/questions/QuestionRouter';

export interface SubmitResult {
  submitted_at: string;
  due_date: string;
  edit_window_open: boolean;
  was_resubmit: boolean;
}

interface SectionAnswerSummary {
  section: SectionSummary;
  questions: Question[];
}

interface Props {
  session: SessionResponse;
  token: string;
  sections: SectionSummary[];
  onEditSection: (sectionIndex: number) => void;
  onSubmitSuccess: (result: SubmitResult) => void;
}

// Derive whether a question has been answered (for read-only summary completeness check)
function hasAnswer(q: Question, answers: Record<string, AnswerPayload>): boolean {
  const a = answers[q.question_id];
  if (!a) return false;
  if (a.type === 'single_choice') return !!a.value;
  if (a.type === 'multi_choice') return a.values.length > 0;
  if (a.type === 'likert') return typeof a.value === 'number';
  if (a.type === 'ranking') return a.order.length > 0;
  if (a.type === 'free_text_short' || a.type === 'free_text_long') return a.value.trim().length > 0;
  return false;
}

// ReviewStep — UX-Mockup Screen 03 (/assessment/review)
// TechArch §2.1 SPEC-COMP: ReviewStep.tsx
// US-0.3: All sections shown with read-only answers; Edit link per section
// US-5.1: Submit button ONLY on Review Step (not on section screens)
export function ReviewStep({ session, token, sections, onEditSection, onSubmitSuccess }: Props) {
  const [sectionData, setSectionData] = useState<SectionAnswerSummary[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [incompleteSections, setIncompleteSections] = useState<string[]>([]);

  // Build answer lookup from session.saved_responses
  const answersMap: Record<string, AnswerPayload> = {};
  for (const r of session.saved_responses) {
    answersMap[r.question_id] = r.answer_payload as AnswerPayload;
  }

  // Load questions for all sections in parallel
  useEffect(() => {
    async function loadAllQuestions() {
      setLoadingQuestions(true);
      try {
        const results = await Promise.all(
          sections.map(async (s) => ({
            section: s,
            questions: (await getQuestions(s.section_id, token)).questions,
          }))
        );
        setSectionData(results);

        // Identify sections with unanswered required questions (US-0.3 AC)
        const gaps: string[] = [];
        for (const { section, questions } of results) {
          const hasGap = questions.some((q) => q.is_required && !hasAnswer(q, answersMap));
          if (hasGap) gaps.push(section.title);
        }
        setIncompleteSections(gaps);
      } finally {
        setLoadingQuestions(false);
      }
    }
    if (sections.length > 0) loadAllQuestions();
    else setLoadingQuestions(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, token]);

  const handleSubmit = useCallback(async () => {
    if (incompleteSections.length > 0) return; // Guard: button should already be disabled
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const result = await submitAssessment(session.session_id, token);
      // Determine if this is a re-submission (session was already submitted before)
      const wasResubmit = session.submission_status === 'submitted';
      onSubmitSuccess({
        submitted_at: result.submitted_at,
        due_date: result.due_date,
        edit_window_open: result.edit_window_open,
        was_resubmit: wasResubmit,
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'ASSESSMENT_CLOSED') {
        setSubmitError('The assessment due date has passed. No further submissions are accepted.');
      } else if (e.code === 'MANDATORY_QUESTIONS_INCOMPLETE') {
        setSubmitError('Please complete all required questions before submitting.');
      } else {
        setSubmitError('Submission could not be processed. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  }, [session, token, incompleteSections, onSubmitSuccess]);

  const formattedDue = session.due_date
    ? new Date(session.due_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  // NOTE: We do NOT gate the entire component on loadingQuestions.
  // The Submit button must be visible immediately once the session resolves (US-5.1).
  // Section cards are shown once question data is loaded; the loading indicator
  // is scoped to the cards area only so the Submit button is always reachable.

  const isSubmitDisabled = incompleteSections.length > 0 || submitLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page heading (UX Screen 03) */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Your Answers</h1>
        <p className="text-gray-600 text-sm mt-1">
          Please review your answers below. Click <strong>Edit</strong> to make changes to any section.
        </p>
      </div>

      {/* Completeness warning (US-0.3 AC, US-5.1 AC) */}
      {!loadingQuestions && incompleteSections.length > 0 && (
        <div role="alert" className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-1">⚠ Some required questions are unanswered:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {incompleteSections.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
          <p className="mt-2">Please edit those sections before submitting.</p>
        </div>
      )}

      {/* Submit error banner */}
      {submitError && (
        <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm">
          ⚠ {submitError}
        </div>
      )}

      {/* Section summary cards — shown once question data has loaded (UX Screen 03) */}
      {loadingQuestions ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          Loading your answers for review…
        </div>
      ) : sectionData.map(({ section, questions }, sectionIndex) => {
        const sectionHasGap = questions.some((q) => q.is_required && !hasAnswer(q, answersMap));
        return (
          <div
            key={section.section_id}
            className={`border rounded-lg p-5 space-y-4 ${sectionHasGap ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-base">
                Section {sectionIndex + 1}: {section.title}
              </h2>
              {/* Edit link — US-0.3 AC: Each section has an Edit link returning to that section */}
              <button
                onClick={() => onEditSection(sectionIndex)}
                className="text-blue-600 text-sm hover:underline font-medium"
                aria-label={`Edit Section ${sectionIndex + 1}: ${section.title}`}
              >
                Edit
              </button>
            </div>

            {/* Read-only question list using QuestionRouter with readOnly=true */}
            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const answered = hasAnswer(q, answersMap);
                return (
                  <div key={q.question_id}>
                    {answered ? (
                      <QuestionRouter
                        question={q}
                        questionNumber={qIdx + 1}
                        value={answersMap[q.question_id] ?? null}
                        onChange={() => {/* read-only: no-op */}}
                        readOnly
                      />
                    ) : (
                      <div className="flex items-start gap-2 py-2">
                        <span className="text-amber-600">⚠</span>
                        <div>
                          <span className="text-sm text-gray-700">
                            Q{qIdx + 1}. {q.question_text}
                            {q.is_required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {q.is_required ? 'Required — not yet answered' : 'Not answered'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Navigation and Submit (UX Screen 03) */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        {formattedDue && (
          <p className="text-xs text-gray-500 text-center">
            By submitting, you confirm these answers reflect your team&apos;s current assessment.
            You can edit until {formattedDue}.
          </p>
        )}

        {/* Submit Assessment — US-5.1 AC: Submit button is ONLY on Review Step */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          aria-busy={submitLoading}
        >
          {submitLoading ? 'Submitting your assessment…' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
}
