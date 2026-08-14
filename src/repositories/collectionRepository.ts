import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type {
  CollectionItem,
  CollectionItemCondition,
  CollectionQuantityMovement,
  CollectionQuantityReason,
} from '../types/models';
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

export async function getCollectionItem(spaceId: string, itemId: string): Promise<CollectionItem | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'collectionItems', itemId));
  if (!snapshot.exists() || snapshot.data().spaceId !== spaceId) return null;
  return { id: snapshot.id, ...snapshot.data() } as CollectionItem;
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

export async function listCollectionQuantityMovements(spaceId: string, itemId: string): Promise<CollectionQuantityMovement[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(
    collection(db, 'collectionItemMovements'),
    where('spaceId', '==', spaceId),
    where('itemId', '==', itemId),
    orderBy('createdAt', 'desc'),
    limit(100),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CollectionQuantityMovement);
}

export async function createCollectionItem(input: {
  spaceId: string;
  ownerId: string;
  createdBy: string;
  currency: string;
  item: CollectionItemInput;
}): Promise<string> {
  const { db } = requireFirebase();
  const itemRef = doc(collection(db, 'collectionItems'));
  const movementRef = doc(collection(db, 'collectionItemMovements'));
  const internalCode = input.item.internalCode.trim();
  const cleaned = cleanedInput({ ...input.item, internalCode });
  const batch = writeBatch(db);
  batch.set(itemRef, {
    displayId: createClientDisplayId('CIT'),
    spaceId: input.spaceId,
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    internalCode,
    currency: input.currency,
    ...cleaned,
    lastMovementId: movementRef.id,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(movementRef, {
    displayId: createClientDisplayId('CMV'),
    spaceId: input.spaceId,
    ownerId: input.ownerId,
    itemId: itemRef.id,
    itemName: cleaned.name,
    createdBy: input.createdBy,
    reason: 'initial',
    note: 'Opening collection quantity',
    delta: cleaned.quantity,
    previousQuantity: 0,
    nextQuantity: cleaned.quantity,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return itemRef.id;
}

export async function updateCollectionItem(itemId: string, input: CollectionItemInput) {
  const { db } = requireFirebase();
  const cleaned = cleanedInput(input);
  await updateDoc(doc(db, 'collectionItems', itemId), {
    name: cleaned.name,
    category: cleaned.category,
    brand: cleaned.brand,
    series: cleaned.series,
    variant: cleaned.variant,
    condition: cleaned.condition,
    conditionNote: cleaned.conditionNote,
    barcodes: cleaned.barcodes,
    storageLocation: cleaned.storageLocation,
    purchasePriceMinor: cleaned.purchasePriceMinor,
    estimatedValueMinor: cleaned.estimatedValueMinor,
    notes: cleaned.notes,
    tags: cleaned.tags,
    updatedAt: serverTimestamp(),
  });
}

export async function adjustCollectionItemQuantity(input: {
  spaceId: string;
  itemId: string;
  createdBy: string;
  delta: number;
  reason: CollectionQuantityReason;
  note?: string;
}) {
  const delta = Math.trunc(input.delta);
  if (!Number.isSafeInteger(delta) || delta === 0) throw new Error('Quantity adjustment must be a non-zero whole number.');
  const { db } = requireFirebase();
  const itemRef = doc(db, 'collectionItems', input.itemId);
  const movementRef = doc(collection(db, 'collectionItemMovements'));
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists() || snapshot.data().spaceId !== input.spaceId) throw new Error('Collection item not found.');
    if (snapshot.data().archivedAt) throw new Error('Restore this item before changing its quantity.');
    const previousQuantity = Number(snapshot.data().quantity || 0);
    const nextQuantity = previousQuantity + delta;
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 0 || nextQuantity > 1000000) {
      throw new Error('The adjustment would create an invalid collection quantity.');
    }
    transaction.update(itemRef, {
      quantity: nextQuantity,
      lastMovementId: movementRef.id,
      updatedAt: serverTimestamp(),
    });
    transaction.set(movementRef, {
      displayId: createClientDisplayId('CMV'),
      spaceId: input.spaceId,
      ownerId: String(snapshot.data().ownerId || ''),
      itemId: input.itemId,
      itemName: String(snapshot.data().name || 'Collection item'),
      createdBy: input.createdBy,
      reason: input.reason,
      note: String(input.note || '').trim().slice(0, 500),
      delta,
      previousQuantity,
      nextQuantity,
      createdAt: serverTimestamp(),
    });
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
