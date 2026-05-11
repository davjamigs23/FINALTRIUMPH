import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { FileText, Search, CreditCard, DollarSign, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn, handleFirestoreError, OperationType } from '../../lib/utils';
import { AuditService } from '../../services/AuditService';
import { ReceiptService, Receipt } from '../../services/ReceiptService';
import { DocumentService } from '../../services/DocumentService';
import { NotificationService } from '../../services/NotificationService';
import FeedbackModal from '../ui/FeedbackModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExtendedReceipt extends Receipt {
  source: 'MANUAL' | 'SUBMISSION';
}

export default function AdminReceipts() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ExtendedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [feedback, setFeedback] = useState<any>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<ExtendedReceipt | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const pendingCount = receipts.filter(r => r.status === 'PENDING').length;
  const verifiedToday = receipts.filter(r => r.status === 'PAID' && new Date(r.date).toDateString() === new Date().toDateString()).length;
  const totalTransactions = receipts.length;

  const handleExportPDF = () => {
      if (!receipts.length) return;
      const doc = new jsPDF();
      
      // Header background
      doc.setFillColor(13, 27, 42); // #0d1b2a
      doc.rect(0, 0, doc.internal.pageSize.width, 45, 'F');
      
      // Title
      doc.setTextColor(251, 189, 8); // #fbbd08
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT REPORT', 14, 25);
      
      // Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 35);
      
      autoTable(doc, {
        startY: 55,
        head: [['Ref No.', 'Student ID', 'Purpose', 'Status', 'Date']],
        body: receipts.map(r => [r.referenceNo, r.studentId, r.purpose, r.status, new Date(r.date).toLocaleDateString()]),
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
  
      doc.save(`payment_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setFeedback({ title: 'Exported', message: 'PDF report downloaded.', type: 'info', onClose: () => setFeedback(null) });
  };


  const handleUpdateStatus = async (receipt: ExtendedReceipt, newStatus: 'PAID' | 'PENDING' | 'REJECTED', reason?: string) => {
    if (!user) return;
    setIsVerifying(true);
    try {
      if (receipt.source === 'SUBMISSION') {
        const statusForDoc = newStatus === 'PAID' ? 'APPROVED' : newStatus;
        await DocumentService.reviewDocument(receipt.id, statusForDoc as any, user.uid, reason);
        if (newStatus === 'REJECTED') {
          await NotificationService.sendNotification(receipt.studentId, 'Receipt Rejected', `Your receipt submission was rejected. Reason: ${reason}. Please upload a corrected receipt.`, 'status_change');
        } else if (newStatus === 'PAID') {
          await NotificationService.sendNotification(receipt.studentId, 'Receipt Approved', `Your receipt has been verified and approved.`, 'status_change');
        }
      } else {
        await ReceiptService.updateStatus(receipt.id, newStatus, user.uid);
      }
      setReceipts(receipts.map(r => r.id === receipt.id ? { ...r, status: newStatus } : r));
      setSelectedReceipt(null);
      setRejectReason('');
      setFeedback({ title: 'Success', message: `Receipt successfully marked as ${newStatus}`, type: 'info', onClose: () => setFeedback(null) });
    } catch (e: any) {
      console.error(e);
      setFeedback({ title: 'Error', message: e.message || 'Failed to update status', type: 'error', onClose: () => setFeedback(null) });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // Subscriber for manual receipts
    const qReceipts = query(collection(db, 'receipts'), orderBy('date', 'desc'));
    const unsubReceipts = onSnapshot(qReceipts, 
      (snap) => {
        const manualReceipts = snap.docs.map(doc => ({ id: doc.id, source: 'MANUAL', ...doc.data() } as ExtendedReceipt));
        setReceipts(prev => mergeReceipts(manualReceipts, prev.filter(r => r.source === 'SUBMISSION')));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'receipts')
    );

    // Subscriber for student-submitted receipts
    const qDocs = query(collection(db, 'documents'), where('type', '==', 'RECEIPT'));
    const unsubDocs = onSnapshot(qDocs, 
      (snap) => {
        const submissionReceipts = snap.docs.map(doc => ({ 
          id: doc.id, 
          source: 'SUBMISSION', 
          ...doc.data(), 
          referenceNo: (doc.data() as any).fileName, 
          studentId: (doc.data() as any).studentId, 
          date: (doc.data() as any).submittedAt, 
          status: (doc.data() as any).status === 'APPROVED' ? 'PAID' : ((doc.data() as any).status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
          purpose: 'YEARBOOK_FEE', // Default purpose for submissions
          imageUrl: (doc.data() as any).fileUrl
        } as ExtendedReceipt));
        setReceipts(prev => mergeReceipts(prev.filter(r => r.source === 'MANUAL'), submissionReceipts));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );

    return () => {
      unsubReceipts();
      unsubDocs();
    };
  }, [filterStatus]);

  const mergeReceipts = (manual: ExtendedReceipt[], submissions: ExtendedReceipt[]) => {
    const all = [...manual, ...submissions];
    if (filterStatus !== 'ALL') {
      return all.filter(r => r.status === filterStatus);
    }
    return all;
  };

  return (
    <div className="space-y-6">
      {user?.role === 'FINANCE' && (
        <div className="grid md:grid-cols-3 gap-6 mb-8 mt-2">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#fbbd08] mb-1">Pending Receipts</p>
                <div className="text-3xl font-black text-[#1a237e]">{pendingCount}</div>
             </div>
             <div className="p-4 bg-[#fbbd08]/10 text-[#fbbd08] rounded-2xl">
               <Clock className="w-6 h-6" />
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#85b27a] mb-1">Verified Today</p>
                <div className="text-3xl font-black text-[#1a237e]">{verifiedToday}</div>
             </div>
             <div className="p-4 bg-[#85b27a]/10 text-[#85b27a] rounded-2xl">
               <CheckCircle className="w-6 h-6" />
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Total Transactions</p>
                <div className="text-3xl font-black text-[#1a237e]">{totalTransactions}</div>
             </div>
             <div className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl">
               <CreditCard className="w-6 h-6" />
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Receipts</h2>
          <p className="text-sm text-gray-500 font-medium tracking-tight">Verify and track student receipts for yearbook fees and optional packages.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
             onClick={handleExportPDF}
             className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 text-[#1a237e] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
             <Download className="h-3 w-3" /> Export Report
          </button>
          <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm shrink-0 ml-auto">
             {['ALL', 'PENDING', 'PAID', 'REJECTED'].map((s) => (
               <button 
                 key={s}
                 onClick={() => setFilterStatus(s)}
                 className={cn(
                   "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                   filterStatus === s ? "bg-[#1a237e] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
                 )}
               >
                 {s}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-left">
        <table className="w-full">
          <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-8 py-4">Ref No.</th>
              <th className="px-8 py-4">Student</th>
              <th className="px-8 py-4">Purpose</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4 text-center">Image</th>
              <th className="px-8 py-4">Date</th>
              {user?.role === 'FINANCE' && <th className="px-8 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 font-bold">
            {receipts.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50 transition-colors text-sm group">
                <td className="px-8 py-4 font-mono text-gray-400">{r.referenceNo}</td>
                <td className="px-8 py-4 text-[#0d1b2a]">{r.studentId}</td>
                <td className="px-8 py-4 uppercase text-[11px]">{r.purpose?.replace?.('_', ' ') || r.purpose}</td>
                <td className="px-8 py-4">
                   <span className={cn(
                     "px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest",
                     r.status === 'PAID' ? "bg-green-100 text-green-700" :
                     r.status === 'REJECTED' ? "bg-red-100 text-red-700" :
                     "bg-[#fbbd08]/20 text-[#fbbd08]"
                   )}>
                     {r.status}
                   </span>
                </td>
                <td className="px-8 py-4">
                  <div className="flex justify-center">
                    {r.imageUrl ? (
                      <button onClick={() => {
                        if (user?.role === 'FINANCE' || user?.role === 'ADMIN') setSelectedReceipt(r);
                        else window.open(r.imageUrl, '_blank');
                      }} className="text-[#1a237e] hover:text-[#fbbd08] hover:bg-[#fbbd08]/10 p-2 rounded-xl transition-all">
                        <FileText className="h-5 w-5" />
                      </button>
                    ) : (
                      <span className="text-gray-300 text-[10px] uppercase font-black tracking-widest">N/A</span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-4 text-gray-400 font-medium">
                   {new Date(r.date).toLocaleDateString()}
                </td>
                {user?.role === 'FINANCE' && (
                  <td className="px-8 py-4 text-right">
                    <button 
                      onClick={() => setSelectedReceipt(r)}
                      className="px-4 py-2 bg-[#fbbd08]/10 text-[#fbbd08] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#fbbd08]/20 transition-all font-sans"
                    >
                      Review
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {receipts.length === 0 && !loading && (
              <tr>
                <td colSpan={user?.role === 'FINANCE' ? 7 : 6} className="px-8 py-20 text-center text-gray-300 text-[11px] font-black uppercase tracking-widest">
                   No receipts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 bg-[#0d1b2a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-8 shadow-2xl flex flex-col md:flex-row gap-8 max-h-[90vh]">
            <div className="flex-1 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden relative group">
              {selectedReceipt.imageUrl ? (
                <img src={selectedReceipt.imageUrl} alt="Receipt" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-400 font-bold">No Image Available</div>
              )}
            </div>
            <div className="w-full md:w-80 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#0d1b2a] mb-6">Review Receipt</h3>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Student ID</label>
                    <div className="font-bold text-lg">{selectedReceipt.studentId}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reference No.</label>
                    <div className="font-mono text-sm break-all">{selectedReceipt.referenceNo}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Purpose</label>
                    <div className="font-bold text-sm uppercase">{selectedReceipt.purpose?.replace?.('_', ' ') || selectedReceipt.purpose}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Submitted On</label>
                    <div className="font-bold text-sm">{new Date(selectedReceipt.date).toLocaleString()}</div>
                  </div>
                </div>

                {user?.role === 'FINANCE' && selectedReceipt.status === 'PENDING' && (
                  <div className="space-y-2 mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Rejection Reason (if rejecting)</label>
                    <textarea 
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g., Unreadable image, missing reference code..."
                      className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-[#1a237e] outline-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {user?.role === 'FINANCE' && selectedReceipt.status === 'PENDING' ? (
                  <>
                    <button 
                      disabled={isVerifying}
                      onClick={() => handleUpdateStatus(selectedReceipt, 'PAID')}
                      className="w-full py-4 rounded-xl bg-[#85b27a] text-white text-[11px] font-black uppercase tracking-widest hover:shadow-lg transition-all"
                    >
                      {isVerifying ? 'Processing...' : 'Verify & Approve'}
                    </button>
                    <button 
                      disabled={isVerifying}
                      onClick={() => {
                        if (!rejectReason) {
                           setFeedback({ title: 'Error', message: 'Please provide a regular reason for rejection.', type: 'error', onClose: () => setFeedback(null) });
                           return;
                        }
                        handleUpdateStatus(selectedReceipt, 'REJECTED', rejectReason);
                      }}
                      className="w-full py-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject Form
                    </button>
                  </>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Current Status</p>
                    <p className={cn(
                       "font-bold",
                       selectedReceipt.status === 'PAID' ? "text-green-600" :
                       selectedReceipt.status === 'REJECTED' ? "text-red-600" : "text-[#fbbd08]"
                    )}>{selectedReceipt.status}</p>
                  </div>
                )}
                <button 
                  onClick={() => { setSelectedReceipt(null); setRejectReason(''); }}
                  className="w-full py-4 rounded-xl text-gray-400 text-[11px] font-black uppercase tracking-widest hover:text-gray-600 hover:bg-gray-50 transition-all mt-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
