import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  getDocs, 
  where
} from 'firebase/firestore';
import { AuditService } from './AuditService';
import { handleFirestoreError, OperationType } from '../lib/utils';

export interface BatchGroup {
  id: string;
  name: string; // e.g. "BSIT 4-A"
  course: string;
  section: string;
  yearLevel: string;
  studentCount: number;
}

export const BatchService = {
  async createBatch(name: string, course: string, section: string, yearLevel: string, adminId: string) {
    try {
      const batch = {
        name,
        course,
        section,
        yearLevel,
        studentCount: 0,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'batches'), batch);
      await AuditService.log(adminId, 'CREATE', 'BATCHES', `Created batch ${name}`);
      return docRef.id;
    } catch (error) {
      return handleFirestoreError(error, OperationType.WRITE, 'batches');
    }
  },

  async getAllBatches(): Promise<BatchGroup[]> {
    try {
      const snapshot = await getDocs(collection(db, 'batches'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BatchGroup));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'batches');
    }
  },

  async getBatchStudentCounts(): Promise<Record<string, number>> {
    try {
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'STUDENT')));
      const counts: Record<string, number> = {};
      studentsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.batch) {
          counts[data.batch] = (counts[data.batch] || 0) + 1;
        }
      });
      return counts;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'users');
    }
  },

  async deleteBatch(id: string, adminId: string) {
    try {
      const { deleteDoc, doc: fireDoc } = await import('firebase/firestore');
      await deleteDoc(fireDoc(db, 'batches', id));
      await AuditService.log(adminId, 'DELETE', 'BATCHES', `Deleted batch ${id}`);
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `batches/${id}`);
    }
  }
};
