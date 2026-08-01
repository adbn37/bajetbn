import type { Timestamp } from 'firebase/firestore';

export type Language = 'en' | 'ms';
export type Appearance = 'dark' | 'light' | 'system';
export type TextSize = 'normal' | 'large';
export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'custom';
export type SpaceRole = 'owner' | 'admin' | 'contributor' | 'payer' | 'viewer' | 'member';
export type SpaceMemberStatus = 'active' | 'suspended' | 'removed';
export type SpaceApprovalMode = 'none' | 'owner_approval';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type SharedBillStatus = 'unpaid' | 'submitted' | 'partially_paid' | 'paid' | 'rejected' | 'confirmed';
export type SharedBillSettlementMode = 'account' | 'external';
export type SharedBillPaymentStatus = 'submitted' | 'posted' | 'rejected' | 'reversed';
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
  sharedBillAssignmentId?: string | null;
  sharedBillPaymentId?: string | null;
  paymentProofPath?: string | null;
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

export type AccountDeletionRequestStatus = 'pending' | 'cancelled' | 'processing' | 'blocked' | 'failed';

export interface AccountDeletionBlocker {
  code: 'space_ownership' | 'trip_fund_holder';
  message: string;
  spaceId?: string;
  spaceName?: string;
}

export interface AccountDeletionEligibility {
  eligible: boolean;
  blockers: AccountDeletionBlocker[];
  coolingOffDays: number;
  ownedSpaces: number;
  sharedMemberships: number;
  exportPrepared: boolean;
  exportPreparedAt?: string | null;
  exportExpiresAt?: string | null;
}

