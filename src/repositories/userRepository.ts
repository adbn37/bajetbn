import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { Appearance, Language, TextSize, UserProfile } from '../types/models';

export interface UserPreferenceUpdate {
  fullName: string;
  language: Language;
  appearance: Appearance;
  textSize: TextSize;
  notificationsEnabled: boolean;
  dueSoonReminders: boolean;
  lateReminders: boolean;
  sharedPaymentNotifications: boolean;
  whatsappRemindersEnabled: boolean;
  reminderDaysBefore: number;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserProfile) : null;
}

export async function updateUserPreferences(uid: string, input: UserPreferenceUpdate): Promise<void> {
  const { db } = requireFirebase();
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error('Enter your name.');
  const reminderDaysBefore = Math.min(30, Math.max(0, Math.round(input.reminderDaysBefore)));

  await updateDoc(doc(db, 'users', uid), {
    fullName,
    language: input.language,
    currency: 'BND',
    timezone: 'Asia/Brunei',
    appearance: input.appearance,
    textSize: input.textSize,
    notificationsEnabled: input.notificationsEnabled,
    dueSoonReminders: input.dueSoonReminders,
    lateReminders: input.lateReminders,
    sharedPaymentNotifications: input.sharedPaymentNotifications,
    whatsappRemindersEnabled: input.whatsappRemindersEnabled,
    reminderDaysBefore,
    updatedAt: serverTimestamp(),
  });
}
