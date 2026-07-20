'use client';
import type { Question, AnswerPayload } from '@/lib/api/types';
import { SingleChoiceQuestion } from './SingleChoiceQuestion';
import { MultiChoiceQuestion } from './MultiChoiceQuestion';
import { LikertQuestion } from './LikertQuestion';
import { RankingQuestion } from './RankingQuestion';
import { FreeTextShortQuestion } from './FreeTextShortQuestion';
import { FreeTextLongQuestion } from './FreeTextLongQuestion';

interface Props {
  question: Question;
  questionNumber: number;
  value: AnswerPayload | null;
  onChange: (payload: AnswerPayload) => void;
  errorMessage?: string;
  readOnly?: boolean;
}

export function QuestionRouter({ question, questionNumber, value, onChange, errorMessage, readOnly }: Props) {
  const label = (
    <p className="text-sm font-medium text-gray-800 mb-3">
      Q{questionNumber}. {question.question_text}
      {question.is_required && <span className="text-red-500 ml-1">*</span>}
    </p>
  );

  const error = errorMessage && (
    <p className="text-red-600 text-xs mt-1" role="alert">{errorMessage}</p>
  );

  return (
    <div className={`rounded-lg border p-4 ${errorMessage ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
      {label}
      {question.question_type === 'single_choice' && (
        <SingleChoiceQuestion question={question} value={value?.type === 'single_choice' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'multi_choice' && (
        <MultiChoiceQuestion question={question} value={value?.type === 'multi_choice' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'likert' && (
        <LikertQuestion question={question} value={value?.type === 'likert' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'ranking' && (
        <RankingQuestion question={question} value={value?.type === 'ranking' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'free_text_short' && (
        <FreeTextShortQuestion question={question} value={value?.type === 'free_text_short' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {question.question_type === 'free_text_long' && (
        <FreeTextLongQuestion question={question} value={value?.type === 'free_text_long' ? value : null} onChange={onChange} readOnly={readOnly} />
      )}
      {error}
    </div>
  );
}
