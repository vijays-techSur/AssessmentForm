import { AuthGuard } from '@/components/dashboard/AuthGuard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

// Dashboard layout — F06 §Dashboard Home Layout
// AuthGuard wraps ALL /dashboard/** routes — no flash of content for non-owners.
// DashboardHeader is a client component (handles Exit button onClick).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
