---
phase: 3c-part2-frontend-analytics-config
plan: 09
type: execute
wave: 9
depends_on: [5, 8]
files_modified:
  - src/app/dashboard/analytics/page.tsx
  - src/app/dashboard/config/page.tsx
  - src/components/dashboard/AnalyticsPanel.tsx
  - src/components/dashboard/charts/TeamTypeBarChart.tsx
  - src/components/dashboard/charts/LikertDistributionChart.tsx
  - src/components/dashboard/charts/RankingTopItemsChart.tsx
  - src/components/dashboard/charts/ChoiceBreakdownChart.tsx
  - src/components/dashboard/ConfigPanel.tsx
  - src/hooks/useAnalyticsData.ts
  - src/hooks/useConfigData.ts
autonomous: true

features:
  implements: ["F6", "F8"]
  depends_on: ["F6", "F7"]
  enables: []

must_haves:
  truths:
    - "System Owner can view four Recharts charts on /dashboard/analytics: horizontal bar (team type counts), stacked bar per Likert question (1–5 distribution), ranked list per ranking question (avg rank), horizontal bar per choice question (option counts + %)"
    - "Likert and choice chart groups have Previous/Next pagination to step through questions"
    - "All charts filter simultaneously when a team type chip is toggled"
    - "Empty state shows 'No responses yet. Charts will populate as respondents submit.' when no submitted data exists — no error shown"
    - "Error state shows 'Analytics could not be loaded. Please refresh.' when API returns 5xx"
    - "System Owner can view the assessment config (status badge, launch date, due date, last modified by) at /dashboard/config"
    - "System Owner can click Edit Due Date, enter a new date/time, confirm in a dialog, and PATCH /api/config — panel refreshes immediately"
    - "Cancel at date picker or confirmation dialog reverts to no change"
    - "Past due date entry shows a caution warning in the confirmation dialog"
    - "Config panel shows config_audit_log-based last-modified info (email + timestamp)"
  artifacts:
    - path: "src/app/dashboard/analytics/page.tsx"
      provides: "Route /dashboard/analytics — AnalyticsPanel with team type filter"
      min_lines: 30
    - path: "src/app/dashboard/config/page.tsx"
      provides: "Route /dashboard/config — ConfigPanel with read/edit states and confirmation dialog"
      min_lines: 30
    - path: "src/components/dashboard/AnalyticsPanel.tsx"
      provides: "Analytics container: team type filter chips + all four chart sections"
      exports: ["AnalyticsPanel"]
    - path: "src/components/dashboard/charts/TeamTypeBarChart.tsx"
      provides: "Recharts horizontal BarChart for response counts by team type"
      exports: ["TeamTypeBarChart"]
    - path: "src/components/dashboard/charts/LikertDistributionChart.tsx"
      provides: "Recharts BarChart for Likert 1–5 distribution per question (paginated)"
      exports: ["LikertDistributionChart"]
    - path: "src/components/dashboard/charts/RankingTopItemsChart.tsx"
      provides: "Ranked list (no chart lib needed) — avg rank per option, paginated per question"
      exports: ["RankingTopItemsChart"]
    - path: "src/components/dashboard/charts/ChoiceBreakdownChart.tsx"
      provides: "Recharts horizontal BarChart for choice option counts + %, paginated per question"
      exports: ["ChoiceBreakdownChart"]
    - path: "src/components/dashboard/ConfigPanel.tsx"
      provides: "Config read/edit UI: status badge, date picker, confirmation dialog, audit info"
      exports: ["ConfigPanel"]
    - path: "src/hooks/useAnalyticsData.ts"
      provides: "Data fetching hook for GET /api/dashboard/analytics with teamType filter param"
      exports: ["useAnalyticsData"]
    - path: "src/hooks/useConfigData.ts"
      provides: "Data fetching hook for GET /api/config + PATCH /api/config"
      exports: ["useConfigData"]
  key_links:
    - from: "src/app/dashboard/analytics/page.tsx"
      to: "/api/dashboard/analytics"
      via: "useAnalyticsData hook (fetch with teamType filter)"
      pattern: "useAnalyticsData|/api/dashboard/analytics"
    - from: "src/components/dashboard/AnalyticsPanel.tsx"
      to: "TeamTypeBarChart, LikertDistributionChart, RankingTopItemsChart, ChoiceBreakdownChart"
      via: "component composition with AnalyticsData props"
      pattern: "TeamTypeBarChart|LikertDistributionChart|RankingTopItemsChart|ChoiceBreakdownChart"
    - from: "src/app/dashboard/config/page.tsx"
      to: "/api/config"
      via: "useConfigData hook (GET on mount, PATCH on confirm)"
      pattern: "useConfigData|/api/config"
    - from: "src/components/dashboard/ConfigPanel.tsx"
      to: "useConfigData"
      via: "onSave callback triggering PATCH /api/config with new due_date"
      pattern: "onSave|PATCH.*api/config|patchConfig"

