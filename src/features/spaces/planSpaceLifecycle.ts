import {
  listAllGoals,
  listGoalContributions,
} from '../../repositories/goalRepository';
import {
  manageGoal,
  manageSpace,
} from '../../repositories/lifecycleRepository';

export async function deleteUnusedPlanSpace(
  uid: string,
  spaceId: string,
) {
  const [
    allGoals,
    allContributions,
  ] = await Promise.all([
    listAllGoals(uid),
    listGoalContributions(uid),
  ]);

  const planGoals =
    allGoals.filter(
      (item) =>
        item.spaceId === spaceId,
    );

  const planGoalIds =
    new Set(
      planGoals.map(
        (item) =>
          item.id,
      ),
    );

  const hasSavedProgress =
    planGoals.some(
      (item) =>
        Number(
          item.currentMinor
          || 0,
        ) !== 0,
    )
    || allContributions.some(
      (item) =>
        planGoalIds.has(
          item.goalId,
        ),
    );

  if (hasSavedProgress) {
    throw new Error(
      'This Plan has saved contribution history. Archive it instead.',
    );
  }

  for (const goal of planGoals) {
    await manageGoal(
      goal.id,
      'delete',
    );
  }

  await manageSpace(
    spaceId,
    'delete',
  );
}
