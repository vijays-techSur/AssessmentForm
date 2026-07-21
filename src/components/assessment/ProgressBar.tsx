'use client';
import type { SectionSummary } from '@/lib/api/types';

interface Props {
  sections: SectionSummary[];
  currentIndex: number;
  canJump: boolean; // true when submitted + not closed (US-0.5)
  onJump?: (index: number) => void;
}

export function ProgressBar({ sections, currentIndex, canJump, onJump }: Props) {
  return (
    <nav aria-label="Assessment progress" className="flex items-center gap-1 overflow-x-auto py-2">
      {sections.map((section, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        const segmentClass = [
          'flex flex-col items-center flex-1 min-w-0 px-1',
          canJump ? 'cursor-pointer' : 'cursor-default',
        ].join(' ');

        const dotClass = [
          'w-4 h-4 rounded-full border-2 mb-1 transition-colors',
          isCompleted ? 'bg-blue-600 border-blue-600' : '',
          isCurrent ? 'bg-blue-200 border-blue-600' : '',
          !isCompleted && !isCurrent ? 'bg-white border-gray-300' : '',
        ].join(' ');

        const labelClass = 'text-xs text-center leading-tight truncate max-w-full ' +
          (isCurrent ? 'font-semibold text-gray-800' : 'text-gray-500');

        return (
          <div
            key={section.section_id}
            className={segmentClass}
            onClick={() => canJump && onJump?.(idx)}
            role={canJump ? 'button' : undefined}
            tabIndex={canJump ? 0 : undefined}
            onKeyDown={(e) => { if (canJump && (e.key === 'Enter' || e.key === ' ')) onJump?.(idx); }}
            aria-label={`${isCompleted ? 'Completed: ' : isCurrent ? 'Current: ' : 'Upcoming: '}Section ${idx + 1}, ${section.title}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div className={dotClass} />
            <span className={labelClass}>{section.title}</span>
          </div>
        );
      })}
    </nav>
  );
}
