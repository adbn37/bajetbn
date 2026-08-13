import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { CollectionItem, CollectionItemCondition } from '../types/models';
import { createClientDisplayId } from '../utils/ids';

export interface CollectionItemInput {
  name: string;
  category: string;
  brand: string;
  series: string;
  variant: string;
  condition: CollectionItemCondition;
  conditionNote: string;
  barcodes: string[];
  internalCode: string;
  quantity: number;
  storageLocation: string;
  purchasePriceMinor: number | null;
  estimatedValueMinor: number | null;
  notes: string;
  tags: string[];
}

function byUpdatedAt(items: CollectionItem[]) {
  return items.sort((a, b) => (
    b.updatedAt?.toMillis?.()
    || b.createdAt?.toMillis?.()
    || 0
  ) - (
    a.updatedAt?.toMillis?.()
    || a.createdAt?.toMillis?.()
    || 0
  ));
}

function uniqueBarcodes(values: string[], internalCode: string) {
  return [...new Set([...values, internalCode].map((value) => value.trim()).filter(Boolean))].slice(0, 20);
}

function cleanedInput(input: CollectionItemInput) {
  return {
    name: input.name.trim(),
    category: input.category.trim() || 'Other',
    brand: input.brand.trim(),
    series: input.series.trim(),
    variant: input.variant.trim(),
    condition: input.condition,
    conditionNote: input.conditionNote.trim(),
    barcodes: uniqueBarcodes(input.barcodes, input.internalCode),
    quantity: Math.max(0, Math.trunc(input.quantity)),
    storageLocation: input.storageLocation.trim(),
    purchasePriceMinor: input.purchasePriceMinor,
    estimatedValueMinor: input.estimatedValueMinor,
    notes: input.notes.trim(),
    tags: [...new Set(input.tags.map((value) => value.trim()).filter(Boolean))].slice(0, 20),
  };
}

export function createCollectionInternalCode() {
  return createClientDisplayId('COL');
}

export async function listCollectionItems(spaceId: string, includeArchived = false): Promise<CollectionItem[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'collectionItems'), where('spaceId', '==', spaceId)));
  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CollectionItem);
  return byUpdatedAt(items.filter((item) => includeArchived || !item.archivedAt));
}

export async function findCollectionItemByBarcode(spaceId: string, barcode: string): Promise<CollectionItem | null> {
  const { db } = requireFirebase();
  const value = barcode.trim();
  if (!value) return null;
  const snapshot = await getDocs(query(
    collection(db, 'collectionItems'),
    where('spaceId', '==', spaceId),
    where('barcodes', 'array-contains', value),
    limit(1),
  ));
  const match = snapshot.docs[0];
  return match ? ({ id: match.id, ...match.data() } as CollectionItem) : null;
}

export async function createCollectionItem(input: {
  spaceId: string;
  ownerId: string;
  createdBy: string;
  currency: string;
  item: CollectionItemInput;
}): Promise<string> {
  const { db } = requireFirebase();
  const ref = doc(collection(db, 'collectionItems'));
  const internalCode = input.item.internalCode.trim();
  await setDoc(ref, {
    displayId: createClientDisplayId('CIT'),
    spaceId: input.spaceId,
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    internalCode,
    currency: input.currency,
    ...cleanedInput({ ...input.item, internalCode }),
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCollectionItem(itemId: string, input: CollectionItemInput) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'collectionItems', itemId), {
    ...cleanedInput(input),
    updatedAt: serverTimestamp(),
  });
}

export async function addCollectionItemQuantity(itemId: string, amount = 1) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'collectionItems', itemId), {
    quantity: increment(Math.max(1, Math.trunc(amount))),
    updatedAt: serverTimestamp(),
  });
}

export async function archiveCollectionItem(itemId: string) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'collectionItems', itemId), {
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreCollectionItem(itemId: string) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'collectionItems', itemId), {
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}
