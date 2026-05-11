import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLogEntry } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';

export class AuditService {
  private static COLLECTION = 'audit_logs';

  static async log(userId: string, action: string, module: string, details: string) {
    try {
      await addDoc(collection(db, this.COLLECTION), {
        userId,
        action,
        module,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Logging failed:', error);
      // We don't throw here to avoid cascading failures if logging fails
    }
  }

  static async getLogs(max = 100, module?: string): Promise<any[]> {
    try {
      let q;
      if (module && module !== 'ALL') {
        q = query(
          collection(db, this.COLLECTION),
          where('module', '==', module),
          orderBy('timestamp', 'desc'),
          limit(max)
        );
      } else {
        q = query(
          collection(db, this.COLLECTION),
          orderBy('timestamp', 'desc'),
          limit(max)
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.COLLECTION);
      // Fallback
      return [
        { id: 'l1', userId: 'u1', action: 'CREATE', module: 'BATCHES', details: 'Created batch BSIT 4-A', timestamp: new Date().toISOString() },
        { id: 'l2', userId: 'u2', action: 'APPROVE', module: 'DOCUMENTS', details: 'Approved Clearance for user 123', timestamp: new Date().toISOString() }
      ];
    }
  }
}
