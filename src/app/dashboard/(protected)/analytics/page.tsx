'use client';

import { useState } from 'react';
import { AnalyticsPanel } from '@/components/dashboard/AnalyticsPanel';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import Link from 'next/link';

// /dashboard/analytics — F06 §Analytics Panel (US-6.4)
// AuthGuard inherited from src/app/dashboard/layout.tsx (plan 08)
// UX-Mockup Screen 07
export default function AnalyticsPage() {
  const [teamTypeFilter, setTeamTypeFilter] = useState<string[]>([]);
  const { data, loading, error } = useAnalyticsData(teamTypeFilter);

  return (
    <div>
      {/* Sub-header with back link */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Response List
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
        </div>
      </div>

      <AnalyticsPanel
        data={data}
        loading={loading}
        error={error}
        teamTypeFilter={teamTypeFilter}
        onTeamTypeFilterChange={setTeamTypeFilter}
      />
    </div>
  );
}
