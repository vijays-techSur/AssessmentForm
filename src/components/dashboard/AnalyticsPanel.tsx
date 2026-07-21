'use client';

import { TeamTypeBarChart } from './charts/TeamTypeBarChart';
import { LikertDistributionChart } from './charts/LikertDistributionChart';
import { RankingTopItemsChart } from './charts/RankingTopItemsChart';
import { ChoiceBreakdownChart } from './charts/ChoiceBreakdownChart';
import type { AnalyticsData } from '@/hooks/useAnalyticsData';

const TEAM_TYPE_OPTIONS = [
  { value: 'program_project',      label: 'Program / Project' },
  { value: 'platform_engineering', label: 'Platform Engineering' },
  { value: 'infrastructure_cloud', label: 'Infrastructure / Cloud' },
  { value: 'data_api_governance',  label: 'Data / API Governance' },
];

interface AnalyticsPanelProps {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  teamTypeFilter: string[];
  onTeamTypeFilterChange: (filter: string[]) => void;
}

// AnalyticsPanel — F06 §Analytics Panel (US-6.4)
// UX-Mockup Screen 07: four chart sections + global team-type filter
// TechArch SPEC-COMP: AnalyticsPanel.tsx
export function AnalyticsPanel({
  data,
  loading,
  error,
  teamTypeFilter,
  onTeamTypeFilterChange,
}: AnalyticsPanelProps) {
  function toggleTeamType(value: string) {
    if (teamTypeFilter.includes(value)) {
      onTeamTypeFilterChange(teamTypeFilter.filter(t => t !== value));
    } else {
      onTeamTypeFilterChange([...teamTypeFilter, value]);
    }
  }

  const isAllSelected = teamTypeFilter.length === 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Global team-type filter — UX-Mockup Screen 07: "Global Filter (applies to all charts)" */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Filter by Team Type (applies to all charts)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTeamTypeFilterChange([])}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              isAllSelected
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ✓ All
          </button>
          {TEAM_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleTeamType(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                teamTypeFilter.includes(opt.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state — US-6.4: "Analytics could not be loaded. Please refresh." */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2 text-amber-800 text-sm">
          <span>⚠</span>
          <span>{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-blue-600 underline text-xs"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-40 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Charts — only render when data available and no error */}
      {data && !loading && (
        <>
          {/* Chart 1: Response Counts by Team Type */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Response Counts by Team Type
            </h2>
            <TeamTypeBarChart counts={data.response_counts_by_team_type} />
          </section>

          {/* Chart 2: Likert Distributions */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Likert Scale Distributions
            </h2>
            {data.likert_distributions.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No responses yet. Charts will populate as respondents submit.
              </p>
            ) : (
              <LikertDistributionChart distributions={data.likert_distributions} />
            )}
          </section>

          {/* Chart 3: Ranking Top Items */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Top-Ranked Capabilities
            </h2>
            {data.ranking_top_items.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No responses yet. Charts will populate as respondents submit.
              </p>
            ) : (
              <RankingTopItemsChart rankings={data.ranking_top_items} />
            )}
          </section>

          {/* Chart 4: Choice Breakdowns */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Choice Question Breakdowns
            </h2>
            {data.choice_breakdowns.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No responses yet. Charts will populate as respondents submit.
              </p>
            ) : (
              <ChoiceBreakdownChart breakdowns={data.choice_breakdowns} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
