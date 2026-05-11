import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { BookingSession, AppUser } from '../../types';
import { Calendar, Search, Clock, User, X, Filter, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ScheduleService } from '../../services/ScheduleService';
import { useAuth } from '../../hooks/useAuth';
import FeedbackModal from '../ui/FeedbackModal';

export default function AdminScheduleManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<BookingSession[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'>('ALL');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [sessionsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'appointments'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'STUDENT')))
      ]);
      setSessions(sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingSession)));
      setStudents(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser)));
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(s => {
      const student = students.find(u => u.studentId === s.studentId || u.uid === s.studentId);
      const name = student?.displayName || 'Unknown';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      return sortOrder === 'ASC' 
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [sessions, students, searchTerm, statusFilter, sortOrder]);

  const handleCancel = async (id: string, studentId: string, date: string, currentStatus: string) => {
    if (currentStatus === 'CANCELLED') return;
    setFeedback({
      title: 'Cancel Session',
      message: 'Cancel this session? The student will be notified.',
      type: 'confirm',
      onConfirm: async () => {
        setFeedback(null);
        try {
          const { updateDoc, doc } = await import('firebase/firestore');
          const { NotificationService } = await import('../../services/NotificationService');
          await updateDoc(doc(db, 'appointments', id), {
            status: 'CANCELLED'
          });
          await NotificationService.sendNotification(
            studentId, 
            'Session Cancelled', 
            `Your yearbook photo session for ${date} has been cancelled by an administrator.`, 
            'status_change'
          );
          
          setSessions(sessions.map(s => s.id === id ? { ...s, status: 'CANCELLED' } : s));
          setFeedback({ title: 'Success', message: 'Session cancelled successfully.', type: 'info', onClose: () => setFeedback(null) });
        } catch (e) {
          console.error(e);
          setFeedback({ title: 'Error', message: 'Failed to cancel session', type: 'error', onClose: () => setFeedback(null) });
        }
      },
      onCancel: () => setFeedback(null)
    });
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    setFeedback({
      title: 'Delete Session',
      message: 'PERMANENTLY DELETE this appointment record? This cannot be undone.',
      type: 'confirm',
      onConfirm: async () => {
        setFeedback(null);
        try {
          await ScheduleService.deleteAppointment(id, user.uid);
          setSessions(sessions.filter(s => s.id !== id));
          setFeedback({ title: 'Success', message: 'Appointment deleted successfully.', type: 'info', onClose: () => setFeedback(null) });
        } catch (e) {
          console.error(e);
          setFeedback({ title: 'Error', message: 'Failed to delete appointment', type: 'error', onClose: () => setFeedback(null) });
        }
      },
      onCancel: () => setFeedback(null)
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Schedule Management</h2>
          <p className="text-sm text-gray-500 font-medium">View and monitor all scheduled yearbook photo sessions.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search Student ID..." 
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-100 text-sm font-bold shadow-sm"
              />
           </div>
           <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-[10px] font-black uppercase tracking-widest shadow-sm outline-none"
           >
              <option value="ALL">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
           </select>
           <button 
             onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
             className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-[10px] font-black uppercase tracking-widest shadow-sm"
           >
             Sort Date {sortOrder === 'ASC' ? '▲' : '▼'}
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-8 py-4">Student</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Time Slot</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {filteredSessions.map((s) => {
                 const student = students.find(u => u.studentId === s.studentId || u.uid === s.studentId);
                 return (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-4 text-sm text-[#0d1b2a] font-black">{student?.displayName || s.studentId}</td>
                  <td className="px-8 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 opacity-30" />
                      {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 opacity-30" />
                      {s.timeSlot}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5",
                      s.status === 'CONFIRMED' ? "bg-blue-50 text-blue-500" : 
                      s.status === 'COMPLETED' ? "bg-[#85b27a]/15 text-[#85b27a]" : "bg-red-50 text-red-500"
                    )}>
                      {s.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
                      {s.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        {s.status === 'CONFIRMED' && (
                          <button 
                            onClick={() => handleCancel(s.id, s.studentId, s.date, s.status)}
                            className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                            title="Cancel Session"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(s.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Session Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </td>
                </tr>
                 );
              })}
              {filteredSessions.length === 0 && !loading && (
                 <tr>
                   <td colSpan={5} className="px-8 py-20 text-center text-gray-300 text-[11px] font-black uppercase tracking-widest">
                      {searchTerm ? 'No results found for your search' : 'No sessions scheduled yet'}
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}

// REMOVED LOCAL CN DEFINITION
