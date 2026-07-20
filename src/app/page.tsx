'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { IdentityForm } from '@/components/identity/IdentityForm';
import { ResumeBanner } from '@/components/identity/ResumeBanner';
import type { TeamType } from '@/lib/api/types';

export default function HomePage() {
  const router = useRouter();
  const { session, isLoading, error, createSession, clearSession } = useSession();
  const [showResume, setShowResume] = useState(false);

  // After auto-resume check: if returning, show resume banner
  useEffect(() => {
    if (session?.is_returning) setShowResume(true);
  }, [session]);

  const handleIdentitySubmit = async ({
    email, name, teamType,
  }: { email: string; name: string; teamType: TeamType }) => {
    try {
      localStorage.setItem('af_team_type', teamType); // store for AssessmentWizard
      const sess = await createSession({ email, name, team_type: teamType });
      // Store respondent details in sessionStorage for Review/Confirmation pages (plan 07)
      sessionStorage.setItem('af_respondent_name', name);
      sessionStorage.setItem('af_respondent_email', email);
      sessionStorage.setItem('af_team_type', teamType);
      if (sess.is_returning) {
        setShowResume(true);
      } else {
        router.push('/assessment');
      }
    } catch {
      // error is surfaced via useSession.error
    }
  };

  const handleContinue = () => {
    router.push('/assessment');
  };

  // System Owner role: show error (US-7.3)
  const displayError = error ?? (session?.role === 'system_owner'
    ? 'This email is registered as a System Owner. Please access the dashboard instead.'
    : null);

  if (showResume && session) {
    return <ResumeBanner session={session} onContinue={handleContinue} />;
  }

  // Suppress unused variable warning - clearSession is exposed for external use
  void clearSession;

  return (
    <IdentityForm
      onSuccess={handleIdentitySubmit}
      isLoading={isLoading}
      serverError={displayError}
      dueDate={session?.due_date}
    />
  );
}
