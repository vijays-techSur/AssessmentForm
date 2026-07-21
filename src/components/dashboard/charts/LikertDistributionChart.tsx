'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LikertDistribution } from '@/hooks/useAnalyticsData';

const LIKERT_LABELS: Record<string, string> = {
  '1': '1 — Strongly Disagree',
  '2': '2 — Disagree',
  '3': '3 — Neutral',
  '4': '4 — Agree',
  '5': '5 — Strongly Agree',
};

const LIKERT_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

interface LikertDistributionChartProps {
  distributions: LikertDistribution[];
}

// LikertDistributionChart — F06 §Analytics Charts (US-6.4: "Likert distribution per question — stacked bar")
// UX-Mockup Screen 07 Chart 2: paginated question navigation [← Q] [Q →]
// TechArch SPEC-COMP: LikertDistributionChart.tsx, Recharts
export function LikertDistributionChart({ distributions }: LikertDistributionChartProps) {
  const [idx, setIdx] = useState(0);

  if (distributions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No responses yet. Charts will populate as respondents submit.
      </div>
    );
  }

  const current = distributions[idx];
  const total = Object.values(current.distribution).reduce((a, b) => a + b, 0);

  // Build chart data: one bar per Likert point
  const chartData = (['1', '2', '3', '4', '5'] as const).map((point, i) => {
    const count = current.distribution[point] ?? 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      name: LIKERT_LABELS[point],
      count,
      pct,
      fill: LIKERT_COLORS[i],
    };
  });

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3 line-clamp-2">
        Q: {current.question_text}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 50, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 14 }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 13 }} />
          <Tooltip
            formatter={(value, _name, props) => [
              `${value as number} (${(props.payload as { pct?: number } | undefined)?.pct ?? 0}%)`,
              'Responses',
            ]}
            contentStyle={{ fontSize: 14 }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map(entry => (
              <rect key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Pagination — UX-Mockup: "[← Q]  Question N of M Likert questions  [Q →]" */}
      {distributions.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-600">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Previous Likert question"
          >
            ← Q
          </button>
          <span>
            Question {idx + 1} of {distributions.length} Likert questions
          </span>
          <button
            onClick={() => setIdx(i => Math.min(distributions.length - 1, i + 1))}
            disabled={idx === distributions.length - 1}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Next Likert question"
          >
            Q →
          </button>
        </div>
      )}
    </div>
  );
}
