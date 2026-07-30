import type { Timestamp } from 'firebase/firestore';

export type Language = 'en' | 'ms';
export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'custom';
export type SpaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type CollaborationMode = 'private' | 'owner_managed' | 'collaborative';
export type AccountType = 'bank' | 'cash' | 'e_wallet' | 'credit_card';
export type AccountClassification = 'personal' | 'business';

export type FinancialTransactionType = 'income' | 'expense' | 'transfer' | 'reversal';
export type FinancialTransactionStatus = 'posted' | 'reversed';
export type CategoryKind = 'income' | 'expense';
export type CategoryScope = 'personal' | 'business' | 'both';

export interface TransactionCategory {
  id: string;
  ownerId: string | null;
  name: string;
  kind: CategoryKind;
  scope: CategoryScope;
  icon: string;
  color: string;
  isSystem: boolean;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FinancialTransaction {
  id: string;
  displayId: string;
  ownerId: string;
  createdBy: string;
  type: FinancialTransactionType;
  originalType?: Exclude<FinancialTransactionType, 'reversal'>;
  status: FinancialTransactionStatus;
  spaceId: string;
  accountId: string;
  destinationAccountId?: string | null;
  amountMinor: number;
  currency: string;
  category: string;
  categoryId?: string;
  categoryIcon?: string;
  categoryColor?: string;
  categoryScope?: CategoryScope;
  counterparty?: string;
  note?: string;
  transactionDate: string;
  reversalOf?: string | null;
  reversedBy?: string | null;
  budgetIds?: string[];
  commitmentId?: string | null;
  commitmentPaymentId?: string | null;
  createdAt?: Timestamp;
  postedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LedgerEntry {
  id: string;
  displayId: string;
  accountId: string;
  ownerId: string;
  spaceId?: string | null;
  transactionId?: string | null;
  entryType: string;
  amountMinor: number;
  currency: string;
  direction: 'debit' | 'credit';
  status: 'posted';
  postedAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  language: Language;
  currency: string;
  timezone: string;
  onboardingCompleted: boolean;
  personalSpaceId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Space {
  id: string;
  displayId: string;
  name: string;
  type: SpaceType;
  ownerId: string;
  collaborationMode: CollaborationMode;
  currency: string;
  timezone: string;
  description?: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  uid: string;
  role: SpaceRole;
  canUseAccounts: boolean;
  canViewBalances: boolean;
  canViewLedger: boolean;
}

export interface Account {
  id: string;
  displayId: string;
  ownerId: string;
  name: string;
  institution?: string;
  type: AccountType;
  classification: AccountClassification;
  currency: string;
  openingBalanceMinor: number;
  ledgerBalanceMinor: number;
  balanceVersion: number;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AccountAccess {
  id: string;
  accountId: string;
  uid: string;
  canUseAccount: boolean;
  canViewBalance: boolean;
  canViewLedger: boolean;
}

export type BudgetPeriodType = 'monthly' | 'custom';
export interface Budget {
  id: string;
  displayId: string;
  ownerId: string;
  name: string;
  spaceId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  limitMinor: number;
  spentMinor: number;
  currency: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type GoalStatus = 'active' | 'completed';
export interface SavingsGoal {
  id: string;
  displayId: string;
  ownerId: string;
  name: string;
  spaceId: string;
  targetMinor: number;
  currentMinor: number;
  currency: string;
  targetDate?: string | null;
  status: GoalStatus;
  note?: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface GoalContribution {
  id: string;
  displayId: string;
  ownerId: string;
  goalId: string;
  amountMinor: number;
  currency: string;
  contributionDate: string;
  note?: string;
  status: 'posted' | 'reversed';
  reversalOf?: string | null;
  reversedBy?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type CommitmentType = 'bill' | 'instalment';
export type CommitmentFrequency = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type CommitmentStatus = 'active' | 'completed';
export interface Commitment {
  id: string;
  displayId: string;
  ownerId: string;
  type: CommitmentType;
  name: string;
  payee?: string;
  spaceId: string;
  accountId?: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amountMinor: number;
  totalAmountMinor?: number | null;
  amountPaidMinor: number;
  currency: string;
  frequency: CommitmentFrequency;
  startDate: string;
  nextDueDate?: string | null;
  endDate?: string | null;
  reminderDays: number;
  status: CommitmentStatus;
  note?: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CommitmentPayment {
  id: string;
  displayId: string;
  ownerId: string;
  commitmentId: string;
  transactionId: string;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  dueDateApplied?: string | null;
  previousNextDueDate?: string | null;
  previousStatus: CommitmentStatus;
  status: 'posted' | 'reversed';
  reversedBy?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
