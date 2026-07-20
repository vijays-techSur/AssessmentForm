'use client';

import { useSummaryStats } from '@/hooks/useDashboardData';

// SummaryStats — F06 §Dashboard Home (US-6.1: "total responses, submitted count, draft count")
// Polls every 60 seconds via useSummaryStats hook (setInterval in useDashboardData)
export function SummaryStats() {
  const stats = useSummaryStats();

  return (
    <div className="flex gap-6 text-sm">
      <div className="bg-white rounded-md border border-gray-200 px-4 py-3 text-center min-w-[80px]">
        <div className="text-2xl font-bold text-gray-900">{stats?.total ?? '—'}</div>
        <div className="text-gray-500">Total</div>
      </div>
      <div className="bg-white rounded-md border border-gray-200 px-4 py-3 text-center min-w-[80px]">
        <div className="text-2xl font-bold text-green-700">{stats?.submitted ?? '—'}</div>
        <div className="text-gray-500">Submitted</div>
      </div>
      <div className="bg-white rounded-md border border-gray-200 px-4 py-3 text-center min-w-[80px]">
        <div className="text-2xl font-bold text-amber-600">{stats?.draft ?? '—'}</div>
        <div className="text-gray-500">Draft</div>
      </div>
    </div>
  );
}
