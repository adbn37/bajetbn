import type { Space, SpaceMember } from '../../types/models';

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
  context: string;
}

export function getSpaceHomeExperience(
  space: Space,
  currentMember: SpaceMember | null,
): SpaceHomeExperience {
  if (space.type === 'personal') {
    return {
      primary: 'expense',
      label: `Add ${SPACE_TERMS.expense.toLowerCase()}`,
      detail: 'Record money going out from this Space.',
      context: 'Record your next money movement here. Other tools stay available below.',
    };
  }

  const role = currentMember?.role || 'viewer';

  if (role === 'viewer') {
    return {
      primary: 'balances',
      label: `Review ${SPACE_TERMS.settlement.toLowerCase()}s`,
      detail: 'See what is still owed or already settled.',
      context: 'Your access is view-only, so the most useful next step is reviewing this Space.',
    };
  }

  if (role === 'payer') {
    return {
      primary: 'bills',
      label: 'Record payment',
      detail: 'Open shared bills and update the payment assigned to you.',
      context: 'Keep your assigned payments up to date. Other Space tools remain available below.',
    };
  }

  return {
    primary: 'expenses',
    label: `Add ${SPACE_TERMS.expense.toLowerCase()}`,
    detail: 'Record and split shared spending in this Space.',
    context: 'Record shared spending here so expenses and settlements stay connected in one Space.',
  };
}