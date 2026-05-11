import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Announcement } from '../types';
import { AuditService } from './AuditService';
import { handleFirestoreError, OperationType } from '../lib/utils';

export const AnnouncementService = {
  async postAnnouncement(title: string, content: string, category: Announcement['category'], authorId: string, isPinned: boolean = false) {
    try {
      const announcement: Omit<Announcement, 'id'> = {
        title,
        content,
        category,
        isPinned,
        authorId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'announcements'), announcement);
      await AuditService.log(authorId, 'POST', 'ANNOUNCEMENTS', `Posted: ${title}`);
      return docRef.id;
    } catch (error) {
      return handleFirestoreError(error, OperationType.WRITE, 'announcements');
    }
  },

  async getAll() {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'announcements');
    }
  }
};
