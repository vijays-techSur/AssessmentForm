'use client';

import { useRouter } from 'next/navigation';
import type { ResponseListItem } from '@/hooks/useDashboardData';
import type { DashboardFilters } from '@/hooks/useDashboardFilters';

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: 'name',             label: 'Name',          sortable: true },
  { key: 'email',            label: 'Email',         sortable: true },
  { key: 'team_type',        label: 'Team Type',     sortable: true },
  { key: 'status',           label: 'Status',        sortable: true },
  { key: 'submitted_at',     label: 'Submitted At',  sortable: true },
  { key: 'last_modified_at', label: 'Last Modified', sortable: false },
];

const TEAM_TYPE_LABELS: Record<string, string> = {
  program_project:      'Program / Project',
  platform_engineering: 'Platform Engineering',
  infrastructure_cloud: 'Infrastructure / Cloud',
  data_api_governance:  'Data / API Governance',
};

interface ResponseTableProps {
  data:              ResponseListItem[];
  total:             number;
  loading:           boolean;
  error:             string | null;
  filters:           DashboardFilters;
  onSort:            (sortBy: string, sortDir: 'asc' | 'desc') => void;
  onPage:            (page: number) => void;
  filterQueryString: string;
}

// ResponseTable — F06 §Response List View (US-6.1: paginated 25/page, sortable, submitted_at DESC)
// Row click → /dashboard/responses/:sessionId; filter state saved to sessionStorage for back-nav.
export function ResponseTable({
  data, total, loading, error, filters, onSort, onPage,
}: ResponseTableProps) {
  const router = useRouter();
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSort(key: string) {
    if (filters.sortBy === key) {
      onSort(key, filters.sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'desc');
    }
  }

  function handleRowClick(sessionId: string) {
    // Store current filter state in sessionStorage so detail page back-button preserves it
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dashboard_filter_qs', window.location.search);
    }
    router.push(`/dashboard/responses/${sessionId}`);
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        {/* Table headers are always rendered so column roles are always accessible */}
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                }`}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  filters.sortBy === col.key
                    ? filters.sortDir === 'asc' ? 'ascending' : 'descending'
                    : undefined
                }
              >
                {col.label}
                {col.sortable && filters.sortBy === col.key && (
                  <span className="ml-1" aria-hidden="true">{filters.sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                Loading responses…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-red-600 text-sm">
                {error}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No responses match your current filters.
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={row.session_id}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(row.session_id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleRowClick(row.session_id)}
                aria-label={`View response from ${row.respondent_name}`}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{row.respondent_name}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row.respondent_email}</td>
                <td className="px-4 py-3 text-gray-600">
                  {TEAM_TYPE_LABELS[row.team_type] ?? row.team_type}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    row.submission_status === 'submitted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {row.submission_status.charAt(0).toUpperCase() + row.submission_status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(row.submitted_at)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(row.last_modified_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination — 25 per page (US-6.1) */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {filters.page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPage(filters.page - 1)}
              disabled={filters.page <= 1}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`px-3 py-1 rounded border text-sm ${
                  p === filters.page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPage(filters.page + 1)}
              disabled={filters.page >= totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
