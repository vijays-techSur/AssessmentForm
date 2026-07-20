'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'respondent' | 'system_owner';
}

// AuthGuard — TechArch §2.4 (client-side route guard; no flash of protected content)
// For respondent pages (default): redirects to / if no token or role === 'system_owner'
// For dashboard pages (requiredRole='system_owner'): redirects to / if role !== 'system_owner'
// US-7.2 AC: Respondents cannot see dashboard. US-7.3 AC: System Owners cannot access respondent flows.
export function AuthGuard({ children, requiredRole = 'respondent' }: Props) {
  const router = useRouter();
  const { session, token, isLoading } = useSession();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return; // Wait for session auto-resume to complete

    if (!token || !session) {
      // No session — redirect to identity capture
      router.replace('/');
      return;
    }

    const role = session.role;

    if (requiredRole === 'respondent' && role !== 'respondent') {
      // System Owner tried to access respondent flow
      router.replace('/');
      return;
    }

    if (requiredRole === 'system_owner' && role !== 'system_owner') {
      // Respondent tried to access dashboard
      router.replace('/');
      return;
    }

    setAuthorized(true);
  }, [isLoading, token, session, requiredRole, router]);

  // Render nothing until authorized (no flash of protected content — US-7.2 AC)
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
