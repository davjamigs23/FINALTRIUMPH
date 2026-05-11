import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Camera, 
  PlusCircle, 
  Calendar, 
  Upload, 
  Layers, 
  User as UserIcon,
  Bell,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DocumentService } from '../../services/DocumentService';
import { ScheduleService } from '../../services/ScheduleService';
import { NotificationService, Notification } from '../../services/NotificationService';
import { AnnouncementService } from '../../services/AnnouncementService';
import { DocumentSubmission, BookingSession, Announcement } from '../../types';

interface RequirementItemProps {
  label: string;
  status: 'complete' | 'pending' | 'action';
  onClick?: () => void;
}

const RequirementItem = ({ label, status, onClick }: RequirementItemProps) => {
  const isComplete = status === 'complete';
  const isAction = status === 'action';
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between py-5 px-8 border-b border-gray-50 last:border-0 hover:bg-gray-50/20 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-5">
        <div className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center transition-all",
          isComplete ? "bg-[#85b27a]/15 text-[#85b27a]" : isAction ? "bg-[#ff5a5a]/15 text-[#ff5a5a]" : "bg-[#fbbd08]/15 text-[#fbbd08]"
        )}>
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : isAction ? <span className="text-[14px] font-black leading-none translate-y-[-1px]">+</span> : <div className="h-2 w-2 rounded-full border-2 border-current bg-transparent" />}
        </div>
        <span className={cn("text-[14px]", isComplete ? "text-[#0d1b2a]/40 font-bold" : "text-[#0d1b2a] font-black tracking-tight")}>{label}</span>
      </div>
      <div className={cn(
        "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm",
        isComplete ? "bg-[#85b27a]/15 text-[#85b27a]" : isAction ? "bg-[#ff5a5a]/15 text-[#ff5a5a]" : "bg-[#fbbd08]/15 text-[#fbbd08]"
      )}>
        {status === 'action' ? 'Action Required' : status}
      </div>
    </div>
  );
};

