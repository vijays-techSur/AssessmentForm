'use client';
import type { Question, MultiChoicePayload } from '@/lib/api/types';
import { OtherTextReveal } from './OtherTextReveal';

interface Props {
  question: Question;
  value: MultiChoicePayload | null;
  onChange: (p: MultiChoicePayload) => void;
  readOnly?: boolean;
}

export function MultiChoiceQuestion({ question, value, onChange, readOnly }: Props) {
  const selected = value?.values ?? [];
  const otherText = value?.other_text ?? '';

  const toggle = (optId: string, isOther: boolean) => {
    const next = selected.includes(optId)
      ? selected.filter((v) => v !== optId)
      : [...selected, optId];
    const newOtherText = isOther && !next.includes(optId) ? '' : otherText;
    onChange({ type: 'multi_choice', values: next, other_text: newOtherText || undefined });
  };

  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <div key={opt.option_id}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt.option_id)}
              onChange={() => toggle(opt.option_id, opt.is_other)}
              disabled={readOnly}
              className="accent-blue-600 w-4 h-4"
            />
            <span className="text-sm text-gray-800">{opt.option_text}</span>
          </label>
          {opt.is_other && (
            <OtherTextReveal
              isVisible={selected.includes(opt.option_id)}
              value={otherText}
              onChange={(v) => onChange({ type: 'multi_choice', values: selected, other_text: v || undefined })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
