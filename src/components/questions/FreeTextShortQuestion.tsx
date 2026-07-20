'use client';
import type { Question, FreeTextShortPayload } from '@/lib/api/types';

interface Props {
  question: Question;
  value: FreeTextShortPayload | null;
  onChange: (p: FreeTextShortPayload) => void;
  readOnly?: boolean;
}

const MAX = 500;

export function FreeTextShortQuestion({ question, value, onChange, readOnly }: Props) {
  const text = value?.value ?? '';
  const counterClass = text.length >= 480 ? 'text-red-500' : text.length >= 400 ? 'text-amber-500' : 'text-gray-400';

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => onChange({ type: 'free_text_short', value: e.target.value })}
        maxLength={MAX}
        disabled={readOnly}
        placeholder={question.help_text ?? undefined}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={question.question_text}
      />
      <p className={`text-xs mt-1 text-right ${counterClass}`}>{text.length}/{MAX}</p>
    </div>
  );
}
