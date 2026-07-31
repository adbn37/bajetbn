import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';

export type LifecycleAction = 'archive' | 'restore' | 'delete' | 'close' | 'stop';
export interface LifecycleResult {
  id: string;
  action: LifecycleAction;
  deleted?: boolean;
  archived?: boolean;
  restored?: boolean;
  closed?: boolean;
  stopped?: boolean;
}

async function run(functionName: string, idField: string, id: string, action: LifecycleAction) {
  const { functions } = requireFirebase();
  const callable = httpsCallable<Record<string, unknown>, LifecycleResult>(functions, functionName);
  const result = await callable({ [idField]: id, action, idempotencyKey: crypto.randomUUID() });
  return result.data;
}

export const manageSpace = (spaceId: string, action: Extract<LifecycleAction, 'archive' | 'restore' | 'delete'>) =>
  run('manageSpaceLifecycle', 'spaceId', spaceId, action);
export const manageAccount = (accountId: string, action: Extract<LifecycleAction, 'close' | 'restore' | 'delete'>) =>
  run('manageAccountLifecycle', 'accountId', accountId, action);
export const manageBudget = (budgetId: string, action: Extract<LifecycleAction, 'archive' | 'restore' | 'delete'>) =>
  run('manageBudgetLifecycle', 'budgetId', budgetId, action);
export const manageGoal = (goalId: string, action: Extract<LifecycleAction, 'archive' | 'restore' | 'delete' | 'close'>) =>
  run('manageGoalLifecycle', 'goalId', goalId, action);
export const manageCommitment = (commitmentId: string, action: Extract<LifecycleAction, 'stop' | 'restore' | 'delete'>) =>
  run('manageCommitmentLifecycle', 'commitmentId', commitmentId, action);
export const manageCategory = (categoryId: string, action: Extract<LifecycleAction, 'archive' | 'restore' | 'delete'>) =>
  run('manageCategoryLifecycle', 'categoryId', categoryId, action);
