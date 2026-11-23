import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

const levelConfig = {
  1: {
    label: 'NORMAL',
    color: 'text-green-700',
    bg: 'bg-green-100',
    border: 'border-green-200',
    banner: 'bg-green-50 border-green-300 text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-600',
  },
  2: {
    label: 'ATTENTION NEEDED',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    banner: 'bg-amber-50 border-amber-300 text-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  3: {
    label: 'DOCTOR ATTENTION RECOMMENDED',
    color: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-200',
    banner: 'bg-red-50 border-red-300 text-red-800',
    icon: AlertOctagon,
    iconColor: 'text-red-600',
  },
};

export default function AlertLevelBadge({ level = 1, size = 'sm' }) {
  const cfg = levelConfig[level] || levelConfig[1];
  const Icon = cfg.icon;

  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 ${cfg.banner}`}>
        <Icon className={`h-7 w-7 ${cfg.iconColor} flex-shrink-0`} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Alert Level {level}</p>
          <p className="text-xl font-bold">{cfg.label}</p>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}
