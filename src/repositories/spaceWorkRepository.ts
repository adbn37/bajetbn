import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { requireFirebase } from '../services/firebase';
import type {
  SpaceWorkItem,
  SpaceWorkItemKind,
  SpaceWorkItemStatus,
  SpaceWorkPriority,
  PaymentMethodCode,
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


export async function uploadSpaceWorkItemPhoto(input: {
  spaceId: string;
  itemId: string;
  file: File;
}): Promise<{ photoPath: string }> {
  if (!navigator.onLine) {
    throw new Error(
      'Connect to the internet before adding an item photo.',
    );
  }

  if (!input.file.type.startsWith('image/')) {
    throw new Error('Choose an image for the item photo.');
  }

  if (
    input.file.size <= 0
    || input.file.size >= 5 * 1024 * 1024
  ) {
    throw new Error(
      'Item photo must be smaller than 5 MB.',
    );
  }

  const { auth, functions, storage } = requireFirebase();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      'Your session has ended. Sign in again.',
    );
  }

  const safeName =
    input.file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-100)
    || 'item-photo.jpg';

  const photoId = crypto.randomUUID();

  const storagePath =
    'spaces/'
    + input.spaceId
    + '/work-items/'
    + input.itemId
    + '/'
    + photoId
    + '-'
    + safeName;

  const storageRef = ref(storage, storagePath);

  await uploadBytes(
    storageRef,
    input.file,
    { contentType: input.file.type },
  );

  try {
    const call = httpsCallable<
      {
        spaceId: string;
        itemId: string;
        storagePath: string;
        idempotencyKey: string;
      },
      { photoPath: string }
    >(functions, 'setSpaceWorkItemPhoto');

    const result = await call({
      spaceId: input.spaceId,
      itemId: input.itemId,
      storagePath,
      idempotencyKey: crypto.randomUUID(),
    });

    return {
      photoPath:
        result.data.photoPath || storagePath,
    };
  } catch (error) {
    try {
      await deleteObject(storageRef);
    } catch {
      // Privacy cleanup also catches orphaned Space files.
    }

    throw error;
  }
}

export async function getSpaceWorkItemPhotoUrl(
  photoPath: string,
): Promise<string> {
  const { storage } = requireFirebase();

  return getDownloadURL(ref(storage, photoPath));
}

export async function removeSpaceWorkItemPhoto(input: {
  spaceId: string;
  itemId: string;
}) {
  if (!navigator.onLine) {
    throw new Error(
      'Connect to the internet before removing an item photo.',
    );
  }

  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'removeSpaceWorkItemPhoto',
  );

  return call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function recordSpaceWorkPurchaseExpense(input: {
  spaceId: string;
  itemId: string;
  accountId: string;
  categoryId: string;
  paymentMethod?: PaymentMethodCode;
  paymentMethodLabel?: string;
}): Promise<{ transactionId: string }> {
  if (!navigator.onLine) {
    throw new Error(
      'Connect to the internet before recording this purchase as money activity.',
    );
  }

  const { functions } = requireFirebase();

  const call = httpsCallable<
    typeof input & { idempotencyKey: string },
    { transactionId: string }
  >(
    functions,
    'recordSpaceWorkPurchaseExpense',
  );

  const result = await call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}
