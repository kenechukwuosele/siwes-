
import React, { useState, useEffect } from 'react';
import { SIWESLog, LogStatus, StudentProfile } from '../types';
// Fixed: Added missing Briefcase and Clock imports from lucide-react
import { Search, User, Filter, Check, X, FileText, Download, MessageSquare, Briefcase, Clock } from 'lucide-react';

const SupervisorModule: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchBytes, setSearchBytes] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentLogs, setStudentLogs] = useState<SIWESLog[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
        try { // @ts-ignore
            const users = await import('../services/api').then(m => m.authService.getAllStudents());
            // Filter and map to StudentProfile
            const mapped: StudentProfile[] = users
                .filter((u: any) => u.role === 'STUDENT')
                .map((u: any) => ({
                    id: u.id.toString(), // Ensure string
                    name: `${u.first_name} ${u.last_name}`,
                    matricNumber: u.matric_number,
                    institution: u.institution_details?.name || 'Unknown Institution',
                    course: u.course || 'N/A',
                    placementOrg: u.placement_org || 'N/A',
                    supervisorId: 'me', // Placeholder
                    progress: 0, // Placeholder
                    status: 'ACTIVE'
                }));
            setStudents(mapped);
            setFilteredStudents(mapped);
        } catch (error) {
            console.error("Failed to fetch students", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    
    const fetchLogs = async () => {
        try {
            const logs = await import('../services/api').then(m => m.logService.getStudentLogs(selectedStudent.id));
            setStudentLogs(logs);
        } catch (e) {
            console.error("Failed to fetch student logs", e);
        }
    };
    fetchLogs();
  }, [selectedStudent]);

  useEffect(() => {
    if (searchBytes.trim() === '') {
        setFilteredStudents(students);
    } else {
        const lower = searchBytes.toLowerCase();
        setFilteredStudents(students.filter(s => 
            s.name.toLowerCase().includes(lower) || 
            s.matricNumber.toLowerCase().includes(lower) ||
            s.placementOrg.toLowerCase().includes(lower)
        ));
    }
  }, [searchBytes, students]);


  const handleUpdateStatus = async (logId: string, status: LogStatus, comment?: string) => {
    try {
        await import('../services/api').then(m => m.logService.updateLogStatus(Number(logId), status, comment));
        // Refresh logs locally
        const updated = studentLogs.map(log => 
          log.id === logId ? { ...log, status, supervisorComment: comment } : log
        );
        setStudentLogs(updated);
    } catch (e) {
        alert("Failed to update status");
        console.error(e);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleFinalize = () => {
      if (confirm(`Are you sure you want to finalize completion for ${selectedStudent?.name}? This will lock their logbook.`)) {
          alert("Student logbook finalized successfully. Certificate generation queued.");
          // In a real app, call an API here
      }
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar: Student Roster */}
      <aside className="w-80 border-r bg-white flex flex-col h-full shrink-0 print:hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-slate-800 mb-4">My Assigned Students</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchBytes}
              onChange={(e) => setSearchBytes(e.target.value)}
              className="w-full bg-slate-100 pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <div className="p-4 text-center text-slate-400">Loading students...</div> : filteredStudents.map(student => (
            <button
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b last:border-0 ${
                selectedStudent?.id === student.id ? 'bg-emerald-50 border-r-4 border-emerald-500' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                {student.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-slate-800">{student.name}</p>
                <p className="text-xs text-slate-500 truncate w-48">{student.matricNumber} • {student.placementOrg}</p>
              </div>
            </button>
          ))}
          {filteredStudents.length === 0 && !isLoading && (
              <div className="p-8 text-center text-sm text-slate-400">No students found</div>
          )}
        </div>
      </aside>

      {/* Main Content: Review Area */}
      <div className="flex-1 overflow-y-auto print:overflow-visible">
        {!selectedStudent ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <User size={64} strokeWidth={1} className="mb-4 text-slate-200" />
            <p className="font-medium">Select a student from the roster to begin review</p>
          </div>
        ) : (
          <div className="p-8 w-full space-y-8 print:p-0 print:max-w-none">
            {/* Header */}
            <header className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedStudent.name}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><FileText size={14}/> {selectedStudent.course}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center gap-1"><Briefcase size={14}/> {selectedStudent.placementOrg}</span>
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  <Download size={16} /> Export PDF Logbook
                </button>
                <button onClick={handleFinalize} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors">
                  Finalize Completion
                </button>
              </div>
            </header>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-4 gap-6 print:hidden">
              {[
                { label: 'Total Logs', value: studentLogs.length, color: 'text-slate-600' },
                { label: 'Approved', value: studentLogs.filter(l => l.status === LogStatus.APPROVED).length, color: 'text-emerald-600' },
                { label: 'Pending', value: studentLogs.filter(l => l.status === LogStatus.SUBMITTED).length, color: 'text-amber-600' },
                { label: 'Progression', value: `${Math.min(100, Math.round((studentLogs.filter(l => l.status === LogStatus.APPROVED).length / 120) * 100))}%`, color: 'text-blue-600' }
              ].map(stat => (
                <div key={stat.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Logs Review Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-0 print:shadow-none">
              <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
                <h3 className="font-bold text-slate-800">Review Entries</h3>
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'pending' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Pending Review ({studentLogs.filter(l => l.status === LogStatus.SUBMITTED).length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    All Logs
                  </button>
                </div>
              </div>

              <div className="divide-y">
                {studentLogs
                  .filter(log => activeTab === 'all' || log.status === LogStatus.SUBMITTED)
                  .map(log => (
                  <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-colors group break-inside-avoid">
                    <div className="flex gap-6">
                      <div className="w-16 h-16 bg-slate-100 rounded-xl flex flex-col items-center justify-center border shrink-0 print:border-slate-300">
                        <span className="text-xs font-bold text-slate-400 uppercase">{new Date(log.date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl font-bold text-slate-700">{new Date(log.date).getDate()}</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-slate-900 leading-relaxed max-w-xl">
                            {log.activityDescription}
                          </p>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                            <button 
                              onClick={() => handleUpdateStatus(log.id, LogStatus.APPROVED)}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" 
                              title="Approve"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                const reason = prompt('Reason for rejection:');
                                if (reason) handleUpdateStatus(log.id, LogStatus.REJECTED, reason);
                              }}
                              className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" 
                              title="Reject"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                        {log.evidenceImageUrl && (
                          <div className="flex gap-4 items-center p-3 bg-slate-50 rounded-lg border border-slate-100 print:hidden">
                             <div className="w-12 h-12 rounded bg-slate-200 overflow-hidden">
                               <img src={log.evidenceImageUrl} className="w-full h-full object-cover" alt="Small Preview" />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-slate-700">Site Evidence Attached</p>
                               <button 
                                onClick={() => window.open(log.evidenceImageUrl, '_blank')}
                                className="text-[10px] text-emerald-600 hover:underline font-bold"
                               >
                                View Full Resolution
                               </button>
                             </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            log.status === LogStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            log.status === LogStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {log.status}
                          </span>
                          <span className="flex items-center gap-1"><Clock size={12}/> Submitted {new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {studentLogs.filter(log => activeTab === 'all' || log.status === LogStatus.SUBMITTED).length === 0 && (
                   <div className="p-12 text-center text-slate-400">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No entries found for this category.</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorModule;
