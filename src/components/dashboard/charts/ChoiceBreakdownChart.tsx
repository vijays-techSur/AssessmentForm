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
import type { ChoiceBreakdown } from '@/hooks/useAnalyticsData';

interface ChoiceBreakdownChartProps {
  breakdowns: ChoiceBreakdown[];
}

// ChoiceBreakdownChart — F06 §Analytics Charts (US-6.4: "choice question breakdown — pie/horizontal bar")
// UX-Mockup Screen 07 Chart 4: paginated question navigation
// TechArch SPEC-COMP: ChoiceBreakdownChart.tsx, Recharts
export function ChoiceBreakdownChart({ breakdowns }: ChoiceBreakdownChartProps) {
  const [idx, setIdx] = useState(0);

  if (breakdowns.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No responses yet. Charts will populate as respondents submit.
      </div>
    );
  }

  const current = breakdowns[idx];
  const chartData = current.counts.map(c => ({
    name: c.option_text.length > 30 ? c.option_text.slice(0, 28) + '…' : c.option_text,
    fullName: c.option_text,
    count: c.count,
    pct: c.percentage,
  }));

  const barHeight = Math.max(160, chartData.length * 36 + 40);

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3 line-clamp-2">
        Q: {current.question_text}
      </p>
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 14 }} domain={[0, 'auto']} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 13 }} />
          <Tooltip
            formatter={(value, _name, props) => {
              const p = props.payload as { pct?: number; fullName?: string } | undefined;
              return [
                `${value as number} responses (${p?.pct ?? 0}%)`,
                p?.fullName ?? '',
              ];
            }}
            contentStyle={{ fontSize: 14 }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: unknown) => `${v as number}`, fontSize: 13 }} />
        </BarChart>
      </ResponsiveContainer>

      {/* Pagination — UX-Mockup: "[← Q]  Question N of M choice questions  [Q →]" */}
      {breakdowns.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-600">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Previous choice question"
          >
            ← Q
          </button>
          <span>
            Question {idx + 1} of {breakdowns.length} choice questions
          </span>
          <button
            onClick={() => setIdx(i => Math.min(breakdowns.length - 1, i + 1))}
            disabled={idx === breakdowns.length - 1}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Next choice question"
          >
            Q →
          </button>
        </div>
      )}
    </div>
  );
}
