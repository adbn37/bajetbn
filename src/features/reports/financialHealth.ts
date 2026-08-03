import type { Account, Budget, Commitment, FinancialTransaction, SavingsGoal } from '../../types/models';

export type FinancialHealthTone = 'good' | 'watch' | 'attention' | 'neutral';

export interface FinancialHealthIndicator {
  id: 'savings_rate' | 'budget_pressure' | 'commitment_load' | 'emergency_fund';
  label: string;
  value: string;
  detail: string;
  tone: FinancialHealthTone;
  progress?: number | null;
}

export interface SpendingTrend {
  id: string;
  label: string;
  currentMinor: number;
  previousMinor: number;
  differenceMinor: number;
  direction: 'up' | 'down' | 'same';
}

export interface FinancialHealthResult {
  indicators: FinancialHealthIndicator[];
  nextSteps: string[];
  categoryTrends: SpendingTrend[];
  savingsRate: number | null;
  budgetPressure: number | null;
  commitmentLoad: number | null;
  emergencyProgress: number | null;
  monthlyCommitmentMinor: number;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}


export function sumAccountBalances(accounts: Account[]): number {
  return accounts.reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);
}

export function monthlyEquivalent(amountMinor: number, frequency: Commitment['frequency']): number {
  if (frequency === 'weekly') return Math.round((amountMinor * 52) / 12);
  if (frequency === 'quarterly') return Math.round(amountMinor / 3);
  if (frequency === 'yearly') return Math.round(amountMinor / 12);
  if (frequency === 'monthly') return amountMinor;
  return 0;
}

export function findEmergencyGoal(goals: SavingsGoal[]) {
  const emergencyWords = /emergency|rainy day|kecemasan|darurat/i;
  return goals.find((item) => item.status === 'active' && !item.archivedAt && emergencyWords.test(item.name)) || null;
}

function groupSpending(transactions: FinancialTransaction[]) {
  const grouped = new Map<string, { label: string; amountMinor: number }>();
  transactions.filter((item) => item.status === 'posted' && item.type === 'expense').forEach((item) => {
    const key = item.categoryId || `name:${(item.category || 'Other').toLowerCase()}`;
    const current = grouped.get(key) || { label: item.category || 'Other', amountMinor: 0 };
    current.amountMinor += item.amountMinor;
    grouped.set(key, current);
  });
  return grouped;
}

export function buildCategoryTrends(current: FinancialTransaction[], previous: FinancialTransaction[]): SpendingTrend[] {
  const currentGrouped = groupSpending(current);
  const previousGrouped = groupSpending(previous);
  const keys = new Set([...currentGrouped.keys(), ...previousGrouped.keys()]);
  return [...keys].map((id) => {
    const currentRow = currentGrouped.get(id);
    const previousRow = previousGrouped.get(id);
    const currentMinor = currentRow?.amountMinor || 0;
    const previousMinor = previousRow?.amountMinor || 0;
    const differenceMinor = currentMinor - previousMinor;
    return {
      id,
      label: currentRow?.label || previousRow?.label || 'Other',
      currentMinor,
      previousMinor,
      differenceMinor,
      direction: differenceMinor > 0 ? 'up' : differenceMinor < 0 ? 'down' : 'same',
    } satisfies SpendingTrend;
  }).filter((item) => item.currentMinor > 0 || item.previousMinor > 0)
    .sort((a, b) => Math.abs(b.differenceMinor) - Math.abs(a.differenceMinor));
}