export interface AccountDeletionRequest {
  uid: string;
  status: AccountDeletionRequestStatus;
  requestedAt?: Timestamp;
  scheduledFor?: Timestamp;
  cancelledAt?: Timestamp | null;
  processingAt?: Timestamp | null;
  blockedAt?: Timestamp | null;
  failedAt?: Timestamp | null;
  updatedAt?: Timestamp;
  blockers?: AccountDeletionBlocker[];
  anonymousId?: string;
  lastError?: string | null;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  language: Language;
  currency: string;
  timezone: string;
  appearance?: Appearance;
  textSize?: TextSize;
  notificationsEnabled?: boolean;
  dueSoonReminders?: boolean;
  lateReminders?: boolean;
  sharedPaymentNotifications?: boolean;
  whatsappRemindersEnabled?: boolean;
  reminderDaysBefore?: number;
  onboardingCompleted: boolean;
  personalSpaceId?: string;
  lastDataExportAt?: Timestamp | null;
  accountDeletionStatus?: AccountDeletionRequestStatus | null;
  accountDeletionScheduledFor?: Timestamp | null;
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
  approvalMode?: SpaceApprovalMode;
  headWhatsapp?: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  uid: string;
  role: SpaceRole;
  status?: SpaceMemberStatus;
  displayName?: string;
  email?: string;
  canUseAccounts: boolean;
  canViewBalances: boolean;
  canViewLedger: boolean;
  invitedBy?: string | null;
  joinedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpaceInvitation {
  id: string;
  displayId: string;
  spaceId: string;
  email: string;
  role: Exclude<SpaceRole, 'owner' | 'member'>;
  canUseAccounts: boolean;
  canViewBalances: boolean;
  canViewLedger: boolean;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName?: string;
  spaceName?: string;
  spaceType?: SpaceType;
  acceptedBy?: string | null;
  declinedBy?: string | null;
  expiresAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SharedBillAssignment {
  id: string;
  displayId: string;
  spaceId: string;
  commitmentId: string;
  commitmentName: string;
  memberUid: string;
  memberName?: string;
  memberEmail?: string;
  assignedMinor: number;
  settledMinor?: number;
  outstandingMinor?: number;
  currency: string;
  dueDate: string;
  status: SharedBillStatus;
  note?: string;
  proofPath?: string | null;
  proofName?: string | null;
  currentPaymentId?: string | null;
  lastPaymentId?: string | null;
  submittedAt?: Timestamp | null;
  reviewedAt?: Timestamp | null;
  reviewedBy?: string | null;
  closedAt?: Timestamp | null;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SharedBillPayment {
  id: string;
  displayId: string;
  assignmentId: string;
  spaceId: string;
  commitmentId: string;
  commitmentPaymentId?: string | null;
  memberUid: string;
  memberName?: string;
  memberEmail?: string;
  amountMinor: number;
  currency: string;
  settlementMode: SharedBillSettlementMode;
  accountId?: string | null;
  paymentDate: string;
  proofPath?: string | null;
  proofName?: string | null;
  note?: string;
  status: SharedBillPaymentStatus;
  transactionId?: string | null;
  ledgerEntryId?: string | null;
  reviewedAt?: Timestamp | null;
  reviewedBy?: string | null;
  postedAt?: Timestamp | null;
  reversedAt?: Timestamp | null;
  reversedBy?: string | null;
  reversalTransactionId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpaceActivity {
  id: string;
  displayId: string;
  spaceId: string;
  actorUid: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  createdAt?: Timestamp;
}

export interface UserNotification {
  id: string;
  uid: string;
  spaceId?: string | null;
  type: string;
  title: string;
  message: string;
  targetPath?: string | null;
  actionLabel?: string | null;
  readAt?: Timestamp | null;
  createdAt?: Timestamp;
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
  closedAt?: Timestamp | null;
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
  closedAt?: Timestamp | null;
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
  sharedCycleDueDate?: string | null;
  sharedAssignedMinor?: number;
  sharedSettledMinor?: number;
  currency: string;
  frequency: CommitmentFrequency;
  startDate: string;
  nextDueDate?: string | null;
  endDate?: string | null;
  reminderDays: number;
  status: CommitmentStatus;
  note?: string;
  archivedAt?: Timestamp | null;
  stoppedAt?: Timestamp | null;
  stoppedPreviousNextDueDate?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CommitmentPayment {
  id: string;
  displayId: string;
  ownerId: string;
  commitmentId: string;
  transactionId?: string | null;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  dueDateApplied?: string | null;
  previousNextDueDate?: string | null;
  previousStatus: CommitmentStatus;
  source?: 'direct' | 'shared_bill';
  sharedBillAssignmentId?: string | null;
  sharedBillPaymentId?: string | null;
  paidByUid?: string | null;
  status: 'posted' | 'reversed';
  reversedBy?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ReminderItemType = 'bill' | 'instalment' | 'goal' | 'shared_bill';
export type ReminderAction = 'marked_reminded' | 'whatsapp_opened';

export interface ReminderHistory {
  id: string;
  uid: string;
  itemType: ReminderItemType;
  itemId: string;
  itemName: string;
  spaceId?: string | null;
  dueDate?: string | null;
  action: ReminderAction;
  message: string;
  phone?: string | null;
  createdAt?: Timestamp;
}

export type SharedExpenseSplitMode = 'equal' | 'custom' | 'percentage';
export type SharedExpenseStatus = 'open' | 'partially_paid' | 'paid';
export type SharedExpenseShareStatus = 'open' | 'partially_paid' | 'paid';
export type SharedExpensePaymentStatus = 'submitted' | 'posted' | 'rejected' | 'reversed';

export interface SharedExpense {
  id: string;
  displayId: string;
  spaceId: string;
  title: string;
  totalMinor: number;
  totalSettledMinor: number;
  amountLeftMinor: number;
  currency: string;
  expenseDate: string;
  paidByUid: string;
  paidByName?: string;
  paidByEmail?: string;
  splitMode: SharedExpenseSplitMode;
  note?: string;
  paidFromTripMoney?: boolean;
  status: SharedExpenseStatus;
  createdBy: string;
  closedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SharedExpenseShare {
  id: string;
  displayId: string;
  expenseId: string;
  spaceId: string;
  memberUid: string;
  memberName?: string;
  memberEmail?: string;
  shareMinor: number;
  settledMinor: number;
  amountLeftMinor: number;
  percentageBasisPoints?: number | null;
  currency: string;
  status: SharedExpenseShareStatus;
  currentPaymentId?: string | null;
  lastPaymentId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SharedExpensePaymentAllocation {
  shareId: string;
  expenseId: string;
  amountMinor: number;
}

export interface SharedExpensePayment {
  id: string;
  displayId: string;
  spaceId: string;
  fromUid: string;
  fromName?: string;
  fromEmail?: string;
  toUid: string;
  toName?: string;
  toEmail?: string;
  expenseId?: string | null;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  proofPath?: string | null;
  proofName?: string | null;
  note?: string;
  status: SharedExpensePaymentStatus;
  allocations?: SharedExpensePaymentAllocation[];
  reviewedAt?: Timestamp | null;
  reviewedBy?: string | null;
  postedAt?: Timestamp | null;
  reversedAt?: Timestamp | null;
  reversedBy?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpaceFund {
  id: string;
  spaceId: string;
  holderUid: string;
  holderName?: string;
  holderEmail?: string;
  budgetMinor: number;
  contributedMinor: number;
  spentMinor: number;
  availableMinor: number;
  currency: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpaceFundContribution {
  id: string;
  displayId: string;
  spaceId: string;
  memberUid: string;
  memberName?: string;
  memberEmail?: string;
  amountMinor: number;
  currency: string;
  contributionDate: string;
  note?: string;
  status: 'posted' | 'reversed';
  reversedAt?: Timestamp | null;
  reversedBy?: string | null;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
