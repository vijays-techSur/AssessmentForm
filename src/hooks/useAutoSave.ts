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

  // Use refs for all save parameters so performSave always reads the latest
  // values without needing to be recreated (fixes stale closure bug where
  // getResponses captured an empty currentQuestions on first render).
  const sessionIdRef = useRef(sessionId);
  const tokenRef = useRef(token);
  const sectionIdRef = useRef(sectionId);
  const sectionIndexRef = useRef(currentSectionIndex);
  const getResponsesRef = useRef(getResponses);

  // Keep refs in sync on every render
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { sectionIdRef.current = sectionId; }, [sectionId]);
  useEffect(() => { sectionIndexRef.current = currentSectionIndex; }, [currentSectionIndex]);
  useEffect(() => { getResponsesRef.current = getResponses; }, [getResponses]);

  // Clear idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // performSave reads from refs — always gets the latest values, never stale
  const performSave = useCallback(async (): Promise<boolean> => {
    setSaveState('saving');
    const items = getResponsesRef.current();
    try {
      await saveWithRetry(() =>
        putResponses(sessionIdRef.current, {
          section_id: sectionIdRef.current,
          current_section_index: sectionIndexRef.current,
          responses: items,
        }, tokenRef.current).then(() => undefined)
      );
      setLastSavedAt(new Date());
      setSaveState('saved');
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }, []); // stable — no deps needed since we read from refs

  // Called on any user interaction to reset idle timer (US-4.2 AC)
  const markDirty = useCallback(() => {
    setSaveState('dirty');
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      performSave();
    }, IDLE_SECONDS * 1000);
  }, [performSave]);

  // Called explicitly on Next/Previous navigation (US-4.1 AC)
  // Returns true if save succeeded, false if it failed — caller can block navigation
  const triggerSave = useCallback(async (): Promise<boolean> => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    return performSave();
  }, [performSave]);

  return { saveState, lastSavedAt, triggerSave, markDirty };
}
