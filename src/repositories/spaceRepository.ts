import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { CustomSpaceModule, Space, SpaceType } from '../types/models';
import { createClientDisplayId } from '../utils/ids';

export async function listSpaces(uid: string): Promise<Space[]> {
  const { db } = requireFirebase();
  const memberSnapshot = await getDocs(query(collection(db, 'spaceMembers'), where('uid', '==', uid)));
  const spaceIds = memberSnapshot.docs
    .filter((item) => !item.data().status || item.data().status === 'active')
    .map((item) => item.data().spaceId as string);
  const spaces: Space[] = [];

  for (let index = 0; index < spaceIds.length; index += 10) {
    const chunk = spaceIds.slice(index, index + 10);
    if (!chunk.length) continue;
    const snapshot = await getDocs(query(collection(db, 'spaces'), where(documentId(), 'in', chunk)));
    snapshot.forEach((item) => spaces.push({ id: item.id, ...item.data() } as Space));
  }

  return spaces.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load one Space directly.
 *
 * Firestore security rules already require the signed-in user to be an
 * active member of the requested Space, so this avoids loading every Space
 * only to locate the current one.
 */
export async function getSpace(spaceId: string): Promise<Space | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'spaces', spaceId));

  return snapshot.exists()
    ? ({ id: snapshot.id, ...snapshot.data() } as Space)
    : null;
}

export async function createSpace(input: {
  uid: string;
  name: string;
  type: Exclude<SpaceType, 'personal'>;
  currency: string;
  timezone: string;
  description?: string;
  customModules?: CustomSpaceModule[];
}): Promise<string> {
  const { functions } = requireFirebase();

  const call = httpsCallable<
    {
      name: string;
      type: Exclude<SpaceType, 'personal'>;
      currency: string;
      timezone: string;
      description?: string;
      customModules?: CustomSpaceModule[];
    },
    { spaceId: string }
  >(
    functions,
    'createSpaceWithEntitlement',
  );

  const result = await call({
    name: input.name,
    type: input.type,
    currency: input.currency,
    timezone: input.timezone,
    description: input.description,
    customModules: input.customModules,
  });

  return result.data.spaceId;
}
export async function updateSpace(spaceId: string, updates: { name: string; description?: string; customModules?: CustomSpaceModule[] }) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'spaces', spaceId), {
    name: updates.name.trim(),
    description: updates.description?.trim() || '',
    ...(updates.customModules ? { customModules: updates.customModules } : {}),
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
