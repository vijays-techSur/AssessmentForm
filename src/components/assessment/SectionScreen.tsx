'use client';
import { useState, useCallback } from 'react';
import type { Question, AnswerPayload } from '@/lib/api/types';
import { QuestionRouter } from '@/components/questions/QuestionRouter';

interface Props {
  sectionTitle: string;
  questions: Question[];
  answers: Record<string, AnswerPayload>;
  onAnswerChange: (questionId: string, payload: AnswerPayload) => void;
  onNext: () => void;
  onPrevious?: () => void;
  isFirstSection: boolean;
  isLastSection: boolean;
  isReadOnly?: boolean;
  isClosed?: boolean;
  isReEntry?: boolean;
  dueDate?: string;
}

function isFilled(q: Question, answers: Record<string, AnswerPayload>): boolean {
  const a = answers[q.question_id];
  if (!a) return false;
  if (a.type === 'single_choice') return !!a.value;
  if (a.type === 'multi_choice') return a.values.length > 0;
  if (a.type === 'likert') return typeof a.value === 'number';
  if (a.type === 'ranking') return a.order.length > 0;
  if (a.type === 'free_text_short' || a.type === 'free_text_long') return a.value.trim().length > 0;
  return false;
}

export function SectionScreen({
  sectionTitle, questions, answers, onAnswerChange,
  onNext, onPrevious, isFirstSection, isLastSection,
  isReadOnly, isClosed, isReEntry, dueDate,
}: Props) {
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [sectionError, setSectionError] = useState('');

  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const handleNext = useCallback(() => {
    if (isReadOnly) { onNext(); return; }
    // Validate required questions (US-0.4 AC)
    const errors: Record<string, string> = {};
    for (const q of questions) {
      if (q.is_required && !isFilled(q, answers)) {
        errors[q.question_id] = 'This question requires an answer.';
      }
    }
    if (Object.keys(errors).length > 0) {
      setQuestionErrors(errors);
      setSectionError('Please answer all required questions before continuing.');
      return;
    }
    setQuestionErrors({});
    setSectionError('');
    onNext();
  }, [questions, answers, isReadOnly, onNext]);

  return (
    <div className="space-y-6">
      {/* Assessment Closed Banner (US-9.3) */}
      {isClosed && (
        <div role="alert" className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4 flex gap-3">
          <span>🔒</span>
          <p className="text-sm">This assessment is now closed. Your responses are saved and have been submitted to the System Owner.</p>
        </div>
      )}

      {/* Re-Entry Banner (US-9.2) */}
      {isReEntry && !isClosed && (
        <div role="alert" className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-4 flex gap-3">
          <span>⚠</span>
          <p className="text-sm">
            You&apos;ve already submitted your assessment.{' '}
            {formattedDue ? `You can update your answers until ${formattedDue}.` : 'Edit window is open.'}
          </p>
        </div>
      )}

      {/* Section title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{sectionTitle}</h2>
      </div>

      {/* Validation error banner (US-0.4) */}
      {sectionError && (
        <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm">
          ⚠ {sectionError}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((question, idx) => (
          <QuestionRouter
            key={question.question_id}
            question={question}
            questionNumber={idx + 1}
            value={answers[question.question_id] ?? null}
            onChange={(payload) => onAnswerChange(question.question_id, payload)}
            errorMessage={questionErrors[question.question_id]}
            readOnly={isReadOnly || isClosed}
          />
        ))}
      </div>

      {/* Navigation controls (UX Screen 01) */}
      {!isClosed && (
        <div className="flex justify-between pt-6 border-t border-gray-200">
          {!isFirstSection && onPrevious ? (
            <button
              onClick={onPrevious}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isLastSection ? 'Review Answers' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