integration_contracts:
  requires:
    - from_plan: "05"
      artifact: "src/app/api/dashboard/analytics/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export.*GET' src/app/api/dashboard/analytics/route.ts && echo CONTRACT_OK"
    - from_plan: "05"
      artifact: "src/app/api/config/route.ts"
      exports: ["GET", "PATCH"]
      verify: "grep -n 'export.*GET\\|export.*PATCH' src/app/api/config/route.ts && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/app/dashboard/layout.tsx"
      exports: ["DashboardLayout"]
      verify: "grep -n 'export default' src/app/dashboard/layout.tsx && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/components/dashboard/AuthGuard.tsx"
      exports: ["AuthGuard"]
      verify: "grep -n 'export.*AuthGuard' src/components/dashboard/AuthGuard.tsx && echo CONTRACT_OK"
  provides:
    - artifact: "src/app/dashboard/analytics/page.tsx"
      exports: ["AnalyticsPage (default)"]
      shape: |
        Route: /dashboard/analytics
        Protected by AuthGuard via dashboard layout.tsx (inherited from wave 8).
        Renders AnalyticsPanel with team type filter chips.
        Calls GET /api/dashboard/analytics?teamType=... via useAnalyticsData hook.
      verify: "grep -n 'export default' src/app/dashboard/analytics/page.tsx && echo CONTRACT_OK"
    - artifact: "src/app/dashboard/config/page.tsx"
      exports: ["ConfigPage (default)"]
      shape: |
        Route: /dashboard/config
        Protected by AuthGuard via dashboard layout.tsx (inherited from wave 8).
        Renders ConfigPanel with read/edit states and PATCH /api/config trigger.
      verify: "grep -n 'export default' src/app/dashboard/config/page.tsx && echo CONTRACT_OK"
---

<objective>
Implement the analytics charts page and assessment configuration panel for the System Owner Dashboard — wave 3c part 2.

Purpose: Completes Dana Okafor's dashboard by adding the analytics visualization surface (Screen 07) and the due-date management UI (Screen 08). The dashboard layout and AuthGuard from wave 8 are consumed as-is; this plan adds only the two new routes and their UI components.

Output:
- `/dashboard/analytics` — AnalyticsPanel with four Recharts chart types (TeamTypeBarChart, LikertDistributionChart, RankingTopItemsChart, ChoiceBreakdownChart), global team-type filter, per-chart-group pagination, empty state, error state.
- `/dashboard/config` — ConfigPanel with read state (status badge, dates, last-modified), inline date/time picker, confirmation dialog, success/error feedback, PATCH /api/config call.
- Supporting hooks: useAnalyticsData, useConfigData.
</objective>

