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
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { requireFirebase } from '../services/firebase';
import type {
  CollectionItem,
  CollectionItemCondition,
  CollectionItemPhoto,
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
  primaryBarcode: string;
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
  const barcodes = uniqueBarcodes(input.barcodes, input.internalCode);
  const requestedPrimary = input.primaryBarcode.trim();
  return {
    name: input.name.trim(),
    category: input.category.trim() || 'Other',
    brand: input.brand.trim(),
    series: input.series.trim(),
    variant: input.variant.trim(),
    condition: input.condition,
    conditionNote: input.conditionNote.trim(),
    barcodes,
    primaryBarcode: barcodes.includes(requestedPrimary) ? requestedPrimary : input.internalCode,
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
    photos: [],
    primaryPhotoId: null,
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
    primaryBarcode: cleaned.primaryBarcode,
    storageLocation: cleaned.storageLocation,
    purchasePriceMinor: cleaned.purchasePriceMinor,
    estimatedValueMinor: cleaned.estimatedValueMinor,
    notes: cleaned.notes,
    tags: cleaned.tags,
    updatedAt: serverTimestamp(),
  });
}

export async function getCollectionItemPhotoUrl(storagePath: string) {
  const { storage } = requireFirebase();
  return getDownloadURL(ref(storage, storagePath));
}

export async function uploadCollectionItemPhoto(input: {
  spaceId: string;
  itemId: string;
  file: File;
  width: number;
  height: number;
}): Promise<CollectionItemPhoto> {
  if (!input.file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (input.file.size <= 0 || input.file.size >= 5 * 1024 * 1024) throw new Error('The prepared photo must be smaller than 5 MB.');
  const { db, storage } = requireFirebase();
  const photoId = createClientDisplayId('CPH');
  const storagePath = `spaces/${input.spaceId}/collection-items/${input.itemId}/${photoId}.jpg`;
  const storageRef = ref(storage, storagePath);
  const photo: CollectionItemPhoto = {
    id: photoId,
    storagePath,
    fileName: input.file.name.slice(0, 180),
    contentType: input.file.type,
    sizeBytes: input.file.size,
    width: Math.max(1, Math.trunc(input.width)),
    height: Math.max(1, Math.trunc(input.height)),
  };

  await uploadBytes(storageRef, input.file, { contentType: input.file.type });
  try {
    await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, 'collectionItems', input.itemId);
      const snapshot = await transaction.get(itemRef);
      if (!snapshot.exists() || snapshot.data().spaceId !== input.spaceId) throw new Error('Collection item not found.');
      const photos = Array.isArray(snapshot.data().photos) ? snapshot.data().photos as CollectionItemPhoto[] : [];
      if (photos.length >= 6) throw new Error('A collection item can have up to six photos.');
      transaction.update(itemRef, {
        photos: [...photos, photo],
        primaryPhotoId: snapshot.data().primaryPhotoId || photo.id,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    try { await deleteObject(storageRef); } catch { /* Best-effort rollback of an unlinked upload. */ }
    throw error;
  }
  return photo;
}

export async function setPrimaryCollectionItemPhoto(input: { spaceId: string; itemId: string; photoId: string }) {
  const { db } = requireFirebase();
  const itemRef = doc(db, 'collectionItems', input.itemId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists() || snapshot.data().spaceId !== input.spaceId) throw new Error('Collection item not found.');
    const photos = Array.isArray(snapshot.data().photos) ? snapshot.data().photos as CollectionItemPhoto[] : [];
    if (!photos.some((photo) => photo.id === input.photoId)) throw new Error('Photo not found.');
    transaction.update(itemRef, { primaryPhotoId: input.photoId, updatedAt: serverTimestamp() });
  });
}

export async function removeCollectionItemPhoto(input: { spaceId: string; itemId: string; photoId: string }) {
  const { db, storage } = requireFirebase();
  const itemRef = doc(db, 'collectionItems', input.itemId);
  let storagePath = '';
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists() || snapshot.data().spaceId !== input.spaceId) throw new Error('Collection item not found.');
    const photos = Array.isArray(snapshot.data().photos) ? snapshot.data().photos as CollectionItemPhoto[] : [];
    const photo = photos.find((value) => value.id === input.photoId);
    if (!photo) throw new Error('Photo not found.');
    storagePath = photo.storagePath;
    const remaining = photos.filter((value) => value.id !== input.photoId);
    transaction.update(itemRef, {
      photos: remaining,
      primaryPhotoId: snapshot.data().primaryPhotoId === input.photoId ? remaining[0]?.id || null : snapshot.data().primaryPhotoId || null,
      updatedAt: serverTimestamp(),
    });
  });
  if (storagePath) {
    try { await deleteObject(ref(storage, storagePath)); }
    catch (error) { console.warn('[BajetBN collection] Photo metadata was removed, but Storage cleanup will need retrying.', error); }
  }
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
