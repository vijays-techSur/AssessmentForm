'use client';
import type { Question, FreeTextLongPayload } from '@/lib/api/types';

interface Props {
  question: Question;
  value: FreeTextLongPayload | null;
  onChange: (p: FreeTextLongPayload) => void;
  readOnly?: boolean;
}

const MAX = 2000;

export function FreeTextLongQuestion({ question, value, onChange, readOnly }: Props) {
  const text = value?.value ?? '';
  const counterClass = text.length >= 1950 ? 'text-red-500' : text.length >= 1800 ? 'text-amber-500' : 'text-gray-400';

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => onChange({ type: 'free_text_long', value: e.target.value })}
        maxLength={MAX}
        disabled={readOnly}
        rows={5}
        placeholder={question.help_text ?? undefined}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        aria-label={question.question_text}
      />
      <p className={`text-xs mt-1 text-right ${counterClass}`}>{text.length}/{MAX}</p>
    </div>
  );
}
