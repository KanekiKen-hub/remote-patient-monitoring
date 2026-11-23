import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { useState } from 'react';

const variants = {
  success: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
};

export default function AlertBanner({ variant = 'info', message, dismissible = false }) {
  const [visible, setVisible] = useState(true);
  if (!visible || !message) return null;
  const v = variants[variant] || variants.info;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${v.bg} ${v.text} mb-4`}>
      {v.icon}
      <p className="flex-1 text-sm font-medium">{message}</p>
      {dismissible && (
        <button onClick={() => setVisible(false)} className="ml-2 hover:opacity-70 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
