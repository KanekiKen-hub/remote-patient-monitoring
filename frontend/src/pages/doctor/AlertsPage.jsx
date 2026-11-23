import { useEffect, useState, useCallback } from 'react';
import { Bell, Filter, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import AlertLevelBadge from '../../components/AlertLevelBadge';
import { alertService } from '../../services/alertService';
import { format, parseISO } from 'date-fns';

function safeFormat(ts) {
  try { return format(parseISO(ts), 'MMM d, HH:mm'); } catch { return ts || '—'; }
}

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Unreviewed', value: 'unreviewed' },
  { label: 'Level 2', value: '2' },
  { label: 'Level 3', value: '3' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [reviewingId, setReviewingId] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await alertService.getAlerts();
      const nextAlerts =
        res.data?.data?.alerts ??
        res.data?.alerts ??
        (Array.isArray(res.data) ? res.data : []);
      setAlerts(Array.isArray(nextAlerts) ? nextAlerts : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleReview = async (id) => {
    setReviewingId(id);
    try {
      await alertService.reviewAlert(id);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setReviewingId(null);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'unreviewed') return !a.reviewed;
    if (filter === '2') return (a.alertLevel || a.level) === 2;
    if (filter === '3') return (a.alertLevel || a.level) === 3;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{alerts.filter((a) => !a.reviewed).length} unreviewed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={8} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No alerts match your filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Patient</th>
                  <th className="pb-3 pr-4">Level</th>
                  <th className="pb-3 pr-4">HR</th>
                  <th className="pb-3 pr-4">SpO2</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a._id || a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-gray-800">{a.patientName || a.patientId}</td>
                    <td className="py-3 pr-4"><AlertLevelBadge level={a.alertLevel || a.level} size="sm" /></td>
                    <td className="py-3 pr-4 text-gray-700">{a.heartRate ?? '—'} BPM</td>
                    <td className="py-3 pr-4 text-gray-700">{a.spo2 != null ? `${a.spo2}%` : '—'}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{safeFormat(a.createdAt || a.timestamp)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold ${a.reviewed ? 'text-green-600' : 'text-amber-600'}`}>
                        {a.reviewed ? 'Reviewed' : 'Unreviewed'}
                      </span>
                    </td>
                    <td className="py-3">
                      {!a.reviewed && (
                        <button
                          onClick={() => handleReview(a._id || a.id)}
                          disabled={reviewingId === (a._id || a.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {reviewingId === (a._id || a.id) ? 'Reviewing...' : 'Review'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
