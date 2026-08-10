'use client';

import Link from 'next/link';

// DashboardHeader — client component for Exit button onClick handler
// Extracted from DashboardLayout to satisfy Next.js server component rules
export function DashboardHeader() {
  function handleExit() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dashboard_token');
      window.location.href = '/';
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-gray-900">System Owner Dashboard</span>
      </div>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Responses</Link>
        <Link href="/dashboard/analytics" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Analytics</Link>
        <Link href="/dashboard/config" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">⚙ Settings</Link>
        <span className="text-gray-300">|</span>
        <button
          onClick={handleExit}
          className="text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
