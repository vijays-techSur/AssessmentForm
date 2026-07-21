'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ResponseItem } from '@/lib/api/types';
import { putResponses } from '@/lib/api/client';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

// AUTO_SAVE_IDLE_SECONDS read from env var (US-4.2 AC: configurable without code deploy)
const IDLE_SECONDS =
  typeof window !== 'undefined' && (window as unknown as { NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS?: string })
    .NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS
    ? parseInt((window as unknown as { NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS: string }).NEXT_PUBLIC_AUTO_SAVE_IDLE_SECONDS, 10)
    : 30;

async function saveWithRetry(
  fn: () => Promise<void>,
  retries = 3,
  delay = 1000
): Promise<void> {
  try {
    await fn();
  } catch {
    if (retries === 0) throw new Error('Max retries exceeded');
    await new Promise((r) => setTimeout(r, delay));
    return saveWithRetry(fn, retries - 1, delay * 2);
  }
}

export function useAutoSave({
  sessionId,
  token,
  sectionId,
  currentSectionIndex,
  getResponses,
}: {
  sessionId: string;
  token: string;
  sectionId: string;
  currentSectionIndex: number;
  getResponses: () => ResponseItem[];
}) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const performSave = useCallback(async () => {
    setSaveState('saving');
    const items = getResponses();
    try {
      await saveWithRetry(() =>
        putResponses(sessionId, {
          section_id: sectionId,
          current_section_index: currentSectionIndex,
          responses: items,
        }, token).then(() => undefined)
      );
      const now = new Date();
      setLastSavedAt(now);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [sessionId, token, sectionId, currentSectionIndex, getResponses]);

  // Called on any user interaction to reset idle timer (US-4.2 AC)
  const markDirty = useCallback(() => {
    setSaveState('dirty');
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      performSave();
    }, IDLE_SECONDS * 1000);
  }, [performSave]);

  // Called explicitly on Next/Previous navigation (US-4.1 AC)
  const triggerSave = useCallback(async () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    await performSave();
  }, [performSave]);

  return { saveState, lastSavedAt, triggerSave, markDirty };
}
