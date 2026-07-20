import { ResponseDetailView } from '@/components/dashboard/ResponseDetailView';

// Individual response drill-down — F06 §Individual Response View (US-6.3)
// Route: /dashboard/responses/:sessionId
// Renders all sections + answers in read-only format; back button preserves filter state.
export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ResponseDetailView sessionId={sessionId} />;
}
