import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationService, Notification } from '../../services/NotificationService';
import { Bell, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export default function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-[#0d1b2a]">Notifications</h1>
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-1">
          Stay updated with your yearbook requirements.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => (
              <div key={notif.id} className={cn("p-6 flex gap-4 transition-all hover:bg-gray-50", !notif.isRead && "bg-indigo-50/30")}>
                <div className="mt-1">
                  {notif.title.toLowerCase().includes('rejected') ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-black text-[#0d1b2a]">{notif.title}</h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
            <Bell className="h-16 w-16 mb-4 stroke-1" />
            <p className="text-lg font-black">No notifications found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
