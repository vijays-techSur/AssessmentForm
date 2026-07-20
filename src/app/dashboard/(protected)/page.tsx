'use client';

import { Suspense, useState } from 'react';
import { SummaryStats } from '@/components/dashboard/SummaryStats';
import { TeamTypeCoverageBar } from '@/components/dashboard/TeamTypeCoverageBar';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { ResponseTable } from '@/components/dashboard/ResponseTable';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { useDashboardData } from '@/hooks/useDashboardData';

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

// DashboardContent — inner component that uses useSearchParams (via useDashboardFilters)
// Must be inside Suspense per Next.js App Router requirement for useSearchParams.
function DashboardContent() {
  const {
    filters, setSearch, setTeamType, setStatus, setDateRange,
    setPage, setSort, clearFilters, toQueryString,
  } = useDashboardFilters();
  const { data, loading, error } = useDashboardData(toQueryString());
  const [exportLoading, setExportLoading] = useState(false);

  // Team type counts from current page data for coverage bar
  // (full unfiltered counts come from analytics endpoint in 09-PLAN.md; this approximates)
  const teamTypeCounts: Record<string, number> = {};
  (data?.data ?? []).forEach(row => {
    teamTypeCounts[row.team_type] = (teamTypeCounts[row.team_type] ?? 0) + 1;
  });

  // F06 §Export CSV — GET /api/dashboard/export/csv with active filter params
  async function handleExportCsv() {
    setExportLoading(true);
    try {
      const qs = toQueryString();
      const url = `/api/dashboard/export/csv${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const burl = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href     = burl;
      a.download = `assessment-responses-${date}.csv`;
      a.click();
      URL.revokeObjectURL(burl);
    } catch {
      alert('Export could not be generated. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stats (60s auto-refresh) + Team type coverage bar */}
      <div className="flex gap-6 items-start flex-wrap">
        <SummaryStats />
        <div className="flex-1 min-w-[300px]">
          <TeamTypeCoverageBar counts={teamTypeCounts} total={data?.total ?? 0} />
        </div>
      </div>

      {/* Search + Filter Panel */}
      <div className="flex flex-col gap-3">
        <SearchBar value={filters.search} onChange={setSearch} />
        <FilterPanel
          teamType={filters.teamType}
          status={filters.status}
          submittedAfter={filters.submittedAfter}
          submittedBefore={filters.submittedBefore}
          onTeamType={setTeamType}
          onStatus={setStatus}
          onDateRange={setDateRange}
          onClear={clearFilters}
          onExportCsv={handleExportCsv}
          exportLoading={exportLoading}
        />
      </div>

      {/* Response table — paginated 25/page, sortable columns, row click → drill-down */}
      <ResponseTable
        data={data?.data ?? []}
        total={data?.total ?? 0}
        loading={loading}
        error={error}
        filters={filters}
        onSort={setSort}
        onPage={setPage}
        filterQueryString={toQueryString()}
      />
    </div>
  );
}

// Dashboard home page — F06 §Dashboard Home (Screen 06)
// Wrapped in Suspense for useSearchParams compatibility (Next.js App Router).
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
