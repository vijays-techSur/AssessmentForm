'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface DashboardFilters {
  search: string;
  teamType: string[];
  status: 'all' | 'submitted' | 'draft';
  submittedAfter: string;
  submittedBefore: string;
  page: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

// useDashboardFilters — F06 §Search & Filter (US-6.2)
// All filter state is owned by URL search params — bookmarkable and preserved through navigation.
// Bidirectional sync: reads from useSearchParams, writes via router.replace.
export function useDashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: DashboardFilters = {
    search:          searchParams.get('search') ?? '',
    teamType:        searchParams.getAll('teamType'),
    status:          (searchParams.get('status') as DashboardFilters['status']) ?? 'all',
    submittedAfter:  searchParams.get('submittedAfter') ?? '',
    submittedBefore: searchParams.get('submittedBefore') ?? '',
    page:            Number(searchParams.get('page') ?? 1),
    sortBy:          searchParams.get('sortBy') ?? 'submitted_at',
    sortDir:         (searchParams.get('sortDir') as 'asc' | 'desc') ?? 'desc',
  };

  function updateParams(updates: Partial<Record<string, string | string[] | number>>) {
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 on filter change (unless explicitly setting page)
    if (!('page' in updates)) params.set('page', '1');

    for (const [key, value] of Object.entries(updates)) {
      if (Array.isArray(value)) {
        params.delete(key);
        value.forEach(v => params.append(key, v));
      } else if (value === '' || value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  const setSearch    = useCallback((v: string) => updateParams({ search: v }), [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const setTeamType  = useCallback((v: string[]) => updateParams({ teamType: v }), [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const setStatus    = useCallback((v: string) => updateParams({ status: v }), [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const setDateRange = useCallback(
    (after: string, before: string) => updateParams({ submittedAfter: after, submittedBefore: before }),
    [searchParams] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const setPage      = useCallback((n: number) => updateParams({ page: n }), [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const setSort      = useCallback(
    (sortBy: string, sortDir: 'asc' | 'desc') => updateParams({ sortBy, sortDir }),
    [searchParams] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const clearFilters = useCallback(() => {
    router.replace('/dashboard', { scroll: false });
  }, [router]);

  function toQueryString(): string {
    const params = new URLSearchParams();
    if (filters.search)           params.set('search', filters.search);
    if (filters.teamType.length)  filters.teamType.forEach(t => params.append('teamType', t));
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.submittedAfter)   params.set('submittedAfter', filters.submittedAfter);
    if (filters.submittedBefore)  params.set('submittedBefore', filters.submittedBefore);
    if (filters.page > 1)         params.set('page', String(filters.page));
    if (filters.sortBy !== 'submitted_at') params.set('sortBy', filters.sortBy);
    if (filters.sortDir !== 'desc')        params.set('sortDir', filters.sortDir);
    return params.toString();
  }

  return { filters, setSearch, setTeamType, setStatus, setDateRange, setPage, setSort, clearFilters, toQueryString };
}
