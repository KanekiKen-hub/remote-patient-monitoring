import { Outlet } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">HealthMonitor RPM</h1>
          <p className="text-blue-200 text-sm mt-1">Privacy-Preserving Remote Patient Monitoring</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
