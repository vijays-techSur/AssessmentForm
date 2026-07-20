'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = JSON.parse(atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp as number | undefined;
  if (!exp) return true;
  return Date.now() / 1000 > exp;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

// AuthGuard — F07 §Client-side RBAC (US-7.2: no flash of dashboard content)
// Reads JWT from localStorage "dashboard_token"; checks role === "system_owner" and not expired.
// On fail: shows 403-state UI without rendering children (no flash of content).
// Server verifies JWT signature on every dashboard API call (plan 05 requireSystemOwner middleware).
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dashboard_token') : null;

    if (!token) {
      setAuthState('unauthorized');
      router.replace('/dashboard/login');
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== 'system_owner' || isTokenExpired(payload)) {
      localStorage.removeItem('dashboard_token');
      setAuthState('unauthorized');
      router.replace('/dashboard/login');
      return;
    }

    setAuthState('authorized');
  }, [router]);

  // Loading: show nothing to prevent flash of any content
  if (authState === 'loading') {
    return null;
  }

  // Unauthorized: show 403-state — router.replace is in flight, render placeholder
  if (authState === 'unauthorized') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-600 text-lg">You do not have permission to access this page.</p>
          <a href="/dashboard/login" className="mt-4 inline-block text-blue-600 underline">
            Go to System Owner Login
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
