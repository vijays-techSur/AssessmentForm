'use client';
import type { Question, SingleChoicePayload } from '@/lib/api/types';
import { OtherTextReveal } from './OtherTextReveal';

interface Props {
  question: Question;
  value: SingleChoicePayload | null;
  onChange: (p: SingleChoicePayload) => void;
  readOnly?: boolean;
}

export function SingleChoiceQuestion({ question, value, onChange, readOnly }: Props) {
  const selected = value?.value ?? '';
  const otherText = value?.other_text ?? '';

  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <div key={opt.option_id}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={question.question_id}
              value={opt.option_id}
              checked={selected === opt.option_id}
              onChange={() => onChange({ type: 'single_choice', value: opt.option_id, other_text: opt.is_other ? otherText : undefined })}
              disabled={readOnly}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-800">{opt.option_text}</span>
          </label>
          {opt.is_other && (
            <OtherTextReveal
              isVisible={selected === opt.option_id}
              value={otherText}
              onChange={(v) => onChange({ type: 'single_choice', value: opt.option_id, other_text: v })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
