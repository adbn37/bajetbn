import { doc, getDoc } from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { UserProfile } from '../types/models';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserProfile) : null;
}
