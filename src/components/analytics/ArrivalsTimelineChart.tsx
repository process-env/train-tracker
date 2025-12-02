'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TimelineData {
  time: string;
  arrivals: number;
  departures: number;
}

interface ArrivalsTimelineChartProps {
  data: TimelineData[];
}

export function ArrivalsTimelineChart({ data }: ArrivalsTimelineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="time"
          stroke="#888"
          tick={{ fill: '#888', fontSize: 12 }}
        />
        <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="arrivals"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="departures"
          stroke="#a855f7"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
