import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import Button from './ui/Button';
import AlertBanner from './ui/AlertBanner';
import { readingService } from '../services/readingService';

function rand(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

const presets = {
  normal: { label: 'Simulate Normal', hr: () => rand(70, 90), spo2: () => rand(96, 100) },
  attention: { label: 'Simulate Attention', hr: () => rand(95, 110), spo2: () => rand(90, 94) },
  alert: { label: 'Simulate Alert', hr: () => rand(115, 140), spo2: () => rand(82, 89) },
};

export default function MockSensorPanel({ patientId, onReadingSent }) {
  const [open, setOpen] = useState(false);
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const send = async (heartRate, spo2Val) => {
    setLoading(true);
    setFeedback(null);
    try {
      await readingService.sendMockReading(patientId, heartRate, spo2Val);
      setFeedback({ type: 'success', msg: `Reading sent — HR: ${heartRate} BPM, SpO2: ${spo2Val}%` });
      if (onReadingSent) onReadingSent();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to send reading' });
    } finally {
      setLoading(false);
    }
  };

  const sendPreset = (key) => {
    const p = presets[key];
    const h = p.hr();
    const s = p.spo2();
    setHr(String(h));
    setSpo2(String(s));
    send(h, s);
  };

  const sendManual = () => {
    const h = parseInt(hr);
    const s = parseInt(spo2);
    if (!h || !s || h < 20 || h > 250 || s < 50 || s > 100) {
      setFeedback({ type: 'error', msg: 'Enter valid HR (20–250) and SpO2 (50–100)' });
      return;
    }
    send(h, s);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-white hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="font-semibold text-sm">Mock Sensor (Demo Mode)</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => sendPreset('normal')}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Simulate Normal
            </button>
            <button
              onClick={() => sendPreset('attention')}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Simulate Attention
            </button>
            <button
              onClick={() => sendPreset('alert')}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Simulate Alert
            </button>
          </div>

          {/* Manual input */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Manual Input</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Heart Rate (BPM)</label>
                <input
                  type="number"
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                  placeholder="e.g. 75"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  placeholder="e.g. 98"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <Button variant="primary" size="sm" loading={loading} onClick={sendManual} className="w-full">
              Send Reading
            </Button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`text-xs px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
              {feedback.msg}
            </div>
          )}

          <p className="text-xs text-gray-500">These values are for demonstration only.</p>
        </div>
      )}
    </div>
  );
}
