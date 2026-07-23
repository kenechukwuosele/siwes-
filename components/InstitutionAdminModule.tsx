import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Users, UserPlus } from 'lucide-react';

const InstitutionAdminModule: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [forceCapacity, setForceCapacity] = useState<Record<string, boolean>>({});
  const [selectedSupervisor, setSelectedSupervisor] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>({});
  const [capacity, setCapacity] = useState<number>(25);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await import('../services/api').then(m => m.authService.getUsers());
      setUsers(data);
      const settings = await import('../services/api').then(m => m.authService.getAssignmentSettings());
      setCapacity(settings.supervisor_capacity);
    } catch {
      setError('Unable to load assignment data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const supervisors = useMemo(() => users.filter(user => user.role === 'SUPERVISOR' && user.is_active), [users]);
  const students = useMemo(() => users.filter(user => user.role === 'STUDENT'), [users]);
  const assignmentCounts = useMemo(() => students.reduce<Record<string, number>>((counts, student) => {
    if (student.assigned_supervisor) counts[student.assigned_supervisor] = (counts[student.assigned_supervisor] || 0) + 1;
    return counts;
  }, {}), [students]);

  const assign = async (studentId: string) => {
    const supervisorId = selectedSupervisor[studentId];
    if (!supervisorId) return;
    setSavingStudentId(studentId);
    try {
      await import('../services/api').then(m => m.authService.assignSupervisor(studentId, supervisorId, Boolean(forceCapacity[studentId]), overrideReason[studentId] || ''));
      await loadUsers();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Assignment failed.');
    } finally {
      setSavingStudentId(null);
    }
  };

  const importSupervisors = async () => {
    if (!csvFile) return;
    try { await import('../services/api').then(m => m.authService.importSupervisorCsv(csvFile)); await loadUsers(); }
    catch { setError('CSV import failed. Required headers: first_name,last_name,email,staff_id,department.'); }
  };

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto bg-slate-50 space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Supervisor Assignment</h2>
        <p className="text-sm text-slate-500 mt-1">Manage students registered at your institution only.</p>
      </header>
      {error && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} />{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border p-5"><p className="text-xs font-bold text-slate-400 uppercase">Students</p><p className="mt-1 text-3xl font-black text-slate-800">{students.length}</p></div>
        <div className="rounded-2xl bg-white border p-5"><p className="text-xs font-bold text-slate-400 uppercase">Active Supervisors</p><p className="mt-1 text-3xl font-black text-slate-800">{supervisors.length}</p></div>
        <div className="rounded-2xl bg-white border p-5"><p className="text-xs font-bold text-slate-400 uppercase">Awaiting Assignment</p><p className="mt-1 text-3xl font-black text-amber-600">{students.filter(student => student.assignment_status === 'AWAITING').length}</p></div>
      </div>
      <section className="bg-white border rounded-2xl p-5 space-y-3">
        <div><h3 className="font-bold">Bulk invite supervisors</h3><p className="text-xs text-slate-500">Upload UTF-8 CSV: first_name,last_name,email,staff_id,department</p></div>
        <div className="flex flex-wrap items-center gap-3"><input type="file" accept=".csv,text/csv" onChange={event => setCsvFile(event.target.files?.[0] || null)} className="text-sm" /><button onClick={importSupervisors} disabled={!csvFile} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send invitations</button></div>
      </section>
      <section className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2"><Users size={18} className="text-emerald-600" /><h3 className="font-bold">Students</h3></div>
        {loading ? <p className="p-6 text-sm text-slate-400">Loading…</p> : (
          <div className="divide-y">
            {students.map(student => (
              <div key={student.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
                <div><p className="font-bold text-slate-800">{student.first_name} {student.last_name}</p><p className="text-xs text-slate-500">{student.matric_number || student.username} · {student.assignment_status === 'AWAITING' ? 'Awaiting assignment' : 'Assigned'}</p></div>
                <select value={selectedSupervisor[student.id] || student.assigned_supervisor || ''} onChange={event => setSelectedSupervisor(values => ({ ...values, [student.id]: event.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select supervisor</option>
                  {supervisors.map(supervisor => <option key={supervisor.id} value={supervisor.id}>{supervisor.first_name} {supervisor.last_name || supervisor.username} ({assignmentCounts[supervisor.id] || 0}/{capacity})</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={Boolean(forceCapacity[student.id])} onChange={event => setForceCapacity(values => ({ ...values, [student.id]: event.target.checked }))} /> Override capacity</label>
                  {forceCapacity[student.id] && <input value={overrideReason[student.id] || ''} onChange={event => setOverrideReason(values => ({...values, [student.id]: event.target.value}))} placeholder="Override reason" className="w-36 border rounded px-2 py-1 text-xs" />}
                  <button onClick={() => assign(student.id)} disabled={savingStudentId === student.id || !(selectedSupervisor[student.id] || student.assigned_supervisor)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><UserPlus size={14} />{savingStudentId === student.id ? 'Saving…' : 'Assign'}</button>
                </div>
              </div>
            ))}
            {!students.length && <p className="p-6 text-sm text-slate-400">No students are registered at this institution.</p>}
          </div>
        )}
      </section>
      <p className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle size={15} className="text-emerald-600" />Assignments are limited to your institution; capacity overrides are recorded in the assignment audit.</p>
    </div>
  );
};

export default InstitutionAdminModule;
