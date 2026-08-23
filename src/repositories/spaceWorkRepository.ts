import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  SpaceWorkItem,
  SpaceWorkItemKind,
  SpaceWorkItemStatus,
  SpaceWorkPriority,
} from '../types/models';

export async function listSpaceWorkItems(
  spaceId: string,
): Promise<SpaceWorkItem[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(
    query(
      collection(db, 'spaceWorkItems'),
      where('spaceId', '==', spaceId),
    ),
  );

  return snapshot.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as SpaceWorkItem,
    )
    .filter((item) => !item.archivedAt);
}

export async function saveSpaceWorkItem(input: {
  spaceId: string;
  itemId?: string;
  kind: SpaceWorkItemKind;
  title: string;

  brand?: string;
  model?: string;
  size?: string;
  unit?: string;
  quantity?: number;

  targetPriceMinor?: number;
  preferredPlace?: string;

  assigneeUid?: string;
  priority?: SpaceWorkPriority;
  dueDate?: string;
  note?: string;
}) {
  const { functions } = requireFirebase();

  const result = await httpsCallable<
    typeof input & { idempotencyKey: string },
    { itemId: string }
  >(functions, 'saveSpaceWorkItem')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function setSpaceWorkItemStatus(input: {
  spaceId: string;
  itemId: string;
  status: Extract<SpaceWorkItemStatus, 'open' | 'completed'>;
}) {
  const { functions } = requireFirebase();

  const result = await httpsCallable<
    typeof input & { idempotencyKey: string },
    { itemId: string; status: SpaceWorkItemStatus }
  >(functions, 'setSpaceWorkItemStatus')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function markSpaceWorkItemBought(input: {
  spaceId: string;
  itemId: string;
  actualPriceMinor: number;
  actualPlace: string;
  purchasedOn: string;
}) {
  const { functions } = requireFirebase();

  const result = await httpsCallable<
    typeof input & { idempotencyKey: string },
    { itemId: string; status: 'bought' }
  >(functions, 'markSpaceWorkItemBought')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function reopenSpaceWorkItem(input: {
  spaceId: string;
  itemId: string;
}) {
  return setSpaceWorkItemStatus({
    ...input,
    status: 'open',
  });
}

export async function archiveSpaceWorkItem(input: {
  spaceId: string;
  itemId: string;
}) {
  const { functions } = requireFirebase();

  return httpsCallable(
    functions,
    'archiveSpaceWorkItem',
  )({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}
