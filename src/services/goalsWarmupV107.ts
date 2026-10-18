/**
 * Single-use short-lived prefetch of owner-scoped Goals data.
 * Never persists records, never shares cached data between users, and never posts data.
 * After consumption, Goal writes/reloads always request fresh records.
 */
import type { GoalContribution, SavingsGoal, Space } from '../types/models';
import { listAllGoals, listGoalContributions } from '../repositories/goalRepository';
import { listSpaces } from '../repositories/spaceRepository';

export type GoalBundleV107 = {
  goals: SavingsGoal[];
  spaces: Space[];
  contributions: GoalContribution[];
};

type Entry = { ownerId: string; startedAt: number; promise: Promise<GoalBundleV107> };
let entry: Entry | null = null;
const MAX_AGE_MS = 4000;

export function warmGoalsV107(ownerId: string): void {
  if (!ownerId) return;
  if (entry && entry.ownerId === ownerId && Date.now() - entry.startedAt < MAX_AGE_MS) return;
  const target: Entry = {
    ownerId,
    startedAt: Date.now(),
    promise: Promise.all([
      listAllGoals(ownerId),
      listSpaces(ownerId),
      listGoalContributions(ownerId),
    ]).then(([goals, spaces, contributions]) => ({ goals, spaces, contributions })),
  };
  entry = target;
  // Handle early rejection even if the user never visits Goals.
  void target.promise.catch(() => { if (entry === target) entry = null; });
}

export function consumeWarmedGoalsV107(ownerId: string): Promise<GoalBundleV107> | null {
  const match = entry;
  entry = null;
  if (!match || match.ownerId !== ownerId || Date.now() - match.startedAt >= MAX_AGE_MS) return null;
  return match.promise;
}
