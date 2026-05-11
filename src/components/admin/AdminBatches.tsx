import React, { useEffect, useState, useMemo } from 'react';
import { BatchService, BatchGroup } from '../../services/BatchService';
import { Layers, Plus, Users, Search, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { AppUser } from '../../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import FeedbackModal from '../ui/FeedbackModal';

export default function AdminBatches() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchGroup[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', course: '', section: '', yearLevel: '' });
  const [loading, setLoading] = useState(true);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [viewingBatch, setViewingBatch] = useState<BatchGroup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ids: string[]} | null>(null);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    const unsubBatches = onSnapshot(collection(db, 'batches'), 
      (snap) => {
        setBatches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BatchGroup)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'batches')
    );

    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('role', '==', 'STUDENT')), 
      (snap) => {
        setStudents(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    return () => {
      unsubBatches();
      unsubStudents();
    };
  }, []);

  const batchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      if (s.batch) {
        counts[s.batch] = (counts[s.batch] || 0) + 1;
      }
    });
    return counts;
  }, [students]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await BatchService.createBatch(
        newBatch.name,
        newBatch.course,
        newBatch.section,
        newBatch.yearLevel,
        user.uid
      );
      setIsAdding(false);
      setNewBatch({ name: '', course: '', section: '', yearLevel: '' });
      setFeedback({ title: 'Success', message: 'Batch successfully created!', type: 'info', onClose: () => setFeedback(null) });
    } catch (err) {
      console.error(err);
      setFeedback({ title: 'Error', message: 'Failed to create batch', type: 'error', onClose: () => setFeedback(null) });
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!user) return;
    try {
      await Promise.all(ids.map(id => BatchService.deleteBatch(id, user.uid)));
      setSelectedBatches([]);
      setConfirmDelete(null);
      setFeedback({ title: 'Success', message: 'Batch(es) deleted successfully.', type: 'info', onClose: () => setFeedback(null) });
    } catch (e) {
      console.error(e);
      setFeedback({ title: 'Error', message: 'Failed to delete batch(es)', type: 'error', onClose: () => setFeedback(null) });
      setConfirmDelete(null);
    }
  };

  const toggleBatchSelection = (id: string) => {
    setSelectedBatches(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const studentsInBatch = useMemo(() => {
    if (!viewingBatch) return [];
    return students.filter(s => s.batch === viewingBatch.name);
  }, [students, viewingBatch]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Batch Management</h2>
          <div className="mt-2 p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-center gap-3">
            <Users className="h-5 w-5 text-sky-600" />
            <p className="text-sm text-sky-800 font-medium tracking-tight">
              Organize students into groups. 
              <span className="font-bold ml-1">Note: Student assignment to batches is done in the Student Records module.</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isSelecting ? (
            <button 
              onClick={() => setIsSelecting(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
            >
              <CheckSquare className="h-4 w-4" /> Multiple Selection
            </button>
          ) : (
            <>
              <button 
                onClick={() => { setIsSelecting(false); setSelectedBatches([]); }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button 
                onClick={() => setSelectedBatches(selectedBatches.length === batches.length ? [] : batches.map(b => b.id))}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
              >
                {selectedBatches.length === batches.length ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />} 
                {selectedBatches.length === batches.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedBatches.length > 0 && (
                <button 
                  onClick={() => setConfirmDelete({ ids: selectedBatches })}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 border border-red-100 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 hover:shadow-sm transition-all"
                >
                  <Trash2 className="h-4 w-4" /> Delete ({selectedBatches.length})
                </button>
              )}
            </>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1a237e] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" /> Create New
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
            <div 
            key={batch.id} 
            onClick={() => isSelecting ? toggleBatchSelection(batch.id) : setViewingBatch(batch)}
            className={cn(
              "cursor-pointer bg-white p-6 rounded-3xl border shadow-sm transition-all group relative",
              selectedBatches.includes(batch.id) ? "border-[#1a237e] ring-1 ring-[#1a237e]" : "border-gray-100 hover:border-[#1a237e]/20"
            )}
          >
             <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {!isSelecting && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ ids: [batch.id] }); }}
                    className="p-3 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Delete batch"
                    >
                    <Trash2 className="h-4 w-4" />
                    </button>
                )}
             </div>
             <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-gray-50 rounded-2xl text-[#1a237e] group-hover:bg-[#1a237e] group-hover:text-white transition-all">
                   <Layers className="h-6 w-6" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#85b27a] px-3 py-1 bg-[#85b27a]/10 rounded-full">Active</div>
             </div>
             <h3 className="text-xl font-black text-[#0d1b2a] tracking-tight mb-1">{batch.name}</h3>
             <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">{batch.course} — Section {batch.section}</p>
             
             <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                <div className="flex items-center gap-2">
                   <Users className="h-4 w-4 text-gray-300" />
                   <span className="text-[12px] font-black text-[#0d1b2a]">{batchCounts[batch.name] || 0} Students</span>
                </div>
             </div>
          </div>
        ))}
        {batches.length === 0 && !loading && (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
             <Layers className="h-10 w-10 mb-4 opacity-20" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em]">No batches defined yet</p>
          </div>
        )}
      </div>

      {confirmDelete && (
        <FeedbackModal 
          type="confirm"
          title="Delete Batch(es)"
          message={`Are you sure you want to delete ${confirmDelete.ids.length} batch(es)? Students will remain but won't be in a batch.`}
          onConfirm={() => handleDelete(confirmDelete.ids)}
          onCancel={() => setConfirmDelete(null)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingBatch(null)}>
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-8 py-6 bg-[#1a237e] text-white flex justify-between items-center">
                 <h3 className="text-lg font-black uppercase tracking-tight">{viewingBatch.name} - Students</h3>
                 <button onClick={() => setViewingBatch(null)}><X className="h-6 w-6" /></button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                 {studentsInBatch.length === 0 ? (
                    <p className="text-gray-400 text-center py-10 font-bold uppercase text-xs">No students in this batch.</p>
                 ) : (
                    <div className="space-y-4">
                       {studentsInBatch.map(s => (
                          <div key={s.uid} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                            <img src={s.photoURL || '/placeholder-user.png'} alt={s.displayName} className="h-12 w-12 rounded-full object-cover" />
                            <div>
                               <p className="font-black text-sm text-[#0d1b2a]">{s.displayName}</p>
                               <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{s.studentId}</p>
                            </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-8 py-6 bg-[#1a237e] text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Create Batch</h3>
                 <button onClick={() => setIsAdding(false)}><X className="h-6 w-6" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-8 space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Batch Name</label>
                    <input 
                      required
                      value={newBatch.name}
                      onChange={e => setNewBatch({...newBatch, name: e.target.value})}
                      placeholder="e.g. BATCH 2026A" 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Course</label>
                        <input 
                          required
                          value={newBatch.course}
                          onChange={e => setNewBatch({...newBatch, course: e.target.value})}
                          placeholder="BSIT" 
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Section</label>
                        <input 
                          required
                          value={newBatch.section}
                          onChange={e => setNewBatch({...newBatch, section: e.target.value})}
                          placeholder="4-A" 
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5"
                        />
                    </div>
                 </div>
                 <button 
                  type="submit"
                  className="w-full py-4 bg-[#fbbd08] text-[#0d1b2a] text-[12px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] transition-all mt-4"
                 >
                   Initialize Batch
                 </button>
              </form>
           </div>
        </div>
      )}
      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