export function buildFinancialHealth(input: {
  moneyIn: number;
  moneyOut: number;
  budgets: Array<Budget & { reportSpentMinor?: number }>;
  commitments: Commitment[];
  goals: SavingsGoal[];
  currentTransactions: FinancialTransaction[];
  previousTransactions: FinancialTransaction[];
  formatAmount: (amountMinor: number) => string;
}): FinancialHealthResult {
  const moneyLeft = input.moneyIn - input.moneyOut;
  const savingsRate = input.moneyIn > 0 ? Math.round((moneyLeft / input.moneyIn) * 100) : null;
  const budgetLimit = input.budgets.reduce((sum, item) => sum + Math.max(0, item.limitMinor), 0);
  const budgetSpent = input.budgets.reduce((sum, item) => sum + Math.max(0, item.reportSpentMinor ?? item.spentMinor ?? 0), 0);
  const budgetPressure = budgetLimit > 0 ? Math.round((budgetSpent / budgetLimit) * 100) : null;
  const monthlyCommitmentMinor = input.commitments
    .filter((item) => item.status === 'active' && !item.archivedAt && !item.stoppedAt)
    .reduce((sum, item) => sum + monthlyEquivalent(item.amountMinor, item.frequency), 0);
  const commitmentLoad = input.moneyIn > 0 ? Math.round((monthlyCommitmentMinor / input.moneyIn) * 100) : null;
  const emergencyGoal = findEmergencyGoal(input.goals);
  const emergencyProgress = emergencyGoal?.targetMinor
    ? clampPercent((emergencyGoal.currentMinor / emergencyGoal.targetMinor) * 100)
    : null;

  const indicators: FinancialHealthIndicator[] = [
    {
      id: 'savings_rate',
      label: 'Savings rate',
      value: savingsRate === null ? 'Not ready' : `${savingsRate}%`,
      detail: savingsRate === null
        ? 'Add income for this month to calculate it.'
        : savingsRate < 0
          ? 'Spending is higher than money received.'
          : 'The share of income left after spending.',
      tone: savingsRate === null ? 'neutral' : savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'watch' : 'attention',
      progress: savingsRate === null ? null : clampPercent(savingsRate),
    },
    {
      id: 'budget_pressure',
      label: 'Budget pressure',
      value: budgetPressure === null ? 'No budget' : `${budgetPressure}%`,
      detail: budgetPressure === null
        ? 'Add a budget to compare planned and actual spending.'
        : budgetPressure > 100
          ? 'Spending is above the shown budget limit.'
          : 'How much of the shown budget has been used.',
      tone: budgetPressure === null ? 'neutral' : budgetPressure <= 75 ? 'good' : budgetPressure <= 100 ? 'watch' : 'attention',
      progress: budgetPressure === null ? null : clampPercent(budgetPressure),
    },
    {
      id: 'commitment_load',
      label: 'Regular payment load',
      value: commitmentLoad === null ? 'Not ready' : `${commitmentLoad}%`,
      detail: commitmentLoad === null
        ? 'Add monthly income to compare it with regular bills.'
        : `${input.formatAmount(monthlyCommitmentMinor)} estimated each month.`,
      tone: commitmentLoad === null ? 'neutral' : commitmentLoad <= 30 ? 'good' : commitmentLoad <= 50 ? 'watch' : 'attention',
      progress: commitmentLoad === null ? null : clampPercent(commitmentLoad),
    },
    {
      id: 'emergency_fund',
      label: 'Emergency fund',
      value: emergencyProgress === null ? 'Not set' : `${emergencyProgress}%`,
      detail: emergencyGoal
        ? `${input.formatAmount(Math.max(0, emergencyGoal.targetMinor - emergencyGoal.currentMinor))} still needed for ${emergencyGoal.name}.`
        : 'Create a savings goal with “Emergency” or “Darurat” in its name.',
      tone: emergencyProgress === null ? 'neutral' : emergencyProgress >= 100 ? 'good' : emergencyProgress >= 50 ? 'watch' : 'attention',
      progress: emergencyProgress,
    },
  ];

  const categoryTrends = buildCategoryTrends(input.currentTransactions, input.previousTransactions);
  const largestIncrease = categoryTrends.find((item) => item.differenceMinor > 0);
  const nextSteps: string[] = [];
  if (input.moneyIn === 0 && input.moneyOut > 0) nextSteps.push('Add your income for this month so the health check is more accurate.');
  if (moneyLeft < 0) nextSteps.push(`Spending is ${input.formatAmount(Math.abs(moneyLeft))} higher than money received. Review the largest expense first.`);
  else if (savingsRate !== null && savingsRate < 10) nextSteps.push('Try keeping a small fixed amount after every payday, even if it starts small.');
  if (budgetPressure !== null && budgetPressure > 100) nextSteps.push('One or more budgets are over the planned amount. Check whether the limit or spending plan needs changing.');
  else if (budgetPressure !== null && budgetPressure >= 80) nextSteps.push('Your shown budgets are nearly full. Check the remaining amount before spending more.');
  if (commitmentLoad !== null && commitmentLoad > 50) nextSteps.push('Regular bills use more than half of this month’s income. Review optional or negotiable payments.');
  if (!emergencyGoal) nextSteps.push('Add an Emergency fund savings goal so BajetBN can track your safety buffer.');
  else if (emergencyProgress !== null && emergencyProgress < 100) nextSteps.push('Keep adding to the emergency goal gradually until the target is reached.');
  if (largestIncrease && largestIncrease.previousMinor > 0 && largestIncrease.differenceMinor >= Math.max(1000, Math.round(largestIncrease.previousMinor * 0.2))) {
    nextSteps.push(`${largestIncrease.label} increased by ${input.formatAmount(largestIncrease.differenceMinor)} from the previous month.`);
  }
  if (!nextSteps.length) nextSteps.push('Your shown money activity is steady. Keep recording transactions so the trend stays useful.');

  return {
    indicators,
    nextSteps: nextSteps.slice(0, 4),
    categoryTrends: categoryTrends.slice(0, 6),
    savingsRate,
    budgetPressure,
    commitmentLoad,
    emergencyProgress,
    monthlyCommitmentMinor,
  };
}
