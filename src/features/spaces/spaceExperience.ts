import type { Space, SpaceMember, SpaceRole } from '../../types/models';

export const SPACE_TERMS = {
  contribution: 'Contribution',
  fund: 'Fund',
  budget: 'Budget',
  expense: 'Expense',
  settlement: 'Settlement',
  task: 'Task',
  booking: 'Booking',
  payout: 'Payout',
} as const;

export type SpaceHomeAction =
  | 'expense'
  | 'income'
  | 'fund'
  | 'expenses'
  | 'balances'
  | 'bills';

export interface SpaceHomeExperience {
  primary: SpaceHomeAction;
  label: string;
  detail: string;
  heading: string;
  context: string;
  roleLabel: string;
  accessSummary: string;
}

function getSharedRoleLabel(role: SpaceRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Manager';
    case 'contributor':
      return 'Contributor';
    case 'payer':
      return 'Record payments';
    case 'viewer':
      return 'View only';
    default:
      return 'Member';
  }
}

function getSharedAccessSummary(role: SpaceRole): string {
  switch (role) {
    case 'owner':
      return 'Manage shared money, members and Space settings.';
    case 'admin':
      return 'Manage day-to-day shared money and member activity.';
    case 'contributor':
      return 'Add shared money records and expenses, then review what is open.';
    case 'payer':
      return 'Review bills, record payments and follow Settlements.';
    case 'viewer':
      return 'Review shared activity and Settlements without managing records.';
    default:
      return 'Use the shared tools available to you and follow current activity.';
  }
}

export function getSpaceHomeExperience(
  space: Space,
  currentMember: SpaceMember | null,
): SpaceHomeExperience {
  if (space.type === 'personal') {
    return {
      primary: 'expense',
      label: 'Add expense',
      detail: 'Record money out in this Space',
      heading: 'Manage your money here',
      context: 'Record daily money activity first, then use the smaller tools when you need to plan or review.',
      roleLabel: 'Personal',
      accessSummary: 'Record money, plan ahead and review your own activity.',
    };
  }

  const role: SpaceRole =
    currentMember?.uid === space.ownerId
      ? 'owner'
      : currentMember?.role || 'member';

  if (role === 'viewer') {
    return {
      primary: 'balances',
      label: 'Review settlements',
      detail: 'See what is still owed between members',
      heading: 'Review this Space',
      context: 'Your access is focused on understanding what is happening rather than managing shared records.',
      roleLabel: getSharedRoleLabel(role),
      accessSummary: getSharedAccessSummary(role),
    };
  }

  if (role === 'payer') {
    return {
      primary: 'bills',
      label: 'Record payment',
      detail: 'Open shared bills and handle what needs paying',
      heading: 'Handle payments here',
      context: 'Start with bills and payments. The other Space tools remain nearby when you need more context.',
      roleLabel: getSharedRoleLabel(role),
      accessSummary: getSharedAccessSummary(role),
    };
  }

  const heading = role === 'owner'
    ? 'Lead this Space'
    : role === 'admin'
      ? 'Manage this Space'
      : role === 'contributor'
        ? 'Keep shared money moving'
        : 'Use this Space together';

  return {
    primary: 'expenses',
    label: 'Add shared expense',
    detail: 'Record who paid and split the amount',
    heading,
    context: 'Start with the recommended shared action. Planning, payments and review tools stay grouped underneath.',
    roleLabel: getSharedRoleLabel(role),
    accessSummary: getSharedAccessSummary(role),
  };
}