import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  SmePosAccess,
  SmePosMode,
  SmePosRole,
  SmePosSettings,
  SmePosStatus,
  SmePosUsageCounts,
} from '../types/models';

export async function getSmePosSettings(spaceId: string): Promise<SmePosSettings | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'smePosSettings', spaceId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as SmePosSettings) : null;
}

export async function getMySmePosAccess(spaceId: string, uid: string): Promise<SmePosAccess | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'smePosAccess', `${spaceId}_${uid}`));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as SmePosAccess) : null;
}

export async function listSmePosAccess(spaceId: string): Promise<SmePosAccess[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'smePosAccess'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SmePosAccess)
    .filter((item) => item.status === 'active')
    .sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid));
}

export async function getSmePosUsageCounts(spaceId: string): Promise<SmePosUsageCounts> {
  const { db } = requireFirebase();
  const collectionNames = [
    ['products', 'smePosProducts'],
    ['customers', 'smePosCustomers'],
    ['sellers', 'smePosSellers'],
    ['listings', 'smePosListings'],
    ['sales', 'smePosSales'],
  ] as const;

  const values = await Promise.all(collectionNames.map(async ([key, collectionName]) => {
    const result = await getCountFromServer(query(collection(db, collectionName), where('spaceId', '==', spaceId)));
    return [key, result.data().count] as const;
  }));

  return Object.fromEntries(values) as unknown as SmePosUsageCounts;
}

export async function saveSmePosSetup(input: {
  spaceId: string;
  mode: SmePosMode;
  shopName: string;
  receiptName: string;
  receiptFooter?: string;
  defaultPaymentAccountId?: string | null;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'saveSmePosSetup');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function setSmePosStatus(spaceId: string, status: Exclude<SmePosStatus, 'draft'>) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setSmePosStatus');
  return call({ spaceId, status, idempotencyKey: crypto.randomUUID() });
}

export async function setSmePosAccessRole(input: {
  spaceId: string;
  memberUid: string;
  role: Exclude<SmePosRole, 'owner'>;
  active: boolean;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setSmePosAccessRole');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}
