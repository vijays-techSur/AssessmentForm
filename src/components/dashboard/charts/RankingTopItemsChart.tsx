'use client';

import { useState } from 'react';
import type { RankingTopItem } from '@/hooks/useAnalyticsData';

interface RankingTopItemsChartProps {
  rankings: RankingTopItem[];
}

// RankingTopItemsChart — F06 §Analytics Charts (US-6.4: "top-ranked items per ranking question — ranked list")
// UX-Mockup Screen 07 Chart 3: ranked list ordered by average rank position
// TechArch SPEC-COMP: RankingTopItemsChart.tsx
export function RankingTopItemsChart({ rankings }: RankingTopItemsChartProps) {
  const [idx, setIdx] = useState(0);

  if (rankings.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No responses yet. Charts will populate as respondents submit.
      </div>
    );
  }

  const current = rankings[idx];

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3 line-clamp-2">
        Q: {current.question_text}
      </p>
      <ol className="flex flex-col gap-2">
        {current.ranked_items.map((item, i) => (
          <li key={item.option_text} className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400 w-6 text-right">
              #{i + 1}
            </span>
            <div className="flex-1 bg-gray-50 rounded px-3 py-2 flex justify-between items-center border border-gray-100">
              <span className="text-sm text-gray-800">{item.option_text}</span>
              <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                avg rank: {item.average_rank.toFixed(1)}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {/* Pagination */}
      {rankings.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Previous ranking question"
          >
            ← Q
          </button>
          <span>
            Question {idx + 1} of {rankings.length} ranking questions
          </span>
          <button
            onClick={() => setIdx(i => Math.min(rankings.length - 1, i + 1))}
            disabled={idx === rankings.length - 1}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Next ranking question"
          >
            Q →
          </button>
        </div>
      )}
    </div>
  );
}
