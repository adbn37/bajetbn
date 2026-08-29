import type { Timestamp } from 'firebase/firestore';

export type Language = 'en' | 'ms';
export type Appearance =
  | 'system'
  | 'black'
  | 'light'
  | 'pink-white'
  | 'black-pink'
  | 'midnight-teal'
  | 'navy-blue'
  | 'forest-green'
  | 'royal-purple'
  | 'sand-cream'
  | 'slate-grey'
  | 'ocean-blue'
  | 'high-contrast'
  | 'dark'; // Legacy value: treated as Black.
export type TextSize = 'normal' | 'large';

export type BajetBnPlan = 'basic' | 'plus';

export type SubscriptionStatus =
  | 'basic'
  | 'active'
  | 'expired'
  | 'cancelled';

export type PlatformRole =
  | 'user'
  | 'platform_admin';
export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'collection' | 'vehicle' | 'property' | 'project' | 'event' | 'asset' | 'custom';
export type CustomSpaceModule =
  | 'budgets'
  | 'goals'
  | 'bills'
  | 'reports'
  | 'calendar'
  | 'group_fund';

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
export type InstitutionCode = 'bibd' | 'baiduri' | 'taib' | 'standard_chartered_brunei' | 'cash' | 'other_e_wallet' | 'other';
export type PaymentMethodCode = 'bank_transfer' | 'cash' | 'debit_card' | 'credit_card' | 'e_wallet' | 'qr_payment' | 'bank_deposit' | 'cheque' | 'other';

export type SmePosMode = 'standard' | 'marketplace_consignment';
export type SmePosStatus = 'draft' | 'active' | 'paused';
export type SmePosRole = 'owner' | 'manager' | 'cashier' | 'stock_staff' | 'seller' | 'viewer';
export type SmePosCommissionType = 'percentage' | 'fixed_per_item';
export type SmePosListingCondition = 'new' | 'sealed' | 'open_box' | 'used' | 'other';
export type SmePosStockSource = 'catalog' | 'existing_stock';
export type SmePosReservationStatus = 'reserved' | 'partially_paid' | 'paid' | 'completed' | 'cancelled';

