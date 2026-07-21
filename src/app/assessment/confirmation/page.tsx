'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/assessment/AuthGuard';
import { SubmissionConfirmation } from '@/components/assessment/SubmissionConfirmation';

interface ConfirmationData {
  name: string;
  email: string;
  submittedAt: string;
  dueDate: string | null;
  editWindowOpen: boolean;
  wasResubmit: boolean;
}

// /assessment/confirmation — Submission Confirmation Screen
// UX-Mockup Screen 04, Flow 03 §Confirmation Screen flow
// US-9.1 AC: Only reachable after successful POST /api/submissions — direct nav redirects to review
export default function ConfirmationPage() {
  const router = useRouter();
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // US-9.1 AC: Check for confirmationData written by review page after successful submit
    const raw = sessionStorage.getItem('af_confirmation');
    if (!raw) {
      // No confirmation data — direct URL navigation without a submission → redirect to review
      router.replace('/assessment/review');
      return;
    }
    try {
      const data = JSON.parse(raw) as ConfirmationData;
      setConfirmationData(data);
      // Clear the marker so a page refresh redirects back to review (prevent stale confirmation)
      sessionStorage.removeItem('af_confirmation');
    } catch {
      router.replace('/assessment/review');
      return;
    }
    setChecked(true);
  }, [router]);

  const handleReturn = () => {
    // US-9.1 AC: Return to Assessment button navigates to Review Step in editable mode
    router.push('/assessment/review');
  };

  if (!checked || !confirmationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="respondent">
      <SubmissionConfirmation
        name={confirmationData.name}
        dueDate={confirmationData.dueDate}
        wasResubmit={confirmationData.wasResubmit}
        lastModifiedAt={confirmationData.submittedAt}
        email={confirmationData.email}
        onReturn={handleReturn}
      />
    </AuthGuard>
  );
}
