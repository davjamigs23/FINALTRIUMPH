import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  X,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DocumentService } from '../../services/DocumentService';
import { NotificationService } from '../../services/NotificationService';
import { DocumentSubmission, AppUser } from '../../types';
import { cn } from '../../lib/utils';
import FeedbackModal from '../ui/FeedbackModal';

export default function DocumentVerification({ filterType }: { filterType?: 'CLEARANCE' | 'RECEIPT' }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<DocumentSubmission[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<DocumentSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    // Subscriber for submissions
    const unsubSubmissions = showAll
      ? DocumentService.subscribeToAllDocuments((docs) => {
          setSubmissions(docs);
          setLoading(false);
        }, filterType)
      : DocumentService.subscribeToAllPending((docs) => {
          setSubmissions(docs);
          setLoading(false);
        }, filterType);

    // Subscriber for students (real-time)
    const userQuery = query(collection(db, 'users'), where('role', '==', 'STUDENT'));
    const unsubStudents = onSnapshot(userQuery, 
      (snap) => {
        setStudents(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );
    
    return () => {
      unsubSubmissions();
      unsubStudents();
    };
  }, [filterType, showAll]);

  const handleReview = async (status: 'APPROVED' | 'REJECTED' | 'VERIFIED') => {
    if (!reviewing || !user) return;
    if (status === 'REJECTED' && !rejectionReason) {
      setFeedback({ title: 'Missing Info', message: 'Please provide a reason for rejection.', type: 'alert', onClose: () => setFeedback(null) });
      return;
    }

    setIsSubmitting(true);
    try {
      if (user.role === 'FINANCE' && reviewing.type === 'RECEIPT') {
        // Finance can only verify or reject receipts
        await DocumentService.financeReview(reviewing.id, status === 'REJECTED' ? 'REJECTED' : 'VERIFIED', user.uid, rejectionReason);
      } else {
        // Admins can approve or reject
        await DocumentService.reviewDocument(reviewing.id, status === 'REJECTED' ? 'REJECTED' : 'APPROVED', user.uid, rejectionReason);
      }
      
      const notificationTitle = status === 'REJECTED' ? 'Document Rejected' : (user.role === 'FINANCE' ? 'Receipt Verified' : 'Document Approved');
      const notificationBody = `Your ${reviewing.type?.replace?.('_', ' ') || 'document'} has been ${status.toLowerCase()}.${status === 'REJECTED' ? ` Reason: ${rejectionReason}` : ''}`;

      await NotificationService.sendNotification(
        reviewing.studentId, 
        notificationTitle,
        notificationBody,
        'status_change'
      );
      setReviewing(null);
      setRejectionReason('');
    } catch (err: any) {
      console.error(err);
      setFeedback({ title: 'Error', message: `Error: ${err.message || 'Failed to review document'}`, type: 'error', onClose: () => setFeedback(null) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    setFeedback({
      title: 'Delete Document',
      message: 'PERMANENTLY DELETE this document submission? This cannot be undone.',
      type: 'confirm',
      onConfirm: async () => {
        setFeedback(null);
        try {
          await DocumentService.deleteSubmission(id, user.uid);
          setSubmissions(submissions.filter(s => s.id !== id));
          setFeedback({ title: 'Success', message: 'Document submission deleted.', type: 'info', onClose: () => setFeedback(null) });
        } catch (e) {
          console.error(e);
          setFeedback({ title: 'Error', message: 'Failed to delete document', type: 'error', onClose: () => setFeedback(null) });
        }
      },
      onCancel: () => setFeedback(null)
    });
  };

  const filtered = submissions.filter(s => 
    s.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Document Verification</h2>
          <p className="text-sm text-gray-500 font-medium">Review and verify student requirements for yearbook production.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 text-[#1a237e]" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student ID or file name..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5 shadow-sm font-bold text-sm"
          />
        </div>
        <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
          <button 
            onClick={() => setShowAll(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              !showAll ? "bg-[#1a237e] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Pending
          </button>
          <button 
            onClick={() => setShowAll(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              showAll ? "bg-[#1a237e] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
            )}
          >
            All Submissions
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-8 py-4">Submission</th>
              <th className="px-8 py-4">Document Type</th>
              <th className="px-8 py-4">Submitted</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 font-medium">
            {filtered.length > 0 ? filtered.map((sub) => {
              const student = students.find(u => u.studentId === sub.studentId || u.uid === sub.studentId);
              return (
                <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      {student?.photoURL ? (
                        <img src={student.photoURL} alt={student.displayName} className="h-10 w-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-[#1a237e]/5 flex items-center justify-center text-[#1a237e] font-black text-xs">
                          {sub.studentId.slice(-2)}
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-black text-[#0d1b2a]">{sub.fileName}</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">ID: {student?.studentId ? student.studentId : 'ID not set'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] w-fit font-bold uppercase tracking-tight text-[#1a237e] bg-[#1a237e]/5 px-2 py-0.5 rounded">{sub.type?.replace?.('_', ' ') || sub.type}</span>
                      {sub.type === 'RECEIPT' && sub.financeStatus && (
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded w-fit",
                          sub.financeStatus === 'VERIFIED' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          Finance: {sub.financeStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                      sub.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                      sub.status === 'REJECTED' ? "bg-red-100 text-red-700" :
                      sub.type === 'RECEIPT' && sub.financeStatus === 'VERIFIED' 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-[#fbbd08]/20 text-[#fbbd08]"
                    )}>
                      {sub.status === 'APPROVED' ? 'Approved' :
                       sub.status === 'REJECTED' ? 'Rejected' :
                       sub.type === 'RECEIPT' && sub.financeStatus === 'VERIFIED' ? 'Finance Verified' : 'Pending Review'}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setReviewing(sub)}
                        className={cn(
                          "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                          sub.status === 'PENDING' ? "bg-[#1a237e] text-white hover:shadow-lg" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        {sub.status === 'PENDING' ? 'Review' : 'View'}
                      </button>
                      <button 
                        onClick={() => handleDelete(sub.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Submission"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-gray-300 text-[11px] font-black uppercase tracking-widest">
                  No pending submissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {reviewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setReviewing(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"                
            />
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
               <div className="px-8 py-6 bg-[#1a237e] text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Review Submission</h3>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{reviewing.fileName}</p>
                  </div>
                  <button onClick={() => setReviewing(null)} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="h-6 w-6" />
                  </button>
               </div>

               <div className="p-8 space-y-8">
                  <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden">
                    <a href={reviewing.fileUrl} target="_blank" rel="noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-2 group relative">
                       {reviewing.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                         <img src={reviewing.fileUrl} alt={reviewing.fileName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                       ) : (
                         <>
                            <Eye className="h-12 w-12 text-gray-300 group-hover:text-[#1a237e] transition-colors" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[#1a237e]">View Full Document</span>
                         </>
                       )}
                    </a>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Rejection Reason (Required if rejecting)</label>
                     <textarea 
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g., Blurry image, incorrect student ID..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm min-h-[100px]"
                     />
                  </div>

                  <div className="flex gap-4">
                     <button 
                        disabled={isSubmitting}
                        onClick={() => handleReview('REJECTED')}
                        className="flex-1 py-4 bg-[#ff5a5a] text-white text-[12px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#ff5a5a]/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                     >
                       <XCircle className="inline-block mr-2 h-4 w-4" /> {isSubmitting ? 'Rejecting...' : (user?.role === 'FINANCE' ? 'Reject Receipt' : 'Reject Submission')}
                     </button>
                     <button 
                        disabled={isSubmitting || (user?.role === 'ADMIN' && reviewing.type === 'RECEIPT' && reviewing.financeStatus !== 'VERIFIED')}
                        onClick={() => handleReview(user?.role === 'FINANCE' ? 'VERIFIED' : 'APPROVED')}
                        className={cn(
                          "flex-1 py-4 bg-[#85b27a] text-white text-[12px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#85b27a]/20 hover:scale-[1.02] transition-all disabled:opacity-50",
                          (user?.role === 'ADMIN' && reviewing.type === 'RECEIPT' && reviewing.financeStatus !== 'VERIFIED') && "bg-gray-400 shadow-none cursor-not-allowed opacity-50"
                        )}
                        title={user?.role === 'ADMIN' && reviewing.type === 'RECEIPT' && reviewing.financeStatus !== 'VERIFIED' ? "Waiting for Finance Verification" : ""}
                     >
                       <CheckCircle className="inline-block mr-2 h-4 w-4" /> 
                       {isSubmitting ? 'Processing...' : (
                         user?.role === 'FINANCE' ? 'Verify Receipt' : (
                           reviewing.type === 'RECEIPT' && reviewing.financeStatus !== 'VERIFIED' ? 'Awaiting Finance' : 'Approve & Verify'
                         )
                       )}
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
