import React, { useEffect, useState } from 'react';
import { ComplianceService, ComplianceStats } from '../../services/ComplianceService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, FileCheck, Calendar, Download } from 'lucide-react';
import FeedbackModal from '../ui/FeedbackModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminCompliance() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [nonCompliant, setNonCompliant] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindingAll, setRemindingAll] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    const unsub = ComplianceService.subscribeToComplianceData((s, nc) => {
        setStats(s);
        setNonCompliant(nc);
        setLoading(false);
    });
    return () => unsub();
  }, []);

   const handleRemind = async (userId: string, missing: string) => {
    try {
      const { NotificationService } = await import('../../services/NotificationService');
      await NotificationService.sendNotification(
        userId,
        'Requirement Reminder',
        `You have a missing requirement: ${missing}. Please complete it to proceed with your yearbook processing.`,
        'deadline'
      );
      setFeedback({ title: 'Success', message: 'Reminder sent successfully!', type: 'info', onClose: () => setFeedback(null) });
    } catch (e) {
      console.error(e);
      setFeedback({ title: 'Error', message: 'Failed to send reminder', type: 'error', onClose: () => setFeedback(null) });
    }
   };

   const handleRemindAll = async () => {
    if (!nonCompliant.length) return;
    setFeedback({
      title: 'Send Reminders',
      message: `Send reminders to all ${nonCompliant.length} students with missing requirements?`,
      type: 'confirm',
      onConfirm: async () => {
        setFeedback(null);
        setRemindingAll(true);
        try {
          const { NotificationService } = await import('../../services/NotificationService');
          await Promise.all(nonCompliant.map(s => 
            NotificationService.sendNotification(
              s.id,
              'Urgent: Missing Requirements',
              `This is a collective reminder: You are missing ${s.missing}. Please settle this immediately.`,
              'deadline'
            )
          ));
          setFeedback({ title: 'Success', message: `Successfully sent ${nonCompliant.length} reminders.`, type: 'info', onClose: () => setFeedback(null) });
        } catch (e) {
          console.error(e);
          setFeedback({ title: 'Error', message: 'Failed to send some reminders.', type: 'error', onClose: () => setFeedback(null) });
        } finally {
          setRemindingAll(false);
        }
      },
      onCancel: () => setFeedback(null)
    });
   };

   const handleExportCSV = () => {
    if (!nonCompliant.length) return;
    const headers = ['Student Name', 'Missing Requirement'];
    const rows = nonCompliant.map(s => `"${s.name}","${s.missing}"`);
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ title: 'Exported', message: 'CSV report downloaded.', type: 'info', onClose: () => setFeedback(null) });
   };

   const handleExportPDF = () => {
    if (!nonCompliant.length) return;
    const doc = new jsPDF();
    
    // Header background
    doc.setFillColor(13, 27, 42); // #0d1b2a
    doc.rect(0, 0, doc.internal.pageSize.width, 45, 'F');
    
    // Title
    doc.setTextColor(251, 189, 8); // #fbbd08
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLIANCE REPORT', 14, 25);
    
    // Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 35);
    
    autoTable(doc, {
      startY: 55,
      head: [['Student Name', 'Missing Requirement']],
      body: nonCompliant.map(s => [s.name, s.missing]),
      headStyles: {
        fillColor: [26, 35, 126], // #1a237e
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // bg-gray-50
      },
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 6,
        textColor: [13, 27, 42] // #0d1b2a
      }
    });

    doc.save(`compliance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    setFeedback({ title: 'Exported', message: 'PDF report downloaded.', type: 'info', onClose: () => setFeedback(null) });
   };

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
       <div className="animate-spin h-8 w-8 border-4 border-[#fbbd08] border-t-transparent rounded-full" />
    </div>
  );
  if (!stats) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Compliance Tracking</h2>
          <p className="text-sm text-gray-500 font-medium">Monitor student progress and identify bottlenecks in the requirement process.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 text-[#1a237e] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
                <Download className="h-3 w-3" /> CSV
            </button>
            <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 text-[#1a237e] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
                <Download className="h-3 w-3" /> PDF
            </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Overall Completion</h4>
            <div className="text-4xl font-black text-[#85b27a]">{stats.completePercent}%</div>
         </div>
         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Documents Awaiting</h4>
            <div className="text-4xl font-black text-[#fbbd08]">{stats.docsPending}</div>
         </div>
         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Unbooked Students</h4>
            <div className="text-4xl font-black text-[#ff5a5a]">{stats.noBooking}</div>
         </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em]">Non-Compliant Students</h3>
            {nonCompliant.length > 0 && (
              <button 
                onClick={handleRemindAll}
                disabled={remindingAll}
                className="px-6 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {remindingAll ? 'Sending...' : 'Remind All'}
              </button>
            )}
        </div>
        <div className="space-y-4">
           {nonCompliant.length > 0 ? nonCompliant.map(s => (
             <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-black">
                      {s.name.substring(0, 2).toUpperCase()}
                   </div>
                   <div>
                      <p className="text-sm font-black">{s.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Missing: {s.missing}</p>
                   </div>
                </div>
                <button 
                  onClick={() => handleRemind(s.id, s.missing)}
                  className="px-6 py-2 bg-[#1a237e] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1a237e]/90 transition-all"
                >
                  Remind
                </button>
             </div>
           )) : (
             <div className="py-20 text-center text-gray-300 text-[11px] font-black uppercase tracking-widest">
                All students are compliant!
             </div>
           )}
        </div>
      </div>
      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
