'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard';

export default function AssessmentPage() {
  const router = useRouter();
  const { session, token, isLoading } = useSession();

  // Guard: no session → redirect to identity form.
  // Only redirect when loading is complete, session is absent, AND no stored
  // credentials remain in localStorage. If localStorage still has a token (e.g.
  // getSession hit a transient network error), stay put — the user's session is
  // likely valid and a fresh navigate or retry will restore it. This prevents
  // a page.reload() from bouncing the user back to '/' on a momentary API hiccup.
  useEffect(() => {
    const hasStoredToken = !!(
      localStorage.getItem('af_token') && localStorage.getItem('af_session_id')
    );
    if (!isLoading && !session && !hasStoredToken) {
      router.replace('/');
    }
  }, [session, isLoading, router]);

  if (isLoading || !session || !token) {
    return <div className="flex justify-center items-center h-screen text-gray-400">Loading…</div>;
  }

  return <AssessmentWizard session={session} token={token} />;
}
