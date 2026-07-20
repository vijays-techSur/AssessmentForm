'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ResponseListItem {
  session_id: string;
  respondent_name: string;
  respondent_email: string;
  team_type: string;
  submission_status: 'submitted' | 'draft';
  submitted_at: string | null;
  last_modified_at: string | null;
}

export interface PaginatedResponseList {
  total: number;
  page: number;
  pageSize: number;
  data: ResponseListItem[];
  duplicate_count: number;
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

// useDashboardData — fetches response list from GET /api/dashboard/responses
// Sends Authorization Bearer from localStorage "dashboard_token" (plan 05 requireSystemOwner)
// Refreshes when queryString changes (filter/sort/page changes)
export function useDashboardData(queryString: string) {
  const [data, setData] = useState<PaginatedResponseList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/dashboard/responses${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: { message?: string } })?.error?.message ?? 'Failed to load responses.');
      }
      setData(await res.json() as PaginatedResponseList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load responses.');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// useSummaryStats — fetches summary counts with 60s auto-refresh (F06 §Dashboard auto-refresh)
// TechArch: "Summary counts (total/submitted/draft) poll every 60 seconds"
// Fetches total, submitted, and draft counts in parallel for accurate summary cards.
export function useSummaryStats() {
  const [stats, setStats] = useState<{ total: number; submitted: number; draft: number } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, subRes, draftRes] = await Promise.all([
        fetch('/api/dashboard/responses?pageSize=1&page=1', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch('/api/dashboard/responses?pageSize=1&page=1&status=submitted', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch('/api/dashboard/responses?pageSize=1&page=1&status=draft', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      const allBody   = allRes.ok   ? await allRes.json()   as PaginatedResponseList : null;
      const subBody   = subRes.ok   ? await subRes.json()   as PaginatedResponseList : null;
      const draftBody = draftRes.ok ? await draftRes.json() as PaginatedResponseList : null;
      if (!allBody) return; // Silent fail — keep last known values
      setStats({
        total:     allBody.total,
        submitted: subBody?.total  ?? 0,
        draft:     draftBody?.total ?? 0,
      });
    } catch {
      // Silent fail — stats will show last known values
    }
  }, []);

  useEffect(() => {
    fetchStats(); // Initial load
    const interval = setInterval(fetchStats, 60000); // F06: 60s auto-refresh
    return () => clearInterval(interval);
  }, [fetchStats]);

  return stats;
}
