import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { CategoryKind, CategoryScope, TransactionCategory } from '../types/models';

export async function listCustomCategories(uid: string): Promise<TransactionCategory[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'categories'), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as TransactionCategory)
    .filter((item) => !item.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCategory(input: {
  name: string;
  kind: CategoryKind;
  scope: CategoryScope;
  icon: string;
  color: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'createCategory');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateCategory(input: {
  categoryId: string;
  name: string;
  kind: CategoryKind;
  scope: CategoryScope;
  icon: string;
  color: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'updateCategory');
  return call(input);
}

export async function archiveCategory(categoryId: string) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'archiveCategory');
  return call({ categoryId, idempotencyKey: crypto.randomUUID() });
}
