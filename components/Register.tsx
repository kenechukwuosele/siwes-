import React, { useEffect, useState } from 'react';
import { UserRole } from '../types';
import { UserPlus, GraduationCap, Mail, Lock, User as UserIcon, ArrowLeft, Building } from 'lucide-react';

interface RegisterProps {
    onSwitchToLogin: () => void;
    onSuccess: (role: UserRole, username: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin, onSuccess }) => {
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
    const [institutions, setInstitutions] = useState<any[]>([]);

    useEffect(() => {
        import('../services/api').then(m => m.institutionService.getAll())
            .then(setInstitutions)
            .catch(() => setError('Institutions could not be loaded. Please try again later.'));
    }, []);


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
                role: UserRole.STUDENT,
                matric_number: formData.username
            };
            
            await import('../services/api').then(m => m.authService.register(payload));
            
            // Auto login logic could go here, but for now let's just trigger success callback
            onSuccess(UserRole.STUDENT, formData.username);
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
                    <p className="text-slate-500 text-sm mt-1">Student registration. Staff accounts are issued by an administrator.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs break-words border border-red-100">
                           {error}
                        </div>
                    )}

                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                        <GraduationCap size={20} /> Student account
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
                                placeholder="Matric Number"
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

                    <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Building size={18} />
                            </div>
                             <select
                                name="institution"
                                required
                                value={formData.institution}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                             >
                                <option value="">Select your institution</option>
                                {institutions.map(institution => <option key={institution.id} value={institution.id}>{institution.name}</option>)}
                             </select>
                        </div>

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
