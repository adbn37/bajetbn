import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { ReminderAction, ReminderHistory, ReminderItemType } from '../types/models';

export async function listReminderHistory(uid: string): Promise<ReminderHistory[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(
    collection(db, 'reminderHistory'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50),
  ));

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ReminderHistory);
}

export async function recordReminder(input: {
  uid: string;
  itemType: ReminderItemType;
  itemId: string;
  itemName: string;
  spaceId?: string;
  dueDate?: string;
  action: ReminderAction;
  message: string;
  phone?: string;
}) {
  const { db } = requireFirebase();
  await addDoc(collection(db, 'reminderHistory'), {
    uid: input.uid,
    itemType: input.itemType,
    itemId: input.itemId,
    itemName: input.itemName.trim(),
    spaceId: input.spaceId || null,
    dueDate: input.dueDate || null,
    action: input.action,
    message: input.message.trim(),
    phone: input.phone?.trim() || null,
    createdAt: serverTimestamp(),
  });
}
