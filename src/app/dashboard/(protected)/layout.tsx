import { AuthGuard } from '@/components/dashboard/AuthGuard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

// Protected dashboard layout — wraps all /dashboard/** routes EXCEPT /dashboard/login
// AuthGuard enforces system_owner JWT; no flash of content for non-owners.
export default function ProtectedDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Global dashboard header with Responses/Analytics/Settings nav + Exit button */}
        <DashboardHeader />
        <main className="px-6 py-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
