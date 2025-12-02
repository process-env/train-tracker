'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface DelayData {
  bucket: string;
  count: number;
}

interface DelayDistributionChartProps {
  data: DelayData[];
}

const COLORS: Record<string, string> = {
  on_time: '#22c55e',
  '0-2 min': '#84cc16',
  '2-5 min': '#eab308',
  '5-10 min': '#f97316',
  '10+ min': '#ef4444',
  unknown: '#6b7280',
};

const LABELS: Record<string, string> = {
  on_time: 'On Time',
  '0-2 min': '0-2 min late',
  '2-5 min': '2-5 min late',
  '5-10 min': '5-10 min late',
  '10+ min': '10+ min late',
  unknown: 'Unknown',
};

export function DelayDistributionChart({ data }: DelayDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        <p>No delay data collected yet</p>
      </div>
    );
  }

  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: LABELS[d.bucket] || d.bucket,
      value: d.count,
      color: COLORS[d.bucket] || '#6b7280',
    }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
          }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ color: '#fff' }}
          formatter={(value: number, name: string) => [
            `${value} (${((value / total) * 100).toFixed(1)}%)`,
            name,
          ]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span style={{ color: '#fff', fontSize: '12px' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
