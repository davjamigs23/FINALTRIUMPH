import { db } from '../firebase';
import { collection, doc, deleteDoc, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { AuditService } from './AuditService';
import { handleFirestoreError, OperationType } from '../lib/utils';

export interface Receipt {
  id: string;
  studentId: string;
  purpose: string;
  status: 'PAID' | 'PENDING' | 'REJECTED';
  date: string;
  referenceNo: string;
  imageUrl?: string;
}

export const ReceiptService = {
  async getAllReceipts(limitCount: number = 100, status?: string): Promise<Receipt[]> {
    try {
      let q;
      if (status && status !== 'ALL') {
        q = query(
          collection(db, 'receipts'), 
          where('status', '==', status),
          orderBy('date', 'desc'), 
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, 'receipts'), 
          orderBy('date', 'desc'), 
          limit(limitCount)
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Receipt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'receipts');
      return [
        { id: 'r1', studentId: 'u1', purpose: 'Yearbook Fee', status: 'PAID', date: new Date().toISOString(), referenceNo: 'REF123' },
        { id: 'r2', studentId: 'u2', purpose: 'Toga Rental', status: 'PENDING', date: new Date().toISOString(), referenceNo: 'REF456' }
      ];
    }
  },

  async updateStatus(id: string, status: 'PAID' | 'PENDING' | 'REJECTED', adminId: string) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'receipts', id);
      await updateDoc(docRef, { 
        status,
        updatedAt: new Date().toISOString()
      });
      await AuditService.log(adminId, 'UPDATE', 'RECEIPTS', `Updated receipt ${id} status to ${status}`);
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, `receipts/${id}`);
    }
  },

  async deleteReceipt(id: string, adminId: string) {
    try {
      const docRef = doc(db, 'receipts', id);
      await deleteDoc(docRef);
      await AuditService.log(adminId, 'DELETE', 'RECEIPTS', `Deleted receipt record ${id}`);
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `receipts/${id}`);
    }
  }
};
