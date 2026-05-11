import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AppUser, DocumentSubmission } from '../../types';
import { Search, MoreHorizontal, User, Mail, Hash, BookOpen, Layers, X, Save, Trash2, FileText, Eye } from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../../lib/utils';
import { BatchService, BatchGroup } from '../../services/BatchService';
import { UserService } from '../../services/UserService';
import { DocumentService } from '../../services/DocumentService';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import FeedbackModal from '../ui/FeedbackModal';

export default function AdminRecords() {
  const { user } = useAuth();
  const [students, setStudents] = useState<AppUser[]>([]);
  const [batches, setBatches] = useState<BatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [editingStudent, setEditingStudent] = useState<AppUser | null>(null);
  const [showBatchAssign, setShowBatchAssign] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [viewingDocs, setViewingDocs] = useState<{ student: AppUser, docs: DocumentSubmission[] } | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    studentId: '',
    batch: '',
    isActive: true
  });

  const [isLoadingBulk, setIsLoadingBulk] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  const toggleStudentSelection = (uid: string) => {
    setSelectedStudents(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleAllSelection = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.uid));
    }
  };

  const fetchStudents = () => {
    setLoading(true);
    const q = query(collection(db, 'users'), where('role', '==', 'STUDENT'));
    
    return onSnapshot(q, 
      async (snap) => {
        const studentsData = snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
        setStudents(studentsData);
        
        const bData = await BatchService.getAllBatches();
        setBatches(bData);
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );
  };

  useEffect(() => {
    const unsub = fetchStudents();
    return () => unsub();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || 
        (filterStatus === 'ACTIVE' && s.isActive !== false) ||
        (filterStatus === 'INACTIVE' && s.isActive === false);
      /* Temporary console log */
      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, filterStatus]);

  const handleBatchUpdate = async (update: object) => {
    setFeedback({
      title: 'Update Students',
      message: `Are you sure you want to update these ${selectedStudents.length} students?`,
      type: 'confirm',
      onConfirm: async () => {
        setFeedback(null);
        setIsLoadingBulk(true);
        try {
          await Promise.all(selectedStudents.map(uid => updateDoc(doc(db, 'users', uid), update)));
          setSelectedStudents([]);
          setFeedback({ title: 'Success', message: 'Students updated successfully.', type: 'info', onClose: () => setFeedback(null) });
        } catch (err) {
          console.error(err);
          setFeedback({ title: 'Error', message: 'Failed to update student statuses.', type: 'error', onClose: () => setFeedback(null) });
        } finally {
          setIsLoadingBulk(false);
        }
      },
      onCancel: () => setFeedback(null)
    });
  };

  const handleDeactivate = async (uid: string, currentStatus: boolean = true) => {
    const action = currentStatus ? 'deactivate' : 'reactivate';
    setFeedback({
      title: 'Update Status',
      message: `Are you sure you want to ${action} this student account?`,
      type: 'confirm',
      onConfirm: async () => {
        setFeedback(null);
        try {
          await updateDoc(doc(db, 'users', uid), { isActive: !currentStatus });
          setFeedback({ title: 'Success', message: `Student account ${currentStatus ? 'deactivated' : 'reactivated'}.`, type: 'info', onClose: () => setFeedback(null) });
        } catch (error) {
          console.error('Error updating student status:', error);
          setFeedback({ title: 'Error', message: 'Failed to update student record.', type: 'error', onClose: () => setFeedback(null) });
        }
      },
      onCancel: () => setFeedback(null)
    });
  };

  const handleDelete = async (uid: string) => {
    if (!user) return;
    setFeedback({
      title: 'Delete Student',
      message: 'PERMANENTLY DELETE this student record? This action is irreversible.',
      type: 'confirm',
      onConfirm: async () => {
        setFeedback(null);
        try {
          await UserService.deleteUser(uid, user.uid);
          setStudents(students.filter(s => s.uid !== uid));
          setFeedback({ title: 'Success', message: 'Student record deleted successfully.', type: 'info', onClose: () => setFeedback(null) });
        } catch (e) {
          console.error(e);
          setFeedback({ title: 'Error', message: 'Failed to delete student record.', type: 'error', onClose: () => setFeedback(null) });
        }
      },
      onCancel: () => setFeedback(null)
    });
  };

  const startEdit = (student: AppUser) => {
    setEditingStudent(student);
    setEditFormData({
      displayName: student.displayName || '',
      studentId: student.studentId || '',
      batch: student.batch || '',
      isActive: student.isActive !== false
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateDoc(doc(db, 'users', editingStudent.uid), {
        ...editFormData,
        updatedAt: new Date().toISOString()
      });
      setEditingStudent(null);
      fetchStudents();
      setFeedback({ title: 'Success', message: 'Student record updated successfully.', type: 'info', onClose: () => setFeedback(null) });
    } catch (e) {
      console.error(e);
      setFeedback({ title: 'Error', message: 'Failed to update student.', type: 'error', onClose: () => setFeedback(null) });
    }
  };

  const handleViewDocs = async (student: AppUser) => {
    setLoadingDocs(true);
    try {
      const docs = await DocumentService.getStudentDocuments(student.uid);
      setViewingDocs({ student, docs });
    } catch (e) {
      console.error(e);
      setFeedback({ title: 'Error', message: 'Failed to fetch student documents', type: 'error', onClose: () => setFeedback(null) });
    } finally {
      setLoadingDocs(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Student Records</h2>
            <p className="text-sm text-gray-500 font-medium">View and manage all registered student profiles.</p>
          </div>
          
          <div className="flex items-center gap-2">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(status => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filterStatus === status ? "bg-[#1a237e] text-white shadow-md" : "bg-white text-gray-400 border border-gray-100 hover:text-gray-600"
                )}
              >{status}</button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or email..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a237e]/10 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {selectedStudents.length > 0 && (
          <div className="bg-[#1a237e]/5 p-4 rounded-2xl flex items-center justify-between border border-[#1a237e]/10">
            <p className="text-[11px] font-black uppercase text-[#1a237e] tracking-widest">{selectedStudents.length} students selected</p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedStudents([])} className="px-4 py-2 bg-white rounded-lg text-gray-500 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50">Cancel</button>
              <button 
                onClick={() => handleBatchUpdate({ isActive: true })} 
                disabled={isLoadingBulk}
                className="px-4 py-2 bg-white rounded-lg text-[#85b27a] font-bold text-[10px] uppercase tracking-widest hover:bg-green-50 disabled:opacity-50"
              >{isLoadingBulk ? 'Updating...' : 'Activate'}</button>
              <button 
                onClick={() => handleBatchUpdate({ isActive: false })} 
                disabled={isLoadingBulk}
                className="px-4 py-2 bg-white rounded-lg text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 disabled:opacity-50"
              >{isLoadingBulk ? 'Updating...' : 'Deactivate'}</button>
              <button 
                onClick={() => setShowBatchAssign(true)} 
                disabled={isLoadingBulk}
                className="px-4 py-2 bg-[#1a237e] rounded-lg text-white font-bold text-[10px] uppercase tracking-widest hover:bg-[#1a237e]/90 disabled:opacity-50"
              >Assign Batch</button>
            </div>
          </div>
        )}

        {showBatchAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
               onClick={() => setShowBatchAssign(false)}
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm" onClick={e => e.stopPropagation()}>
               <h3 className="text-sm font-black uppercase tracking-tight mb-4 text-[#0d1b2a]">Assign Batch</h3>
               <select 
                 className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100 mb-6"
                 value={selectedBatch}
                 onChange={e => setSelectedBatch(e.target.value)}
               >
                 <option value="">Select a batch</option>
                 {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
               </select>
               <div className="flex gap-2">
                 <button onClick={() => setShowBatchAssign(false)} className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-gray-600 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200">Cancel</button>
                 <button 
                   onClick={() => {
                     if (selectedBatch) {
                        handleBatchUpdate({ batch: selectedBatch });
                        setShowBatchAssign(false);
                     } else {
                       setFeedback({ title: 'Missing Batch', message: 'Please select a batch to assign.', type: 'alert', onClose: () => setFeedback(null) });
                     }
                   }} 
                   className="flex-1 px-4 py-3 bg-[#1a237e] rounded-xl text-white font-bold text-[10px] uppercase tracking-widest hover:bg-[#1a237e]/90"
                 >Save & Assign</button>
               </div>
            </div>
          </div>
        )}

       <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <tr>
                  <th className="px-8 py-4"><input type="checkbox" onChange={toggleAllSelection} checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} className="rounded border-gray-300 text-[#1a237e] focus:ring-[#1a237e]" /></th>
                  <th className="px-8 py-4">Student</th>
                  <th className="px-8 py-4">ID / Email</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Batch</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-bold">
                {filteredStudents.map((s) => (
                  <tr key={s.uid} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-4"><input type="checkbox" checked={selectedStudents.includes(s.uid)} onChange={() => toggleStudentSelection(s.uid)} className="rounded border-gray-300 text-[#1a237e] focus:ring-[#1a237e]" /></td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1a237e]/5 border-2 border-white shadow-sm flex items-center justify-center text-[#1a237e] font-black text-xs uppercase overflow-hidden">
                            {s.photoURL ? <img src={s.photoURL} alt="" referrerPolicy="no-referrer" /> : s.displayName?.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-[13px] text-[#0d1b2a] font-black uppercase tracking-tight">{s.displayName}</p>
                          <p className="text-[10px] text-gray-400 font-bold">MEMBER SINCE {new Date(s.createdAt).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                        <p className="text-[11px] text-[#0d1b2a] leading-none mb-1 uppercase tracking-tight font-black">{s.studentId || 'NO ID'}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{s.email}</p>
                    </td>
                    <td className="px-8 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                          s.isActive !== false ? "bg-[#85b27a]/20 text-[#85b27a]" : "bg-red-50 text-red-500"
                        )}>
                          {s.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td className="px-8 py-4 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                        {s.batch || 'Unassigned'}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleViewDocs(s)}
                          className="p-2 hover:bg-[#1a237e]/5 text-[#1a237e] rounded-lg transition-colors" 
                          title="View Documents"
                        >
                            <FileText className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => startEdit(s)}
                          className="p-2 hover:bg-[#1a237e]/5 text-[#1a237e] rounded-lg transition-colors" 
                          title="Edit Student"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.uid)} 
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          title="Permanently Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-300 text-[11px] font-black uppercase tracking-widest">
                       No student records match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
       </div>

       {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 bg-[#1a237e] text-white flex justify-between items-center">
                   <div>
                     <h3 className="text-xl font-black uppercase tracking-tight">Edit Student Record</h3>
                     <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{editingStudent.email}</p>
                   </div>
                   <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleUpdate} className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                           <User className="h-3 w-3" /> Full Name
                         </label>
                         <input 
                           required
                           value={editFormData.displayName}
                           onChange={e => setEditFormData({...editFormData, displayName: e.target.value})}
                           className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                           <Hash className="h-3 w-3" /> Student ID
                         </label>
                         <input 
                           required
                           value={editFormData.studentId}
                           onChange={e => setEditFormData({...editFormData, studentId: e.target.value})}
                           className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                           <Layers className="h-3 w-3" /> Batch Assignment
                         </label>
                         <select 
                           value={editFormData.batch}
                           onChange={e => setEditFormData({...editFormData, batch: e.target.value})}
                           className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100"
                         >
                            <option value="">Unassigned</option>
                            {batches.map(b => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                           Status
                         </label>
                         <select 
                           value={editFormData.isActive ? 'true' : 'false'}
                           onChange={e => setEditFormData({...editFormData, isActive: e.target.value === 'true'})}
                           className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100"
                         >
                            <option value="true">Active Account</option>
                            <option value="false">Deactivated</option>
                         </select>
                      </div>
                   </div>

                   <button 
                    type="submit"
                    className="w-full py-4 bg-[#fbbd08] text-[#0d1b2a] text-[12px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-[#fbbd08]/20 flex items-center justify-center gap-2 transition-all mt-4"
                   >
                     <Save className="h-4 w-4" /> Save Changes
                   </button>
                </form>
             </div>
          </div>
       )}

       <AnimatePresence>
         {viewingDocs && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setViewingDocs(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
             >
               <div className="px-8 py-6 bg-[#1a237e] text-white flex justify-between items-center shrink-0">
                 <div>
                   <h3 className="text-xl font-black uppercase tracking-tight">Student Documents</h3>
                   <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{viewingDocs.student.displayName} • {viewingDocs.student.studentId}</p>
                 </div>
                 <button onClick={() => setViewingDocs(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-6 w-6" /></button>
               </div>
               
               <div className="p-8 overflow-y-auto space-y-6">
                 {viewingDocs.docs.length > 0 ? (
                   <div className="grid grid-cols-1 gap-4">
                     {viewingDocs.docs.map(doc => (
                       <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100">
                             {doc.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                               <img src={doc.fileUrl} alt="" className="h-full w-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                             ) : (
                               <FileText className="h-6 w-6 text-[#1a237e]" />
                             )}
                           </div>
                           <div>
                             <p className="text-[13px] font-black text-[#0d1b2a] uppercase tracking-tight">{doc.type?.replace?.('_', ' ') || doc.type}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{doc.fileName}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className={cn(
                             "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                             doc.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                             doc.status === 'REJECTED' ? "bg-red-100 text-red-700" : "bg-[#fbbd08]/20 text-[#fbbd08]"
                           )}>
                             {doc.status}
                           </span>
                           <a 
                             href={doc.fileUrl} 
                             target="_blank" 
                             rel="noreferrer"
                             className="p-2 bg-white rounded-lg border border-gray-200 text-[#1a237e] hover:bg-gray-50 transition-colors shadow-sm"
                           >
                             <Eye className="h-4 w-4" />
                           </a>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="py-20 text-center space-y-4">
                     <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                       <FileText className="h-8 w-8 text-gray-200" />
                     </div>
                     <p className="text-[11px] font-black uppercase tracking-widest text-gray-300">No documents submitted yet</p>
                   </div>
                 )}
               </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
