import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  User as UserIcon, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Menu,
  ChevronDown,
  ClipboardList,
  Layers,
  History,
  MessageSquare,
  Users,
  Bell,
  FileCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TriumphLogo } from '../ui/TriumphLogo';
import { NotificationService, Notification } from '../../services/NotificationService';

import AnnouncementBoard from '../student/AnnouncementBoard';
import StudentDashboard from '../student/StudentDashboard';
import DocumentVerification from '../admin/DocumentVerification';
import SmartScheduling from '../student/SmartScheduling';
import MyDocuments from '../student/MyDocuments';
import StudentNotifications from '../student/StudentNotifications';
import FAQChat from '../student/FAQChat';
import MyProfile from '../student/MyProfile';
import AdminDashboard from '../admin/AdminDashboard';
import AdminAuditLogs from '../admin/AdminAuditLogs';
import AdminBatches from '../admin/AdminBatches';
import AdminCompliance from '../admin/AdminCompliance';
import AdminRecords from '../admin/AdminRecords';
import AdminSchedule from '../admin/AdminSchedule';
import AdminReceipts from '../admin/AdminReceipts';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-3 px-6 py-2.5 text-[12px] font-medium transition-all cursor-pointer relative",
      active 
        ? "bg-white/10 text-white border-l-4 border-[#fbbd08]" 
        : "text-white/60 hover:bg-white/5 hover:text-white"
    )}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: cn("h-4 w-4", active ? "text-[#fbbd08]" : "opacity-60") })}
    <span>{label}</span>
    {active && <div className="absolute right-4"><ChevronRight className="h-3 w-3 opacity-40" /></div>}
  </button>
);

interface ShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Shell({ children, activeTab, setActiveTab }: ShellProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (notifs) => {
      setNotifCount(notifs.filter(n => !n.isRead).length);
    });
    return () => unsubscribe();
  }, [user]);

  const getPageContent = () => {
    // Admin & Staff Views
    const isAdminStaff = ['ADMIN', 'FINANCE', 'PHOTOGRAPHER', 'LAYOUT'].includes(user?.role || '');
    
    if (activeTab === 'profile') return <MyProfile />;

    if (isAdminStaff) {
      if (activeTab === 'dashboard') return <AdminDashboard activeTab="dashboard" setActiveTab={setActiveTab} />;
      if (activeTab === 'verification') return <DocumentVerification />;
      if (activeTab === 'announcements') return <AnnouncementBoard />;
      if (activeTab === 'audit') return <AdminAuditLogs />;
      if (activeTab === 'batches') return <AdminBatches />;
      if (activeTab === 'compliance') return <AdminCompliance />;
      if (activeTab === 'students') return <AdminRecords />;
      if (activeTab === 'schedule-admin') return <AdminSchedule />;
      if (activeTab === 'receipts') return <AdminReceipts />;
      return <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    }

    // Student Views
    if (activeTab === 'dashboard') return <StudentDashboard activeTab="dashboard" setActiveTab={setActiveTab} />;
    if (activeTab === 'documents') return <MyDocuments />;
    if (activeTab === 'schedule') return <SmartScheduling />;
    if (activeTab === 'notifications') return <StudentNotifications />;
    if (activeTab === 'help') return <FAQChat />;
    if (activeTab === 'profile') return <MyProfile />;
    
    return <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
  };

  const menuItems = user?.role === 'ADMIN' ? [
    { section: 'MANAGEMENT', items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
      { id: 'students', label: 'Student Records', icon: <Users /> },
      { id: 'verification', label: 'Document Verification', icon: <ClipboardList /> },
      { id: 'schedule-admin', label: 'Schedule Management', icon: <Calendar /> },
      { id: 'batches', label: 'Batch Management', icon: <Layers /> },
      { id: 'announcements', label: 'Announcements', icon: <Bell /> },
    ]},
    { section: 'FINANCE & SYSTEM', items: [
      { id: 'compliance', label: 'Compliance Tracking', icon: <FileCheck /> },
      { id: 'receipts', label: 'Receipts', icon: <FileText /> },
      { id: 'audit', label: 'Audit Logs', icon: <History /> }
    ]}
  ] : user?.role === 'PHOTOGRAPHER' ? [
    { section: 'MAIN', items: [
      { id: 'schedule-admin', label: 'Photographer Schedule', icon: <Calendar /> },
    ]},
    { section: 'ACCOUNT', items: [
      { id: 'profile', label: 'My Profile', icon: <UserIcon /> },
    ]}
  ] : user?.role === 'LAYOUT' ? [
    { section: 'MAIN', items: [
      { id: 'batches', label: 'Yearbook Layouts', icon: <Layers /> },
    ]},
    { section: 'ACCOUNT', items: [
      { id: 'profile', label: 'My Profile', icon: <UserIcon /> },
    ]}
  ] : user?.role === 'FINANCE' ? [
    { section: 'MAIN', items: [
      { id: 'receipts', label: 'Receipts', icon: <FileText /> },
      { id: 'audit', label: 'Audit Logs', icon: <History /> },
    ]},
    { section: 'ACCOUNT', items: [
      { id: 'profile', label: 'My Profile', icon: <UserIcon /> },
    ]}
  ] : [
    { section: 'MAIN', items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
      { id: 'schedule', label: 'Schedule', icon: <Calendar /> },
      { id: 'documents', label: 'Documents', icon: <FileText /> },
    ]},
    { section: 'ACCOUNT', items: [
      { id: 'profile', label: 'My Profile', icon: <UserIcon /> },
      { id: 'help', label: 'Help & FAQ', icon: <HelpCircle /> },
    ]}
  ];

  return (
    <div className="flex h-screen bg-[#fcfcf7] text-[#0d1b2a] overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-[240px] flex-col bg-[#1a237e] text-white h-full z-20 shadow-2xl shrink-0">
        <div className="flex flex-col items-center pt-8 px-6">
          <div className="h-24 w-full flex justify-center mb-8 mt-2">
            <TriumphLogo showText={true} className="h-full drop-shadow-xl transition-transform hover:scale-105" light={true} />
          </div>
          
          <nav className="w-full space-y-8 mt-10">
            {menuItems.map((group) => (
              <div key={group.section}>
                <div className="text-[9px] font-black tracking-[0.2em] text-white/30 mb-3 px-2 uppercase">{group.section}</div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-[72px] bg-[#fbbd08] flex items-center justify-end px-12 shrink-0 shadow-sm relative z-10 w-full">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-5">
              <button 
                onClick={logout}
                className="text-[10px] uppercase font-black hover:text-[#ef4444] transition-colors tracking-widest text-[#0d1b2a]/60 flex items-center gap-2"
              >
                <LogOut className="h-3 w-3" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 bg-[#fdfdf5]">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {getPageContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
