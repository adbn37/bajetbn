import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { Budget, BudgetPeriodType } from '../types/models';

export async function listAllBudgets(uid: string): Promise<Budget[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'budgets'), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Budget)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function createBudget(input: {
  name: string;
  spaceId: string;
  categoryId?: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  limitMinor: number;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'createBudget');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateBudget(input: {
  budgetId: string;
  name: string;
  categoryId?: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  limitMinor: number;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'updateBudget')(input);
}

export async function archiveBudget(budgetId: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'archiveBudget')({ budgetId, idempotencyKey: crypto.randomUUID() });
}

export async function listBudgets(uid: string): Promise<Budget[]> {
  return (await listAllBudgets(uid)).filter((item) => !item.archivedAt);
}