<feature_dependencies>
Implements: F6: System Owner Dashboard (analytics charts panel at /dashboard/analytics — four chart types via Recharts: TeamTypeBarChart horizontal bar, LikertDistributionChart stacked bar per question, RankingTopItemsChart ranked list per question, ChoiceBreakdownChart horizontal bar per question; global team-type filter chips; per-question pagination for Likert and choice groups; empty state when no submitted responses; error state on 5xx), F8: Assessment Configuration Management (ConfigPanel at /dashboard/config — status badge Active/Closed/Upcoming, launch date, due date display, Edit Due Date inline picker with date+time input, confirmation dialog showing From→To with past-date caution, PATCH /api/config on confirm, audit log last-modified display, Copy Assessment Link, success/error toast)
Depends on: F6 backend (plan 05 — GET /api/dashboard/analytics, GET/PATCH /api/config), F7 dashboard layout + AuthGuard (plan 08 — inherited by all /dashboard/** routes)
Enables: Wave 4 E2E tests (TEST-F6-10, TEST-F6-11 for analytics; TEST-F8-01 through TEST-F8-04 for config)
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@.planning/express/assessmentform-express-spa-multi-step-as/05-PLAN.md
@.planning/express/assessmentform-express-spa-multi-step-as/08-PLAN.md
@project_specs/UX-Mockup-AssessmentForm.md
@project_specs/TechArch-AssessmentForm.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Analytics page — useAnalyticsData hook, AnalyticsPanel, four chart components</name>
  <files>
    src/hooks/useAnalyticsData.ts
    src/components/dashboard/charts/TeamTypeBarChart.tsx
    src/components/dashboard/charts/LikertDistributionChart.tsx
    src/components/dashboard/charts/RankingTopItemsChart.tsx
    src/components/dashboard/charts/ChoiceBreakdownChart.tsx
    src/components/dashboard/AnalyticsPanel.tsx
    src/app/dashboard/analytics/page.tsx
  </files>
  <action>
Implement the analytics data hook, all four chart components using Recharts, the AnalyticsPanel container, and the analytics page route. Do NOT re-implement AuthGuard or dashboard layout — those are inherited from plan 08 via src/app/dashboard/layout.tsx.

---

### `src/hooks/useAnalyticsData.ts`

Fetches GET /api/dashboard/analytics with optional teamType filter. Reads System Owner JWT from localStorage "dashboard_token" for Authorization header.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LikertDistribution {
  question_id: string;
  question_text: string;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface RankingTopItem {
  question_id: string;
  question_text: string;
  ranked_items: { option_text: string; average_rank: number }[];
}

export interface ChoiceBreakdown {
  question_id: string;
  question_text: string;
  counts: { option_text: string; count: number; percentage: number }[];
}

export interface AnalyticsData {
  response_counts_by_team_type: Record<string, number>;
  likert_distributions: LikertDistribution[];
  ranking_top_items: RankingTopItem[];
  choice_breakdowns: ChoiceBreakdown[];
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

// useAnalyticsData — F06 §Analytics Panel (US-6.4)
// Calls GET /api/dashboard/analytics?teamType=... with optional teamType filter.
// Returns { data, loading, error }.
export function useAnalyticsData(teamTypeFilter: string[]) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      teamTypeFilter.forEach(t => params.append('teamType', t));
      const url = `/api/dashboard/analytics${teamTypeFilter.length > 0 ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        throw new Error('ANALYTICS_ERROR');
      }
      setData(await res.json());
    } catch {
      // F06 US-6.4: "Analytics could not be loaded. Please refresh."
      setError('Analytics could not be loaded. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [teamTypeFilter.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

---

### `src/components/dashboard/charts/TeamTypeBarChart.tsx`

Horizontal bar chart — response counts per team type. Uses Recharts BarChart in layout="vertical".

From UX-Mockup Screen 07 Chart 1: "Response Counts by Team Type — horizontal bar chart".
From TechArch §2.3: `TeamTypeBarChart.tsx` using Recharts library.

```typescript
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const TEAM_TYPE_LABELS: Record<string, string> = {
  program_project:      'Program / Project',
  platform_engineering: 'Platform Engineering',
  infrastructure_cloud: 'Infrastructure / Cloud',
  data_api_governance:  'Data / API Governance',
};

const TEAM_TYPE_ORDER = [
  'program_project',
  'platform_engineering',
  'infrastructure_cloud',
  'data_api_governance',
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

interface TeamTypeBarChartProps {
  counts: Record<string, number>;
}

// TeamTypeBarChart — F06 §Analytics Charts (US-6.4: "response counts by team type — horizontal bar chart")
// UX-Mockup Screen 07 Chart 1
// TechArch SPEC-COMP: TeamTypeBarChart.tsx, Recharts library
export function TeamTypeBarChart({ counts }: TeamTypeBarChartProps) {
  const chartData = TEAM_TYPE_ORDER.map((key, i) => ({
    name: TEAM_TYPE_LABELS[key] ?? key,
    count: counts[key] ?? 0,
    color: COLORS[i],
  }));

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No responses yet. Charts will populate as respondents submit.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 14 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 14 }} />
        <Tooltip
          formatter={(value: number) => [value, 'Responses']}
          contentStyle={{ fontSize: 14 }}
        />
        <Bar dataKey="count" minPointSize={2} radius={[0, 4, 4, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

### `src/components/dashboard/charts/LikertDistributionChart.tsx`

Horizontal bars for Likert 1–5 point distribution per question with pagination.

From UX-Mockup Screen 07 Chart 2: "Likert Distributions (per question) — stacked bar / individual bars per point" with "[← Q] Question N of M [Q →]" pagination.

```typescript
'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
            formatter={(value: number, name: string, props: { payload: { pct: number } }) => [
              `${value} (${props.payload.pct}%)`,
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
```

---

### `src/components/dashboard/charts/RankingTopItemsChart.tsx`

Ranked list display — no Recharts needed. Shows items in order by average rank, paginated per question.

From UX-Mockup Screen 07 Chart 3: "#1 Onboarding Automation avg rank: 1.8 / #2 CI/CD... etc"
From TechArch SPEC-COMP: `RankingTopItemsChart.tsx`

```typescript
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
```

---

### `src/components/dashboard/charts/ChoiceBreakdownChart.tsx`

Horizontal bar chart for choice question option counts + percentages, paginated per question.

From UX-Mockup Screen 07 Chart 4: "Choice Question Breakdowns — horizontal bar or pie chart" with "[← Q] [Q →]" pagination.

```typescript
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
            formatter={(value: number, _: string, props: { payload: { pct: number; fullName: string } }) => [
              `${value} responses (${props.payload.pct}%)`,
              props.payload.fullName,
            ]}
            contentStyle={{ fontSize: 14 }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => `${v}`, fontSize: 13 }} />
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
```

---

### `src/components/dashboard/AnalyticsPanel.tsx`

Container: team-type filter chips + four chart sections. Passes teamTypeFilter to useAnalyticsData via props.

```typescript
'use client';

import { TeamTypeBarChart } from './charts/TeamTypeBarChart';
import { LikertDistributionChart } from './charts/LikertDistributionChart';
import { RankingTopItemsChart } from './charts/RankingTopItemsChart';
import { ChoiceBreakdownChart } from './charts/ChoiceBreakdownChart';
import type { AnalyticsData } from '@/hooks/useAnalyticsData';

const TEAM_TYPE_OPTIONS = [
  { value: 'program_project',      label: 'Program / Project' },
  { value: 'platform_engineering', label: 'Platform Engineering' },
  { value: 'infrastructure_cloud', label: 'Infrastructure / Cloud' },
  { value: 'data_api_governance',  label: 'Data / API Governance' },
];

interface AnalyticsPanelProps {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  teamTypeFilter: string[];
  onTeamTypeFilterChange: (filter: string[]) => void;
}

// AnalyticsPanel — F06 §Analytics Panel (US-6.4)
// UX-Mockup Screen 07: four chart sections + global team-type filter
// TechArch SPEC-COMP: AnalyticsPanel.tsx
export function AnalyticsPanel({
  data,
  loading,
  error,
  teamTypeFilter,
  onTeamTypeFilterChange,
}: AnalyticsPanelProps) {
  function toggleTeamType(value: string) {
    if (teamTypeFilter.includes(value)) {
      onTeamTypeFilterChange(teamTypeFilter.filter(t => t !== value));
    } else {
      onTeamTypeFilterChange([...teamTypeFilter, value]);
    }
  }

  const isAllSelected = teamTypeFilter.length === 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Global team-type filter — UX-Mockup Screen 07: "Global Filter (applies to all charts)" */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Filter by Team Type (applies to all charts)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTeamTypeFilterChange([])}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              isAllSelected
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ✓ All
          </button>
          {TEAM_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleTeamType(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                teamTypeFilter.includes(opt.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state — US-6.4: "Analytics could not be loaded. Please refresh." */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2 text-amber-800 text-sm">
          <span>⚠</span>
          <span>{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-blue-600 underline text-xs"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-40 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Charts — only render when data available and no error */}
      {data && !loading && (
        <>
          {/* Chart 1: Response Counts by Team Type */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Response Counts by Team Type
            </h2>
            <TeamTypeBarChart counts={data.response_counts_by_team_type} />
          </section>

          {/* Chart 2: Likert Distributions */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Likert Scale Distributions
            </h2>
            {data.likert_distributions.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No responses yet. Charts will populate as respondents submit.
              </p>
            ) : (
              <LikertDistributionChart distributions={data.likert_distributions} />
            )}
          </section>

          {/* Chart 3: Ranking Top Items */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Top-Ranked Capabilities
            </h2>
            {data.ranking_top_items.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No responses yet. Charts will populate as respondents submit.
              </p>
            ) : (
              <RankingTopItemsChart rankings={data.ranking_top_items} />
            )}
          </section>

          {/* Chart 4: Choice Breakdowns */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Choice Question Breakdowns
            </h2>
            {data.choice_breakdowns.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No responses yet. Charts will populate as respondents submit.
              </p>
            ) : (
              <ChoiceBreakdownChart breakdowns={data.choice_breakdowns} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
```

---

### `src/app/dashboard/analytics/page.tsx`

Analytics page route — uses dashboard layout (and thus AuthGuard) from plan 08 automatically.

```typescript
'use client';

import { useState } from 'react';
import { AnalyticsPanel } from '@/components/dashboard/AnalyticsPanel';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import Link from 'next/link';

// /dashboard/analytics — F06 §Analytics Panel (US-6.4)
// AuthGuard inherited from src/app/dashboard/layout.tsx (plan 08)
// UX-Mockup Screen 07
export default function AnalyticsPage() {
  const [teamTypeFilter, setTeamTypeFilter] = useState<string[]>([]);
  const { data, loading, error } = useAnalyticsData(teamTypeFilter);

  return (
    <div>
      {/* Sub-header with back link */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Response List
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
        </div>
      </div>

      <AnalyticsPanel
        data={data}
        loading={loading}
        error={error}
        teamTypeFilter={teamTypeFilter}
        onTeamTypeFilterChange={setTeamTypeFilter}
      />
    </div>
  );
}
```
  </action>
  <verify>
```bash
grep -n "export.*useAnalyticsData" src/hooks/useAnalyticsData.ts && echo "useAnalyticsData export OK"
grep -n "export.*TeamTypeBarChart" src/components/dashboard/charts/TeamTypeBarChart.tsx && echo "TeamTypeBarChart export OK"
grep -n "export.*LikertDistributionChart" src/components/dashboard/charts/LikertDistributionChart.tsx && echo "LikertDistributionChart export OK"
grep -n "export.*RankingTopItemsChart" src/components/dashboard/charts/RankingTopItemsChart.tsx && echo "RankingTopItemsChart export OK"
grep -n "export.*ChoiceBreakdownChart" src/components/dashboard/charts/ChoiceBreakdownChart.tsx && echo "ChoiceBreakdownChart export OK"
grep -n "export.*AnalyticsPanel" src/components/dashboard/AnalyticsPanel.tsx && echo "AnalyticsPanel export OK"
grep -n "export default" src/app/dashboard/analytics/page.tsx && echo "analytics page export OK"
grep -n "useAnalyticsData" src/app/dashboard/analytics/page.tsx && echo "analytics page uses hook OK"
grep -n "AnalyticsPanel" src/app/dashboard/analytics/page.tsx && echo "analytics page uses panel OK"
grep -n "recharts\|BarChart\|ResponsiveContainer" src/components/dashboard/charts/TeamTypeBarChart.tsx && echo "Recharts import OK"
npx tsc --noEmit 2>&1 | head -30
```
  </verify>
  <done>
- useAnalyticsData hook fetches GET /api/dashboard/analytics with optional teamType filter params; returns { data, loading, error }; reads JWT from localStorage "dashboard_token"
- TeamTypeBarChart: Recharts BarChart layout="vertical" showing all 4 team types; empty state when all counts are 0; min font size 14px per UX mockup presentation-mode requirement
- LikertDistributionChart: Recharts BarChart layout="vertical" per Likert question; Previous/Next paginator "[← Q] Question N of M Likert questions [Q →]"; shows % in tooltip; empty state when distributions.length === 0
- RankingTopItemsChart: Ranked list (#1, #2... with avg rank values) per ranking question; Previous/Next paginator; empty state when rankings.length === 0
- ChoiceBreakdownChart: Recharts BarChart layout="vertical" per choice question with count + % in tooltip; Previous/Next paginator "[← Q] Question N of M choice questions [Q →]"; empty state when breakdowns.length === 0
- AnalyticsPanel: global team-type filter chips ("All" + 4 types); passes filter to charts via props; loading skeletons (4 animated placeholders); error banner "Analytics could not be loaded. Please refresh."; four chart sections rendered when data available
- /dashboard/analytics page: useState for teamTypeFilter, passes to useAnalyticsData and AnalyticsPanel; back link to response list; AuthGuard inherited from dashboard layout
- TypeScript compilation passes with no errors in the modified files
  </done>
</task>

<task type="auto">
  <name>Task 2: Config page — useConfigData hook, ConfigPanel with read/edit states and confirmation dialog</name>
  <files>
    src/hooks/useConfigData.ts
    src/components/dashboard/ConfigPanel.tsx
    src/app/dashboard/config/page.tsx
  </files>
  <action>
Implement the config data hook, the ConfigPanel component (read state, inline date picker, confirmation dialog, success/error toast), and the config page route. All protected by the dashboard layout AuthGuard from plan 08.

---

### `src/hooks/useConfigData.ts`

Fetches GET /api/config on mount and exposes a patchConfig function for PATCH /api/config.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AssessmentConfig {
  due_date: string;
  launch_date: string;
  status: 'upcoming' | 'active' | 'closed';
  last_modified_at: string | null;
  last_modified_by: string | null;
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

// useConfigData — F08 §View + Update Configuration (US-8.1, US-8.2)
// GET /api/config on mount; patchConfig triggers PATCH /api/config { due_date }
// TechArch §4.3: AssessmentConfig response shape
export function useConfigData() {
  const [config, setConfig] = useState<AssessmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/config', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('CONFIG_LOAD_FAILED');
      setConfig(await res.json());
    } catch {
      setError('Could not load assessment configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // patchConfig — PATCH /api/config { due_date }
  // F08 §Update Due Date: writes config_audit_log; returns updated AssessmentConfig
  const patchConfig = useCallback(async (newDueDate: string): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ due_date: newDueDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body?.error?.message ?? 'Could not save configuration. Please try again.');
        return false;
      }
      const updated = await res.json() as AssessmentConfig;
      setConfig(updated);
      setSaveSuccess(true);
      // Auto-clear success flag after 4 seconds
      setTimeout(() => setSaveSuccess(false), 4000);
      return true;
    } catch {
      setSaveError('Could not save configuration. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { config, loading, error, saving, saveError, saveSuccess, patchConfig };
}
```

---

### `src/components/dashboard/ConfigPanel.tsx`

Config read/edit panel with inline date picker, confirmation dialog, audit info.

From UX-Mockup Screen 08:
- Read state: status badge, launch date, due date + [Edit ✏] button, last modified
- Edit state: date + time input (pre-populated), Cancel + Save Changes buttons
- Confirmation dialog: From → To, caution if past date, Cancel + Confirm Change
- F08 success toast: "Due date updated successfully."
- F08 error toast: "Could not save configuration. Please try again."

```typescript
'use client';

import { useState } from 'react';

interface AssessmentConfig {
  due_date: string;
  launch_date: string;
  status: 'upcoming' | 'active' | 'closed';
  last_modified_at: string | null;
  last_modified_by: string | null;
}

interface ConfigPanelProps {
  config: AssessmentConfig;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: (newDueDate: string) => Promise<boolean>;
}

// Status badge colors — F08 US-8.1: "Status computed dynamically: Upcoming / Active / Closed"
const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-800 border border-green-200',
  closed:   'bg-gray-100  text-gray-700  border border-gray-200',
  upcoming: 'bg-blue-100  text-blue-800  border border-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  active:   '● Active',
  closed:   '○ Closed',
  upcoming: '◌ Upcoming',
};

function formatDate(isoStr: string | null): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

// ConfigPanel — F08 §Assessment Configuration Management (US-8.1, US-8.2, US-8.3)
// UX-Mockup Screen 08: read/edit states, confirmation dialog
// TechArch SPEC-COMP: ConfigPanel.tsx, configService
export function ConfigPanel({ config, saving, saveError, saveSuccess, onSave }: ConfigPanelProps) {
  // Edit state
  const [editing, setEditing] = useState(false);
  // Date value in YYYY-MM-DD (date input) and time in HH:MM (time input)
  const [newDateVal, setNewDateVal] = useState('');
  const [newTimeVal, setNewTimeVal] = useState('');
  const [dateError, setDateError] = useState('');
  // Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDueDate, setPendingDueDate] = useState('');
  // Copy link feedback
  const [copied, setCopied] = useState(false);

  function openEdit() {
    // Pre-populate with current due date
    const current = new Date(config.due_date);
    const dateStr = current.toISOString().slice(0, 10); // YYYY-MM-DD
    const hours   = String(current.getHours()).padStart(2, '0');
    const minutes = String(current.getMinutes()).padStart(2, '0');
    setNewDateVal(dateStr);
    setNewTimeVal(`${hours}:${minutes}`);
    setDateError('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDateError('');
  }

  // [Save Changes] → validate → open confirmation dialog
  function handleSaveClick() {
    if (!newDateVal || !newTimeVal) {
      setDateError('Please provide a valid date and time.');
      return;
    }
    // Build ISO string from date + time inputs (interpret as local time)
    const combined = `${newDateVal}T${newTimeVal}:00`;
    const parsed = new Date(combined);
    if (isNaN(parsed.getTime())) {
      setDateError('Please provide a valid date and time.');
      return;
    }
    setDateError('');
    setPendingDueDate(parsed.toISOString());
    setShowConfirm(true);
  }

  function cancelConfirm() {
    setShowConfirm(false);
  }

  // [Confirm Change] → PATCH /api/config
  async function handleConfirm() {
    setShowConfirm(false);
    const ok = await onSave(pendingDueDate);
    if (ok) {
      setEditing(false);
    }
  }

  const isPastDate = pendingDueDate ? new Date(pendingDueDate) < new Date() : false;

  function handleCopyLink() {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Success toast — F08 US-8.2: "Due date updated successfully." */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-800 text-sm">
          <span>✓</span>
          <span>Due date updated successfully.</span>
        </div>
      )}

      {/* Error toast — F08: "Could not save configuration. Please try again." */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
          <span>⚠</span>
          <span>{saveError}</span>
        </div>
      )}

      {/* Config card — UX-Mockup Screen 08 Layout: read state */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Assessment Configuration</h2>

        <dl className="flex flex-col gap-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500 w-36">Status</dt>
            <dd>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[config.status] ?? STATUS_STYLES.active}`}>
                {STATUS_LABELS[config.status] ?? config.status}
              </span>
            </dd>
          </div>

          {/* Launch Date */}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500 w-36">Launch Date</dt>
            <dd className="text-sm text-gray-800">{formatDate(config.launch_date)}</dd>
          </div>

          {/* Due Date — editable */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500 w-36">Due Date</dt>
              {!editing ? (
                <dd className="flex items-center gap-3">
                  <span className="text-sm text-gray-800">{formatDateTime(config.due_date)}</span>
                  <button
                    onClick={openEdit}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    aria-label="Edit due date"
                  >
                    Edit ✏
                  </button>
                </dd>
              ) : (
                <dd className="flex-1 ml-4">
                  {/* Inline date/time picker — UX-Mockup Screen 08: "New Due Date & Time" */}
                  <div className="flex flex-col gap-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <label className="text-xs font-medium text-gray-600">New Due Date & Time</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={newDateVal}
                        onChange={e => { setNewDateVal(e.target.value); setDateError(''); }}
                        className={`border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dateError ? 'border-red-400' : 'border-gray-300'}`}
                        aria-label="New due date"
                      />
                      <input
                        type="time"
                        value={newTimeVal}
                        onChange={e => { setNewTimeVal(e.target.value); setDateError(''); }}
                        className={`border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dateError ? 'border-red-400' : 'border-gray-300'}`}
                        aria-label="New due time"
                      />
                    </div>
                    {/* F08 US-8.2 validation error — "Please provide a valid date and time." */}
                    {dateError && (
                      <p className="text-xs text-red-600" role="alert">{dateError}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveClick}
                        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </dd>
              )}
            </div>
          </div>

          {/* Last Modified — config_audit_log info */}
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-500 w-36">Last Modified</dt>
            <dd className="text-sm text-gray-600">
              {config.last_modified_at
                ? `${formatDate(config.last_modified_at)}${config.last_modified_by ? ` by ${config.last_modified_by}` : ''}`
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Copy Assessment Link card — UX-Mockup Screen 08 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">🔗 Copy Assessment Link</p>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            {typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
          </p>
        </div>
        <button
          onClick={handleCopyLink}
          className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700 whitespace-nowrap"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Confirmation Dialog — UX-Mockup Screen 08: "Confirm Due Date Change" modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={cancelConfirm} // Clicking backdrop = Cancel (UX Pattern 4)
          onKeyDown={e => e.key === 'Escape' && cancelConfirm()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 mb-1">
              Confirm Due Date Change
            </h3>
            <hr className="my-3 border-gray-200" />

            <p className="text-sm text-gray-600 mb-4">
              You are about to change the assessment due date:
            </p>

            <dl className="flex flex-col gap-2 mb-4 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-12">From:</dt>
                <dd className="text-gray-800 font-medium">{formatDateTime(config.due_date)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-12">To:</dt>
                <dd className="text-gray-800 font-medium">{formatDateTime(pendingDueDate)}</dd>
              </div>
            </dl>

            {/* Caution warning — UX-Mockup Screen 08: "past date" caution */}
            {isPastDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 text-xs mb-4">
                ⚠ This date is in the past. Setting it will immediately close the assessment.
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-800 text-xs mb-5">
              ⚠ This will take effect immediately for all active respondents. No application restart is required.
            </div>

            {/* Default focus on Cancel (safer action) per UX Pattern 4 */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelConfirm}
                autoFocus
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Updating…' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### `src/app/dashboard/config/page.tsx`

Config page route — AuthGuard inherited from dashboard layout (plan 08).

```typescript
'use client';

import { ConfigPanel } from '@/components/dashboard/ConfigPanel';
import { useConfigData } from '@/hooks/useConfigData';
import Link from 'next/link';

// /dashboard/config — F08 §Assessment Configuration Management (US-8.1, US-8.2, US-8.3)
// AuthGuard inherited from src/app/dashboard/layout.tsx (plan 08)
// UX-Mockup Screen 08
export default function ConfigPage() {
  const { config, loading, error, saving, saveError, saveSuccess, patchConfig } = useConfigData();

  return (
    <div>
      {/* Sub-header with back link */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-lg font-semibold text-gray-900">Assessment Configuration</h1>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-48" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Load error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Config panel — only render when config loaded */}
      {config && !loading && (
        <ConfigPanel
          config={config}
          saving={saving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          onSave={patchConfig}
        />
      )}
    </div>
  );
}
```
  </action>
  <verify>
```bash
grep -n "export.*useConfigData" src/hooks/useConfigData.ts && echo "useConfigData export OK"
grep -n "export.*ConfigPanel" src/components/dashboard/ConfigPanel.tsx && echo "ConfigPanel export OK"
grep -n "export default" src/app/dashboard/config/page.tsx && echo "config page export OK"
grep -n "useConfigData" src/app/dashboard/config/page.tsx && echo "config page uses hook OK"
grep -n "ConfigPanel" src/app/dashboard/config/page.tsx && echo "config page uses ConfigPanel OK"
grep -n "PATCH\|patchConfig" src/hooks/useConfigData.ts && echo "useConfigData has PATCH OK"
grep -n "Confirm Due Date Change\|showConfirm" src/components/dashboard/ConfigPanel.tsx && echo "confirmation dialog OK"
grep -n "Due date updated successfully\|Could not save configuration" src/components/dashboard/ConfigPanel.tsx && echo "success/error messages OK"
grep -n "autoFocus" src/components/dashboard/ConfigPanel.tsx && echo "Cancel autoFocus (safer default) OK"
npx tsc --noEmit 2>&1 | head -30
```
  </verify>
  <done>
- useConfigData: GET /api/config on mount → returns { config, loading, error }; patchConfig(newDueDate) calls PATCH /api/config with Authorization header, updates config state on success, sets saveSuccess=true for 4s auto-clear, sets saveError on failure
- ConfigPanel: read state shows status badge (Active/Closed/Upcoming with correct colors), launch date, due date + [Edit ✏] button, last modified email+timestamp; edit state shows inline date+time input pre-populated with current due date, Cancel + Save Changes buttons, "Please provide a valid date and time." inline error on invalid input
- Confirmation dialog: shows From→To formatted dates, amber caution for past dates ("This date is in the past. Setting it will immediately close the assessment."), general immediate-effect warning, Cancel (autoFocused per UX Pattern 4) + Confirm Change; clicking backdrop or Escape = Cancel
- Success toast: "Due date updated successfully." (green); error toast: "Could not save configuration. Please try again." (red)
- Copy Assessment Link button: copies window.location.origin + "/" to clipboard, shows "Copied!" feedback
- /dashboard/config page: useConfigData hook, loading skeletons, error state, ConfigPanel rendered when data available; back link to dashboard; AuthGuard inherited from layout
- TypeScript compilation passes with no errors in the modified files
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| {client→API (analytics)} | System Owner browser requests GET /api/dashboard/analytics — JWT in Authorization header crosses into protected analytics aggregation handler |
| {client→API (config PATCH)} | System Owner browser requests PATCH /api/config { due_date } — user-supplied date string crosses into the config update handler and is written to DB |
| {db→render (config audit)} | Config audit log data (last_modified_by email) stored in DB is fetched and rendered in ConfigPanel — stored content crosses into browser DOM |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-01 | Elevation of privilege | `src/app/dashboard/analytics/page.tsx` → GET /api/dashboard/analytics | mitigate | Route is inside `src/app/dashboard/` which is wrapped by `DashboardLayout` → `AuthGuard` (plan 08). Every API call to `/api/dashboard/analytics` hits `requireSystemOwner` server-side middleware (plan 05 `src/app/api/dashboard/analytics/route.ts`) which returns 403 `ACCESS_DENIED` for non-System-Owner JWTs. Double enforcement: client-side guard prevents page render; server-side guard enforces data access. |
| T-09-02 | Elevation of privilege | `src/app/dashboard/config/page.tsx` → GET/PATCH /api/config | mitigate | Same double-enforcement as T-09-01. PATCH endpoint `src/app/api/config/route.ts` calls `requireSystemOwner(req)` as first statement (plan 05). Client-side `useConfigData` reads JWT from `localStorage.dashboard_token` set by System Owner login flow. |
| T-09-03 | Tampering | `src/hooks/useConfigData.ts` patchConfig — user-supplied `newDueDate` string sent via PATCH body | mitigate | Client-side: date is parsed from HTML `<input type="date">` and `<input type="time">` and validated with `new Date(combined)` + `isNaN` check before the PATCH is sent. Server-side: `src/app/api/config/route.ts` validates with `isNaN(Date.parse(body.due_date))` and binds the value via Drizzle ORM parameterized `UPDATE` — no string interpolation into SQL (plan 05). |
| T-09-04 | Denial of service | `useAnalyticsData` — repeated filter changes re-trigger GET /api/dashboard/analytics | accept | Analytics endpoint is System Owner-only; authenticated user base is tiny (pre-configured emails). No debounce is implemented in this plan for simplicity. Risk owner: engineering team; accepted for v1 (≤500 respondents, small SO population). Add debounce or client-side cache in follow-on if needed. |
| T-09-05 | Information disclosure | `ConfigPanel.tsx` — `last_modified_by` email rendered in DOM | mitigate | Data comes from GET /api/config which is protected by `requireSystemOwner` (plan 05). Only System Owners can reach this page. The email is System Owner's own email — not respondent PII. No respondent data is rendered in ConfigPanel. |
| T-09-06 | Information disclosure | `useConfigData` / `useAnalyticsData` — JWT stored in localStorage | accept | localStorage is the established session storage pattern for this SPA (consistent with plan 08 dashboard_token pattern). XSS risk exists in principle; mitigated by Next.js Content Security Policy and no `dangerouslySetInnerHTML` usage. Full XSS hardening is a wave 4 / security audit concern. Risk owner: engineering team; accepted for v1. |
</threat_model>

<verification>
## Wave 9 (3c-part2 frontend analytics/config) — Verification

After all tasks complete, verify:

```bash
# 1. Hook exports present
grep -n "export.*useAnalyticsData" src/hooks/useAnalyticsData.ts && echo "HOOK useAnalyticsData OK"
grep -n "export.*useConfigData" src/hooks/useConfigData.ts && echo "HOOK useConfigData OK"

# 2. Chart component exports present
for f in \
  src/components/dashboard/charts/TeamTypeBarChart.tsx \
  src/components/dashboard/charts/LikertDistributionChart.tsx \
  src/components/dashboard/charts/RankingTopItemsChart.tsx \
  src/components/dashboard/charts/ChoiceBreakdownChart.tsx; do
  grep -l "export function" "$f" && echo "$f: export OK"
done

# 3. AnalyticsPanel and ConfigPanel exports
grep -n "export.*AnalyticsPanel" src/components/dashboard/AnalyticsPanel.tsx && echo "AnalyticsPanel OK"
grep -n "export.*ConfigPanel" src/components/dashboard/ConfigPanel.tsx && echo "ConfigPanel OK"

# 4. Page routes exported
grep -n "export default" src/app/dashboard/analytics/page.tsx && echo "analytics page OK"
grep -n "export default" src/app/dashboard/config/page.tsx && echo "config page OK"

# 5. Recharts used in charts (not hand-rolled)
grep -n "recharts" src/components/dashboard/charts/TeamTypeBarChart.tsx && echo "Recharts in TeamTypeBarChart OK"
grep -n "recharts" src/components/dashboard/charts/LikertDistributionChart.tsx && echo "Recharts in LikertDistributionChart OK"
grep -n "recharts" src/components/dashboard/charts/ChoiceBreakdownChart.tsx && echo "Recharts in ChoiceBreakdownChart OK"

# 6. Empty state messages present (US-6.4)
grep -n "No responses yet" src/components/dashboard/AnalyticsPanel.tsx && echo "EMPTY STATE (AnalyticsPanel) OK"

# 7. Confirmation dialog present in ConfigPanel (US-8.2)
grep -n "Confirm Due Date Change\|showConfirm" src/components/dashboard/ConfigPanel.tsx && echo "CONFIRMATION DIALOG OK"

# 8. PATCH call in config hook (US-8.2)
grep -n "PATCH\|method.*PATCH" src/hooks/useConfigData.ts && echo "CONFIG PATCH call OK"

# 9. Success/error message strings (F08)
grep -n "Due date updated successfully" src/components/dashboard/ConfigPanel.tsx && echo "F08 success message OK"
grep -n "Could not save configuration" src/components/dashboard/ConfigPanel.tsx && echo "F08 error message OK"

# 10. TypeScript compiles clean
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"
```
</verification>

<success_criteria>
- `/dashboard/analytics` loads and renders four chart sections (team type bar, Likert distribution, ranking list, choice breakdown) driven by GET /api/dashboard/analytics
- Global team type filter chips in AnalyticsPanel re-fetch analytics data for the selected subset when toggled
- Likert and choice chart groups show Previous/Next question pagination matching UX-Mockup Screen 07 design
- Empty state "No responses yet. Charts will populate as respondents submit." shown per chart when no data — no error displayed
- Error state "Analytics could not be loaded. Please refresh." shown when API returns 5xx
- `/dashboard/config` loads current config from GET /api/config: status badge, launch date, due date, last-modified info
- [Edit ✏] opens inline date/time picker pre-populated with current due date
- [Save Changes] validates input (INVALID_DATE_FORMAT if blank/invalid), opens confirmation dialog showing From/To dates and past-date caution
- [Confirm Change] sends PATCH /api/config, config panel updates immediately with new due date, success toast shown
- Cancel at either stage (picker or dialog) reverts to no change
- Both pages protected by dashboard layout AuthGuard (inherited from plan 08) — non-System-Owners redirected to /dashboard/login
- TypeScript compilation passes with no errors
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/09-SUMMARY.md` summarizing what was implemented, key decisions made, file paths created, and any deviations from the plan.
</output>
