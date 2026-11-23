import { useEffect, useState, useCallback } from 'react';
import { PlusCircle, UserPlus, UserMinus, Copy, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import AlertBanner from '../../components/ui/AlertBanner';
import { deviceService } from '../../services/deviceService';
import { patientService } from '../../services/patientService';
import { format, parseISO } from 'date-fns';

function safeFormat(ts) {
  try { return format(parseISO(ts), 'MMM d, yyyy'); } catch { return ts || '—'; }
}

function TokenModal({ open, onClose, token }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Modal isOpen={open} onClose={onClose} title="Device Token — Save Now">
      <AlertBanner variant="warning" message="This token will not be shown again. Store it securely." />
      <div className="bg-gray-50 border rounded-lg p-4 mt-3">
        <p className="font-mono text-sm text-gray-800 break-all">{token}</p>
      </div>
      <Button variant="primary" onClick={copy} className="mt-4 w-full">
        {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Token</>}
      </Button>
    </Modal>
  );
}

export default function DeviceAdmin() {
  const [devices, setDevices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newToken, setNewToken] = useState('');
  const [tokenOpen, setTokenOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignPatientId, setAssignPatientId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, pRes] = await Promise.all([deviceService.getDevices(), patientService.getPatients()]);
      const nextDevices =
        dRes.data?.data?.devices ??
        dRes.data?.devices ??
        (Array.isArray(dRes.data) ? dRes.data : []);
      const nextPatients =
        pRes.data?.data?.patients ??
        pRes.data?.patients ??
        (Array.isArray(pRes.data) ? pRes.data : []);
      setDevices(Array.isArray(nextDevices) ? nextDevices : []);
      setPatients(Array.isArray(nextPatients) ? nextPatients : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createDevice = async () => {
    setCreateLoading(true);
    try {
      const res = await deviceService.createDevice();
      const token =
        res.data?.data?.rawToken ||
        res.data?.rawToken ||
        res.data?.token ||
        res.data?.deviceToken;
      if (token) { setNewToken(token); setTokenOpen(true); }
      fetchData();
    } finally {
      setCreateLoading(false);
    }
  };

  const assign = async () => {
    if (!assignTarget || !assignPatientId) return;
    setAssignLoading(true);
    try {
      await deviceService.assignDevice(assignTarget._id || assignTarget.id, assignPatientId);
      setAssignTarget(null);
      setAssignPatientId('');
      fetchData();
    } finally {
      setAssignLoading(false);
    }
  };

  const unassign = async (id) => {
    await deviceService.unassignDevice(id);
    fetchData();
  };

  const patientMap = Object.fromEntries(
    patients.map((p) => [p.patientId || p._id || p.id, p.name])
  );
  const unassignedPatients = patients.filter((p) => !p.assignedDevice && !p.deviceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Administration</h1>
          <p className="text-sm text-gray-500 mt-0.5">{devices.length} devices registered</p>
        </div>
        <Button variant="primary" loading={createLoading} onClick={createDevice}>
          <PlusCircle className="h-4 w-4" /> Create Device
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={8} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Device ID</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Assigned Patient</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {devices.map((d) => {
                  const pid = d.assignedPatient?.patientId || d.patientId;
                  const patientName = d.assignedPatient?.name || patientMap[pid] || pid;
                  return (
                    <tr key={d._id || d.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4"><code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{d.deviceId || d._id}</code></td>
                      <td className="py-3 pr-4"><Badge variant={pid ? 'success' : 'default'}>{pid ? 'Active' : 'Unassigned'}</Badge></td>
                      <td className="py-3 pr-4">{pid ? <span className="font-medium text-gray-800">{patientName}</span> : <span className="text-gray-400 text-xs">—</span>}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{safeFormat(d.createdAt)}</td>
                      <td className="py-3">
                        {!pid ? (
                          <button onClick={() => { setAssignTarget(d); setAssignPatientId(''); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                            <UserPlus className="h-3.5 w-3.5" /> Assign
                          </button>
                        ) : (
                          <button onClick={() => unassign(d._id || d.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                            <UserMinus className="h-3.5 w-3.5" /> Unassign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {devices.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No devices found</p>}
          </div>
        )}
      </Card>

      <TokenModal open={tokenOpen} onClose={() => setTokenOpen(false)} token={newToken} />

      <Modal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} title="Assign Device">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient</label>
            <select value={assignPatientId} onChange={(e) => setAssignPatientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Choose a patient...</option>
              {unassignedPatients.map((p) => (
                <option key={p.patientId || p._id || p.id} value={p.patientId || p._id || p.id}>
                  {p.name} {p.patientId ? `(${p.patientId})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAssignTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="primary" loading={assignLoading} onClick={assign} className="flex-1">Assign</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
