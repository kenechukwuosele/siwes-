

import React, { useState, useEffect } from 'react';
import { InstitutionStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Globe, Building2, Users, FileCheck, MapPin, ExternalLink, Download } from 'lucide-react';

const ITFModule: React.FC = () => {
  const [institutions, setInstitutions] = useState<InstitutionStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const data = await import('../services/api').then(m => m.institutionService.getAll());
             // Map backend response to InstitutionStats interface
             const mapped: InstitutionStats[] = data.map((inst: any) => ({
                 id: inst.id.toString(),
                 name: inst.name,
                 activeStudents: inst.active_students,
                 totalStudents: inst.total_students,
                 approvedLogs: inst.approved_logs
             }));
            setInstitutions(mapped);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const chartData = institutions.map(inst => ({
    name: inst.name.split(' ').map((w: string) => w[0]).join(''),
    fullName: inst.name,
    active: inst.activeStudents,
    total: inst.totalStudents
  }));

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7'];

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 space-y-8">
      {/* Top Banner */}
      <div className="bg-emerald-900 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold mb-2">National Monitoring Dashboard</h2>
          <p className="text-emerald-100/80 max-w-xl">
            Real-time oversight of Students Industrial Work Experience Scheme (SIWES) across all participating institutions in Nigeria.
          </p>
        </div>
        <div className="flex gap-4 relative z-10 shrink-0">
          <button className="flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-600 rounded-xl font-bold transition-all shadow-lg">
            <Globe size={20}/> View Map
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl font-bold transition-all shadow-lg">
            <Download size={20}/> Export Annual Report
          </button>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-800/20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Building2, label: 'Institutions', value: institutions.length.toString(), change: '+12 this year', color: 'bg-blue-500' },
          { icon: Users, label: 'Active Students', value: institutions.reduce((a,b) => a + b.activeStudents, 0).toLocaleString(), change: '+8.4% vs last cycle', color: 'bg-emerald-500' },
          { icon: FileCheck, label: 'Log Compliance', value: '92.1%', change: 'Highest in Region', color: 'bg-amber-500' },
          { icon: MapPin, label: 'Placements', value: institutions.reduce((a,b) => a + b.totalStudents, 0).toLocaleString(), change: 'Across 36 states', color: 'bg-rose-500' }
        ].map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
             <div className="flex justify-between items-start">
               <div className={`p-3 rounded-xl ${stat.color} text-white shadow-lg`}>
                 <stat.icon size={24} />
               </div>
               <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{stat.change}</span>
             </div>
             <div>
               <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
               <h4 className="text-3xl font-black text-slate-800">{stat.value}</h4>
             </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
             <h3 className="font-bold text-slate-800 text-lg">Student Activity by Institution</h3>
             <select className="bg-slate-50 border-none text-sm font-bold p-2 rounded-lg outline-none cursor-pointer">
               <option>Top 10 Institutions</option>
               <option>Bottom 10 Institutions</option>
             </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="active" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-lg mb-8">Participation by Sector</h3>
          <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={[
                     { name: 'Engineering', value: 45 },
                     { name: 'ICT', value: 30 },
                     { name: 'Business', value: 15 },
                     { name: 'Agric', value: 10 },
                   ]}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={100}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
             {['Engineering', 'ICT', 'Business', 'Agric'].map((label, idx) => (
               <div key={label} className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                   <span className="text-sm font-medium text-slate-600">{label}</span>
                 </div>
                 <span className="text-sm font-bold text-slate-800">{[45,30,15,10][idx]}%</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Institutional Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Institution Registry</h3>
          <button className="text-sm text-emerald-600 font-bold flex items-center gap-1 hover:underline">
            View All <ExternalLink size={14}/>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-8 py-4">Institution Name</th>
                <th className="px-8 py-4">Active Students</th>
                <th className="px-8 py-4">Compliance Score</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading registry...</td></tr> : institutions.map(inst => (
                <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-800">{inst.name}</div>
                    <div className="text-xs text-slate-500">Tier 1 Federal University</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(inst.activeStudents / inst.totalStudents) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{inst.activeStudents}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">98.2% High</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                      <FileCheck size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ITFModule;
