import { Heart, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const typeConfig = {
  hr: {
    label: 'Heart Rate',
    unit: 'BPM',
    icon: Heart,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    normal: [60, 100],
  },
  spo2: {
    label: 'Blood Oxygen',
    unit: '%',
    icon: Wind,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    normal: [95, 100],
  },
};

function TrendIcon({ trend }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-amber-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-blue-400" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

export default function HealthReadingCard({ type = 'hr', value, trend }) {
  const cfg = typeConfig[type] || typeConfig.hr;
  const Icon = cfg.icon;
  const [low, high] = cfg.normal;
  const isNormal = value >= low && value <= high;
  const displayValue = value != null ? value : '—';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${cfg.iconBg}`}>
        <Icon className={`h-7 w-7 ${cfg.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500">{cfg.label}</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-3xl font-bold text-gray-900">{displayValue}</span>
          <span className="text-sm text-gray-500 mb-1">{cfg.unit}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <TrendIcon trend={trend} />
          <span className={`text-xs font-medium ${isNormal ? 'text-green-600' : 'text-amber-600'}`}>
            {isNormal ? 'Normal range' : 'Out of range'}
          </span>
        </div>
      </div>
    </div>
  );
}
