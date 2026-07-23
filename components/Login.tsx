
import React, { useState } from 'react';
import { UserRole } from '../types';
import { LogIn, GraduationCap, ShieldCheck, Briefcase, Building2, Lock, User as UserIcon } from 'lucide-react';
import itfLogo from '../assets/itf-logo.png';

interface LoginProps {
  onLogin: (role: UserRole, identifier: string) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (identifier.trim() && password) { // Require password
      setLoading(true);
      try {
        // We use identifier as username for MVP
        const data = await import('../services/api').then(m => m.authService.login(identifier, password));
        if (data && data.access) {
            // Verify role matches
            const user = await import('../services/api').then(m => m.authService.getCurrentUser());
            if (user.role !== role) {
                import('../services/api').then(m => m.authService.logout());
                setError(`Access Denied. This account is not a ${role.replace('_', ' ')} account.`);
                return;
            }
            // Decode token or user info if needed, but for now we pass basic info
            // The App.tsx main logic will probably need to fetch the full user profile
             onLogin(role, identifier); 
        } else {
            setError('Login failed. Please check credentials.');
        }
      } catch (err: any) {
         setError(err.response?.data?.detail || 'An error occurred during login.');
      } finally {
        setLoading(false);
      }
    }
  };

  const roles = [
    { id: UserRole.STUDENT, icon: GraduationCap, label: 'Student', desc: 'Matric Number' },
    { id: UserRole.SUPERVISOR, icon: ShieldCheck, label: 'Supervisor', desc: 'Staff ID' },
    { id: UserRole.INSTITUTION_ADMIN, icon: Building2, label: 'School Admin', desc: 'Admin ID' },
    { id: UserRole.ITF_OFFICER, icon: Briefcase, label: 'ITF Officer', desc: 'Officer Email' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="p-8 text-center bg-slate-50 border-b">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <img src={itfLogo} alt="Industrial Training Fund logo" className="w-10 h-10 rounded object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SIWES Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Industrial Training Fund, Nigeria</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Access Level</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      role === r.id 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon size={18} />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={roles.find(r => r.id === role)?.desc}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
                loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-[0.98]'
            }`}
          >
            {loading ? 'Signing in...' : (
                <>
                <LogIn size={20} />
                Sign In to Dashboard
                </>
            )}
          </button>

            <div className="text-center pt-2 space-y-2">
             <button type="button" onClick={onSwitchToRegister} className="text-xs text-emerald-600 font-bold hover:underline block w-full">
                Don't have an account? Sign Up
             </button>
             <a href="#" className="text-xs text-slate-400 font-medium hover:text-slate-600">Forgot your credentials?</a>
          </div>
        </form>

        <div className="px-8 pb-8 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            By signing in, you agree to the ITF SIWES Digital Usage Terms & Conditions.
          </p>
        </div>
      </div>
    </div>
  );
};


export default Login;
