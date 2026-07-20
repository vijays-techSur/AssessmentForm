'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard';

export default function AssessmentPage() {
  const router = useRouter();
  const { session, token, isLoading } = useSession();

  // Guard: no session → redirect to identity form
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/');
    }
  }, [session, isLoading, router]);

  if (isLoading || !session || !token) {
    return <div className="flex justify-center items-center h-screen text-gray-400">Loading…</div>;
  }

  return <AssessmentWizard session={session} token={token} />;
}