export interface SmePosSettings {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  mode: SmePosMode;
  status: SmePosStatus;
  shopName: string;
  receiptName: string;
  receiptFooter?: string;
  defaultPaymentAccountId?: string | null;
  paymentAccountIds?: string[];
  currency: string;
  timezone: string;
  setupVersion: number;
  activatedAt?: Timestamp | null;
  pausedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosAccess {
  id: string;
  spaceId: string;
  uid: string;
  role: SmePosRole;
  status: 'active' | 'removed';
  displayName?: string;
  email?: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosProduct {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  name: string;
  category?: string;
  sku?: string;
  barcode?: string;
  photoPath?: string | null;
  note?: string;
  condition?: SmePosListingCondition;
  conditionNote?: string;
  sellingPriceMinor: number;
  costPriceMinor?: number | null;
  currency: string;
  trackStock: boolean;
  quantityOnHand: number;
  reservedQuantity?: number;
  lowStockLevel: number;
  soldQuantity?: number;
  salesRevenueMinor?: number;
  stockSource?: SmePosStockSource;
  registeredBy?: string;
  registeredAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosSeller {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
  linkedUid?: string | null;
  inventoryManagementEnabled?: boolean;
  defaultCommissionType: SmePosCommissionType;
  defaultCommissionRateBps: number;
  defaultCommissionMinor: number;
  grossSalesMinor: number;
  commissionEarnedMinor: number;
  balanceMinor: number;
  paidOutMinor: number;
  soldQuantity: number;
  currency: string;
  archivedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosListing {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  sellerId: string;
  sellerName: string;
  sellerUid?: string | null;
  name: string;
  category?: string;
  sku?: string;
  barcode?: string;
  photoPath?: string | null;
  note?: string;
  condition: SmePosListingCondition;
  conditionNote?: string;
  sellingPriceMinor: number;
  currency: string;
  commissionType: SmePosCommissionType;
  commissionRateBps: number;
  commissionMinor: number;
  quantityOnHand: number;
  reservedQuantity?: number;
  lowStockLevel: number;
  soldQuantity: number;
  grossSalesMinor: number;
  commissionEarnedMinor: number;
  sellerEarningsMinor: number;
  stockSource?: SmePosStockSource;
  registeredBy?: string;
  registeredAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
  sellerDeletedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosSellerLedgerEntry {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  sellerId: string;
  sellerName: string;
  sellerUid?: string | null;
  kind: 'sale_earning' | 'payout' | 'return_adjustment' | 'void_adjustment';
  amountMinor: number;
  balanceAfterMinor: number;
  currency: string;
  saleId?: string | null;
  receiptNumber?: string | null;
  payoutId?: string | null;
  note?: string;
  createdAt?: Timestamp;
}

export interface SmePosReturnItem {
  productId: string;
  listingId?: string;
  productName: string;
  sellerId?: string;
  sellerName?: string;
  quantity: number;
  refundMinor: number;
  commissionReversedMinor?: number;
  sellerEarningReversedMinor?: number;
}

export interface SmePosReturn {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  saleId: string;
  receiptNumber: string;
  sourceMode: SmePosMode;
  status: 'posted';
  items: SmePosReturnItem[];
  itemCount: number;
  refundMinor: number;
  commissionReversedMinor: number;
  sellerEarningReversedMinor: number;
  paymentAccountId: string;
  paymentAccountName: string;
  currency: string;
  returnDate: string;
  reason?: string;
  transactionId: string;
  ledgerEntryId: string;
  payments?: SmePosRefundPayment[];
  transactionIds?: string[];
  ledgerEntryIds?: string[];
  createdBy: string;
  createdAt?: Timestamp;
}

export interface SmePosPayoutPayment {
  accountId: string;
  accountName: string;
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  amountMinor: number;
  transactionId: string;
  ledgerEntryId: string;
}

export interface SmePosPayout {
  id: string;
  displayId: string;
  spaceId: string;
  spaceName?: string;
  ownerId: string;
  sellerId: string;
  sellerName: string;
  sellerUid?: string | null;
  status: 'posted';
  amountMinor: number;
  balanceAfterMinor: number;
  currency: string;
  paymentAccountId: string;
  paymentAccountName: string;
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  paymentSourceLabel?: string | null;
  paymentSourceLabels?: string[];
  payments?: SmePosPayoutPayment[];
  payoutDate: string;
  reference?: string;
  note?: string;
  transactionId: string;
  ledgerEntryId: string;
  transactionIds?: string[];
  ledgerEntryIds?: string[];
  createdBy: string;
  createdByName?: string;
  createdAt?: Timestamp;
}

export interface SmePosCustomer {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
  totalSpentMinor?: number;
  visitCount?: number;
  lastSaleAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosPaymentAccount {
  id: string;
  name: string;
  currency: string;
  type: AccountType;
}

export interface SmePosSalePayment {
  accountId: string;
  accountName: string;
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  amountMinor: number;
  returnedMinor: number;
  transactionId: string;
  ledgerEntryId: string;
}

export interface SmePosRefundPayment {
  accountId: string;
  accountName: string;
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  amountMinor: number;
  transactionId: string;
  ledgerEntryId: string;
}

export interface SmePosReservationItem {
  itemId: string;
  productName: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinor: number;
  lineTotalMinor: number;
  sellerId?: string;
  sellerName?: string;
  sellerUid?: string | null;
  condition?: SmePosListingCondition;
  commissionType?: SmePosCommissionType;
  commissionRateBps?: number;
  commissionMinor?: number;
}

export interface SmePosReservation {
  id: string;
  displayId: string;
  reservationNumber: string;
  spaceId: string;
  ownerId: string;
  createdBy: string;
  createdByName?: string;
  sourceMode: SmePosMode;
  status: SmePosReservationStatus;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: SmePosReservationItem[];
  itemCount: number;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  depositMinor: number;
  remainingMinor: number;
  payments: SmePosSalePayment[];
  currency: string;
  reservationDate: string;
  dueDate?: string | null;
  note?: string;
  saleId?: string | null;
  receiptNumber?: string | null;
  completedAt?: Timestamp | null;
  cancelledAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosSaleItem {
  productId: string;
  productName: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinor: number;
  lineTotalMinor: number;
  lineCostMinor: number;
  returnedQuantity: number;
  quickAdd?: boolean;
  returnedMinor?: number;
  commissionReturnedMinor?: number;
  sellerEarningReturnedMinor?: number;
  listingId?: string;
  sellerId?: string;
  sellerName?: string;
  sellerUid?: string | null;
  condition?: SmePosListingCondition;
  discountShareMinor?: number;
  netLineMinor?: number;
  commissionMinor?: number;
  sellerEarningMinor?: number;
}

export type SmePosSaleStatus = 'completed' | 'partially_returned' | 'refunded' | 'voided';
export type SmePosReturnStatus = 'not_returned' | 'partial' | 'full';

export interface SmePosSale {
  id: string;
  displayId: string;
  receiptNumber: string;
  spaceId: string;
  ownerId: string;
  createdBy: string;
  status: SmePosSaleStatus;
  returnStatus: SmePosReturnStatus;
  sourceMode: SmePosMode;
  customerId?: string | null;
  customerName?: string | null;
  paymentAccountId: string;
  paymentAccountName: string;
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  payments?: SmePosSalePayment[];
  items: SmePosSaleItem[];
  itemCount: number;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  costMinor: number;
  profitMinor: number;
  marketplaceCommissionMinor?: number;
  sellerEarningsMinor?: number;
  sellerCount?: number;
  returnedMinor: number;
  returnIds?: string[];
  lastReturnDate?: string | null;
  currency: string;
  saleDate: string;
  note?: string;
  transactionId: string;
  ledgerEntryId: string;
  transactionIds?: string[];
  ledgerEntryIds?: string[];
  reservationId?: string | null;
  voidedAt?: Timestamp | null;
  voidedBy?: string | null;
  voidDate?: string | null;
  voidReason?: string | null;
  voidedMinor?: number;
  voidPayments?: SmePosRefundPayment[];
  voidTransactionIds?: string[];
  voidLedgerEntryIds?: string[];
  receiptName: string;
  receiptFooter?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmePosUsageCounts {
  products: number;
  customers: number;
  sellers: number;
  listings: number;
  sales: number;
}

export type BusinessIndustry =
  | 'general'
  | 'retail'
  | 'service'
  | 'marketplace'
  | 'rental'
  | 'transport_delivery'
  | 'other';

export type BusinessContactKind =
  | 'customer'
  | 'vendor'
  | 'both';

export interface BusinessProfile {
  id: string;
  spaceId: string;
  ownerId: string;
  businessName: string;
  industry: BusinessIndustry;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  fiscalYearStartMonth: number;
  invoicePrefix: string;
  taxEnabled: boolean;
  taxName: string;
  taxRateBps: number;
  taxRegistrationNumber: string;
  payrollEnabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BusinessContact {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  kind: BusinessContactKind;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type FinancialTransactionType = 'income' | 'expense' | 'transfer' | 'reversal';
export type FinancialTransactionStatus = 'posted' | 'reversed';
export type RecurringTransactionType = 'income' | 'expense';
export type RecurringTransactionFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringTransactionStatus = 'active' | 'paused' | 'needs_attention' | 'stopped' | 'completed';
export type RecurringTransactionRunStatus = 'posted' | 'skipped' | 'failed';
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
  labels?: string[];
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  transactionDate: string;
  reversalOf?: string | null;
  reversedBy?: string | null;
  budgetIds?: string[];
  commitmentId?: string | null;
  commitmentPaymentId?: string | null;
  spaceWorkItemId?: string | null;
  sharedBillAssignmentId?: string | null;
  sharedBillPaymentId?: string | null;
  paymentProofPath?: string | null;
  recurringTemplateId?: string | null;
  recurringRunId?: string | null;
  recurringScheduledDate?: string | null;
  createdAt?: Timestamp;
  postedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TransactionAttachment {
  id: string;
  ownerId: string;
  transactionId: string;
  spaceId: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt?: Timestamp;
}

export interface RecurringTransactionTemplate {
  id: string;
  displayId: string;
  ownerId: string;
  name: string;
  type: RecurringTransactionType;
  spaceId: string;
  accountId: string;
  amountMinor: number;
  currency: string;
  categoryId: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  categoryScope: CategoryScope;
  counterparty?: string;
  note?: string;
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  frequency: RecurringTransactionFrequency;
  startDate: string;
  nextRunDate?: string | null;
  endDate?: string | null;
  preferredDay: number;
  preferMonthEnd: boolean;
  timezone: string;
  status: RecurringTransactionStatus;
  generatedCount: number;
  skippedCount: number;
  lastRunDate?: string | null;
  lastTransactionId?: string | null;
  lastError?: string | null;
  pausedAt?: Timestamp | null;
  stoppedAt?: Timestamp | null;
  stoppedPreviousNextRunDate?: string | null;
  completedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RecurringTransactionRun {
  id: string;
  ownerId: string;
  templateId: string;
  scheduledDate: string;
  status: RecurringTransactionRunStatus;
  transactionId?: string | null;
  error?: string | null;
  createdAt?: Timestamp;
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

export interface SpaceAutomationPreference {
  enabled: boolean;
  contributionReminder: boolean;
  contributionDueDate?: string | null;
  budgetThresholdAlert: boolean;
  budgetThresholdPercent: number;
  lowFundAlert: boolean;
  lowFundThresholdMinor: number;
  overdueBillAlert: boolean;
  overdueTaskAlert: boolean;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  sellerPayoutAlert: boolean;
  sellerPayoutThresholdMinor: number;
}

export type SpaceAutomationPreferenceMap =
  Record<string, SpaceAutomationPreference>;

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;

  platformRole?: PlatformRole;
  subscriptionPlan?: BajetBnPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStartedAt?: Timestamp | null;
  subscriptionExpiresAt?: Timestamp | null;
  subscriptionSource?:
    | 'whatsapp_manual'
    | 'complimentary'
    | 'internal'
    | null;
  language: Language;
  currency: string;
  timezone: string;
  appearance?: Appearance;
  textSize?: TextSize;
  notificationsEnabled?: boolean;
  backgroundRemindersEnabled?: boolean;
  dueSoonReminders?: boolean;
  lateReminders?: boolean;
  goalReminders?: boolean;
  sharedPaymentNotifications?: boolean;
  whatsappRemindersEnabled?: boolean;
  browserPushEnabled?: boolean;
  reminderDaysBefore?: number;
  spaceAutomationV1?: SpaceAutomationPreferenceMap;
  onboardingCompleted: boolean;
  personalSpaceId?: string;
  lastDataExportAt?: Timestamp | null;
  accountDeletionStatus?: AccountDeletionRequestStatus | null;
  accountDeletionScheduledFor?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type CollectionItemCondition = 'new' | 'sealed' | 'open_box' | 'used' | 'damaged' | 'other';
export type CollectionQuantityReason = 'initial' | 'acquired' | 'sold' | 'gifted' | 'lost' | 'damaged' | 'correction' | 'other';

export interface CollectionItemPhoto {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export interface CollectionItem {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  createdBy: string;
  name: string;
  category: string;
  brand: string;
  series: string;
  variant: string;
  condition: CollectionItemCondition;
  conditionNote: string;
  barcodes: string[];
  primaryBarcode?: string;
  internalCode: string;
  photos?: CollectionItemPhoto[];
  primaryPhotoId?: string | null;
  quantity: number;
  storageLocation: string;
  purchasePriceMinor: number | null;
  estimatedValueMinor: number | null;
  currency: string;
  notes: string;
  tags: string[];
  lastMovementId?: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CollectionQuantityMovement {
  id: string;
  displayId: string;
  spaceId: string;
  ownerId: string;
  itemId: string;
  itemName: string;
  createdBy: string;
  reason: CollectionQuantityReason;
  note: string;
  delta: number;
  previousQuantity: number;
  nextQuantity: number;
  createdAt?: Timestamp;
}

export type DebtDirection = 'owe' | 'owed';
export type DebtStatus = 'active' | 'settled' | 'archived';
export type DebtInterestType = 'none' | 'fixed' | 'percentage';
export type DebtSchedule = 'none' | 'weekly' | 'monthly' | 'custom';

export interface DebtRecord {
  id: string;
  displayId: string;
  ownerId: string;
  direction: DebtDirection;
  counterparty: string;
  description?: string | null;
  principalMinor: number;
  interestType: DebtInterestType;
  interestRateBps: number;
  interestMinor: number;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  currency: string;
  startDate: string;
  dueDate?: string | null;
  schedule: DebtSchedule;
  scheduleNote?: string | null;
  reminderEnabled: boolean;
  spaceId?: string | null;
  status: DebtStatus;
  settledAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DebtPayment {
  id: string;
  displayId: string;
  ownerId: string;
  debtId: string;
  direction: DebtDirection;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  accountId?: string | null;
  accountName?: string | null;
  transactionId?: string | null;
  ledgerEntryId?: string | null;
  proofPath?: string | null;
  proofFileName?: string | null;
  proofContentType?: string | null;
  proofSizeBytes?: number | null;
  note?: string | null;
  reversedAt?: Timestamp | null;
  reversedBy?: string | null;
  reversalReason?: string | null;
  reversalTransactionId?: string | null;
  reversalLedgerEntryId?: string | null;
  createdAt?: Timestamp;
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
  avatarPath?: string | null;
  customModules?: CustomSpaceModule[];
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

export interface SpacePresence {
  id: string;
  spaceId: string;
  uid: string;
  activeAt?: Timestamp;
  expiresAt?: Timestamp;
  typingUntil?: Timestamp | null;
}

export type TripItineraryCategory =
  | 'flight'
  | 'hotel'
  | 'transport'
  | 'activity'
  | 'food'
  | 'other';

export type TripTaskStatus = 'open' | 'completed';

export type TripBookingType =
  | 'flight'
  | 'hotel'
  | 'transport'
  | 'activity'
  | 'event'
  | 'other';

export interface TripItineraryItem {
  id: string;
  displayId: string;
  spaceId: string;
  title: string;
  category: TripItineraryCategory;
  date: string;
  time?: string | null;
  location?: string | null;
  reference?: string | null;
  note?: string | null;
  createdBy: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TripTask {
  id: string;
  displayId: string;
  spaceId: string;
  title: string;
  assigneeUid?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  dueDate?: string | null;
  status: TripTaskStatus;
  note?: string | null;
  createdBy: string;
  completedBy?: string | null;
  completedAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type SpaceWorkItemKind = 'task' | 'buy';

export type SpaceWorkItemStatus =
  | 'open'
  | 'completed'
  | 'bought';

export type SpaceWorkPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

export interface SpaceWorkItem {
  id: string;
  displayId: string;
  spaceId: string;
  spaceType: 'household' | 'sme';
  kind: SpaceWorkItemKind;
  title: string;

  brand?: string | null;
  model?: string | null;
  size?: string | null;
  unit?: string | null;
  quantity: number;

  targetPriceMinor?: number | null;
  preferredPlace?: string | null;

  assigneeUid?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;

  priority: SpaceWorkPriority;
  dueDate?: string | null;
  note?: string | null;

  status: SpaceWorkItemStatus;

  actualPriceMinor?: number | null;
  actualPlace?: string | null;
  purchasedOn?: string | null;

  photoPath?: string | null;
  linkedTransactionId?: string | null;

  createdBy: string;
  completedBy?: string | null;
  completedAt?: Timestamp | null;

  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TripBooking {
  id: string;
  displayId: string;
  spaceId: string;
  title: string;
  bookingType: TripBookingType;
  provider?: string | null;
  reference?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  note?: string | null;
  createdBy: string;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
export interface SpaceInvitation {
  id: string;
  displayId: string;
  spaceId: string;
  email?: string | null;
  role: Exclude<SpaceRole, 'owner' | 'member'>;
  canUseAccounts: boolean;
  canViewBalances: boolean;
  canViewLedger: boolean;
  posRole?: Exclude<SmePosRole, 'owner'> | null;
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
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
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

export interface SpaceAnnouncement {
  id: string;
  displayId: string;
  spaceId: string;
  title: string;
  body: string;
  createdBy: string;
  createdByName?: string;
  pinnedAt?: Timestamp | null;
  expiresOn?: string | null;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpacePollOption {
  id: string;
  label: string;
}

export type SpacePollStatus = 'open' | 'closed';

export interface SpacePoll {
  id: string;
  displayId: string;
  spaceId: string;
  question: string;
  options: SpacePollOption[];
  status: SpacePollStatus;
  createdBy: string;
  createdByName?: string;
  closedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SpacePollVote {
  id: string;
  spaceId: string;
  pollId: string;
  uid: string;
  optionId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type SpaceApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type SpaceApprovalTargetType =
  | 'expense'
  | 'contribution_adjustment'
  | 'booking'
  | 'household_purchase'
  | 'sme_purchase'
  | 'sme_payout'
  | 'custom_action'
  | 'other';

export interface SpaceApproval {
  id: string;
  displayId: string;
  spaceId: string;
  title: string;
  requestNote?: string;
  targetType: SpaceApprovalTargetType;
  targetId?: string | null;
  targetPath?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  status: SpaceApprovalStatus;
  requestedBy: string;
  requestedByName?: string;
  requestedAt?: Timestamp;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: Timestamp | null;
  decisionNote?: string;
  cancelledAt?: Timestamp | null;
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
  source?: 'activity' | 'background_reminder';
  itemType?: ReminderItemType | null;
  itemId?: string | null;
  dueDate?: string | null;
  reminderKey?: string | null;
  pushAttemptedAt?: Timestamp | null;
  pushSentAt?: Timestamp | null;
  pushFailureCount?: number;
  readAt?: Timestamp | null;
  createdAt?: Timestamp;
}


export interface Account {
  id: string;
  displayId: string;
  ownerId: string;
  name: string;
  institution?: string;
  institutionCode?: InstitutionCode | null;
  type: AccountType;
  classification: AccountClassification;
  spaceId?: string | null;
  posEnabled?: boolean;
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
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
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
  stoppedPreviousNextRunDate?: string | null;
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
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
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

export type ReminderItemType = 'bill' | 'instalment' | 'goal' | 'shared_bill' | 'recurring_transaction';
export type ReminderAction = 'marked_reminded' | 'whatsapp_opened' | 'background_generated' | 'browser_push_sent';

export interface PushDevice {
  id: string;
  uid: string;
  token: string;
  userAgent?: string | null;
  platform?: string | null;
  active: boolean;
  createdAt?: Timestamp;
  lastSeenAt?: Timestamp;
  removedAt?: Timestamp | null;
}

export interface BackgroundReminderCheckResult {
  checked: number;
  created: number;
  pushSent: number;
  duplicates: number;
  today: string;
}

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
  paidFromGroupFund?: boolean;
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
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
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

export type SpaceFundKind = 'trip' | 'household' | 'group';

export interface SpaceFund {
  id: string;
  spaceId: string;
  kind?: SpaceFundKind;
  label?: string;
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
  paymentMethod?: PaymentMethodCode | null;
  paymentMethodLabel?: string | null;
  note?: string;
  status: 'posted' | 'reversed';
  reversedAt?: Timestamp | null;
  reversedBy?: string | null;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
export type SpaceChatRecordType =
  | 'expense'
  | 'shared_bill'
  | 'commitment'
  | 'trip_task'
  | 'booking'
  | 'budget'
  | 'payout'
  | 'collection_item'
  | 'approval';

export interface SpaceChatRecordRef {
  type: SpaceChatRecordType;
  id: string;
  label: string;
  targetPath: string;
}

export interface SpaceMessageReply {
  messageId: string;
  bodyPreview: string;
}

export interface SpaceMessage {
  id: string;
  spaceId: string;
  senderUid: string;
  body: string;
  mentionLabels?: string[];
  recordRef?: SpaceChatRecordRef | null;
  replyTo?: SpaceMessageReply | null;
  storagePath?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
