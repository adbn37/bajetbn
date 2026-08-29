import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { GoalContribution, SavingsGoal } from '../types/models';

export async function listAllGoals(uid: string): Promise<SavingsGoal[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'goals'), where('ownerId', '==', uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SavingsGoal)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listGoalsForOwnerSpace(
  uid: string,
  spaceId: string,
): Promise<SavingsGoal[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(query(
    collection(db, 'goals'),
    where('ownerId', '==', uid),
    where('spaceId', '==', spaceId),
  ));

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SavingsGoal)
    .filter((item) => !item.archivedAt && !item.closedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listGoalContributions(uid: string): Promise<GoalContribution[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'goalContributions'), where('ownerId', '==', uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as GoalContribution)
    .sort((a, b) => b.contributionDate.localeCompare(a.contributionDate));
}

export async function createGoal(input: { name: string; spaceId: string; targetMinor: number; targetDate?: string; note?: string }) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'createGoal')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateGoal(input: { goalId: string; name: string; targetMinor: number; targetDate?: string; note?: string }) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'updateGoal')(input);
}

export async function archiveGoal(goalId: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'archiveGoal')({ goalId, idempotencyKey: crypto.randomUUID() });
}

export async function recordGoalContribution(input: { goalId: string; amountMinor: number; contributionDate: string; note?: string }) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'recordGoalContribution')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function reverseGoalContribution(contributionId: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'reverseGoalContribution')({ contributionId, idempotencyKey: crypto.randomUUID() });
}

export async function listGoals(uid: string): Promise<SavingsGoal[]> {
  return (await listAllGoals(uid)).filter((item) => !item.archivedAt && !item.closedAt);
}
