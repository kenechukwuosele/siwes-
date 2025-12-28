import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Save, User, FileText, Lock, Building, Upload, ArrowLeft } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    // In a real app, fetch fresh user data
    const fetchProfile = async () => {
        try {
            const userData = await import('../services/api').then(m => m.authService.getCurrentUser());
            setUser(userData);
        } catch (e) {
            console.error(e);
        }
    }
    fetchProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
        setMessage({ type: 'error', text: "New passwords don't match" });
        return;
    }
    setLoading(true);
    try {
        await import('../services/api').then(m => m.authService.changePassword(passwordData.current, passwordData.new));
        setMessage({ type: 'success', text: "Password updated successfully" });
        setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
        setMessage({ type: 'error', text: err.response?.data?.detail || "Failed to update password" });
    } finally {
        setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('acceptance_letter', file);

      setLoading(true);
      try {
          const updatedUser = await import('../services/api').then(m => m.authService.updateProfile(formData));
          setUser(updatedUser);
          setMessage({ type: 'success', text: "Acceptance letter uploaded!" });
      } catch (err) {
          setMessage({ type: 'error', text: "Upload failed" });
      } finally {
          setLoading(false);
      }
  };

    return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-right">
        <div className="p-4 border-b flex items-center gap-4 bg-slate-50 sticky top-0 z-10 shadow-sm">
            <button 
                onClick={onClose} 
                className="p-2 -ml-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-full transition-colors"
                title="Go Back"
            >
                <ArrowLeft size={24} />
            </button>
            <h2 className="font-bold text-xl text-slate-800">Settings</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-8">
            {!user ? (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
                    Loading settings...
                 </div>
            ) : (
                <>
                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Profile Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <User size={20} className="text-emerald-600"/>
                            <h3 className="font-bold text-lg text-slate-700">My Profile</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border">
                                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                                <p className="font-medium text-slate-800">{user.first_name} {user.last_name}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border">
                                <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                                <p className="font-medium text-slate-800">{user.role}</p>
                            </div>
                             <div className="p-4 bg-slate-50 rounded-xl border">
                                <label className="text-xs font-bold text-slate-400 uppercase">Username / ID</label>
                                <p className="font-medium text-slate-800">{user.username}</p>
                            </div>
                            {user.institution_details && (
                                 <div className="p-4 bg-slate-50 rounded-xl border border-l-4" style={{borderLeftColor: user.institution_details.brand_color || '#10b981'}}>
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                                        <Building size={12} /> Institution
                                    </label>
                                    <p className="font-medium text-slate-800">{user.institution_details.name}</p>
                                </div>
                            )}
                        </div>

                        {user.role === 'STUDENT' && (
                            <div className="mt-4 border rounded-xl p-4 bg-slate-50 border-dashed border-slate-300">
                                <div className="flex justify-between items-center mb-2">
                                     <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                        <FileText size={14} /> Acceptance Letter
                                    </label>
                                     {user.acceptance_letter && (
                                         <a href={user.acceptance_letter} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 underline">View Current</a>
                                     )}
                                </div>
                               
                                <label className="flex flex-col items-center justify-center h-24 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                    {loading ? <span className="text-xs text-slate-400">Uploading...</span> : (
                                        <>
                                            <Upload size={20} className="text-slate-400 mb-1"/>
                                            <span className="text-xs font-medium text-slate-600">Click to Upload PDF/Image</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={loading}/>
                                </label>
                            </div>
                        )}
                    </section>

                    {/* Security Section */}
                     <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Lock size={20} className="text-emerald-600"/>
                            <h3 className="font-bold text-lg text-slate-700">Security</h3>
                        </div>

                        <form onSubmit={handlePasswordChange} className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Current Password</label>
                                <input 
                                    type="password" 
                                    required
                                    className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                                    value={passwordData.current}
                                    onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">New Password</label>
                                     <input 
                                        type="password" 
                                        required
                                        className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                                        value={passwordData.new}
                                        onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                                     <input 
                                        type="password" 
                                        required
                                        className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                                        value={passwordData.confirm}
                                        onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="pt-2">
                                 <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </section>
                </>
            )}
        </div>
    </div>
  );
}

export default Settings;
