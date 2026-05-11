import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { DocumentService } from '../../services/DocumentService';
import { DocumentSubmission } from '../../types';
import { 
  Upload, 
  FileCheck, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import FeedbackModal from '../ui/FeedbackModal';

export default function MyDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);

  const [receiptDetails, setReceiptDetails] = useState({ refNo: '', date: new Date().toISOString().split('T')[0] });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);

  const fetchData = async () => {
    if (!user) return;
    try {
      const userDocs = await DocumentService.getStudentDocuments(user.uid);
      setDocs(userDocs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpload = async (type: DocumentSubmission['type'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (type === 'RECEIPT') {
      setPendingReceiptFile(file);
      setShowReceiptModal(true);
      return;
    }

    await performUpload(type, file);
  };

  const performUpload = async (type: DocumentSubmission['type'], file: File, extraData?: any) => {
    // File Type Validation
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFeedback({ title: 'Invalid Format', message: 'Unsupported file format. Please upload PDF, JPG, or PNG files only.', type: 'error', onClose: () => setFeedback(null) });
      return;
    }

    // File Size Validation (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ title: 'File Too Large', message: 'File size exceeds the 5MB limit. Please compress or resize it before uploading.', type: 'error', onClose: () => setFeedback(null) });
      return;
    }

    setUploading(type);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const fileUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      await DocumentService.submitDocument(user.uid, type, file.name, fileUrl, extraData);
      
      // If it's a receipt, we might need to update the record in the receipts collection with extra data
      // but the service currently creates it automatically. I'll stick to basic first or update service.
      
      await fetchData();
      setFeedback({ title: 'Success', message: 'Document successfully submitted — Your requirement has been uploaded and is now pending staff review.', type: 'info', onClose: () => setFeedback(null) });
    } catch (err) {
      console.error(err);
      setFeedback({ title: 'Error', message: 'Upload failed. Something went wrong while uploading your file.', type: 'error', onClose: () => setFeedback(null) });
    } finally {
      setUploading(null);
      setShowReceiptModal(false);
      setPendingReceiptFile(null);
    }
  };

  const docTypes: DocumentSubmission['type'][] = ['CLEARANCE', 'RECEIPT', 'BIRTH_CERTIFICATE'];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#0d1b2a]">Documents</h1>
          <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-1">Manage and track your official graduation requirements.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {docTypes.map((type) => {
          const doc = docs.find(d => d.type === type);
          const isUploading = uploading === type;
          const isRejected = doc?.status === 'REJECTED';

          return (
            <div key={type} className={cn(
              "bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col h-full group transition-all hover:shadow-xl hover:shadow-[#1a237e]/5",
              isRejected ? "border-red-100" : ""
            )}>
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "p-4 rounded-2xl transition-colors",
                  isRejected ? "bg-red-50 text-red-500" : "bg-gray-50 text-[#1a237e] group-hover:bg-[#1a237e]/5"
                )}>
                  <FileText className="h-6 w-6" />
                </div>
                {doc && (
                  <div className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg",
                    doc.status === 'APPROVED' ? "bg-[#85b27a]/15 text-[#85b27a]" :
                    doc.status === 'REJECTED' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {doc.status}
                  </div>
                )}
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-[#0d1b2a] mb-2">
                {type?.replace?.('_', ' ') || type}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mb-8 leading-relaxed opacity-80">
                {type === 'CLEARANCE' ? 'University clearance form signed by all departments.' : 
                 type === 'RECEIPT' ? 'Official receipt or slip for yearbook fees.' : 
                 'Original birth certificate for identity verification.'}
              </p>

              {isRejected && doc?.rejectionReason && (
                 <div className="mb-6 p-4 bg-red-50/50 border border-red-50 rounded-xl">
                    <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block mb-1">Rejection Detail</span>
                    <p className="text-[11px] text-red-700 font-bold leading-relaxed italic">"{doc.rejectionReason}"</p>
                 </div>
              )}

              <div className="mt-auto">
                <div className="relative">
                  <input 
                    type="file" 
                    id={`file-upload-${type}`}
                    className="hidden"
                    onChange={(e) => handleUpload(type, e)}
                    disabled={isUploading || (doc?.status === 'APPROVED' || doc?.status === 'PENDING')}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor={`file-upload-${type}`}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm",
                      doc?.status === 'APPROVED' || (doc?.status === 'PENDING' && !isUploading) ? "bg-gray-100 text-gray-400 cursor-not-allowed" :
                      isRejected ? "bg-red-600 text-white hover:bg-red-700" :
                      "bg-[#1a237e] text-white hover:shadow-xl active:scale-[0.98] shadow-[#1a237e]/10"
                    )}
                  >
                    {isUploading ? 'Uploading...' : 
                     doc?.status === 'APPROVED' ? 'Approved' : 
                     doc?.status === 'PENDING' ? 'Under Review' : 
                     isRejected ? 'Submit Correction' : 'Select File'}
                    {!isUploading && !doc?.status && <Upload className="h-4 w-4" />}
                    {doc?.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4" />}
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 flex gap-6 items-start shadow-sm shadow-amber-900/5">
        <div className="p-3 bg-amber-100 rounded-2xl">
          <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
        </div>
        <div>
          <h4 className="text-[13px] font-black uppercase tracking-[0.2em] text-[#0d1b2a] mb-2">Important Instructions</h4>
          <p className="text-[11px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed opacity-70">
            Ensure all scans are high-resolution. File size limit: 5MB per document. 
            Verification typically takes 24-48 hours. If your document is rejected, check the notes and re-upload the correct version.
          </p>
        </div>
      </div>

      {/* Receipt Details Modal */}
      <AnimatePresence>
        {showReceiptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 rounded-xl">
                        <FileCheck className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Receipt Details</h3>
                 </div>
                 <button onClick={() => { setShowReceiptModal(false); setPendingReceiptFile(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                   <XCircle className="h-6 w-6" />
                 </button>
              </div>

              <div className="space-y-6 mb-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reference Number</label>
                    <input 
                      type="text" 
                      value={receiptDetails.refNo}
                      onChange={(e) => setReceiptDetails(prev => ({ ...prev, refNo: e.target.value }))}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      placeholder="e.g. REF-12345678"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date of Payment</label>
                    <input 
                      type="date" 
                      value={receiptDetails.date}
                      onChange={(e) => setReceiptDetails(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                 </div>
                 <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden">
                       <FileText className="h-6 w-6 text-gray-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <p className="text-[11px] font-bold text-[#0d1b2a] truncate">{pendingReceiptFile?.name}</p>
                       <p className="text-[9px] text-gray-400 font-bold uppercase">Ready to upload</p>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => pendingReceiptFile && performUpload('RECEIPT', pendingReceiptFile, receiptDetails)}
                disabled={!receiptDetails.refNo || !receiptDetails.date || !!uploading}
                className="w-full py-4.5 bg-[#fbbd08] text-[#0d1b2a] rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#fbbd08]/20 hover:shadow-2xl transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {uploading === 'RECEIPT' ? 'Uploading...' : 'Confirm Submission'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
