import React, { useEffect, useState, useMemo } from 'react';
import { AuditService } from '../../services/AuditService';
import { Clock, Search, Filter, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export default function AdminAuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await AuditService.getLogs(300, filterModule);
      setLogs(data);
      setLoading(false);
    };
    fetch();
  }, [filterModule]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const modules = ['ALL', 'STUDENTS', 'DOCUMENTS', 'SCHEDULE', 'BATCHES', 'RECEIPTS', 'ANNOUNCEMENTS', 'SYSTEM'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Audit Trail & Logs</h2>
          <p className="text-sm text-gray-500 font-medium">Complete record of all system actions for transparency and security.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5 shadow-sm font-bold text-[11px] uppercase tracking-wider"
            />
          </div>
          <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm overflow-x-auto max-w-full">
            {modules.map((m) => (
              <button 
                key={m}
                onClick={() => setFilterModule(m)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  filterModule === m ? "bg-[#1a237e] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-8 py-4">Timestamp</th>
              <th className="px-8 py-4">User</th>
              <th className="px-8 py-4">Action</th>
              <th className="px-8 py-4">Module</th>
              <th className="px-8 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="text-[12px] font-bold hover:bg-gray-50/20 transition-colors">
                <td className="px-8 py-4 font-mono text-[10px] text-gray-400">
                   {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                </td>
                <td className="px-8 py-4 text-[#1a237e] uppercase">{log.userId.slice(-6)}</td>
                <td className="px-8 py-4 uppercase tracking-tighter">
                   <span className={cn(
                     "px-2 py-0.5 rounded text-[9px]",
                     log.action === 'DELETE' ? "bg-red-50 text-red-600" :
                     log.action === 'CREATE' ? "bg-green-50 text-green-600" :
                     "bg-blue-50 text-blue-600"
                   )}>
                     {log.action}
                   </span>
                </td>
                <td className="px-8 py-4 text-gray-400 uppercase tracking-widest text-[9px]">{log.module}</td>
                <td className="px-8 py-4 text-[#0d1b2a] max-w-sm truncate">{log.details}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-gray-300 text-[11px] font-black uppercase tracking-widest">
                   No matching audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
