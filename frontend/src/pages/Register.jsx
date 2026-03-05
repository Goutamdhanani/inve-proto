import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff, FiShield, FiUserPlus } from 'react-icons/fi';
import useAuthStore from '../store/authStore.js';
import Alert from '../components/ui/Alert.jsx';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [registered, setRegistered] = useState(false);

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const getPasswordStrength = () => {
    if (!password) return null;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];
    const passed = checks.filter(Boolean).length;
    if (passed <= 1) return { label: 'Weak', color: 'text-red-500' };
    if (passed === 2) return { label: 'Fair', color: 'text-amber-500' };
    if (passed === 3) return { label: 'Good', color: 'text-blue-500' };
    return { label: 'Strong', color: 'text-emerald-500' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAlert();

    if (!PASSWORD_REGEX.test(password)) {
      return showAlert(
        'Password must be at least 8 characters with one uppercase letter, one number, and one special character.'
      );
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      setRegistered(true);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUserPlus className="text-emerald-600" size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Registration Submitted!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your account is pending approval. An administrator will review your request and you'll be able to log in once approved.
          </p>
          <Link to="/login" className="btn btn-primary justify-center w-full">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiShield className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-500 text-sm mt-1">Register to request access</p>
        </div>

        {alert && (
          <Alert message={alert.message} type={alert.type} onClose={clearAlert} />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {strength && (
              <p className={`text-xs mt-1 ${strength.color}`}>Strength: {strength.label}</p>
            )}
            <ul className="text-xs text-slate-400 mt-1 space-y-0.5 list-disc list-inside">
              <li className={password.length >= 8 ? 'text-emerald-500' : ''}>At least 8 characters</li>
              <li className={/[A-Z]/.test(password) ? 'text-emerald-500' : ''}>One uppercase letter</li>
              <li className={/\d/.test(password) ? 'text-emerald-500' : ''}>One number</li>
              <li className={/[^A-Za-z0-9]/.test(password) ? 'text-emerald-500' : ''}>One special character</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center py-3"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiUserPlus size={16} />
            )}
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
