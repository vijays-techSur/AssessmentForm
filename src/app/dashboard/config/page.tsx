'use client';

import { ConfigPanel } from '@/components/dashboard/ConfigPanel';
import { useConfigData } from '@/hooks/useConfigData';
import Link from 'next/link';

// /dashboard/config — F08 §Assessment Configuration Management (US-8.1, US-8.2, US-8.3)
// AuthGuard inherited from src/app/dashboard/layout.tsx (plan 08)
// UX-Mockup Screen 08
export default function ConfigPage() {
  const { config, loading, error, saving, saveError, saveSuccess, patchConfig } = useConfigData();

  return (
    <div>
      {/* Sub-header with back link */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-lg font-semibold text-gray-900">Assessment Configuration</h1>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-48" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Load error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Config panel — only render when config loaded */}
      {config && !loading && (
        <ConfigPanel
          config={config}
          saving={saving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          onSave={patchConfig}
        />
      )}
    </div>
  );
}
