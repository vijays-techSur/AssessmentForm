'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AnswerDisplay {
  question_id:    string;
  question_text:  string;
  question_type:  string;
  answer_payload: unknown;
}

interface SectionDisplay {
  section_id: string;
  title:      string;
  answers:    AnswerDisplay[];
}

interface ResponseDetail {
  session_id:        string;
  respondent_name:   string;
  respondent_email:  string;
  team_type:         string;
  submission_status: string;
  submitted_at:      string | null;
  sections:          SectionDisplay[];
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

function formatAnswerPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '—';
  const p = payload as Record<string, unknown>;
  switch (p.type) {
    case 'single_choice':
      return p.value === 'other' ? `Other: ${p.other_text ?? ''}` : String(p.value ?? '—');
    case 'multi_choice': {
      const vals = (p.values as string[]) ?? [];
      if (vals.length === 0) return '—';
      return vals.map(v => (v === 'other' ? `Other: ${p.other_text ?? ''}` : v)).join(', ');
    }
    case 'likert':
      return p.value != null ? `${p.value} / 5` : '—';
    case 'ranking':
      return ((p.order as string[]) ?? []).map((item, i) => `${i + 1}. ${item}`).join('; ');
    case 'free_text_short':
    case 'free_text_long':
      return String(p.value ?? '—');
    default:
      return JSON.stringify(payload);
  }
}

const TEAM_TYPE_LABELS: Record<string, string> = {
  program_project:      'Program / Project',
  platform_engineering: 'Platform Engineering',
  infrastructure_cloud: 'Infrastructure / Cloud',
  data_api_governance:  'Data / API Governance',
};

// ResponseDetailView — F06 §Individual Response View (US-6.3)
// Fetches all sections + answers from GET /api/dashboard/responses/:sessionId in read-only format.
// Back button restores filter state from sessionStorage (US-6.3: "back button preserves filter state").
export function ResponseDetailView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [detail, setDetail]   = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/responses/${sessionId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.status === 404) {
          setError('The requested response could not be found.');
          return;
        }
        if (!res.ok) throw new Error('Failed to load response.');
        setDetail(await res.json() as ResponseDetail);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load response.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Back navigation — preserves filter state from sessionStorage (US-6.3)
  function handleBack() {
    const savedQs = typeof window !== 'undefined'
      ? sessionStorage.getItem('dashboard_filter_qs')
      : null;
    router.push(savedQs ? `/dashboard${savedQs}` : '/dashboard');
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading response…</div>;
  if (error)   return <div className="text-center py-12 text-red-600">{error}</div>;
  if (!detail) return null;

  return (
    <div className="max-w-4xl">
      <button
        onClick={handleBack}
        className="mb-6 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        aria-label="Back to response list"
      >
        ← Back to Responses
      </button>

      {/* Respondent metadata */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Individual Response</h1>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Name:</span> <span className="font-medium">{detail.respondent_name}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="font-mono">{detail.respondent_email}</span></div>
          <div><span className="text-gray-500">Team Type:</span> {TEAM_TYPE_LABELS[detail.team_type] ?? detail.team_type}</div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              detail.submission_status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {detail.submission_status.charAt(0).toUpperCase() + detail.submission_status.slice(1)}
            </span>
          </div>
          {detail.submitted_at && (
            <div>
              <span className="text-gray-500">Submitted:</span>{' '}
              {new Date(detail.submitted_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Sections + answers — read-only (US-6.3: "same question-type widgets as assessment form, non-interactive") */}
      <div className="flex flex-col gap-4">
        {detail.sections.map(section => (
          <div key={section.section_id} className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">{section.title}</h2>
            <div className="flex flex-col gap-4">
              {section.answers.map((answer, qi) => (
                <div key={answer.question_id} className="text-sm">
                  <div className="font-medium text-gray-700 mb-1">
                    Q{qi + 1}. {answer.question_text}
                  </div>
                  <div className="text-gray-600 pl-4 py-1 border-l-2 border-gray-200">
                    {answer.answer_payload
                      ? formatAnswerPayload(answer.answer_payload)
                      : <span className="text-gray-400 italic">No answer recorded</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
