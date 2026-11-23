import { useEffect, useState, useCallback } from 'react';
import { Users, Cpu, Bell, UserCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { patientService } from '../../services/patientService';
import { deviceService } from '../../services/deviceService';
import { alertService } from '../../services/alertService';

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {loading ? <div className="mt-1"><Spinner size={5} /></div> : (
          <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [patients, setPatients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, dRes, aRes] = await Promise.all([
        patientService.getPatients(),
        deviceService.getDevices(),
        alertService.getAlerts(),
      ]);
      setPatients(pRes.data?.data?.patients ?? pRes.data?.patients ?? (Array.isArray(pRes.data) ? pRes.data : []));
      setDevices(dRes.data?.data?.devices ?? dRes.data?.devices ?? (Array.isArray(dRes.data) ? dRes.data : []));
      setAlerts(aRes.data?.data?.alerts ?? aRes.data?.alerts ?? (Array.isArray(aRes.data) ? aRes.data : []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Patients" value={patients.length} color="bg-blue-600" loading={loading} />
        <StatCard icon={Cpu} label="Total Devices" value={devices.length} color="bg-indigo-600" loading={loading} />
        <StatCard icon={Bell} label="Total Alerts" value={alerts.length} color="bg-red-600" loading={loading} />
        <StatCard
          icon={UserCheck}
          label="Active Devices"
          value={devices.filter((d) => d.patientId).length}
          color="bg-green-600"
          loading={loading}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/users" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:border-blue-300 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">User Management</p>
              <p className="text-xs text-gray-500">Manage doctors and patients</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </Link>
        <Link to="/admin/devices" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:border-blue-300 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Cpu className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Device Management</p>
              <p className="text-xs text-gray-500">Register and manage IoT devices</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </Link>
      </div>

      {/* Recent patients */}
      <Card title="Recent Patients" action={
        <Link to="/admin/users" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.slice(0, 8).map((p) => (
                  <tr key={p._id || p.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{p.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.email}</td>
                    <td className="py-2.5">
                      <Badge variant={p.deviceId ? 'success' : 'default'}>
                        {p.deviceId ? 'Assigned' : 'No device'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {patients.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No patients registered</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
