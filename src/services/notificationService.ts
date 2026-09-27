import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { NotificationItem } from '../types';

export function subscribeToNotifications(
  userId: string | undefined,
  role: string | undefined,
  callback: (notifications: NotificationItem[]) => void
): () => void {
  const path = 'notifications';
  // Listen to recent notifications
  const q = query(collection(db, path), limit(30));

  return onSnapshot(q, (snapshot) => {
    const list: NotificationItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as NotificationItem;
      // Filter if targeted to specific user or role or broadcast
      if (
        !data.userId && !data.role ||
        data.userId === userId ||
        (data.role && data.role === role) ||
        role === 'admin'
      ) {
        list.push({ ...data, id: doc.id });
      }
    });

    list.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeB - timeA;
    });

    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, {
      read: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createSystemNotification(data: Omit<NotificationItem, 'id' | 'read' | 'timestamp'>): Promise<void> {
  const path = 'notifications';
  try {
    const notifRef = doc(collection(db, 'notifications'));
    const notifData: NotificationItem = {
      ...data,
      id: notifRef.id,
      read: false,
      timestamp: serverTimestamp()
    };
    await setDoc(notifRef, notifData);
  } catch (error) {
    console.warn('Could not write notification:', error);
  }
}
