import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Cpu,
  Bell,
  ClipboardList,
  UserCircle,
  Activity,
  Shield,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const doctorNav = [
  { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/doctor/patients', label: 'Patients', icon: Users },
  { to: '/doctor/devices', label: 'Devices', icon: Cpu },
  { to: '/doctor/alerts', label: 'Alerts', icon: Bell },
  { to: '/doctor/recommendations', label: 'Recommendations', icon: ClipboardList },
];

const patientNav = [
  { to: '/patient', label: 'My Health', icon: Activity, end: true },
];

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/devices', label: 'Devices', icon: Cpu },
];

const navByRole = {
  doctor: doctorNav,
  patient: patientNav,
  admin: adminNav,
};

export default function Sidebar({ onNavClick }) {
  const { user } = useAuth();
  const navItems = navByRole[user?.role] || [];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">HealthMonitor</p>
          <p className="text-xs text-gray-400">RPM Platform</p>
        </div>
      </div>

      {/* Role label */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {user?.role === 'doctor' ? 'Clinical' : user?.role === 'admin' ? 'Administration' : 'Patient Portal'}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
