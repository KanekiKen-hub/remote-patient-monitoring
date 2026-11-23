import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import { UserCircle, Mail, Shield } from 'lucide-react';

export default function DoctorProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Account information and settings</p>
      </div>

      <Card>
        <div className="flex items-center gap-5 pb-6 border-b border-gray-100 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'D'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Email</p>
              <p className="text-sm text-gray-800">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Role</p>
              <p className="text-sm text-gray-800 capitalize">{user?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 font-medium">User ID</p>
              <p className="text-sm font-mono text-gray-700">{user?.id || user?._id || '—'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
