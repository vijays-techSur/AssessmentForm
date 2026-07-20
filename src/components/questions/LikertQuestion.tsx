'use client';
import type { Question, LikertPayload } from '@/lib/api/types';

interface Props {
  question: Question;
  value: LikertPayload | null;
  onChange: (p: LikertPayload) => void;
  readOnly?: boolean;
}

export function LikertQuestion({ question, value, onChange, readOnly }: Props) {
  const selected = value?.value ?? null;

  const handleKeyDown = (e: React.KeyboardEvent, current: number) => {
    if (readOnly) return;
    if (e.key === 'ArrowRight' && current < 5) onChange({ type: 'likert', value: (current + 1) as LikertPayload['value'] });
    if (e.key === 'ArrowLeft' && current > 1) onChange({ type: 'likert', value: (current - 1) as LikertPayload['value'] });
  };

  return (
    <div
      role="radiogroup"
      aria-label={`Likert scale 1-5 for: ${question.question_text}`}
      className="space-y-3"
    >
      <div className="flex justify-between text-xs text-gray-500 px-1">
        <span>Strongly Disagree</span>
        <span>Strongly Agree</span>
      </div>
      <div className="flex justify-between gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <label key={n} className="flex flex-col items-center gap-1 cursor-pointer flex-1">
            <input
              type="radio"
              name={question.question_id}
              value={n}
              checked={selected === n}
              onChange={() => onChange({ type: 'likert', value: n })}
              onKeyDown={(e) => handleKeyDown(e, selected ?? 0)}
              disabled={readOnly}
              className="accent-blue-600"
              aria-label={`${n}`}
            />
            <span className="text-sm text-gray-700">{n}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
