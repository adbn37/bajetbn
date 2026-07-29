import type { Timestamp } from 'firebase/firestore';

export type Language = 'en' | 'ms';
export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'custom';
export type SpaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type CollaborationMode = 'private' | 'owner_managed' | 'collaborative';
export type AccountType = 'bank' | 'cash' | 'e_wallet' | 'credit_card';
export type AccountClassification = 'personal' | 'business';

export type FinancialTransactionType = 'income' | 'expense' | 'transfer' | 'reversal';
export type FinancialTransactionStatus = 'posted' | 'reversed';

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
  counterparty?: string;
  note?: string;
  transactionDate: string;
  reversalOf?: string | null;
  reversedBy?: string | null;
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
