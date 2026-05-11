import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AnnouncementService } from '../../services/AnnouncementService';
import { NotificationService, Notification } from '../../services/NotificationService';
import { Announcement } from '../../types';
import { Bell, Pin, Clock, Megaphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AnnouncementBoard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<Announcement['category']>('GENERAL');
  const [activeView, setActiveView] = useState<'announcements' | 'notifications'>('announcements');

  const fetchAnnouncements = async () => {
      const data = await AnnouncementService.getAll();
      setAnnouncements(data);
      setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
    if (user && user.role !== 'ADMIN') {
        const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (notifs) => {
            setNotifications(notifs);
        });
        return () => unsubscribe();
    }
  }, [user]);

  const handlePost = async () => {
      if (!user || !newTitle || !newContent) return;
      await AnnouncementService.postAnnouncement(newTitle, newContent, newCategory, user.uid);
      setNewTitle('');
      setNewContent('');
      setIsPosting(false);
      fetchAnnouncements();
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
       <div className="h-8 w-8 border-4 border-[#fbbd08] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#0d1b2a] tracking-tight">Updates Center</h1>
          <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-1">Stay synchronized with campus announcements and your system alerts.</p>
        </div>
        {user?.role === 'ADMIN' && (
            <button 
                onClick={() => setIsPosting(!isPosting)}
                className="bg-[#1a237e] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all"
            >
                {isPosting ? 'Cancel' : 'Post Announcement'}
            </button>
        )}
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-full max-w-sm">
         <button onClick={() => setActiveView('announcements')} className={cn("flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all", activeView === 'announcements' ? "bg-[#fbbd08] text-[#0d1b2a]" : "text-gray-400 hover:text-[#0d1b2a]")}>
            Announcements
         </button>
         {user?.role !== 'ADMIN' && (
           <button onClick={() => setActiveView('notifications')} className={cn("flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all", activeView === 'notifications' ? "bg-[#fbbd08] text-[#0d1b2a]" : "text-gray-400 hover:text-[#0d1b2a]")}>
              My Notifications
           </button>
         )}
      </div>

        {isPosting && user?.role === 'ADMIN' && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <input type="text" placeholder="Title" className="w-full p-3 border rounded-xl" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <textarea placeholder="Content" className="w-full p-3 border rounded-xl" value={newContent} onChange={(e) => setNewContent(e.target.value)} />
                <select className="w-full p-3 border rounded-xl" value={newCategory} onChange={(e) => setNewCategory(e.target.value as Announcement['category'])}>
                    <option value="GENERAL">General</option>
                    <option value="URGENT">Urgent</option>
                    <option value="SCHEDULE">Schedule</option>
                </select>
                <button onClick={handlePost} className="w-full bg-[#1a237e] text-white py-3 rounded-xl font-bold">Post</button>
            </div>
        )}

      <div className="space-y-6">
        {activeView === 'announcements' ? (
            announcements.length > 0 ? announcements.map((ann) => (
              <div key={ann.id} className={cn(
                "bg-white border p-8 rounded-3xl shadow-sm relative overflow-hidden group",
                ann.isPinned ? "border-[#fbbd08]/30 bg-[#fbbd08]/5" : "border-gray-100"
              )}>
                {ann.isPinned && (
                  <div className="absolute top-4 right-4 animate-bounce">
                    <Pin className="h-4 w-4 text-[#fbbd08]" />
                  </div>
                )}
                
                <div className="flex gap-6">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
                    ann.category === 'URGENT' ? "bg-red-50 text-red-500" : 
                    ann.category === 'SCHEDULE' ? "bg-blue-50 text-blue-500" : "bg-gray-50 text-gray-500"
                  )}>
                    {ann.category === 'URGENT' ? <AlertCircle className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-[#1a237e]">{ann.category}</span>
                       <span className="text-gray-200 font-light">|</span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(ann.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-black text-[#0d1b2a] mb-4">{ann.title}</h3>
                    <p className="text-[14px] text-gray-600 leading-relaxed font-medium">{ann.content}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white border border-gray-100 p-20 rounded-3xl text-center">
                 <Bell className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                 <p className="text-[11px] font-black uppercase tracking-widest text-gray-300">No announcements yet. Check back later!</p>
              </div>
            )
        ) : (
            notifications.length > 0 ? notifications.map((notif) => (
                <div key={notif.id} className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm flex items-start gap-5 group">
                   <div className={cn(
                     "mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm ring-1",
                     notif.type === 'deadline' ? "bg-[#ef4444] ring-[#ef4444]/20 text-white" : notif.type === 'status_change' ? "bg-[#85b27a] ring-[#85b27a]/20 text-white" : "bg-[#fbbd08] ring-[#fbbd08]/20 text-[#0d1b2a]"
                   )}>
                     {notif.type === 'status_change' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-4 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#1a237e]">{notif.title}</span>
                          <span className="text-gray-200 font-light">|</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(notif.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[14px] font-medium text-gray-600 leading-relaxed group-hover:text-[#1a237e] transition-colors">{notif.message}</p>
                   </div>
                </div>
             )) : (
               <div className="bg-white border border-gray-100 p-20 rounded-3xl text-center">
                  <CheckCircle2 className="h-12 w-12 text-[#85b27a] mx-auto mb-4 opacity-50" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-300">You're all caught up! No notifications right now.</p>
               </div>
             )
        )}
      </div>
    </div>
  );
}
