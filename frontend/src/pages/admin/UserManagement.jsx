import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import AlertBanner from '../../components/ui/AlertBanner';
import { patientService } from '../../services/patientService';
import api from '../../services/api';

function AddUserModal({ open, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (form.role === 'patient') {
        await patientService.createPatient(form);
      } else {
        await api.post('/auth/register', form);
      }
      onAdded();
      onClose();
      setForm({ name: '', email: '', password: '', role: 'patient' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add New User">
      {error && <AlertBanner variant="error" message={error} dismissible />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select name="role" value={form.role} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {['name', 'email', 'password'].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
            <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              name={field} value={form[field]} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} className="flex-1">Create User</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function UserManagement() {
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
    (p) => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} registered patients</p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={8} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">DOB</th>
                  <th className="pb-3 pr-4">Gender</th>
                  <th className="pb-3">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p._id || p.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{p.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.email}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.dob || '—'}</td>
                    <td className="py-2.5 pr-4 text-gray-500 capitalize">{p.gender || '—'}</td>
                    <td className="py-2.5">
                      <Badge variant={p.deviceId ? 'success' : 'default'}>
                        {p.deviceId ? 'Assigned' : 'No device'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No users found</p>
            )}
          </div>
        )}
      </Card>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchPatients} />
    </div>
  );
}
