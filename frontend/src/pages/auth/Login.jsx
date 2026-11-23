import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';

const roleRedirect = {
  admin: '/admin',
  doctor: '/doctor',
  patient: '/patient',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const path = roleRedirect[user.role] || '/login';
      navigate(path, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Sign In</h2>
        <p className="text-blue-200 text-sm mt-1">Access your monitoring dashboard</p>
      </div>

      {error && <AlertBanner variant="error" message={error} dismissible />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-blue-100 mb-1.5">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@hospital.com"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-100 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full bg-white text-blue-700 hover:bg-blue-50 border-0 mt-2"
        >
          Sign In
        </Button>
      </form>

      {/* Demo Credentials Quick-Select */}
      <div className="mt-5 pt-4 border-t border-white/20">
        <p className="text-xs font-semibold text-blue-200 mb-2.5 text-center uppercase tracking-wider">
          Quick Demo Login
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail('doctor@rpm.local');
              setPassword('Doctor@123');
            }}
            className="px-2 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-lg transition-colors font-medium text-center"
          >
            👨‍⚕️ Doctor
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('p001@rpm.local');
              setPassword('Patient@123');
            }}
            className="px-2 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-lg transition-colors font-medium text-center"
          >
            🏥 Patient
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@rpm.local');
              setPassword('Admin@123');
            }}
            className="px-2 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-lg transition-colors font-medium text-center"
          >
            ⚙️ Admin
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-xs text-blue-300 text-center flex items-center justify-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Secured by privacy-preserving AI monitoring
        </p>
      </div>
    </div>
  );
}
