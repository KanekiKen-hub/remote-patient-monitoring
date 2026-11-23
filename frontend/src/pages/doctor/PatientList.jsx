import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import AlertLevelBadge from '../../components/AlertLevelBadge';
import AlertBanner from '../../components/ui/AlertBanner';
import { patientService } from '../../services/patientService';
import { format, parseISO } from 'date-fns';

function safeFormat(ts) {
  try { return format(parseISO(ts), 'MMM d, HH:mm'); } catch { return ts || '—'; }
}

function AddPatientModal({ open, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', dob: '', gender: '', contact: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await patientService.createPatient(form);
      onAdded();
      onClose();
      setForm({ name: '', email: '', password: '', dob: '', gender: '', contact: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add New Patient">
      {error && <AlertBanner variant="error" message={error} dismissible />}
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
          { name: 'email', label: 'Email', type: 'email', placeholder: 'patient@example.com' },
          { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          { name: 'dob', label: 'Date of Birth', type: 'date' },
          { name: 'contact', label: 'Contact Number', type: 'tel', placeholder: '+1 (555) 000-0000' },
        ].map(({ name, label, type, placeholder }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              name={name}
              required={name !== 'contact'}
              value={form[name]}
              onChange={handleChange}
              placeholder={placeholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} className="flex-1">Add Patient</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await patientService.getPatients();
      const nextPatients =
        res.data?.data?.patients ??
        res.data?.patients ??
        (Array.isArray(res.data) ? res.data : []);
      setPatients(Array.isArray(nextPatients) ? nextPatients : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filtered = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      (p._id || p.id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} patients total</p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add Patient
        </Button>
      </div>

      <Card>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name or ID..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={8} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">{search ? 'No patients match your search' : 'No patients found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Patient</th>
                  <th className="pb-3 pr-4">Device</th>
                  <th className="pb-3 pr-4">Level</th>
                  <th className="pb-3 pr-4">HR</th>
                  <th className="pb-3 pr-4">SpO2</th>
                  <th className="pb-3 pr-4">Last Updated</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p._id || p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {p.deviceId ? (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">{p.deviceId}</span>
                      ) : (
                        <span className="text-xs text-gray-400">No device</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <AlertLevelBadge level={p.alertLevel || 1} size="sm" />
                    </td>
                    <td className="py-3 pr-4 text-gray-700 font-medium">{p.heartRate ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-700 font-medium">{p.spo2 != null ? `${p.spo2}%` : '—'}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{safeFormat(p.lastReading || p.updatedAt)}</td>
                    <td className="py-3">
                      <Link
                        to={`/doctor/patients/${p._id || p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddPatientModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchPatients} />
    </div>
  );
}
