'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LikertDistribution {
  question_id: string;
  question_text: string;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface RankingTopItem {
  question_id: string;
  question_text: string;
  ranked_items: { option_text: string; average_rank: number }[];
}

export interface ChoiceBreakdown {
  question_id: string;
  question_text: string;
  counts: { option_text: string; count: number; percentage: number }[];
}

export interface AnalyticsData {
  response_counts_by_team_type: Record<string, number>;
  likert_distributions: LikertDistribution[];
  ranking_top_items: RankingTopItem[];
  choice_breakdowns: ChoiceBreakdown[];
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

// useAnalyticsData — F06 §Analytics Panel (US-6.4)
// Calls GET /api/dashboard/analytics?teamType=... with optional teamType filter.
// Returns { data, loading, error }.
export function useAnalyticsData(teamTypeFilter: string[]) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      teamTypeFilter.forEach(t => params.append('teamType', t));
      const url = `/api/dashboard/analytics${teamTypeFilter.length > 0 ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        throw new Error('ANALYTICS_ERROR');
      }
      setData(await res.json());
    } catch {
      // F06 US-6.4: "Analytics could not be loaded. Please refresh."
      setError('Analytics could not be loaded. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [teamTypeFilter.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
