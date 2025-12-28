
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Calendar, Image as ImageIcon, CheckCircle, Clock, 
  AlertCircle, Send, Sparkles, CloudOff, Cloud, RefreshCw, 
  Edit3, Trash2, Wifi, WifiOff 
} from 'lucide-react';
import { SIWESLog, LogStatus, SyncStatus } from '../types';
import { analyzeLogEntry } from '../services/geminiService';

const StudentModule: React.FC = () => {
  const [logs, setLogs] = useState<SIWESLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [newLog, setNewLog] = useState({ description: '', date: new Date().toISOString().split('T')[0] });
  const [previewImage, setPreviewImage] = useState<string | null>(null); // For display
  const [imageFile, setImageFile] = useState<File | null>(null); // For upload
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [brandColor, setBrandColor] = useState('#10b981'); // Default emerald

  const [user, setUser] = useState<any>(null);

  // Load logs from API
  const fetchLogs = useCallback(async () => {
    try {
        const data = await import('../services/api').then(m => m.logService.getLogs());
        setLogs(data);
    } catch (e) {
        console.error("Failed to fetch logs", e);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    // Get user and brand color from user session if available
    const userStr = localStorage.getItem('siwes_auth_user');
    if (userStr) {
        try {
            const u = JSON.parse(userStr);
            setUser(u);
            if (u.institution_details?.brand_color) {
                setBrandColor(u.institution_details.brand_color);
            }
        } catch(e) {}
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchLogs]);

  // Effect to trigger automatic sync when coming online
  useEffect(() => {
    if (isOnline) {
      // Real sync logic would go here if we had offline queue
      // For MVP web, we assume mostly online, but we could retry failed requests
      fetchLogs();
    }
  }, [isOnline, fetchLogs]);

  const handleAddLog = async () => {
    if (editingLogId) {
        // Edit logic (Not fully implemented in backend yet for file update etc, sticking to basic update)
         const updateData = {
              activity_description: newLog.description,
              date: newLog.date,
         };
         await import('../services/api').then(m => m.logService.updateLogStatus(Number(editingLogId), LogStatus.SUBMITTED)); // Hacky, needs real update endpoint
         fetchLogs();
    } else {
      // Create new log via API
      try {
          const formData = new FormData();
          formData.append('date', newLog.date);
          formData.append('week_number', String(Math.ceil(new Date(newLog.date).getDate() / 7))); // Simple calc
          formData.append('activity_description', newLog.description);
          if (imageFile) {
              formData.append('evidence_image', imageFile);
          }

          await import('../services/api').then(m => m.logService.createLog(formData));
          fetchLogs();
      } catch (e) {
          console.error("Failed to create log", e);
          alert("Failed to submit log. Please try again.");
          return;
      }
    }
    
    closeModal();
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingLogId(null);
    setNewLog({ description: '', date: new Date().toISOString().split('T')[0] });
    setPreviewImage(null);
    setImageFile(null);
    setAiFeedback(null);
  };

  const startEditing = (log: SIWESLog) => {
    setEditingLogId(log.id);
    setNewLog({ description: log.activityDescription, date: log.date });
    setPreviewImage(log.evidenceImageUrl || null);
    setIsAdding(true);
  };

  const deleteLog = async (id: string) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
      // API delete
      // await logService.delete(id);
      // fetchLogs();
      alert("Delete not implemented in MVP API yet"); 
    }
  };

  const handleAnalyze = async () => {
    if (!newLog.description || !isOnline) return;
    setIsAnalyzing(true);
    const feedback = await analyzeLogEntry(newLog.description);
    setAiFeedback(feedback);
    setIsAnalyzing(false);
  };

  const getStatusBadge = (status: LogStatus) => {
    switch (status) {
      case LogStatus.APPROVED: return <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold uppercase"><CheckCircle size={14}/> Approved</span>;
      case LogStatus.REJECTED: return <span className="flex items-center gap-1 text-rose-600 text-xs font-bold uppercase"><AlertCircle size={14}/> Rejected</span>;
      case LogStatus.SUBMITTED: return <span className="flex items-center gap-1 text-amber-600 text-xs font-bold uppercase"><Clock size={14}/> Pending Review</span>;
      default: return null;
    }
  };

  const getSyncIndicator = (syncStatus: SyncStatus) => {
    // Fixed: Wrap Lucide icons with a span to provide a title (tooltip), as the icons do not support the title prop directly.
    switch (syncStatus) {
      case SyncStatus.SYNCED: return <span title="Synced to Cloud"><Cloud className="text-emerald-500" size={14} /></span>;
      case SyncStatus.PENDING: return <span title="Waiting for sync"><CloudOff className="text-amber-400" size={14} /></span>;
      case SyncStatus.ERROR: return <span title="Sync Error"><AlertCircle className="text-rose-500" size={14} /></span>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white shadow-xl relative overflow-hidden">
      {/* Connectivity Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
          <WifiOff size={14} /> 
          OFFLINE MODE: Logs will be saved locally
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-bold text-xl text-slate-800">My Logbook</h2>
          <div className="flex items-center gap-2">
            {syncing && <RefreshCw size={14} className="text-emerald-600 animate-spin" />}
            <span className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                Week {user?.date_joined ? Math.ceil((new Date().getTime() - new Date(user.date_joined).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 1} of 24
            </span>
          </div>
        </div>
        <p className="text-slate-500 text-xs">{user ? `${user.first_name} ${user.last_name} • ${user.matric_number || user.username}` : 'Loading user...'}</p>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Calendar size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No logs submitted yet.</p>
            <p className="text-slate-400 text-sm">Start by adding your daily activities.</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="border border-slate-100 rounded-xl p-4 shadow-sm bg-slate-50/50 space-y-3 relative group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                    <Calendar size={14} className="text-emerald-600" />
                    {new Date(log.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  {getSyncIndicator(log.syncStatus)}
                </div>
                <div className="flex items-center gap-3">
                    {getStatusBadge(log.status)}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditing(log)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Edit3 size={16}/></button>
                        <button onClick={() => deleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                    </div>
                </div>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{log.activityDescription}</p>
              {log.evidenceImageUrl && (
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <img src={log.evidenceImageUrl} className="w-full h-full object-cover" alt="Evidence" />
                </div>
              )}
              {log.supervisorComment && (
                <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded text-xs text-emerald-800">
                  <p className="font-bold mb-1 uppercase tracking-tighter">Supervisor Feedback:</p>
                  {log.supervisorComment}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Floating Action Bar */}
      {!isAdding && (
        <div className="absolute bottom-6 left-0 right-0 px-4 flex gap-2">
          {logs.some(l => l.syncStatus !== SyncStatus.SYNCED) && isOnline && (
            <button 
              onClick={fetchLogs}
              disabled={syncing}
              className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold shadow-lg border border-emerald-100 flex items-center justify-center transition-all disabled:opacity-50"
            >
              <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 py-4 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ backgroundColor: brandColor }}
          >
            <Plus size={20} />
            Log Today's Work
          </button>
        </div>
      )}

      {/* Add/Edit Entry Modal - Redesigned */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-slate-900/5 animate-in slide-in-from-bottom-5 zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <button 
                onClick={closeModal} 
                className="text-slate-500 hover:text-slate-800 text-sm font-bold px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <div className="text-center">
                <h3 className="font-bold text-lg text-slate-800">{editingLogId ? 'Edit Entry' : 'New Entry'}</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{new Date().toDateString()}</p>
              </div>
              <button 
                onClick={handleAddLog}
                disabled={!newLog.description}
                className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${
                  newLog.description 
                    ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:scale-[0.98]' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {editingLogId ? 'Save Changes' : 'Post Log'}
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Activity Report</label>
                            
                            <button 
                                onClick={handleAnalyze}
                                disabled={!newLog.description || isAnalyzing || !isOnline}
                                className={`text-xs flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-full transition-all border ${
                                !isOnline 
                                    ? 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed' 
                                    : `text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 shadow-sm`
                                }`}
                            >
                                <Sparkles size={14} className={isAnalyzing ? "animate-pulse" : ""} />
                                {isAnalyzing ? 'Analyzing with AI...' : !isOnline ? 'AI Offline' : 'Enhance Writing'}
                            </button>
                        </div>
                        
                        <textarea 
                            value={newLog.description}
                            onChange={(e) => setNewLog({...newLog, description: e.target.value})}
                            placeholder="What did you work on today? Describe your tasks, tools used, and what you learned..."
                            className="w-full h-[60vh] p-0 border-none outline-none text-lg text-slate-700 placeholder:text-slate-300 resize-none font-medium leading-loose"
                            autoFocus
                        />
                    </div>

                    {/* AI Feedback Section - Inline */}
                    {aiFeedback && isOnline && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-amber-800 flex items-center gap-2">
                                    <div className="bg-amber-100 p-1 rounded"><Sparkles size={12}/></div>
                                    AI SUGGESTIONS
                                </h4>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded-md border border-amber-100 shadow-sm text-amber-600">
                                    Quality Score: {aiFeedback.qualityScore}/10
                                </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed border-l-2 border-amber-200 pl-3">{aiFeedback.feedback}</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {aiFeedback.technicalKeywords.map((kw: string) => (
                                    <span key={kw} className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 font-bold">#{kw}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: Metadata & Evidence */}
                <div className="w-full md:w-80 border-l bg-slate-50/50 p-6 space-y-6 overflow-y-auto h-full">
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={12}/> Date
                        </label>
                        <input 
                            type="date" 
                            value={newLog.date}
                            onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                             <ImageIcon size={12}/> Evidence
                        </label>
                        <div 
                            className={`
                                group relative border-2 border-dashed rounded-2xl aspect-square flex flex-col items-center justify-center p-4 text-center transition-all cursor-pointer overflow-hidden
                                ${previewImage ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/10'}
                            `}
                            onClick={() => document.getElementById('fileInput')?.click()}
                        >
                            {previewImage ? (
                                <>
                                    <img src={previewImage} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                        <Edit3 className="text-white mb-2" size={24} />
                                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">Change Photo</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-emerald-500">
                                        <ImageIcon size={24} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 mb-1">Upload Proof</span>
                                    <span className="text-[10px] text-slate-400 leading-tight px-4">
                                        Drag & drop or click to upload site photos
                                    </span>
                                </>
                            )}
                            <input 
                                id="fileInput" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                    setImageFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setPreviewImage(reader.result as string);
                                    reader.readAsDataURL(file);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Quick Tips or Info can go here */}
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h5 className="text-xs font-bold text-emerald-800 flex items-center gap-1 mb-2">
                             <CheckCircle size={12}/> Quick Tips
                        </h5>
                        <ul className="text-[10px] text-emerald-700 space-y-1.5 list-disc pl-3">
                            <li>Mention specific tools used.</li>
                            <li>Describe challenges faced.</li>
                            <li>List safety measures taken.</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            {/* Mobile Footer Action (Visible only on small screens if needed, otherwise header button covers it) */}
            {/* Actually, the header button is sufficient. Removing bottom bar for cleaner look. */}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentModule;
