'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDashboardUser, setIsDashboardUser] = useState(false);

  // Check auth state on every navigation
  useEffect(() => {
    const respondentToken = localStorage.getItem('af_token');
    const dashboardToken = localStorage.getItem('dashboard_token');
    setIsLoggedIn(!!(respondentToken || dashboardToken));
    setIsDashboardUser(!!dashboardToken);
  }, [pathname]);

  // Hide the global nav inside the dashboard — it has its own DashboardHeader
  if (pathname?.startsWith('/dashboard')) return null;

  function handleLogout() {
    localStorage.removeItem('af_token');
    localStorage.removeItem('af_session_id');
    localStorage.removeItem('af_team_type');
    sessionStorage.removeItem('af_respondent_name');
    sessionStorage.removeItem('af_respondent_email');
    sessionStorage.removeItem('af_team_type');
    sessionStorage.removeItem('af_confirmation');
    router.push('/');
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      {/* Logo / home */}
      <Link href="/" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
        Developer Platform Assessment
      </Link>

      {/* Right-side actions */}
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/dashboard/login"
          className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
        >
          {isDashboardUser ? 'Dashboard' : 'System Owner Dashboard'}
        </Link>

        {isLoggedIn && !isDashboardUser && (
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
