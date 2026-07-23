import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import StudentModule from './components/StudentModule';
import SupervisorModule from './components/SupervisorModule';
import ITFModule from './components/ITFModule';
import InstitutionAdminModule from './components/InstitutionAdminModule';
import Login from './components/Login';
import Register from './components/Register';
import Settings from './components/Settings';
import itfLogo from './assets/itf-logo.png';
import { User, LogOut, ShieldCheck, Briefcase, GraduationCap, Building2, Bell, Settings as SettingsIcon } from 'lucide-react';

interface AuthUser {
  role: UserRole;
  identifier: string;
  name: string;
  institution_details?: any;
}

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('siwes_access_token');
      if (token) {
        try {
          const userData = await import('./services/api').then(m => m.authService.getCurrentUser());
          setUser({
            role: userData.role as UserRole,
            identifier: userData.matric_number || userData.username,
            name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
            institution_details: userData.institution_details
          });
          localStorage.setItem('siwes_auth_user', JSON.stringify(userData));
        } catch (err) {
          console.error("Session expired or invalid", err);
          handleLogout();
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    import('./services/api').then(m => m.authService.getNotifications())
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [user]);

  const handleLogin = async (role: UserRole, identifier: string) => {
     try {
        const userData = await import('./services/api').then(m => m.authService.getCurrentUser());
        setUser({
            role: userData.role as UserRole,
            identifier: userData.matric_number || userData.username,
            name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
            institution_details: userData.institution_details
        });
        localStorage.setItem('siwes_auth_user', JSON.stringify(userData));
     } catch (e) {
         console.error("Failed to fetch user details after login");
     }
  };

  const handleLogout = () => {
    setUser(null);
    setShowSettings(false);
    setShowNotifications(false);
    import('./services/api').then(m => m.authService.logout());
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.STUDENT: return <GraduationCap size={18} />;
      case UserRole.SUPERVISOR: return <ShieldCheck size={18} />;
      case UserRole.INSTITUTION_ADMIN: return <Building2 size={18} />;
      case UserRole.ITF_OFFICER: return <Briefcase size={18} />;
    }
  };

  const handleRegisterSuccess = async (role: UserRole, username: string) => {
      setShowRegister(false);
      alert('Registration successful! Please sign in.');
  }

  if (!user) {
    if (showRegister) {
        return <Register onSwitchToLogin={() => setShowRegister(false)} onSuccess={handleRegisterSuccess} />;
    }
    return <Login onLogin={handleLogin} onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      
      {/* Dashboard Header */}
      <nav className="bg-emerald-900 text-white px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded shadow-sm">
             <img src={itfLogo} alt="Industrial Training Fund logo" className="w-8 h-8 rounded object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">SIWES+</h1>
            <p className="text-[10px] text-emerald-300 font-medium tracking-wider uppercase mt-0.5">Industrial Training Fund</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowNotifications(value => !value)}
            className="p-2 text-emerald-100 hover:bg-emerald-800 rounded-full transition-colors relative"
            aria-label="View notifications"
          >
            <Bell size={20} />
            {notifications.some(notification => !notification.is_read) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-emerald-900"></span>}
          </button>
          {showNotifications && (
            <div className="absolute right-24 top-14 z-50 w-80 rounded-xl bg-white text-slate-800 shadow-xl ring-1 ring-black/10 overflow-hidden">
              <div className="px-4 py-3 border-b font-bold text-sm">Notifications</div>
              {notifications.length ? notifications.slice(0, 5).map(notification => (
                <button key={notification.id} onClick={() => import('./services/api').then(m => m.authService.markNotificationRead(notification.id)).then(() => setNotifications(items => items.map(item => item.id === notification.id ? {...item, is_read: true} : item)))} className={`block w-full px-4 py-3 border-b last:border-0 text-left text-xs ${notification.is_read ? 'text-slate-500' : 'bg-emerald-50 text-slate-800 font-medium'}`}>
                  {notification.message}
                </button>
              )) : <div className="px-4 py-5 text-xs text-slate-400">No notifications.</div>}
            </div>
          )}
          
          <div className="h-8 w-px bg-emerald-800 hidden sm:block"></div>
          
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-none">{user.name}</p>
              <p className="text-[10px] text-emerald-300 font-medium mt-1 flex items-center justify-end gap-1">
                {getRoleIcon(user.role)}
                <span className="capitalize">{user.role.replace('_', ' ').toLowerCase()}</span>
              </p>
            </div>
            
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-emerald-800 rounded-lg text-emerald-100 transition-colors"
                title="Settings"
            >
                <SettingsIcon size={20} />
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-800/50 hover:bg-rose-600/20 hover:text-rose-100 text-emerald-100 rounded-lg text-xs font-bold transition-all group"
            >
              <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden flex flex-col">
        {user.role === UserRole.STUDENT && <StudentModule />}
        {user.role === UserRole.SUPERVISOR && <SupervisorModule />}
        {user.role === UserRole.INSTITUTION_ADMIN && <InstitutionAdminModule />}
        {user.role === UserRole.ITF_OFFICER && <ITFModule />}
      </main>
    </div>
  );
};

export default App;
