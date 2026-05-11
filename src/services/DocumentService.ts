import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  orderBy,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { DocumentSubmission } from '../types';
import { AuditService } from './AuditService';
import { handleFirestoreError, OperationType } from '../lib/utils';

export const DocumentService = {
  async submitDocument(studentId: string, type: DocumentSubmission['type'], fileName: string, fileUrl: string = 'https://picsum.photos/seed/doc/800/1000', extraData?: any) {
    try {
      const submission: Omit<DocumentSubmission, 'id'> = {
        studentId,
        type,
        fileName,
        fileUrl,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'documents'), submission);
      
      if (type === 'RECEIPT') {
        await addDoc(collection(db, 'receipts'), {
          studentId,
          purpose: 'YEARBOOK_FEE', // Default purpose
          status: 'PENDING',
          date: extraData?.date || new Date().toISOString(),
          referenceNo: extraData?.refNo || fileName,
          imageUrl: fileUrl,
          documentId: docRef.id
        });
      }

      await AuditService.log(studentId, 'SUBMIT', 'DOCUMENTS', `Submitted ${type}: ${fileName}`);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'documents');
      throw error;
    }
  },

  subscribeToStudentDocuments(studentId: string, callback: (docs: DocumentSubmission[]) => void) {
    const q = query(
      collection(db, 'documents'), 
      where('studentId', '==', studentId),
      orderBy('submittedAt', 'desc')
    );
    return onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentSubmission));
        callback(docs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );
  },

  async getStudentDocuments(studentId: string) {
    try {
      const q = query(
        collection(db, 'documents'), 
        where('studentId', '==', studentId),
        orderBy('submittedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentSubmission));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'documents');
      return [];
    }
  },

  async getAllPending(typeFilter?: string) {
    try {
      let q = query(collection(db, 'documents'), where('status', '==', 'PENDING'), orderBy('submittedAt', 'asc'));
      if (typeFilter) {
        q = query(collection(db, 'documents'), where('status', '==', 'PENDING'), where('type', '==', typeFilter), orderBy('submittedAt', 'asc'));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentSubmission));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'documents');
      return [];
    }
  },

  async getAllSubmissions(typeFilter?: string) {
    try {
      let q = query(collection(db, 'documents'), orderBy('submittedAt', 'desc'));
      if (typeFilter) {
        q = query(collection(db, 'documents'), where('type', '==', typeFilter), orderBy('submittedAt', 'desc'));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentSubmission));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'documents');
      return [];
    }
  },

  subscribeToAllDocuments(callback: (docs: DocumentSubmission[]) => void, typeFilter?: string) {
    let q = query(collection(db, 'documents'), orderBy('submittedAt', 'desc'));
    if (typeFilter) {
      q = query(collection(db, 'documents'), where('type', '==', typeFilter), orderBy('submittedAt', 'desc'));
    }
    return onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentSubmission));
        callback(docs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );
  },

  subscribeToAllPending(callback: (docs: DocumentSubmission[]) => void, typeFilter?: string) {
    let q = query(collection(db, 'documents'), where('status', '==', 'PENDING'), orderBy('submittedAt', 'asc'));
    if (typeFilter) {
      q = query(collection(db, 'documents'), where('status', '==', 'PENDING'), where('type', '==', typeFilter), orderBy('submittedAt', 'asc'));
    }
    return onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentSubmission));
        callback(docs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );
  },

  async financeReview(docId: string, financeStatus: 'VERIFIED' | 'REJECTED', financeId: string, reason?: string) {
    try {
      const docRef = doc(db, 'documents', docId);
      const updateData: any = { 
        financeStatus,
        financeVerifiedBy: financeId,
        financeVerifiedAt: new Date().toISOString()
      };
      if (reason) updateData.rejectionReason = reason;

      await updateDoc(docRef, updateData);
      
      // Sync with receipts
      const receiptQuery = query(collection(db, 'receipts'), where('documentId', '==', docId));
      const receiptSnap = await getDocs(receiptQuery);
      receiptSnap.docs.forEach(async (d) => {
          await updateDoc(doc(db, 'receipts', d.id), {
              status: financeStatus === 'VERIFIED' ? 'PAID' : 'REJECTED',
              updatedAt: new Date().toISOString()
          });
      });

      await AuditService.log(financeId, `FINANCE_${financeStatus}`, 'DOCUMENTS', `Finance reviewed doc ${docId}: ${financeStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `documents/${docId}`);
      throw error;
    }
  },

  async reviewDocument(docId: string, status: 'APPROVED' | 'REJECTED', adminId: string, reason?: string) {
    try {
      const docRef = doc(db, 'documents', docId);
      const updateData: any = { 
        status, 
        verifiedBy: adminId,
        updatedAt: new Date().toISOString()
      };
      if (reason) updateData.rejectionReason = reason;

      await updateDoc(docRef, updateData);

      // Sync with receipts if approved
      if (status === 'APPROVED') {
         const receiptQuery = query(collection(db, 'receipts'), where('documentId', '==', docId));
         const receiptSnap = await getDocs(receiptQuery);
         receiptSnap.docs.forEach(async (d) => {
             await updateDoc(doc(db, 'receipts', d.id), {
                 status: 'PAID',
                 updatedAt: new Date().toISOString()
             });
         });
      }
      
      await AuditService.log(adminId, status, 'DOCUMENTS', `Reviewed doc ${docId}: ${status}${reason ? ` - ${reason}` : ''}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `documents/${docId}`);
      throw error;
    }
  },

  async deleteSubmission(docId: string, adminId: string) {
    try {
      const docRef = doc(db, 'documents', docId);
      await deleteDoc(docRef);
      await AuditService.log(adminId, 'DELETE', 'DOCUMENTS', `Permanently deleted document submission ${docId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${docId}`);
      throw error;
    }
  }
};
