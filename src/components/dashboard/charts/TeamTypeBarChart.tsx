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
          formatter={(value) => [value as number, 'Responses']}
          contentStyle={{ fontSize: 14 }}
        />
        <Bar dataKey="count" minPointSize={2} radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
