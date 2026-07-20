'use client';
import { useState, useCallback } from 'react';
import type { SectionSummary } from '@/lib/api/types';
import { getSections } from '@/lib/api/client';

export function useSectionList() {
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSections = useCallback(async (teamType: string, token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { sections: list } = await getSections(teamType, token);
      setSections(list);
      return list;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Could not load sections. Please refresh.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sections, isLoading, error, loadSections };
}
