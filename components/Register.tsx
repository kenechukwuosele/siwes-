import React, { useState } from 'react';
import { UserRole } from '../types';
import { UserPlus, GraduationCap, ShieldCheck, Briefcase, Mail, Lock, User as UserIcon, ArrowLeft, Building } from 'lucide-react';

interface RegisterProps {
    onSwitchToLogin: () => void;
    onSuccess: (role: UserRole, username: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin, onSuccess }) => {
    const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        institution: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const roles = [
        { id: UserRole.STUDENT, icon: GraduationCap, label: 'Student', desc: 'Matric Number' },
        { id: UserRole.SUPERVISOR, icon: ShieldCheck, label: 'Supervisor', desc: 'Staff ID' },
        { id: UserRole.ITF_OFFICER, icon: Briefcase, label: 'ITF Officer', desc: 'Officer Email' },
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const payload: any = {
                ...formData,
                role: role,
                matric_number: role === UserRole.STUDENT ? formData.username : undefined
            };

            // Remove institution for ITF Officers to avoid "This field may not be blank" error
            if (role === UserRole.ITF_OFFICER) {
                delete payload.institution;
            }
            
            await import('../services/api').then(m => m.authService.register(payload));
            
            // Auto login logic could go here, but for now let's just trigger success callback
            onSuccess(role, formData.username);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Registration failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="p-8 pb-4">
                    <button 
                        onClick={onSwitchToLogin} 
                        className="flex items-center text-slate-400 hover:text-emerald-600 transition-colors text-sm font-bold"
                    >
                        <ArrowLeft size={16} className="mr-1" />
                        Back to Login
                    </button>
                    <h2 className="text-3xl font-bold text-slate-800 mt-4">Create Account</h2>
                    <p className="text-slate-500 text-sm mt-1">Join the SIWES Digital Supervision Platform</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs break-words border border-red-100">
                           {error}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Register As</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
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

                    <div className="grid grid-cols-2 gap-4">
                         <div className="relative">
                            <input
                                name="first_name"
                                required
                                placeholder="First Name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                            />
                        </div>
                         <div className="relative">
                            <input
                                name="last_name"
                                required
                                placeholder="Last Name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <UserIcon size={18} />
                        </div>
                        <input
                            name="username"
                            required
                            placeholder={roles.find(r => r.id === role)?.desc || "Username"}
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                        />
                         <p className="text-[10px] text-slate-400 mt-1 ml-1">Must be unique (e.g., matric number).</p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Mail size={18} />
                        </div>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={handleChange}
                             className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                        />
                    </div>

                    {(role === UserRole.STUDENT || role === UserRole.SUPERVISOR) && (
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Building size={18} />
                            </div>
                             <input
                                name="institution"
                                required={role === UserRole.STUDENT} // Optional for supervisor? No user requested input. Let's make it required for consistency if they are registering under a uni.
                                placeholder="Name of your Institution"
                                value={formData.institution}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                             />
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                             <Lock size={18} />
                        </div>
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                             className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
                            loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-[0.98]'
                        }`}
                    >
                         {loading ? 'Creating Account...' : (
                            <>
                            <UserPlus size={20} />
                            Create Account
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;
