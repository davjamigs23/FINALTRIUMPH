/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import Shell from './components/layout/Shell';
import StudentDashboard from './components/student/StudentDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import FinanceDashboard from './components/finance/FinanceDashboard';
import LandingPage from './components/public/LandingPage';
import FAQChat from './components/student/FAQChat';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8f9fa]">
        <div className="h-10 w-10 border-4 border-[#1a237e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="h-full w-full">
      {user.role === 'ADMIN' ? (
        <Shell activeTab={activeTab} setActiveTab={setActiveTab}>
          <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        </Shell>
      ) : user.role === 'FINANCE' ? (
        <FinanceDashboard />
      ) : (
        <Shell activeTab={activeTab} setActiveTab={setActiveTab}>
          <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        </Shell>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
