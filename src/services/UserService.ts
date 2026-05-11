import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { AuditService } from './AuditService';
import { handleFirestoreError, OperationType } from '../lib/utils';

export const UserService = {
  async deleteUser(uid: string, adminId: string) {
    try {
      // Note: This only deletes the Firestore record. 
      // In a real app, you'd use Firebase Admin SDK to delete the Auth record too.
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
      await AuditService.log(adminId, 'DELETE', 'USERS', `Deleted user account ${uid}`);
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  }
};
