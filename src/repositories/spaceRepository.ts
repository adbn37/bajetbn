import {
  collection,
  doc,
  documentId,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { Space, SpaceType } from '../types/models';
import { createClientDisplayId } from '../utils/ids';

export async function listSpaces(uid: string): Promise<Space[]> {
  const { db } = requireFirebase();
  const memberSnapshot = await getDocs(query(collection(db, 'spaceMembers'), where('uid', '==', uid)));
  const spaceIds = memberSnapshot.docs.map((item) => item.data().spaceId as string);
  const spaces: Space[] = [];

  for (let index = 0; index < spaceIds.length; index += 10) {
    const chunk = spaceIds.slice(index, index + 10);
    if (!chunk.length) continue;
    const snapshot = await getDocs(query(collection(db, 'spaces'), where(documentId(), 'in', chunk)));
    snapshot.forEach((item) => spaces.push({ id: item.id, ...item.data() } as Space));
  }

  return spaces.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createSpace(input: {
  uid: string;
  name: string;
  type: Exclude<SpaceType, 'personal'>;
  currency: string;
  timezone: string;
  description?: string;
}): Promise<string> {
  const { db } = requireFirebase();
  const spaceRef = doc(collection(db, 'spaces'));
  const memberRef = doc(db, 'spaceMembers', `${spaceRef.id}_${input.uid}`);
  const batch = writeBatch(db);

  batch.set(spaceRef, {
    displayId: createClientDisplayId('SPC'),
    name: input.name.trim(),
    type: input.type,
    ownerId: input.uid,
    collaborationMode: 'owner_managed',
    currency: input.currency,
    timezone: input.timezone,
    description: input.description?.trim() || '',
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(memberRef, {
    spaceId: spaceRef.id,
    uid: input.uid,
    role: 'owner',
    canUseAccounts: true,
    canViewBalances: true,
    canViewLedger: true,
    joinedAt: serverTimestamp(),
  });

  await batch.commit();
  return spaceRef.id;
}

export async function updateSpace(spaceId: string, updates: { name: string; description?: string }) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'spaces', spaceId), {
    name: updates.name.trim(),
    description: updates.description?.trim() || '',
    updatedAt: serverTimestamp(),
  });
}

export async function archiveSpace(spaceId: string) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'spaces', spaceId), {
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
