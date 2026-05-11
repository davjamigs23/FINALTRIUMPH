import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { 
  Users, 
  FileCheck, 
  Calendar, 
  TrendingUp, 
  Clock,
  Briefcase
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { db } from '../../firebase';
import { collection, query, getDocs, where, limit, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { AppUser, DocumentSubmission, BookingSession, AuditLogEntry } from '../../types';

const StatCard = ({ title, value, icon, trend, trendUp }: any) => (
  <div className="bg-white p-4 rounded-lg border border-border shadow-sm relative overflow-hidden">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
      <div className="p-1.5 bg-muted rounded-md text-[#1a237e] opacity-60 leading-none">{icon}</div>
    </div>
    <div className="flex items-baseline gap-2">
      <h4 className="text-2xl font-bold text-foreground leading-none">{value}</h4>
    </div>
  </div>
);

import { ComplianceService } from '../../services/ComplianceService';

export default function AdminDashboard({ activeTab, setActiveTab }: { activeTab: string, setActiveTab?: (tab: string) => void }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    docsDone: 0,
    sessionsToday: 0,
    complianceRate: 0,
  });
  const [pieData, setPieData] = useState<any[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersSnap, docsSnap, apptsSnap, logsSnap, complianceStats] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'STUDENT'))),
          getDocs(collection(db, 'documents')),
          getDocs(query(collection(db, 'appointments'), where('date', '==', new Date().toISOString().split('T')[0]))),
          getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(5))),
          ComplianceService.getStats()
        ]);

        const total = usersSnap.size;
        const docs = docsSnap.docs.map(d => d.data() as DocumentSubmission);
        const approvedDocs = docs.filter(d => d.status === 'APPROVED').length;
        
        setStats({
          totalStudents: total,
          docsDone: approvedDocs,
          sessionsToday: apptsSnap.size,
          complianceRate: complianceStats.completePercent,
        });

        // Verification Pie
        const pending = docs.filter(d => d.status === 'PENDING').length;
        const rejected = docs.filter(d => d.status === 'REJECTED').length;
        setPieData([
          { name: 'Verified', value: approvedDocs, color: '#85b27a' },
          { name: 'Pending', value: pending, color: '#fbbd08' },
          { name: 'Rejected', value: rejected, color: '#ff5a5a' },
        ]);

        setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry)));
      } catch (err) {
        console.error('Error fetching admin data:', err);
        handleFirestoreError(err, OperationType.LIST, 'admin_agg_dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (activeTab !== 'dashboard') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <Clock className="h-12 w-12 text-[#1a237e] opacity-20" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight uppercase">{activeTab?.replace?.('-', ' ') || activeTab}</h3>
        <p className="text-muted-foreground max-sm">Module active but currently empty. Start inputting data to see results.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 md:p-5 h-full auto-rows-max">
      {/* Metrics Row */}
      <StatCard title="Total Students" value={stats.totalStudents} icon={<Users className="h-3 w-3" />} />
      <StatCard title="Verified Documents" value={stats.docsDone} icon={<FileCheck className="h-3 w-3" />} />
      <StatCard title="Today's Sessions" value={stats.sessionsToday} icon={<Calendar className="h-3 w-3" />} />
      <StatCard title="App Compliance" value={`${stats.complianceRate}%`} icon={<TrendingUp className="h-3 w-3" />} />

      {/* Course Completion ChartPlaceholder (Needs users joined by course) */}
      <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[360px]">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0d1b2a]">Completion by Batch</h3>
           <div className="bg-gray-50 px-3 py-1 rounded text-[10px] font-bold text-gray-400">BATCH OF 2026</div>
        </div>
        <div className="h-[280px] w-full flex items-center justify-center text-gray-300">
           {stats.totalStudents > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[{ name: 'General', complete: stats.complianceRate, pending: 100 - stats.complianceRate }]}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                 <Tooltip />
                 <Bar dataKey="complete" fill="#1a237e" barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="text-center">
               <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-20" />
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No student data found</p>
             </div>
           )}
        </div>
      </div>

      {/* Document Queue Pie */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0d1b2a] mb-6">Verification Queue</h3>
        <div className="h-[180px] w-full flex items-center justify-center">
            {stats.docsDone + pieData.reduce((acc, curr) => acc + (curr.name === 'Verified' ? 0 : curr.value), 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                  </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[10px] uppercase font-bold text-gray-300">Queue Empty</p>
            )}
        </div>
        <div className="space-y-3 mt-6">
            {pieData.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-[11px]">
                    <span className="flex items-center gap-2 font-bold text-gray-500 uppercase tracking-tighter">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-black text-[#0d1b2a]">{item.value}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="md:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0d1b2a] flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Audit Trail
            </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
              <thead>
                  <tr className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/20 border-b border-gray-100">
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Module</th>
                      <th className="px-6 py-3">Details</th>
                      <th className="px-6 py-3 text-right">Time</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                  {logs.length > 0 ? logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors text-[11px]">
                          <td className="px-6 py-3 font-black text-[#1a237e] uppercase tracking-tighter">{log.action}</td>
                          <td className="px-6 py-3 font-bold text-gray-400 uppercase tracking-widest text-[9px]">{log.module}</td>
                          <td className="px-6 py-3 text-[#0d1b2a]">{log.details}</td>
                          <td className="px-6 py-3 text-right text-gray-400 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                      </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-300 text-[10px] font-bold uppercase tracking-widest">
                        No activity recorded yet
                      </td>
                    </tr>
                  )}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
