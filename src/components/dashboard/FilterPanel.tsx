'use client';

const TEAM_TYPE_OPTIONS = [
  { value: 'program_project',      label: 'Program / Project' },
  { value: 'platform_engineering', label: 'Platform Engineering' },
  { value: 'infrastructure_cloud', label: 'Infrastructure / Cloud' },
  { value: 'data_api_governance',  label: 'Data / API Governance' },
];

interface FilterPanelProps {
  teamType:        string[];
  status:          'all' | 'submitted' | 'draft';
  submittedAfter:  string;
  submittedBefore: string;
  onTeamType:      (v: string[]) => void;
  onStatus:        (v: string) => void;
  onDateRange:     (after: string, before: string) => void;
  onClear:         () => void;
  onExportCsv:     () => void;
  exportLoading:   boolean;
}

// FilterPanel — F06 §Search & Filter (US-6.2: team type multi-select, status radio, date range)
// All filters combinable; state synced to URL params by parent via useDashboardFilters.
export function FilterPanel({
  teamType, status, submittedAfter, submittedBefore,
  onTeamType, onStatus, onDateRange, onClear, onExportCsv, exportLoading,
}: FilterPanelProps) {
  function toggleTeamType(value: string) {
    if (teamType.includes(value)) {
      onTeamType(teamType.filter(t => t !== value));
    } else {
      onTeamType([...teamType, value]);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
      {/* Team Type multi-select — US-6.2 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Team Type</label>
        <div className="flex flex-wrap gap-2">
          {TEAM_TYPE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={teamType.includes(opt.value)}
                onChange={() => toggleTeamType(opt.value)}
                className="rounded border-gray-300"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Status filter — US-6.2 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Status</label>
        <div className="flex gap-3">
          {(['all', 'submitted', 'draft'] as const).map(s => (
            <label key={s} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="radio"
                name="status"
                value={s}
                checked={status === s}
                onChange={() => onStatus(s)}
              />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Date range — US-6.2 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Date Range</label>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={submittedAfter}
            onChange={e => onDateRange(e.target.value, submittedBefore)}
            className="border border-gray-300 rounded text-sm px-2 py-1"
            aria-label="Submitted after"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={submittedBefore}
            onChange={e => onDateRange(submittedAfter, e.target.value)}
            className="border border-gray-300 rounded text-sm px-2 py-1"
            aria-label="Submitted before"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 ml-auto">
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-300 bg-white"
        >
          Clear Filters
        </button>
        <button
          onClick={onExportCsv}
          disabled={exportLoading}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          aria-label="Export responses to CSV"
        >
          {exportLoading ? 'Generating…' : '↓ Export CSV'}
        </button>
      </div>
    </div>
  );
}
