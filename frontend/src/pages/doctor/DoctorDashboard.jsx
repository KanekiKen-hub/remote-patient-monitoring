import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Cpu, AlertTriangle, Bell, ArrowRight, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import AlertLevelBadge from '../../components/AlertLevelBadge';
import { patientService } from '../../services/patientService';
import { deviceService } from '../../services/deviceService';
import { alertService } from '../../services/alertService';
import { format, parseISO } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {loading ? (
          <div className="mt-1"><Spinner size={5} /></div>
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        )}
      </div>
    </div>
  );
}

function safeFormat(ts) {
  try { return format(parseISO(ts), 'MMM d, HH:mm'); } catch { return ts || '—'; }
}

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [pRes, dRes, aRes] = await Promise.all([
        patientService.getPatients(),
        deviceService.getDevices(),
        alertService.getAlerts({ limit: 5 }),
      ]);
      setPatients(pRes.data?.data?.patients ?? pRes.data?.patients ?? (Array.isArray(pRes.data) ? pRes.data : []));
      setDevices(dRes.data?.data?.devices ?? dRes.data?.devices ?? (Array.isArray(dRes.data) ? dRes.data : []));
      setAlerts(aRes.data?.data?.alerts ?? aRes.data?.alerts ?? (Array.isArray(aRes.data) ? aRes.data : []));
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const patientList = Array.isArray(patients) ? patients : [];
  const deviceList = Array.isArray(devices) ? devices : [];
  const alertList = Array.isArray(alerts) ? alerts : [];

  const activeDevices = deviceList.filter((d) => d.status === 'active' || d.patientId).length;
  const needAttention = patientList.filter((p) => p.alertLevel >= 2).length;
  const unreviewed = alertList.filter((a) => !a.reviewed).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Patients" value={patientList.length} color="bg-blue-600" loading={loading} />
        <StatCard icon={Cpu} label="Active Devices" value={activeDevices} color="bg-indigo-600" loading={loading} />
        <StatCard icon={AlertTriangle} label="Needs Attention" value={needAttention} color="bg-amber-500" loading={loading} />
        <StatCard icon={Bell} label="Unreviewed Alerts" value={unreviewed} color="bg-red-600" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent alerts */}
        <Card
          title="Recent Alerts"
          action={
            <Link to="/doctor/alerts" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : alertList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertList.slice(0, 5).map((alert) => (
                <div key={alert._id || alert.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <AlertLevelBadge level={alert.alertLevel || alert.level} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{alert.patientName || alert.patientId}</p>
                      <p className="text-xs text-gray-500">HR: {alert.heartRate} · SpO2: {alert.spo2}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{safeFormat(alert.createdAt || alert.timestamp)}</p>
                    {!alert.reviewed && (
                      <span className="text-xs font-semibold text-amber-600">Unreviewed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Patient overview table */}
        <Card
          title="Patient Overview"
          action={
            <Link to="/doctor/patients" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : patientList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No patients assigned</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="pb-3 pr-4">Level</th>
                    <th className="pb-3 pr-4">HR</th>
                    <th className="pb-3">SpO2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patientList.slice(0, 6).map((p) => (
                    <tr key={p._id || p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <Link to={`/doctor/patients/${p._id || p.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <AlertLevelBadge level={p.alertLevel || 1} size="sm" />
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700">{p.heartRate ?? '—'}</td>
                      <td className="py-2.5 text-gray-700">{p.spo2 != null ? `${p.spo2}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
