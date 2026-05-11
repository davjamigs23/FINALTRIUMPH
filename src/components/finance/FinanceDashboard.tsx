import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  BarChart3, 
  Users, 
  FileCheck, 
  LogOut, 
  Bell, 
  Menu, 
  CreditCard,
  History,
  TrendingUp,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, handleFirestoreError, OperationType } from '../../lib/utils';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import AdminReceipts from '../admin/AdminReceipts';
import AdminAuditLogs from '../admin/AdminAuditLogs';

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</span>
      <div className={cn("p-2 rounded-xl transition-all", color || "bg-gray-50 text-[#1a237e]")}>
        {icon}
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <h4 className="text-3xl font-black text-[#0d1b2a] tracking-tighter">{value}</h4>
    </div>
    <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#1a237e]/20 to-transparent w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
  </div>
);

import { TriumphLogo } from '../ui/TriumphLogo';

export default function FinanceDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    pendingReceipts: 0,
    verifiedToday: 0,
    totalVerified: 0
  });

  useEffect(() => {
    // Real-time stats sync - combining both sources
    const qDocs = query(collection(db, 'documents'), where('type', '==', 'RECEIPT'));
    const qReceipts = query(collection(db, 'receipts'));

    let docsList: any[] = [];
    let receiptsList: any[] = [];

    const updateStats = () => {
      const all = [...docsList, ...receiptsList];
      const pending = all.filter(d => 
        (d.source === 'SUBMISSION' && d.status === 'PENDING' && d.financeStatus !== 'VERIFIED') ||
        (d.source === 'MANUAL' && d.status === 'PENDING')
      ).length;
      
      const verified = all.filter(d => 
        (d.source === 'SUBMISSION' && d.financeStatus === 'VERIFIED') ||
        (d.source === 'MANUAL' && d.status === 'PAID')
      ).length;

      const verifiedToday = all.filter(d => {
        const verifyDateStr = d.source === 'SUBMISSION' ? d.financeVerifiedAt : d.date;
        return verifyDateStr?.startsWith(new Date().toISOString().split('T')[0]);
      }).length;
      
      setStats({
        pendingReceipts: pending,
        verifiedToday: verifiedToday,
        totalVerified: verified
      });
    };

    const unsubDocs = onSnapshot(qDocs, 
      (snapshot) => {
        docsList = snapshot.docs.map(d => ({ ...d.data(), source: 'SUBMISSION' }));
        updateStats();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );

    const unsubReceipts = onSnapshot(qReceipts, 
      (snapshot) => {
        receiptsList = snapshot.docs.map(d => ({ ...d.data(), source: 'MANUAL' }));
        updateStats();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'receipts')
    );

    return () => { unsubDocs(); unsubReceipts(); };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'receipts', label: 'Verify Receipts', icon: CreditCard },
    { id: 'audit', label: 'Audit Logs', icon: History },
  ];

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-8">
          <div className="h-16 w-full flex justify-center mb-12">
            <TriumphLogo showText={true} className="h-full" />
          </div>

          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                  activeTab === item.id 
                    ? "bg-[#1a237e] text-white shadow-xl shadow-[#1a237e]/20 scale-[1.02]" 
                    : "text-gray-400 hover:text-[#0d1b2a] hover:bg-gray-50"
                )}
              >
                <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-[#fbbd08]" : "opacity-40")} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-8 py-6 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl text-[#0d1b2a]">
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-black text-[#0d1b2a] uppercase tracking-tight">{activeTab?.replace?.('-', ' ') || activeTab}</h2>
          </div>
          
          <div className="flex items-center gap-6">

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-gray-400">{user?.role}</p>
                <p className="text-sm font-black text-[#0d1b2a] leading-none">{user?.displayName}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[#fbbd08]/20 flex items-center justify-center text-[#1a237e] font-black border border-[#fbbd08]/30">
                {user?.displayName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Pending Receipts" 
                  value={stats.pendingReceipts} 
                  icon={<FileSearch className="h-5 w-5" />} 
                  color="bg-[#fbbd08]/10 text-[#fbbd08]"
                />
                <StatCard 
                  title="Verified Today" 
                  value={stats.verifiedToday} 
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="bg-green-100 text-green-600"
                />
                <StatCard 
                  title="Total Transactions" 
                  value={stats.totalVerified} 
                  icon={<Users className="h-5 w-5" />} 
                  color="bg-[#1a237e]/10 text-[#1a237e]"
                />
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                 <div className="flex items-center gap-4 mb-8">
                   <div className="p-3 bg-[#1a237e]/5 rounded-2xl">
                     <CreditCard className="h-6 w-6 text-[#1a237e]" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black text-[#0d1b2a]">Quick Actions</h3>
                     <p className="text-xs text-gray-400 font-medium">Frequently used financial modules</p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button 
                    onClick={() => setActiveTab('receipts')}
                    className="p-6 rounded-2xl border border-gray-100 hover:border-[#1a237e]/30 hover:bg-gray-50 flex items-center gap-4 transition-all text-left"
                   >
                     <div className="h-12 w-12 bg-[#1a237e] rounded-xl flex items-center justify-center text-white">
                        <FileCheck className="h-6 w-6" />
                     </div>
                     <div>
                       <p className="text-sm font-black text-[#0d1b2a]">Review Pending Receipts</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verify student payments</p>
                     </div>
                   </button>
                   
                   <button 
                    onClick={() => setActiveTab('audit')}
                    className="p-6 rounded-2xl border border-gray-100 hover:border-[#1a237e]/30 hover:bg-gray-50 flex items-center gap-4 transition-all text-left"
                   >
                     <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center text-[#0d1b2a]">
                        <History className="h-6 w-6" />
                     </div>
                     <div>
                       <p className="text-sm font-black text-[#0d1b2a]">Financial Audit Trail</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">View recent activities</p>
                     </div>
                   </button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="space-y-6">
              <AdminReceipts />
            </div>
          )}
          
          {activeTab === 'audit' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <AdminAuditLogs />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