export default function StudentDashboard({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentSubmission[]>([]);
  const [booking, setBooking] = useState<BookingSession | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubDocs = DocumentService.subscribeToStudentDocuments(user.uid, (docs) => setDocs(docs));
    const unsubBooking = ScheduleService.subscribeToStudentBooking(user.uid, (booking) => setBooking(booking));
    const unsubNotifs = NotificationService.subscribeToNotifications(user.uid, (notifs) => setNotifications(notifs.slice(0, 3)));
    
    setLoading(false);

    return () => {
        unsubDocs();
        unsubBooking();
        unsubNotifs();
    };
  }, [user]);

  const getDocStatus = (type: DocumentSubmission['type']) => {
    const doc = docs.find(d => d.type === type);
    if (!doc) return 'action';
    if (doc.status === 'APPROVED') return 'complete';
    if (doc.status === 'REJECTED') return 'action';
    return 'pending';
  };

  const calculateProgress = () => {
    const requirements = [
      getDocStatus('CLEARANCE'),
      getDocStatus('BIRTH_CERTIFICATE'),
      getDocStatus('RECEIPT'),
      booking ? 'complete' : 'action',
      (user?.displayName && user?.studentId && user?.course) ? 'complete' : 'action',
      user?.quote ? 'complete' : 'action',
    ];
    const completeCount = requirements.filter(r => r === 'complete').length;
    return Math.round((completeCount / requirements.length) * 100);
  };

  if (activeTab !== 'dashboard') {
    return null;
  }

  const progress = calculateProgress();

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-[#0d1b2a]">Dashboard</h1>
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-1">
          Track your yearbook requirements and upcoming sessions.
        </p>
      </div>

      {/* Warnings */}
      <div className="space-y-3">
        {!user?.studentId && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-4 text-orange-800">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            <p className="text-[12px] font-bold">Please update your Student ID and Course in your profile to be recognized when submitting documents.</p>
          </div>
        )}
        {calculateProgress() < 100 && calculateProgress() > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 text-amber-800">
            <Clock className="h-6 w-6 text-amber-600" />
            <p className="text-[12px] font-bold">You have pending requirements. Make sure to complete them before the deadline to ensure your inclusion in the yearbook.</p>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Columns */}
        <div className="lg:col-span-2 space-y-8">
      <div className="bg-[#1a237e] rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-2xl border-4 border-[#fbbd08]/30 overflow-hidden bg-white/5">
                   {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center"><UserIcon className="h-10 w-10 text-white/20" /></div>
                   )}
                </div>
                <div>
                   <h1 className="text-3xl font-black tracking-tight mb-1">
                      Welcome back, <span className="text-[#fbbd08]">{user?.displayName?.split(' ')[0] || 'Student'}!</span>
                   </h1>
                   <p className="text-white/60 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                      Your yearbook journey is <span className="text-white">{progress}%</span> complete. 
                   </p>
                </div>
            </div>
            <div className="w-full md:w-64 space-y-3">
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50">
                  <span>Profile Progress</span>
                  <span>{progress}%</span>
               </div>
               <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-[#fbbd08]"
                    style={{ width: `${progress}%` }}
                  />
               </div>
            </div>
         </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
         {[
           { id: 'docs', label: 'Upload Documents', desc: 'Submit requirements', icon: <Upload className="h-6 w-6" />, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', tab: 'documents' },
           { id: 'book', label: 'Book Session', desc: 'Schedule photoshoot', icon: <Calendar className="h-6 w-6" />, color: 'text-amber-600 bg-amber-50 border-amber-100', tab: 'schedule' },
           { id: 'profile', label: 'Update Profile', desc: 'Add info & quote', icon: <UserIcon className="h-6 w-6" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', tab: 'profile' }
         ].map((action) => (
           <button 
            key={action.id}
            onClick={() => setActiveTab(action.tab)}
            className="flex items-center gap-5 p-6 bg-white border border-gray-100 rounded-3xl hover:shadow-xl hover:shadow-[#1a237e]/5 transition-all hover:-translate-y-1 group"
           >
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 border", action.color)}>
                  {action.icon}
              </div>
              <div className="text-left flex-1">
                 <div className="text-[14px] font-black tracking-tight text-[#0d1b2a] group-hover:text-[#1a237e] transition-colors">{action.label}</div>
                 <div className="text-[11px] font-bold text-gray-400 mt-0.5">{action.desc}</div>
              </div>
           </button>
         ))}
      </div>

           {/* Checklist */}
           <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-8 py-6 border-b border-gray-100">
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-[#0d1b2a]">Requirements Checklist</h3>
              </div>
              <div className="divide-y divide-gray-50">
                <RequirementItem label="Personal Details" status={(user?.displayName && user?.studentId && user?.course) ? 'complete' : 'action'} onClick={() => setActiveTab('profile')} />
                <RequirementItem label="Clearance Form" status={getDocStatus('CLEARANCE')} onClick={() => setActiveTab('documents')} />
                <RequirementItem label="Birth Certificate" status={getDocStatus('BIRTH_CERTIFICATE')} onClick={() => setActiveTab('documents')} />
                <RequirementItem label="Payment Receipt" status={getDocStatus('RECEIPT')} onClick={() => setActiveTab('documents')} />
                <RequirementItem label="Photo Session" status={booking ? 'complete' : 'action'} onClick={() => setActiveTab('schedule')} />
              </div>
           </div>

            {/* Quick Actions removed from here */}
        </div>

        {/* Right: Notifications & Session */}
        <div className="space-y-8">
            {/* Notifications */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm min-h-64">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-[#0d1b2a]">Notifications</h3>
                    <Bell className="h-4 w-4 text-gray-300" />
                </div>
                <div className="space-y-4">
                    {notifications.length > 0 ? notifications.map((notif) => (
                        <div key={notif.id} className="p-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl transition-all cursor-pointer">
                            <div className="flex justify-between items-center mb-1">
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-wider",
                                    notif.title.toLowerCase().includes('rejected') ? "text-red-500" : "text-[#1a237e]"
                                )}>{notif.title}</span>
                                <span className="text-[8px] text-gray-400 font-bold uppercase">{new Date(notif.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] text-[#0d1b2a] font-medium leading-relaxed line-clamp-2">{notif.message}</p>
                        </div>
                    )) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                            <Bell className="h-12 w-12 mb-3 stroke-1" />
                            <p className="text-[11px] font-black uppercase tracking-widest">No new alerts</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Session */}
            <div className="bg-[#1a237e] rounded-3xl p-8 text-white shadow-xl shadow-[#1a237e]/20">
                <h3 className="text-[12px] font-black uppercase tracking-widest text-white/70 mb-2">Photo Session</h3>
                <div className="inline-block px-3 py-1 bg-[#fbbd08] text-[#1a237e] text-[10px] font-black uppercase tracking-wider rounded-md mb-6">
                   {booking ? 'Booked' : 'Not Booked'}
                </div>
                <p className="text-sm font-medium mb-8">
                   {booking ? `Session scheduled for ${new Date(booking.date).toLocaleDateString()}` : "No session booked yet."}
                </p>
                <button 
                    onClick={() => setActiveTab('schedule')}
                    className="w-full py-3 bg-[#fbbd08] text-[#1a237e] rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#fbbd08]/90 transition-all"
                >
                    {booking ? 'View Session' : 'Book Session'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
