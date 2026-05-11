import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/utils';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'status_change' | 'announcement' | 'deadline';
  isRead: boolean;
  createdAt: string;
}

export const NotificationService = {
  async sendNotification(userId: string, title: string, message: string, type: Notification['type']) {
    try {
      const notification: Omit<Notification, 'id'> = {
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'notifications'), notification);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, 
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        callback(notifications);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    );
  },

  async markAsRead(notificationId: string) {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications/${notificationId}`);
    }
  }
};
