import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

function formatTime(ts) {
  try {
    return format(parseISO(ts), 'HH:mm');
  } catch {
    return ts || '';
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-600 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value}
          {entry.dataKey === 'heartRate' ? ' BPM' : ' %'}
        </p>
      ))}
    </div>
  );
};

export default function HealthChart({ readings = [] }) {
  if (!readings.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No readings available
      </div>
    );
  }

  const data = [...readings]
    .reverse()
    .map((r) => ({
      time: formatTime(r.timestamp || r.createdAt),
      heartRate: r.heartRate,
      spo2: r.spo2,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="hr"
          orientation="left"
          domain={['auto', 'auto']}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          label={{ value: 'BPM', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }}
        />
        <YAxis
          yAxisId="spo2"
          orientation="right"
          domain={[80, 100]}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          label={{ value: '%', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#9ca3af' } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
        />
        <Line
          yAxisId="hr"
          type="monotone"
          dataKey="heartRate"
          name="Heart Rate"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="spo2"
          type="monotone"
          dataKey="spo2"
          name="SpO2"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
