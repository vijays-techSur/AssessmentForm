'use client';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

// SearchBar — F06 §Search & Filter (US-6.2: case-insensitive partial match on name + email)
// Controlled input; state managed by parent via useDashboardFilters (URL param sync)
export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">🔍</span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search responses by name or email"
      />
    </div>
  );
}
