'use client';

// TeamTypeCoverageBar — F06 §Dashboard Home (UX-Mockup Screen 06)
// Shows count per team type with low-participation warning (⚠ amber if 0 responses)
const TEAM_TYPES = [
  { key: 'program_project',      label: 'Program / Project' },
  { key: 'platform_engineering', label: 'Platform Engineering' },
  { key: 'infrastructure_cloud', label: 'Infrastructure / Cloud' },
  { key: 'data_api_governance',  label: 'Data / API Governance' },
];

interface TeamTypeCoverageBarProps {
  counts: Record<string, number>;
  total: number;
}

export function TeamTypeCoverageBar({ counts, total }: TeamTypeCoverageBarProps) {
  const maxCount = Math.max(...TEAM_TYPES.map(t => counts[t.key] ?? 0), 1);
  const covered  = TEAM_TYPES.filter(t => (counts[t.key] ?? 0) > 0).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Team Type Coverage</h2>
      <div className="flex flex-col gap-2">
        {TEAM_TYPES.map(({ key, label }) => {
          const count = counts[key] ?? 0;
          const low   = count === 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-40 text-xs text-gray-600 truncate">{label}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full ${low ? 'bg-amber-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.max((count / maxCount) * 100, count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <div className={`text-xs w-8 text-right font-medium ${low ? 'text-amber-600' : 'text-gray-700'}`}>
                {count} {low ? '⚠' : '✓'}
              </div>
            </div>
          );
        })}
      </div>
      <p className={`mt-3 text-xs ${covered === 4 ? 'text-green-700' : 'text-amber-700'}`}>
        Coverage: {covered}/4 team types represented {covered === 4 ? '✓' : '⚠'}
        {total > 0 && <span className="text-gray-400 ml-2">(from current view)</span>}
      </p>
    </div>
  );
}
