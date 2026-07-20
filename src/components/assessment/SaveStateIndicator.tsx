'use client';
import type { SaveState } from '@/hooks/useAutoSave';

interface Props {
  saveState: SaveState;
  lastSavedAt: Date | null;
}

export function SaveStateIndicator({ saveState, lastSavedAt }: Props) {
  const timeStr = lastSavedAt
    ? lastSavedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <span className="text-sm text-gray-500 flex items-center gap-1" aria-live="polite">
      {saveState === 'saving' && (
        <><span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" />Saving…</>
      )}
      {saveState === 'saved' && (
        <><span className="text-green-600">💾</span>Saved at {timeStr}</>
      )}
      {saveState === 'dirty' && 'Unsaved changes'}
      {saveState === 'error' && 'Unsaved changes — server error. Retrying…'}
      {saveState === 'idle' && lastSavedAt && `Saved at ${timeStr}`}
    </span>
  );
}
