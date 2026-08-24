import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldPath, FieldValue, getFirestore, Timestamp, type DocumentData, type DocumentReference, type Query, type QueryDocumentSnapshot, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createHash, randomBytes } from 'node:crypto';

initializeApp();
const db = getFirestore();
const region = 'asia-southeast1';

const accountTypes = ['bank', 'cash', 'e_wallet', 'credit_card'] as const;
const institutionCodes = ['bibd', 'baiduri', 'taib', 'standard_chartered_brunei', 'cash', 'other_e_wallet', 'other'] as const;
const paymentMethodCodes = ['bank_transfer', 'cash', 'debit_card', 'credit_card', 'e_wallet', 'qr_payment', 'bank_deposit', 'cheque', 'other'] as const;
const transactionTypes = ['income', 'expense', 'transfer'] as const;
const categoryKinds = ['income', 'expense'] as const;
const categoryScopes = ['personal', 'business', 'both'] as const;
const categoryIcons = ['wallet', 'briefcase', 'gift', 'shop', 'laptop', 'home', 'food', 'cart', 'fuel', 'car', 'bus', 'bill', 'phone', 'school', 'health', 'family', 'heart', 'bag', 'game', 'repeat', 'tools', 'staff', 'building', 'bank', 'plane', 'dots'] as const;
const categoryColors = ['teal', 'blue', 'violet', 'amber', 'rose', 'green', 'slate'] as const;
const budgetPeriodTypes = ['monthly', 'custom'] as const;
const commitmentTypes = ['bill', 'instalment'] as const;
const commitmentFrequencies = ['once', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
const recurringTransactionTypes = ['income', 'expense'] as const;
const recurringTransactionFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
const recurringTransactionStatuses = ['active', 'paused', 'needs_attention', 'stopped', 'completed'] as const;
const recurringTransactionActions = ['pause', 'resume', 'skip', 'stop', 'restart', 'delete'] as const;
const appearanceOptions = [
  'system', 'black', 'light', 'pink-white', 'black-pink',
  'midnight-teal', 'navy-blue', 'forest-green', 'royal-purple',
  'sand-cream', 'slate-grey', 'ocean-blue', 'high-contrast', 'dark',
] as const;
const smePosModes = ['standard', 'marketplace_consignment'] as const;
const smePosStatuses = ['active', 'paused'] as const;
const smePosRoles = ['manager', 'cashier', 'stock_staff', 'seller', 'viewer'] as const;
const smePosCommissionTypes = ['percentage', 'fixed_per_item'] as const;
const smePosListingConditions = ['new', 'sealed', 'open_box', 'used', 'other'] as const;
type SmePosActorRole = 'owner' | (typeof smePosRoles)[number];
type AccountType = (typeof accountTypes)[number];
type InstitutionCode = (typeof institutionCodes)[number];
type PaymentMethodCode = (typeof paymentMethodCodes)[number];
type PostedTransactionType = (typeof transactionTypes)[number];
type CategoryKind = (typeof categoryKinds)[number];
type CategoryScope = (typeof categoryScopes)[number];
type CommitmentFrequency = (typeof commitmentFrequencies)[number];
type RecurringTransactionType = (typeof recurringTransactionTypes)[number];
type RecurringTransactionFrequency = (typeof recurringTransactionFrequencies)[number];
type RecurringTransactionStatus = (typeof recurringTransactionStatuses)[number];

budgetPeriodTypes
commitmentTypes

interface CategorySnapshot {
  id: string;
  name: string;
  kind: CategoryKind;
  scope: CategoryScope;
  icon: string;
  color: string;
  isSystem: boolean;
}

const systemCategoryList: CategorySnapshot[] = [
  { id: 'income-salary', name: 'Salary', kind: 'income', scope: 'personal', icon: 'wallet', color: 'teal', isSystem: true },
  { id: 'income-allowance', name: 'Allowance', kind: 'income', scope: 'personal', icon: 'gift', color: 'blue', isSystem: true },
  { id: 'income-bonus', name: 'Bonus', kind: 'income', scope: 'personal', icon: 'gift', color: 'violet', isSystem: true },
  { id: 'income-freelance', name: 'Freelance', kind: 'income', scope: 'both', icon: 'laptop', color: 'blue', isSystem: true },
  { id: 'income-rental', name: 'Rental income', kind: 'income', scope: 'both', icon: 'home', color: 'green', isSystem: true },
  { id: 'income-sales', name: 'Sales', kind: 'income', scope: 'business', icon: 'shop', color: 'teal', isSystem: true },
  { id: 'income-service', name: 'Service income', kind: 'income', scope: 'business', icon: 'briefcase', color: 'green', isSystem: true },
  { id: 'income-other', name: 'Other income', kind: 'income', scope: 'both', icon: 'dots', color: 'slate', isSystem: true },
  { id: 'expense-food', name: 'Food & drinks', kind: 'expense', scope: 'personal', icon: 'food', color: 'amber', isSystem: true },
  { id: 'expense-groceries', name: 'Groceries', kind: 'expense', scope: 'personal', icon: 'cart', color: 'green', isSystem: true },
  { id: 'expense-fuel', name: 'Fuel', kind: 'expense', scope: 'both', icon: 'fuel', color: 'rose', isSystem: true },
  { id: 'expense-vehicle', name: 'Vehicle', kind: 'expense', scope: 'both', icon: 'car', color: 'blue', isSystem: true },
  { id: 'expense-transport', name: 'Public transport', kind: 'expense', scope: 'personal', icon: 'bus', color: 'blue', isSystem: true },
  { id: 'expense-utilities', name: 'Utilities', kind: 'expense', scope: 'both', icon: 'bill', color: 'amber', isSystem: true },
  { id: 'expense-phone', name: 'Phone & internet', kind: 'expense', scope: 'both', icon: 'phone', color: 'violet', isSystem: true },
  { id: 'expense-rent', name: 'Rent & housing', kind: 'expense', scope: 'both', icon: 'home', color: 'rose', isSystem: true },
  { id: 'expense-education', name: 'Education', kind: 'expense', scope: 'personal', icon: 'school', color: 'blue', isSystem: true },
  { id: 'expense-health', name: 'Health', kind: 'expense', scope: 'personal', icon: 'health', color: 'green', isSystem: true },
  { id: 'expense-family', name: 'Family', kind: 'expense', scope: 'personal', icon: 'family', color: 'violet', isSystem: true },
  { id: 'expense-charity', name: 'Zakat & charity', kind: 'expense', scope: 'personal', icon: 'heart', color: 'green', isSystem: true },
  { id: 'expense-shopping', name: 'Shopping', kind: 'expense', scope: 'personal', icon: 'bag', color: 'rose', isSystem: true },
  { id: 'expense-entertainment', name: 'Entertainment', kind: 'expense', scope: 'personal', icon: 'game', color: 'violet', isSystem: true },
  { id: 'expense-subscriptions', name: 'Subscriptions', kind: 'expense', scope: 'both', icon: 'repeat', color: 'slate', isSystem: true },
  { id: 'expense-supplies', name: 'Business supplies', kind: 'expense', scope: 'business', icon: 'tools', color: 'amber', isSystem: true },
  { id: 'expense-supplier', name: 'Supplier purchase', kind: 'expense', scope: 'business', icon: 'cart', color: 'rose', isSystem: true },
  { id: 'expense-wages', name: 'Staff wages', kind: 'expense', scope: 'business', icon: 'staff', color: 'teal', isSystem: true },
  { id: 'expense-government', name: 'Government fees', kind: 'expense', scope: 'business', icon: 'building', color: 'blue', isSystem: true },
  { id: 'expense-bank', name: 'Bank fees', kind: 'expense', scope: 'both', icon: 'bank', color: 'slate', isSystem: true },
  { id: 'expense-travel', name: 'Travel', kind: 'expense', scope: 'both', icon: 'plane', color: 'blue', isSystem: true },
  { id: 'expense-other', name: 'Other expense', kind: 'expense', scope: 'both', icon: 'dots', color: 'slate', isSystem: true },
];
const systemCategories = new Map(systemCategoryList.map((category) => [category.id, category]));

interface AccountRecord extends DocumentData {
  ownerId: string;
  type: AccountType;
  currency: string;
  ledgerBalanceMinor: number;
  balanceVersion: number;
  archivedAt?: unknown;
  closedAt?: unknown;
}

function requireAuth(uid?: string): string {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in is required.');
  return uid;
}

function stringValue(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpsError('invalid-argument', `${field} is required.`);
  const result = value.trim();
  if (result.length > max) throw new HttpsError('invalid-argument', `${field} is too long.`);
  return result;
}

function optionalString(value: unknown, max = 120): string {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.trim().length > max) throw new HttpsError('invalid-argument', 'Invalid text value.');
  return value.trim();
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new HttpsError('invalid-argument', `Invalid ${field}.`);
  return value as T;
}

function optionalInstitutionCode(value: unknown): InstitutionCode | null {
  if (value == null || value === '') return null;
  return oneOf(value, institutionCodes, 'institution');
}

function paymentMethodValues(data: Record<string, unknown>): { paymentMethod: PaymentMethodCode | null; paymentMethodLabel: string | null } {
  if (data.paymentMethod == null || data.paymentMethod === '') return { paymentMethod: null, paymentMethodLabel: null };
  const paymentMethod = oneOf(data.paymentMethod, paymentMethodCodes, 'payment method');
  const custom = optionalString(data.paymentMethodLabel, 80);
  if (paymentMethod === 'other' && !custom) throw new HttpsError('invalid-argument', 'Type the other payment method.');
  return { paymentMethod, paymentMethodLabel: paymentMethod === 'other' ? custom : null };
}

function displayId(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function commandId(uid: string, key: string): string {
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(key)) throw new HttpsError('invalid-argument', 'Invalid idempotency key.');
  return `${uid}_${key}`;
}

function positiveMoney(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0 || Number(value) > 99_999_999_999) {
    throw new HttpsError('invalid-argument', 'Amount must be a positive safe integer in minor units.');
  }
  return Number(value);
}

function nonNegativeMoney(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 99_999_999_999) {
    throw new HttpsError('invalid-argument', 'Amount must be zero or more in minor units.');
  }
  return Number(value);
}

function signedMoney(value: unknown, field = 'Amount'): number {
  if (!Number.isSafeInteger(value) || Math.abs(Number(value)) > 99_999_999_999) {
    throw new HttpsError('invalid-argument', `${field} must be a safe integer in minor units.`);
  }
  return Number(value);
}

function localDate(value: unknown, field = 'Transaction date'): string {
  const result = stringValue(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new HttpsError('invalid-argument', `${field} must use YYYY-MM-DD.`);
  const parsed = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new HttpsError('invalid-argument', `${field} is invalid.`);
  }
  return result;
}

function accountEffect(accountType: AccountType, flow: 'in' | 'out', amountMinor: number): number {
  const assetEffect = flow === 'in' ? amountMinor : -amountMinor;
  return accountType === 'credit_card' ? -assetEffect : assetEffect;
}

function assertAccount(data: DocumentData | undefined, uid: string, label: string, allowArchived = false): AccountRecord {
  if (!data) throw new HttpsError('not-found', `${label} was not found.`);
  if (data.ownerId !== uid) throw new HttpsError('permission-denied', `You do not own the ${label.toLowerCase()}.`);
  if (!accountTypes.includes(data.type as AccountType)) throw new HttpsError('failed-precondition', `${label} has an unsupported type.`);
  if (!allowArchived && (data.archivedAt || data.closedAt)) throw new HttpsError('failed-precondition', `${label} is closed or archived.`);
  if (!Number.isSafeInteger(data.ledgerBalanceMinor) || !Number.isSafeInteger(data.balanceVersion)) {
    throw new HttpsError('failed-precondition', `${label} has an invalid ledger balance.`);
  }
  return data as AccountRecord;
}

function updateAccountBalance(transaction: Transaction, accountRef: DocumentReference, account: AccountRecord, deltaMinor: number) {
  const nextBalance = account.ledgerBalanceMinor + deltaMinor;
  if (!Number.isSafeInteger(nextBalance)) throw new HttpsError('out-of-range', 'The resulting account balance is outside the supported range.');
  transaction.update(accountRef, {
    ledgerBalanceMinor: nextBalance,
    balanceVersion: account.balanceVersion + 1,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function createLedgerEntry(transaction: Transaction, input: {
  accountId: string;
  ownerId: string;
  spaceId: string;
  transactionId: string;
  entryType: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  counterAccountId?: string | null;
  now: FieldValue;
}): string {
  const ref = db.collection('ledgerEntries').doc();
  transaction.create(ref, {
    displayId: displayId('LED'),
    accountId: input.accountId,
    ownerId: input.ownerId,
    spaceId: input.spaceId,
    transactionId: input.transactionId,
    entryType: input.entryType,
    amountMinor: input.amountMinor,
    currency: input.currency,
    direction: input.amountMinor >= 0 ? 'debit' : 'credit',
    counterAccountId: input.counterAccountId ?? null,
    status: 'posted',
    idempotencyKey: input.idempotencyKey,
    postedAt: input.now,
    createdAt: input.now,
  });
  return ref.id;
}


function optionalLocalDate(value: unknown, field: string): string | null {
  if (value == null || value === '') return null;
  return localDate(value, field);
}

function integerBetween(value: unknown, field: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new HttpsError('invalid-argument', `${field} must be between ${minimum} and ${maximum}.`);
  }
  return Number(value);
}

function addFrequency(date: string, frequency: CommitmentFrequency): string | null {
  if (frequency === 'once') return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (frequency === 'weekly') {
    parsed.setUTCDate(parsed.getUTCDate() + 7);
  } else {
    const day = parsed.getUTCDate();
    const monthStep = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;
    parsed.setUTCDate(1);
    parsed.setUTCMonth(parsed.getUTCMonth() + monthStep);
    const lastDay = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0)).getUTCDate();
    parsed.setUTCDate(Math.min(day, lastDay));
  }
  return parsed.toISOString().slice(0, 10);
}

interface RecurringTemplateRecord extends DocumentData {
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
}

function recurringDateParts(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function monthLastDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isMonthEndDate(value: string) {
  const { year, month, day } = recurringDateParts(value);
  return day === monthLastDay(year, month);
}

function recurringDateFromParts(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addRecurringFrequency(date: string, frequency: RecurringTransactionFrequency, preferredDay: number, preferMonthEnd: boolean) {
  if (frequency === 'weekly') {
    const parsed = new Date(`${date}T00:00:00Z`);
    parsed.setUTCDate(parsed.getUTCDate() + 7);
    return parsed.toISOString().slice(0, 10);
  }
  const { year, month } = recurringDateParts(date);
  const monthStep = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;
  const zeroBasedTarget = (year * 12 + (month - 1)) + monthStep;
  const targetYear = Math.floor(zeroBasedTarget / 12);
  const targetMonth = (zeroBasedTarget % 12) + 1;
  const last = monthLastDay(targetYear, targetMonth);
  const targetDay = preferMonthEnd ? last : Math.min(preferredDay, last);
  return recurringDateFromParts(targetYear, targetMonth, targetDay);
}

function localDateForTimezone(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function recurringRunId(templateId: string, scheduledDate: string) {
  return `${templateId}_${scheduledDate.replace(/-/g, '')}`;
}

function recurringCommand(uid: string, key: string) {
  return db.collection('recurringTransactionCommands').doc(commandId(uid, key));
}

function safeRecurringError(error: unknown) {
  if (error instanceof HttpsError) return error.message.slice(0, 240);
  if (error instanceof Error && error.message) return error.message.slice(0, 240);
  return 'BajetBN could not post this recurring money. Check its Account, Space, and category.';
}

function categorySnapshotFromData(input: {
  categoryId: string;
  requiredKind: CategoryKind;
  selectedScope: Exclude<CategoryScope, 'both'>;
  uid: string;
  customData?: DocumentData;
}): CategorySnapshot {
  if (input.categoryId.startsWith('custom-')) {
    const data = input.customData;
    if (!data) throw new HttpsError('not-found', 'The selected custom category was not found.');
    if (data.ownerId !== input.uid) throw new HttpsError('permission-denied', 'You do not own the selected category.');
    if (data.archivedAt) throw new HttpsError('failed-precondition', 'The selected category is archived.');
    const kind = oneOf(data.kind, categoryKinds, 'category type');
    const scope = oneOf(data.scope, categoryScopes, 'category scope');
    if (kind !== input.requiredKind) throw new HttpsError('failed-precondition', `Choose an ${input.requiredKind} category.`);
    if (scope !== 'both' && scope !== input.selectedScope) throw new HttpsError('failed-precondition', 'The selected category is not available for this Space.');
    return {
      id: input.categoryId,
      name: stringValue(data.name, 'Category name', 60),
      kind,
      scope,
      icon: oneOf(data.icon, categoryIcons, 'category icon'),
      color: oneOf(data.color, categoryColors, 'category colour'),
      isSystem: false,
    };
  }
  const selected = systemCategories.get(input.categoryId);
  if (!selected) throw new HttpsError('invalid-argument', 'Invalid category.');
  if (selected.kind !== input.requiredKind) throw new HttpsError('failed-precondition', `Choose an ${input.requiredKind} category.`);
  if (selected.scope !== 'both' && selected.scope !== input.selectedScope) throw new HttpsError('failed-precondition', 'The selected category is not available for this Space.');
  return selected;
}

function matchingBudgetIds(
  snapshots: Array<{ id: string; data: () => DocumentData | undefined }>,
  input: { spaceId: string; categoryId: string; transactionDate: string },
): string[] {
  return snapshots.filter((snapshot) => {
    const data = snapshot.data();
    if (!data || data.archivedAt || data.spaceId !== input.spaceId) return false;
    if (typeof data.startDate !== 'string' || typeof data.endDate !== 'string') return false;
    if (input.transactionDate < data.startDate || input.transactionDate > data.endDate) return false;
    return !data.categoryId || data.categoryId === input.categoryId;
  }).map((snapshot) => snapshot.id);
}

function updateBudgetsSpent(
  transaction: Transaction,
  snapshots: Array<{ id: string; ref: DocumentReference; data: () => DocumentData | undefined }>,
  budgetIds: string[],
  deltaMinor: number,
) {
  for (const snapshot of snapshots) {
    if (!budgetIds.includes(snapshot.id)) continue;
    const current = snapshot.data()?.spentMinor;
    if (!Number.isSafeInteger(current)) throw new HttpsError('failed-precondition', 'A matching budget has an invalid spent amount.');
    const next = Math.max(0, Number(current) + deltaMinor);
    transaction.update(snapshot.ref, { spentMinor: next, updatedAt: FieldValue.serverTimestamp() });
  }
}

export const completeOnboarding = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const registrationEligibility = await registrationEligibilityForAuthenticatedUser(uid, request.auth?.token.email);
  if (!registrationEligibility.allowed) {
    await removeBlockedRegistrationAuthUser(uid);
    throw new HttpsError('failed-precondition', registrationEligibility.message || 'This email cannot create a BajetBN account yet.', registrationEligibility);
  }
  const fullName = stringValue(request.data?.fullName, 'Full name');
  const language = oneOf(request.data?.language, ['en', 'ms'] as const, 'language');
  const currency = oneOf(request.data?.currency, ['BND'] as const, 'currency');
  const timezone = oneOf(request.data?.timezone, ['Asia/Brunei'] as const, 'timezone');
  const appearance = oneOf(request.data?.appearance ?? 'dark', appearanceOptions, 'appearance');
  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (userSnapshot.exists && userSnapshot.data()?.onboardingCompleted) {
      return { personalSpaceId: userSnapshot.data()?.personalSpaceId, alreadyCompleted: true };
    }

    const spaceRef = db.collection('spaces').doc();
    const memberRef = db.collection('spaceMembers').doc(`${spaceRef.id}_${uid}`);
    const now = FieldValue.serverTimestamp();

    transaction.set(spaceRef, {
      displayId: displayId('SPC'), name: 'Personal', type: 'personal', ownerId: uid,
      collaborationMode: 'private', approvalMode: 'none', headWhatsapp: '', currency, timezone, description: 'Your private financial home.', archivedAt: null,
      createdAt: now, updatedAt: now,
    });
    transaction.set(memberRef, {
      spaceId: spaceRef.id, uid, role: 'owner', canUseAccounts: true,
      canViewBalances: true, canViewLedger: true, joinedAt: now,
    });
    transaction.set(userRef, {
      uid, fullName, email: request.auth?.token.email || '',
      platformRole: 'user',
      subscriptionPlan: 'basic',
      subscriptionStatus: 'basic',
      subscriptionStartedAt: null,
      subscriptionExpiresAt: null,
      subscriptionSource: null,
      language, currency, timezone,
      appearance, textSize: 'normal', notificationsEnabled: true,
      backgroundRemindersEnabled: true, dueSoonReminders: true, lateReminders: true, goalReminders: true,
      sharedPaymentNotifications: true, whatsappRemindersEnabled: true, browserPushEnabled: false, reminderDaysBefore: 3,
      onboardingCompleted: true, personalSpaceId: spaceRef.id,
      createdAt: userSnapshot.exists ? userSnapshot.data()?.createdAt || now : now, updatedAt: now,
    }, { merge: true });
    return { personalSpaceId: spaceRef.id, alreadyCompleted: false };
  });
});

async function requireOwnedSmeSpaceForAccount(spaceId: string, uid: string): Promise<DocumentData> {
  const snapshot = await db.collection('spaces').doc(spaceId).get();
  if (!snapshot.exists || snapshot.data()?.archivedAt) {
    throw new HttpsError('failed-precondition', 'Choose an active SME Space for this business account.');
  }
  const space = snapshot.data() || {};
  if (space.type !== 'sme' || space.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'Only the SME Space owner can assign a business account to that Space.');
  }
  return space;
}

export const createAccount = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const name = stringValue(request.data?.name, 'Account name');
  const institution = optionalString(request.data?.institution);
  const institutionCode = optionalInstitutionCode(request.data?.institutionCode);
  const type = oneOf(request.data?.type, accountTypes, 'account type');
  const classification = oneOf(request.data?.classification, ['personal', 'business'] as const, 'classification');
  const requestedSpaceId = optionalString(request.data?.spaceId, 80) || null;
  const requestedPosEnabled = request.data?.posEnabled === true;
  const currency = oneOf(request.data?.currency, ['BND', 'MYR', 'SGD', 'USD'] as const, 'currency');
  const openingBalanceMinor = request.data?.openingBalanceMinor;
  if (!Number.isSafeInteger(openingBalanceMinor) || Math.abs(openingBalanceMinor) > 99_999_999_999) {
    throw new HttpsError('invalid-argument', 'Opening balance must be a safe integer in minor units.');
  }

  let spaceId: string | null = null;
  let posEnabled = false;
  if (classification === 'business') {
    if (!requestedSpaceId) throw new HttpsError('invalid-argument', 'Choose which SME business owns this account.');
    const space = await requireOwnedSmeSpaceForAccount(requestedSpaceId, uid);
    if (requestedPosEnabled && space.currency !== currency) {
      throw new HttpsError('failed-precondition', 'A POS-enabled business account must use the same currency as its SME Space.');
    }
    spaceId = requestedSpaceId;
    posEnabled = requestedPosEnabled;
  }

  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const commandRef = db.collection('financialCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(commandRef);
    if (existing.exists) return existing.data()?.result;

    const accountRef = db.collection('accounts').doc();
    const ledgerRef = db.collection('ledgerEntries').doc();
    const now = FieldValue.serverTimestamp();
    const result = { accountId: accountRef.id, ledgerEntryId: ledgerRef.id };

    transaction.create(accountRef, {
      displayId: displayId('ACC'), ownerId: uid, name, institution, institutionCode, type, classification,
      spaceId, posEnabled,
      currency, openingBalanceMinor, ledgerBalanceMinor: openingBalanceMinor,
      balanceVersion: 1, archivedAt: null, closedAt: null, createdAt: now, updatedAt: now,
    });
    transaction.create(ledgerRef, {
      displayId: displayId('LED'), accountId: accountRef.id, ownerId: uid,
      spaceId: null, transactionId: null, entryType: 'opening_balance',
      amountMinor: openingBalanceMinor, currency, direction: openingBalanceMinor >= 0 ? 'debit' : 'credit',
      status: 'posted', idempotencyKey: key, postedAt: now, createdAt: now,
    });
    transaction.create(commandRef, {
      uid, kind: 'create_account', idempotencyKey: key, result, createdAt: now,
    });
    return result;
  });
});

export const updateAccountProfile = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const accountId = stringValue(request.data?.accountId, 'Account ID');
  const name = stringValue(request.data?.name, 'Account name');
  const institution = optionalString(request.data?.institution);
  const institutionCode = optionalInstitutionCode(request.data?.institutionCode);
  const type = oneOf(request.data?.type, accountTypes, 'account type');
  const classification = oneOf(request.data?.classification, ['personal', 'business'] as const, 'classification');
  const requestedSpaceId = optionalString(request.data?.spaceId, 80) || null;
  const requestedPosEnabled = request.data?.posEnabled === true;
  const ref = db.collection('accounts').doc(accountId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Account not found.');
  if (snapshot.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this account.');

  let spaceId: string | null = null;
  let posEnabled = false;
  if (classification === 'business') {
    if (!requestedSpaceId) throw new HttpsError('invalid-argument', 'Choose which SME business owns this account.');
    const space = await requireOwnedSmeSpaceForAccount(requestedSpaceId, uid);
    if (requestedPosEnabled && space.currency !== snapshot.data()?.currency) {
      throw new HttpsError('failed-precondition', 'A POS-enabled business account must use the same currency as its SME Space.');
    }
    spaceId = requestedSpaceId;
    posEnabled = requestedPosEnabled;
  }

  const settingsSnapshot = await db.collection('smePosSettings').where('ownerId', '==', uid).get();
  const batch = db.batch();
  batch.update(ref, {
    name,
    institution,
    institutionCode,
    type,
    classification,
    spaceId,
    posEnabled,
    updatedAt: FieldValue.serverTimestamp(),
  });
  settingsSnapshot.docs.forEach((settings) => {
    if (settings.data()?.defaultPaymentAccountId === accountId && (!posEnabled || settings.id !== spaceId)) {
      batch.update(settings.ref, { defaultPaymentAccountId: null, updatedAt: FieldValue.serverTimestamp() });
    }
  });
  await batch.commit();
  return { accountId, spaceId, posEnabled };
});

export const archiveAccount = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const accountId = stringValue(request.data?.accountId, 'Account ID');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const commandRef = db.collection('financialCommands').doc(commandId(uid, key));
  const accountRef = db.collection('accounts').doc(accountId);
  return db.runTransaction(async (transaction) => {
    const priorCommand = await transaction.get(commandRef);
    if (priorCommand.exists) return priorCommand.data()?.result;
    const account = await transaction.get(accountRef);
    if (!account.exists) throw new HttpsError('not-found', 'Account not found.');
    if (account.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this account.');
    const now = FieldValue.serverTimestamp();
    const result = { accountId, archived: true };
    transaction.update(accountRef, { archivedAt: now, updatedAt: now });
    transaction.create(commandRef, { uid, kind: 'archive_account', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const createCategory = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const name = stringValue(request.data?.name, 'Category name', 60);
  const kind = oneOf(request.data?.kind, categoryKinds, 'category type');
  const scope = oneOf(request.data?.scope, categoryScopes, 'category scope');
  const icon = oneOf(request.data?.icon, categoryIcons, 'category icon');
  const color = oneOf(request.data?.color, categoryColors, 'category colour');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const commandRef = db.collection('financialCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(commandRef);
    if (existing.exists) return existing.data()?.result;
    const categoryRef = db.collection('categories').doc(`custom-${randomBytes(10).toString('hex')}`);
    const now = FieldValue.serverTimestamp();
    const result = { categoryId: categoryRef.id };
    transaction.create(categoryRef, {
      ownerId: uid,
      name,
      kind,
      scope,
      icon,
      color,
      isSystem: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    transaction.create(commandRef, { uid, kind: 'create_category', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const updateCategory = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const categoryId = stringValue(request.data?.categoryId, 'Category ID');
  const name = stringValue(request.data?.name, 'Category name', 60);
  const kind = oneOf(request.data?.kind, categoryKinds, 'category type');
  const scope = oneOf(request.data?.scope, categoryScopes, 'category scope');
  const icon = oneOf(request.data?.icon, categoryIcons, 'category icon');
  const color = oneOf(request.data?.color, categoryColors, 'category colour');
  const categoryRef = db.collection('categories').doc(categoryId);
  const snapshot = await categoryRef.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Category not found.');
  if (snapshot.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this category.');
  if (snapshot.data()?.archivedAt) throw new HttpsError('failed-precondition', 'Archived categories cannot be edited.');
  await categoryRef.update({ name, kind, scope, icon, color, updatedAt: FieldValue.serverTimestamp() });
  return { categoryId };
});

export const archiveCategory = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const categoryId = stringValue(request.data?.categoryId, 'Category ID');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const commandRef = db.collection('financialCommands').doc(commandId(uid, key));
  const categoryRef = db.collection('categories').doc(categoryId);
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(commandRef);
    if (existing.exists) return existing.data()?.result;
    const category = await transaction.get(categoryRef);
    if (!category.exists) throw new HttpsError('not-found', 'Category not found.');
    if (category.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this category.');
    const now = FieldValue.serverTimestamp();
    const result = { categoryId, archived: true };
    transaction.update(categoryRef, { archivedAt: now, updatedAt: now });
    transaction.create(commandRef, { uid, kind: 'archive_category', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const postTransaction = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const type = oneOf(request.data?.type, transactionTypes, 'transaction type');
  const accountId = stringValue(request.data?.accountId, 'Account');
  const destinationAccountId = type === 'transfer' ? stringValue(request.data?.destinationAccountId, 'Destination account') : '';
  if (destinationAccountId && destinationAccountId === accountId) {
    throw new HttpsError('invalid-argument', 'Transfer accounts must be different.');
  }
  const spaceId = stringValue(request.data?.spaceId, 'Space');
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const transactionDate = localDate(request.data?.transactionDate);
  const categoryId = type === 'transfer' ? 'system-transfer' : stringValue(request.data?.categoryId, 'Category ID', 80);
  const counterparty = optionalString(request.data?.counterparty, 120);
  const note = optionalString(request.data?.note, 500);
  const { paymentMethod, paymentMethodLabel } = paymentMethodValues(request.data || {});
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  const commandRef = db.collection('financialCommands').doc(commandId(uid, key));
  const spaceRef = db.collection('spaces').doc(spaceId);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  const accountRef = db.collection('accounts').doc(accountId);
  const destinationRef = destinationAccountId ? db.collection('accounts').doc(destinationAccountId) : null;
  const customCategoryRef = categoryId.startsWith('custom-') ? db.collection('categories').doc(categoryId) : null;
  const budgetCandidateRefs = type === 'expense'
    ? (await db.collection('budgets').where('ownerId', '==', uid).where('spaceId', '==', spaceId).get()).docs.map((item) => item.ref)
    : [];

  return db.runTransaction(async (transaction) => {
    const commandSnapshot = await transaction.get(commandRef);
    if (commandSnapshot.exists) return commandSnapshot.data()?.result;

    const [spaceSnapshot, memberSnapshot, accountSnapshot, destinationSnapshot, customCategorySnapshot, budgetSnapshots] = await Promise.all([
      transaction.get(spaceRef),
      transaction.get(memberRef),
      transaction.get(accountRef),
      destinationRef ? transaction.get(destinationRef) : Promise.resolve(null),
      customCategoryRef ? transaction.get(customCategoryRef) : Promise.resolve(null),
      Promise.all(budgetCandidateRefs.map((ref) => transaction.get(ref))),
    ]);

    if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) throw new HttpsError('failed-precondition', 'The selected Space is unavailable.');
    if (!memberSnapshot.exists || memberSnapshot.data()?.canUseAccounts !== true) {
      throw new HttpsError('permission-denied', 'You cannot post transactions in this Space.');
    }

    const account = assertAccount(accountSnapshot.data(), uid, 'Account');
    const destination = destinationSnapshot ? assertAccount(destinationSnapshot.data(), uid, 'Destination account') : null;
    const spaceCurrency = spaceSnapshot.data()?.currency;
    if (account.currency !== spaceCurrency) throw new HttpsError('failed-precondition', 'Account and Space currencies must match.');
    if (destination && destination.currency !== account.currency) {
      throw new HttpsError('failed-precondition', 'Transfer accounts must use the same currency.');
    }

    const selectedScope: Exclude<CategoryScope, 'both'> = spaceSnapshot.data()?.type === 'sme' ? 'business' : 'personal';
    const category: CategorySnapshot = type === 'transfer'
      ? { id: 'system-transfer', name: 'Transfer', kind: 'expense', scope: 'both', icon: 'transfer', color: 'blue', isSystem: true }
      : categorySnapshotFromData({
          categoryId,
          requiredKind: type,
          selectedScope,
          uid,
          customData: customCategorySnapshot?.data(),
        });
    const budgetIds = type === 'expense'
      ? matchingBudgetIds(budgetSnapshots, { spaceId, categoryId: category.id, transactionDate })
      : [];

    const transactionRef = db.collection('transactions').doc();
    const now = FieldValue.serverTimestamp();
    const ledgerEntryIds: string[] = [];

    if (type === 'income' || type === 'expense') {
      const flow = type === 'income' ? 'in' : 'out';
      const delta = accountEffect(account.type, flow, amountMinor);
      updateAccountBalance(transaction, accountRef, account, delta);
      ledgerEntryIds.push(createLedgerEntry(transaction, {
        accountId,
        ownerId: uid,
        spaceId,
        transactionId: transactionRef.id,
        entryType: type,
        amountMinor: delta,
        currency: account.currency,
        idempotencyKey: key,
        now,
      }));
    } else {
      if (!destinationRef || !destination) throw new HttpsError('invalid-argument', 'Destination account is required.');
      const sourceDelta = accountEffect(account.type, 'out', amountMinor);
      const destinationDelta = accountEffect(destination.type, 'in', amountMinor);
      updateAccountBalance(transaction, accountRef, account, sourceDelta);
      updateAccountBalance(transaction, destinationRef, destination, destinationDelta);
      ledgerEntryIds.push(createLedgerEntry(transaction, {
        accountId,
        ownerId: uid,
        spaceId,
        transactionId: transactionRef.id,
        entryType: 'transfer_out',
        amountMinor: sourceDelta,
        currency: account.currency,
        idempotencyKey: key,
        counterAccountId: destinationAccountId,
        now,
      }));
      ledgerEntryIds.push(createLedgerEntry(transaction, {
        accountId: destinationAccountId,
        ownerId: uid,
        spaceId,
        transactionId: transactionRef.id,
        entryType: 'transfer_in',
        amountMinor: destinationDelta,
        currency: account.currency,
        idempotencyKey: key,
        counterAccountId: accountId,
        now,
      }));
    }

    if (budgetIds.length) updateBudgetsSpent(transaction, budgetSnapshots, budgetIds, amountMinor);

    transaction.create(transactionRef, {
      displayId: displayId('TXN'),
      ownerId: uid,
      createdBy: uid,
      type,
      status: 'posted',
      spaceId,
      accountId,
      destinationAccountId: destinationAccountId || null,
      amountMinor,
      currency: account.currency,
      category: category.name,
      categoryId: category.id,
      categoryIcon: category.icon,
      categoryColor: category.color,
      categoryScope: category.scope,
      categoryIsSystem: category.isSystem,
      counterparty,
      note,
      paymentMethod,
      paymentMethodLabel,
      transactionDate,
      reversalOf: null,
      reversedBy: null,
      budgetIds,
      commitmentId: null,
      commitmentPaymentId: null,
      createdAt: now,
      postedAt: now,
      updatedAt: now,
    });

    const result = { transactionId: transactionRef.id, ledgerEntryIds };
    transaction.create(commandRef, {
      uid,
      kind: 'post_transaction',
      idempotencyKey: key,
      result,
      createdAt: now,
    });
    return result;
  });
});

export const reverseTransaction = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const originalTransactionId = stringValue(request.data?.transactionId, 'Transaction ID');
  const reversalDate = localDate(request.data?.transactionDate, 'Reversal date');
  const reason = optionalString(request.data?.reason, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  const commandRef = db.collection('financialCommands').doc(commandId(uid, key));
  const originalRef = db.collection('transactions').doc(originalTransactionId);

  return db.runTransaction(async (transaction) => {
    const commandSnapshot = await transaction.get(commandRef);
    if (commandSnapshot.exists) return commandSnapshot.data()?.result;

    const originalSnapshot = await transaction.get(originalRef);
    if (!originalSnapshot.exists) throw new HttpsError('not-found', 'Transaction not found.');
    const original = originalSnapshot.data();
    if (!original) throw new HttpsError('not-found', 'Transaction data is unavailable.');
    if (original.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this transaction.');
    if (!transactionTypes.includes(original.type as PostedTransactionType)) {
      throw new HttpsError('failed-precondition', 'Only an original posted transaction can be reversed.');
    }
    if (original.status !== 'posted' || original.reversedBy) {
      throw new HttpsError('failed-precondition', 'This transaction has already been reversed.');
    }
    if (original.sharedBillPaymentId) {
      throw new HttpsError('failed-precondition', 'Reverse shared bill payments from Sharing so the assignment and commitment reopen correctly.');
    }

    const accountRef = db.collection('accounts').doc(String(original.accountId));
    const destinationRef = original.destinationAccountId ? db.collection('accounts').doc(String(original.destinationAccountId)) : null;
    const budgetRefs = Array.isArray(original.budgetIds)
      ? original.budgetIds.filter((id: unknown): id is string => typeof id === 'string').map((id: string) => db.collection('budgets').doc(id))
      : [];
    const paymentRef = original.commitmentPaymentId ? db.collection('commitmentPayments').doc(String(original.commitmentPaymentId)) : null;
    const commitmentRef = original.commitmentId ? db.collection('commitments').doc(String(original.commitmentId)) : null;
    const [accountSnapshot, destinationSnapshot, budgetSnapshots, paymentSnapshot, commitmentSnapshot] = await Promise.all([
      transaction.get(accountRef),
      destinationRef ? transaction.get(destinationRef) : Promise.resolve(null),
      Promise.all(budgetRefs.map((ref) => transaction.get(ref))),
      paymentRef ? transaction.get(paymentRef) : Promise.resolve(null),
      commitmentRef ? transaction.get(commitmentRef) : Promise.resolve(null),
    ]);
    const account = assertAccount(accountSnapshot.data(), uid, 'Account', true);
    const destination = destinationSnapshot ? assertAccount(destinationSnapshot.data(), uid, 'Destination account', true) : null;
    const amountMinor = positiveMoney(original.amountMinor);
    const originalType = original.type as PostedTransactionType;
    const reversalRef = db.collection('transactions').doc();
    const now = FieldValue.serverTimestamp();
    const ledgerEntryIds: string[] = [];

    if (originalType === 'income' || originalType === 'expense') {
      const originalFlow = originalType === 'income' ? 'in' : 'out';
      const delta = -accountEffect(account.type, originalFlow, amountMinor);
      updateAccountBalance(transaction, accountRef, account, delta);
      ledgerEntryIds.push(createLedgerEntry(transaction, {
        accountId: accountRef.id,
        ownerId: uid,
        spaceId: String(original.spaceId),
        transactionId: reversalRef.id,
        entryType: 'reversal',
        amountMinor: delta,
        currency: account.currency,
        idempotencyKey: key,
        now,
      }));
    } else {
      if (!destinationRef || !destination) throw new HttpsError('failed-precondition', 'The original transfer is incomplete.');
      const sourceDelta = -accountEffect(account.type, 'out', amountMinor);
      const destinationDelta = -accountEffect(destination.type, 'in', amountMinor);
      updateAccountBalance(transaction, accountRef, account, sourceDelta);
      updateAccountBalance(transaction, destinationRef, destination, destinationDelta);
      ledgerEntryIds.push(createLedgerEntry(transaction, {
        accountId: accountRef.id,
        ownerId: uid,
        spaceId: String(original.spaceId),
        transactionId: reversalRef.id,
        entryType: 'reversal_transfer_source',
        amountMinor: sourceDelta,
        currency: account.currency,
        idempotencyKey: key,
        counterAccountId: destinationRef.id,
        now,
      }));
      ledgerEntryIds.push(createLedgerEntry(transaction, {
        accountId: destinationRef.id,
        ownerId: uid,
        spaceId: String(original.spaceId),
        transactionId: reversalRef.id,
        entryType: 'reversal_transfer_destination',
        amountMinor: destinationDelta,
        currency: account.currency,
        idempotencyKey: key,
        counterAccountId: accountRef.id,
        now,
      }));
    }

    if (budgetSnapshots.length) updateBudgetsSpent(transaction, budgetSnapshots, budgetSnapshots.map((item) => item.id), -amountMinor);
    if (paymentRef && paymentSnapshot?.exists && commitmentRef && commitmentSnapshot?.exists) {
      const payment = paymentSnapshot.data();
      const commitment = commitmentSnapshot.data();
      if (payment?.ownerId !== uid || commitment?.ownerId !== uid) throw new HttpsError('permission-denied', 'Commitment payment access denied.');
      if (payment?.status !== 'posted') throw new HttpsError('failed-precondition', 'The commitment payment is not active.');
      const restoredPaid = Math.max(0, Number(commitment?.amountPaidMinor || 0) - amountMinor);
      transaction.update(paymentRef, { status: 'reversed', reversedBy: reversalRef.id, updatedAt: now });
      transaction.update(commitmentRef, {
        amountPaidMinor: restoredPaid,
        nextDueDate: payment?.previousNextDueDate ?? payment?.dueDateApplied ?? commitment?.nextDueDate ?? null,
        status: payment?.previousStatus === 'completed' ? 'completed' : 'active',
        updatedAt: now,
      });
    }

    transaction.create(reversalRef, {
      displayId: displayId('TXN'),
      ownerId: uid,
      createdBy: uid,
      type: 'reversal',
      originalType,
      status: 'posted',
      spaceId: original.spaceId,
      accountId: original.accountId,
      destinationAccountId: original.destinationAccountId ?? null,
      amountMinor,
      currency: original.currency,
      category: 'Reversal',
      categoryId: 'system-reversal',
      categoryIcon: 'reversal',
      categoryColor: 'slate',
      categoryScope: original.categoryScope ?? 'both',
      categoryIsSystem: true,
      counterparty: original.counterparty ?? '',
      note: reason || `Reversal of ${original.displayId || originalTransactionId}`,
      transactionDate: reversalDate,
      reversalOf: originalTransactionId,
      reversedBy: null,
      budgetIds: original.budgetIds ?? [],
      commitmentId: original.commitmentId ?? null,
      commitmentPaymentId: original.commitmentPaymentId ?? null,
      createdAt: now,
      postedAt: now,
      updatedAt: now,
    });
    transaction.update(originalRef, {
      status: 'reversed',
      reversedBy: reversalRef.id,
      reversedAt: now,
      updatedAt: now,
    });

    const result = { transactionId: reversalRef.id, originalTransactionId, ledgerEntryIds };
    transaction.create(commandRef, {
      uid,
      kind: 'reverse_transaction',
      idempotencyKey: key,
      result,
      createdAt: now,
    });
    return result;
  });
});

async function calculateBudgetSpent(input: { uid: string; spaceId: string; categoryId?: string | null; startDate: string; endDate: string }): Promise<number> {
  const snapshot = await db.collection('transactions').where('ownerId', '==', input.uid).where('spaceId', '==', input.spaceId).get();
  return snapshot.docs.reduce((sum, item) => {
    const data = item.data();
    if (data.type !== 'expense' || data.status !== 'posted') return sum;
    if (typeof data.transactionDate !== 'string' || data.transactionDate < input.startDate || data.transactionDate > input.endDate) return sum;
    if (input.categoryId && data.categoryId !== input.categoryId) return sum;
    return sum + (Number.isSafeInteger(data.amountMinor) ? Number(data.amountMinor) : 0);
  }, 0);
}


export const registerTransactionAttachment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const attachmentId = stringValue(request.data?.attachmentId, 'Attachment ID', 80);
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(attachmentId)) throw new HttpsError('invalid-argument', 'Attachment ID is invalid.');
  const transactionId = stringValue(request.data?.transactionId, 'Transaction ID', 100);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 100);
  const storagePath = stringValue(request.data?.storagePath, 'Storage path', 500);
  const fileName = stringValue(request.data?.fileName, 'File name', 160);
  const contentType = stringValue(request.data?.contentType, 'File type', 120);
  const sizeBytes = Number(request.data?.sizeBytes);
  if (contentType !== 'application/pdf' && !contentType.startsWith('image/')) {
    throw new HttpsError('invalid-argument', 'Upload an image or PDF receipt.');
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes >= 10 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'The receipt or document must be smaller than 10 MB.');
  }
  const expectedPrefix = `users/${uid}/transaction-receipts/${transactionId}/${attachmentId}-`;
  if (!storagePath.startsWith(expectedPrefix)) throw new HttpsError('permission-denied', 'Attachment storage path is invalid.');

  const transactionRef = db.collection('transactions').doc(transactionId);
  const transactionSnapshot = await transactionRef.get();
  if (!transactionSnapshot.exists) throw new HttpsError('not-found', 'Money activity not found.');
  const transactionData = transactionSnapshot.data() || {};
  if (transactionData.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this money activity.');
  if (transactionData.spaceId !== spaceId) throw new HttpsError('failed-precondition', 'The selected Space does not match this money activity.');

  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('failed-precondition', 'Upload the file before saving its attachment record.');
  const [metadata] = await file.getMetadata();
  const actualSize = Number(metadata.size || 0);
  const actualContentType = String(metadata.contentType || '');
  if (actualSize !== sizeBytes || actualContentType !== contentType) {
    throw new HttpsError('failed-precondition', 'The uploaded file details do not match. Please try again.');
  }

  const attachmentRef = db.collection('transactionAttachments').doc(`${transactionId}_${attachmentId}`);
  const existing = await attachmentRef.get();
  if (existing.exists) return { attachmentId: attachmentRef.id };
  const current = await db.collection('transactionAttachments').where('transactionId', '==', transactionId).get();
  if (current.size >= 5) throw new HttpsError('resource-exhausted', 'A money activity can have up to five attachments.');

  await attachmentRef.create({
    ownerId: uid,
    transactionId,
    spaceId,
    storagePath,
    fileName,
    contentType,
    sizeBytes,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { attachmentId: attachmentRef.id };
});

export const removeTransactionAttachment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const attachmentId = stringValue(request.data?.attachmentId, 'Attachment ID', 220);
  const attachmentRef = db.collection('transactionAttachments').doc(attachmentId);
  const snapshot = await attachmentRef.get();
  if (!snapshot.exists) return { removed: true };
  const data = snapshot.data() || {};
  if (data.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this attachment.');
  const storagePath = String(data.storagePath || '');
  if (!storagePath.startsWith(`users/${uid}/transaction-receipts/`)) {
    throw new HttpsError('failed-precondition', 'Attachment storage path is invalid.');
  }
  await getStorage().bucket().file(storagePath).delete({ ignoreNotFound: true });
  await attachmentRef.delete();
  return { removed: true };
});

export const createBudget = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const name = stringValue(request.data?.name, 'Budget name', 80);
  const spaceId = stringValue(request.data?.spaceId, 'Space');
  const categoryId = optionalString(request.data?.categoryId, 80) || null;
  const periodType = oneOf(request.data?.periodType, budgetPeriodTypes, 'budget period');
  const startDate = localDate(request.data?.startDate, 'Start date');
  const endDate = localDate(request.data?.endDate, 'End date');
  if (endDate < startDate) throw new HttpsError('invalid-argument', 'End date must be on or after the start date.');
  const limitMinor = positiveMoney(request.data?.limitMinor);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const spentMinor = await calculateBudgetSpent({ uid, spaceId, categoryId, startDate, endDate });
  const commandRef = db.collection('financialCommands').doc(commandId(uid, key));
  const spaceRef = db.collection('spaces').doc(spaceId);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  const customCategoryRef = categoryId?.startsWith('custom-') ? db.collection('categories').doc(categoryId) : null;

  return db.runTransaction(async (transaction) => {
    const [commandSnapshot, spaceSnapshot, memberSnapshot, customCategorySnapshot] = await Promise.all([
      transaction.get(commandRef), transaction.get(spaceRef), transaction.get(memberRef),
      customCategoryRef ? transaction.get(customCategoryRef) : Promise.resolve(null),
    ]);
    if (commandSnapshot.exists) return commandSnapshot.data()?.result;
    if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) throw new HttpsError('failed-precondition', 'The selected Space is unavailable.');
    if (!memberSnapshot.exists) throw new HttpsError('permission-denied', 'You are not a member of this Space.');
    const selectedScope: Exclude<CategoryScope, 'both'> = spaceSnapshot.data()?.type === 'sme' ? 'business' : 'personal';
    const category = categoryId ? categorySnapshotFromData({ categoryId, requiredKind: 'expense', selectedScope, uid, customData: customCategorySnapshot?.data() }) : null;
    const budgetRef = db.collection('budgets').doc();
    const now = FieldValue.serverTimestamp();
    const result = { budgetId: budgetRef.id };
    transaction.create(budgetRef, {
      displayId: displayId('BDG'), ownerId: uid, name, spaceId,
      categoryId: category?.id ?? null, categoryName: category?.name ?? null, categoryIcon: category?.icon ?? null, categoryColor: category?.color ?? null,
      periodType, startDate, endDate, limitMinor, spentMinor, currency: spaceSnapshot.data()?.currency,
      archivedAt: null, createdAt: now, updatedAt: now,
    });
    transaction.create(commandRef, { uid, kind: 'create_budget', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const updateBudget = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const budgetId = stringValue(request.data?.budgetId, 'Budget ID');
  const name = stringValue(request.data?.name, 'Budget name', 80);
  const categoryId = optionalString(request.data?.categoryId, 80) || null;
  const periodType = oneOf(request.data?.periodType, budgetPeriodTypes, 'budget period');
  const startDate = localDate(request.data?.startDate, 'Start date');
  const endDate = localDate(request.data?.endDate, 'End date');
  if (endDate < startDate) throw new HttpsError('invalid-argument', 'End date must be on or after the start date.');
  const limitMinor = positiveMoney(request.data?.limitMinor);
  const budgetRef = db.collection('budgets').doc(budgetId);
  const budgetSnapshot = await budgetRef.get();
  if (!budgetSnapshot.exists) throw new HttpsError('not-found', 'Budget not found.');
  const budget = budgetSnapshot.data();
  if (budget?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this budget.');
  if (budget?.archivedAt) throw new HttpsError('failed-precondition', 'Archived budgets cannot be edited.');
  const spaceSnapshot = await db.collection('spaces').doc(String(budget?.spaceId)).get();
  const customCategorySnapshot = categoryId?.startsWith('custom-') ? await db.collection('categories').doc(categoryId).get() : null;
  const selectedScope: Exclude<CategoryScope, 'both'> = spaceSnapshot.data()?.type === 'sme' ? 'business' : 'personal';
  const category = categoryId ? categorySnapshotFromData({ categoryId, requiredKind: 'expense', selectedScope, uid, customData: customCategorySnapshot?.data() }) : null;
  const spentMinor = await calculateBudgetSpent({ uid, spaceId: String(budget?.spaceId), categoryId, startDate, endDate });
  await budgetRef.update({ name, categoryId: category?.id ?? null, categoryName: category?.name ?? null, categoryIcon: category?.icon ?? null, categoryColor: category?.color ?? null, periodType, startDate, endDate, limitMinor, spentMinor, updatedAt: FieldValue.serverTimestamp() });
  return { budgetId };
});

export const archiveBudget = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid); const budgetId = stringValue(request.data?.budgetId, 'Budget ID'); const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('budgets').doc(budgetId); const commandRef = db.collection('financialCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => { const [command, snapshot] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]); if (command.exists) return command.data()?.result; if (!snapshot.exists) throw new HttpsError('not-found', 'Budget not found.'); if (snapshot.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this budget.'); const now=FieldValue.serverTimestamp(); const result={budgetId,archived:true}; transaction.update(ref,{archivedAt:now,updatedAt:now}); transaction.create(commandRef,{uid,kind:'archive_budget',idempotencyKey:key,result,createdAt:now}); return result; });
});

export const createGoal = onCall({ region }, async (request) => {
  const uid=requireAuth(request.auth?.uid); const name=stringValue(request.data?.name,'Goal name',80); const spaceId=stringValue(request.data?.spaceId,'Space'); const targetMinor=positiveMoney(request.data?.targetMinor); const targetDate=optionalLocalDate(request.data?.targetDate,'Target date'); const note=optionalString(request.data?.note,500); const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);
  const commandRef=db.collection('financialCommands').doc(commandId(uid,key)); const spaceRef=db.collection('spaces').doc(spaceId); const memberRef=db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  return db.runTransaction(async transaction=>{const[command,space,member]=await Promise.all([transaction.get(commandRef),transaction.get(spaceRef),transaction.get(memberRef)]);if(command.exists)return command.data()?.result;if(!space.exists||space.data()?.archivedAt)throw new HttpsError('failed-precondition','The selected Space is unavailable.');if(!member.exists)throw new HttpsError('permission-denied','You are not a member of this Space.');const ref=db.collection('goals').doc();const now=FieldValue.serverTimestamp();const result={goalId:ref.id};transaction.create(ref,{displayId:displayId('GOL'),ownerId:uid,name,spaceId,targetMinor,currentMinor:0,currency:space.data()?.currency,targetDate,status:'active',note,archivedAt:null,closedAt:null,createdAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'create_goal',idempotencyKey:key,result,createdAt:now});return result;});
});

export const updateGoal = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const goalId=stringValue(request.data?.goalId,'Goal ID');const name=stringValue(request.data?.name,'Goal name',80);const targetMinor=positiveMoney(request.data?.targetMinor);const targetDate=optionalLocalDate(request.data?.targetDate,'Target date');const note=optionalString(request.data?.note,500);const ref=db.collection('goals').doc(goalId);const snapshot=await ref.get();if(!snapshot.exists)throw new HttpsError('not-found','Goal not found.');if(snapshot.data()?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this goal.');if(snapshot.data()?.archivedAt)throw new HttpsError('failed-precondition','Archived goals cannot be edited.');const current=Number(snapshot.data()?.currentMinor||0);await ref.update({name,targetMinor,targetDate,note,status:current>=targetMinor?'completed':'active',updatedAt:FieldValue.serverTimestamp()});return{goalId};});

export const archiveGoal = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const goalId=stringValue(request.data?.goalId,'Goal ID');const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const ref=db.collection('goals').doc(goalId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,g]=await Promise.all([transaction.get(commandRef),transaction.get(ref)]);if(c.exists)return c.data()?.result;if(!g.exists)throw new HttpsError('not-found','Goal not found.');if(g.data()?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this goal.');const now=FieldValue.serverTimestamp();const result={goalId,archived:true};transaction.update(ref,{archivedAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'archive_goal',idempotencyKey:key,result,createdAt:now});return result;});});

export const recordGoalContribution = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const goalId=stringValue(request.data?.goalId,'Goal ID');const amountMinor=positiveMoney(request.data?.amountMinor);const contributionDate=localDate(request.data?.contributionDate,'Contribution date');const note=optionalString(request.data?.note,500);const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const goalRef=db.collection('goals').doc(goalId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,g]=await Promise.all([transaction.get(commandRef),transaction.get(goalRef)]);if(c.exists)return c.data()?.result;if(!g.exists)throw new HttpsError('not-found','Goal not found.');const goal=g.data();if(goal?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this goal.');if(goal?.archivedAt||goal?.status==='completed')throw new HttpsError('failed-precondition','This goal is not accepting contributions.');const current=Number(goal?.currentMinor||0);if(!Number.isSafeInteger(current))throw new HttpsError('failed-precondition','Goal progress is invalid.');const next=current+amountMinor;const ref=db.collection('goalContributions').doc();const now=FieldValue.serverTimestamp();const result={contributionId:ref.id,goalId};transaction.create(ref,{displayId:displayId('GCT'),ownerId:uid,goalId,amountMinor,currency:goal?.currency,contributionDate,note,status:'posted',reversalOf:null,reversedBy:null,createdAt:now,updatedAt:now});transaction.update(goalRef,{currentMinor:next,status:next>=Number(goal?.targetMinor||0)?'completed':'active',updatedAt:now});createNotification(transaction,{uid,spaceId:String(goal?.spaceId||''),type:'goal_updated',title:next>=Number(goal?.targetMinor||0)?'Savings goal reached':'Savings goal updated',message:`${goal?.name||'Your goal'} now has ${(next/100).toFixed(2)} ${goal?.currency||'BND'}.`,targetPath:'/goals',actionLabel:'Open goals',now});transaction.create(commandRef,{uid,kind:'record_goal_contribution',idempotencyKey:key,result,createdAt:now});return result;});});

export const reverseGoalContribution = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const contributionId=stringValue(request.data?.contributionId,'Contribution ID');const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const originalRef=db.collection('goalContributions').doc(contributionId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,o]=await Promise.all([transaction.get(commandRef),transaction.get(originalRef)]);if(c.exists)return c.data()?.result;if(!o.exists)throw new HttpsError('not-found','Goal contribution not found.');const original=o.data();if(original?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this contribution.');if(original?.status!=='posted'||original?.reversalOf||original?.reversedBy)throw new HttpsError('failed-precondition','This contribution cannot be reversed.');const goalRef=db.collection('goals').doc(String(original?.goalId));const goal=await transaction.get(goalRef);if(!goal.exists)throw new HttpsError('not-found','Goal not found.');const amount=positiveMoney(original?.amountMinor);const next=Math.max(0,Number(goal.data()?.currentMinor||0)-amount);const reversalRef=db.collection('goalContributions').doc();const now=FieldValue.serverTimestamp();const result={contributionId:reversalRef.id,originalContributionId:contributionId};transaction.create(reversalRef,{displayId:displayId('GCT'),ownerId:uid,goalId:original?.goalId,amountMinor:amount,currency:original?.currency,contributionDate:new Date().toISOString().slice(0,10),note:`Reversal of ${original?.displayId||contributionId}`,status:'posted',reversalOf:contributionId,reversedBy:null,createdAt:now,updatedAt:now});transaction.update(originalRef,{status:'reversed',reversedBy:reversalRef.id,updatedAt:now});transaction.update(goalRef,{currentMinor:next,status:next>=Number(goal.data()?.targetMinor||0)?'completed':'active',updatedAt:now});transaction.create(commandRef,{uid,kind:'reverse_goal_contribution',idempotencyKey:key,result,createdAt:now});return result;});});

export const createCommitment = onCall({ region }, async request=>{
  const uid=requireAuth(request.auth?.uid);const type=oneOf(request.data?.type,commitmentTypes,'commitment type');const name=stringValue(request.data?.name,'Commitment name',80);const payee=optionalString(request.data?.payee,120);const spaceId=stringValue(request.data?.spaceId,'Space');const accountId=optionalString(request.data?.accountId,80)||null;const categoryId=stringValue(request.data?.categoryId,'Category ID',80);const amountMinor=positiveMoney(request.data?.amountMinor);const totalAmountMinor=type==='instalment'?positiveMoney(request.data?.totalAmountMinor):null;if(type==='instalment'&&Number(totalAmountMinor)<amountMinor)throw new HttpsError('invalid-argument','Instalment total must be at least one payment amount.');const frequency=oneOf(request.data?.frequency,commitmentFrequencies,'frequency');const startDate=localDate(request.data?.startDate,'Start date');const endDate=optionalLocalDate(request.data?.endDate,'End date');const reminderDays=integerBetween(request.data?.reminderDays,'Reminder days',0,60);const note=optionalString(request.data?.note,500);const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);
  const commandRef=db.collection('financialCommands').doc(commandId(uid,key));const spaceRef=db.collection('spaces').doc(spaceId);const memberRef=db.collection('spaceMembers').doc(`${spaceId}_${uid}`);const accountRef=accountId?db.collection('accounts').doc(accountId):null;const categoryRef=categoryId.startsWith('custom-')?db.collection('categories').doc(categoryId):null;
  return db.runTransaction(async transaction=>{const[command,space,member,account,custom]=await Promise.all([transaction.get(commandRef),transaction.get(spaceRef),transaction.get(memberRef),accountRef?transaction.get(accountRef):Promise.resolve(null),categoryRef?transaction.get(categoryRef):Promise.resolve(null)]);if(command.exists)return command.data()?.result;if(!space.exists||space.data()?.archivedAt)throw new HttpsError('failed-precondition','The selected Space is unavailable.');if(!member.exists)throw new HttpsError('permission-denied','You are not a member of this Space.');if(account){const data=assertAccount(account.data(),uid,'Account');if(data.currency!==space.data()?.currency)throw new HttpsError('failed-precondition','Account and Space currencies must match.');}const scope:Exclude<CategoryScope,'both'>=space.data()?.type==='sme'?'business':'personal';const category=categorySnapshotFromData({categoryId,requiredKind:'expense',selectedScope:scope,uid,customData:custom?.data()});const ref=db.collection('commitments').doc();const now=FieldValue.serverTimestamp();const result={commitmentId:ref.id};transaction.create(ref,{displayId:displayId(type==='bill'?'BIL':'INS'),ownerId:uid,type,name,payee,spaceId,accountId,categoryId:category.id,categoryName:category.name,categoryIcon:category.icon,categoryColor:category.color,amountMinor,totalAmountMinor,amountPaidMinor:0,sharedCycleDueDate:startDate,sharedAssignedMinor:0,sharedSettledMinor:0,currency:space.data()?.currency,frequency,startDate,nextDueDate:startDate,endDate,reminderDays,status:'active',note,archivedAt:null,stoppedAt:null,stoppedPreviousNextDueDate:null,createdAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'create_commitment',idempotencyKey:key,result,createdAt:now});return result;});
});

export const updateCommitment = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const commitmentId=stringValue(request.data?.commitmentId,'Commitment ID');const name=stringValue(request.data?.name,'Commitment name',80);const payee=optionalString(request.data?.payee,120);const accountId=optionalString(request.data?.accountId,80)||null;const categoryId=stringValue(request.data?.categoryId,'Category ID',80);const amountMinor=positiveMoney(request.data?.amountMinor);const frequency=oneOf(request.data?.frequency,commitmentFrequencies,'frequency');const nextDueDate=localDate(request.data?.nextDueDate,'Next due date');const endDate=optionalLocalDate(request.data?.endDate,'End date');const reminderDays=integerBetween(request.data?.reminderDays,'Reminder days',0,60);const note=optionalString(request.data?.note,500);const ref=db.collection('commitments').doc(commitmentId);const snapshot=await ref.get();if(!snapshot.exists)throw new HttpsError('not-found','Commitment not found.');const existing=snapshot.data();if(existing?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this commitment.');if(existing?.archivedAt)throw new HttpsError('failed-precondition','Archived commitments cannot be edited.');const totalAmountMinor=existing?.type==='instalment'?positiveMoney(request.data?.totalAmountMinor):null;if(totalAmountMinor&&totalAmountMinor<Number(existing?.amountPaidMinor||0))throw new HttpsError('failed-precondition','Total cannot be below the amount already paid.');const space=await db.collection('spaces').doc(String(existing?.spaceId)).get();const account=accountId?await db.collection('accounts').doc(accountId).get():null;if(account){const data=assertAccount(account.data(),uid,'Account');if(data.currency!==space.data()?.currency)throw new HttpsError('failed-precondition','Account and Space currencies must match.');}const custom=categoryId.startsWith('custom-')?await db.collection('categories').doc(categoryId).get():null;const scope:Exclude<CategoryScope,'both'>=space.data()?.type==='sme'?'business':'personal';const category=categorySnapshotFromData({categoryId,requiredKind:'expense',selectedScope:scope,uid,customData:custom?.data()});await ref.update({name,payee,accountId,categoryId:category.id,categoryName:category.name,categoryIcon:category.icon,categoryColor:category.color,amountMinor,totalAmountMinor,frequency,nextDueDate,endDate,reminderDays,note,status:existing?.status==='completed'&&totalAmountMinor&&Number(existing?.amountPaidMinor||0)<totalAmountMinor?'active':existing?.status,updatedAt:FieldValue.serverTimestamp()});return{commitmentId};});

export const archiveCommitment = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const commitmentId=stringValue(request.data?.commitmentId,'Commitment ID');const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const ref=db.collection('commitments').doc(commitmentId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,i]=await Promise.all([transaction.get(commandRef),transaction.get(ref)]);if(c.exists)return c.data()?.result;if(!i.exists)throw new HttpsError('not-found','Commitment not found.');if(i.data()?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this commitment.');const now=FieldValue.serverTimestamp();const result={commitmentId,archived:true};transaction.update(ref,{archivedAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'archive_commitment',idempotencyKey:key,result,createdAt:now});return result;});});

export const payCommitment = onCall({ region }, async request=>{
  const uid=requireAuth(request.auth?.uid);const commitmentId=stringValue(request.data?.commitmentId,'Commitment ID');const accountId=stringValue(request.data?.accountId,'Account');const requestedAmount=request.data?.amountMinor==null?null:positiveMoney(request.data?.amountMinor);const paymentDate=localDate(request.data?.paymentDate,'Payment date');const{paymentMethod,paymentMethodLabel}=paymentMethodValues(request.data||{});const note=optionalString(request.data?.note,500);const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));const commitmentRef=db.collection('commitments').doc(commitmentId);const accountRef=db.collection('accounts').doc(accountId);const budgetCandidateRefs=(await db.collection('budgets').where('ownerId','==',uid).get()).docs.map(item=>item.ref);
  return db.runTransaction(async transaction=>{const[command,commitmentSnapshot,accountSnapshot,budgetSnapshots]=await Promise.all([transaction.get(commandRef),transaction.get(commitmentRef),transaction.get(accountRef),Promise.all(budgetCandidateRefs.map(ref=>transaction.get(ref)))]);if(command.exists)return command.data()?.result;if(!commitmentSnapshot.exists)throw new HttpsError('not-found','Commitment not found.');const commitment=commitmentSnapshot.data();if(commitment?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this commitment.');if(commitment?.archivedAt||commitment?.status==='completed')throw new HttpsError('failed-precondition','This commitment is not active.');if(Number(commitment?.sharedAssignedMinor||0)>Number(commitment?.sharedSettledMinor||0))throw new HttpsError('failed-precondition','This commitment has open shared bill assignments. Complete or reverse them from Sharing first.');const account=assertAccount(accountSnapshot.data(),uid,'Account');if(account.currency!==commitment?.currency)throw new HttpsError('failed-precondition','Account and commitment currencies must match.');const remaining=commitment?.type==='instalment'?Math.max(0,Number(commitment?.totalAmountMinor||0)-Number(commitment?.amountPaidMinor||0)):Number(commitment?.amountMinor||0);const amountMinor=requestedAmount??Math.min(Number(commitment?.amountMinor||0),remaining);if(commitment?.type==='instalment'&&amountMinor>remaining)throw new HttpsError('invalid-argument','Payment cannot exceed the remaining instalment balance.');const transactionRef=db.collection('transactions').doc();const paymentRef=db.collection('commitmentPayments').doc();const now=FieldValue.serverTimestamp();const delta=accountEffect(account.type,'out',amountMinor);const budgetIds=matchingBudgetIds(budgetSnapshots,{spaceId:String(commitment?.spaceId),categoryId:String(commitment?.categoryId),transactionDate:paymentDate});updateAccountBalance(transaction,accountRef,account,delta);const ledgerEntryId=createLedgerEntry(transaction,{accountId,ownerId:uid,spaceId:String(commitment?.spaceId),transactionId:transactionRef.id,entryType:'commitment_payment',amountMinor:delta,currency:account.currency,idempotencyKey:key,now});if(budgetIds.length)updateBudgetsSpent(transaction,budgetSnapshots,budgetIds,amountMinor);const previousNextDueDate=commitment?.nextDueDate??commitment?.startDate??null;const previousStatus=commitment?.status==='completed'?'completed':'active';const nextPaid=Number(commitment?.amountPaidMinor||0)+amountMinor;let nextDueDate=addFrequency(String(previousNextDueDate||paymentDate),oneOf(commitment?.frequency,commitmentFrequencies,'frequency'));let nextStatus:'active'|'completed'='active';if(commitment?.type==='instalment'&&nextPaid>=Number(commitment?.totalAmountMinor||0)){nextStatus='completed';nextDueDate=null;}else if(commitment?.type==='bill'&&commitment?.frequency==='once'){nextStatus='completed';nextDueDate=null;}else if(nextDueDate&&commitment?.endDate&&nextDueDate>commitment.endDate){nextStatus='completed';nextDueDate=null;}transaction.create(transactionRef,{displayId:displayId('TXN'),ownerId:uid,createdBy:uid,type:'expense',status:'posted',spaceId:commitment?.spaceId,accountId,destinationAccountId:null,amountMinor,currency:account.currency,category:commitment?.categoryName,categoryId:commitment?.categoryId,categoryIcon:commitment?.categoryIcon,categoryColor:commitment?.categoryColor,categoryScope:'both',categoryIsSystem:!String(commitment?.categoryId).startsWith('custom-'),counterparty:commitment?.payee||commitment?.name,note:note||`Payment for ${commitment?.name}`,paymentMethod,paymentMethodLabel,transactionDate:paymentDate,reversalOf:null,reversedBy:null,budgetIds,commitmentId,commitmentPaymentId:paymentRef.id,createdAt:now,postedAt:now,updatedAt:now});transaction.create(paymentRef,{displayId:displayId('PAY'),ownerId:uid,commitmentId,transactionId:transactionRef.id,amountMinor,currency:account.currency,paymentDate,paymentMethod,paymentMethodLabel,dueDateApplied:previousNextDueDate,previousNextDueDate,previousStatus,status:'posted',reversedBy:null,createdAt:now,updatedAt:now});transaction.update(commitmentRef,{accountId,amountPaidMinor:nextPaid,nextDueDate,status:nextStatus,sharedCycleDueDate:nextDueDate,sharedAssignedMinor:0,sharedSettledMinor:0,updatedAt:now});const result={transactionId:transactionRef.id,paymentId:paymentRef.id,ledgerEntryId};transaction.create(commandRef,{uid,kind:'pay_commitment',idempotencyKey:key,result,createdAt:now});return result;});
});

// v0.7 Collaboration and WhatsApp coordination
const collaborationRoles = ['admin', 'contributor', 'payer', 'viewer'] as const;
const approvalModes = ['none', 'owner_approval'] as const;
type CollaborationRole = (typeof collaborationRoles)[number];

function normalizedEmail(value: unknown): string {
  const email = stringValue(value, 'Email address', 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  return email;
}

function optionalNormalizedEmail(value: unknown): string | null {
  if (value == null || String(value).trim() === '') return null;
  return normalizedEmail(value);
}

function optionalPhone(value: unknown): string {
  const phone = optionalString(value, 32);
  if (phone && !/^\+?[0-9 ()-]{7,32}$/.test(phone)) throw new HttpsError('invalid-argument', 'Enter a valid WhatsApp number.');
  return phone;
}

async function requireActiveSpaceMember(spaceId: string, uid: string): Promise<DocumentData> {
  const snapshot = await db.collection('spaceMembers').doc(`${spaceId}_${uid}`).get();
  if (!snapshot.exists) throw new HttpsError('permission-denied', 'You are not a member of this Space.');
  const member = snapshot.data() || {};
  if (member.status === 'suspended' || member.status === 'removed') throw new HttpsError('permission-denied', 'Your Space access is not active.');
  return member;
}

async function requireSpaceManager(spaceId: string, uid: string): Promise<DocumentData> {
  const member = await requireActiveSpaceMember(spaceId, uid);
  if (member.role !== 'owner' && member.role !== 'admin') throw new HttpsError('permission-denied', 'Only the Space owner or an admin can manage collaboration.');
  return member;
}

function createActivity(transaction: Transaction, input: { spaceId: string; actorUid: string; actorName?: string; action: string; targetType?: string; targetId?: string; summary: string; now: FieldValue }) {
  const ref = db.collection('spaceActivities').doc();
  transaction.create(ref, {
    displayId: displayId('ACT'), spaceId: input.spaceId, actorUid: input.actorUid,
    actorName: input.actorName || '', action: input.action, targetType: input.targetType || '',
    targetId: input.targetId || '', summary: input.summary, createdAt: input.now,
  });
}

function createNotification(transaction: Transaction, input: { uid: string; spaceId?: string | null; type: string; title: string; message: string; targetPath?: string | null; actionLabel?: string | null; now: FieldValue }) {
  const ref = db.collection('userNotifications').doc();
  transaction.create(ref, {
    uid: input.uid, spaceId: input.spaceId || null, type: input.type, title: input.title, message: input.message,
    targetPath: input.targetPath || null, actionLabel: input.actionLabel || null, source: 'activity',
    itemType: null, itemId: null, dueDate: null, reminderKey: null,
    readAt: null, createdAt: input.now,
  });
}


const chatRecordTypes = [
  'expense',
  'shared_bill',
  'commitment',
  'trip_task',
  'booking',
  'budget',
  'payout',
  'collection_item',
  'approval',
] as const;

export const sendSpaceChatMessage = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  const body = typeof request.data?.body === 'string'
    ? request.data.body.trim()
    : '';

  if (body.length > 2000) {
    throw new HttpsError('invalid-argument', 'Messages can be up to 2,000 characters.');
  }

  const member = await requireActiveSpaceMember(spaceId, uid);
  const spaceSnapshot = await db.collection('spaces').doc(spaceId).get();

  if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) {
    throw new HttpsError('failed-precondition', 'This Space is unavailable.');
  }

  const senderName = String(
    member.displayName
    || request.auth?.token.name
    || request.auth?.token.email
    || 'Space member',
  );

  const rawMentionUids = Array.isArray(request.data?.mentionUids)
    ? request.data.mentionUids
    : [];

  if (rawMentionUids.length > 20) {
    throw new HttpsError('invalid-argument', 'Mention up to 20 members in one message.');
  }

  const mentionUids: string[] = Array.from(
    new Set<string>(
      rawMentionUids
        .map((value: unknown): string => String(value || '').trim())
        .filter((value: string): boolean => Boolean(value && value !== uid)),
    ),
  );

  if (mentionUids.some((value) => value.length > 80)) {
    throw new HttpsError('invalid-argument', 'One mentioned member is invalid.');
  }

  const mentionMembers = await Promise.all(
    mentionUids.map(async (mentionedUid) => {
      const snapshot = await db
        .collection('spaceMembers')
        .doc(spaceId + '_' + mentionedUid)
        .get();

      if (
        !snapshot.exists
        || (
          snapshot.data()?.status
          && snapshot.data()?.status !== 'active'
        )
      ) {
        throw new HttpsError(
          'invalid-argument',
          'One mentioned member is no longer active in this Space.',
        );
      }

      return {
        uid: mentionedUid,
        label: String(
          snapshot.data()?.displayName
          || snapshot.data()?.email
          || 'Member',
        ).slice(0, 120),
      };
    }),
  );

  let recordRef: {
    type: string;
    id: string;
    label: string;
    targetPath: string;
  } | null = null;

  const rawRecordRef = request.data?.recordRef;

  if (rawRecordRef != null) {
    if (typeof rawRecordRef !== 'object' || Array.isArray(rawRecordRef)) {
      throw new HttpsError('invalid-argument', 'Record reference is invalid.');
    }

    const type = String(rawRecordRef.type || '').trim();
    const id = String(rawRecordRef.id || '').trim();
    const label = String(rawRecordRef.label || '').trim();
    const targetPath = String(rawRecordRef.targetPath || '').trim();

    if (!(chatRecordTypes as readonly string[]).includes(type)) {
      throw new HttpsError('invalid-argument', 'Record type is not supported in Chat.');
    }

    if (!id || id.length > 120 || !label || label.length > 160) {
      throw new HttpsError('invalid-argument', 'Record reference is incomplete.');
    }

    if (
      !targetPath
      || targetPath.length > 500
      || !targetPath.startsWith('/spaces/' + spaceId)
    ) {
      throw new HttpsError('invalid-argument', 'Record link must stay inside this Space.');
    }

    recordRef = { type, id, label, targetPath };
  }

  let attachment: {
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  } | null = null;

  const rawAttachment = request.data?.attachment;

  if (rawAttachment != null) {
    if (typeof rawAttachment !== 'object' || Array.isArray(rawAttachment)) {
      throw new HttpsError('invalid-argument', 'Attachment metadata is invalid.');
    }

    const storagePath = String(rawAttachment.storagePath || '').trim();
    const fileName = String(rawAttachment.fileName || '').trim();
    const contentType = String(rawAttachment.contentType || '').trim();
    const sizeBytes = Number(rawAttachment.sizeBytes);

    const requiredPrefix =
      'spaces/'
      + spaceId
      + '/chat-attachments/'
      + uid
      + '/';

    if (
      !storagePath.startsWith(requiredPrefix)
      || storagePath.length > 700
      || !fileName
      || fileName.length > 160
    ) {
      throw new HttpsError('invalid-argument', 'Attachment path is invalid.');
    }

    if (
      !contentType.startsWith('image/')
      && contentType !== 'application/pdf'
    ) {
      throw new HttpsError('invalid-argument', 'Only images and PDFs can be attached.');
    }

    if (
      !Number.isSafeInteger(sizeBytes)
      || sizeBytes <= 0
      || sizeBytes >= 10 * 1024 * 1024
    ) {
      throw new HttpsError('invalid-argument', 'Attachment must be smaller than 10 MB.');
    }

    attachment = {
      storagePath,
      fileName,
      contentType,
      sizeBytes,
    };
  }

  let replyTo: {
    messageId: string;
    bodyPreview: string;
  } | null = null;

  const replyToMessageId =
    typeof request.data?.replyToMessageId === 'string'
      ? request.data.replyToMessageId.trim()
      : '';

  if (replyToMessageId) {
    if (replyToMessageId.length > 120) {
      throw new HttpsError('invalid-argument', 'Reply message is invalid.');
    }

    const replySnapshot = await db
      .collection('spaceMessages')
      .doc(replyToMessageId)
      .get();

    if (
      !replySnapshot.exists
      || replySnapshot.data()?.spaceId !== spaceId
    ) {
      throw new HttpsError('invalid-argument', 'The replied message is not in this Space.');
    }

    const preview = String(
      replySnapshot.data()?.body
      || replySnapshot.data()?.recordRef?.label
      || replySnapshot.data()?.fileName
      || 'Message',
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    replyTo = {
      messageId: replyToMessageId,
      bodyPreview: preview || 'Message',
    };
  }

  if (!body && !recordRef && !attachment) {
    throw new HttpsError(
      'invalid-argument',
      'Write a message or attach a record or file first.',
    );
  }

  const commandRef = db
    .collection('collaborationCommands')
    .doc(commandId(uid, key));

  const messageRef = db.collection('spaceMessages').doc();

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);

    if (command.exists) {
      return command.data()?.result;
    }

    const now = FieldValue.serverTimestamp();

    transaction.create(messageRef, {
      spaceId,
      senderUid: uid,
      body,
      mentionLabels: mentionMembers.map((item) => item.label),
      recordRef,
      replyTo,
      storagePath: attachment?.storagePath || null,
      fileName: attachment?.fileName || null,
      contentType: attachment?.contentType || null,
      sizeBytes: attachment?.sizeBytes || null,
      createdAt: now,
      updatedAt: now,
    });

    for (const mentioned of mentionMembers) {
      createNotification(transaction, {
        uid: mentioned.uid,
        spaceId,
        type: recordRef ? 'record_mention' : 'space_mention',
        title: recordRef
          ? senderName + ' mentioned you with a record'
          : senderName + ' mentioned you in Chat',
        message: recordRef
          ? recordRef.label
          : (body.slice(0, 180) || 'Open the Space Chat to reply.'),
        targetPath:
          '/spaces/'
          + spaceId
          + '?tab=chat&messageId='
          + messageRef.id,
        actionLabel: recordRef ? 'Open discussion' : 'Open chat',
        now,
      });
    }

    const result = {
      messageId: messageRef.id,
    };

    transaction.create(commandRef, {
      uid,
      kind: 'send_space_chat_message',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

function optionalCollaborationDate(value: unknown, label: string): string | null {
  if (value == null || value === '') return null;
  const next = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) {
    throw new HttpsError('invalid-argument', label + ' must use YYYY-MM-DD.');
  }
  return next;
}

function collaborationActorName(member: DocumentData, uid: string) {
  return String(member.displayName || member.email || uid || 'Member').trim().slice(0, 120);
}

export const createSpaceAnnouncement = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const title = stringValue(request.data?.title, 'Announcement title', 120);
  const body = stringValue(request.data?.body, 'Announcement message', 2000);
  const expiresOn = optionalCollaborationDate(
    request.data?.expiresOn,
    'Announcement expiry',
  );
  const idempotencyKey = stringValue(
    request.data?.idempotencyKey,
    'Idempotency key',
    64,
  );
  const member = await requireSpaceManager(spaceId, uid);
  const actorName = collaborationActorName(member, uid);
  const ref = db
    .collection('spaceAnnouncements')
    .doc(commandId(uid, idempotencyKey));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return { announcementId: ref.id };

    const now = FieldValue.serverTimestamp();
    transaction.create(ref, {
      displayId: displayId('ANN'),
      spaceId,
      title,
      body,
      createdBy: uid,
      createdByName: actorName,
      pinnedAt: null,
      expiresOn,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName,
      action: 'announcement_created',
      targetType: 'announcement',
      targetId: ref.id,
      summary: 'Posted announcement: ' + title,
      now,
    });

    return { announcementId: ref.id };
  });
});

export const setSpaceAnnouncementState = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const announcementId = stringValue(
    request.data?.announcementId,
    'Announcement ID',
    160,
  );
  const action = String(request.data?.action || '');

  if (!['pin', 'unpin', 'archive'].includes(action)) {
    throw new HttpsError(
      'invalid-argument',
      'Choose pin, unpin, or archive.',
    );
  }

  const member = await requireSpaceManager(spaceId, uid);
  const actorName = collaborationActorName(member, uid);
  const ref = db.collection('spaceAnnouncements').doc(announcementId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Announcement not found.');
    }

    const current = snapshot.data() || {};
    if (String(current.spaceId || '') !== spaceId) {
      throw new HttpsError(
        'permission-denied',
        'Announcement does not belong to this Space.',
      );
    }
    if (current.archivedAt && action !== 'archive') {
      throw new HttpsError(
        'failed-precondition',
        'Archived announcements cannot be changed.',
      );
    }

    const now = FieldValue.serverTimestamp();
    const updates: DocumentData = { updatedAt: now };

    if (action === 'pin') updates.pinnedAt = now;
    if (action === 'unpin') updates.pinnedAt = null;
    if (action === 'archive') {
      updates.archivedAt = now;
      updates.pinnedAt = null;
    }

    transaction.update(ref, updates);

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName,
      action: 'announcement_' + action,
      targetType: 'announcement',
      targetId: ref.id,
      summary:
        action === 'archive'
          ? 'Archived announcement: ' + String(current.title || 'Announcement')
          : action === 'pin'
            ? 'Pinned announcement: ' + String(current.title || 'Announcement')
            : 'Unpinned announcement: ' +
              String(current.title || 'Announcement'),
      now,
    });

    return { announcementId: ref.id, action };
  });
});

export const createSpacePoll = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const question = stringValue(request.data?.question, 'Poll question', 240);
  const idempotencyKey = stringValue(
    request.data?.idempotencyKey,
    'Idempotency key',
    64,
  );
  const rawOptions = Array.isArray(request.data?.options)
    ? request.data.options
    : [];
  const labels = rawOptions
    .map((value: unknown) => String(value || '').trim())
    .filter(Boolean);

  if (labels.length < 2 || labels.length > 8) {
    throw new HttpsError(
      'invalid-argument',
      'A poll needs between 2 and 8 options.',
    );
  }
  if (labels.some((label: string) => label.length > 120)) {
    throw new HttpsError(
      'invalid-argument',
      'Poll options must be 120 characters or fewer.',
    );
  }
  if (
    new Set(labels.map((label: string) => label.toLowerCase())).size !==
    labels.length
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Poll options must be different.',
    );
  }

  const options = labels.map((label: string, index: number) => ({
    id: 'option_' + String(index + 1),
    label,
  }));
  const member = await requireSpaceManager(spaceId, uid);
  const actorName = collaborationActorName(member, uid);
  const ref = db.collection('spacePolls').doc(commandId(uid, idempotencyKey));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return { pollId: ref.id };

    const now = FieldValue.serverTimestamp();
    transaction.create(ref, {
      displayId: displayId('POL'),
      spaceId,
      question,
      options,
      status: 'open',
      createdBy: uid,
      createdByName: actorName,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName,
      action: 'poll_created',
      targetType: 'poll',
      targetId: ref.id,
      summary: 'Opened poll: ' + question,
      now,
    });

    return { pollId: ref.id };
  });
});

export const voteSpacePoll = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const pollId = stringValue(request.data?.pollId, 'Poll ID', 160);
  const optionId = stringValue(request.data?.optionId, 'Poll option', 80);

  await requireActiveSpaceMember(spaceId, uid);

  const pollRef = db.collection('spacePolls').doc(pollId);
  const voteRef = db.collection('spacePollVotes').doc(commandId(uid, pollId));

  return db.runTransaction(async (transaction) => {
    const [pollSnapshot, voteSnapshot] = await Promise.all([
      transaction.get(pollRef),
      transaction.get(voteRef),
    ]);

    if (!pollSnapshot.exists) {
      throw new HttpsError('not-found', 'Poll not found.');
    }

    const poll = pollSnapshot.data() || {};
    if (String(poll.spaceId || '') !== spaceId) {
      throw new HttpsError(
        'permission-denied',
        'Poll does not belong to this Space.',
      );
    }
    if (poll.status !== 'open') {
      throw new HttpsError(
        'failed-precondition',
        'This poll is closed.',
      );
    }

    const options = Array.isArray(poll.options) ? poll.options : [];
    if (
      !options.some(
        (option: DocumentData) => String(option.id || '') === optionId,
      )
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Choose a valid poll option.',
      );
    }

    const now = FieldValue.serverTimestamp();

    if (voteSnapshot.exists) {
      transaction.update(voteRef, {
        optionId,
        updatedAt: now,
      });
    } else {
      transaction.create(voteRef, {
        spaceId,
        pollId,
        uid,
        optionId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { voteId: voteRef.id, optionId };
  });
});

export const setSpacePollStatus = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const pollId = stringValue(request.data?.pollId, 'Poll ID', 160);
  const status = String(request.data?.status || '');

  if (!['open', 'closed'].includes(status)) {
    throw new HttpsError(
      'invalid-argument',
      'Poll status must be open or closed.',
    );
  }

  const member = await requireSpaceManager(spaceId, uid);
  const actorName = collaborationActorName(member, uid);
  const pollRef = db.collection('spacePolls').doc(pollId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(pollRef);
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Poll not found.');
    }

    const poll = snapshot.data() || {};
    if (String(poll.spaceId || '') !== spaceId) {
      throw new HttpsError(
        'permission-denied',
        'Poll does not belong to this Space.',
      );
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(pollRef, {
      status,
      closedAt: status === 'closed' ? now : null,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName,
      action: status === 'closed' ? 'poll_closed' : 'poll_reopened',
      targetType: 'poll',
      targetId: pollRef.id,
      summary:
        status === 'closed'
          ? 'Closed poll: ' + String(poll.question || 'Poll')
          : 'Reopened poll: ' + String(poll.question || 'Poll'),
      now,
    });

    return { pollId: pollRef.id, status };
  });
});

function approvalOptionalText(value: unknown, maximum: number): string {
  if (value == null) return '';
  return String(value).trim().slice(0, maximum);
}

const approvalTargetTypes = [
  'expense',
  'contribution_adjustment',
  'booking',
  'household_purchase',
  'sme_purchase',
  'sme_payout',
  'custom_action',
  'other',
] as const;

export const requestSpaceApproval = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const title = stringValue(request.data?.title, 'Approval title', 160);
  const targetType = oneOf(request.data?.targetType, approvalTargetTypes, 'Approval target type');
  const targetId = approvalOptionalText(request.data?.targetId, 160) || null;
  const rawTargetPath = approvalOptionalText(request.data?.targetPath, 500);
  const targetPath = rawTargetPath.startsWith('/') ? rawTargetPath : null;
  const requestNote = approvalOptionalText(request.data?.requestNote, 1200);
  const idempotencyKey = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  let amountMinor: number | null = null;
  let currency: string | null = null;
  if (request.data?.amountMinor != null) {
    const numericAmount = Number(request.data.amountMinor);
    if (!Number.isFinite(numericAmount) || numericAmount < 0 || numericAmount > Number.MAX_SAFE_INTEGER) {
      throw new HttpsError('invalid-argument', 'Approval amount is invalid.');
    }
    amountMinor = Math.round(numericAmount);
    currency = stringValue(request.data?.currency, 'Currency', 12).toUpperCase();
  }

  const member = await requireActiveSpaceMember(spaceId, uid);
  const actorName = collaborationActorName(member, String(request.auth?.token.name || request.auth?.token.email || uid));
  const ref = db.collection('spaceApprovals').doc(commandId(uid, idempotencyKey));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return { approvalId: ref.id, status: existing.data()?.status || 'pending' };

    const now = FieldValue.serverTimestamp();
    transaction.create(ref, {
      displayId: displayId('APR'),
      spaceId,
      title,
      requestNote,
      targetType,
      targetId,
      targetPath,
      amountMinor,
      currency,
      status: 'pending',
      requestedBy: uid,
      requestedByName: actorName,
      requestedAt: now,
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      decisionNote: '',
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName,
      action: 'approval_requested',
      targetType: 'approval',
      targetId: ref.id,
      summary: 'Requested approval: ' + title,
      now,
    });

    return { approvalId: ref.id, status: 'pending' };
  });
});

export const reviewSpaceApproval = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const approvalId = stringValue(request.data?.approvalId, 'Approval ID', 160);
  const decision = oneOf(request.data?.decision, ['approved', 'rejected'] as const, 'Approval decision');
  const decisionNote = approvalOptionalText(request.data?.decisionNote, 1000);

  const member = await requireSpaceManager(spaceId, uid);
  const actorName = collaborationActorName(member, String(request.auth?.token.name || request.auth?.token.email || uid));
  const ref = db.collection('spaceApprovals').doc(approvalId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Approval request not found.');

    const current = snapshot.data() || {};
    if (String(current.spaceId || '') !== spaceId) throw new HttpsError('permission-denied', 'Approval request does not belong to this Space.');

    if (current.status !== 'pending') {
      if (current.status === decision) return { approvalId: ref.id, status: current.status };
      throw new HttpsError('failed-precondition', 'Only pending approval requests can be reviewed.');
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(ref, {
      status: decision,
      reviewedBy: uid,
      reviewedByName: actorName,
      reviewedAt: now,
      decisionNote,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName,
      action: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
      targetType: 'approval',
      targetId: ref.id,
      summary: (decision === 'approved' ? 'Approved: ' : 'Rejected: ') + String(current.title || 'Approval request'),
      now,
    });

    if (current.requestedBy && current.requestedBy !== uid) {
      createNotification(transaction, {
        uid: String(current.requestedBy),
        spaceId,
        type: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
        title: decision === 'approved' ? 'Approval request approved' : 'Approval request rejected',
        message: String(current.title || 'Your approval request'),
        targetPath: current.targetPath || ('/spaces/' + spaceId + '?tab=approvals'),
        actionLabel: current.targetPath ? 'Open record' : 'Open approvals',
        now,
      });
    }

    return { approvalId: ref.id, status: decision };
  });
});

export const cancelSpaceApproval = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const approvalId = stringValue(request.data?.approvalId, 'Approval ID', 160);

  const member = await requireActiveSpaceMember(spaceId, uid);
  const actorName = collaborationActorName(member, String(request.auth?.token.name || request.auth?.token.email || uid));
  const ref = db.collection('spaceApprovals').doc(approvalId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Approval request not found.');

    const current = snapshot.data() || {};
    if (String(current.spaceId || '') !== spaceId) throw new HttpsError('permission-denied', 'Approval request does not belong to this Space.');
    if (String(current.requestedBy || '') !== uid) throw new HttpsError('permission-denied', 'Only the requester can cancel this approval request.');

    if (current.status === 'cancelled') return { approvalId: ref.id, status: 'cancelled' };
    if (current.status !== 'pending') throw new HttpsError('failed-precondition', 'Only pending approval requests can be cancelled.');

    const now = FieldValue.serverTimestamp();
    transaction.update(ref, {
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName,
      action: 'approval_cancelled',
      targetType: 'approval',
      targetId: ref.id,
      summary: 'Cancelled approval request: ' + String(current.title || 'Approval request'),
      now,
    });

    return { approvalId: ref.id, status: 'cancelled' };
  });
});

async function requireSmeSpaceOwner(spaceId: string, uid: string): Promise<{ space: DocumentData; member: DocumentData }> {
  const [spaceSnapshot, member] = await Promise.all([
    db.collection('spaces').doc(spaceId).get(),
    requireActiveSpaceMember(spaceId, uid),
  ]);
  if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) throw new HttpsError('not-found', 'SME Space not found.');
  const space = spaceSnapshot.data() || {};
  if (space.type !== 'sme') throw new HttpsError('failed-precondition', 'Point of sale is only available inside an SME Space.');
  if (space.ownerId !== uid || member.role !== 'owner') throw new HttpsError('permission-denied', 'Only the SME Space owner can change POS setup.');
  return { space, member };
}

async function hasMarketplacePosRecords(spaceId: string): Promise<boolean> {
  const collections = ['smePosSellers', 'smePosListings', 'smePosSales'];
  const [access, ...snapshots] = await Promise.all([
    db.collection('smePosAccess').where('spaceId', '==', spaceId).get(),
    ...collections.map((name) => db.collection(name).where('spaceId', '==', spaceId).limit(1).get()),
  ]);
  const activeSellerAccess = access.docs.some((item) => item.data().role === 'seller' && item.data().status === 'active');
  return activeSellerAccess || snapshots.some((snapshot) => !snapshot.empty);
}

export const saveSmePosSetup = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const mode = oneOf(request.data?.mode, smePosModes, 'POS mode');
  const shopName = stringValue(request.data?.shopName, 'Shop name', 100);
  const receiptName = stringValue(request.data?.receiptName, 'Receipt name', 100);
  const receiptFooter = optionalString(request.data?.receiptFooter, 240);
  const defaultPaymentAccountId = optionalString(request.data?.defaultPaymentAccountId, 80) || null;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const { space, member } = await requireSmeSpaceOwner(spaceId, uid);
  const settingsRef = db.collection('smePosSettings').doc(spaceId);
  const settingsSnapshot = await settingsRef.get();
  const existing = settingsSnapshot.data() || null;

  if (existing?.mode === 'marketplace_consignment' && mode === 'standard' && existing.status !== 'draft' && await hasMarketplacePosRecords(spaceId)) {
    throw new HttpsError('failed-precondition', 'This shop has Marketplace seller or sales records. Keep Marketplace POS so the history stays correct.');
  }

  if (defaultPaymentAccountId) {
    const accountSnapshot = await db.collection('accounts').doc(defaultPaymentAccountId).get();
    const account = assertAccount(accountSnapshot.data(), uid, 'Default payment account');
    const accountData = accountSnapshot.data() || {};
    if (account.currency !== space.currency) throw new HttpsError('failed-precondition', 'The payment account and SME Space must use the same currency.');
    if (accountData.classification !== 'business') throw new HttpsError('failed-precondition', 'Choose a business account for the POS.');
    requireSmePosPaymentAccountForSpace(existing || {}, accountData, defaultPaymentAccountId, spaceId);
  }

  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const accessRef = db.collection('smePosAccess').doc(`${spaceId}_${uid}`);
  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;
    const current = await transaction.get(settingsRef);
    const currentData = current.data() || {};
    const now = FieldValue.serverTimestamp();
    const result = { spaceId, mode, status: currentData.status || 'draft' };
    const payload = {
      displayId: currentData.displayId || displayId('POS'),
      spaceId,
      ownerId: uid,
      mode,
      status: currentData.status || 'draft',
      shopName,
      receiptName,
      receiptFooter,
      defaultPaymentAccountId,
      paymentAccountIds: currentData.paymentAccountIds ?? null,
      currency: space.currency || 'BND',
      timezone: space.timezone || 'Asia/Brunei',
      setupVersion: 1,
      activatedAt: currentData.activatedAt || null,
      pausedAt: currentData.pausedAt || null,
      createdAt: currentData.createdAt || now,
      updatedAt: now,
    };
    transaction.set(settingsRef, payload, { merge: true });
    transaction.set(accessRef, {
      spaceId,
      uid,
      role: 'owner',
      status: 'active',
      displayName: member.displayName || request.auth?.token.name || '',
      email: member.email || request.auth?.token.email || '',
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: member.displayName || member.email,
      action: current.exists ? 'pos_settings_updated' : 'pos_setup_created',
      targetType: 'sme_pos',
      targetId: spaceId,
      summary: `${current.exists ? 'Updated' : 'Created'} ${mode === 'standard' ? 'Standard POS' : 'Marketplace Consignment POS'} setup for ${shopName}.`,
      now,
    });
    transaction.create(commandRef, { uid, kind: 'save_sme_pos_setup', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const setSmePosStatus = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const status = oneOf(request.data?.status, smePosStatuses, 'POS status');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const { member } = await requireSmeSpaceOwner(spaceId, uid);
  const settingsRef = db.collection('smePosSettings').doc(spaceId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, settings] = await Promise.all([transaction.get(commandRef), transaction.get(settingsRef)]);
    if (command.exists) return command.data()?.result;
    if (!settings.exists) throw new HttpsError('failed-precondition', 'Save the POS setup before changing its status.');
    const now = FieldValue.serverTimestamp();
    const result = { spaceId, status };
    transaction.update(settingsRef, {
      status,
      activatedAt: status === 'active' ? (settings.data()?.activatedAt || now) : settings.data()?.activatedAt || null,
      pausedAt: status === 'paused' ? now : null,
      updatedAt: now,
    });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: member.displayName || member.email,
      action: status === 'active' ? 'pos_activated' : 'pos_paused',
      targetType: 'sme_pos',
      targetId: spaceId,
      summary: `${status === 'active' ? 'Activated' : 'Paused'} the SME POS.`,
      now,
    });
    transaction.create(commandRef, { uid, kind: 'set_sme_pos_status', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const setSmePosAccessRole = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const memberUid = stringValue(request.data?.memberUid, 'Member ID', 128);
  const role = oneOf(request.data?.role, smePosRoles, 'POS role');
  const active = request.data?.active === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const { space, member } = await requireSmeSpaceOwner(spaceId, uid);
  if (memberUid === uid || memberUid === space.ownerId) throw new HttpsError('failed-precondition', 'The POS owner role follows SME Space ownership.');

  const [settings, targetMember] = await Promise.all([
    db.collection('smePosSettings').doc(spaceId).get(),
    db.collection('spaceMembers').doc(`${spaceId}_${memberUid}`).get(),
  ]);
  if (!settings.exists) throw new HttpsError('failed-precondition', 'Save the POS setup before adding team access.');
  if (!targetMember.exists || ['suspended', 'removed'].includes(String(targetMember.data()?.status || ''))) {
    throw new HttpsError('failed-precondition', 'Choose an active member of this SME Space.');
  }
  if (role === 'seller' && settings.data()?.mode !== 'marketplace_consignment') {
    throw new HttpsError('failed-precondition', 'Seller access is only available in Marketplace Consignment POS.');
  }

  const accessRef = db.collection('smePosAccess').doc(`${spaceId}_${memberUid}`);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;
    const now = FieldValue.serverTimestamp();
    const result = { spaceId, memberUid, role, active };
    transaction.set(accessRef, {
      spaceId,
      uid: memberUid,
      role,
      status: active ? 'active' : 'removed',
      displayName: targetMember.data()?.displayName || '',
      email: targetMember.data()?.email || '',
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: member.displayName || member.email,
      action: active ? 'pos_access_added' : 'pos_access_removed',
      targetType: 'member',
      targetId: memberUid,
      summary: active ? `Added ${targetMember.data()?.displayName || targetMember.data()?.email || 'a member'} as POS ${role}.` : 'Removed POS access for a member.',
      now,
    });
    transaction.create(commandRef, { uid, kind: 'set_sme_pos_access', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});



interface SmePosActorContext {
  role: SmePosActorRole;
  settings: DocumentData;
  space: DocumentData;
  member: DocumentData;
}

async function requireSmePosActor(spaceId: string, uid: string, allowed: readonly SmePosActorRole[]): Promise<SmePosActorContext> {
  const [spaceSnapshot, memberSnapshot, settingsSnapshot, accessSnapshot] = await Promise.all([
    db.collection('spaces').doc(spaceId).get(),
    db.collection('spaceMembers').doc(`${spaceId}_${uid}`).get(),
    db.collection('smePosSettings').doc(spaceId).get(),
    db.collection('smePosAccess').doc(`${spaceId}_${uid}`).get(),
  ]);
  if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt || spaceSnapshot.data()?.type !== 'sme') {
    throw new HttpsError('failed-precondition', 'Choose an active SME Space.');
  }
  if (!memberSnapshot.exists || ['suspended', 'removed'].includes(String(memberSnapshot.data()?.status || ''))) {
    throw new HttpsError('permission-denied', 'You are not an active member of this SME Space.');
  }
  if (!settingsSnapshot.exists) throw new HttpsError('failed-precondition', 'Set up the SME POS first.');
  const space = spaceSnapshot.data() || {};
  const member = memberSnapshot.data() || {};
  let role: SmePosActorRole | null = null;
  if (space.ownerId === uid && member.role === 'owner') role = 'owner';
  else if (accessSnapshot.exists && accessSnapshot.data()?.status === 'active') role = oneOf(accessSnapshot.data()?.role, smePosRoles, 'POS role');
  if (!role || !allowed.includes(role)) throw new HttpsError('permission-denied', 'Your POS role does not allow this action.');
  return { role, settings: settingsSnapshot.data() || {}, space, member };
}

function smePosQuantity(value: unknown, field: string, maximum = 999_999): number {
  return integerBetween(value, field, 0, maximum);
}

function smePosBarcode(value: unknown): { barcode: string; barcodeKey: string } {
  const barcode = optionalString(value, 240);
  if (!barcode) return { barcode: '', barcodeKey: '' };
  const hasControlCharacter = Array.from(barcode).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
  if (hasControlCharacter) {
    throw new HttpsError('invalid-argument', 'Barcode contains unsupported control characters.');
  }
  return { barcode, barcodeKey: barcode.normalize('NFKC').toLowerCase() };
}

function smePosItemPhotoPath(value: unknown, spaceId: string): string | null {
  if (value == null || value === '') return null;
  const photoPath = stringValue(value, 'Item photo', 500);
  const prefix = `spaces/${spaceId}/sme-pos-items/`;
  if (!photoPath.startsWith(prefix) || photoPath.includes('..') || photoPath.endsWith('/')) {
    throw new HttpsError('invalid-argument', 'Item photo does not belong to this SME Space.');
  }
  return photoPath;
}

function assertUniqueSmePosBarcode(
  documents: QueryDocumentSnapshot[],
  currentId: string,
  barcodeKey: string,
  recordLabel: string,
) {
  if (!barcodeKey) return;
  const duplicate = documents.find((item) => item.id !== currentId && String(item.data().barcodeKey || '') === barcodeKey);
  if (duplicate) {
    throw new HttpsError('already-exists', `This barcode is already assigned to another ${recordLabel}, including archived records.`);
  }
}

function parseSmePosCheckoutItems(value: unknown): Array<{ productId: string; quantity: number }> {
  if (!Array.isArray(value) || value.length > 50) {
    throw new HttpsError('invalid-argument', 'Checkout can contain up to 50 product lines.');
  }
  const seen = new Set<string>();
  return value.map((row) => {
    if (!row || typeof row !== 'object') throw new HttpsError('invalid-argument', 'Invalid checkout product.');
    const item = row as Record<string, unknown>;
    const productId = stringValue(item.productId, 'Product ID', 80);
    if (seen.has(productId)) throw new HttpsError('invalid-argument', 'The same product appears more than once.');
    seen.add(productId);
    return { productId, quantity: integerBetween(item.quantity, 'Quantity', 1, 9_999) };
  });
}

interface SmePosPaymentRequestRow {
  accountId: string;
  paymentMethod: PaymentMethodCode | null;
  paymentMethodLabel: string | null;
  amountMinor: number;
}

interface SmePosPostedPayment extends SmePosPaymentRequestRow {
  accountName: string;
  returnedMinor: number;
  transactionId: string;
  ledgerEntryId: string;
}

function parseSmePosPaymentRows(data: DocumentData, totalMinor: number, allowZero = false): SmePosPaymentRequestRow[] {
  const raw = data.payments;
  let rows: SmePosPaymentRequestRow[] = [];
  if (Array.isArray(raw) && raw.length) {
    if (raw.length > 4) throw new HttpsError('invalid-argument', 'A sale can use up to four split payments.');
    rows = raw.map((value: unknown) => {
      if (!value || typeof value !== 'object') throw new HttpsError('invalid-argument', 'Invalid split payment.');
      const row = value as DocumentData;
      const accountId = stringValue(row.accountId, 'Payment account', 80);
      const payment = paymentMethodValues({ paymentMethod: row.paymentMethod, paymentMethodLabel: row.paymentMethodLabel });
      return {
        accountId,
        paymentMethod: payment.paymentMethod,
        paymentMethodLabel: payment.paymentMethodLabel,
        amountMinor: positiveMoney(row.amountMinor),
      };
    });
  } else if (data.paymentAccountId) {
    const payment = paymentMethodValues(data);
    rows = [{
      accountId: stringValue(data.paymentAccountId, 'Payment account', 80),
      paymentMethod: payment.paymentMethod,
      paymentMethodLabel: payment.paymentMethodLabel,
      amountMinor: totalMinor,
    }];
  }
  if (!rows.length) {
    if (allowZero && totalMinor === 0) return [];
    throw new HttpsError('invalid-argument', 'Choose where the payment was received.');
  }
  const entered = rows.reduce((sum, row) => sum + row.amountMinor, 0);
  if (!Number.isSafeInteger(entered)) throw new HttpsError('out-of-range', 'Payment total is too large.');
  if (entered !== totalMinor) throw new HttpsError('invalid-argument', `Split payments must add up exactly to ${(totalMinor / 100).toFixed(2)}.`);
  return rows;
}

function parseStandardQuickItems(value: unknown): Array<{ clientId: string; name: string; quantity: number; unitPriceMinor: number }> {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20) throw new HttpsError('invalid-argument', 'Quick Add can contain up to 20 lines.');
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new HttpsError('invalid-argument', 'Invalid Quick Add item.');
    const row = raw as DocumentData;
    const clientId = stringValue(row.clientId, 'Quick Add line ID', 80);
    if (seen.has(clientId)) throw new HttpsError('invalid-argument', 'The same Quick Add item appears more than once.');
    seen.add(clientId);
    return {
      clientId,
      name: stringValue(row.name, 'Quick Add item name', 100),
      quantity: integerBetween(row.quantity, 'Quick Add quantity', 1, 9_999),
      unitPriceMinor: positiveMoney(row.unitPriceMinor),
    };
  });
}

function parseMarketplaceQuickItems(value: unknown): Array<{ clientId: string; sellerId: string; name: string; quantity: number; unitPriceMinor: number; condition: string }> {
  return parseStandardQuickItems(value).map((base, index) => {
    const row = (value as DocumentData[])[index] || {};
    return {
      ...base,
      sellerId: stringValue(row.sellerId, 'Quick Add seller', 80),
      condition: oneOf(row.condition || 'other', smePosListingConditions, 'Quick Add condition'),
    };
  });
}

function parseSmePosPartialPaymentRows(value: unknown, maximumMinor: number, field = 'Deposit'): SmePosPaymentRequestRow[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 4) throw new HttpsError('invalid-argument', `${field} can use up to four split payments.`);
  const rows = value.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new HttpsError('invalid-argument', `Invalid ${field.toLowerCase()} payment.`);
    const row = raw as DocumentData;
    const payment = paymentMethodValues({ paymentMethod: row.paymentMethod, paymentMethodLabel: row.paymentMethodLabel });
    return {
      accountId: stringValue(row.accountId, `${field} account`, 80),
      paymentMethod: payment.paymentMethod,
      paymentMethodLabel: payment.paymentMethodLabel,
      amountMinor: positiveMoney(row.amountMinor),
    };
  });
  const total = rows.reduce((sum, row) => sum + row.amountMinor, 0);
  if (!Number.isSafeInteger(total)) throw new HttpsError('out-of-range', `${field} amount is too large.`);
  if (total > maximumMinor) throw new HttpsError('invalid-argument', `${field} cannot exceed ${(maximumMinor / 100).toFixed(2)}.`);
  return rows;
}

function parseSmePosReservationItems(value: unknown): Array<{ itemId: string; quantity: number }> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw new HttpsError('invalid-argument', 'A booking must contain between 1 and 50 item lines.');
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new HttpsError('invalid-argument', 'Invalid booking item.');
    const row = raw as DocumentData;
    const itemId = stringValue(row.itemId, 'Booking item ID', 80);
    if (seen.has(itemId)) throw new HttpsError('invalid-argument', 'The same item appears more than once in the booking.');
    seen.add(itemId);
    return { itemId, quantity: integerBetween(row.quantity, 'Booking quantity', 1, 9_999) };
  });
}

async function postSmePosPayments(input: {
  transaction: Transaction;
  rows: SmePosPaymentRequestRow[];
  settings: DocumentData;
  spaceId: string;
  uid: string;
  idempotencyKey: string;
  now: FieldValue;
  transactionDate: string;
  direction: 'in' | 'out';
  entryType: string;
  counterparty: string;
  note: string;
  categoryId: 'income-sales' | 'expense-other' | 'expense-supplier';
  extra?: DocumentData;
}): Promise<SmePosPostedPayment[]> {
  if (!input.rows.length) return [];
  const uniqueAccountIds = [...new Set(input.rows.map((row) => row.accountId))];
  const accountRefs = uniqueAccountIds.map((id) => db.collection('accounts').doc(id));
  const accountSnapshots = await Promise.all(accountRefs.map((ref) => input.transaction.get(ref)));
  const accountById = new Map(accountSnapshots.map((snapshot) => [snapshot.id, snapshot]));
  const totalsByAccount = new Map<string, number>();

  input.rows.forEach((row) => {
    const snapshot = accountById.get(row.accountId);
    if (!snapshot) throw new HttpsError('not-found', 'Payment account not found.');
    const account = assertAccount(snapshot.data(), String(input.settings.ownerId), 'Payment account');
    if (snapshot.data()?.classification !== 'business') throw new HttpsError('failed-precondition', 'Choose a business account for POS payments.');
    requireSmePosPaymentAccountForSpace(input.settings, snapshot.data() || {}, row.accountId, input.spaceId);
    if (account.currency !== input.settings.currency) throw new HttpsError('failed-precondition', 'Payment account and POS currency must match.');
    totalsByAccount.set(row.accountId, (totalsByAccount.get(row.accountId) || 0) + row.amountMinor);
  });

  totalsByAccount.forEach((amountMinor, accountId) => {
    const snapshot = accountById.get(accountId)!;
    const account = assertAccount(snapshot.data(), String(input.settings.ownerId), 'Payment account');
    const delta = accountEffect(account.type, input.direction, amountMinor);
    updateAccountBalance(input.transaction, snapshot.ref, account, delta);
  });

  const category = systemCategories.get(input.categoryId);
  if (!category) throw new HttpsError('internal', 'POS payment category is unavailable.');

  return input.rows.map((row, index) => {
    const snapshot = accountById.get(row.accountId)!;
    const account = assertAccount(snapshot.data(), String(input.settings.ownerId), 'Payment account');
    const financialRef = db.collection('transactions').doc();
    const delta = accountEffect(account.type, input.direction, row.amountMinor);
    const ledgerEntryId = createLedgerEntry(input.transaction, {
      accountId: row.accountId,
      ownerId: String(input.settings.ownerId),
      spaceId: input.spaceId,
      transactionId: financialRef.id,
      entryType: input.entryType,
      amountMinor: delta,
      currency: account.currency,
      idempotencyKey: `${input.idempotencyKey}:${index}`,
      now: input.now,
    });
    input.transaction.create(financialRef, {
      displayId: displayId('TXN'), ownerId: input.settings.ownerId, createdBy: input.uid,
      type: input.direction === 'in' ? 'income' : 'expense', status: 'posted', spaceId: input.spaceId,
      accountId: row.accountId, destinationAccountId: null, amountMinor: row.amountMinor, currency: account.currency,
      category: category.name, categoryId: category.id, categoryIcon: category.icon, categoryColor: category.color,
      categoryScope: 'business', categoryIsSystem: true, counterparty: input.counterparty, note: input.note,
      paymentMethod: row.paymentMethod, paymentMethodLabel: row.paymentMethodLabel, transactionDate: input.transactionDate,
      reversalOf: null, reversedBy: null, budgetIds: [], commitmentId: null, commitmentPaymentId: null,
      sharedBillAssignmentId: null, sharedBillPaymentId: null, paymentProofPath: null,
      recurringTemplateId: null, recurringRunId: null, recurringScheduledDate: null,
      ...(input.extra || {}), createdAt: input.now, postedAt: input.now, updatedAt: input.now,
    });
    return {
      ...row,
      accountName: String(snapshot.data()?.name || 'Business account'),
      returnedMinor: 0,
      transactionId: financialRef.id,
      ledgerEntryId,
    };
  });
}

function configuredSmePosPaymentAccountIds(settings: DocumentData): string[] | null {
  if (Array.isArray(settings.paymentAccountIds)) {
    return settings.paymentAccountIds.filter((value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()));
  }
  return null;
}

function isSmePosPaymentAccountForSpace(settings: DocumentData, account: DocumentData, accountId: string, spaceId: string): boolean {
  const assignedSpaceId = typeof account.spaceId === 'string' ? account.spaceId.trim() : '';
  if (assignedSpaceId) {
    return assignedSpaceId === spaceId && account.posEnabled === true;
  }
  const legacyIds = configuredSmePosPaymentAccountIds(settings);
  return Boolean(legacyIds?.includes(accountId));
}

function requireSmePosPaymentAccountForSpace(settings: DocumentData, account: DocumentData, accountId: string, spaceId: string) {
  if (!isSmePosPaymentAccountForSpace(settings, account, accountId, spaceId)) {
    throw new HttpsError('failed-precondition', 'This account does not belong to this SME POS. Assign it from Accounts and enable POS payments first.');
  }
}

export const getSmePosPaymentAccounts = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'viewer']);
  const snapshot = await db.collection('accounts').where('ownerId', '==', context.settings.ownerId).get();
  const accounts = snapshot.docs
    .filter((item) => {
      const data = item.data();
      return !data.archivedAt
        && !data.closedAt
        && data.classification === 'business'
        && data.currency === context.settings.currency
        && isSmePosPaymentAccountForSpace(context.settings, data, item.id, spaceId);
    })
    .map((item) => ({ id: item.id, name: String(item.data().name || 'Business account'), currency: String(item.data().currency || 'BND'), type: String(item.data().type || 'bank') }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { accounts };
});

export const getSmePosStaffWorkspace = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'stock_staff', 'viewer']);
  const [productSnapshot, customerSnapshot, saleSnapshot] = await Promise.all([
    db.collection('smePosProducts').where('spaceId', '==', spaceId).get(),
    context.role === 'stock_staff' ? Promise.resolve(null) : db.collection('smePosCustomers').where('spaceId', '==', spaceId).get(),
    ['owner', 'manager', 'cashier'].includes(context.role) ? db.collection('smePosSales').where('spaceId', '==', spaceId).get() : Promise.resolve(null),
  ]);

  const products = productSnapshot.docs
    .filter((item) => !item.data().archivedAt && item.data().ownerId === context.settings.ownerId)
    .map((item) => {
      const row = item.data();
      return {
        id: item.id,
        displayId: String(row.displayId || item.id),
        spaceId,
        ownerId: String(row.ownerId || ''),
        name: String(row.name || 'Product'),
        category: String(row.category || ''),
        sku: String(row.sku || ''),
        barcode: String(row.barcode || ''),
        photoPath: typeof row.photoPath === 'string' ? row.photoPath : null,
        note: '',
        condition: smePosListingConditions.includes(String(row.condition || '') as (typeof smePosListingConditions)[number])
          ? String(row.condition)
          : undefined,
        conditionNote: String(row.conditionNote || ''),
        sellingPriceMinor: nonNegativeMoney(row.sellingPriceMinor),
        costPriceMinor: null,
        currency: String(row.currency || context.settings.currency || 'BND'),
        trackStock: row.trackStock !== false,
        quantityOnHand: row.trackStock === false ? 0 : smePosQuantity(row.quantityOnHand, 'Product stock'),
        reservedQuantity: row.trackStock === false ? 0 : smePosQuantity(row.reservedQuantity || 0, 'Reserved product stock'),
        lowStockLevel: row.trackStock === false ? 0 : smePosQuantity(row.lowStockLevel, 'Low stock alert'),
        soldQuantity: 0,
        salesRevenueMinor: 0,
        stockSource: row.stockSource === 'existing_stock' ? 'existing_stock' : 'catalog',
        registeredBy: String(row.registeredBy || ''),
        registeredAt: row.registeredAt || null,
        archivedAt: null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const customers = (customerSnapshot?.docs || [])
    .filter((item) => !item.data().archivedAt && item.data().ownerId === context.settings.ownerId)
    .map((item) => {
      const row = item.data();
      return {
        id: item.id,
        displayId: String(row.displayId || item.id),
        spaceId,
        ownerId: String(row.ownerId || ''),
        name: String(row.name || 'Customer'),
        phone: String(row.phone || ''),
        email: String(row.email || ''),
        note: String(row.note || ''),
        totalSpentMinor: 0,
        visitCount: integerBetween(row.visitCount || 0, 'Visit count', 0, 9_999_999),
        lastSaleAt: null,
        archivedAt: null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const sales = (saleSnapshot?.docs || [])
    .filter((item) => {
      const row = item.data();
      if (row.ownerId !== context.settings.ownerId) return false;
      if (context.role === 'cashier') return row.createdBy === uid;
      return context.role === 'owner' || context.role === 'manager';
    })
    .sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0))
    .slice(0, 50)
    .map((item) => {
      const row = item.data();
      const items = Array.isArray(row.items) ? row.items.map((raw: unknown) => {
        const line = (raw || {}) as Record<string, unknown>;
        return {
          productId: String(line.productId || ''),
          productName: String(line.productName || 'Product'),
          sku: String(line.sku || ''),
          quantity: integerBetween(line.quantity || 1, 'Sale item quantity', 1, 9_999),
          unitPriceMinor: nonNegativeMoney(line.unitPriceMinor || 0),
          unitCostMinor: 0,
          lineTotalMinor: nonNegativeMoney(line.lineTotalMinor || 0),
          lineCostMinor: 0,
          returnedQuantity: integerBetween(line.returnedQuantity || 0, 'Returned quantity', 0, 9_999),
          quickAdd: line.quickAdd === true,
        };
      }) : [];
      return {
        id: item.id,
        displayId: String(row.displayId || item.id),
        receiptNumber: String(row.receiptNumber || item.id),
        spaceId,
        ownerId: String(row.ownerId || ''),
        createdBy: String(row.createdBy || ''),
        status: String(row.status || 'completed'),
        returnStatus: String(row.returnStatus || 'not_returned'),
        sourceMode: String(row.sourceMode || context.settings.mode || 'standard'),
        customerId: row.customerId || null,
        customerName: row.customerName || null,
        paymentAccountId: '',
        paymentAccountName: String(row.paymentAccountName || 'Business account'),
        paymentMethod: row.paymentMethod || null,
        paymentMethodLabel: row.paymentMethodLabel || null,
        payments: Array.isArray(row.payments) ? row.payments.map((payment: DocumentData) => ({
          accountId: '',
          accountName: String(payment.accountName || 'Business account'),
          paymentMethod: payment.paymentMethod || null,
          paymentMethodLabel: payment.paymentMethodLabel || null,
          amountMinor: nonNegativeMoney(payment.amountMinor || 0),
          returnedMinor: nonNegativeMoney(payment.returnedMinor || 0),
          transactionId: '',
          ledgerEntryId: '',
        })) : undefined,
        items,
        itemCount: integerBetween(row.itemCount || 0, 'Item count', 0, 999_999),
        subtotalMinor: nonNegativeMoney(row.subtotalMinor || 0),
        discountMinor: nonNegativeMoney(row.discountMinor || 0),
        totalMinor: nonNegativeMoney(row.totalMinor || 0),
        costMinor: 0,
        profitMinor: 0,
        returnedMinor: nonNegativeMoney(row.returnedMinor || 0),
        currency: String(row.currency || context.settings.currency || 'BND'),
        saleDate: String(row.saleDate || ''),
        note: String(row.note || ''),
        transactionId: '',
        ledgerEntryId: '',
        receiptName: String(row.receiptName || context.settings.receiptName || context.settings.shopName || 'Receipt'),
        receiptFooter: String(row.receiptFooter || ''),
      };
    });

  return { products, customers, sales };
});

export const saveSmePosProduct = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const productId = optionalString(request.data?.productId, 80) || null;
  const name = stringValue(request.data?.name, 'Product name', 100);
  const category = optionalString(request.data?.category, 60);
  const sku = optionalString(request.data?.sku, 50);
  const { barcode, barcodeKey } = smePosBarcode(request.data?.barcode);
  const photoPathProvided = Object.prototype.hasOwnProperty.call(request.data || {}, 'photoPath');
  const photoPath = photoPathProvided ? smePosItemPhotoPath(request.data?.photoPath, spaceId) : undefined;
  const note = optionalString(request.data?.note, 300);
  const conditionRaw = optionalString(request.data?.condition, 32);
  const condition = conditionRaw ? oneOf(conditionRaw, smePosListingConditions, 'item condition') : null;
  const conditionNote = optionalString(request.data?.conditionNote, 120);
  const sellingPriceMinor = positiveMoney(request.data?.sellingPriceMinor);
  const costPriceMinor = request.data?.costPriceMinor == null ? null : nonNegativeMoney(request.data?.costPriceMinor);
  const trackStock = request.data?.trackStock !== false;
  const quantityOnHand = smePosQuantity(request.data?.quantityOnHand, 'Quantity');
  const lowStockLevel = smePosQuantity(request.data?.lowStockLevel, 'Low stock alert');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  if (!productId) {
    await assertBasicSmeInventoryCapacity(
      context.settings.ownerId,
      spaceId,
    );
  }
  const productRef = productId ? db.collection('smePosProducts').doc(productId) : db.collection('smePosProducts').doc();
  const productQuery = db.collection('smePosProducts').where('spaceId', '==', spaceId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, existing, spaceProducts] = await Promise.all([
      transaction.get(commandRef), transaction.get(productRef), transaction.get(productQuery),
    ]);
    if (command.exists) return command.data()?.result;
    if (productId && !existing.exists) throw new HttpsError('not-found', 'Product not found.');
    if (existing.exists && (existing.data()?.spaceId !== spaceId || existing.data()?.ownerId !== context.settings.ownerId)) {
      throw new HttpsError('permission-denied', 'This product belongs to another shop.');
    }
    if (existing.data()?.archivedAt) throw new HttpsError('failed-precondition', 'Restore this product before editing it.');
    const reservedQuantity = smePosQuantity(existing.data()?.reservedQuantity || 0, 'Reserved quantity');
    if (existing.exists && trackStock && quantityOnHand < reservedQuantity) throw new HttpsError('failed-precondition', `Available quantity cannot be lower than ${reservedQuantity} unit(s) currently reserved in bookings.`);
    if (existing.exists && !trackStock && reservedQuantity > 0) throw new HttpsError('failed-precondition', 'Complete or cancel active bookings before changing this product to unlimited stock.');
    assertUniqueSmePosBarcode(spaceProducts.docs, productRef.id, barcodeKey, 'POS product');
    const now = FieldValue.serverTimestamp();
    const payload = {
      displayId: existing.data()?.displayId || displayId('PRD'),
      spaceId,
      ownerId: context.settings.ownerId,
      name,
      category,
      sku,
      barcode,
      barcodeKey,
      photoPath: photoPathProvided ? photoPath : (existing.data()?.photoPath || null),
      note,
      condition: condition || existing.data()?.condition || null,
      conditionNote,
      sellingPriceMinor,
      costPriceMinor,
      currency: context.settings.currency || context.space.currency || 'BND',
      trackStock,
      quantityOnHand: trackStock ? quantityOnHand : 0,
      reservedQuantity: trackStock ? reservedQuantity : 0,
      lowStockLevel: trackStock ? lowStockLevel : 0,
      soldQuantity: Number(existing.data()?.soldQuantity || 0),
      salesRevenueMinor: Number(existing.data()?.salesRevenueMinor || 0),
      stockSource: existing.data()?.stockSource || 'catalog',
      registeredBy: existing.data()?.registeredBy || null,
      registeredAt: existing.data()?.registeredAt || null,
      archivedAt: null,
      createdAt: existing.data()?.createdAt || now,
      updatedAt: now,
    };

    if (!productId) {
      await assertBasicSmeCapacityInTransaction(
        transaction,
        context.settings.ownerId,
        spaceId,
        'inventory',
      );
    }

    transaction.set(productRef, payload, { merge: true });
    const result = { productId: productRef.id };
    transaction.create(commandRef, { uid, kind: 'save_sme_pos_product', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: existing.exists ? 'pos_product_updated' : 'pos_product_created', targetType: 'sme_pos_product', targetId: productRef.id, summary: `${existing.exists ? 'Updated' : 'Added'} POS product ${name}.`, now });
    return result;
  });
});

export const registerExistingSmePosProduct = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const name = stringValue(request.data?.name, 'Product name', 100);
  const category = optionalString(request.data?.category, 60);
  const sku = optionalString(request.data?.sku, 50);
  const { barcode, barcodeKey } = smePosBarcode(request.data?.barcode);
  const photoPath = smePosItemPhotoPath(request.data?.photoPath, spaceId);
  const note = optionalString(request.data?.note, 300);
  const condition = oneOf(request.data?.condition, smePosListingConditions, 'item condition');
  const conditionNote = optionalString(request.data?.conditionNote, 120);
  const sellingPriceMinor = positiveMoney(request.data?.sellingPriceMinor);
  const requestedCostPriceMinor = request.data?.costPriceMinor == null ? null : nonNegativeMoney(request.data?.costPriceMinor);
  const quantityOnHand = smePosQuantity(request.data?.quantityOnHand, 'Available quantity');
  const lowStockLevel = smePosQuantity(request.data?.lowStockLevel, 'Low stock alert');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  await assertBasicSmeInventoryCapacity(
    context.settings.ownerId,
    spaceId,
  );
  const costPriceMinor = context.role === 'cashier' ? null : requestedCostPriceMinor;
  if (context.settings.mode !== 'standard') throw new HttpsError('failed-precondition', 'Use the Marketplace register for consignment stock.');

  const productRef = db.collection('smePosProducts').doc();
  const productQuery = db.collection('smePosProducts').where('spaceId', '==', spaceId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, spaceProducts] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(productQuery),
    ]);
    if (command.exists) return command.data()?.result;
    assertUniqueSmePosBarcode(spaceProducts.docs, productRef.id, barcodeKey, 'POS product');
    const now = FieldValue.serverTimestamp();

    await assertBasicSmeCapacityInTransaction(
      transaction,
      context.settings.ownerId,
      spaceId,
      'inventory',
    );

    transaction.create(productRef, {
      displayId: displayId('PRD'),
      spaceId,
      ownerId: context.settings.ownerId,
      name,
      category,
      sku,
      barcode,
      barcodeKey,
      photoPath,
      note,
      condition,
      conditionNote,
      sellingPriceMinor,
      costPriceMinor,
      currency: context.settings.currency || context.space.currency || 'BND',
      trackStock: true,
      quantityOnHand,
      reservedQuantity: 0,
      lowStockLevel,
      soldQuantity: 0,
      salesRevenueMinor: 0,
      stockSource: 'existing_stock',
      registeredBy: uid,
      registeredAt: now,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const result = { productId: productRef.id };
    transaction.create(commandRef, { uid, kind: 'register_existing_sme_pos_product', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: context.member.displayName || context.member.email,
      action: 'pos_existing_stock_registered',
      targetType: 'sme_pos_product',
      targetId: productRef.id,
      summary: `Registered existing stock ${name} (${quantityOnHand} on hand).`,
      now,
    });
    return result;
  });
});

export const updateSmePosProductStock = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const productId = stringValue(request.data?.productId, 'Product ID', 80);
  const quantityOnHand = smePosQuantity(request.data?.quantityOnHand, 'Quantity');
  const lowStockLevel = smePosQuantity(request.data?.lowStockLevel, 'Low stock alert');
  const stocktake = request.data?.stocktake === true;
  const note = optionalString(request.data?.note, 300);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'stock_staff']);
  const productRef = db.collection('smePosProducts').doc(productId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, product] = await Promise.all([transaction.get(commandRef), transaction.get(productRef)]);
    if (command.exists) return command.data()?.result;
    if (!product.exists || product.data()?.spaceId !== spaceId || product.data()?.ownerId !== context.settings.ownerId || product.data()?.archivedAt) {
      throw new HttpsError('not-found', 'Active product not found.');
    }
    if (product.data()?.trackStock === false) throw new HttpsError('failed-precondition', 'This service or unlimited item does not use stock quantity.');
    const reservedQuantity = smePosQuantity(product.data()?.reservedQuantity || 0, 'Reserved quantity');
    if (quantityOnHand < reservedQuantity) throw new HttpsError('failed-precondition', `Stock cannot be counted below ${reservedQuantity} unit(s) currently reserved in bookings.`);
    const previousQuantity = smePosQuantity(product.data()?.quantityOnHand, 'Current quantity');
    const difference = quantityOnHand - previousQuantity;
    const now = FieldValue.serverTimestamp();
    transaction.update(productRef, { quantityOnHand, lowStockLevel, updatedAt: now });
    const result = { productId, previousQuantity, quantityOnHand, difference, lowStockLevel };
    transaction.create(commandRef, { uid, kind: stocktake ? 'stocktake_sme_pos_product' : 'update_sme_pos_product_stock', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: context.member.displayName || context.member.email,
      action: stocktake ? 'pos_stocktake_counted' : 'pos_stock_updated',
      targetType: 'sme_pos_product',
      targetId: productId,
      summary: stocktake
        ? `Counted ${quantityOnHand} unit(s) of ${product.data()?.name || 'a POS product'}; difference ${difference >= 0 ? '+' : ''}${difference}.${note ? ` ${note}` : ''}`
        : `Updated stock for ${product.data()?.name || 'a POS product'} to ${quantityOnHand}.`,
      now,
    });
    return result;
  });
});

export const receiveSmePosProductStock = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const productId = stringValue(request.data?.productId, 'Product ID', 80);
  const quantityReceived = integerBetween(request.data?.quantityReceived, 'Quantity received', 1, 999_999);
  const note = optionalString(request.data?.note, 300);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'stock_staff']);
  const productRef = db.collection('smePosProducts').doc(productId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, product] = await Promise.all([transaction.get(commandRef), transaction.get(productRef)]);
    if (command.exists) return command.data()?.result;
    if (!product.exists || product.data()?.spaceId !== spaceId || product.data()?.ownerId !== context.settings.ownerId || product.data()?.archivedAt) {
      throw new HttpsError('not-found', 'Active product not found.');
    }
    if (product.data()?.trackStock === false) throw new HttpsError('failed-precondition', 'This service or unlimited item does not use stock quantity.');
    const currentQuantity = smePosQuantity(product.data()?.quantityOnHand, 'Current quantity');
    const quantityOnHand = currentQuantity + quantityReceived;
    if (quantityOnHand > 999_999) throw new HttpsError('failed-precondition', 'Received stock would exceed the maximum available quantity.');
    const now = FieldValue.serverTimestamp();
    transaction.update(productRef, { quantityOnHand, updatedAt: now });
    const result = { productId, quantityReceived, quantityOnHand };
    transaction.create(commandRef, { uid, kind: 'receive_sme_pos_product_stock', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email,
      action: 'pos_stock_received', targetType: 'sme_pos_product', targetId: productId,
      summary: note
        ? `Received ${quantityReceived} unit(s) of ${product.data()?.name || 'a POS product'}: ${note}`
        : `Received ${quantityReceived} unit(s) of ${product.data()?.name || 'a POS product'}.`,
      now,
    });
    return result;
  });
});

export const setSmePosProductArchived = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const productId = stringValue(request.data?.productId, 'Product ID', 80);
  const archived = request.data?.archived === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  const productRef = db.collection('smePosProducts').doc(productId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, product] = await Promise.all([transaction.get(commandRef), transaction.get(productRef)]);
    if (command.exists) return command.data()?.result;
    if (!product.exists || product.data()?.spaceId !== spaceId || product.data()?.ownerId !== context.settings.ownerId) throw new HttpsError('not-found', 'Product not found.');
    if (archived && Number(product.data()?.reservedQuantity || 0) > 0) throw new HttpsError('failed-precondition', 'This product has active booked quantity. Complete or cancel the booking before archiving it.');
    const now = FieldValue.serverTimestamp();
    transaction.update(productRef, { archivedAt: archived ? now : null, updatedAt: now });
    const result = { productId, archived };
    transaction.create(commandRef, { uid, kind: archived ? 'archive_sme_pos_product' : 'restore_sme_pos_product', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const deleteSmePosProductPermanently = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);
    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );
    const productId = stringValue(
      request.data?.productId,
      'Product ID',
      80,
    );
    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const context = await requireSmePosActor(
      spaceId,
      uid,
      ['owner'],
    );

    const productRef = db
      .collection('smePosProducts')
      .doc(productId);

    const commandRef = db
      .collection('smePosCommands')
      .doc(commandId(uid, key));

    const [salesSnapshot, reservationsSnapshot] =
      await Promise.all([
        db
          .collection('smePosSales')
          .where('spaceId', '==', spaceId)
          .get(),

        db
          .collection('smePosReservations')
          .where('spaceId', '==', spaceId)
          .get(),
      ]);

    const hasSaleHistory = salesSnapshot.docs.some((sale) => {
      const items = Array.isArray(sale.data().items)
        ? sale.data().items
        : [];

      return items.some((item: DocumentData) =>
        String(
          item?.productId
          || item?.itemId
          || '',
        ) === productId
      );
    });

    if (hasSaleHistory) {
      throw new HttpsError(
        'failed-precondition',
        'This product has sales history and cannot be permanently deleted. Archive it instead.',
      );
    }

    const hasReservationHistory =
      reservationsSnapshot.docs.some((reservation) => {
        const items = Array.isArray(reservation.data().items)
          ? reservation.data().items
          : [];

        return items.some((item: DocumentData) =>
          String(
            item?.itemId
            || item?.productId
            || '',
          ) === productId
        );
      });

    if (hasReservationHistory) {
      throw new HttpsError(
        'failed-precondition',
        'This product has booking history and cannot be permanently deleted. Archive it instead.',
      );
    }

    return db.runTransaction(async (transaction) => {
      const [command, product] = await Promise.all([
        transaction.get(commandRef),
        transaction.get(productRef),
      ]);

      if (command.exists) {
        return command.data()?.result;
      }

      if (
        !product.exists
        || product.data()?.spaceId !== spaceId
        || product.data()?.ownerId !== context.settings.ownerId
      ) {
        throw new HttpsError(
          'not-found',
          'Product not found.',
        );
      }

      const data = product.data() || {};

      if (Number(data.reservedQuantity || 0) > 0) {
        throw new HttpsError(
          'failed-precondition',
          'This product has active booked quantity. Complete or cancel the booking before deleting it.',
        );
      }

      if (
        Number(data.salesRevenueMinor || 0) > 0
        || Number(data.soldQuantity || 0) > 0
      ) {
        throw new HttpsError(
          'failed-precondition',
          'This product has recorded sales history and cannot be permanently deleted. Archive it instead.',
        );
      }

      const now = FieldValue.serverTimestamp();

      const result = {
        productId,
        deleted: true,
        photoPath: String(data.photoPath || ''),
      };

      transaction.delete(productRef);

      transaction.create(commandRef, {
        uid,
        kind: 'delete_sme_pos_product_permanently',
        idempotencyKey: key,
        result,
        createdAt: now,
      });

      createActivity(transaction, {
        spaceId,
        actorUid: uid,
        actorName:
          context.member.displayName
          || context.member.email,
        action: 'pos_product_deleted_permanently',
        targetType: 'sme_pos_product',
        targetId: productId,
        summary:
          `Permanently deleted inventory product ${String(data.name || productId)}.`,
        now,
      });

      return result;
    });
  },
);

export const saveSmePosCustomer = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const customerId = optionalString(request.data?.customerId, 80) || null;
  const name = stringValue(request.data?.name, 'Customer name', 100);
  const phone = optionalString(request.data?.phone, 30);
  const email = optionalString(request.data?.email, 120);
  const note = optionalString(request.data?.note, 300);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid customer email.');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  if (!customerId) {
    await assertBasicSmeCustomerCapacity(
      context.settings.ownerId,
      spaceId,
    );
  }
  const customerRef = customerId ? db.collection('smePosCustomers').doc(customerId) : db.collection('smePosCustomers').doc();
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, existing] = await Promise.all([transaction.get(commandRef), transaction.get(customerRef)]);
    if (command.exists) return command.data()?.result;
    if (customerId && !existing.exists) throw new HttpsError('not-found', 'Customer not found.');
    if (existing.exists && (existing.data()?.spaceId !== spaceId || existing.data()?.ownerId !== context.settings.ownerId)) throw new HttpsError('permission-denied', 'This customer belongs to another shop.');
    if (existing.data()?.archivedAt) throw new HttpsError('failed-precondition', 'Restore this customer before editing it.');
    const now = FieldValue.serverTimestamp();

    if (!customerId) {
      await assertBasicSmeCapacityInTransaction(
        transaction,
        context.settings.ownerId,
        spaceId,
        'customers',
      );
    }

    transaction.set(customerRef, {
      displayId: existing.data()?.displayId || displayId('CUS'), spaceId, ownerId: context.settings.ownerId, name, phone, email, note,
      totalSpentMinor: Number(existing.data()?.totalSpentMinor || 0), visitCount: Number(existing.data()?.visitCount || 0), lastSaleAt: existing.data()?.lastSaleAt || null,
      archivedAt: null, createdAt: existing.data()?.createdAt || now, updatedAt: now,
    }, { merge: true });
    const result = { customerId: customerRef.id };
    transaction.create(commandRef, { uid, kind: 'save_sme_pos_customer', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const setSmePosCustomerArchived = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const customerId = stringValue(request.data?.customerId, 'Customer ID', 80);
  const archived = request.data?.archived === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  const customerRef = db.collection('smePosCustomers').doc(customerId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  if (archived) {
    const reservationsSnapshot = await db.collection('smePosReservations').where('spaceId', '==', spaceId).get();
    const hasActiveBooking = reservationsSnapshot.docs.some((item) => item.data().customerId === customerId && !['completed', 'cancelled'].includes(String(item.data().status || '')));
    if (hasActiveBooking) throw new HttpsError('failed-precondition', 'This customer has an active booking. Complete or cancel it before archiving the customer.');
  }
  return db.runTransaction(async (transaction) => {
    const [command, customer] = await Promise.all([transaction.get(commandRef), transaction.get(customerRef)]);
    if (command.exists) return command.data()?.result;
    if (!customer.exists || customer.data()?.spaceId !== spaceId || customer.data()?.ownerId !== context.settings.ownerId) throw new HttpsError('not-found', 'Customer not found.');
    if (!archived && customer.data()?.deletedAt) throw new HttpsError('failed-precondition', 'Deleted customers cannot be restored.');
    const now = FieldValue.serverTimestamp();
    transaction.update(customerRef, { archivedAt: archived ? now : null, updatedAt: now });
    const result = { customerId, archived };
    transaction.create(commandRef, { uid, kind: archived ? 'archive_sme_pos_customer' : 'restore_sme_pos_customer', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const deleteSmePosCustomer = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const customerId = stringValue(request.data?.customerId, 'Customer ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner']);

  const customerRef = db.collection('smePosCustomers').doc(customerId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const [salesSnapshot, reservationsSnapshot] = await Promise.all([
    db.collection('smePosSales').where('spaceId', '==', spaceId).get(),
    db.collection('smePosReservations').where('spaceId', '==', spaceId).get(),
  ]);
  const hasSaleHistory = salesSnapshot.docs.some((item) => item.data().customerId === customerId);
  const hasActiveBooking = reservationsSnapshot.docs.some((item) => item.data().customerId === customerId && !['completed', 'cancelled'].includes(String(item.data().status || '')));
  if (hasActiveBooking) throw new HttpsError('failed-precondition', 'This customer has an active booking. Complete or cancel it before deleting the customer.');

  return db.runTransaction(async (transaction) => {
    const [command, customer] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(customerRef),
    ]);
    if (command.exists) return command.data()?.result;
    if (!customer.exists || customer.data()?.spaceId !== spaceId || customer.data()?.ownerId !== context.settings.ownerId) {
      throw new HttpsError('not-found', 'Customer not found.');
    }

    const hasHistory = hasSaleHistory
      || Number(customer.data()?.visitCount || 0) > 0
      || Number(customer.data()?.totalSpentMinor || 0) > 0
      || Boolean(customer.data()?.lastSaleAt);
    const now = FieldValue.serverTimestamp();

    if (hasHistory) {
      transaction.update(customerRef, {
        archivedAt: now,
        deletedAt: now,
        deletedBy: uid,
        updatedAt: now,
      });
    } else {
      transaction.delete(customerRef);
    }

    const result = { customerId, preservedHistory: hasHistory };
    transaction.create(commandRef, { uid, kind: 'delete_sme_pos_customer', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: context.member.displayName || context.member.email,
      action: 'pos_customer_deleted',
      targetType: 'sme_pos_customer',
      targetId: customerId,
      summary: hasHistory ? `Deleted customer ${customer.data()?.name || ''}; sales history was preserved.` : `Deleted customer ${customer.data()?.name || ''}.`,
      now,
    });
    return result;
  });
});

export const checkoutStandardPos = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const requestedItems = parseSmePosCheckoutItems(request.data?.items || []);
  const quickItems = parseStandardQuickItems(request.data?.quickItems);
  if (!requestedItems.length && !quickItems.length) throw new HttpsError('invalid-argument', 'Add at least one product or Quick Add item to checkout.');
  if (requestedItems.length + quickItems.length > 50) throw new HttpsError('invalid-argument', 'Checkout can contain up to 50 lines.');
  const customerId = optionalString(request.data?.customerId, 80) || null;
  const discountMinor = nonNegativeMoney(request.data?.discountMinor ?? 0);
  const saleDate = localDate(request.data?.saleDate, 'Sale date');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  if (context.settings.status !== 'active') throw new HttpsError('failed-precondition', 'Activate the POS before completing checkout.');
  const productRefs = requestedItems.map((item) => db.collection('smePosProducts').doc(item.productId));
  const customerRef = customerId ? db.collection('smePosCustomers').doc(customerId) : null;
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const saleRef = db.collection('smePosSales').doc();

  return db.runTransaction(async (transaction) => {
    const [command, customerSnapshot, productSnapshots] = await Promise.all([
      transaction.get(commandRef), customerRef ? transaction.get(customerRef) : Promise.resolve(null), Promise.all(productRefs.map((ref) => transaction.get(ref))),
    ]);
    if (command.exists) return command.data()?.result;
    if (customerSnapshot && (!customerSnapshot.exists || customerSnapshot.data()?.spaceId !== spaceId || customerSnapshot.data()?.archivedAt || customerSnapshot.data()?.deletedAt)) throw new HttpsError('failed-precondition', 'Choose an active customer.');

    let subtotalMinor = 0;
    let costMinor = 0;
    let itemCount = 0;
    const saleItems: DocumentData[] = productSnapshots.map((snapshot, index) => {
      if (!snapshot.exists) throw new HttpsError('not-found', 'One of the products was not found.');
      const product = snapshot.data() || {};
      const requestItem = requestedItems[index];
      if (product.spaceId !== spaceId || product.ownerId !== context.settings.ownerId || product.archivedAt) throw new HttpsError('failed-precondition', 'One of the products is unavailable.');
      const unitPriceMinor = positiveMoney(product.sellingPriceMinor);
      const unitCostMinor = product.costPriceMinor == null ? 0 : nonNegativeMoney(product.costPriceMinor);
      const quantity = requestItem.quantity;
      if (product.trackStock !== false) {
        const onHand = smePosQuantity(product.quantityOnHand, 'Product stock');
        const reserved = smePosQuantity(product.reservedQuantity || 0, 'Reserved product stock');
        const available = Math.max(0, onHand - reserved);
        if (available < 1) throw new HttpsError('failed-precondition', `${product.name || 'A product'} is out of stock or fully reserved.`);
        if (available < quantity) throw new HttpsError('failed-precondition', `${product.name || 'A product'} only has ${available} available after reservations.`);
      }
      const lineTotalMinor = unitPriceMinor * quantity;
      const lineCostMinor = unitCostMinor * quantity;
      if (!Number.isSafeInteger(lineTotalMinor) || !Number.isSafeInteger(lineCostMinor)) throw new HttpsError('out-of-range', 'Sale amount is too large.');
      subtotalMinor += lineTotalMinor; costMinor += lineCostMinor; itemCount += quantity;
      return { productId: snapshot.id, productName: String(product.name || 'Product'), sku: String(product.sku || ''), barcode: String(product.barcode || ''), quantity, unitPriceMinor, unitCostMinor, lineTotalMinor, lineCostMinor, returnedQuantity: 0, quickAdd: false };
    });

    quickItems.forEach((item, index) => {
      const lineTotalMinor = item.unitPriceMinor * item.quantity;
      if (!Number.isSafeInteger(lineTotalMinor)) throw new HttpsError('out-of-range', 'Quick Add amount is too large.');
      subtotalMinor += lineTotalMinor;
      itemCount += item.quantity;
      saleItems.push({
        productId: `quick-${saleRef.id}-${index}`,
        productName: item.name,
        sku: '', barcode: '', quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, unitCostMinor: 0,
        lineTotalMinor, lineCostMinor: 0, returnedQuantity: 0, quickAdd: true,
      });
    });

    if (discountMinor >= subtotalMinor) throw new HttpsError('invalid-argument', 'Discount must be less than the subtotal.');
    const totalMinor = subtotalMinor - discountMinor;
    const profitMinor = totalMinor - costMinor;
    const paymentRows = parseSmePosPaymentRows(request.data || {}, totalMinor);
    const now = FieldValue.serverTimestamp();
    const payments = await postSmePosPayments({
      transaction, rows: paymentRows, settings: context.settings, spaceId, uid, idempotencyKey: key, now,
      transactionDate: saleDate, direction: 'in', entryType: 'sme_pos_sale',
      counterparty: customerSnapshot?.data()?.name || 'POS customer', note: note || `POS sale ${saleRef.id}`, categoryId: 'income-sales',
      extra: { posSaleId: saleRef.id },
    });

    productSnapshots.forEach((snapshot, index) => {
      const product = snapshot.data() || {};
      const quantity = requestedItems[index].quantity;
      transaction.update(snapshot.ref, {
        quantityOnHand: product.trackStock === false ? 0 : Number(product.quantityOnHand || 0) - quantity,
        soldQuantity: Number(product.soldQuantity || 0) + quantity,
        salesRevenueMinor: Number(product.salesRevenueMinor || 0) + saleItems[index].lineTotalMinor,
        updatedAt: now,
      });
    });
    if (customerRef && customerSnapshot) transaction.update(customerRef, { totalSpentMinor: Number(customerSnapshot.data()?.totalSpentMinor || 0) + totalMinor, visitCount: Number(customerSnapshot.data()?.visitCount || 0) + 1, lastSaleAt: now, updatedAt: now });
    const receiptNumber = displayId('RCP');
    const firstPayment = payments[0];
    transaction.create(saleRef, {
      displayId: displayId('SAL'), receiptNumber, spaceId, ownerId: context.settings.ownerId, createdBy: uid, status: 'completed', returnStatus: 'not_returned', sourceMode: context.settings.mode,
      customerId, customerName: customerSnapshot?.data()?.name || null,
      paymentAccountId: firstPayment.accountId, paymentAccountName: firstPayment.accountName, paymentMethod: firstPayment.paymentMethod, paymentMethodLabel: firstPayment.paymentMethodLabel,
      payments, items: saleItems, itemCount, subtotalMinor, discountMinor, totalMinor, costMinor, profitMinor, returnedMinor: 0, currency: context.settings.currency, saleDate, note,
      transactionId: firstPayment.transactionId, ledgerEntryId: firstPayment.ledgerEntryId, transactionIds: payments.map((item) => item.transactionId), ledgerEntryIds: payments.map((item) => item.ledgerEntryId), reservationId: null,
      receiptName: context.settings.receiptName || context.settings.shopName || context.space.name || 'Receipt', receiptFooter: context.settings.receiptFooter || '',
      createdAt: now, updatedAt: now,
    });
    const result = { saleId: saleRef.id, receiptNumber, transactionId: firstPayment.transactionId, transactionIds: payments.map((item) => item.transactionId) };
    transaction.create(commandRef, { uid, kind: 'checkout_standard_pos', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: 'pos_sale_completed', targetType: 'sme_pos_sale', targetId: saleRef.id, summary: `Completed POS sale ${receiptNumber} for ${totalMinor / 100} ${context.settings.currency}${quickItems.length ? ` with ${quickItems.length} Quick Add line(s)` : ''}.`, now });
    return result;
  });
});

function parseMarketplaceCheckoutItems(value: unknown): Array<{ listingId: string; quantity: number }> {
  if (!Array.isArray(value) || value.length > 50) {
    throw new HttpsError('invalid-argument', 'Checkout can contain up to 50 listing lines.');
  }
  const seen = new Set<string>();
  return value.map((row) => {
    if (!row || typeof row !== 'object') throw new HttpsError('invalid-argument', 'Invalid Marketplace listing.');
    const item = row as Record<string, unknown>;
    const listingId = stringValue(item.listingId, 'Listing ID', 80);
    if (seen.has(listingId)) throw new HttpsError('invalid-argument', 'The same listing appears more than once.');
    seen.add(listingId);
    return { listingId, quantity: integerBetween(item.quantity, 'Quantity', 1, 9_999) };
  });
}

function marketplaceCommissionValues(data: Record<string, unknown>, sellingPriceMinor?: number) {
  const commissionType = oneOf(data.commissionType, smePosCommissionTypes, 'commission type');
  const commissionRateBps = commissionType === 'percentage'
    ? integerBetween(data.commissionRateBps ?? 0, 'Commission percentage', 0, 10_000)
    : 0;
  const commissionMinor = commissionType === 'fixed_per_item'
    ? nonNegativeMoney(data.commissionMinor ?? 0)
    : 0;
  if (commissionType === 'fixed_per_item' && sellingPriceMinor != null && commissionMinor >= sellingPriceMinor) {
    throw new HttpsError('invalid-argument', 'Fixed commission must be lower than the listing selling price.');
  }
  return { commissionType, commissionRateBps, commissionMinor };
}

function requireMarketplaceSettings(context: SmePosActorContext) {
  if (context.settings.mode !== 'marketplace_consignment') {
    throw new HttpsError('failed-precondition', 'Change this SME Space to Marketplace Consignment POS first.');
  }
}

function marketplaceSortValue(data: DocumentData): number {
  const value = data.updatedAt || data.createdAt;
  return value instanceof Timestamp ? value.toMillis() : 0;
}

export const getMarketplacePosWorkspace = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'stock_staff', 'seller', 'viewer']);
  requireMarketplaceSettings(context);

  const [sellerSnapshot, listingSnapshot, saleSnapshot] = await Promise.all([
    db.collection('smePosSellers').where('spaceId', '==', spaceId).get(),
    db.collection('smePosListings').where('spaceId', '==', spaceId).get(),
    db.collection('smePosSales').where('spaceId', '==', spaceId).get(),
  ]);

  const allSellers = sellerSnapshot.docs
    .map((item): DocumentData => ({ id: item.id, ...item.data() }))
    .filter((item) => !item.archivedAt && !item.deletedAt)
    .sort((a, b) => marketplaceSortValue(b) - marketplaceSortValue(a));
  const allListings = listingSnapshot.docs
    .map((item): DocumentData => ({ id: item.id, ...item.data() }))
    .filter((item) => !item.archivedAt && !item.sellerDeletedAt)
    .sort((a, b) => marketplaceSortValue(b) - marketplaceSortValue(a));
  const mySeller = allSellers.find((item) => item.linkedUid === uid) || null;
  const mySellerListings = mySeller
    ? allListings.filter((item) => item.sellerId === mySeller.id)
    : [];
  const mySellerSales = mySeller
    ? saleSnapshot.docs
        .map((item): DocumentData => ({ id: item.id, ...item.data() }))
        .filter((item) => item.sourceMode === 'marketplace_consignment'
          && Array.isArray(item.items)
          && item.items.some((line: DocumentData) => line.sellerId === mySeller.id))
        .map((sale) => {
          const items = (sale.items as DocumentData[]).filter((line) => line.sellerId === mySeller.id);
          const sellerEarningsMinor = items.reduce((sum, line) => sum + Math.max(0, Number(line.sellerEarningMinor || 0) - Number(line.sellerEarningReturnedMinor || 0)), 0);
          const commissionMinor = items.reduce((sum, line) => sum + Math.max(0, Number(line.commissionMinor || 0) - Number(line.commissionReturnedMinor || 0)), 0);
          const totalMinor = items.reduce((sum, line) => sum + Number(line.netLineMinor || line.lineTotalMinor || 0), 0);
          const returnedMinor = items.reduce((sum, line) => sum + Number(line.returnedMinor || 0), 0);
          return {
            id: sale.id, displayId: sale.displayId, receiptNumber: sale.receiptNumber, spaceId, ownerId: sale.ownerId,
            createdBy: sale.createdBy, status: sale.status, returnStatus: sale.returnStatus, sourceMode: sale.sourceMode,
            customerId: null, customerName: null, paymentAccountId: '', paymentAccountName: '', paymentMethod: null, paymentMethodLabel: null,
            items, itemCount: items.reduce((sum, line) => sum + Number(line.quantity || 0), 0), subtotalMinor: totalMinor,
            discountMinor: 0, totalMinor, costMinor: sellerEarningsMinor, profitMinor: commissionMinor,
            marketplaceCommissionMinor: commissionMinor, sellerEarningsMinor, sellerCount: 1, returnedMinor,
            currency: sale.currency, saleDate: sale.saleDate, note: '', transactionId: '', ledgerEntryId: '', transactionIds: [], ledgerEntryIds: [],
            receiptName: sale.receiptName, receiptFooter: '', createdAt: sale.createdAt, updatedAt: sale.updatedAt,
          };
        })
    : [];

  const [myLedgerSnapshot, myPayoutSnapshot, allPayoutSnapshot] = await Promise.all([
    mySeller ? db.collection('smePosSellerLedger').where('sellerId', '==', mySeller.id).get() : Promise.resolve(null),
    mySeller ? db.collection('smePosPayouts').where('sellerId', '==', mySeller.id).get() : Promise.resolve(null),
    ['owner', 'manager'].includes(context.role)
      ? db.collection('smePosPayouts').where('spaceId', '==', spaceId).get()
      : Promise.resolve(null),
  ]);

  const mySellerLedger = (myLedgerSnapshot?.docs || [])
    .map((item): DocumentData => ({ id: item.id, ...item.data() }))
    .filter((item) => item.spaceId === spaceId);
  const mySellerPayouts = (myPayoutSnapshot?.docs || [])
    .map((item): DocumentData => ({ id: item.id, ...item.data() }))
    .filter((item) => item.spaceId === spaceId)
    .map((item) => ({
      ...item,
      paymentAccountId: '',
      transactionId: '',
      ledgerEntryId: '',
      transactionIds: [],
      ledgerEntryIds: [],
      payments: Array.isArray(item.payments) ? item.payments.map((payment: DocumentData) => ({
        ...payment, accountId: '', transactionId: '', ledgerEntryId: '',
      })) : undefined,
    }));

  let sellers: DocumentData[] = [];
  let listings: DocumentData[] = [];
  let customers: DocumentData[] = [];
  let sales: DocumentData[] = [];
  let sellerLedger: DocumentData[] = [];
  let payouts: DocumentData[] = [];

  if (context.role === 'owner' || context.role === 'manager') {
    sellers = allSellers;
    listings = allListings;
    const [customersResult, salesResult] = await Promise.all([
      db.collection('smePosCustomers').where('spaceId', '==', spaceId).get(),
      saleSnapshot ? Promise.resolve(saleSnapshot) : db.collection('smePosSales').where('spaceId', '==', spaceId).get(),
    ]);
    customers = customersResult.docs
      .map((item): DocumentData => ({ id: item.id, ...item.data() }))
      .filter((item) => !item.archivedAt && !item.deletedAt);
    sales = salesResult.docs
      .map((item): DocumentData => ({ id: item.id, ...item.data() }))
      .filter((item) => item.sourceMode === 'marketplace_consignment');
    payouts = (allPayoutSnapshot?.docs || []).map((item): DocumentData => ({ id: item.id, ...item.data() }));
  } else if (context.role === 'cashier') {
    sellers = allSellers.map((item) => ({
      id: item.id,
      displayId: item.displayId,
      spaceId: item.spaceId,
      ownerId: item.ownerId,
      name: item.name,
      phone: '',
      email: '',
      note: '',
      linkedUid: null,
      defaultCommissionType: 'percentage',
      defaultCommissionRateBps: 0,
      defaultCommissionMinor: 0,
      grossSalesMinor: 0,
      commissionEarnedMinor: 0,
      balanceMinor: 0,
      paidOutMinor: 0,
      soldQuantity: 0,
      currency: item.currency,
      archivedAt: null,
    }));
    listings = allListings.map((item) => ({
      ...item,
      commissionType: 'percentage', commissionRateBps: 0, commissionMinor: 0,
      commissionEarnedMinor: 0, sellerEarningsMinor: 0, note: '',
    }));
    const customersResult = await db.collection('smePosCustomers').where('spaceId', '==', spaceId).get();
    customers = customersResult.docs
      .map((item): DocumentData => ({ id: item.id, ...item.data() }))
      .filter((item) => !item.archivedAt && !item.deletedAt);
    sales = (saleSnapshot?.docs || [])
      .map((item): DocumentData => ({ id: item.id, ...item.data() }))
      .filter((item) => item.sourceMode === 'marketplace_consignment' && item.createdBy === uid)
      .map((item) => ({
        ...item,
        items: Array.isArray(item.items) ? item.items.map((line: DocumentData) => ({
          ...line,
          unitCostMinor: 0, lineCostMinor: 0, commissionType: undefined, commissionRateBps: undefined, commissionMinor: 0, sellerEarningMinor: 0,
          commissionReturnedMinor: 0, sellerEarningReturnedMinor: 0,
        })) : [],
        payments: Array.isArray(item.payments) ? item.payments.map((payment: DocumentData) => ({
          ...payment, accountId: '', transactionId: '', ledgerEntryId: '',
        })) : undefined,
        transactionId: '', ledgerEntryId: '', transactionIds: [], ledgerEntryIds: [],
        costMinor: 0, profitMinor: 0, marketplaceCommissionMinor: 0, sellerEarningsMinor: 0,
      }));
  } else if (context.role === 'stock_staff') {
    listings = allListings.map((item) => ({
      ...item,
      sellingPriceMinor: 0, commissionType: 'percentage', commissionRateBps: 0, commissionMinor: 0,
      grossSalesMinor: 0, commissionEarnedMinor: 0, sellerEarningsMinor: 0, note: '',
    }));
  } else if (context.role === 'viewer') {
    listings = allListings.map((item) => ({
      ...item,
      commissionType: 'percentage', commissionRateBps: 0, commissionMinor: 0,
      grossSalesMinor: 0, commissionEarnedMinor: 0, sellerEarningsMinor: 0, note: '',
    }));
    const customersResult = await db.collection('smePosCustomers').where('spaceId', '==', spaceId).get();
    customers = customersResult.docs
      .map((item): DocumentData => ({ id: item.id, ...item.data() }))
      .filter((item) => !item.archivedAt && !item.deletedAt)
      .map((item) => ({ id: item.id, displayId: item.displayId, spaceId: item.spaceId, ownerId: item.ownerId, name: item.name, totalSpentMinor: 0, visitCount: item.visitCount || 0 }));
  } else if (mySeller) {
    sellers = [mySeller];
    listings = mySellerListings;
    sales = mySellerSales;
    sellerLedger = mySellerLedger;
    payouts = mySellerPayouts;
  }

  const sorter = (a: DocumentData, b: DocumentData) => marketplaceSortValue(b) - marketplaceSortValue(a);
  return {
    sellers: sellers.sort(sorter),
    listings: listings.sort(sorter),
    customers: customers.sort(sorter),
    sales: sales.sort(sorter),
    sellerLedger: sellerLedger.sort(sorter),
    payouts: payouts.sort(sorter),
    mySeller,
    mySellerListings: mySellerListings.sort(sorter),
    mySellerSales: mySellerSales.sort(sorter),
    mySellerLedger: mySellerLedger.sort(sorter),
    mySellerPayouts: mySellerPayouts.sort(sorter),
  };
});

export const saveMarketplaceSeller = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const sellerId = optionalString(request.data?.sellerId, 80) || null;
  const name = stringValue(request.data?.name, 'Seller name', 100);
  const phone = optionalPhone(request.data?.phone);
  const email = optionalString(request.data?.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  const note = optionalString(request.data?.note, 300);
  const linkedUid = optionalString(request.data?.linkedUid, 128) || null;
  const commission = marketplaceCommissionValues(request.data || {});
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  requireMarketplaceSettings(context);
  if (!sellerId) {
    await assertBasicSmeSellerCapacity(
      context.settings.ownerId,
      spaceId,
    );
  }

  if (linkedUid) {
    const [member, access, duplicate] = await Promise.all([
      db.collection('spaceMembers').doc(`${spaceId}_${linkedUid}`).get(),
      db.collection('smePosAccess').doc(`${spaceId}_${linkedUid}`).get(),
      db.collection('smePosSellers').where('spaceId', '==', spaceId).get(),
    ]);
    if (!member.exists || ['suspended', 'removed'].includes(String(member.data()?.status || ''))) throw new HttpsError('failed-precondition', 'Choose an active SME Space member.');
    if (!access.exists || access.data()?.status !== 'active' || !['manager', 'cashier', 'stock_staff', 'seller', 'viewer'].includes(String(access.data()?.role || ''))) {
      throw new HttpsError('failed-precondition', 'Choose a team member with active POS access. Their staff role stays unchanged when they are linked as a seller.');
    }
    if (duplicate.docs.some((item) => item.id !== sellerId && item.data().linkedUid === linkedUid && !item.data().archivedAt)) throw new HttpsError('already-exists', 'This login is already linked to another active seller.');
  }

  const sellerRef = sellerId ? db.collection('smePosSellers').doc(sellerId) : db.collection('smePosSellers').doc();
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(sellerRef)]);
    if (command.exists) return command.data()?.result;
    if (sellerId && (!current.exists || current.data()?.spaceId !== spaceId)) throw new HttpsError('not-found', 'Seller not found.');
    if (current.data()?.deletedAt) throw new HttpsError('failed-precondition', 'Deleted sellers cannot be edited.');
    const existing = current.data() || {};
    const now = FieldValue.serverTimestamp();

    if (!sellerId) {
      await assertBasicSmeCapacityInTransaction(
        transaction,
        context.settings.ownerId,
        spaceId,
        'sellers',
      );
    }

    transaction.set(sellerRef, {
      displayId: existing.displayId || displayId('SEL'), spaceId, ownerId: context.settings.ownerId,
      name, phone, email, note, linkedUid,
      defaultCommissionType: commission.commissionType,
      defaultCommissionRateBps: commission.commissionRateBps,
      defaultCommissionMinor: commission.commissionMinor,
      grossSalesMinor: Number(existing.grossSalesMinor || 0), commissionEarnedMinor: Number(existing.commissionEarnedMinor || 0),
      balanceMinor: Number(existing.balanceMinor || 0), paidOutMinor: Number(existing.paidOutMinor || 0), soldQuantity: Number(existing.soldQuantity || 0),
      currency: context.settings.currency || 'BND', archivedAt: existing.archivedAt || null,
      createdAt: existing.createdAt || now, updatedAt: now,
    }, { merge: true });
    const result = { sellerId: sellerRef.id };
    transaction.create(commandRef, { uid, kind: 'save_marketplace_seller', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: sellerId ? 'marketplace_seller_updated' : 'marketplace_seller_created', targetType: 'sme_pos_seller', targetId: sellerRef.id, summary: `${sellerId ? 'Updated' : 'Added'} seller ${name}.`, now });
    return result;
  });
});

export const setMarketplaceSellerArchived = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const sellerId = stringValue(request.data?.sellerId, 'Seller ID', 80);
  const archived = request.data?.archived === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  requireMarketplaceSettings(context);
  if (archived) {
    const activeListings = await db.collection('smePosListings').where('spaceId', '==', spaceId).get();
    if (activeListings.docs.some((item) => item.data().sellerId === sellerId && !item.data().archivedAt)) throw new HttpsError('failed-precondition', 'Archive this seller’s active listings first.');
  }
  const sellerRef = db.collection('smePosSellers').doc(sellerId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, seller, spaceSellers] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(sellerRef),
      transaction.get(db.collection('smePosSellers').where('spaceId', '==', spaceId)),
    ]);
    if (command.exists) return command.data()?.result;
    if (!seller.exists || seller.data()?.spaceId !== spaceId) throw new HttpsError('not-found', 'Seller not found.');
    if (!archived && seller.data()?.deletedAt) throw new HttpsError('failed-precondition', 'Deleted sellers cannot be restored.');
    if (!archived) {
      const linkedUid = seller.data()?.linkedUid;
      if (linkedUid && spaceSellers.docs.some((item) => item.id !== sellerId && item.data().linkedUid === linkedUid && !item.data().archivedAt)) {
        throw new HttpsError('already-exists', 'This login is already linked to another active seller.');
      }
    }
    const now = FieldValue.serverTimestamp();
    transaction.update(sellerRef, { archivedAt: archived ? now : null, updatedAt: now });
    const result = { sellerId, archived };
    transaction.create(commandRef, { uid, kind: 'archive_marketplace_seller', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const deleteMarketplaceSeller = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const sellerId = stringValue(request.data?.sellerId, 'Seller ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner']);
  requireMarketplaceSettings(context);

  const sellerRef = db.collection('smePosSellers').doc(sellerId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const [sellerSnapshot, listingsSnapshot, salesSnapshot, ledgerSnapshot, payoutSnapshot, reservationsSnapshot] = await Promise.all([
    sellerRef.get(),
    db.collection('smePosListings').where('spaceId', '==', spaceId).get(),
    db.collection('smePosSales').where('spaceId', '==', spaceId).get(),
    db.collection('smePosSellerLedger').where('sellerId', '==', sellerId).get(),
    db.collection('smePosPayouts').where('sellerId', '==', sellerId).get(),
    db.collection('smePosReservations').where('spaceId', '==', spaceId).get(),
  ]);

  if (!sellerSnapshot.exists || sellerSnapshot.data()?.spaceId !== spaceId) throw new HttpsError('not-found', 'Seller not found.');
  if (Number(sellerSnapshot.data()?.balanceMinor || 0) !== 0) {
    throw new HttpsError('failed-precondition', 'Settle this seller’s balance before deleting the seller profile.');
  }
  const hasActiveBooking = reservationsSnapshot.docs.some((item) => !['completed', 'cancelled'].includes(String(item.data().status || ''))
    && Array.isArray(item.data().items) && item.data().items.some((line: DocumentData) => line?.sellerId === sellerId));
  if (hasActiveBooking) throw new HttpsError('failed-precondition', 'This seller has items in an active booking. Complete or cancel the booking before deleting the seller profile.');

  const sellerListings = listingsSnapshot.docs.filter((item) => item.data().sellerId === sellerId);
  if (sellerListings.length > 450) throw new HttpsError('failed-precondition', 'This seller has too many listing records to delete safely at once. Contact the owner support workflow.');
  const hasSaleHistory = salesSnapshot.docs.some((item) => Array.isArray(item.data().items)
    && item.data().items.some((line: DocumentData) => line?.sellerId === sellerId));
  const hasHistory = sellerListings.length > 0
    || hasSaleHistory
    || !ledgerSnapshot.empty
    || !payoutSnapshot.empty
    || Number(sellerSnapshot.data()?.soldQuantity || 0) > 0
    || Number(sellerSnapshot.data()?.grossSalesMinor || 0) > 0
    || Number(sellerSnapshot.data()?.commissionEarnedMinor || 0) > 0
    || Number(sellerSnapshot.data()?.paidOutMinor || 0) > 0;

  return db.runTransaction(async (transaction) => {
    const [command, seller] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(sellerRef),
    ]);
    if (command.exists) return command.data()?.result;
    if (!seller.exists || seller.data()?.spaceId !== spaceId) throw new HttpsError('not-found', 'Seller not found.');
    if (Number(seller.data()?.balanceMinor || 0) !== 0) throw new HttpsError('failed-precondition', 'Settle this seller’s balance before deleting the seller profile.');

    const now = FieldValue.serverTimestamp();
    let archivedListings = 0;
    if (hasHistory) {
      transaction.update(sellerRef, {
        archivedAt: now,
        deletedAt: now,
        deletedBy: uid,
        updatedAt: now,
      });
      sellerListings.forEach((listing) => {
        if (!listing.data().archivedAt) archivedListings += 1;
        transaction.update(listing.ref, {
          archivedAt: listing.data().archivedAt || now,
          sellerDeletedAt: now,
          updatedAt: now,
        });
      });
    } else {
      transaction.delete(sellerRef);
    }

    const result = { sellerId, preservedHistory: hasHistory, archivedListings };
    transaction.create(commandRef, { uid, kind: 'delete_marketplace_seller', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: context.member.displayName || context.member.email,
      action: 'marketplace_seller_deleted',
      targetType: 'sme_pos_seller',
      targetId: sellerId,
      summary: hasHistory
        ? `Deleted seller ${seller.data()?.name || ''}; historical records were preserved and ${archivedListings} active listing(s) were removed from the register.`
        : `Deleted seller ${seller.data()?.name || ''}.`,
      now,
    });
    return result;
  });
});

export const saveMarketplaceListing = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const listingId = optionalString(request.data?.listingId, 80) || null;
  const sellerId = stringValue(request.data?.sellerId, 'Seller', 80);
  const name = stringValue(request.data?.name, 'Item name', 100);
  const category = optionalString(request.data?.category, 60);
  const sku = optionalString(request.data?.sku, 50);
  const { barcode, barcodeKey } = smePosBarcode(request.data?.barcode);
  const photoPathProvided = Object.prototype.hasOwnProperty.call(request.data || {}, 'photoPath');
  const photoPath = photoPathProvided ? smePosItemPhotoPath(request.data?.photoPath, spaceId) : undefined;
  const note = optionalString(request.data?.note, 300);
  const condition = oneOf(request.data?.condition, smePosListingConditions, 'item condition');
  const conditionNote = optionalString(request.data?.conditionNote, 120);
  const sellingPriceMinor = positiveMoney(request.data?.sellingPriceMinor);
  const commission = marketplaceCommissionValues(request.data || {}, sellingPriceMinor);
  const quantityOnHand = smePosQuantity(request.data?.quantityOnHand, 'Available quantity');
  const lowStockLevel = smePosQuantity(request.data?.lowStockLevel, 'Low stock alert');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'stock_staff', 'seller', 'viewer']);
  requireMarketplaceSettings(context);
  if (!listingId) {
    await assertBasicSmeInventoryCapacity(
      context.settings.ownerId,
      spaceId,
    );
  }
  const canManageAnySellerListing = context.role === 'owner' || context.role === 'manager';
  if (!canManageAnySellerListing && !listingId) throw new HttpsError('permission-denied', 'Use Add stock to create items for your linked seller profile.');

  const listingRef = listingId ? db.collection('smePosListings').doc(listingId) : db.collection('smePosListings').doc();
  const listingQuery = db.collection('smePosListings').where('spaceId', '==', spaceId);
  const sellerRef = db.collection('smePosSellers').doc(sellerId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, current, seller, spaceListings] = await Promise.all([
      transaction.get(commandRef), transaction.get(listingRef), transaction.get(sellerRef), transaction.get(listingQuery),
    ]);
    if (command.exists) return command.data()?.result;
    if (listingId && (!current.exists || current.data()?.spaceId !== spaceId)) throw new HttpsError('not-found', 'Listing not found.');
    if (!seller.exists || seller.data()?.spaceId !== spaceId || seller.data()?.archivedAt || seller.data()?.deletedAt) throw new HttpsError('failed-precondition', 'Choose an active seller.');
    const existing = current.data() || {};
    if (!canManageAnySellerListing) {
      if (!current.exists || existing.sellerId !== sellerId || seller.data()?.linkedUid !== uid) {
        throw new HttpsError('permission-denied', 'You can edit only stock linked to your own seller profile.');
      }
    }
    assertUniqueSmePosBarcode(spaceListings.docs, listingRef.id, barcodeKey, 'Marketplace listing');
    const reservedQuantity = smePosQuantity(existing.reservedQuantity || 0, 'Reserved quantity');
    if (current.exists && quantityOnHand < reservedQuantity) throw new HttpsError('failed-precondition', `Available quantity cannot be lower than ${reservedQuantity} unit(s) currently reserved in bookings.`);
    if (current.exists && reservedQuantity > 0 && existing.sellerId && existing.sellerId !== sellerId) throw new HttpsError('failed-precondition', 'This listing has active booked quantity. Complete or cancel the booking before changing its seller.');
    const now = FieldValue.serverTimestamp();

    if (!listingId) {
      await assertBasicSmeCapacityInTransaction(
        transaction,
        context.settings.ownerId,
        spaceId,
        'inventory',
      );
    }

    transaction.set(listingRef, {
      displayId: existing.displayId || displayId('LST'), spaceId, ownerId: context.settings.ownerId,
      sellerId, sellerName: seller.data()?.name || 'Seller', sellerUid: seller.data()?.linkedUid || null,
      name, category, sku, barcode, barcodeKey,
      photoPath: photoPathProvided ? photoPath : (existing.photoPath || null),
      note, condition, conditionNote, sellingPriceMinor, currency: context.settings.currency || 'BND',
      commissionType: canManageAnySellerListing ? commission.commissionType : existing.commissionType,
      commissionRateBps: canManageAnySellerListing ? commission.commissionRateBps : Number(existing.commissionRateBps || 0),
      commissionMinor: canManageAnySellerListing ? commission.commissionMinor : Number(existing.commissionMinor || 0),
      quantityOnHand, reservedQuantity, lowStockLevel,
      soldQuantity: Number(existing.soldQuantity || 0), grossSalesMinor: Number(existing.grossSalesMinor || 0),
      commissionEarnedMinor: Number(existing.commissionEarnedMinor || 0), sellerEarningsMinor: Number(existing.sellerEarningsMinor || 0),
      stockSource: existing.stockSource || 'catalog',
      registeredBy: existing.registeredBy || null,
      registeredAt: existing.registeredAt || null,
      archivedAt: existing.archivedAt || null, createdAt: existing.createdAt || now, updatedAt: now,
    }, { merge: true });
    const result = { listingId: listingRef.id };
    transaction.create(commandRef, { uid, kind: 'save_marketplace_listing', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: listingId ? 'marketplace_listing_updated' : 'marketplace_listing_created', targetType: 'sme_pos_listing', targetId: listingRef.id, summary: `${listingId ? 'Updated' : 'Added'} ${name} for ${seller.data()?.name || 'a seller'}.`, now });
    return result;
  });
});

export const registerExistingMarketplaceListing = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const sellerId = stringValue(request.data?.sellerId, 'Seller', 80);
  const name = stringValue(request.data?.name, 'Item name', 100);
  const category = optionalString(request.data?.category, 60);
  const sku = optionalString(request.data?.sku, 50);
  const { barcode, barcodeKey } = smePosBarcode(request.data?.barcode);
  const photoPath = smePosItemPhotoPath(request.data?.photoPath, spaceId);
  const note = optionalString(request.data?.note, 300);
  const condition = oneOf(request.data?.condition, smePosListingConditions, 'item condition');
  const conditionNote = optionalString(request.data?.conditionNote, 120);
  const sellingPriceMinor = positiveMoney(request.data?.sellingPriceMinor);
  const quantityOnHand = smePosQuantity(request.data?.quantityOnHand, 'Available quantity');
  const lowStockLevel = smePosQuantity(request.data?.lowStockLevel, 'Low stock alert');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'stock_staff', 'seller', 'viewer']);
  requireMarketplaceSettings(context);
  await assertBasicSmeInventoryCapacity(
    context.settings.ownerId,
    spaceId,
  );

  const listingRef = db.collection('smePosListings').doc();
  const sellerRef = db.collection('smePosSellers').doc(sellerId);
  const listingQuery = db.collection('smePosListings').where('spaceId', '==', spaceId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, seller, spaceListings] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(sellerRef),
      transaction.get(listingQuery),
    ]);
    if (command.exists) return command.data()?.result;
    if (!seller.exists || seller.data()?.spaceId !== spaceId || seller.data()?.archivedAt || seller.data()?.deletedAt) {
      throw new HttpsError('failed-precondition', 'Choose an active seller.');
    }
    if (!['owner', 'manager', 'cashier'].includes(context.role) && seller.data()?.linkedUid !== uid) {
      throw new HttpsError('permission-denied', 'You can add stock only to your own linked seller profile.');
    }
    assertUniqueSmePosBarcode(spaceListings.docs, listingRef.id, barcodeKey, 'Marketplace listing');

    const commission = marketplaceCommissionValues({
      commissionType: seller.data()?.defaultCommissionType,
      commissionRateBps: seller.data()?.defaultCommissionRateBps,
      commissionMinor: seller.data()?.defaultCommissionMinor,
    }, sellingPriceMinor);
    const now = FieldValue.serverTimestamp();


    await assertBasicSmeCapacityInTransaction(
      transaction,
      context.settings.ownerId,
      spaceId,
      'inventory',
    );

    transaction.create(listingRef, {
      displayId: displayId('LST'),
      spaceId,
      ownerId: context.settings.ownerId,
      sellerId,
      sellerName: seller.data()?.name || 'Seller',
      sellerUid: seller.data()?.linkedUid || null,
      name,
      category,
      sku,
      barcode,
      barcodeKey,
      photoPath,
      note,
      condition,
      conditionNote,
      sellingPriceMinor,
      currency: context.settings.currency || 'BND',
      commissionType: commission.commissionType,
      commissionRateBps: commission.commissionRateBps,
      commissionMinor: commission.commissionMinor,
      quantityOnHand,
      reservedQuantity: 0,
      lowStockLevel,
      soldQuantity: 0,
      grossSalesMinor: 0,
      commissionEarnedMinor: 0,
      sellerEarningsMinor: 0,
      stockSource: 'existing_stock',
      registeredBy: uid,
      registeredAt: now,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = { listingId: listingRef.id };
    transaction.create(commandRef, { uid, kind: 'register_existing_marketplace_listing', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: context.member.displayName || context.member.email,
      action: 'marketplace_existing_stock_registered',
      targetType: 'sme_pos_listing',
      targetId: listingRef.id,
      summary: `Registered existing stock ${name} for ${seller.data()?.name || 'a seller'} (${quantityOnHand} on hand).`,
      now,
    });
    return result;
  });
});

export const updateMarketplaceListingStock = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const listingId = stringValue(request.data?.listingId, 'Listing ID', 80);
  const quantityOnHand = smePosQuantity(request.data?.quantityOnHand, 'Available quantity');
  const lowStockLevel = smePosQuantity(request.data?.lowStockLevel, 'Low stock alert');
  const stocktake = request.data?.stocktake === true;
  const note = optionalString(request.data?.note, 300);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'stock_staff', 'seller', 'viewer']);
  requireMarketplaceSettings(context);
  const listingRef = db.collection('smePosListings').doc(listingId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, listing] = await Promise.all([transaction.get(commandRef), transaction.get(listingRef)]);
    if (command.exists) return command.data()?.result;
    if (!listing.exists || listing.data()?.spaceId !== spaceId || listing.data()?.archivedAt) throw new HttpsError('not-found', 'Active listing not found.');
    if (!['owner', 'manager', 'stock_staff'].includes(context.role)) {
      const seller = await transaction.get(db.collection('smePosSellers').doc(String(listing.data()?.sellerId || '')));
      if (!seller.exists || seller.data()?.spaceId !== spaceId || seller.data()?.linkedUid !== uid || seller.data()?.archivedAt || seller.data()?.deletedAt) {
        throw new HttpsError('permission-denied', 'You can update stock only for your own linked seller stock.');
      }
    }
    const reservedQuantity = smePosQuantity(listing.data()?.reservedQuantity || 0, 'Reserved quantity');
    if (quantityOnHand < reservedQuantity) throw new HttpsError('failed-precondition', `Stock cannot be counted below ${reservedQuantity} unit(s) currently reserved in bookings.`);
    const previousQuantity = smePosQuantity(listing.data()?.quantityOnHand, 'Current quantity');
    const difference = quantityOnHand - previousQuantity;
    const now = FieldValue.serverTimestamp();
    transaction.update(listingRef, { quantityOnHand, lowStockLevel, updatedAt: now });
    const result = { listingId, previousQuantity, quantityOnHand, difference, lowStockLevel };
    transaction.create(commandRef, { uid, kind: stocktake ? 'stocktake_marketplace_listing' : 'update_marketplace_listing_stock', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: context.member.displayName || context.member.email,
      action: stocktake ? 'marketplace_stocktake_counted' : 'marketplace_stock_updated',
      targetType: 'sme_pos_listing',
      targetId: listingId,
      summary: stocktake
        ? `Counted ${quantityOnHand} unit(s) of ${listing.data()?.name || 'a Marketplace listing'}; difference ${difference >= 0 ? '+' : ''}${difference}.${note ? ` ${note}` : ''}`
        : `Updated stock for ${listing.data()?.name || 'a Marketplace listing'} to ${quantityOnHand}.`,
      now,
    });
    return result;
  });
});

export const receiveMarketplaceListingStock = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const listingId = stringValue(request.data?.listingId, 'Listing ID', 80);
  const quantityReceived = integerBetween(request.data?.quantityReceived, 'Quantity received', 1, 999_999);
  const note = optionalString(request.data?.note, 300);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'stock_staff', 'seller', 'viewer']);
  requireMarketplaceSettings(context);
  const listingRef = db.collection('smePosListings').doc(listingId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, listing] = await Promise.all([transaction.get(commandRef), transaction.get(listingRef)]);
    if (command.exists) return command.data()?.result;
    if (!listing.exists || listing.data()?.spaceId !== spaceId || listing.data()?.archivedAt) throw new HttpsError('not-found', 'Active listing not found.');
    if (!['owner', 'manager', 'stock_staff'].includes(context.role)) {
      const seller = await transaction.get(db.collection('smePosSellers').doc(String(listing.data()?.sellerId || '')));
      if (!seller.exists || seller.data()?.spaceId !== spaceId || seller.data()?.linkedUid !== uid || seller.data()?.archivedAt || seller.data()?.deletedAt) {
        throw new HttpsError('permission-denied', 'You can receive stock only for your own linked seller stock.');
      }
    }
    const currentQuantity = smePosQuantity(listing.data()?.quantityOnHand, 'Current quantity');
    const quantityOnHand = currentQuantity + quantityReceived;
    if (quantityOnHand > 999_999) throw new HttpsError('failed-precondition', 'Received stock would exceed the maximum available quantity.');
    const now = FieldValue.serverTimestamp();
    transaction.update(listingRef, { quantityOnHand, updatedAt: now });
    const result = { listingId, quantityReceived, quantityOnHand };
    transaction.create(commandRef, { uid, kind: 'receive_marketplace_listing_stock', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email,
      action: 'marketplace_stock_received', targetType: 'sme_pos_listing', targetId: listingId,
      summary: note
        ? `Received ${quantityReceived} unit(s) of ${listing.data()?.name || 'a Marketplace listing'}: ${note}`
        : `Received ${quantityReceived} unit(s) of ${listing.data()?.name || 'a Marketplace listing'}.`,
      now,
    });
    return result;
  });
});

export const setMarketplaceListingArchived = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const listingId = stringValue(request.data?.listingId, 'Listing ID', 80);
  const archived = request.data?.archived === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier', 'stock_staff', 'seller', 'viewer']);
  requireMarketplaceSettings(context);
  const listingRef = db.collection('smePosListings').doc(listingId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, listing] = await Promise.all([transaction.get(commandRef), transaction.get(listingRef)]);
    if (command.exists) return command.data()?.result;
    if (!listing.exists || listing.data()?.spaceId !== spaceId) throw new HttpsError('not-found', 'Listing not found.');
    if (!['owner', 'manager'].includes(context.role)) {
      const seller = await transaction.get(db.collection('smePosSellers').doc(String(listing.data()?.sellerId || '')));
      if (!seller.exists || seller.data()?.spaceId !== spaceId || seller.data()?.linkedUid !== uid || seller.data()?.archivedAt || seller.data()?.deletedAt) {
        throw new HttpsError('permission-denied', 'You can archive or restore only your own linked seller stock.');
      }
    }
    if (archived && Number(listing.data()?.reservedQuantity || 0) > 0) throw new HttpsError('failed-precondition', 'This listing has active booked quantity. Complete or cancel the booking before archiving it.');
    if (!archived) {
      if (listing.data()?.sellerDeletedAt) throw new HttpsError('failed-precondition', 'This listing was removed when its seller profile was deleted.');
      const seller = await transaction.get(db.collection('smePosSellers').doc(String(listing.data()?.sellerId || '')));
      if (!seller.exists || seller.data()?.spaceId !== spaceId || seller.data()?.archivedAt || seller.data()?.deletedAt) {
        throw new HttpsError('failed-precondition', 'Restore or recreate the seller relationship before restoring this listing.');
      }
    }
    const now = FieldValue.serverTimestamp();
    transaction.update(listingRef, { archivedAt: archived ? now : null, updatedAt: now });
    const result = { listingId, archived };
    transaction.create(commandRef, { uid, kind: 'archive_marketplace_listing', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const deleteMarketplaceListingPermanently = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);
    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );
    const listingId = stringValue(
      request.data?.listingId,
      'Listing ID',
      80,
    );
    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const context = await requireSmePosActor(
      spaceId,
      uid,
      ['owner', 'manager', 'cashier', 'stock_staff', 'seller', 'viewer'],
    );

    requireMarketplaceSettings(context);

    const listingRef = db
      .collection('smePosListings')
      .doc(listingId);

    const commandRef = db
      .collection('smePosCommands')
      .doc(commandId(uid, key));

    /*
     * Owner can delete any eligible listing.
     * Other POS roles can delete only a listing belonging
     * to the seller profile linked to their own login.
     */
    const authorizationListing = await listingRef.get();

    if (
      !authorizationListing.exists
      || authorizationListing.data()?.spaceId !== spaceId
      || authorizationListing.data()?.ownerId !== context.settings.ownerId
    ) {
      throw new HttpsError(
        'not-found',
        'Inventory item not found.',
      );
    }

    if (context.role !== 'owner') {
      const sellerId = String(
        authorizationListing.data()?.sellerId || '',
      );

      if (!sellerId) {
        throw new HttpsError(
          'permission-denied',
          'You can permanently delete only inventory linked to your own seller profile.',
        );
      }

      const authorizationSeller = await db
        .collection('smePosSellers')
        .doc(sellerId)
        .get();

      if (
        !authorizationSeller.exists
        || authorizationSeller.data()?.spaceId !== spaceId
        || authorizationSeller.data()?.linkedUid !== uid
        || authorizationSeller.data()?.archivedAt
        || authorizationSeller.data()?.deletedAt
      ) {
        throw new HttpsError(
          'permission-denied',
          'You can permanently delete only inventory linked to your own seller profile.',
        );
      }
    }

    const [
      salesSnapshot,
      reservationsSnapshot,
      ledgerSnapshot,
    ] = await Promise.all([
      db
        .collection('smePosSales')
        .where('spaceId', '==', spaceId)
        .get(),

      db
        .collection('smePosReservations')
        .where('spaceId', '==', spaceId)
        .get(),

      db
        .collection('smePosSellerLedger')
        .where('spaceId', '==', spaceId)
        .get(),
    ]);

    const hasSaleHistory = salesSnapshot.docs.some((sale) => {
      const items = Array.isArray(sale.data().items)
        ? sale.data().items
        : [];

      return items.some((item: DocumentData) =>
        String(
          item?.listingId
          || item?.productId
          || item?.itemId
          || '',
        ) === listingId
      );
    });

    if (hasSaleHistory) {
      throw new HttpsError(
        'failed-precondition',
        'This inventory item has sales history and cannot be permanently deleted. Archive it instead.',
      );
    }

    const hasReservationHistory =
      reservationsSnapshot.docs.some((reservation) => {
        const items = Array.isArray(reservation.data().items)
          ? reservation.data().items
          : [];

        return items.some((item: DocumentData) =>
          String(
            item?.itemId
            || item?.listingId
            || item?.productId
            || '',
          ) === listingId
        );
      });

    if (hasReservationHistory) {
      throw new HttpsError(
        'failed-precondition',
        'This inventory item has booking history and cannot be permanently deleted. Archive it instead.',
      );
    }

    const hasLedgerHistory = ledgerSnapshot.docs.some((entry) =>
      String(
        entry.data()?.listingId
        || entry.data()?.itemId
        || '',
      ) === listingId
    );

    if (hasLedgerHistory) {
      throw new HttpsError(
        'failed-precondition',
        'This inventory item has seller ledger history and cannot be permanently deleted. Archive it instead.',
      );
    }

    return db.runTransaction(async (transaction) => {
      const [command, listing] = await Promise.all([
        transaction.get(commandRef),
        transaction.get(listingRef),
      ]);

      if (command.exists) {
        return command.data()?.result;
      }

      if (
        !listing.exists
        || listing.data()?.spaceId !== spaceId
        || listing.data()?.ownerId !== context.settings.ownerId
      ) {
        throw new HttpsError(
          'not-found',
          'Inventory item not found.',
        );
      }

      const data = listing.data() || {};

      if (context.role !== 'owner') {
        const sellerId = String(data.sellerId || '');

        if (!sellerId) {
          throw new HttpsError(
            'permission-denied',
            'You can permanently delete only inventory linked to your own seller profile.',
          );
        }

        const seller = await transaction.get(
          db.collection('smePosSellers').doc(sellerId),
        );

        if (
          !seller.exists
          || seller.data()?.spaceId !== spaceId
          || seller.data()?.linkedUid !== uid
          || seller.data()?.archivedAt
          || seller.data()?.deletedAt
        ) {
          throw new HttpsError(
            'permission-denied',
            'You can permanently delete only inventory linked to your own seller profile.',
          );
        }
      }

      if (Number(data.reservedQuantity || 0) > 0) {
        throw new HttpsError(
          'failed-precondition',
          'This inventory item has active booked quantity. Complete or cancel the booking before deleting it.',
        );
      }

      if (
        Number(data.salesRevenueMinor || 0) > 0
        || Number(data.soldQuantity || 0) > 0
      ) {
        throw new HttpsError(
          'failed-precondition',
          'This inventory item has recorded sales history and cannot be permanently deleted. Archive it instead.',
        );
      }

      const now = FieldValue.serverTimestamp();

      const result = {
        listingId,
        deleted: true,
        photoPath: String(data.photoPath || ''),
      };

      transaction.delete(listingRef);

      transaction.create(commandRef, {
        uid,
        kind: 'delete_marketplace_listing_permanently',
        idempotencyKey: key,
        result,
        createdAt: now,
      });

      createActivity(transaction, {
        spaceId,
        actorUid: uid,
        actorName:
          context.member.displayName
          || context.member.email,
        action: 'pos_listing_deleted_permanently',
        targetType: 'sme_pos_listing',
        targetId: listingId,
        summary:
          `Permanently deleted inventory item ${String(data.name || listingId)}.`,
        now,
      });

      return result;
    });
  },
);

export const checkoutMarketplacePos = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const requestedItems = parseMarketplaceCheckoutItems(request.data?.items || []);
  const quickItems = parseMarketplaceQuickItems(request.data?.quickItems);
  if (!requestedItems.length && !quickItems.length) throw new HttpsError('invalid-argument', 'Add at least one listing or Quick Add item to checkout.');
  if (requestedItems.length + quickItems.length > 50) throw new HttpsError('invalid-argument', 'Checkout can contain up to 50 lines.');
  const customerId = optionalString(request.data?.customerId, 80) || null;
  const discountMinor = nonNegativeMoney(request.data?.discountMinor ?? 0);
  const saleDate = localDate(request.data?.saleDate, 'Sale date');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  requireMarketplaceSettings(context);
  if (context.settings.status !== 'active') throw new HttpsError('failed-precondition', 'Activate the POS before completing checkout.');

  const listingRefs = requestedItems.map((item) => db.collection('smePosListings').doc(item.listingId));
  const customerRef = customerId ? db.collection('smePosCustomers').doc(customerId) : null;
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const saleRef = db.collection('smePosSales').doc();

  return db.runTransaction(async (transaction) => {
    const [command, customerSnapshot, listingSnapshots] = await Promise.all([
      transaction.get(commandRef), customerRef ? transaction.get(customerRef) : Promise.resolve(null), Promise.all(listingRefs.map((ref) => transaction.get(ref))),
    ]);
    if (command.exists) return command.data()?.result;
    if (customerSnapshot && (!customerSnapshot.exists || customerSnapshot.data()?.spaceId !== spaceId || customerSnapshot.data()?.archivedAt || customerSnapshot.data()?.deletedAt)) throw new HttpsError('failed-precondition', 'Choose an active customer.');

    const prepared: Array<{ snapshot: DocumentReference | null; listing: DocumentData; quantity: number; unitPriceMinor: number; lineSubtotalMinor: number; quickAdd: boolean }> = listingSnapshots.map((snapshot, index) => {
      if (!snapshot.exists) throw new HttpsError('not-found', 'One of the seller listings was not found.');
      const listing = snapshot.data() || {};
      const requested = requestedItems[index];
      if (listing.spaceId !== spaceId || listing.ownerId !== context.settings.ownerId || listing.archivedAt || listing.sellerDeletedAt) throw new HttpsError('failed-precondition', 'One of the seller listings is unavailable.');
      const onHand = smePosQuantity(listing.quantityOnHand, 'Listing stock');
      const reserved = smePosQuantity(listing.reservedQuantity || 0, 'Reserved listing stock');
      const available = Math.max(0, onHand - reserved);
      if (available < 1) throw new HttpsError('failed-precondition', `${listing.name || 'A listing'} is out of stock or fully reserved.`);
      if (available < requested.quantity) throw new HttpsError('failed-precondition', `${listing.name || 'A listing'} only has ${available} available after reservations.`);
      const unitPriceMinor = positiveMoney(listing.sellingPriceMinor);
      const lineSubtotalMinor = unitPriceMinor * requested.quantity;
      if (!Number.isSafeInteger(lineSubtotalMinor)) throw new HttpsError('out-of-range', 'Sale amount is too large.');
      return { snapshot: snapshot.ref, listing, quantity: requested.quantity, unitPriceMinor, lineSubtotalMinor, quickAdd: false };
    });

    const sellerIds = [...new Set([
      ...prepared.map((item) => String(item.listing.sellerId || '')),
      ...quickItems.map((item) => item.sellerId),
    ])];
    if (sellerIds.some((id) => !id)) throw new HttpsError('failed-precondition', 'A listing is missing its seller.');
    const sellerRefs = sellerIds.map((sellerId) => db.collection('smePosSellers').doc(sellerId));
    const sellerSnapshots = await Promise.all(sellerRefs.map((ref) => transaction.get(ref)));
    const sellerById = new Map(sellerSnapshots.map((snapshot) => [snapshot.id, snapshot]));
    sellerSnapshots.forEach((snapshot) => {
      if (!snapshot.exists || snapshot.data()?.spaceId !== spaceId || snapshot.data()?.archivedAt || snapshot.data()?.deletedAt) throw new HttpsError('failed-precondition', 'One of the sellers is unavailable.');
    });

    quickItems.forEach((item) => {
      const seller = sellerById.get(item.sellerId)!;
      const sellerData = seller.data() || {};
      const lineSubtotalMinor = item.unitPriceMinor * item.quantity;
      if (!Number.isSafeInteger(lineSubtotalMinor)) throw new HttpsError('out-of-range', 'Quick Add amount is too large.');
      prepared.push({
        snapshot: null,
        listing: {
          sellerId: item.sellerId,
          sellerName: sellerData.name || 'Seller',
          sellerUid: sellerData.linkedUid || null,
          name: item.name,
          sku: '', barcode: '', condition: item.condition,
          commissionType: sellerData.defaultCommissionType || 'percentage',
          commissionRateBps: sellerData.defaultCommissionRateBps || 0,
          commissionMinor: sellerData.defaultCommissionMinor || 0,
        },
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        lineSubtotalMinor,
        quickAdd: true,
      });
    });

    const subtotalMinor = prepared.reduce((sum, item) => sum + item.lineSubtotalMinor, 0);
    if (discountMinor >= subtotalMinor) throw new HttpsError('invalid-argument', 'Discount must be less than the subtotal.');

    let remainingDiscount = discountMinor;
    let marketplaceCommissionMinor = 0;
    let sellerEarningsMinor = 0;
    let itemCount = 0;
    const sellerTotals = new Map<string, { gross: number; commission: number; earnings: number; quantity: number }>();
    const saleItems = prepared.map((item, index) => {
      const discountShareMinor = index === prepared.length - 1 ? remainingDiscount : Math.floor(discountMinor * item.lineSubtotalMinor / subtotalMinor);
      remainingDiscount -= discountShareMinor;
      const netLineMinor = item.lineSubtotalMinor - discountShareMinor;
      const commissionType = oneOf(item.listing.commissionType, smePosCommissionTypes, 'listing commission type');
      const commissionRateBps = commissionType === 'percentage' ? integerBetween(item.listing.commissionRateBps ?? 0, 'Commission percentage', 0, 10_000) : 0;
      const fixedCommissionMinor = commissionType === 'fixed_per_item' ? nonNegativeMoney(item.listing.commissionMinor ?? 0) : 0;
      const commissionMinor = commissionType === 'percentage'
        ? Math.floor(netLineMinor * commissionRateBps / 10_000)
        : Math.min(netLineMinor, fixedCommissionMinor * item.quantity);
      const sellerEarningMinor = netLineMinor - commissionMinor;
      marketplaceCommissionMinor += commissionMinor;
      sellerEarningsMinor += sellerEarningMinor;
      itemCount += item.quantity;
      const sellerId = String(item.listing.sellerId);
      const aggregate = sellerTotals.get(sellerId) || { gross: 0, commission: 0, earnings: 0, quantity: 0 };
      aggregate.gross += netLineMinor;
      aggregate.commission += commissionMinor;
      aggregate.earnings += sellerEarningMinor;
      aggregate.quantity += item.quantity;
      sellerTotals.set(sellerId, aggregate);
      const lineId = item.quickAdd ? `quick-${saleRef.id}-${index}` : String(item.snapshot!.id);
      return {
        productId: lineId,
        listingId: item.quickAdd ? null : lineId,
        productName: String(item.listing.name || 'Item'), sku: String(item.listing.sku || ''), barcode: String(item.listing.barcode || ''),
        sellerId, sellerName: String(item.listing.sellerName || sellerById.get(sellerId)?.data()?.name || 'Seller'), sellerUid: item.listing.sellerUid || sellerById.get(sellerId)?.data()?.linkedUid || null,
        condition: oneOf(item.listing.condition, smePosListingConditions, 'item condition'), quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor, unitCostMinor: Math.floor(sellerEarningMinor / item.quantity),
        lineTotalMinor: item.lineSubtotalMinor, lineCostMinor: sellerEarningMinor, discountShareMinor, netLineMinor, commissionMinor, sellerEarningMinor,
        returnedQuantity: 0, returnedMinor: 0, commissionReturnedMinor: 0, sellerEarningReturnedMinor: 0, quickAdd: item.quickAdd,
      };
    });
    const totalMinor = subtotalMinor - discountMinor;
    if (marketplaceCommissionMinor + sellerEarningsMinor !== totalMinor) throw new HttpsError('internal', 'Marketplace sale split did not balance.');
    const paymentRows = parseSmePosPaymentRows(request.data || {}, totalMinor);
    const now = FieldValue.serverTimestamp();
    const payments = await postSmePosPayments({
      transaction, rows: paymentRows, settings: context.settings, spaceId, uid, idempotencyKey: key, now,
      transactionDate: saleDate, direction: 'in', entryType: 'marketplace_pos_sale',
      counterparty: customerSnapshot?.data()?.name || 'Marketplace POS customer', note: note || `Marketplace POS sale ${saleRef.id}`, categoryId: 'income-sales',
      extra: { posSaleId: saleRef.id },
    });

    prepared.forEach((item, index) => {
      if (!item.snapshot) return;
      const saleItem = saleItems[index];
      transaction.update(item.snapshot, {
        quantityOnHand: Number(item.listing.quantityOnHand || 0) - item.quantity,
        soldQuantity: Number(item.listing.soldQuantity || 0) + item.quantity,
        grossSalesMinor: Number(item.listing.grossSalesMinor || 0) + saleItem.netLineMinor,
        commissionEarnedMinor: Number(item.listing.commissionEarnedMinor || 0) + saleItem.commissionMinor,
        sellerEarningsMinor: Number(item.listing.sellerEarningsMinor || 0) + saleItem.sellerEarningMinor,
        updatedAt: now,
      });
    });

    const receiptNumber = displayId('RCP');
    sellerTotals.forEach((totals, sellerId) => {
      const snapshot = sellerById.get(sellerId);
      if (!snapshot) throw new HttpsError('internal', 'Seller balance record is unavailable.');
      const currentBalance = signedMoney(snapshot.data()?.balanceMinor ?? 0, 'Seller balance');
      const nextBalance = currentBalance + totals.earnings;
      if (!Number.isSafeInteger(nextBalance)) throw new HttpsError('out-of-range', 'Seller balance is too large.');
      transaction.update(snapshot.ref, {
        grossSalesMinor: Number(snapshot.data()?.grossSalesMinor || 0) + totals.gross,
        commissionEarnedMinor: Number(snapshot.data()?.commissionEarnedMinor || 0) + totals.commission,
        balanceMinor: nextBalance,
        soldQuantity: Number(snapshot.data()?.soldQuantity || 0) + totals.quantity,
        updatedAt: now,
      });
      const sellerLedgerRef = db.collection('smePosSellerLedger').doc();
      transaction.create(sellerLedgerRef, {
        displayId: displayId('SLG'), spaceId, ownerId: context.settings.ownerId, sellerId,
        sellerName: snapshot.data()?.name || 'Seller', sellerUid: snapshot.data()?.linkedUid || null,
        kind: 'sale_earning', amountMinor: totals.earnings, balanceAfterMinor: nextBalance, currency: context.settings.currency,
        saleId: saleRef.id, receiptNumber, payoutId: null, note: `${totals.quantity} item(s) sold`, createdAt: now,
      });
    });

    if (customerRef && customerSnapshot) transaction.update(customerRef, { totalSpentMinor: Number(customerSnapshot.data()?.totalSpentMinor || 0) + totalMinor, visitCount: Number(customerSnapshot.data()?.visitCount || 0) + 1, lastSaleAt: now, updatedAt: now });
    const firstPayment = payments[0];
    transaction.create(saleRef, {
      displayId: displayId('SAL'), receiptNumber, spaceId, ownerId: context.settings.ownerId, createdBy: uid, status: 'completed', returnStatus: 'not_returned', sourceMode: 'marketplace_consignment',
      customerId, customerName: customerSnapshot?.data()?.name || null,
      paymentAccountId: firstPayment.accountId, paymentAccountName: firstPayment.accountName, paymentMethod: firstPayment.paymentMethod, paymentMethodLabel: firstPayment.paymentMethodLabel, payments,
      items: saleItems, itemCount, subtotalMinor, discountMinor, totalMinor, costMinor: sellerEarningsMinor, profitMinor: marketplaceCommissionMinor,
      marketplaceCommissionMinor, sellerEarningsMinor, sellerCount: sellerTotals.size, returnedMinor: 0, currency: context.settings.currency, saleDate, note,
      transactionId: firstPayment.transactionId, ledgerEntryId: firstPayment.ledgerEntryId, transactionIds: payments.map((item) => item.transactionId), ledgerEntryIds: payments.map((item) => item.ledgerEntryId), reservationId: null,
      receiptName: context.settings.receiptName || context.settings.shopName || context.space.name || 'Receipt', receiptFooter: context.settings.receiptFooter || '',
      createdAt: now, updatedAt: now,
    });
    const result = { saleId: saleRef.id, receiptNumber, transactionId: firstPayment.transactionId, transactionIds: payments.map((item) => item.transactionId) };
    transaction.create(commandRef, { uid, kind: 'checkout_marketplace_pos', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: 'marketplace_pos_sale_completed', targetType: 'sme_pos_sale', targetId: saleRef.id, summary: `Completed Marketplace sale ${receiptNumber} for ${totalMinor / 100} ${context.settings.currency} across ${sellerTotals.size} seller(s)${quickItems.length ? ` with ${quickItems.length} Quick Add line(s)` : ''}.`, now });
    return result;
  });
});


function parseSmePosReturnItems(value: unknown): Array<{ itemId: string; quantity: number }> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new HttpsError('invalid-argument', 'Choose at least one item to return.');
  }
  const seen = new Set<string>();
  return value.map((row) => {
    if (!row || typeof row !== 'object') throw new HttpsError('invalid-argument', 'Invalid return item.');
    const item = row as Record<string, unknown>;
    const itemId = stringValue(item.itemId, 'Return item ID', 80);
    if (seen.has(itemId)) throw new HttpsError('invalid-argument', 'The same return item appears more than once.');
    seen.add(itemId);
    return { itemId, quantity: integerBetween(item.quantity, 'Return quantity', 1, 9_999) };
  });
}

function cumulativeShare(totalMinor: number, totalQuantity: number, quantity: number): number {
  if (quantity <= 0) return 0;
  if (quantity >= totalQuantity) return totalMinor;
  return Math.floor(totalMinor * quantity / totalQuantity);
}

function smePosNetLineTotals(items: DocumentData[], discountMinor: number): number[] {
  const explicit = items.every((item) => Number.isSafeInteger(item.netLineMinor));
  if (explicit) return items.map((item) => nonNegativeMoney(item.netLineMinor));
  const subtotalMinor = items.reduce((sum, item) => sum + nonNegativeMoney(item.lineTotalMinor || 0), 0);
  if (subtotalMinor <= 0) throw new HttpsError('failed-precondition', 'The sale item totals are invalid.');
  let remainingDiscount = nonNegativeMoney(discountMinor || 0);
  return items.map((item, index) => {
    const lineTotalMinor = nonNegativeMoney(item.lineTotalMinor || 0);
    const discountShareMinor = index === items.length - 1
      ? remainingDiscount
      : Math.floor(nonNegativeMoney(discountMinor || 0) * lineTotalMinor / subtotalMinor);
    remainingDiscount -= discountShareMinor;
    return lineTotalMinor - discountShareMinor;
  });
}

export const listSmePosReservations = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const includeClosedRequested = request.data?.includeClosed === true;
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  const snapshot = await db.collection('smePosReservations').where('spaceId', '==', spaceId).get();
  const includeClosed = includeClosedRequested && ['owner', 'manager'].includes(context.role);
  let rows = snapshot.docs
    .map((doc): DocumentData => ({ id: doc.id, ...doc.data() }))
    .filter((row) => includeClosed || !['completed', 'cancelled'].includes(String(row.status || '')))
    .sort((a, b) => marketplaceSortValue(b) - marketplaceSortValue(a));
  if (context.role === 'cashier') {
    rows = rows.map((row) => ({
      ...row,
      items: Array.isArray(row.items) ? row.items.map((item: DocumentData) => ({
        ...item,
        unitCostMinor: 0,
        commissionType: undefined,
        commissionRateBps: undefined,
        commissionMinor: undefined,
      })) : [],
      payments: Array.isArray(row.payments) ? row.payments.map((payment: DocumentData) => ({
        ...payment,
        transactionId: '',
        ledgerEntryId: '',
      })) : [],
    }));
  }
  return { reservations: rows };
});

export const createSmePosReservation = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const sourceMode = oneOf(request.data?.sourceMode, smePosModes, 'POS mode');
  const requestedItems = parseSmePosReservationItems(request.data?.items);
  const customerId = stringValue(request.data?.customerId, 'Customer', 80);
  const discountMinor = nonNegativeMoney(request.data?.discountMinor || 0);
  const reservationDate = localDate(request.data?.reservationDate, 'Booking date');
  const dueDate = request.data?.dueDate ? localDate(request.data.dueDate, 'Due date') : null;
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  if (context.settings.mode !== sourceMode) throw new HttpsError('failed-precondition', 'This booking does not match the current POS mode.');
  if (context.settings.status !== 'active') throw new HttpsError('failed-precondition', 'Activate the POS before creating a booking.');

  const customerRef = db.collection('smePosCustomers').doc(customerId);
  const itemRefs = requestedItems.map((item) => sourceMode === 'marketplace_consignment'
    ? db.collection('smePosListings').doc(item.itemId)
    : db.collection('smePosProducts').doc(item.itemId));
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const reservationRef = db.collection('smePosReservations').doc();

  return db.runTransaction(async (transaction) => {
    const [command, customerSnapshot, itemSnapshots] = await Promise.all([
      transaction.get(commandRef), transaction.get(customerRef), Promise.all(itemRefs.map((ref) => transaction.get(ref))),
    ]);
    if (command.exists) return command.data()?.result;
    if (!customerSnapshot.exists || customerSnapshot.data()?.spaceId !== spaceId || customerSnapshot.data()?.archivedAt || customerSnapshot.data()?.deletedAt) throw new HttpsError('failed-precondition', 'Choose an active saved customer for the booking.');

    const sellerIds = sourceMode === 'marketplace_consignment'
      ? [...new Set(itemSnapshots.map((snapshot) => String(snapshot.data()?.sellerId || '')).filter(Boolean))]
      : [];
    const sellerSnapshots = sourceMode === 'marketplace_consignment'
      ? await Promise.all(sellerIds.map((sellerId) => transaction.get(db.collection('smePosSellers').doc(sellerId))))
      : [];
    const sellerById = new Map(sellerSnapshots.map((snapshot) => [snapshot.id, snapshot]));
    sellerSnapshots.forEach((snapshot) => {
      if (!snapshot.exists || snapshot.data()?.spaceId !== spaceId || snapshot.data()?.archivedAt || snapshot.data()?.deletedAt) throw new HttpsError('failed-precondition', 'A seller linked to this booking is unavailable.');
    });

    let subtotalMinor = 0;
    let itemCount = 0;
    const reservationItems = itemSnapshots.map((snapshot, index) => {
      if (!snapshot.exists) throw new HttpsError('not-found', 'One of the booking items was not found.');
      const item = snapshot.data() || {};
      const requested = requestedItems[index];
      if (item.spaceId !== spaceId || item.ownerId !== context.settings.ownerId || item.archivedAt || item.sellerDeletedAt) throw new HttpsError('failed-precondition', 'One of the booking items is unavailable.');
      const onHand = item.trackStock === false ? 999_999 : smePosQuantity(item.quantityOnHand, 'Item stock');
      const reserved = smePosQuantity(item.reservedQuantity || 0, 'Reserved stock');
      const available = item.trackStock === false ? 999_999 : Math.max(0, onHand - reserved);
      if (available < requested.quantity) throw new HttpsError('failed-precondition', `${item.name || 'An item'} only has ${available} available after existing bookings.`);
      const unitPriceMinor = positiveMoney(item.sellingPriceMinor);
      const lineTotalMinor = unitPriceMinor * requested.quantity;
      if (!Number.isSafeInteger(lineTotalMinor)) throw new HttpsError('out-of-range', 'Booking amount is too large.');
      subtotalMinor += lineTotalMinor;
      itemCount += requested.quantity;
      const sellerId = sourceMode === 'marketplace_consignment' ? stringValue(item.sellerId, 'Seller ID', 80) : undefined;
      const seller = sellerId ? sellerById.get(sellerId) : null;
      return {
        itemId: snapshot.id,
        productName: String(item.name || 'Item'), sku: String(item.sku || ''), barcode: String(item.barcode || ''),
        quantity: requested.quantity, unitPriceMinor,
        unitCostMinor: sourceMode === 'marketplace_consignment' ? 0 : (item.costPriceMinor == null ? 0 : nonNegativeMoney(item.costPriceMinor)),
        lineTotalMinor,
        sellerId, sellerName: sellerId ? String(item.sellerName || seller?.data()?.name || 'Seller') : undefined,
        sellerUid: sellerId ? (item.sellerUid || seller?.data()?.linkedUid || null) : undefined,
        condition: sourceMode === 'marketplace_consignment' ? oneOf(item.condition, smePosListingConditions, 'Item condition') : undefined,
        commissionType: sourceMode === 'marketplace_consignment' ? oneOf(item.commissionType, smePosCommissionTypes, 'Commission type') : undefined,
        commissionRateBps: sourceMode === 'marketplace_consignment' ? integerBetween(item.commissionRateBps || 0, 'Commission percentage', 0, 10_000) : undefined,
        commissionMinor: sourceMode === 'marketplace_consignment' ? nonNegativeMoney(item.commissionMinor || 0) : undefined,
      };
    });
    if (discountMinor >= subtotalMinor) throw new HttpsError('invalid-argument', 'Booking discount must be less than the subtotal.');
    const totalMinor = subtotalMinor - discountMinor;
    const depositRows = parseSmePosPartialPaymentRows(request.data?.depositPayments, totalMinor, 'Deposit');
    const depositMinor = depositRows.reduce((sum, row) => sum + row.amountMinor, 0);
    const remainingMinor = totalMinor - depositMinor;
    const now = FieldValue.serverTimestamp();
    const payments = await postSmePosPayments({
      transaction, rows: depositRows, settings: context.settings, spaceId, uid, idempotencyKey: `${key}:deposit`, now,
      transactionDate: reservationDate, direction: 'in', entryType: sourceMode === 'marketplace_consignment' ? 'marketplace_pos_reservation_deposit' : 'sme_pos_reservation_deposit',
      counterparty: String(customerSnapshot.data()?.name || 'POS customer'), note: note || `Deposit for booking ${reservationRef.id}`, categoryId: 'income-sales',
      extra: { posReservationId: reservationRef.id },
    });

    itemSnapshots.forEach((snapshot, index) => {
      const item = snapshot.data() || {};
      if (item.trackStock === false) return;
      transaction.update(snapshot.ref, { reservedQuantity: Number(item.reservedQuantity || 0) + requestedItems[index].quantity, updatedAt: now });
    });
    const status = remainingMinor === 0 ? 'paid' : depositMinor > 0 ? 'partially_paid' : 'reserved';
    const reservationNumber = displayId('RSV');
    transaction.create(reservationRef, {
      displayId: displayId('RSB'), reservationNumber, spaceId, ownerId: context.settings.ownerId, createdBy: uid,
      createdByName: context.member.displayName || context.member.email || '', sourceMode, status,
      customerId, customerName: customerSnapshot.data()?.name || 'Customer', customerPhone: customerSnapshot.data()?.phone || '',
      items: reservationItems, itemCount, subtotalMinor, discountMinor, totalMinor, depositMinor, remainingMinor, payments,
      currency: context.settings.currency, reservationDate, dueDate, note, saleId: null, receiptNumber: null, completedAt: null, cancelledAt: null,
      createdAt: now, updatedAt: now,
    });
    const result = { reservationId: reservationRef.id, reservationNumber, remainingMinor };
    transaction.create(commandRef, { uid, kind: 'create_sme_pos_reservation', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: 'sme_pos_reservation_created', targetType: 'sme_pos_reservation', targetId: reservationRef.id, summary: `Created booking ${reservationNumber} for ${totalMinor / 100} ${context.settings.currency}${depositMinor ? ` with ${depositMinor / 100} deposit` : ''}.`, now });
    return result;
  });
});

export const addSmePosReservationDeposit = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const reservationId = stringValue(request.data?.reservationId, 'Booking ID', 80);
  const paymentDate = localDate(request.data?.paymentDate, 'Payment date');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  const reservationRef = db.collection('smePosReservations').doc(reservationId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, snapshot] = await Promise.all([transaction.get(commandRef), transaction.get(reservationRef)]);
    if (command.exists) return command.data()?.result;
    if (!snapshot.exists || snapshot.data()?.spaceId !== spaceId || snapshot.data()?.ownerId !== context.settings.ownerId) throw new HttpsError('not-found', 'Booking not found.');
    const reservation = snapshot.data() || {};
    if (['completed', 'cancelled'].includes(String(reservation.status || ''))) throw new HttpsError('failed-precondition', 'This booking is already closed.');
    const remainingBefore = positiveMoney(reservation.remainingMinor);
    const rows = parseSmePosPartialPaymentRows(request.data?.payments, remainingBefore, 'Deposit');
    if (!rows.length) throw new HttpsError('invalid-argument', 'Enter at least one deposit payment.');
    const addedMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0);
    const now = FieldValue.serverTimestamp();
    const posted = await postSmePosPayments({
      transaction, rows, settings: context.settings, spaceId, uid, idempotencyKey: `${key}:deposit`, now,
      transactionDate: paymentDate, direction: 'in', entryType: reservation.sourceMode === 'marketplace_consignment' ? 'marketplace_pos_reservation_deposit' : 'sme_pos_reservation_deposit',
      counterparty: String(reservation.customerName || 'POS customer'), note: note || `Additional deposit for ${reservation.reservationNumber || reservationId}`, categoryId: 'income-sales',
      extra: { posReservationId: reservationId },
    });
    const depositMinor = nonNegativeMoney(reservation.depositMinor || 0) + addedMinor;
    const remainingMinor = nonNegativeMoney(reservation.totalMinor || 0) - depositMinor;
    transaction.update(reservationRef, { depositMinor, remainingMinor, status: remainingMinor === 0 ? 'paid' : 'partially_paid', payments: [...(Array.isArray(reservation.payments) ? reservation.payments : []), ...posted], updatedAt: now });
    const result = { reservationId, depositMinor, remainingMinor };
    transaction.create(commandRef, { uid, kind: 'add_sme_pos_reservation_deposit', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: 'sme_pos_reservation_deposit_added', targetType: 'sme_pos_reservation', targetId: reservationId, summary: `Added ${addedMinor / 100} ${context.settings.currency} deposit to ${reservation.reservationNumber || reservationId}.`, now });
    return result;
  });
});

export const completeSmePosReservation = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const reservationId = stringValue(request.data?.reservationId, 'Booking ID', 80);
  const saleDate = localDate(request.data?.saleDate, 'Sale date');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager', 'cashier']);
  if (context.settings.status !== 'active') throw new HttpsError('failed-precondition', 'Activate the POS before completing a booking.');
  const reservationRef = db.collection('smePosReservations').doc(reservationId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const saleRef = db.collection('smePosSales').doc();

  return db.runTransaction(async (transaction) => {
    const [command, reservationSnapshot] = await Promise.all([transaction.get(commandRef), transaction.get(reservationRef)]);
    if (command.exists) return command.data()?.result;
    if (!reservationSnapshot.exists || reservationSnapshot.data()?.spaceId !== spaceId || reservationSnapshot.data()?.ownerId !== context.settings.ownerId) throw new HttpsError('not-found', 'Booking not found.');
    const reservation = reservationSnapshot.data() || {};
    if (['completed', 'cancelled'].includes(String(reservation.status || ''))) throw new HttpsError('failed-precondition', 'This booking is already closed.');
    const sourceMode = oneOf(reservation.sourceMode, smePosModes, 'Booking POS mode');
    if (sourceMode !== context.settings.mode) throw new HttpsError('failed-precondition', 'The booking belongs to another POS mode.');
    const reservationItems = Array.isArray(reservation.items) ? reservation.items : [];
    if (!reservationItems.length) throw new HttpsError('failed-precondition', 'This booking has no items.');
    const itemRefs = reservationItems.map((item: DocumentData) => sourceMode === 'marketplace_consignment'
      ? db.collection('smePosListings').doc(stringValue(item.itemId, 'Booking item', 80))
      : db.collection('smePosProducts').doc(stringValue(item.itemId, 'Booking item', 80)));
    const customerRef = db.collection('smePosCustomers').doc(stringValue(reservation.customerId, 'Customer', 80));
    const [itemSnapshots, customerSnapshot] = await Promise.all([Promise.all(itemRefs.map((ref) => transaction.get(ref))), transaction.get(customerRef)]);
    if (!customerSnapshot.exists || customerSnapshot.data()?.spaceId !== spaceId) throw new HttpsError('failed-precondition', 'The booking customer record is unavailable.');
    const sellerIds = sourceMode === 'marketplace_consignment' ? [...new Set(reservationItems.map((item: DocumentData) => String(item.sellerId || '')).filter(Boolean))] : [];
    const sellerSnapshots = sourceMode === 'marketplace_consignment' ? await Promise.all(sellerIds.map((sellerId) => transaction.get(db.collection('smePosSellers').doc(sellerId)))) : [];
    const sellerById = new Map(sellerSnapshots.map((snapshot) => [snapshot.id, snapshot]));
    sellerSnapshots.forEach((snapshot) => {
      if (!snapshot.exists || snapshot.data()?.spaceId !== spaceId || snapshot.data()?.deletedAt) throw new HttpsError('failed-precondition', 'A seller linked to this booking is unavailable.');
    });
    itemSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists || snapshot.data()?.spaceId !== spaceId || snapshot.data()?.ownerId !== context.settings.ownerId) throw new HttpsError('failed-precondition', 'A reserved item record is unavailable.');
      const item = snapshot.data() || {};
      const quantity = integerBetween(reservationItems[index].quantity, 'Reserved quantity', 1, 9_999);
      if (item.trackStock !== false) {
        if (smePosQuantity(item.reservedQuantity || 0, 'Reserved stock') < quantity || smePosQuantity(item.quantityOnHand, 'Stock on hand') < quantity) throw new HttpsError('failed-precondition', `${reservationItems[index].productName || 'A reserved item'} no longer has the reserved stock available.`);
      }
    });

    const remainingMinor = nonNegativeMoney(reservation.remainingMinor || 0);
    const paymentRows = parseSmePosPaymentRows({ payments: request.data?.payments }, remainingMinor, true);
    const now = FieldValue.serverTimestamp();
    const completionPayments = await postSmePosPayments({
      transaction, rows: paymentRows, settings: context.settings, spaceId, uid, idempotencyKey: `${key}:balance`, now,
      transactionDate: saleDate, direction: 'in', entryType: sourceMode === 'marketplace_consignment' ? 'marketplace_pos_sale_balance' : 'sme_pos_sale_balance',
      counterparty: String(reservation.customerName || 'POS customer'), note: note || `Balance for booking ${reservation.reservationNumber || reservationId}`, categoryId: 'income-sales',
      extra: { posReservationId: reservationId, posSaleId: saleRef.id },
    });
    const priorPayments = Array.isArray(reservation.payments) ? reservation.payments : [];
    const allPayments = [...priorPayments, ...completionPayments];
    if (!allPayments.length) throw new HttpsError('failed-precondition', 'Booking payment history is missing.');
    const totalMinor = nonNegativeMoney(reservation.totalMinor || 0);
    if (allPayments.reduce((sum: number, row: DocumentData) => sum + nonNegativeMoney(row.amountMinor || 0), 0) !== totalMinor) throw new HttpsError('failed-precondition', 'Booking payments do not balance to the booking total.');

    let costMinor = 0;
    let marketplaceCommissionMinor = 0;
    let sellerEarningsMinor = 0;
    const sellerTotals = new Map<string, { gross: number; commission: number; earnings: number; quantity: number }>();
    let remainingDiscount = nonNegativeMoney(reservation.discountMinor || 0);
    const subtotalMinor = nonNegativeMoney(reservation.subtotalMinor || 0);
    const saleItems = reservationItems.map((item: DocumentData, index: number) => {
      const quantity = integerBetween(item.quantity, 'Reserved quantity', 1, 9_999);
      const lineTotalMinor = nonNegativeMoney(item.lineTotalMinor || 0);
      const discountShareMinor = index === reservationItems.length - 1 ? remainingDiscount : Math.floor(nonNegativeMoney(reservation.discountMinor || 0) * lineTotalMinor / subtotalMinor);
      remainingDiscount -= discountShareMinor;
      const netLineMinor = lineTotalMinor - discountShareMinor;
      if (sourceMode === 'marketplace_consignment') {
        const commissionType = oneOf(item.commissionType, smePosCommissionTypes, 'Commission type');
        const commission = commissionType === 'percentage'
          ? Math.floor(netLineMinor * integerBetween(item.commissionRateBps || 0, 'Commission percentage', 0, 10_000) / 10_000)
          : Math.min(netLineMinor, nonNegativeMoney(item.commissionMinor || 0) * quantity);
        const earnings = netLineMinor - commission;
        marketplaceCommissionMinor += commission;
        sellerEarningsMinor += earnings;
        const sellerId = stringValue(item.sellerId, 'Seller ID', 80);
        const aggregate = sellerTotals.get(sellerId) || { gross: 0, commission: 0, earnings: 0, quantity: 0 };
        aggregate.gross += netLineMinor; aggregate.commission += commission; aggregate.earnings += earnings; aggregate.quantity += quantity; sellerTotals.set(sellerId, aggregate);
        return { productId: item.itemId, listingId: item.itemId, productName: item.productName, sku: item.sku || '', barcode: item.barcode || '', sellerId, sellerName: item.sellerName || sellerById.get(sellerId)?.data()?.name || 'Seller', sellerUid: item.sellerUid || sellerById.get(sellerId)?.data()?.linkedUid || null, condition: item.condition || 'other', quantity, unitPriceMinor: item.unitPriceMinor, unitCostMinor: Math.floor(earnings / quantity), lineTotalMinor, lineCostMinor: earnings, discountShareMinor, netLineMinor, commissionMinor: commission, sellerEarningMinor: earnings, returnedQuantity: 0, returnedMinor: 0, commissionReturnedMinor: 0, sellerEarningReturnedMinor: 0, quickAdd: false };
      }
      const lineCostMinor = nonNegativeMoney(item.unitCostMinor || 0) * quantity;
      costMinor += lineCostMinor;
      return { productId: item.itemId, productName: item.productName, sku: item.sku || '', barcode: item.barcode || '', quantity, unitPriceMinor: item.unitPriceMinor, unitCostMinor: item.unitCostMinor || 0, lineTotalMinor, lineCostMinor, returnedQuantity: 0, quickAdd: false };
    });
    if (sourceMode === 'marketplace_consignment' && marketplaceCommissionMinor + sellerEarningsMinor !== totalMinor) throw new HttpsError('internal', 'Marketplace booking split did not balance.');
    const profitMinor = sourceMode === 'marketplace_consignment' ? marketplaceCommissionMinor : totalMinor - costMinor;

    itemSnapshots.forEach((snapshot, index) => {
      const item = snapshot.data() || {};
      const quantity = integerBetween(reservationItems[index].quantity, 'Reserved quantity', 1, 9_999);
      if (sourceMode === 'marketplace_consignment') {
        const saleItem = saleItems[index];
        const netLineMinor = nonNegativeMoney(saleItem.netLineMinor);
        const commissionMinor = nonNegativeMoney(saleItem.commissionMinor);
        const sellerEarningMinor = nonNegativeMoney(saleItem.sellerEarningMinor);
        if (commissionMinor + sellerEarningMinor !== netLineMinor) throw new HttpsError('internal', 'Marketplace booking sale split did not balance.');
        transaction.update(snapshot.ref, {
          quantityOnHand: Number(item.quantityOnHand || 0) - quantity,
          reservedQuantity: Math.max(0, Number(item.reservedQuantity || 0) - quantity),
          soldQuantity: Number(item.soldQuantity || 0) + quantity,
          grossSalesMinor: Number(item.grossSalesMinor || 0) + netLineMinor,
          commissionEarnedMinor: Number(item.commissionEarnedMinor || 0) + commissionMinor,
          sellerEarningsMinor: Number(item.sellerEarningsMinor || 0) + sellerEarningMinor,
          updatedAt: now,
        });
      } else {
        transaction.update(snapshot.ref, {
          quantityOnHand: item.trackStock === false ? 0 : Number(item.quantityOnHand || 0) - quantity,
          reservedQuantity: item.trackStock === false ? 0 : Math.max(0, Number(item.reservedQuantity || 0) - quantity),
          soldQuantity: Number(item.soldQuantity || 0) + quantity,
          salesRevenueMinor: Number(item.salesRevenueMinor || 0) + nonNegativeMoney(reservationItems[index].lineTotalMinor || 0),
          updatedAt: now,
        });
      }
    });

    const receiptNumber = displayId('RCP');
    sellerTotals.forEach((totals, sellerId) => {
      const snapshot = sellerById.get(sellerId)!;
      const currentBalance = signedMoney(snapshot.data()?.balanceMinor || 0, 'Seller balance');
      const nextBalance = currentBalance + totals.earnings;
      transaction.update(snapshot.ref, { grossSalesMinor: Number(snapshot.data()?.grossSalesMinor || 0) + totals.gross, commissionEarnedMinor: Number(snapshot.data()?.commissionEarnedMinor || 0) + totals.commission, balanceMinor: nextBalance, soldQuantity: Number(snapshot.data()?.soldQuantity || 0) + totals.quantity, updatedAt: now });
      const ledgerRef = db.collection('smePosSellerLedger').doc();
      transaction.create(ledgerRef, { displayId: displayId('SLG'), spaceId, ownerId: context.settings.ownerId, sellerId, sellerName: snapshot.data()?.name || 'Seller', sellerUid: snapshot.data()?.linkedUid || null, kind: 'sale_earning', amountMinor: totals.earnings, balanceAfterMinor: nextBalance, currency: context.settings.currency, saleId: saleRef.id, receiptNumber, payoutId: null, note: `Booking completed · ${totals.quantity} item(s) sold`, createdAt: now });
    });

    transaction.update(customerRef, { totalSpentMinor: Number(customerSnapshot.data()?.totalSpentMinor || 0) + totalMinor, visitCount: Number(customerSnapshot.data()?.visitCount || 0) + 1, lastSaleAt: now, updatedAt: now });
    const firstPayment = allPayments[0] as DocumentData;
    transaction.create(saleRef, {
      displayId: displayId('SAL'), receiptNumber, spaceId, ownerId: context.settings.ownerId, createdBy: uid, status: 'completed', returnStatus: 'not_returned', sourceMode,
      customerId: reservation.customerId, customerName: reservation.customerName,
      paymentAccountId: firstPayment.accountId, paymentAccountName: firstPayment.accountName, paymentMethod: firstPayment.paymentMethod || null, paymentMethodLabel: firstPayment.paymentMethodLabel || null,
      payments: allPayments, items: saleItems, itemCount: reservation.itemCount, subtotalMinor, discountMinor: reservation.discountMinor || 0, totalMinor,
      costMinor: sourceMode === 'marketplace_consignment' ? sellerEarningsMinor : costMinor, profitMinor,
      marketplaceCommissionMinor: sourceMode === 'marketplace_consignment' ? marketplaceCommissionMinor : null,
      sellerEarningsMinor: sourceMode === 'marketplace_consignment' ? sellerEarningsMinor : null,
      sellerCount: sourceMode === 'marketplace_consignment' ? sellerTotals.size : null,
      returnedMinor: 0, currency: context.settings.currency, saleDate, note: note || reservation.note || '',
      transactionId: firstPayment.transactionId, ledgerEntryId: firstPayment.ledgerEntryId,
      transactionIds: allPayments.map((row: DocumentData) => row.transactionId).filter(Boolean), ledgerEntryIds: allPayments.map((row: DocumentData) => row.ledgerEntryId).filter(Boolean), reservationId,
      receiptName: context.settings.receiptName || context.settings.shopName || context.space.name || 'Receipt', receiptFooter: context.settings.receiptFooter || '', createdAt: now, updatedAt: now,
    });
    transaction.update(reservationRef, { status: 'completed', remainingMinor: 0, payments: allPayments, saleId: saleRef.id, receiptNumber, completedAt: now, updatedAt: now });
    const result = { reservationId, saleId: saleRef.id, receiptNumber, transactionId: String(firstPayment.transactionId || '') };
    transaction.create(commandRef, { uid, kind: 'complete_sme_pos_reservation', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: 'sme_pos_reservation_completed', targetType: 'sme_pos_reservation', targetId: reservationId, summary: `Completed booking ${reservation.reservationNumber || reservationId} as receipt ${receiptNumber}.`, now });
    return result;
  });
});

export const cancelSmePosReservation = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const reservationId = stringValue(request.data?.reservationId, 'Booking ID', 80);
  const cancelDate = localDate(request.data?.cancelDate, 'Cancellation date');
  const reason = optionalString(request.data?.reason, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  const reservationRef = db.collection('smePosReservations').doc(reservationId);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, snapshot] = await Promise.all([transaction.get(commandRef), transaction.get(reservationRef)]);
    if (command.exists) return command.data()?.result;
    if (!snapshot.exists || snapshot.data()?.spaceId !== spaceId || snapshot.data()?.ownerId !== context.settings.ownerId) throw new HttpsError('not-found', 'Booking not found.');
    const reservation = snapshot.data() || {};
    if (['completed', 'cancelled'].includes(String(reservation.status || ''))) throw new HttpsError('failed-precondition', 'This booking is already closed.');
    const sourceMode = oneOf(reservation.sourceMode, smePosModes, 'Booking POS mode');
    const items = Array.isArray(reservation.items) ? reservation.items : [];
    const itemRefs = items.map((item: DocumentData) => sourceMode === 'marketplace_consignment'
      ? db.collection('smePosListings').doc(stringValue(item.itemId, 'Booking item', 80))
      : db.collection('smePosProducts').doc(stringValue(item.itemId, 'Booking item', 80)));
    const itemSnapshots = await Promise.all(itemRefs.map((ref) => transaction.get(ref)));
    itemSnapshots.forEach((itemSnapshot, index) => {
      if (!itemSnapshot.exists || itemSnapshot.data()?.spaceId !== spaceId) throw new HttpsError('failed-precondition', 'A reserved item record is unavailable.');
      const item = itemSnapshot.data() || {};
      if (item.trackStock === false) return;
      const quantity = integerBetween(items[index].quantity, 'Reserved quantity', 1, 9_999);
      if (Number(item.reservedQuantity || 0) < quantity) throw new HttpsError('failed-precondition', 'Reserved stock no longer matches this booking.');
    });
    const originalPayments = Array.isArray(reservation.payments) ? reservation.payments : [];
    const refundRows: SmePosPaymentRequestRow[] = originalPayments.map((row: DocumentData) => ({
      accountId: stringValue(row.accountId, 'Deposit account', 80),
      paymentMethod: row.paymentMethod ? oneOf(row.paymentMethod, paymentMethodCodes, 'Payment method') : null,
      paymentMethodLabel: optionalString(row.paymentMethodLabel, 80) || null,
      amountMinor: Math.max(0, nonNegativeMoney(row.amountMinor || 0) - nonNegativeMoney(row.returnedMinor || 0)),
    })).filter((row: SmePosPaymentRequestRow) => row.amountMinor > 0);
    const refundedMinor = refundRows.reduce((sum, row) => sum + row.amountMinor, 0);
    const now = FieldValue.serverTimestamp();
    const refundPayments = await postSmePosPayments({
      transaction, rows: refundRows, settings: context.settings, spaceId, uid, idempotencyKey: `${key}:refund`, now,
      transactionDate: cancelDate, direction: 'out', entryType: sourceMode === 'marketplace_consignment' ? 'marketplace_pos_reservation_refund' : 'sme_pos_reservation_refund',
      counterparty: String(reservation.customerName || 'POS customer'), note: reason || `Cancelled booking ${reservation.reservationNumber || reservationId}`, categoryId: 'expense-other', extra: { posReservationId: reservationId },
    });
    itemSnapshots.forEach((itemSnapshot, index) => {
      const item = itemSnapshot.data() || {};
      if (item.trackStock === false) return;
      transaction.update(itemSnapshot.ref, { reservedQuantity: Math.max(0, Number(item.reservedQuantity || 0) - Number(items[index].quantity || 0)), updatedAt: now });
    });
    const updatedPayments = originalPayments.map((row: DocumentData) => ({ ...row, returnedMinor: nonNegativeMoney(row.amountMinor || 0) }));
    transaction.update(reservationRef, { status: 'cancelled', remainingMinor: 0, payments: updatedPayments, cancellationRefunds: refundPayments, cancelledAt: now, updatedAt: now });
    const result = { reservationId, refundedMinor };
    transaction.create(commandRef, { uid, kind: 'cancel_sme_pos_reservation', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: 'sme_pos_reservation_cancelled', targetType: 'sme_pos_reservation', targetId: reservationId, summary: `Cancelled booking ${reservation.reservationNumber || reservationId}${refundedMinor ? ` and refunded ${refundedMinor / 100} ${context.settings.currency}` : ''}.`, now });
    return result;
  });
});


export const returnSmePosSale = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const saleId = stringValue(request.data?.saleId, 'Sale ID', 80);
  const requestedItems = parseSmePosReturnItems(request.data?.items);
  const returnDate = localDate(request.data?.returnDate, 'Return date');
  const reason = optionalString(request.data?.reason, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const saleRef = db.collection('smePosSales').doc(saleId);
  const returnRef = db.collection('smePosReturns').doc();

  return db.runTransaction(async (transaction) => {
    const [command, saleSnapshot] = await Promise.all([transaction.get(commandRef), transaction.get(saleRef)]);
    if (command.exists) return command.data()?.result;
    if (!saleSnapshot.exists) throw new HttpsError('not-found', 'POS sale not found.');
    const sale = saleSnapshot.data() || {};
    if (sale.spaceId !== spaceId || sale.ownerId !== context.settings.ownerId) throw new HttpsError('permission-denied', 'This sale belongs to another shop.');
    const sourceMode = oneOf(sale.sourceMode, smePosModes, 'POS sale mode');
    if (sale.status === 'refunded' || sale.returnStatus === 'full') throw new HttpsError('failed-precondition', 'This sale has already been fully refunded.');
    const items = Array.isArray(sale.items) ? sale.items.map((item: unknown) => ({ ...((item || {}) as DocumentData) })) : [];
    if (!items.length) throw new HttpsError('failed-precondition', 'This sale has no returnable items.');
    const lineIds = items.map((item) => String(sourceMode === 'marketplace_consignment' ? item.listingId || item.productId || '' : item.productId || ''));
    const lineIndexes = new Map(lineIds.map((id, index) => [id, index]));
    requestedItems.forEach((requested) => {
      if (!lineIndexes.has(requested.itemId)) throw new HttpsError('invalid-argument', 'One selected item is not part of this sale.');
    });

    const realRequested = requestedItems.filter((requested) => !items[lineIndexes.get(requested.itemId)!]?.quickAdd);
    const itemRefs = realRequested.map((requested) => sourceMode === 'marketplace_consignment'
      ? db.collection('smePosListings').doc(requested.itemId)
      : db.collection('smePosProducts').doc(requested.itemId));
    const sellerIds = sourceMode === 'marketplace_consignment'
      ? [...new Set(requestedItems.map((requested) => String(items[lineIndexes.get(requested.itemId)!]?.sellerId || '')).filter(Boolean))]
      : [];
    const sellerRefs = sellerIds.map((sellerId) => db.collection('smePosSellers').doc(sellerId));
    const customerRef = sale.customerId ? db.collection('smePosCustomers').doc(String(sale.customerId)) : null;
    const [itemSnapshots, sellerSnapshots, customerSnapshot] = await Promise.all([
      Promise.all(itemRefs.map((ref) => transaction.get(ref))),
      Promise.all(sellerRefs.map((ref) => transaction.get(ref))),
      customerRef ? transaction.get(customerRef) : Promise.resolve(null),
    ]);
    const itemSnapshotById = new Map(itemSnapshots.map((snapshot) => [snapshot.id, snapshot]));
    const sellerById = new Map(sellerSnapshots.map((snapshot) => [snapshot.id, snapshot]));
    const netLineTotals = smePosNetLineTotals(items, nonNegativeMoney(sale.discountMinor || 0));

    let refundMinor = 0;
    let costReversedMinor = 0;
    let commissionReversedMinor = 0;
    let sellerEarningReversedMinor = 0;
    let returnedItemCount = 0;
    const sellerAdjustments = new Map<string, { gross: number; commission: number; earnings: number; quantity: number; name: string; uid: string | null }>();
    const returnItems: DocumentData[] = [];

    requestedItems.forEach((requested) => {
      const lineIndex = lineIndexes.get(requested.itemId)!;
      const line = items[lineIndex];
      const totalQuantity = integerBetween(line.quantity, 'Sold quantity', 1, 9_999);
      const previousReturned = integerBetween(line.returnedQuantity || 0, 'Returned quantity', 0, totalQuantity);
      if (requested.quantity > totalQuantity - previousReturned) throw new HttpsError('failed-precondition', `${line.productName || 'This item'} only has ${totalQuantity - previousReturned} returnable.`);
      const nextReturned = previousReturned + requested.quantity;
      const lineNetMinor = netLineTotals[lineIndex];
      const previousRefundMinor = cumulativeShare(lineNetMinor, totalQuantity, previousReturned);
      const nextRefundMinor = cumulativeShare(lineNetMinor, totalQuantity, nextReturned);
      const lineRefundMinor = nextRefundMinor - previousRefundMinor;
      if (lineRefundMinor <= 0) throw new HttpsError('failed-precondition', 'The selected return amount is invalid.');

      const quickAdd = line.quickAdd === true;
      const itemSnapshot = quickAdd ? null : itemSnapshotById.get(requested.itemId);
      if (!quickAdd && (!itemSnapshot?.exists || itemSnapshot.data()?.spaceId !== spaceId || itemSnapshot.data()?.ownerId !== context.settings.ownerId)) {
        throw new HttpsError('failed-precondition', 'A returned item record is unavailable.');
      }

      let lineCommissionReversedMinor = 0;
      let lineSellerEarningReversedMinor = 0;
      if (sourceMode === 'marketplace_consignment') {
        const totalCommissionMinor = nonNegativeMoney(line.commissionMinor || 0);
        const previousCommission = cumulativeShare(totalCommissionMinor, totalQuantity, previousReturned);
        const nextCommission = cumulativeShare(totalCommissionMinor, totalQuantity, nextReturned);
        lineCommissionReversedMinor = nextCommission - previousCommission;
        lineSellerEarningReversedMinor = lineRefundMinor - lineCommissionReversedMinor;
        const sellerId = stringValue(line.sellerId, 'Seller ID', 80);
        const sellerSnapshot = sellerById.get(sellerId);
        if (!sellerSnapshot?.exists || sellerSnapshot.data()?.spaceId !== spaceId || sellerSnapshot.data()?.ownerId !== context.settings.ownerId) throw new HttpsError('failed-precondition', 'The seller balance record is unavailable.');
        const current = sellerAdjustments.get(sellerId) || { gross: 0, commission: 0, earnings: 0, quantity: 0, name: String(sellerSnapshot.data()?.name || line.sellerName || 'Seller'), uid: sellerSnapshot.data()?.linkedUid || line.sellerUid || null };
        current.gross += lineRefundMinor;
        current.commission += lineCommissionReversedMinor;
        current.earnings += lineSellerEarningReversedMinor;
        current.quantity += requested.quantity;
        sellerAdjustments.set(sellerId, current);
        if (itemSnapshot) transaction.update(itemSnapshot.ref, {
          quantityOnHand: Number(itemSnapshot.data()?.quantityOnHand || 0) + requested.quantity,
          soldQuantity: Math.max(0, Number(itemSnapshot.data()?.soldQuantity || 0) - requested.quantity),
          grossSalesMinor: Math.max(0, Number(itemSnapshot.data()?.grossSalesMinor || 0) - lineRefundMinor),
          commissionEarnedMinor: Math.max(0, Number(itemSnapshot.data()?.commissionEarnedMinor || 0) - lineCommissionReversedMinor),
          sellerEarningsMinor: Math.max(0, Number(itemSnapshot.data()?.sellerEarningsMinor || 0) - lineSellerEarningReversedMinor),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const lineCostMinor = nonNegativeMoney(line.lineCostMinor || 0);
        const previousCost = cumulativeShare(lineCostMinor, totalQuantity, previousReturned);
        const nextCost = cumulativeShare(lineCostMinor, totalQuantity, nextReturned);
        const lineCostReversedMinor = nextCost - previousCost;
        costReversedMinor += lineCostReversedMinor;
        if (itemSnapshot) {
          const lineGrossMinor = nonNegativeMoney(line.lineTotalMinor || 0);
          const previousGross = cumulativeShare(lineGrossMinor, totalQuantity, previousReturned);
          const nextGross = cumulativeShare(lineGrossMinor, totalQuantity, nextReturned);
          const lineGrossReversedMinor = nextGross - previousGross;
          const product = itemSnapshot.data() || {};
          transaction.update(itemSnapshot.ref, {
            quantityOnHand: product.trackStock === false ? 0 : Number(product.quantityOnHand || 0) + requested.quantity,
            soldQuantity: Math.max(0, Number(product.soldQuantity || 0) - requested.quantity),
            salesRevenueMinor: Math.max(0, Number(product.salesRevenueMinor || 0) - lineGrossReversedMinor),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      items[lineIndex] = {
        ...line,
        returnedQuantity: nextReturned,
        returnedMinor: nextRefundMinor,
        commissionReturnedMinor: nonNegativeMoney(line.commissionReturnedMinor || 0) + lineCommissionReversedMinor,
        sellerEarningReturnedMinor: nonNegativeMoney(line.sellerEarningReturnedMinor || 0) + lineSellerEarningReversedMinor,
      };
      refundMinor += lineRefundMinor;
      commissionReversedMinor += lineCommissionReversedMinor;
      sellerEarningReversedMinor += lineSellerEarningReversedMinor;
      returnedItemCount += requested.quantity;
      returnItems.push({
        productId: String(line.productId || requested.itemId),
        listingId: sourceMode === 'marketplace_consignment' ? (line.listingId ? String(line.listingId) : null) : null,
        productName: String(line.productName || 'Item'), sellerId: sourceMode === 'marketplace_consignment' ? String(line.sellerId || '') : null,
        sellerName: sourceMode === 'marketplace_consignment' ? String(line.sellerName || '') : null,
        quantity: requested.quantity, refundMinor: lineRefundMinor, commissionReversedMinor: lineCommissionReversedMinor, sellerEarningReversedMinor: lineSellerEarningReversedMinor,
        quickAdd,
      });
    });

    const currentReturnedMinor = nonNegativeMoney(sale.returnedMinor || 0);
    const nextReturnedMinor = currentReturnedMinor + refundMinor;
    if (nextReturnedMinor > nonNegativeMoney(sale.totalMinor || 0)) throw new HttpsError('failed-precondition', 'The return would exceed the original sale total.');
    const fullyReturned = items.every((line) => Number(line.returnedQuantity || 0) >= Number(line.quantity || 0));
    const now = FieldValue.serverTimestamp();

    const originalPayments: DocumentData[] = Array.isArray(sale.payments) && sale.payments.length
      ? sale.payments.map((row: unknown) => ({ ...((row || {}) as DocumentData) }))
      : [{
        accountId: stringValue(sale.paymentAccountId, 'Original payment account', 80),
        accountName: String(sale.paymentAccountName || 'Business account'), paymentMethod: sale.paymentMethod || null, paymentMethodLabel: sale.paymentMethodLabel || null,
        amountMinor: nonNegativeMoney(sale.totalMinor || 0), returnedMinor: currentReturnedMinor,
        transactionId: String(sale.transactionId || ''), ledgerEntryId: String(sale.ledgerEntryId || ''),
      }];
    let refundRemaining = refundMinor;
    const allocations = new Map<number, number>();
    originalPayments.forEach((row, index) => {
      if (refundRemaining <= 0) return;
      const capacity = Math.max(0, nonNegativeMoney(row.amountMinor || 0) - nonNegativeMoney(row.returnedMinor || 0));
      const amount = Math.min(capacity, refundRemaining);
      if (amount > 0) { allocations.set(index, amount); refundRemaining -= amount; }
    });
    if (refundRemaining !== 0) throw new HttpsError('failed-precondition', 'Original split payments do not have enough refundable balance.');
    const refundRows: SmePosPaymentRequestRow[] = [...allocations.entries()].map(([index, amountMinor]) => ({
      accountId: stringValue(originalPayments[index].accountId, 'Original payment account', 80),
      paymentMethod: originalPayments[index].paymentMethod ? oneOf(originalPayments[index].paymentMethod, paymentMethodCodes, 'Payment method') : null,
      paymentMethodLabel: optionalString(originalPayments[index].paymentMethodLabel, 80) || null,
      amountMinor,
    }));
    const refundPayments = await postSmePosPayments({
      transaction, rows: refundRows, settings: context.settings, spaceId, uid, idempotencyKey: `${key}:refund`, now,
      transactionDate: returnDate, direction: 'out', entryType: sourceMode === 'marketplace_consignment' ? 'marketplace_pos_refund' : 'sme_pos_refund',
      counterparty: sale.customerName || 'POS customer', note: reason || `Refund for POS receipt ${sale.receiptNumber || saleId}`, categoryId: 'expense-other',
      extra: { posSaleId: saleId, posReturnId: returnRef.id },
    });
    const updatedPayments = originalPayments.map((row, index) => ({
      ...row,
      returnedMinor: nonNegativeMoney(row.returnedMinor || 0) + (allocations.get(index) || 0),
    }));

    sellerAdjustments.forEach((adjustment, sellerId) => {
      const sellerSnapshot = sellerById.get(sellerId)!;
      const currentBalance = signedMoney(sellerSnapshot.data()?.balanceMinor || 0, 'Seller balance');
      const nextBalance = currentBalance - adjustment.earnings;
      transaction.update(sellerSnapshot.ref, {
        grossSalesMinor: Math.max(0, Number(sellerSnapshot.data()?.grossSalesMinor || 0) - adjustment.gross),
        commissionEarnedMinor: Math.max(0, Number(sellerSnapshot.data()?.commissionEarnedMinor || 0) - adjustment.commission),
        balanceMinor: nextBalance, soldQuantity: Math.max(0, Number(sellerSnapshot.data()?.soldQuantity || 0) - adjustment.quantity), updatedAt: now,
      });
      const ledgerRef = db.collection('smePosSellerLedger').doc();
      transaction.create(ledgerRef, {
        displayId: displayId('SLG'), spaceId, ownerId: context.settings.ownerId, sellerId, sellerName: adjustment.name, sellerUid: adjustment.uid,
        kind: 'return_adjustment', amountMinor: -adjustment.earnings, balanceAfterMinor: nextBalance, currency: String(sale.currency || context.settings.currency),
        saleId, receiptNumber: sale.receiptNumber || null, payoutId: null, returnId: returnRef.id, note: `Return adjustment for ${adjustment.quantity} item(s)`, createdAt: now,
      });
    });

    if (customerRef && customerSnapshot?.exists && customerSnapshot.data()?.spaceId === spaceId) transaction.update(customerRef, { totalSpentMinor: Math.max(0, Number(customerSnapshot.data()?.totalSpentMinor || 0) - refundMinor), updatedAt: now });

    const remainingProfitMinor = sourceMode === 'marketplace_consignment'
      ? Math.max(0, nonNegativeMoney(sale.marketplaceCommissionMinor || sale.profitMinor || 0) - commissionReversedMinor)
      : Math.max(0, nonNegativeMoney(sale.profitMinor || 0) - (refundMinor - costReversedMinor));
    const remainingSellerEarningsMinor = sourceMode === 'marketplace_consignment'
      ? Math.max(0, nonNegativeMoney(sale.sellerEarningsMinor || sale.costMinor || 0) - sellerEarningReversedMinor)
      : nonNegativeMoney(sale.costMinor || 0) - costReversedMinor;
    transaction.update(saleRef, {
      items, payments: updatedPayments, status: fullyReturned ? 'refunded' : 'partially_returned', returnStatus: fullyReturned ? 'full' : 'partial',
      returnedMinor: nextReturnedMinor, returnIds: FieldValue.arrayUnion(returnRef.id), lastReturnDate: returnDate,
      costMinor: Math.max(0, remainingSellerEarningsMinor), profitMinor: remainingProfitMinor,
      marketplaceCommissionMinor: sourceMode === 'marketplace_consignment' ? remainingProfitMinor : sale.marketplaceCommissionMinor || null,
      sellerEarningsMinor: sourceMode === 'marketplace_consignment' ? Math.max(0, remainingSellerEarningsMinor) : sale.sellerEarningsMinor || null,
      updatedAt: now,
    });
    const firstRefund = refundPayments[0];
    transaction.create(returnRef, {
      displayId: displayId('RET'), spaceId, ownerId: context.settings.ownerId, saleId, receiptNumber: String(sale.receiptNumber || saleId), sourceMode, status: 'posted', items: returnItems,
      itemCount: returnedItemCount, refundMinor, commissionReversedMinor, sellerEarningReversedMinor,
      paymentAccountId: firstRefund.accountId, paymentAccountName: firstRefund.accountName, currency: String(sale.currency || context.settings.currency), returnDate, reason,
      transactionId: firstRefund.transactionId, ledgerEntryId: firstRefund.ledgerEntryId, payments: refundPayments, transactionIds: refundPayments.map((row) => row.transactionId), ledgerEntryIds: refundPayments.map((row) => row.ledgerEntryId),
      createdBy: uid, createdAt: now,
    });
    const result = { returnId: returnRef.id, saleId, refundMinor, transactionId: firstRefund.transactionId, transactionIds: refundPayments.map((row) => row.transactionId) };
    transaction.create(commandRef, { uid, kind: 'return_sme_pos_sale', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email, action: sourceMode === 'marketplace_consignment' ? 'marketplace_pos_sale_returned' : 'pos_sale_returned', targetType: 'sme_pos_sale', targetId: saleId, summary: `Returned ${returnedItemCount} item(s) from ${sale.receiptNumber || saleId} and refunded ${refundMinor / 100} ${sale.currency || context.settings.currency} across ${refundPayments.length} payment source(s).`, now });
    return result;
  });
});


export const recordMarketplaceSellerPayout = onCall({ region, cpu: 'gcf_gen1', concurrency: 1 }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const sellerId = stringValue(request.data?.sellerId, 'Seller ID', 80);
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const paymentRows = parseSmePosPaymentRows(request.data || {}, amountMinor);
  const payoutDate = localDate(request.data?.payoutDate, 'Payout date');
  const reference = optionalString(request.data?.reference, 120);
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const context = await requireSmePosActor(spaceId, uid, ['owner', 'manager']);
  requireMarketplaceSettings(context);
  const commandRef = db.collection('smePosCommands').doc(commandId(uid, key));
  const sellerRef = db.collection('smePosSellers').doc(sellerId);
  const payoutRef = db.collection('smePosPayouts').doc();

  return db.runTransaction(async (transaction) => {
    const [command, sellerSnapshot] = await Promise.all([
      transaction.get(commandRef), transaction.get(sellerRef),
    ]);
    if (command.exists) return command.data()?.result;
    if (!sellerSnapshot.exists || sellerSnapshot.data()?.spaceId !== spaceId || sellerSnapshot.data()?.ownerId !== context.settings.ownerId) {
      throw new HttpsError('not-found', 'Seller not found.');
    }
    const currentBalance = signedMoney(sellerSnapshot.data()?.balanceMinor || 0, 'Seller balance');
    if (currentBalance <= 0) throw new HttpsError('failed-precondition', 'This seller has no positive balance available for payout.');
    if (amountMinor > currentBalance) throw new HttpsError('failed-precondition', `The maximum payout is ${(currentBalance / 100).toFixed(2)} ${sellerSnapshot.data()?.currency || 'BND'}.`);
    if (sellerSnapshot.data()?.currency !== context.settings.currency) throw new HttpsError('failed-precondition', 'Seller balance and POS currencies must match.');

    const now = FieldValue.serverTimestamp();
    const nextBalance = currentBalance - amountMinor;
    const sellerName = String(sellerSnapshot.data()?.name || 'Marketplace seller');
    const spaceName = String(context.space.name || context.settings.shopName || 'SME');
    const payoutNote = [reference ? `Ref ${reference}` : '', note].filter(Boolean).join(' · ') || `Seller payout ${payoutRef.id}`;
    const postedPayments = await postSmePosPayments({
      transaction, rows: paymentRows, settings: context.settings, spaceId, uid, idempotencyKey: `${key}:payout`, now,
      transactionDate: payoutDate, direction: 'out', entryType: 'marketplace_seller_payout',
      counterparty: sellerName, note: payoutNote, categoryId: 'expense-supplier',
      extra: { posPayoutId: payoutRef.id, posSettlementType: 'seller_payout' },
    });
    const firstPayment = postedPayments[0];
    const sourceLabels = postedPayments.map((payment) => `${spaceName} — ${payment.accountName}`);

    transaction.update(sellerRef, {
      balanceMinor: nextBalance,
      paidOutMinor: Number(sellerSnapshot.data()?.paidOutMinor || 0) + amountMinor,
      updatedAt: now,
    });
    transaction.create(payoutRef, {
      displayId: displayId('PAY'), spaceId, spaceName, ownerId: context.settings.ownerId, sellerId,
      sellerName, sellerUid: sellerSnapshot.data()?.linkedUid || null,
      status: 'posted', amountMinor, balanceAfterMinor: nextBalance, currency: context.settings.currency,
      paymentAccountId: firstPayment.accountId, paymentAccountName: firstPayment.accountName,
      paymentMethod: firstPayment.paymentMethod, paymentMethodLabel: firstPayment.paymentMethodLabel,
      paymentSourceLabel: sourceLabels[0], paymentSourceLabels: sourceLabels, payments: postedPayments,
      payoutDate, reference, note, transactionId: firstPayment.transactionId, ledgerEntryId: firstPayment.ledgerEntryId,
      transactionIds: postedPayments.map((payment) => payment.transactionId),
      ledgerEntryIds: postedPayments.map((payment) => payment.ledgerEntryId),
      createdBy: uid, createdByName: context.member.displayName || context.member.email || 'Team member', createdAt: now,
    });
    const sellerLedgerRef = db.collection('smePosSellerLedger').doc();
    transaction.create(sellerLedgerRef, {
      displayId: displayId('SLG'), spaceId, ownerId: context.settings.ownerId, sellerId,
      sellerName, sellerUid: sellerSnapshot.data()?.linkedUid || null,
      kind: 'payout', amountMinor: -amountMinor, balanceAfterMinor: nextBalance, currency: context.settings.currency,
      saleId: null, receiptNumber: null, payoutId: payoutRef.id,
      note: `${reference ? `Ref ${reference} · ` : ''}Paid from ${sourceLabels.join(' + ')}${note ? ` · ${note}` : ''}`, createdAt: now,
    });
    const result = {
      payoutId: payoutRef.id, sellerId, transactionId: firstPayment.transactionId,
      transactionIds: postedPayments.map((payment) => payment.transactionId), balanceAfterMinor: nextBalance,
    };
    transaction.create(commandRef, { uid, kind: 'record_marketplace_seller_payout', idempotencyKey: key, result, createdAt: now });
    createActivity(transaction, {
      spaceId, actorUid: uid, actorName: context.member.displayName || context.member.email,
      action: 'marketplace_seller_payout_recorded', targetType: 'sme_pos_payout', targetId: payoutRef.id,
      summary: `Paid ${(amountMinor / 100).toFixed(2)} ${context.settings.currency || 'BND'} to ${sellerName} from ${sourceLabels.join(' + ')}.`,
      now,
    });
    return result;
  });
});

export const registerPushDevice = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const token = stringValue(request.data?.token, 'Notification token', 4096);
  const userAgent = optionalString(request.data?.userAgent, 240);
  const platform = optionalString(request.data?.platform, 80);
  const deviceId = `push_${createHash('sha256').update(token).digest('hex').slice(0, 40)}`;
  const now = FieldValue.serverTimestamp();
  await Promise.all([
    db.collection('pushDevices').doc(deviceId).set({
      uid, token, userAgent, platform, active: true,
      createdAt: now, lastSeenAt: now, removedAt: null, updatedAt: now,
    }, { merge: true }),
    db.collection('users').doc(uid).set({ browserPushEnabled: true, updatedAt: now }, { merge: true }),
  ]);
  return { deviceId, enabled: true };
});

export const unregisterPushDevice = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const devices = (await db.collection('pushDevices').where('uid', '==', uid).get()).docs;
  const now = Timestamp.now();
  const batch = db.batch();
  devices.filter((item) => item.exists && item.data()?.uid === uid).forEach((item) => {
    batch.set(item.ref, { active: false, removedAt: now, updatedAt: now }, { merge: true });
  });
  batch.set(db.collection('users').doc(uid), { browserPushEnabled: false, updatedAt: now }, { merge: true });
  await batch.commit();
  return { enabled: false };
});

type BackgroundReminderItemType = 'bill' | 'instalment' | 'goal' | 'debt';
type BackgroundReminderKind = 'due_soon' | 'due_today' | 'late';

interface PreparedBackgroundReminder {
  notificationId: string;
  reminderKey: string;
  title: string;
  message: string;
  targetPath: string;
}

interface BackgroundReminderResult {
  checked: number;
  created: number;
  pushSent: number;
  duplicates: number;
  today: string;
}

function bruneiLocalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Brunei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function localDateDifference(date: string, today: string): number {
  const target = Date.parse(`${date}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(target) || !Number.isFinite(current)) return Number.POSITIVE_INFINITY;
  return Math.round((target - current) / 86_400_000);
}

function backgroundReminderId(reminderKey: string): string {
  return `bgr_${createHash('sha256').update(reminderKey).digest('hex').slice(0, 40)}`;
}

function backgroundReminderCopy(input: {
  itemType: BackgroundReminderItemType;
  itemName: string;
  dueDate: string;
  days: number;
}): { kind: BackgroundReminderKind; title: string; message: string; targetPath: string } {
  const label =
    input.itemType === 'goal'
      ? 'Goal'
      : input.itemType === 'debt'
        ? 'Debt'
        : input.itemType === 'bill'
          ? 'Bill'
          : 'Instalment';

  const targetPath =
    input.itemType === 'goal'
      ? '/goals'
      : input.itemType === 'debt'
        ? '/debt'
        : '/bills';
  if (input.days < 0) return {
    kind: 'late',
    title: input.itemType === 'goal' ? 'Goal date has passed' : `${label} is late`,
    message: `${input.itemName} was due on ${input.dueDate}. Open it to review what needs attention.`,
    targetPath,
  };
  if (input.days === 0) return {
    kind: 'due_today',
    title: input.itemType === 'goal' ? 'Goal date is today' : `${label} is due today`,
    message: `${input.itemName} needs attention today.`,
    targetPath,
  };
  return {
    kind: 'due_soon',
    title: input.itemType === 'goal' ? 'Goal date is coming up' : `${label} is coming up`,
    message: `${input.itemName} is due on ${input.dueDate}.`,
    targetPath,
  };
}

async function createBackgroundReminder(input: {
  uid: string;
  spaceId?: string | null;
  itemType: BackgroundReminderItemType;
  itemId: string;
  itemName: string;
  dueDate: string;
  days: number;
}): Promise<PreparedBackgroundReminder | null> {
  const copy = backgroundReminderCopy(input);
  const reminderKey = [input.uid, input.itemType, input.itemId, input.dueDate, copy.kind].join('|');
  const documentId = backgroundReminderId(reminderKey);
  const notificationRef = db.collection('userNotifications').doc(documentId);
  const historyRef = db.collection('reminderHistory').doc(documentId);
  let created = false;

  await db.runTransaction(async (transaction) => {
    const [notification, history] = await Promise.all([
      transaction.get(notificationRef),
      transaction.get(historyRef),
    ]);
    if (notification.exists) return;
    const now = FieldValue.serverTimestamp();
    transaction.create(notificationRef, {
      uid: input.uid,
      spaceId: input.spaceId || null,
      type: `background_${copy.kind}`,
      title: copy.title,
      message: copy.message,
      targetPath: copy.targetPath,
      actionLabel: 'Open',
      source: 'background_reminder',
      itemType: input.itemType,
      itemId: input.itemId,
      dueDate: input.dueDate,
      reminderKey,
      pushAttemptedAt: null,
      pushSentAt: null,
      pushFailureCount: 0,
      readAt: null,
      createdAt: now,
    });
    if (!history.exists) transaction.create(historyRef, {
      uid: input.uid,
      itemType: input.itemType,
      itemId: input.itemId,
      itemName: input.itemName,
      spaceId: input.spaceId || null,
      dueDate: input.dueDate,
      action: 'background_generated',
      message: copy.message,
      phone: null,
      createdAt: now,
    });
    created = true;
  });

  return created ? {
    notificationId: documentId,
    reminderKey,
    title: copy.title,
    message: copy.message,
    targetPath: copy.targetPath,
  } : null;
}

function isInvalidPushToken(code: string): boolean {
  return code === 'messaging/registration-token-not-registered'
    || code === 'messaging/invalid-registration-token';
}

async function sendBrowserPush(uid: string, reminders: PreparedBackgroundReminder[]): Promise<number> {
  if (!reminders.length) return 0;
  const devices = await db.collection('pushDevices').where('uid', '==', uid).get();
  const activeDevices = devices.docs.filter((item) => item.data().active === true && typeof item.data().token === 'string');
  if (!activeDevices.length) return 0;
  const selected = activeDevices.slice(0, 500);
  const tokens = selected.map((item) => String(item.data().token));
  let sent = 0;

  for (const reminder of reminders.slice(0, 25)) {
    const attemptedAt = Timestamp.now();
    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        data: {
          title: reminder.title,
          body: reminder.message,
          targetPath: reminder.targetPath,
          notificationId: reminder.notificationId,
          reminderKey: reminder.reminderKey,
        },
        webpush: { headers: { Urgency: 'normal' } },
      });
      sent += response.successCount;
      const invalidRefs: DocumentReference[] = [];
      response.responses.forEach((item, index) => {
        if (!item.success && isInvalidPushToken(String(item.error?.code || ''))) invalidRefs.push(selected[index].ref);
      });
      const batch = db.batch();
      invalidRefs.forEach((ref) => batch.set(ref, { active: false, removedAt: attemptedAt, updatedAt: attemptedAt }, { merge: true }));
      batch.set(db.collection('userNotifications').doc(reminder.notificationId), {
        pushAttemptedAt: attemptedAt,
        pushSentAt: response.successCount > 0 ? attemptedAt : null,
        pushFailureCount: response.failureCount,
      }, { merge: true });
      if (invalidRefs.length || response.successCount >= 0) await batch.commit();
    } catch (error) {
      console.error(`Unable to send background reminder ${reminder.notificationId}.`, error);
      await db.collection('userNotifications').doc(reminder.notificationId).set({
        pushAttemptedAt: attemptedAt,
        pushFailureCount: tokens.length,
      }, { merge: true });
    }
  }
  return sent;
}

interface SpaceAutomationPreferenceData {
  enabled: boolean;
  contributionReminder: boolean;
  contributionDueDate: string | null;
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

interface SpaceAutomationCandidate {
  spaceId: string;
  rule: string;
  sourceId: string;
  cycle: string;
  title: string;
  message: string;
  targetPath: string;
  dueDate?: string | null;
}

function spaceAutomationInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(numeric)));
}

function normalizeSpaceAutomationPreference(
  value: unknown,
): SpaceAutomationPreferenceData {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};

  const rawDate =
    typeof source.contributionDueDate === 'string'
      ? source.contributionDueDate.trim()
      : '';

  return {
    enabled: source.enabled === true,
    contributionReminder: source.contributionReminder === true,
    contributionDueDate:
      /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : null,
    budgetThresholdAlert: source.budgetThresholdAlert !== false,
    budgetThresholdPercent: spaceAutomationInteger(
      source.budgetThresholdPercent,
      50,
      100,
      80,
    ),
    lowFundAlert: source.lowFundAlert === true,
    lowFundThresholdMinor: spaceAutomationInteger(
      source.lowFundThresholdMinor,
      0,
      99_999_999_999,
      0,
    ),
    overdueBillAlert: source.overdueBillAlert !== false,
    overdueTaskAlert: source.overdueTaskAlert !== false,
    lowStockAlert: source.lowStockAlert !== false,
    lowStockThreshold: spaceAutomationInteger(
      source.lowStockThreshold,
      0,
      1_000_000,
      0,
    ),
    sellerPayoutAlert: source.sellerPayoutAlert === true,
    sellerPayoutThresholdMinor: spaceAutomationInteger(
      source.sellerPayoutThresholdMinor,
      0,
      99_999_999_999,
      0,
    ),
  };
}

function enabledSpaceAutomationPreferences(
  profile: DocumentData,
): Array<[string, SpaceAutomationPreferenceData]> {
  const raw = profile.spaceAutomationV1;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }

  const result: Array<[string, SpaceAutomationPreferenceData]> = [];

  for (const [spaceId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!spaceId || spaceId.length > 80) continue;

    const preference = normalizeSpaceAutomationPreference(value);
    if (!preference.enabled) continue;

    result.push([spaceId, preference]);
    if (result.length >= 25) break;
  }

  return result;
}

function minorAmountLabel(amountMinor: number, currency: string): string {
  return (amountMinor / 100).toFixed(2) + ' ' + (currency || 'BND');
}

function spaceAutomationReminderKey(
  uid: string,
  candidate: SpaceAutomationCandidate,
): string {
  return [
    uid,
    'space_automation',
    candidate.spaceId,
    candidate.rule,
    candidate.sourceId,
    candidate.cycle,
  ].join('|');
}

async function cleanupResolvedSpaceAutomationReminders(
  uid: string,
  activeReminderKeys: Set<string>,
): Promise<void> {
  const snapshot = await db
    .collection('userNotifications')
    .where('uid', '==', uid)
    .get();

  const stale = snapshot.docs.filter((row) => {
    const item = row.data();
    const reminderKey = typeof item.reminderKey === 'string'
      ? item.reminderKey
      : '';

    return item.type === 'space_reminder'
      && item.source === 'background_reminder'
      && reminderKey.includes('|space_automation|')
      && !activeReminderKeys.has(reminderKey);
  }).slice(0, 100);

  if (!stale.length) return;

  const writer = db.bulkWriter();
  for (const row of stale) writer.delete(row.ref);
  await writer.close();
}

async function createSpaceAutomationReminder(input: {
  uid: string;
  candidate: SpaceAutomationCandidate;
}): Promise<PreparedBackgroundReminder | null> {
  const reminderKey = spaceAutomationReminderKey(
    input.uid,
    input.candidate,
  );

  const documentId = backgroundReminderId(reminderKey);
  const notificationRef = db.collection('userNotifications').doc(documentId);
  let created = false;

  await db.runTransaction(async (transaction) => {
    const notification = await transaction.get(notificationRef);
    if (notification.exists) return;

    const now = FieldValue.serverTimestamp();

    transaction.create(notificationRef, {
      uid: input.uid,
      spaceId: input.candidate.spaceId,
      type: 'space_reminder',
      title: input.candidate.title,
      message: input.candidate.message,
      targetPath: input.candidate.targetPath,
      actionLabel: 'Open',
      source: 'background_reminder',
      itemType: null,
      itemId: input.candidate.sourceId,
      dueDate: input.candidate.dueDate || null,
      reminderKey,
      pushAttemptedAt: null,
      pushSentAt: null,
      pushFailureCount: 0,
      readAt: null,
      createdAt: now,
    });

    created = true;
  });

  return created
    ? {
        notificationId: documentId,
        reminderKey,
        title: input.candidate.title,
        message: input.candidate.message,
        targetPath: input.candidate.targetPath,
      }
    : null;
}

async function processSpaceAutomationRemindersForUser(
  uid: string,
  profile: DocumentData,
  today: string,
  reminderDaysBefore: number,
): Promise<BackgroundReminderResult> {
  const result: BackgroundReminderResult = {
    checked: 0,
    created: 0,
    pushSent: 0,
    duplicates: 0,
    today,
  };

  const preferences = enabledSpaceAutomationPreferences(profile);
  if (!preferences.length) return result;

  const needsBills = preferences.some(([, item]) => item.overdueBillAlert);
  const needsTasks = preferences.some(([, item]) => item.overdueTaskAlert);

  const [billSnapshot, taskSnapshot] = await Promise.all([
    needsBills
      ? db.collection('sharedBillAssignments').where('memberUid', '==', uid).get()
      : Promise.resolve(null),
    needsTasks
      ? db.collection('tripTasks').where('assigneeUid', '==', uid).get()
      : Promise.resolve(null),
  ]);

  const assignedBills = billSnapshot?.docs || [];
  const assignedTasks = taskSnapshot?.docs || [];
  const candidates: SpaceAutomationCandidate[] = [];
  const activeReminderKeys = new Set<string>();

  const addCandidate = (candidate: SpaceAutomationCandidate) => {
    result.checked += 1;
    activeReminderKeys.add(spaceAutomationReminderKey(uid, candidate));
    if (candidates.length < 100) candidates.push(candidate);
  };

  for (const [spaceId, preference] of preferences) {
    const [spaceSnapshot, memberSnapshot] = await Promise.all([
      db.collection('spaces').doc(spaceId).get(),
      db.collection('spaceMembers').doc(spaceId + '_' + uid).get(),
    ]);

    if (
      !spaceSnapshot.exists
      || spaceSnapshot.data()?.archivedAt
      || !memberSnapshot.exists
      || (
        memberSnapshot.data()?.status
        && memberSnapshot.data()?.status !== 'active'
      )
    ) {
      continue;
    }

    const space = spaceSnapshot.data() || {};
    const role = String(memberSnapshot.data()?.role || '');
    const canManage = role === 'owner' || role === 'admin';
    const spaceType = String(space.type || '');
    const spaceName = String(space.name || 'Space');
    const currency = String(space.currency || 'BND');

    if (
      preference.contributionReminder
      && preference.contributionDueDate
    ) {
      const days = localDateDifference(
        preference.contributionDueDate,
        today,
      );

      if (
        Number.isFinite(days)
        && days <= reminderDaysBefore
        && !(days >= 0 && profile.dueSoonReminders === false)
        && !(days < 0 && profile.lateReminders === false)
      ) {
        addCandidate({
          spaceId,
          rule: 'contribution_due',
          sourceId: spaceId,
          cycle: preference.contributionDueDate,
          title:
            days < 0
              ? 'Contribution reminder is overdue'
              : days === 0
                ? 'Contribution reminder is today'
                : 'Contribution reminder is coming up',
          message:
            spaceName
            + ' has your contribution reminder set for '
            + preference.contributionDueDate
            + '.',
          targetPath:
            '/spaces/'
            + spaceId
            + '?tab='
            + (spaceType === 'trip' ? 'trip_money' : 'group_fund'),
          dueDate: preference.contributionDueDate,
        });
      }
    }

    if (preference.overdueBillAlert && profile.lateReminders !== false) {
      for (const row of assignedBills) {
        const item = row.data();

        if (
          String(item.spaceId || '') !== spaceId
          || typeof item.dueDate !== 'string'
          || item.dueDate >= today
        ) {
          continue;
        }

        const assignedMinor = Number(item.assignedMinor || 0);
        const settledMinor = Number(item.settledMinor || 0);
        const storedOutstanding = Number(item.outstandingMinor);
        const outstandingMinor = Number.isFinite(storedOutstanding)
          ? storedOutstanding
          : assignedMinor - settledMinor;

        if (
          outstandingMinor <= 0
          || item.status === 'paid'
          || item.status === 'confirmed'
        ) {
          continue;
        }

        addCandidate({
          spaceId,
          rule: 'overdue_bill',
          sourceId: row.id,
          cycle: item.dueDate,
          title: 'Shared bill overdue',
          message:
            String(item.commitmentName || 'Shared bill')
            + ' still has '
            + minorAmountLabel(outstandingMinor, String(item.currency || currency))
            + ' assigned to you.',
          targetPath:
            '/spaces/'
            + spaceId
            + '?tab=bills&assignmentId='
            + encodeURIComponent(row.id),
          dueDate: item.dueDate,
        });
      }
    }

    if (preference.overdueTaskAlert && profile.lateReminders !== false) {
      for (const row of assignedTasks) {
        const item = row.data();

        if (
          String(item.spaceId || '') !== spaceId
          || item.status !== 'open'
          || item.archivedAt
          || typeof item.dueDate !== 'string'
          || item.dueDate >= today
        ) {
          continue;
        }

        addCandidate({
          spaceId,
          rule: 'overdue_task',
          sourceId: row.id,
          cycle: item.dueDate,
          title: 'Assigned task overdue',
          message:
            String(item.title || 'Task')
            + ' was due on '
            + item.dueDate
            + '.',
          targetPath:
            '/spaces/'
            + spaceId
            + '?tab=overview&taskId='
            + encodeURIComponent(row.id)
            + '#trip-planning',
          dueDate: item.dueDate,
        });
      }
    }

    if (canManage && preference.budgetThresholdAlert) {
      const budgets = await db
        .collection('budgets')
        .where('spaceId', '==', spaceId)
        .get();

      for (const row of budgets.docs) {
        const item = row.data();
        const limitMinor = Number(item.limitMinor || 0);
        const spentMinor = Number(item.spentMinor || 0);

        if (
          item.archivedAt
          || limitMinor <= 0
          || typeof item.startDate !== 'string'
          || typeof item.endDate !== 'string'
          || today < item.startDate
          || today > item.endDate
        ) {
          continue;
        }

        const percentage = Math.floor((spentMinor * 100) / limitMinor);

        if (percentage < preference.budgetThresholdPercent) {
          continue;
        }

        addCandidate({
          spaceId,
          rule: 'budget_threshold',
          sourceId: row.id,
          cycle:
            item.startDate
            + ':'
            + item.endDate
            + ':'
            + preference.budgetThresholdPercent,
          title: 'Budget needs attention',
          message:
            String(item.name || 'Budget')
            + ' has used '
            + percentage
            + '% of '
            + minorAmountLabel(limitMinor, String(item.currency || currency))
            + '.',
          targetPath:
            '/spaces/'
            + spaceId
            + '?tab=overview&section=budgets&budgetId='
            + encodeURIComponent(row.id),
        });
      }
    }

    if (
      canManage
      && preference.lowFundAlert
      && preference.lowFundThresholdMinor > 0
    ) {
      const fundSnapshot = await db.collection('spaceFunds').doc(spaceId).get();

      if (fundSnapshot.exists) {
        const fund = fundSnapshot.data() || {};
        const availableMinor = Number(fund.availableMinor || 0);

        if (availableMinor <= preference.lowFundThresholdMinor) {
          const kind = String(fund.kind || '');
          const label = String(
            fund.label
            || (kind === 'trip'
              ? 'Trip Fund'
              : kind === 'household'
                ? 'Household Fund'
                : 'Group Fund'),
          );

          addCandidate({
            spaceId,
            rule: 'low_fund',
            sourceId: fundSnapshot.id,
            cycle: String(preference.lowFundThresholdMinor),
            title: label + ' is running low',
            message:
              label
              + ' has '
              + minorAmountLabel(
                availableMinor,
                String(fund.currency || currency),
              )
              + ' available.',
            targetPath:
              '/spaces/'
              + spaceId
              + '?tab='
              + (kind === 'trip' || spaceType === 'trip'
                ? 'trip_money'
                : 'group_fund'),
          });
        }
      }
    }

    if (
      canManage
      && spaceType === 'sme'
      && preference.lowStockAlert
    ) {
      const products = await db
        .collection('smePosProducts')
        .where('spaceId', '==', spaceId)
        .get();

      for (const row of products.docs) {
        const item = row.data();

        if (item.archivedAt || item.trackStock !== true) continue;

        const quantity = Number(item.quantityOnHand || 0);
        const itemThreshold = Number(item.lowStockLevel || 0);
        const threshold = Math.max(
          preference.lowStockThreshold,
          Number.isFinite(itemThreshold) ? itemThreshold : 0,
        );

        if (quantity > threshold) continue;

        addCandidate({
          spaceId,
          rule: 'low_stock',
          sourceId: row.id,
          cycle: threshold + ':' + quantity,
          title: 'Low stock',
          message:
            String(item.name || 'Product')
            + ' has '
            + quantity
            + ' left in stock.',
          targetPath:
            '/spaces/'
            + spaceId
            + '/pos?tab=inventory&productId='
            + encodeURIComponent(row.id),
        });
      }
    }

    if (
      canManage
      && spaceType === 'sme'
      && preference.sellerPayoutAlert
      && preference.sellerPayoutThresholdMinor > 0
    ) {
      const sellers = await db
        .collection('smePosSellers')
        .where('spaceId', '==', spaceId)
        .get();

      for (const row of sellers.docs) {
        const item = row.data();
        const balanceMinor = Number(item.balanceMinor || 0);

        if (
          item.archivedAt
          || balanceMinor < preference.sellerPayoutThresholdMinor
        ) {
          continue;
        }

        addCandidate({
          spaceId,
          rule: 'seller_payout_due',
          sourceId: row.id,
          cycle:
            String(preference.sellerPayoutThresholdMinor)
            + ':'
            + String(Number(item.paidOutMinor || 0)),
          title: 'Seller payout due',
          message:
            String(item.name || 'Seller')
            + ' has '
            + minorAmountLabel(
              balanceMinor,
              String(item.currency || currency),
            )
            + ' available for payout.',
          targetPath:
            '/spaces/'
            + spaceId
            + '/pos?tab=payouts&sellerId='
            + encodeURIComponent(row.id),
        });
      }
    }
  }

  candidates.sort((a, b) => {
    const dueA = a.dueDate || '9999-12-31';
    const dueB = b.dueDate || '9999-12-31';
    return dueA.localeCompare(dueB) || a.title.localeCompare(b.title);
  });

  const created: PreparedBackgroundReminder[] = [];

  for (const candidate of candidates.slice(0, 50)) {
    const reminder = await createSpaceAutomationReminder({
      uid,
      candidate,
    });

    if (reminder) {
      created.push(reminder);
      result.created += 1;
    }
    else {
      result.duplicates += 1;
    }
  }

  if (profile.browserPushEnabled === true) {
    result.pushSent = await sendBrowserPush(uid, created);
  }

  await cleanupResolvedSpaceAutomationReminders(
    uid,
    activeReminderKeys,
  );

  return result;
}

async function processBackgroundRemindersForUser(
  uid: string,
  profile: DocumentData,
  today = bruneiLocalDate(),
): Promise<BackgroundReminderResult> {
  const result: BackgroundReminderResult = { checked: 0, created: 0, pushSent: 0, duplicates: 0, today };
  if (profile.notificationsEnabled === false || profile.backgroundRemindersEnabled === false) return result;
  const reminderDaysBefore = Math.min(30, Math.max(0, Number.isFinite(profile.reminderDaysBefore) ? Math.round(profile.reminderDaysBefore) : 3));
  const [commitments, goals, debts] = await Promise.all([
    db.collection('commitments').where('ownerId', '==', uid).get(),
    db.collection('goals').where('ownerId', '==', uid).get(),
    db.collection('debts').where('ownerId', '==', uid).get(),
  ]);
  const candidates: Array<{
    uid: string;
    spaceId?: string | null;
    itemType: BackgroundReminderItemType;
    itemId: string;
    itemName: string;
    dueDate: string;
    days: number;
  }> = [];

  for (const row of commitments.docs) {
    const item = row.data();
    if (item.status !== 'active' || item.archivedAt || item.stoppedAt || typeof item.nextDueDate !== 'string') continue;
    const days = localDateDifference(item.nextDueDate, today);
    if (!Number.isFinite(days) || days > reminderDaysBefore) continue;
    if (days >= 0 && profile.dueSoonReminders === false) continue;
    if (days < 0 && profile.lateReminders === false) continue;
    result.checked += 1;
    candidates.push({
      uid,
      spaceId: item.spaceId || null,
      itemType: item.type === 'instalment' ? 'instalment' : 'bill',
      itemId: row.id,
      itemName: String(item.name || (item.type === 'instalment' ? 'Instalment' : 'Bill')),
      dueDate: item.nextDueDate,
      days,
    });
  }

  if (profile.goalReminders !== false) for (const row of goals.docs) {
    const item = row.data();
    if (item.status !== 'active' || item.archivedAt || item.closedAt || typeof item.targetDate !== 'string') continue;
    if (Number(item.currentMinor || 0) >= Number(item.targetMinor || 0)) continue;
    const days = localDateDifference(item.targetDate, today);
    if (!Number.isFinite(days) || days > reminderDaysBefore) continue;
    if (days >= 0 && profile.dueSoonReminders === false) continue;
    if (days < 0 && profile.lateReminders === false) continue;
    result.checked += 1;
    candidates.push({
      uid,
      spaceId: item.spaceId || null,
      itemType: 'goal',
      itemId: row.id,
      itemName: String(item.name || 'Savings goal'),
      dueDate: item.targetDate,
      days,
    });
  }


  for (const row of debts.docs) {
    const item = row.data();

    if (
      item.status !== 'active'
      || item.archivedAt
      || item.reminderEnabled === false
      || typeof item.dueDate !== 'string'
    ) {
      continue;
    }

    const days =
      localDateDifference(
        item.dueDate,
        today,
      );

    if (
      !Number.isFinite(days)
      || days > reminderDaysBefore
    ) {
      continue;
    }

    if (
      days >= 0
      && profile.dueSoonReminders === false
    ) {
      continue;
    }

    if (
      days < 0
      && profile.lateReminders === false
    ) {
      continue;
    }

    result.checked += 1;

    candidates.push({
      uid,
      spaceId: item.spaceId || null,
      itemType: 'debt',
      itemId: row.id,
      itemName:
        String(item.counterparty || 'Debt'),
      dueDate: item.dueDate,
      days,
    });
  }
  candidates.sort((a, b) => Math.abs(a.days) - Math.abs(b.days) || a.dueDate.localeCompare(b.dueDate));
  const created: PreparedBackgroundReminder[] = [];
  for (const candidate of candidates.slice(0, 25)) {
    const reminder = await createBackgroundReminder(candidate);
    if (reminder) {
      created.push(reminder);
      result.created += 1;
    } else result.duplicates += 1;
  }
  if (profile.browserPushEnabled === true) result.pushSent = await sendBrowserPush(uid, created);
  const automationResult = await processSpaceAutomationRemindersForUser(
    uid,
    profile,
    today,
    reminderDaysBefore,
  );
  result.checked += automationResult.checked;
  result.created += automationResult.created;
  result.duplicates += automationResult.duplicates;
  result.pushSent += automationResult.pushSent;
  return result;
}

export const runMyBackgroundReminderCheck = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const profile = await db.collection('users').doc(uid).get();
  if (!profile.exists) throw new HttpsError('not-found', 'Your BajetBN profile was not found.');
  return processBackgroundRemindersForUser(uid, profile.data() || {});
});

export const generateBackgroundReminders = onSchedule({
  region,
  schedule: '25 */3 * * *',
  timeZone: 'Asia/Brunei',
  retryCount: 3,
}, async () => {
  const today = bruneiLocalDate();
  let lastUser: QueryDocumentSnapshot | undefined;
  let usersChecked = 0;
  let remindersCreated = 0;
  let pushesSent = 0;
  do {
    let userQuery = db.collection('users').orderBy(FieldPath.documentId()).limit(200);
    if (lastUser) userQuery = userQuery.startAfter(lastUser);
    const users = await userQuery.get();
    for (const user of users.docs) {
      const profile = user.data();
      if (profile.notificationsEnabled === false || profile.backgroundRemindersEnabled === false) continue;
      try {
        const result = await processBackgroundRemindersForUser(user.id, profile, today);
        usersChecked += 1;
        remindersCreated += result.created;
        pushesSent += result.pushSent;
      } catch (error) {
        console.error(`Background reminder check failed for user ${user.id}.`, error);
      }
    }
    lastUser = users.docs.at(-1);
    if (users.size < 200) break;
  } while (lastUser);
  await db.collection('backgroundReminderRuns').add({
    today, usersChecked, remindersCreated, pushesSent, completedAt: FieldValue.serverTimestamp(),
  });
  console.log(`Background reminders: users=${usersChecked}, created=${remindersCreated}, pushes=${pushesSent}, date=${today}.`);
});

export const updateSpaceCollaborationSettings = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const approvalMode = oneOf(request.data?.approvalMode, approvalModes, 'approval mode');
  const headWhatsapp = optionalPhone(request.data?.headWhatsapp);
  const manager = await requireSpaceManager(spaceId, uid);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const space = await spaceRef.get();
  if (!space.exists || space.data()?.archivedAt) throw new HttpsError('not-found', 'Space not found.');
  if (space.data()?.type === 'personal') throw new HttpsError('failed-precondition', 'Personal Spaces cannot enable collaboration.');
  const now = FieldValue.serverTimestamp();
  await db.runTransaction(async (transaction) => {
    transaction.update(spaceRef, { collaborationMode: 'collaborative', approvalMode, headWhatsapp, updatedAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'settings_updated', targetType: 'space', targetId: spaceId, summary: `Updated collaboration settings for ${space.data()?.name || 'the Space'}.`, now });
  });
  return { spaceId };
});

export const createSpaceInvitation = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const email = optionalNormalizedEmail(request.data?.email);
  const role = oneOf(request.data?.role, collaborationRoles, 'member role');
  const posRole = request.data?.posRole == null || request.data.posRole === ''
    ? null
    : oneOf(request.data.posRole, smePosRoles, 'POS role');
  const canUseAccounts = request.data?.canUseAccounts === true;
  const canViewBalances = request.data?.canViewBalances === true;
  const canViewLedger = request.data?.canViewLedger === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const manager = await requireSpaceManager(spaceId, uid);
  const space = await db.collection('spaces').doc(spaceId).get();
  if (!space.exists || space.data()?.archivedAt) throw new HttpsError('not-found', 'Space not found.');
  if (space.data()?.type === 'personal') throw new HttpsError('failed-precondition', 'Personal Spaces cannot have members.');
  if (posRole && space.data()?.type !== 'sme') throw new HttpsError('failed-precondition', 'POS roles are only available in an SME Space.');
  if (posRole && space.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'Only the SME Space owner can assign a POS role during an invitation.');

  if (space.data()?.type === 'sme') {
    await assertBasicSmeAdditionalMemberCapacity(
      String(space.data()?.ownerId || ''),
      spaceId,
    );
  }
  const [existing, registeredUsers, posSettings] = await Promise.all([
    email
      ? db.collection('spaceInvitations').where('spaceId', '==', spaceId).where('email', '==', email).get()
      : Promise.resolve(null),
    email
      ? db.collection('users').where('email', '==', email).limit(1).get()
      : Promise.resolve(null),
    posRole ? db.collection('smePosSettings').doc(spaceId).get() : Promise.resolve(null),
  ]);

  if (existing?.docs.some((item) => item.data().status === 'pending')) {
    throw new HttpsError('already-exists', 'A pending invitation already exists for this email.');
  }
  if (posRole && !posSettings?.exists) throw new HttpsError('failed-precondition', 'Save the POS setup before inviting a shop team member.');
  if (posRole === 'seller' && posSettings?.data()?.mode !== 'marketplace_consignment') {
    throw new HttpsError('failed-precondition', 'Seller access is only available in Marketplace Consignment POS.');
  }

  const invitedUserUid = registeredUsers && !registeredUsers.empty ? registeredUsers.docs[0].id : '';
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const invitationRef = db.collection('spaceInvitations').doc();
  const token = randomBytes(24).toString('hex');

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const now = FieldValue.serverTimestamp();
    const result = { invitationId: invitationRef.id, token };
    const inviteTarget = email || 'a WhatsApp contact';


    if (
      space.data()?.type === 'sme'
    ) {
      await assertBasicSmeCapacityInTransaction(
        transaction,
        String(
          space.data()?.ownerId || '',
        ),
        spaceId,
        'members',
      );
    }

    transaction.create(invitationRef, {
      displayId: displayId('INV'),
      spaceId,
      spaceName: space.data()?.name || 'Shared Space',
      spaceType: space.data()?.type || 'custom',
      email,
      role,
      canUseAccounts,
      canViewBalances,
      canViewLedger,
      posRole,
      token,
      status: 'pending',
      invitedBy: uid,
      invitedByName: manager.displayName || request.auth?.token.email || 'Space owner',
      acceptedBy: null,
      declinedBy: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: manager.displayName,
      action: 'member_invited',
      targetType: 'invitation',
      targetId: invitationRef.id,
      summary: posRole ? `Invited ${inviteTarget} with POS ${posRole} access.` : `Invited ${inviteTarget} as ${role}.`,
      now,
    });

    if (invitedUserUid) createNotification(transaction, {
      uid: invitedUserUid,
      spaceId,
      type: 'invitation_received',
      title: 'You have a Space invitation',
      message: `${manager.displayName || 'A Space owner'} invited you to ${space.data()?.name || 'a shared Space'}.`,
      targetPath: '/spaces',
      actionLabel: 'View invitation',
      now,
    });

    transaction.create(commandRef, {
      uid,
      kind: 'create_space_invitation',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const revokeSpaceInvitation = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const invitationId = stringValue(request.data?.invitationId, 'Invitation ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const invitationRef = db.collection('spaceInvitations').doc(invitationId);
  const invitation = await invitationRef.get();
  if (!invitation.exists) throw new HttpsError('not-found', 'Invitation not found.');
  const spaceId = String(invitation.data()?.spaceId || '');
  const manager = await requireSpaceManager(spaceId, uid);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;
    const now = FieldValue.serverTimestamp();
    const result = { invitationId, revoked: true };
    transaction.update(invitationRef, { status: 'revoked', updatedAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'invitation_revoked', targetType: 'invitation', targetId: invitationId, summary: `Revoked the invitation for ${invitation.data()?.email || 'a member'}.`, now });
    transaction.create(commandRef, { uid, kind: 'revoke_space_invitation', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const declineSpaceInvitation = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const invitationId = stringValue(request.data?.invitationId, 'Invitation ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const authEmail = typeof request.auth?.token.email === 'string' ? request.auth.token.email.toLowerCase() : '';
  if (!authEmail) throw new HttpsError('failed-precondition', 'Your account does not have a verified email address.');
  const invitationRef = db.collection('spaceInvitations').doc(invitationId);
  const invitationSnapshot = await invitationRef.get();
  if (!invitationSnapshot.exists) throw new HttpsError('not-found', 'Invitation not found.');
  const invitation = invitationSnapshot.data() || {};
  if (String(invitation.email || '').toLowerCase() !== authEmail) throw new HttpsError('permission-denied', 'This invitation belongs to another email address.');
  if (invitation.status !== 'pending') throw new HttpsError('failed-precondition', 'This invitation is no longer waiting for an answer.');
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;
    const now = FieldValue.serverTimestamp();
    const result = { invitationId, declined: true };
    transaction.update(invitationRef, { status: 'declined', declinedBy: uid, updatedAt: now });
    createActivity(transaction, {
      spaceId: String(invitation.spaceId || ''), actorUid: uid, actorName: request.auth?.token.name || authEmail,
      action: 'invitation_declined', targetType: 'invitation', targetId: invitationId,
      summary: `${request.auth?.token.name || authEmail} declined the invitation.`, now,
    });
    if (invitation.invitedBy) createNotification(transaction, {
      uid: String(invitation.invitedBy), spaceId: String(invitation.spaceId || ''), type: 'invitation_declined',
      title: 'Invitation declined', message: `${request.auth?.token.name || authEmail} declined the invitation to ${invitation.spaceName || 'your Space'}.`,
      targetPath: `/spaces/${String(invitation.spaceId || '')}?tab=members`, actionLabel: 'Open members', now,
    });
    transaction.create(commandRef, { uid, kind: 'decline_space_invitation', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const acceptSpaceInvitation = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const token = stringValue(request.data?.token, 'Invitation token', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const authEmail = typeof request.auth?.token.email === 'string' ? request.auth.token.email.toLowerCase() : '';

  const invitationQuery = await db.collection('spaceInvitations').where('token', '==', token).limit(1).get();
  if (invitationQuery.empty) throw new HttpsError('not-found', 'Invitation not found.');

  const invitationRef = invitationQuery.docs[0].ref;
  const initialInvitation = invitationQuery.docs[0].data();
  const spaceId = String(initialInvitation.spaceId || '');
  if (!spaceId) throw new HttpsError('failed-precondition', 'This invitation is incomplete. Ask the Space owner for a new link.');

  const entitlementSpace =
    await db.collection('spaces')
      .doc(spaceId)
      .get();

  if (
    entitlementSpace.exists
    && entitlementSpace.data()?.type === 'sme'
  ) {
    await assertBasicSmeAdditionalMemberCapacity(
      String(
        entitlementSpace.data()?.ownerId || '',
      ),
      spaceId,
      invitationRef.id,
    );
  }
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  const profileRef = db.collection('users').doc(uid);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const [command, invitationSnapshot, member, profile, space] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(invitationRef),
      transaction.get(memberRef),
      transaction.get(profileRef),
      transaction.get(spaceRef),
    ]);

    if (command.exists) return command.data()?.result;
    if (!invitationSnapshot.exists) throw new HttpsError('not-found', 'Invitation not found.');

    const invitation = invitationSnapshot.data() || {};
    if (String(invitation.spaceId || '') !== spaceId) throw new HttpsError('failed-precondition', 'This invitation is no longer valid.');
    if (invitation.status !== 'pending') throw new HttpsError('failed-precondition', 'This invitation is no longer active.');
    if (invitation.expiresAt?.toDate?.().getTime() < Date.now()) throw new HttpsError('deadline-exceeded', 'This invitation has expired. Ask the Space owner for a new link.');

    const invitationEmail = typeof invitation.email === 'string' ? invitation.email.trim().toLowerCase() : '';
    if (invitationEmail) {
      if (!authEmail) throw new HttpsError('failed-precondition', 'This invitation is locked to an email address. Sign in with that email to continue.');
      if (invitationEmail !== authEmail) throw new HttpsError('permission-denied', 'Sign in using the email address assigned to this invitation.');
    }

    if (!space.exists || space.data()?.archivedAt) throw new HttpsError('failed-precondition', 'This Space is unavailable.');

    const posRole = typeof invitation.posRole === 'string' && smePosRoles.includes(invitation.posRole as (typeof smePosRoles)[number])
      ? invitation.posRole as (typeof smePosRoles)[number]
      : null;
    const posSettingsRef = posRole ? db.collection('smePosSettings').doc(spaceId) : null;
    const posAccessRef = posRole ? db.collection('smePosAccess').doc(`${spaceId}_${uid}`) : null;
    const posSettings = posSettingsRef ? await transaction.get(posSettingsRef) : null;

    if (posRole && (!posSettings?.exists || space.data()?.type !== 'sme')) throw new HttpsError('failed-precondition', 'The POS team invitation is no longer available. Ask the owner for a new invitation.');
    if (posRole === 'seller' && posSettings?.data()?.mode !== 'marketplace_consignment') throw new HttpsError('failed-precondition', 'Seller access is no longer available. Ask the owner for a new invitation.');

    const now = FieldValue.serverTimestamp();
    const memberEmail = authEmail || (typeof profile.data()?.email === 'string' ? String(profile.data()?.email).toLowerCase() : '');
    const memberName = profile.data()?.fullName || memberEmail || 'BajetBN member';
    const result = { spaceId, memberId: memberRef.id, posRole };


    if (
      entitlementSpace.exists
      && entitlementSpace.data()?.type === 'sme'
    ) {
      await assertBasicSmeCapacityInTransaction(
        transaction,
        String(
          entitlementSpace.data()?.ownerId || '',
        ),
        spaceId,
        'members',
        invitationRef.id,
      );
    }

    transaction.set(memberRef, {
      spaceId,
      uid,
      role: invitation.role as CollaborationRole,
      status: 'active',
      displayName: memberName,
      email: memberEmail,
      canUseAccounts: invitation.canUseAccounts === true,
      canViewBalances: invitation.canViewBalances === true,
      canViewLedger: invitation.canViewLedger === true,
      invitedBy: invitation.invitedBy,
      joinedAt: now,
      updatedAt: now,
    }, { merge: true });

    transaction.update(invitationRef, {
      status: 'accepted',
      acceptedBy: uid,
      updatedAt: now,
    });

    if (posRole && posAccessRef) transaction.set(posAccessRef, {
      spaceId,
      uid,
      role: posRole,
      status: 'active',
      displayName: memberName,
      email: memberEmail,
      createdBy: invitation.invitedBy,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: memberName,
      action: member.exists ? 'member_reactivated' : 'member_joined',
      targetType: 'member',
      targetId: uid,
      summary: `${memberName} joined ${space.data()?.name || 'the Space'}.`,
      now,
    });

    if (posRole) createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: memberName,
      action: 'pos_access_added',
      targetType: 'member',
      targetId: uid,
      summary: `${memberName} joined the POS team as ${posRole}.`,
      now,
    });

    createNotification(transaction, {
      uid: String(invitation.invitedBy),
      spaceId,
      type: 'member_joined',
      title: 'A member joined your Space',
      message: `${memberName} accepted the invitation to ${space.data()?.name || 'your Space'}.`,
      targetPath: `/spaces/${spaceId}?tab=members`,
      actionLabel: 'Open members',
      now,
    });

    createNotification(transaction, {
      uid,
      spaceId,
      type: 'space_joined',
      title: 'Space joined',
      message: `You joined ${space.data()?.name || 'the shared Space'}.`,
      targetPath: `/spaces/${spaceId}`,
      actionLabel: 'Open Space',
      now,
    });

    transaction.create(commandRef, {
      uid,
      kind: 'accept_space_invitation',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const updateSpaceMember = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const memberUid = stringValue(request.data?.memberUid, 'Member ID', 128);
  const role = oneOf(request.data?.role, collaborationRoles, 'member role');
  const status = oneOf(request.data?.status, ['active', 'suspended'] as const, 'member status');
  const manager = await requireSpaceManager(spaceId, uid);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${memberUid}`);
  const member = await memberRef.get();
  if (!member.exists) throw new HttpsError('not-found', 'Member not found.');
  if (member.data()?.role === 'owner') throw new HttpsError('failed-precondition', 'The Space owner cannot be changed here.');
  const now = FieldValue.serverTimestamp();
  await db.runTransaction(async (transaction) => {
    transaction.update(memberRef, {
      role, status, canUseAccounts: request.data?.canUseAccounts === true,
      canViewBalances: request.data?.canViewBalances === true, canViewLedger: request.data?.canViewLedger === true,
      updatedAt: now,
    });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'member_updated', targetType: 'member', targetId: memberUid, summary: `Updated ${member.data()?.displayName || member.data()?.email || 'a member'} to ${role} (${status}).`, now });
    createNotification(transaction, { uid: memberUid, spaceId, type: 'access_updated', title: 'Your Space access changed', message: `Your role is now ${role} and your status is ${status}.`, now });
  });
  return { spaceId, memberUid };
});

export const removeSpaceMember = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const memberUid = stringValue(request.data?.memberUid, 'Member ID', 128);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const manager = await requireSpaceManager(spaceId, uid);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${memberUid}`);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, member] = await Promise.all([transaction.get(commandRef), transaction.get(memberRef)]);
    if (command.exists) return command.data()?.result;
    if (!member.exists) throw new HttpsError('not-found', 'Member not found.');
    if (member.data()?.role === 'owner') throw new HttpsError('failed-precondition', 'The Space owner cannot be removed.');
    const now = FieldValue.serverTimestamp();
    const result = { spaceId, memberUid, removed: true };
    transaction.update(memberRef, { status: 'removed', updatedAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'member_removed', targetType: 'member', targetId: memberUid, summary: `Removed ${member.data()?.displayName || member.data()?.email || 'a member'} while preserving their financial history.`, now });
    createNotification(transaction, { uid: memberUid, spaceId, type: 'member_removed', title: 'Space access removed', message: 'Your access to a shared Space has been removed. Existing history is preserved.', now });
    transaction.create(commandRef, { uid, kind: 'remove_space_member', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const transferSpaceOwnership = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const newOwnerUid = stringValue(request.data?.newOwnerUid, 'New owner ID', 128);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  if (newOwnerUid === uid) throw new HttpsError('invalid-argument', 'Choose another active member.');

  const spaceRef = db.collection('spaces').doc(spaceId);
  const currentOwnerRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  const newOwnerRef = db.collection('spaceMembers').doc(`${spaceId}_${newOwnerUid}`);
  const posSettingsRef = db.collection('smePosSettings').doc(spaceId);
  const currentOwnerPosAccessRef = db.collection('smePosAccess').doc(`${spaceId}_${uid}`);
  const newOwnerPosAccessRef = db.collection('smePosAccess').doc(`${spaceId}_${newOwnerUid}`);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const [command, space, currentOwner, newOwner, posSettings] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(spaceRef),
      transaction.get(currentOwnerRef),
      transaction.get(newOwnerRef),
      transaction.get(posSettingsRef),
    ]);
    if (command.exists) return command.data()?.result;
    if (!space.exists) throw new HttpsError('not-found', 'Space not found.');
    const spaceData = space.data() || {};
    if (spaceData.type === 'personal') throw new HttpsError('failed-precondition', 'Your Personal Space cannot be transferred.');
    if (spaceData.ownerId !== uid || currentOwner.data()?.role !== 'owner') {
      throw new HttpsError('permission-denied', 'Only the current Space owner can transfer ownership.');
    }
    if (!newOwner.exists || ['suspended', 'removed'].includes(String(newOwner.data()?.status || ''))) {
      throw new HttpsError('failed-precondition', 'Choose an active member as the new owner.');
    }

    const now = FieldValue.serverTimestamp();
    const newOwnerName = String(newOwner.data()?.displayName || newOwner.data()?.email || 'the new owner');
    const result = { spaceId, previousOwnerUid: uid, newOwnerUid, transferred: true };
    transaction.update(spaceRef, { ownerId: newOwnerUid, updatedAt: now });
    transaction.update(currentOwnerRef, {
      role: 'admin',
      canUseAccounts: true,
      canViewBalances: true,
      canViewLedger: true,
      updatedAt: now,
    });
    transaction.update(newOwnerRef, {
      role: 'owner',
      status: 'active',
      canUseAccounts: true,
      canViewBalances: true,
      canViewLedger: true,
      updatedAt: now,
    });
    if (posSettings.exists) {
      transaction.update(posSettingsRef, { ownerId: newOwnerUid, updatedAt: now });
      transaction.set(currentOwnerPosAccessRef, {
        spaceId,
        uid,
        role: 'manager',
        status: 'active',
        displayName: currentOwner.data()?.displayName || '',
        email: currentOwner.data()?.email || '',
        createdBy: uid,
        updatedAt: now,
      }, { merge: true });
      transaction.set(newOwnerPosAccessRef, {
        spaceId,
        uid: newOwnerUid,
        role: 'owner',
        status: 'active',
        displayName: newOwner.data()?.displayName || '',
        email: newOwner.data()?.email || '',
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: currentOwner.data()?.displayName || currentOwner.data()?.email,
      action: 'ownership_transferred',
      targetType: 'member',
      targetId: newOwnerUid,
      summary: `Transferred Space ownership to ${newOwnerName}.`,
      now,
    });
    createNotification(transaction, {
      uid: newOwnerUid,
      spaceId,
      type: 'ownership_transferred',
      title: 'You are now the Space owner',
      message: `Ownership of ${String(spaceData.name || 'a shared Space')} was transferred to you.`,
      targetPath: `/spaces/${spaceId}?tab=settings`,
      actionLabel: 'Open Space',
      now,
    });
    transaction.create(commandRef, { uid, kind: 'transfer_space_ownership', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

// v0.7 Alpha 2 shared-bill settlement and reversal
const sharedSettlementModes = ['account', 'external'] as const;

function safeMinor(value: unknown, field: string): number {
  const result = value == null ? 0 : Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new HttpsError('failed-precondition', `${field} is invalid.`);
  return result;
}

function sharedCycleTarget(commitment: DocumentData): number {
  const scheduled = positiveMoney(commitment.amountMinor);
  if (commitment.type !== 'instalment') return scheduled;
  const total = positiveMoney(commitment.totalAmountMinor);
  const paid = safeMinor(commitment.amountPaidMinor, 'Commitment paid amount');
  return Math.min(scheduled, Math.max(0, total - paid));
}

function sharedCommitmentProjection(commitment: DocumentData, assignment: DocumentData, amountMinor: number) {
  const previousAmountPaidMinor = safeMinor(commitment.amountPaidMinor, 'Commitment paid amount');
  const previousNextDueDate = commitment.nextDueDate ?? commitment.startDate ?? assignment.dueDate ?? null;
  const previousStatus = commitment.status === 'completed' ? 'completed' : 'active';
  const previousSharedCycleDueDate = commitment.sharedCycleDueDate ?? previousNextDueDate;
  const previousSharedAssignedMinor = safeMinor(commitment.sharedAssignedMinor, 'Shared assigned amount');
  const previousSharedSettledMinor = safeMinor(commitment.sharedSettledMinor, 'Shared settled amount');
  const assignmentDueDate = String(assignment.dueDate || previousNextDueDate || '');

  if (previousSharedCycleDueDate && previousSharedCycleDueDate !== assignmentDueDate && previousSharedAssignedMinor > previousSharedSettledMinor) {
    throw new HttpsError('failed-precondition', 'Another shared billing cycle is still open for this commitment.');
  }

  const sameCycle = !previousSharedCycleDueDate || previousSharedCycleDueDate === assignmentDueDate;
  const baseAssignedMinor = sameCycle
    ? Math.max(previousSharedAssignedMinor, safeMinor(assignment.assignedMinor, 'Assigned amount'))
    : safeMinor(assignment.assignedMinor, 'Assigned amount');
  const baseSettledMinor = sameCycle ? previousSharedSettledMinor : 0;
  const cycleTargetMinor = sharedCycleTarget(commitment);
  const remainingCommitmentMinor = commitment.type === 'instalment'
    ? Math.max(0, positiveMoney(commitment.totalAmountMinor) - previousAmountPaidMinor)
    : Number.MAX_SAFE_INTEGER;

  if (amountMinor > remainingCommitmentMinor) throw new HttpsError('invalid-argument', 'Payment exceeds the remaining instalment balance.');
  const nextAmountPaidMinor = previousAmountPaidMinor + amountMinor;
  const nextCycleSettledMinor = baseSettledMinor + amountMinor;
  const cycleComplete = cycleTargetMinor > 0 && nextCycleSettledMinor >= cycleTargetMinor;

  let nextStatus: 'active' | 'completed' = 'active';
  let nextDueDate: string | null = String(previousNextDueDate || assignmentDueDate || '') || null;
  let nextSharedCycleDueDate: string | null = assignmentDueDate || nextDueDate;
  let nextSharedAssignedMinor = baseAssignedMinor;
  let nextSharedSettledMinor = nextCycleSettledMinor;

  if (cycleComplete) {
    if (commitment.type === 'instalment' && nextAmountPaidMinor >= positiveMoney(commitment.totalAmountMinor)) {
      nextStatus = 'completed';
      nextDueDate = null;
    } else if (commitment.type === 'bill' && commitment.frequency === 'once') {
      nextStatus = 'completed';
      nextDueDate = null;
    } else {
      nextDueDate = addFrequency(assignmentDueDate, oneOf(commitment.frequency, commitmentFrequencies, 'frequency'));
      if (nextDueDate && commitment.endDate && nextDueDate > commitment.endDate) {
        nextStatus = 'completed';
        nextDueDate = null;
      }
    }
    nextSharedCycleDueDate = nextDueDate;
    nextSharedAssignedMinor = 0;
    nextSharedSettledMinor = 0;
  }

  return {
    previousAmountPaidMinor,
    previousNextDueDate,
    previousStatus,
    previousSharedCycleDueDate,
    previousSharedAssignedMinor,
    previousSharedSettledMinor,
    nextAmountPaidMinor,
    nextNextDueDate: nextDueDate,
    nextStatus,
    nextSharedCycleDueDate,
    nextSharedAssignedMinor,
    nextSharedSettledMinor,
  };
}

function sharedPaymentNote(input: {
  commitmentName: string;
  memberLabel: string;
  paymentDisplayId: string;
  assignmentDisplayId: string;
  userNote?: string;
}): string {
  const base = `Shared bill payment â€” ${input.commitmentName} â€” paid by ${input.memberLabel} â€” claim ${input.paymentDisplayId} â€” assignment ${input.assignmentDisplayId}`;
  return input.userNote ? `${base}. ${input.userNote}` : base;
}

function writeFinalizedSharedPayment(transaction: Transaction, input: {
  actorUid: string;
  actorName?: string;
  idempotencyKey: string;
  assignmentRef: DocumentReference;
  assignment: DocumentData;
  paymentRef: DocumentReference;
  payment: DocumentData;
  paymentIsNew: boolean;
  commitmentRef: DocumentReference;
  commitment: DocumentData;
  commitmentPaymentRef: DocumentReference;
  accountRef: DocumentReference | null;
  account: AccountRecord | null;
  budgetSnapshots: Array<{ id: string; ref: DocumentReference; data: () => DocumentData | undefined }>;
  now: FieldValue;
}) {
  const amountMinor = positiveMoney(input.payment.amountMinor);
  const assignedMinor = positiveMoney(input.assignment.assignedMinor);
  const settledBefore = safeMinor(input.assignment.settledMinor, 'Assignment settled amount');
  const outstandingBefore = Math.max(0, assignedMinor - settledBefore);
  if (amountMinor > outstandingBefore) throw new HttpsError('invalid-argument', 'Payment exceeds the assignment outstanding amount.');

  const projection = sharedCommitmentProjection(input.commitment, input.assignment, amountMinor);
  const settlementMode = oneOf(input.payment.settlementMode, sharedSettlementModes, 'settlement mode');
  const memberUid = stringValue(input.payment.memberUid, 'Member ID', 128);
  const memberLabel = String(input.payment.memberName || input.payment.memberEmail || memberUid);
  const paymentDisplayId = String(input.payment.displayId || displayId('SHP'));
  const assignmentDisplayId = String(input.assignment.displayId || input.assignmentRef.id);
  const paymentDate = localDate(input.payment.paymentDate, 'Payment date');
  const transactionRef = settlementMode === 'account' ? db.collection('transactions').doc() : null;
  let ledgerEntryId: string | null = null;
  let budgetIds: string[] = [];

  if (settlementMode === 'account') {
    if (!input.accountRef || !input.account) throw new HttpsError('failed-precondition', 'The selected payment account is unavailable.');
    if (input.account.ownerId !== memberUid) throw new HttpsError('permission-denied', 'The payment account must belong to the assigned member.');
    if (input.account.currency !== input.assignment.currency) throw new HttpsError('failed-precondition', 'Account and shared bill currencies must match.');
    const delta = accountEffect(input.account.type, 'out', amountMinor);
    updateAccountBalance(transaction, input.accountRef, input.account, delta);
    ledgerEntryId = createLedgerEntry(transaction, {
      accountId: input.accountRef.id,
      ownerId: memberUid,
      spaceId: String(input.assignment.spaceId),
      transactionId: transactionRef!.id,
      entryType: 'shared_bill_payment',
      amountMinor: delta,
      currency: input.account.currency,
      idempotencyKey: input.idempotencyKey,
      now: input.now,
    });
    budgetIds = matchingBudgetIds(input.budgetSnapshots, {
      spaceId: String(input.assignment.spaceId),
      categoryId: String(input.commitment.categoryId),
      transactionDate: paymentDate,
    });
    if (budgetIds.length) updateBudgetsSpent(transaction, input.budgetSnapshots, budgetIds, amountMinor);
    transaction.create(transactionRef!, {
      displayId: displayId('TXN'),
      ownerId: memberUid,
      createdBy: memberUid,
      approvedBy: input.actorUid,
      type: 'expense',
      status: 'posted',
      spaceId: input.assignment.spaceId,
      accountId: input.accountRef.id,
      destinationAccountId: null,
      amountMinor,
      currency: input.account.currency,
      category: input.commitment.categoryName,
      categoryId: input.commitment.categoryId,
      categoryIcon: input.commitment.categoryIcon,
      categoryColor: input.commitment.categoryColor,
      categoryScope: 'both',
      categoryIsSystem: !String(input.commitment.categoryId).startsWith('custom-'),
      counterparty: input.commitment.payee || input.commitment.name,
      paymentMethod: input.payment.paymentMethod || null,
      paymentMethodLabel: input.payment.paymentMethodLabel || null,
      note: sharedPaymentNote({
        commitmentName: String(input.assignment.commitmentName || input.commitment.name || 'Shared bill'),
        memberLabel,
        paymentDisplayId,
        assignmentDisplayId,
        userNote: optionalString(input.payment.note, 500),
      }),
      transactionDate: paymentDate,
      reversalOf: null,
      reversedBy: null,
      budgetIds,
      commitmentId: input.assignment.commitmentId,
      commitmentPaymentId: input.commitmentPaymentRef.id,
      sharedBillAssignmentId: input.assignmentRef.id,
      sharedBillPaymentId: input.paymentRef.id,
      paymentProofPath: input.payment.proofPath || null,
      createdAt: input.now,
      postedAt: input.now,
      updatedAt: input.now,
    });
  }

  const settledAfter = settledBefore + amountMinor;
  const outstandingAfter = Math.max(0, assignedMinor - settledAfter);
  const assignmentStatus = outstandingAfter === 0 ? 'paid' : 'partially_paid';
  const transactionId = transactionRef?.id || null;

  transaction.create(input.commitmentPaymentRef, {
    displayId: displayId('PAY'),
    ownerId: input.commitment.ownerId,
    commitmentId: input.assignment.commitmentId,
    transactionId,
    amountMinor,
    currency: input.assignment.currency,
    paymentDate,
    dueDateApplied: input.assignment.dueDate,
    previousNextDueDate: projection.previousNextDueDate,
    previousStatus: projection.previousStatus,
    source: 'shared_bill',
    sharedBillAssignmentId: input.assignmentRef.id,
    sharedBillPaymentId: input.paymentRef.id,
    paidByUid: memberUid,
    status: 'posted',
    reversedBy: null,
    createdAt: input.now,
    updatedAt: input.now,
  });

  const paymentUpdate = {
    displayId: paymentDisplayId,
    assignmentId: input.assignmentRef.id,
    spaceId: input.assignment.spaceId,
    commitmentId: input.assignment.commitmentId,
    commitmentPaymentId: input.commitmentPaymentRef.id,
    memberUid,
    memberName: input.payment.memberName || input.assignment.memberName || '',
    memberEmail: input.payment.memberEmail || input.assignment.memberEmail || '',
    amountMinor,
    currency: input.assignment.currency,
    settlementMode,
    accountId: input.accountRef?.id || null,
    paymentDate,
    proofPath: input.payment.proofPath || null,
    proofName: input.payment.proofName || null,
    note: optionalString(input.payment.note, 500),
    status: 'posted',
    transactionId,
    ledgerEntryId,
    reviewedAt: input.now,
    reviewedBy: input.actorUid,
    postedAt: input.now,
    reversedAt: null,
    reversedBy: null,
    reversalTransactionId: null,
    previousCommitmentAmountPaidMinor: projection.previousAmountPaidMinor,
    previousNextDueDate: projection.previousNextDueDate,
    previousCommitmentStatus: projection.previousStatus,
    previousSharedCycleDueDate: projection.previousSharedCycleDueDate,
    previousSharedAssignedMinor: projection.previousSharedAssignedMinor,
    previousSharedSettledMinor: projection.previousSharedSettledMinor,
    previousAssignmentLastPaymentId: input.assignment.lastPaymentId || null,
    postCommitmentAmountPaidMinor: projection.nextAmountPaidMinor,
    postNextDueDate: projection.nextNextDueDate,
    postCommitmentStatus: projection.nextStatus,
    postSharedCycleDueDate: projection.nextSharedCycleDueDate,
    postSharedAssignedMinor: projection.nextSharedAssignedMinor,
    postSharedSettledMinor: projection.nextSharedSettledMinor,
    updatedAt: input.now,
  };
  if (input.paymentIsNew) transaction.create(input.paymentRef, { ...paymentUpdate, createdAt: input.now });
  else transaction.update(input.paymentRef, paymentUpdate);

  transaction.update(input.assignmentRef, {
    settledMinor: settledAfter,
    outstandingMinor: outstandingAfter,
    status: assignmentStatus,
    proofPath: input.payment.proofPath || input.assignment.proofPath || null,
    proofName: input.payment.proofName || input.assignment.proofName || null,
    currentPaymentId: null,
    lastPaymentId: input.paymentRef.id,
    reviewedAt: input.now,
    reviewedBy: input.actorUid,
    closedAt: outstandingAfter === 0 ? input.now : null,
    updatedAt: input.now,
  });
  transaction.update(input.commitmentRef, {
    amountPaidMinor: projection.nextAmountPaidMinor,
    nextDueDate: projection.nextNextDueDate,
    status: projection.nextStatus,
    sharedCycleDueDate: projection.nextSharedCycleDueDate,
    sharedAssignedMinor: projection.nextSharedAssignedMinor,
    sharedSettledMinor: projection.nextSharedSettledMinor,
    updatedAt: input.now,
  });
  createActivity(transaction, {
    spaceId: String(input.assignment.spaceId),
    actorUid: input.actorUid,
    actorName: input.actorName,
    action: outstandingAfter === 0 ? 'shared_bill_paid' : 'shared_bill_partially_paid',
    targetType: 'shared_bill_payment',
    targetId: input.paymentRef.id,
    summary: `${memberLabel} paid ${amountMinor / 100} ${input.assignment.currency} for ${input.assignment.commitmentName || 'a shared bill'}${settlementMode === 'external' ? ' outside BajetBN' : ' from a BajetBN Account'}.`,
    now: input.now,
  });
  if (input.actorUid !== memberUid) {
    createNotification(transaction, {
      uid: memberUid,
      spaceId: String(input.assignment.spaceId),
      type: 'payment_confirmed',
      title: 'Shared bill payment confirmed',
      message: `${input.assignment.commitmentName || 'Your shared bill'} now has ${outstandingAfter / 100} ${input.assignment.currency} outstanding.`,
      now: input.now,
    });
  }

  return {
    assignmentId: input.assignmentRef.id,
    paymentId: input.paymentRef.id,
    commitmentPaymentId: input.commitmentPaymentRef.id,
    status: assignmentStatus,
    transactionId,
    ledgerEntryId,
    outstandingMinor: outstandingAfter,
  };
}

export const createSharedBillAssignment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const commitmentId = stringValue(request.data?.commitmentId, 'Commitment ID', 80);
  const memberUid = stringValue(request.data?.memberUid, 'Member ID', 128);
  const assignedMinor = positiveMoney(request.data?.assignedMinor);
  const dueDate = localDate(request.data?.dueDate, 'Due date');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const manager = await requireSpaceManager(spaceId, uid);
  const commitmentRef = db.collection('commitments').doc(commitmentId);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${memberUid}`);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const assignmentRef = db.collection('sharedBillAssignments').doc();

  return db.runTransaction(async (transaction) => {
    const [command, commitmentSnapshot, member] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(commitmentRef),
      transaction.get(memberRef),
    ]);
    if (command.exists) return command.data()?.result;
    if (!commitmentSnapshot.exists || commitmentSnapshot.data()?.spaceId !== spaceId || commitmentSnapshot.data()?.archivedAt || commitmentSnapshot.data()?.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Choose an active bill from this Space.');
    }
    if (!member.exists || member.data()?.status === 'suspended' || member.data()?.status === 'removed') {
      throw new HttpsError('failed-precondition', 'Choose an active Space member.');
    }
    const commitment = commitmentSnapshot.data() || {};
    const expectedDueDate = String(commitment.nextDueDate || commitment.startDate || '');
    if (expectedDueDate && dueDate !== expectedDueDate) throw new HttpsError('failed-precondition', `Assign the current cycle due on ${expectedDueDate}.`);
    const cycleDueDate = String(commitment.sharedCycleDueDate || expectedDueDate || dueDate);
    const currentAssigned = cycleDueDate === dueDate ? safeMinor(commitment.sharedAssignedMinor, 'Shared assigned amount') : 0;
    const currentSettled = cycleDueDate === dueDate ? safeMinor(commitment.sharedSettledMinor, 'Shared settled amount') : 0;
    if (cycleDueDate !== dueDate && currentAssigned > currentSettled) throw new HttpsError('failed-precondition', 'Finish the current shared billing cycle before assigning another cycle.');
    const cycleTarget = sharedCycleTarget(commitment);
    if (currentAssigned + assignedMinor > cycleTarget) throw new HttpsError('invalid-argument', 'Assigned member shares cannot exceed the amount due for this cycle.');

    const now = FieldValue.serverTimestamp();
    const result = { assignmentId: assignmentRef.id };
    transaction.create(assignmentRef, {
      displayId: displayId('SHR'),
      spaceId,
      commitmentId,
      commitmentName: commitment.name,
      memberUid,
      memberName: member.data()?.displayName || '',
      memberEmail: member.data()?.email || '',
      assignedMinor,
      settledMinor: 0,
      outstandingMinor: assignedMinor,
      currency: commitment.currency,
      dueDate,
      status: 'unpaid',
      note,
      proofPath: null,
      proofName: null,
      currentPaymentId: null,
      lastPaymentId: null,
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      closedAt: null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    });
    transaction.update(commitmentRef, {
      sharedCycleDueDate: dueDate,
      sharedAssignedMinor: currentAssigned + assignedMinor,
      sharedSettledMinor: currentSettled,
      updatedAt: now,
    });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: manager.displayName,
      action: 'bill_assigned',
      targetType: 'shared_bill',
      targetId: assignmentRef.id,
      summary: `Assigned ${commitment.name || 'a bill'} to ${member.data()?.displayName || member.data()?.email || 'a member'}.`,
      now,
    });
    createNotification(transaction, {
      uid: memberUid,
      spaceId,
      type: 'bill_assigned',
      title: 'A bill was assigned to you',
      message: `${commitment.name || 'A bill'} is due on ${dueDate}.`,
      now,
    });
    transaction.create(commandRef, { uid, kind: 'create_shared_bill_assignment', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const createSharedBillAssignments = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const commitmentId = stringValue(request.data?.commitmentId, 'Commitment ID', 80);
  const dueDate = localDate(request.data?.dueDate, 'Due date');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const rawAssignments = request.data?.assignments;
  if (!Array.isArray(rawAssignments) || rawAssignments.length < 1 || rawAssignments.length > 30) {
    throw new HttpsError('invalid-argument', 'Choose between 1 and 30 members.');
  }
  const seen = new Set<string>();
  const assignments = rawAssignments.map((item: unknown) => {
    const row = (item || {}) as Record<string, unknown>;
    const memberUid = stringValue(row.memberUid, 'Member ID', 128);
    if (seen.has(memberUid)) throw new HttpsError('invalid-argument', 'Each member can be selected only once.');
    seen.add(memberUid);
    return { memberUid, assignedMinor: positiveMoney(row.assignedMinor) };
  });
  const totalAssignedMinor = assignments.reduce((sum, item) => sum + item.assignedMinor, 0);
  if (!Number.isSafeInteger(totalAssignedMinor)) throw new HttpsError('invalid-argument', 'The total amount is too large.');

  const manager = await requireSpaceManager(spaceId, uid);
  const existingAssignments = await db.collection('sharedBillAssignments').where('spaceId', '==', spaceId).get();
  const duplicateMembers = new Set(existingAssignments.docs.filter((item) => {
    const row = item.data();
    return row.commitmentId === commitmentId && row.dueDate === dueDate && row.status !== 'paid';
  }).map((item) => String(item.data().memberUid || '')));
  if (assignments.some((item) => duplicateMembers.has(item.memberUid))) throw new HttpsError('already-exists', 'One of the selected people already has a share for this bill.');
  const commitmentRef = db.collection('commitments').doc(commitmentId);
  const memberRefs = assignments.map((item) => db.collection('spaceMembers').doc(`${spaceId}_${item.memberUid}`));
  const assignmentRefs = assignments.map((item) => db.collection('sharedBillAssignments').doc(`${commitmentId}_${dueDate}_${item.memberUid}`));
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all([
      transaction.get(commandRef),
      transaction.get(commitmentRef),
      ...memberRefs.map((ref) => transaction.get(ref)),
      ...assignmentRefs.map((ref) => transaction.get(ref)),
    ]);
    const command = snapshots[0];
    const commitmentSnapshot = snapshots[1];
    const memberSnapshots = snapshots.slice(2, 2 + memberRefs.length);
    const existingAssignmentSnapshots = snapshots.slice(2 + memberRefs.length);
    if (command.exists) return command.data()?.result;
    if (existingAssignmentSnapshots.some((item) => item.exists)) throw new HttpsError('already-exists', 'One of the selected people already has a share for this bill.');
    if (!commitmentSnapshot.exists || commitmentSnapshot.data()?.spaceId !== spaceId || commitmentSnapshot.data()?.archivedAt || commitmentSnapshot.data()?.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Choose an active bill from this Space.');
    }
    memberSnapshots.forEach((member, index) => {
      if (!member.exists || member.data()?.status === 'suspended' || member.data()?.status === 'removed') {
        throw new HttpsError('failed-precondition', `Member ${index + 1} is not active.`);
      }
    });
    const commitment = commitmentSnapshot.data() || {};
    const expectedDueDate = String(commitment.nextDueDate || commitment.startDate || '');
    if (expectedDueDate && dueDate !== expectedDueDate) throw new HttpsError('failed-precondition', `Assign the current cycle due on ${expectedDueDate}.`);
    const cycleDueDate = String(commitment.sharedCycleDueDate || expectedDueDate || dueDate);
    const currentAssigned = cycleDueDate === dueDate ? safeMinor(commitment.sharedAssignedMinor, 'Shared assigned amount') : 0;
    const currentSettled = cycleDueDate === dueDate ? safeMinor(commitment.sharedSettledMinor, 'Shared settled amount') : 0;
    if (cycleDueDate !== dueDate && currentAssigned > currentSettled) throw new HttpsError('failed-precondition', 'Finish the current shared billing cycle before assigning another cycle.');
    const cycleTarget = sharedCycleTarget(commitment);
    if (currentAssigned + totalAssignedMinor > cycleTarget) throw new HttpsError('invalid-argument', 'The selected shares are more than the amount due for this bill.');

    const now = FieldValue.serverTimestamp();
    assignmentRefs.forEach((assignmentRef, index) => {
      const assignment = assignments[index];
      const member = memberSnapshots[index].data() || {};
      transaction.create(assignmentRef, {
        displayId: displayId('SHR'), spaceId, commitmentId, commitmentName: commitment.name,
        memberUid: assignment.memberUid, memberName: member.displayName || '', memberEmail: member.email || '',
        assignedMinor: assignment.assignedMinor, settledMinor: 0, outstandingMinor: assignment.assignedMinor,
        currency: commitment.currency, dueDate, status: 'unpaid', note,
        proofPath: null, proofName: null, currentPaymentId: null, lastPaymentId: null,
        submittedAt: null, reviewedAt: null, reviewedBy: null, closedAt: null,
        createdBy: uid, createdAt: now, updatedAt: now,
      });
      createNotification(transaction, {
        uid: assignment.memberUid, spaceId, type: 'bill_assigned', title: 'A bill share was given to you',
        message: `${commitment.name || 'A bill'} is due on ${dueDate}. Your share is ${(assignment.assignedMinor / 100).toFixed(2)} ${commitment.currency || 'BND'}.`,
        targetPath: `/spaces/${spaceId}?tab=bills`, actionLabel: 'Open shared bill', now,
      });
    });
    transaction.update(commitmentRef, {
      sharedCycleDueDate: dueDate,
      sharedAssignedMinor: currentAssigned + totalAssignedMinor,
      sharedSettledMinor: currentSettled,
      updatedAt: now,
    });
    createActivity(transaction, {
      spaceId, actorUid: uid, actorName: manager.displayName, action: 'bill_assigned_to_members',
      targetType: 'shared_bill', targetId: assignmentRefs[0].id,
      summary: `Shared ${commitment.name || 'a bill'} with ${assignments.length} member${assignments.length === 1 ? '' : 's'}.`, now,
    });
    const result = { assignmentIds: assignmentRefs.map((ref) => ref.id) };
    transaction.create(commandRef, { uid, kind: 'create_shared_bill_assignments', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const submitSharedBillPayment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const assignmentId = stringValue(request.data?.assignmentId, 'Assignment ID', 80);
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const settlementMode = oneOf(request.data?.settlementMode, sharedSettlementModes, 'settlement mode');
  const accountId = optionalString(request.data?.accountId, 80) || null;
  const { paymentMethod, paymentMethodLabel } = paymentMethodValues(request.data || {});
  const paymentDate = localDate(request.data?.paymentDate, 'Payment date');
  const proofPathInput = optionalString(request.data?.proofPath, 500) || null;
  const proofNameInput = optionalString(request.data?.proofName, 180) || null;
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  if (settlementMode === 'account' && !accountId) throw new HttpsError('invalid-argument', 'Choose the Account used for this payment.');

  const assignmentRef = db.collection('sharedBillAssignments').doc(assignmentId);
  const assignmentPre = await assignmentRef.get();
  if (!assignmentPre.exists) throw new HttpsError('not-found', 'Shared bill not found.');
  const assignmentPreData = assignmentPre.data() || {};
  if (assignmentPreData.memberUid !== uid) throw new HttpsError('permission-denied', 'Only the assigned member can submit this payment.');
  await requireActiveSpaceMember(String(assignmentPreData.spaceId), uid);
  const budgetCandidateRefs = settlementMode === 'account'
    ? (await db.collection('budgets').where('ownerId', '==', uid).get()).docs.map((item) => item.ref)
    : [];

  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const commitmentRef = db.collection('commitments').doc(String(assignmentPreData.commitmentId));
  const spaceRef = db.collection('spaces').doc(String(assignmentPreData.spaceId));
  const memberRef = db.collection('spaceMembers').doc(`${assignmentPreData.spaceId}_${uid}`);
  const accountRef = accountId ? db.collection('accounts').doc(accountId) : null;
  const paymentRef = db.collection('sharedBillPayments').doc();
  const commitmentPaymentRef = db.collection('commitmentPayments').doc();

  return db.runTransaction(async (transaction) => {
    const [command, assignmentSnapshot, commitmentSnapshot, spaceSnapshot, memberSnapshot, accountSnapshot, budgetSnapshots] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(assignmentRef),
      transaction.get(commitmentRef),
      transaction.get(spaceRef),
      transaction.get(memberRef),
      accountRef ? transaction.get(accountRef) : Promise.resolve(null),
      Promise.all(budgetCandidateRefs.map((ref) => transaction.get(ref))),
    ]);
    if (command.exists) return command.data()?.result;
    if (!assignmentSnapshot.exists || !commitmentSnapshot.exists || !spaceSnapshot.exists) throw new HttpsError('not-found', 'Shared bill data is unavailable.');
    const assignment = assignmentSnapshot.data() || {};
    const commitment = commitmentSnapshot.data() || {};
    if (assignment.memberUid !== uid) throw new HttpsError('permission-denied', 'Only the assigned member can submit this payment.');
    if (!memberSnapshot.exists || ['suspended', 'removed'].includes(String(memberSnapshot.data()?.status || 'active'))) throw new HttpsError('permission-denied', 'Your Space access is not active.');
    if (!['unpaid', 'partially_paid', 'rejected', 'confirmed'].includes(String(assignment.status))) throw new HttpsError('failed-precondition', 'This assignment is not ready for another payment.');
    if (assignment.currentPaymentId) throw new HttpsError('failed-precondition', 'A payment claim is already awaiting review.');
    const settledMinor = safeMinor(assignment.settledMinor, 'Assignment settled amount');
    const outstandingMinor = Math.max(0, positiveMoney(assignment.assignedMinor) - settledMinor);
    if (amountMinor > outstandingMinor) throw new HttpsError('invalid-argument', 'Payment exceeds the assignment outstanding amount.');
    const proofPath = proofPathInput || assignment.proofPath || null;
    const proofName = proofNameInput || assignment.proofName || null;
    if (proofPath && !String(proofPath).startsWith(`spaces/${assignment.spaceId}/payment-proofs/${assignmentId}/`)) throw new HttpsError('invalid-argument', 'Invalid proof of payment path.');
    const account = accountSnapshot ? assertAccount(accountSnapshot.data(), uid, 'Account') : null;
    if (account && account.currency !== assignment.currency) throw new HttpsError('failed-precondition', 'Account and shared bill currencies must match.');

    const paymentDisplayId = displayId('SHP');
    const paymentData = {
      displayId: paymentDisplayId,
      assignmentId,
      spaceId: assignment.spaceId,
      commitmentId: assignment.commitmentId,
      commitmentPaymentId: null,
      memberUid: uid,
      memberName: assignment.memberName || memberSnapshot.data()?.displayName || '',
      memberEmail: assignment.memberEmail || memberSnapshot.data()?.email || '',
      amountMinor,
      currency: assignment.currency,
      settlementMode,
      accountId,
      paymentMethod,
      paymentMethodLabel,
      paymentDate,
      proofPath,
      proofName,
      note,
      status: 'submitted',
      transactionId: null,
      ledgerEntryId: null,
      reviewedAt: null,
      reviewedBy: null,
      postedAt: null,
      reversedAt: null,
      reversedBy: null,
      reversalTransactionId: null,
    };
    const now = FieldValue.serverTimestamp();
    const approvalRequired = spaceSnapshot.data()?.approvalMode === 'owner_approval';
    let result;
    if (approvalRequired) {
      result = { assignmentId, paymentId: paymentRef.id, status: 'submitted' };
      transaction.create(paymentRef, { ...paymentData, createdAt: now, updatedAt: now });
      transaction.update(assignmentRef, {
        status: 'submitted',
        currentPaymentId: paymentRef.id,
        proofPath,
        proofName,
        submittedAt: now,
        reviewedAt: null,
        reviewedBy: null,
        updatedAt: now,
      });
      createActivity(transaction, {
        spaceId: String(assignment.spaceId),
        actorUid: uid,
        actorName: assignment.memberName,
        action: 'payment_submitted',
        targetType: 'shared_bill_payment',
        targetId: paymentRef.id,
        summary: `${assignment.memberName || assignment.memberEmail || 'A member'} submitted ${amountMinor / 100} ${assignment.currency} for ${assignment.commitmentName || 'a shared bill'}.`,
        now,
      });
      createNotification(transaction, {
        uid: String(spaceSnapshot.data()?.ownerId),
        spaceId: String(assignment.spaceId),
        type: 'payment_submitted',
        title: 'Payment claim needs review',
        message: `${assignment.memberName || assignment.memberEmail || 'A member'} submitted payment for ${assignment.commitmentName || 'a shared bill'}.`,
        now,
      });
    } else {
      result = writeFinalizedSharedPayment(transaction, {
        actorUid: uid,
        actorName: assignment.memberName || assignment.memberEmail,
        idempotencyKey: key,
        assignmentRef,
        assignment,
        paymentRef,
        payment: paymentData,
        paymentIsNew: true,
        commitmentRef,
        commitment,
        commitmentPaymentRef,
        accountRef,
        account,
        budgetSnapshots,
        now,
      });
    }
    transaction.create(commandRef, { uid, kind: 'submit_shared_bill_payment', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const reviewSharedBillPayment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const paymentId = stringValue(request.data?.paymentId, 'Payment ID', 80);
  const decision = oneOf(request.data?.decision, ['confirmed', 'rejected'] as const, 'decision');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const paymentRef = db.collection('sharedBillPayments').doc(paymentId);
  const paymentPre = await paymentRef.get();
  if (!paymentPre.exists) throw new HttpsError('not-found', 'Payment claim not found.');
  const paymentPreData = paymentPre.data() || {};
  const manager = await requireSpaceManager(String(paymentPreData.spaceId), uid);
  const assignmentRef = db.collection('sharedBillAssignments').doc(String(paymentPreData.assignmentId));
  const commitmentRef = db.collection('commitments').doc(String(paymentPreData.commitmentId));
  const accountId = paymentPreData.settlementMode === 'account' ? String(paymentPreData.accountId || '') : '';
  const accountRef = accountId ? db.collection('accounts').doc(accountId) : null;
  const budgetCandidateRefs = decision === 'confirmed' && paymentPreData.settlementMode === 'account'
    ? (await db.collection('budgets').where('ownerId', '==', String(paymentPreData.memberUid)).get()).docs.map((item) => item.ref)
    : [];
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const commitmentPaymentRef = db.collection('commitmentPayments').doc();

  return db.runTransaction(async (transaction) => {
    const [command, paymentSnapshot, assignmentSnapshot, commitmentSnapshot, accountSnapshot, budgetSnapshots] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(paymentRef),
      transaction.get(assignmentRef),
      transaction.get(commitmentRef),
      accountRef ? transaction.get(accountRef) : Promise.resolve(null),
      Promise.all(budgetCandidateRefs.map((ref) => transaction.get(ref))),
    ]);
    if (command.exists) return command.data()?.result;
    if (!paymentSnapshot.exists || !assignmentSnapshot.exists || !commitmentSnapshot.exists) throw new HttpsError('not-found', 'Payment claim data is unavailable.');
    const payment = paymentSnapshot.data() || {};
    const assignment = assignmentSnapshot.data() || {};
    const commitment = commitmentSnapshot.data() || {};
    if (payment.status !== 'submitted' || assignment.currentPaymentId !== paymentId || assignment.status !== 'submitted') {
      throw new HttpsError('failed-precondition', 'Only the current submitted payment claim can be reviewed.');
    }
    const now = FieldValue.serverTimestamp();
    let result;
    if (decision === 'rejected') {
      const settledMinor = safeMinor(assignment.settledMinor, 'Assignment settled amount');
      const nextStatus = settledMinor > 0 ? 'partially_paid' : 'rejected';
      result = { assignmentId: assignmentRef.id, paymentId, status: nextStatus };
      transaction.update(paymentRef, { status: 'rejected', reviewNote: note, reviewedAt: now, reviewedBy: uid, updatedAt: now });
      transaction.update(assignmentRef, { status: nextStatus, currentPaymentId: null, reviewNote: note, reviewedAt: now, reviewedBy: uid, updatedAt: now });
      createActivity(transaction, {
        spaceId: String(assignment.spaceId),
        actorUid: uid,
        actorName: manager.displayName,
        action: 'payment_rejected',
        targetType: 'shared_bill_payment',
        targetId: paymentId,
        summary: `Rejected the payment claim for ${assignment.commitmentName || 'a shared bill'}.`,
        now,
      });
      createNotification(transaction, {
        uid: String(assignment.memberUid),
        spaceId: String(assignment.spaceId),
        type: 'payment_rejected',
        title: 'Payment rejected',
        message: `Your payment claim for ${assignment.commitmentName || 'a shared bill'} was rejected.`,
        now,
      });
    } else {
      const account = accountSnapshot ? assertAccount(accountSnapshot.data(), String(payment.memberUid), 'Account') : null;
      result = writeFinalizedSharedPayment(transaction, {
        actorUid: uid,
        actorName: manager.displayName,
        idempotencyKey: key,
        assignmentRef,
        assignment,
        paymentRef,
        payment,
        paymentIsNew: false,
        commitmentRef,
        commitment,
        commitmentPaymentRef,
        accountRef,
        account,
        budgetSnapshots,
        now,
      });
    }
    transaction.create(commandRef, { uid, kind: 'review_shared_bill_payment', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const reverseSharedBillPayment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const paymentId = stringValue(request.data?.paymentId, 'Payment ID', 80);
  const reversalDate = localDate(request.data?.reversalDate, 'Reversal date');
  const reason = optionalString(request.data?.reason, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const paymentRef = db.collection('sharedBillPayments').doc(paymentId);
  const paymentPre = await paymentRef.get();
  if (!paymentPre.exists) throw new HttpsError('not-found', 'Shared bill payment not found.');
  const paymentPreData = paymentPre.data() || {};
  const member = await requireActiveSpaceMember(String(paymentPreData.spaceId), uid);
  const canReverse = uid === paymentPreData.memberUid || member.role === 'owner' || member.role === 'admin';
  if (!canReverse) throw new HttpsError('permission-denied', 'Only the payer, Space owner, or admin can reverse this payment.');

  const assignmentRef = db.collection('sharedBillAssignments').doc(String(paymentPreData.assignmentId));
  const commitmentRef = db.collection('commitments').doc(String(paymentPreData.commitmentId));
  const commitmentPaymentRef = db.collection('commitmentPayments').doc(String(paymentPreData.commitmentPaymentId || 'missing'));
  const accountRef = paymentPreData.settlementMode === 'account' && paymentPreData.accountId
    ? db.collection('accounts').doc(String(paymentPreData.accountId))
    : null;
  const originalTransactionRef = paymentPreData.transactionId
    ? db.collection('transactions').doc(String(paymentPreData.transactionId))
    : null;
  const budgetCandidateRefs = paymentPreData.settlementMode === 'account'
    ? (await db.collection('budgets').where('ownerId', '==', String(paymentPreData.memberUid)).get()).docs.map((item) => item.ref)
    : [];
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const reversalAuditRef = db.collection('sharedBillPaymentReversals').doc();
  const reversalTransactionRef = originalTransactionRef ? db.collection('transactions').doc() : null;

  return db.runTransaction(async (transaction) => {
    const [command, paymentSnapshot, assignmentSnapshot, commitmentSnapshot, commitmentPaymentSnapshot, accountSnapshot, originalTransactionSnapshot, budgetSnapshots] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(paymentRef),
      transaction.get(assignmentRef),
      transaction.get(commitmentRef),
      transaction.get(commitmentPaymentRef),
      accountRef ? transaction.get(accountRef) : Promise.resolve(null),
      originalTransactionRef ? transaction.get(originalTransactionRef) : Promise.resolve(null),
      Promise.all(budgetCandidateRefs.map((ref) => transaction.get(ref))),
    ]);
    if (command.exists) return command.data()?.result;
    if (!paymentSnapshot.exists || !assignmentSnapshot.exists || !commitmentSnapshot.exists || !commitmentPaymentSnapshot.exists) {
      throw new HttpsError('not-found', 'Shared bill payment data is unavailable.');
    }
    const payment = paymentSnapshot.data() || {};
    const assignment = assignmentSnapshot.data() || {};
    const commitment = commitmentSnapshot.data() || {};
    if (payment.status !== 'posted') throw new HttpsError('failed-precondition', 'Only a posted shared bill payment can be reversed.');
    if (assignment.lastPaymentId !== paymentId || assignment.currentPaymentId) throw new HttpsError('failed-precondition', 'Reverse the latest completed payment before changing earlier history.');
    if (safeMinor(commitment.amountPaidMinor, 'Commitment paid amount') !== safeMinor(payment.postCommitmentAmountPaidMinor, 'Posted commitment amount')) {
      throw new HttpsError('failed-precondition', 'This is no longer the latest commitment payment and cannot be reversed safely.');
    }

    const amountMinor = positiveMoney(payment.amountMinor);
    const settledBefore = safeMinor(assignment.settledMinor, 'Assignment settled amount');
    const settledAfter = Math.max(0, settledBefore - amountMinor);
    const assignedMinor = positiveMoney(assignment.assignedMinor);
    const outstandingAfter = Math.max(0, assignedMinor - settledAfter);
    const assignmentStatus = settledAfter > 0 ? 'partially_paid' : 'unpaid';
    const now = FieldValue.serverTimestamp();
    let reversalTransactionId: string | null = null;
    let ledgerEntryId: string | null = null;

    if (payment.settlementMode === 'account') {
      if (!accountRef || !accountSnapshot || !originalTransactionRef || !originalTransactionSnapshot || !reversalTransactionRef) {
        throw new HttpsError('failed-precondition', 'The original Account transaction is incomplete.');
      }
      const account = assertAccount(accountSnapshot.data(), String(payment.memberUid), 'Account', true);
      const original = originalTransactionSnapshot.data() || {};
      if (original.status !== 'posted' || original.reversedBy || original.sharedBillPaymentId !== paymentId) {
        throw new HttpsError('failed-precondition', 'The original shared bill transaction is not active.');
      }
      const delta = -accountEffect(account.type, 'out', amountMinor);
      updateAccountBalance(transaction, accountRef, account, delta);
      ledgerEntryId = createLedgerEntry(transaction, {
        accountId: accountRef.id,
        ownerId: String(payment.memberUid),
        spaceId: String(payment.spaceId),
        transactionId: reversalTransactionRef.id,
        entryType: 'shared_bill_payment_reversal',
        amountMinor: delta,
        currency: account.currency,
        idempotencyKey: key,
        now,
      });
      const budgetIds = Array.isArray(original.budgetIds)
        ? original.budgetIds.filter((id: unknown): id is string => typeof id === 'string')
        : [];
      if (budgetIds.length) updateBudgetsSpent(transaction, budgetSnapshots, budgetIds, -amountMinor);
      reversalTransactionId = reversalTransactionRef.id;
      transaction.create(reversalTransactionRef, {
        displayId: displayId('TXN'),
        ownerId: payment.memberUid,
        createdBy: uid,
        type: 'reversal',
        originalType: 'expense',
        status: 'posted',
        spaceId: payment.spaceId,
        accountId: payment.accountId,
        destinationAccountId: null,
        amountMinor,
        currency: payment.currency,
        category: 'Reversal',
        categoryId: 'system-reversal',
        categoryIcon: 'reversal',
        categoryColor: 'slate',
        categoryScope: 'both',
        categoryIsSystem: true,
        counterparty: original.counterparty || assignment.commitmentName || '',
        note: reason || `Reversal of shared bill payment ${payment.displayId || paymentId}`,
        transactionDate: reversalDate,
        reversalOf: originalTransactionRef.id,
        reversedBy: null,
        budgetIds,
        commitmentId: payment.commitmentId,
        commitmentPaymentId: payment.commitmentPaymentId,
        sharedBillAssignmentId: payment.assignmentId,
        sharedBillPaymentId: paymentId,
        paymentProofPath: payment.proofPath || null,
        createdAt: now,
        postedAt: now,
        updatedAt: now,
      });
      transaction.update(originalTransactionRef, { status: 'reversed', reversedBy: reversalTransactionRef.id, reversedAt: now, updatedAt: now });
    }

    transaction.create(reversalAuditRef, {
      displayId: displayId('SHR-REV'),
      paymentId,
      assignmentId: payment.assignmentId,
      spaceId: payment.spaceId,
      commitmentId: payment.commitmentId,
      memberUid: payment.memberUid,
      amountMinor,
      currency: payment.currency,
      settlementMode: payment.settlementMode,
      transactionId: payment.transactionId || null,
      reversalTransactionId,
      ledgerEntryId,
      reason,
      reversedBy: uid,
      reversalDate,
      createdAt: now,
    });
    transaction.update(paymentRef, {
      status: 'reversed',
      reversedAt: now,
      reversedBy: uid,
      reversalTransactionId,
      updatedAt: now,
    });
    transaction.update(commitmentPaymentRef, { status: 'reversed', reversedBy: reversalTransactionId || reversalAuditRef.id, updatedAt: now });
    transaction.update(assignmentRef, {
      settledMinor: settledAfter,
      outstandingMinor: outstandingAfter,
      status: assignmentStatus,
      currentPaymentId: null,
      lastPaymentId: payment.previousAssignmentLastPaymentId || null,
      closedAt: null,
      updatedAt: now,
    });
    transaction.update(commitmentRef, {
      amountPaidMinor: safeMinor(payment.previousCommitmentAmountPaidMinor, 'Previous commitment amount'),
      nextDueDate: payment.previousNextDueDate ?? null,
      status: payment.previousCommitmentStatus === 'completed' ? 'completed' : 'active',
      sharedCycleDueDate: payment.previousSharedCycleDueDate ?? assignment.dueDate ?? null,
      sharedAssignedMinor: safeMinor(payment.previousSharedAssignedMinor, 'Previous shared assigned amount'),
      sharedSettledMinor: safeMinor(payment.previousSharedSettledMinor, 'Previous shared settled amount'),
      updatedAt: now,
    });
    createActivity(transaction, {
      spaceId: String(payment.spaceId),
      actorUid: uid,
      actorName: member.displayName || member.email,
      action: 'shared_bill_payment_reversed',
      targetType: 'shared_bill_payment',
      targetId: paymentId,
      summary: `Reversed ${amountMinor / 100} ${payment.currency} for ${assignment.commitmentName || 'a shared bill'} and reopened the outstanding amount.`,
      now,
    });
    if (uid !== payment.memberUid) {
      createNotification(transaction, {
        uid: String(payment.memberUid),
        spaceId: String(payment.spaceId),
        type: 'payment_reversed',
        title: 'Shared bill payment reversed',
        message: `${assignment.commitmentName || 'A shared bill'} has ${outstandingAfter / 100} ${payment.currency} outstanding again.`,
        now,
      });
    }
    const result = { paymentId, assignmentId: assignmentRef.id, reversalId: reversalAuditRef.id, reversalTransactionId, ledgerEntryId, outstandingMinor: outstandingAfter };
    transaction.create(commandRef, { uid, kind: 'reverse_shared_bill_payment', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

// v0.11.2 safe delete, close, archive and restore
const spaceLifecycleActions = ['archive', 'restore', 'delete'] as const;
const accountLifecycleActions = ['close', 'restore', 'delete'] as const;
const budgetLifecycleActions = ['archive', 'restore', 'delete'] as const;
const goalLifecycleActions = ['archive', 'restore', 'delete', 'close'] as const;
const commitmentLifecycleActions = ['stop', 'restore', 'delete'] as const;
const categoryLifecycleActions = ['archive', 'restore', 'delete'] as const;

async function queryHasDocuments(query: Query): Promise<boolean> {
  return !(await query.limit(1).get()).empty;
}

function lifecycleCommand(uid: string, key: string) {
  return db.collection('lifecycleCommands').doc(commandId(uid, key));
}

export const manageSpaceLifecycle = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const action = oneOf(request.data?.action, spaceLifecycleActions, 'Space action');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('spaces').doc(spaceId);
  const commandRef = lifecycleCommand(uid, key);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Space not found.');
  const data = snapshot.data() || {};
  if (data.ownerId !== uid) throw new HttpsError('permission-denied', 'Only the Space owner can do this.');
  if (data.type === 'personal' && action !== 'restore') throw new HttpsError('failed-precondition', 'Your Personal Space must stay available.');
  const recurringInSpace = await db.collection('recurringTransactionTemplates').where('spaceId', '==', spaceId).get();
  const activeRecurringInSpace = recurringInSpace.docs.some((item) => ['active', 'paused', 'needs_attention'].includes(String(item.data().status || '')));
  if (action === 'archive' && activeRecurringInSpace) throw new HttpsError('failed-precondition', 'Stop or move the recurring money in this Space before archiving it.');

  if (action === 'delete') {
    const memberSnapshot = await db.collection('spaceMembers').where('spaceId', '==', spaceId).get();
    const hasOtherMembers = memberSnapshot.docs.some((item) => item.data().uid !== uid);
    const [posSettings, ...checks] = await Promise.all([
      db.collection('smePosSettings').doc(spaceId).get(),
      queryHasDocuments(db.collection('transactions').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('budgets').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('goals').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('commitments').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('sharedBillAssignments').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('sharedExpenses').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('sharedExpensePayments').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceFundContributions').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceInvitations').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('tripItineraryItems').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('tripTasks').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceWorkItems').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('tripBookings').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceAnnouncements').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spacePolls').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spacePollVotes').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceApprovals').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceMessages').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceActivities').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('collectionItems').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('collectionItemMovements').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('smePosProducts').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('smePosCustomers').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('smePosSellers').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('smePosListings').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('smePosSales').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('smePosPayouts').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('smePosReservations').where('spaceId', '==', spaceId)),
    ]);
    if (hasOtherMembers || posSettings.exists || checks.some(Boolean) || !recurringInSpace.empty) {
      throw new HttpsError('failed-precondition', 'This Space has members or saved history. Archive it instead.');
    }
  }

  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Space not found.');
    const now = FieldValue.serverTimestamp();
    const result = { id: spaceId, action, deleted: action === 'delete', archived: action === 'archive', restored: action === 'restore' };
    if (action === 'delete') {
      transaction.delete(db.collection('spaceMembers').doc(`${spaceId}_${uid}`));
      transaction.delete(ref);
    } else if (action === 'archive') {
      transaction.update(ref, { archivedAt: now, updatedAt: now });
    } else {
      transaction.update(ref, { archivedAt: null, updatedAt: now });
    }
    transaction.create(commandRef, { uid, kind: 'space_lifecycle', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const manageAccountLifecycle = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const accountId = stringValue(request.data?.accountId, 'Account ID', 80);
  const action = oneOf(request.data?.action, accountLifecycleActions, 'Account action');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('accounts').doc(accountId);
  const commandRef = lifecycleCommand(uid, key);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Account not found.');
  const data = snapshot.data() || {};
  if (data.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this account.');

  const recurringForAccount = await db.collection('recurringTransactionTemplates').where('accountId', '==', accountId).get();
  const activeRecurringForAccount = recurringForAccount.docs.some((item) => ['active', 'paused', 'needs_attention'].includes(String(item.data().status || '')));
  if (action === 'close' && activeRecurringForAccount) throw new HttpsError('failed-precondition', 'Stop or move recurring money that uses this account before closing it.');

  let openingLedgerRefs: DocumentReference[] = [];
  if (action === 'delete') {
    const [sourceUsed, destinationUsed, commitmentUsed, sharedUsed, posDefaultUsed, ledgerSnapshot] = await Promise.all([
      queryHasDocuments(db.collection('transactions').where('accountId', '==', accountId)),
      queryHasDocuments(db.collection('transactions').where('destinationAccountId', '==', accountId)),
      queryHasDocuments(db.collection('commitments').where('accountId', '==', accountId)),
      queryHasDocuments(db.collection('sharedBillPayments').where('accountId', '==', accountId)),
      queryHasDocuments(db.collection('smePosSettings').where('defaultPaymentAccountId', '==', accountId)),
      db.collection('ledgerEntries').where('accountId', '==', accountId).get(),
    ]);
    const nonOpeningLedger = ledgerSnapshot.docs.some((item) => item.data().entryType !== 'opening_balance');
    if (sourceUsed || destinationUsed || commitmentUsed || sharedUsed || posDefaultUsed || nonOpeningLedger || !recurringForAccount.empty) {
      throw new HttpsError('failed-precondition', 'This account has saved money activity. Close it instead.');
    }
    openingLedgerRefs = ledgerSnapshot.docs.map((item) => item.ref);
  }

  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Account not found.');
    const now = FieldValue.serverTimestamp();
    const result = { id: accountId, action, deleted: action === 'delete', closed: action === 'close', restored: action === 'restore' };
    if (action === 'delete') {
      openingLedgerRefs.forEach((ledgerRef) => transaction.delete(ledgerRef));
      transaction.delete(ref);
    } else if (action === 'close') {
      transaction.update(ref, { archivedAt: now, closedAt: now, updatedAt: now });
    } else {
      transaction.update(ref, { archivedAt: null, closedAt: null, updatedAt: now });
    }
    transaction.create(commandRef, { uid, kind: 'account_lifecycle', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const manageBudgetLifecycle = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const budgetId = stringValue(request.data?.budgetId, 'Budget ID', 80);
  const action = oneOf(request.data?.action, budgetLifecycleActions, 'Budget action');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('budgets').doc(budgetId);
  const commandRef = lifecycleCommand(uid, key);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Budget not found.');
  if (snapshot.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this budget.');
  if (action === 'delete') {
    const used = Number(snapshot.data()?.spentMinor || 0) !== 0 || await queryHasDocuments(db.collection('transactions').where('budgetIds', 'array-contains', budgetId));
    if (used) throw new HttpsError('failed-precondition', 'This budget has saved spending. Archive it instead.');
  }
  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Budget not found.');
    const now = FieldValue.serverTimestamp();
    const result = { id: budgetId, action, deleted: action === 'delete', archived: action === 'archive', restored: action === 'restore' };
    if (action === 'delete') transaction.delete(ref);
    else transaction.update(ref, { archivedAt: action === 'archive' ? now : null, updatedAt: now });
    transaction.create(commandRef, { uid, kind: 'budget_lifecycle', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const manageGoalLifecycle = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const goalId = stringValue(request.data?.goalId, 'Goal ID', 80);
  const action = oneOf(request.data?.action, goalLifecycleActions, 'Goal action');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('goals').doc(goalId);
  const commandRef = lifecycleCommand(uid, key);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Goal not found.');
  const data = snapshot.data() || {};
  if (data.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this goal.');
  if (action === 'delete') {
    const used = Number(data.currentMinor || 0) !== 0 || await queryHasDocuments(db.collection('goalContributions').where('goalId', '==', goalId));
    if (used) throw new HttpsError('failed-precondition', 'This goal has saved progress. Close or archive it instead.');
  }
  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Goal not found.');
    const now = FieldValue.serverTimestamp();
    const currentData = current.data() || {};
    const result = { id: goalId, action, deleted: action === 'delete', archived: action === 'archive', closed: action === 'close', restored: action === 'restore' };
    if (action === 'delete') transaction.delete(ref);
    else if (action === 'archive') transaction.update(ref, { archivedAt: now, updatedAt: now });
    else if (action === 'close') transaction.update(ref, { closedAt: now, status: 'completed', updatedAt: now });
    else transaction.update(ref, { archivedAt: null, closedAt: null, status: Number(currentData.currentMinor || 0) >= Number(currentData.targetMinor || 0) ? 'completed' : 'active', updatedAt: now });
    transaction.create(commandRef, { uid, kind: 'goal_lifecycle', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const manageCommitmentLifecycle = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const commitmentId = stringValue(request.data?.commitmentId, 'Bill or instalment ID', 80);
  const action = oneOf(request.data?.action, commitmentLifecycleActions, 'Bill action');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('commitments').doc(commitmentId);
  const commandRef = lifecycleCommand(uid, key);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Bill or instalment not found.');
  const data = snapshot.data() || {};
  if (data.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this bill or instalment.');
  if (action === 'delete') {
    const [hasPayments, hasShares] = await Promise.all([
      queryHasDocuments(db.collection('commitmentPayments').where('commitmentId', '==', commitmentId)),
      queryHasDocuments(db.collection('sharedBillAssignments').where('commitmentId', '==', commitmentId)),
    ]);
    if (hasPayments || hasShares || Number(data.amountPaidMinor || 0) !== 0) {
      throw new HttpsError('failed-precondition', 'This item has payment history. Stop it instead.');
    }
  }
  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Bill or instalment not found.');
    const now = FieldValue.serverTimestamp();
    const currentData = current.data() || {};
    const result = { id: commitmentId, action, deleted: action === 'delete', stopped: action === 'stop', restored: action === 'restore' };
    if (action === 'delete') transaction.delete(ref);
    else if (action === 'stop') transaction.update(ref, { stoppedAt: now, stoppedPreviousNextDueDate: currentData.nextDueDate || null, status: 'completed', nextDueDate: null, updatedAt: now });
    else {
      const fullPaid = currentData.type === 'instalment' && Number(currentData.amountPaidMinor || 0) >= Number(currentData.totalAmountMinor || 0);
      if (fullPaid) throw new HttpsError('failed-precondition', 'This instalment is already fully paid.');
      transaction.update(ref, { archivedAt: null, stoppedAt: null, status: 'active', nextDueDate: currentData.stoppedPreviousNextDueDate || currentData.startDate, updatedAt: now });
    }
    transaction.create(commandRef, { uid, kind: 'commitment_lifecycle', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const manageCategoryLifecycle = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const categoryId = stringValue(request.data?.categoryId, 'Category ID', 80);
  const action = oneOf(request.data?.action, categoryLifecycleActions, 'Category action');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('categories').doc(categoryId);
  const commandRef = lifecycleCommand(uid, key);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Category not found.');
  if (snapshot.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this category.');
  if (action === 'delete') {
    const used = (await Promise.all([
      queryHasDocuments(db.collection('transactions').where('categoryId', '==', categoryId)),
      queryHasDocuments(db.collection('budgets').where('categoryId', '==', categoryId)),
      queryHasDocuments(db.collection('commitments').where('categoryId', '==', categoryId)),
      queryHasDocuments(db.collection('recurringTransactionTemplates').where('categoryId', '==', categoryId)),
    ])).some(Boolean);
    if (used) throw new HttpsError('failed-precondition', 'This category is used in saved records or recurring money. Hide it instead.');
  }
  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Category not found.');
    const now = FieldValue.serverTimestamp();
    const result = { id: categoryId, action, deleted: action === 'delete', archived: action === 'archive', restored: action === 'restore' };
    if (action === 'delete') transaction.delete(ref);
    else transaction.update(ref, { archivedAt: action === 'archive' ? now : null, updatedAt: now });
    transaction.create(commandRef, { uid, kind: 'category_lifecycle', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

// v0.11.3 complete shared expenses, member balances, and Trip money
const sharedExpenseSplitModes = ['equal', 'custom', 'percentage'] as const;
const sharedExpensePaymentDecisions = ['confirmed', 'rejected'] as const;
type SharedExpenseSplitMode = (typeof sharedExpenseSplitModes)[number];

type SpaceFundKind = 'trip' | 'household' | 'group';
interface SpaceFundMeta { kind: SpaceFundKind; title: string; contributionPrefix: string; tab: string; }
function spaceFundMeta(spaceType: string): SpaceFundMeta | null {
  if (spaceType === 'trip') return { kind: 'trip', title: 'Trip money', contributionPrefix: 'TMC', tab: 'trip_money' };
  if (spaceType === 'household') return { kind: 'household', title: 'Household fund', contributionPrefix: 'HFC', tab: 'group_fund' };
  if (spaceType === 'custom') return { kind: 'group', title: 'Group fund', contributionPrefix: 'GFC', tab: 'group_fund' };
  return null;
}

interface SharedExpenseSplitRequest {
  memberUid: string;
  amountMinor?: number;
  percentageBasisPoints?: number;
}

interface SharedExpenseAllocation {
  shareId: string;
  expenseId: string;
  amountMinor: number;
}

interface CalculatedSharedExpenseSplit {
  memberUid: string;
  amountMinor: number;
  percentageBasisPoints: number | null;
}

function parseSharedExpenseSplits(value: unknown): SharedExpenseSplitRequest[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new HttpsError('invalid-argument', 'Choose at least one person for this expense.');
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new HttpsError('invalid-argument', 'A selected person is invalid.');
    const data = item as Record<string, unknown>;
    const memberUid = stringValue(data.memberUid, 'Member ID', 128);
    if (seen.has(memberUid)) throw new HttpsError('invalid-argument', 'The same person was selected more than once.');
    seen.add(memberUid);
    return {
      memberUid,
      amountMinor: data.amountMinor == null ? undefined : positiveMoney(data.amountMinor),
      percentageBasisPoints: data.percentageBasisPoints == null
        ? undefined
        : integerBetween(data.percentageBasisPoints, 'Percentage', 1, 10_000),
    };
  });
}

function calculateSharedExpenseSplits(
  totalMinor: number,
  mode: SharedExpenseSplitMode,
  requests: SharedExpenseSplitRequest[],
): CalculatedSharedExpenseSplit[] {
  if (mode === 'equal') {
    const base = Math.floor(totalMinor / requests.length);
    let remainder = totalMinor - base * requests.length;
    return requests.map((item) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return { ...item, amountMinor: base + extra, percentageBasisPoints: null };
    });
  }

  if (mode === 'custom') {
    const values = requests.map((item) => ({ ...item, amountMinor: positiveMoney(item.amountMinor), percentageBasisPoints: null }));
    if (values.reduce((sum, item) => sum + item.amountMinor, 0) !== totalMinor) {
      throw new HttpsError('invalid-argument', 'The different amounts must add up to the full expense.');
    }
    return values;
  }

  const percentages = requests.map((item) => integerBetween(item.percentageBasisPoints, 'Percentage', 1, 10_000));
  if (percentages.reduce((sum, item) => sum + item, 0) !== 10_000) {
    throw new HttpsError('invalid-argument', 'The percentages must add up to 100%.');
  }
  let assigned = 0;
  return requests.map((item, index) => {
    const percentageBasisPoints = percentages[index];
    const amountMinor = index === requests.length - 1
      ? totalMinor - assigned
      : Math.floor((totalMinor * percentageBasisPoints) / 10_000);
    assigned += amountMinor;
    return { ...item, amountMinor, percentageBasisPoints };
  });
}

async function sharedExpensePaymentCandidates(input: {
  spaceId: string;
  fromUid: string;
  toUid: string;
  expenseId?: string | null;
}) {
  const shares = await db.collection('sharedExpenseShares')
    .where('spaceId', '==', input.spaceId)
    .where('memberUid', '==', input.fromUid)
    .get();
  const rows = await Promise.all(shares.docs.map(async (share) => {
    const expense = await db.collection('sharedExpenses').doc(String(share.data().expenseId || '')).get();
    return { shareRef: share.ref, shareData: share.data(), expenseRef: expense.ref, expenseData: expense.data() || null };
  }));
  return rows
    .filter((item) => item.expenseData
      && item.expenseData.paidByUid === input.toUid
      && (!input.expenseId || item.expenseRef.id === input.expenseId)
      && safeMinor(item.shareData.amountLeftMinor, 'Amount left') > 0)
    .sort((a, b) => String(a.expenseData?.expenseDate || '').localeCompare(String(b.expenseData?.expenseDate || '')))
    .slice(0, 100);
}

function writeSharedExpensePayment(input: {
  transaction: Transaction;
  paymentRef: DocumentReference;
  paymentIsNew: boolean;
  payment: DocumentData;
  actorUid: string;
  actorName?: string;
  candidateRows: Array<{ shareRef: DocumentReference; expenseRef: DocumentReference }>;
  candidateSnapshots: Array<{ share: DocumentData; expense: DocumentData }>;
  now: FieldValue;
}) {
  const amountMinor = positiveMoney(input.payment.amountMinor);
  let amountLeft = amountMinor;
  const allocations: SharedExpenseAllocation[] = [];
  const expenseChanges = new Map<string, { ref: DocumentReference; data: DocumentData; addSettled: number }>();

  input.candidateSnapshots.forEach((candidate, index) => {
    if (amountLeft <= 0) return;
    const row = input.candidateRows[index];
    const share = candidate.share;
    const expense = candidate.expense;
    if (!share || !expense) return;
    if (share.spaceId !== input.payment.spaceId || share.memberUid !== input.payment.fromUid) return;
    if (expense.spaceId !== input.payment.spaceId || expense.paidByUid !== input.payment.toUid) return;
    if (input.payment.expenseId && row.expenseRef.id !== input.payment.expenseId) return;
    const shareLeft = safeMinor(share.amountLeftMinor, 'Share amount left');
    if (shareLeft <= 0) return;
    const allocation = Math.min(amountLeft, shareLeft);
    allocations.push({ shareId: row.shareRef.id, expenseId: row.expenseRef.id, amountMinor: allocation });
    amountLeft -= allocation;

    const nextSettled = safeMinor(share.settledMinor, 'Share paid amount') + allocation;
    const nextLeft = Math.max(0, positiveMoney(share.shareMinor) - nextSettled);
    input.transaction.update(row.shareRef, {
      settledMinor: nextSettled,
      amountLeftMinor: nextLeft,
      status: nextLeft === 0 ? 'paid' : 'partially_paid',
      currentPaymentId: null,
      lastPaymentId: input.paymentRef.id,
      updatedAt: input.now,
    });
    const current = expenseChanges.get(row.expenseRef.id);
    expenseChanges.set(row.expenseRef.id, {
      ref: row.expenseRef,
      data: expense,
      addSettled: (current?.addSettled || 0) + allocation,
    });
  });

  if (amountLeft > 0 || allocations.length === 0) {
    throw new HttpsError('failed-precondition', 'The amount is more than what you currently owe this person. Refresh and try again.');
  }

  expenseChanges.forEach((change) => {
    const nextSettled = safeMinor(change.data.totalSettledMinor, 'Expense paid amount') + change.addSettled;
    const totalMinor = positiveMoney(change.data.totalMinor);
    const nextLeft = Math.max(0, totalMinor - nextSettled);
    input.transaction.update(change.ref, {
      totalSettledMinor: nextSettled,
      amountLeftMinor: nextLeft,
      status: nextLeft === 0 ? 'paid' : 'partially_paid',
      closedAt: nextLeft === 0 ? input.now : null,
      updatedAt: input.now,
    });
  });

  const paymentUpdate = {
    displayId: input.payment.displayId || displayId('SEP'),
    spaceId: input.payment.spaceId,
    fromUid: input.payment.fromUid,
    fromName: input.payment.fromName || '',
    fromEmail: input.payment.fromEmail || '',
    toUid: input.payment.toUid,
    toName: input.payment.toName || '',
    toEmail: input.payment.toEmail || '',
    expenseId: input.payment.expenseId || null,
    amountMinor,
    currency: input.payment.currency,
    paymentDate: input.payment.paymentDate,
    proofPath: input.payment.proofPath || null,
    proofName: input.payment.proofName || null,
    note: optionalString(input.payment.note, 500),
    status: 'posted',
    allocations,
    reviewedAt: input.now,
    reviewedBy: input.actorUid,
    postedAt: input.now,
    reversedAt: null,
    reversedBy: null,
    updatedAt: input.now,
  };
  if (input.paymentIsNew) input.transaction.create(input.paymentRef, { ...paymentUpdate, createdAt: input.now });
  else input.transaction.update(input.paymentRef, paymentUpdate);

  createActivity(input.transaction, {
    spaceId: String(input.payment.spaceId),
    actorUid: input.actorUid,
    actorName: input.actorName,
    action: 'shared_expense_payment_recorded',
    targetType: 'shared_expense_payment',
    targetId: input.paymentRef.id,
    summary: `${input.payment.fromName || 'A member'} paid ${amountMinor / 100} ${input.payment.currency} to ${input.payment.toName || 'another member'}.`,
    now: input.now,
  });
  if (input.actorUid !== input.payment.toUid) {
    createNotification(input.transaction, {
      uid: String(input.payment.toUid),
      spaceId: String(input.payment.spaceId),
      type: 'shared_expense_payment',
      title: 'Member payment recorded',
      message: `${input.payment.fromName || 'A member'} paid ${amountMinor / 100} ${input.payment.currency}.`,
      now: input.now,
    });
  }
  return allocations;
}

function optionalTripPlanningText(
  value: unknown,
  label: string,
  maxLength = 500,
): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw new HttpsError('invalid-argument', `${label} is too long.`);
  }
  return text;
}

function optionalTripPlanningAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new HttpsError('invalid-argument', 'Booking amount is invalid.');
  }
  return amount;
}

async function requireTripSpaceMember(spaceId: string, uid: string) {
  const [spaceSnapshot, member] = await Promise.all([
    db.collection('spaces').doc(spaceId).get(),
    requireActiveSpaceMember(spaceId, uid),
  ]);

  if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) {
    throw new HttpsError('not-found', 'Trip Space was not found.');
  }

  const space = spaceSnapshot.data() || {};

  if (space.type !== 'trip') {
    throw new HttpsError(
      'failed-precondition',
      'Trip planning is only available inside a Trip Space.',
    );
  }

  return { space, member };
}

function canManageTripPlanning(member: DocumentData): boolean {
  return ['owner', 'admin', 'contributor'].includes(String(member.role || ''));
}

async function requireTripPlanner(spaceId: string, uid: string) {
  const context = await requireTripSpaceMember(spaceId, uid);

  if (!canManageTripPlanning(context.member)) {
    throw new HttpsError(
      'permission-denied',
      'Only the Trip owner, admin or contributor can change Trip planning.',
    );
  }

  return context;
}

export const saveTripItineraryItem = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const itemId = optionalTripPlanningText(request.data?.itemId, 'Itinerary item ID', 80);
  const title = stringValue(request.data?.title, 'Itinerary title', 120);
  const category = stringValue(request.data?.category, 'Itinerary category', 20);
  const date = stringValue(request.data?.date, 'Itinerary date', 10);
  const time = optionalTripPlanningText(request.data?.time, 'Itinerary time', 10);
  const location = optionalTripPlanningText(request.data?.location, 'Location', 160);
  const reference = optionalTripPlanningText(request.data?.reference, 'Booking reference', 100);
  const note = optionalTripPlanningText(request.data?.note, 'Note', 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  if (!['flight', 'hotel', 'transport', 'activity', 'food', 'other'].includes(category)) {
    throw new HttpsError('invalid-argument', 'Choose a valid Itinerary category.');
  }

  const actor = await requireTripPlanner(spaceId, uid);
  const ref = itemId
    ? db.collection('tripItineraryItems').doc(itemId)
    : db.collection('tripItineraryItems').doc();
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const existing = itemId ? await transaction.get(ref) : null;

    if (itemId && !existing?.exists) {
      throw new HttpsError('not-found', 'Itinerary item was not found.');
    }

    if (existing?.exists && String(existing.data()?.spaceId || '') !== spaceId) {
      throw new HttpsError('permission-denied', 'Itinerary item belongs to another Space.');
    }

    const now = FieldValue.serverTimestamp();

    const data = {
      spaceId,
      title,
      category,
      date,
      time,
      location,
      reference,
      note,
      updatedAt: now,
    };

    if (existing?.exists) {
      transaction.update(ref, data);
    } else {
      transaction.create(ref, {
        displayId: displayId('ITI'),
        ...data,
        createdBy: uid,
        archivedAt: null,
        createdAt: now,
      });
    }

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: actor.member.displayName,
      action: existing?.exists ? 'trip_itinerary_updated' : 'trip_itinerary_created',
      targetType: 'trip_itinerary',
      targetId: ref.id,
      summary: `${existing?.exists ? 'Updated' : 'Added'} ${title} in the Trip Itinerary.`,
      now,
    });

    const result = { itemId: ref.id };
    transaction.create(commandRef, {
      uid,
      kind: 'save_trip_itinerary_item',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const archiveTripItineraryItem = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const itemId = stringValue(request.data?.itemId, 'Itinerary item ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const actor = await requireTripPlanner(spaceId, uid);

  const ref = db.collection('tripItineraryItems').doc(itemId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const snapshot = await transaction.get(ref);

    if (!snapshot.exists || String(snapshot.data()?.spaceId || '') !== spaceId) {
      throw new HttpsError('not-found', 'Itinerary item was not found.');
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(ref, { archivedAt: now, updatedAt: now });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: actor.member.displayName,
      action: 'trip_itinerary_archived',
      targetType: 'trip_itinerary',
      targetId: itemId,
      summary: `Archived ${snapshot.data()?.title || 'an Itinerary item'}.`,
      now,
    });

    const result = { itemId, archived: true };
    transaction.create(commandRef, {
      uid,
      kind: 'archive_trip_itinerary_item',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const saveTripTask = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const taskId = optionalTripPlanningText(request.data?.taskId, 'Task ID', 80);
  const title = stringValue(request.data?.title, 'Task title', 120);
  const assigneeUid = optionalTripPlanningText(request.data?.assigneeUid, 'Assignee ID', 128);
  const dueDate = optionalTripPlanningText(request.data?.dueDate, 'Due date', 10);
  const note = optionalTripPlanningText(request.data?.note, 'Note', 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  const actor = await requireTripPlanner(spaceId, uid);
  const assignee = assigneeUid
    ? await requireActiveSpaceMember(spaceId, assigneeUid)
    : null;

  const ref = taskId
    ? db.collection('tripTasks').doc(taskId)
    : db.collection('tripTasks').doc();
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const existing = taskId ? await transaction.get(ref) : null;

    if (taskId && !existing?.exists) {
      throw new HttpsError('not-found', 'Trip Task was not found.');
    }

    if (existing?.exists && String(existing.data()?.spaceId || '') !== spaceId) {
      throw new HttpsError('permission-denied', 'Trip Task belongs to another Space.');
    }

    const previousAssigneeUid = String(existing?.data()?.assigneeUid || '');
    const now = FieldValue.serverTimestamp();

    const data = {
      spaceId,
      title,
      assigneeUid,
      assigneeName: assignee?.displayName || null,
      assigneeEmail: assignee?.email || null,
      dueDate,
      note,
      updatedAt: now,
    };

    if (existing?.exists) {
      transaction.update(ref, data);
    } else {
      transaction.create(ref, {
        displayId: displayId('TSK'),
        ...data,
        status: 'open',
        createdBy: uid,
        completedBy: null,
        completedAt: null,
        archivedAt: null,
        createdAt: now,
      });
    }

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: actor.member.displayName,
      action: existing?.exists ? 'trip_task_updated' : 'trip_task_created',
      targetType: 'trip_task',
      targetId: ref.id,
      summary: `${existing?.exists ? 'Updated' : 'Added'} Trip Task: ${title}.`,
      now,
    });

    if (
      assigneeUid &&
      assigneeUid !== uid &&
      assigneeUid !== previousAssigneeUid
    ) {
      createNotification(transaction, {
        uid: assigneeUid,
        spaceId,
        type: 'trip_task_assigned',
        title: 'A Trip Task was assigned to you',
        message: dueDate ? `${title} is due on ${dueDate}.` : title,
        targetPath: `/spaces/${spaceId}?tab=overview#trip-planning`,
        actionLabel: 'Open Trip Tasks',
        now,
      });
    }

    const result = { taskId: ref.id };
    transaction.create(commandRef, {
      uid,
      kind: 'save_trip_task',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const setTripTaskStatus = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const taskId = stringValue(request.data?.taskId, 'Task ID', 80);
  const status = stringValue(request.data?.status, 'Task status', 20);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  if (!['open', 'completed'].includes(status)) {
    throw new HttpsError('invalid-argument', 'Choose a valid Task status.');
  }

  const actor = await requireTripSpaceMember(spaceId, uid);
  const ref = db.collection('tripTasks').doc(taskId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const snapshot = await transaction.get(ref);

    if (!snapshot.exists || String(snapshot.data()?.spaceId || '') !== spaceId) {
      throw new HttpsError('not-found', 'Trip Task was not found.');
    }

    const task = snapshot.data() || {};

    if (
      !canManageTripPlanning(actor.member) &&
      String(task.assigneeUid || '') !== uid
    ) {
      throw new HttpsError(
        'permission-denied',
        'Only the assignee or a Trip planner can change this Task.',
      );
    }

    const now = FieldValue.serverTimestamp();

    transaction.update(ref, {
      status,
      completedBy: status === 'completed' ? uid : null,
      completedAt: status === 'completed' ? now : null,
      updatedAt: now,
    });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: actor.member.displayName,
      action: status === 'completed' ? 'trip_task_completed' : 'trip_task_reopened',
      targetType: 'trip_task',
      targetId: taskId,
      summary: `${status === 'completed' ? 'Completed' : 'Reopened'} Trip Task: ${task.title || 'Task'}.`,
      now,
    });

    if (
      status === 'completed' &&
      task.createdBy &&
      String(task.createdBy) !== uid
    ) {
      createNotification(transaction, {
        uid: String(task.createdBy),
        spaceId,
        type: 'trip_task_completed',
        title: 'Trip Task completed',
        message: `${task.title || 'A Trip Task'} was completed.`,
        targetPath: `/spaces/${spaceId}?tab=overview#trip-planning`,
        actionLabel: 'Open Trip Tasks',
        now,
      });
    }

    const result = { taskId, status };
    transaction.create(commandRef, {
      uid,
      kind: 'set_trip_task_status',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const archiveTripTask = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const taskId = stringValue(request.data?.taskId, 'Task ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const actor = await requireTripPlanner(spaceId, uid);

  const ref = db.collection('tripTasks').doc(taskId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const snapshot = await transaction.get(ref);

    if (!snapshot.exists || String(snapshot.data()?.spaceId || '') !== spaceId) {
      throw new HttpsError('not-found', 'Trip Task was not found.');
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(ref, { archivedAt: now, updatedAt: now });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: actor.member.displayName,
      action: 'trip_task_archived',
      targetType: 'trip_task',
      targetId: taskId,
      summary: `Archived Trip Task: ${snapshot.data()?.title || 'Task'}.`,
      now,
    });

    const result = { taskId, archived: true };
    transaction.create(commandRef, {
      uid,
      kind: 'archive_trip_task',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const saveTripBooking = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const bookingId = optionalTripPlanningText(request.data?.bookingId, 'Booking ID', 80);
  const title = stringValue(request.data?.title, 'Booking title', 120);
  const bookingType = stringValue(request.data?.bookingType, 'Booking type', 20);
  const provider = optionalTripPlanningText(request.data?.provider, 'Provider', 120);
  const reference = optionalTripPlanningText(request.data?.reference, 'Booking reference', 100);
  const date = stringValue(request.data?.date, 'Booking date', 10);
  const time = optionalTripPlanningText(request.data?.time, 'Booking time', 10);
  const location = optionalTripPlanningText(request.data?.location, 'Location', 160);
  const amountMinor = optionalTripPlanningAmount(request.data?.amountMinor);
  const note = optionalTripPlanningText(request.data?.note, 'Note', 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  if (!['flight', 'hotel', 'transport', 'activity', 'event', 'other'].includes(bookingType)) {
    throw new HttpsError('invalid-argument', 'Choose a valid Booking type.');
  }

  const actor = await requireTripPlanner(spaceId, uid);
  const currency =
    optionalTripPlanningText(request.data?.currency, 'Currency', 10) ||
    String(actor.space.currency || 'BND');

  const ref = bookingId
    ? db.collection('tripBookings').doc(bookingId)
    : db.collection('tripBookings').doc();
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const existing = bookingId ? await transaction.get(ref) : null;

    if (bookingId && !existing?.exists) {
      throw new HttpsError('not-found', 'Trip Booking was not found.');
    }

    if (existing?.exists && String(existing.data()?.spaceId || '') !== spaceId) {
      throw new HttpsError('permission-denied', 'Trip Booking belongs to another Space.');
    }

    const now = FieldValue.serverTimestamp();

    const data = {
      spaceId,
      title,
      bookingType,
      provider,
      reference,
      date,
      time,
      location,
      amountMinor,
      currency,
      note,
      updatedAt: now,
    };

    if (existing?.exists) {
      transaction.update(ref, data);
    } else {
      transaction.create(ref, {
        displayId: displayId('TBK'),
        ...data,
        createdBy: uid,
        archivedAt: null,
        createdAt: now,
      });
    }

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: actor.member.displayName,
      action: existing?.exists ? 'trip_booking_updated' : 'trip_booking_created',
      targetType: 'trip_booking',
      targetId: ref.id,
      summary: `${existing?.exists ? 'Updated' : 'Saved'} Trip Booking: ${title}.`,
      now,
    });

    const result = { bookingId: ref.id };
    transaction.create(commandRef, {
      uid,
      kind: 'save_trip_booking',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});

export const archiveTripBooking = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const bookingId = stringValue(request.data?.bookingId, 'Booking ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const actor = await requireTripPlanner(spaceId, uid);

  const ref = db.collection('tripBookings').doc(bookingId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;

    const snapshot = await transaction.get(ref);

    if (!snapshot.exists || String(snapshot.data()?.spaceId || '') !== spaceId) {
      throw new HttpsError('not-found', 'Trip Booking was not found.');
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(ref, { archivedAt: now, updatedAt: now });

    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: actor.member.displayName,
      action: 'trip_booking_archived',
      targetType: 'trip_booking',
      targetId: bookingId,
      summary: `Archived Trip Booking: ${snapshot.data()?.title || 'Booking'}.`,
      now,
    });

    const result = { bookingId, archived: true };
    transaction.create(commandRef, {
      uid,
      kind: 'archive_trip_booking',
      idempotencyKey: key,
      result,
      createdAt: now,
    });

    return result;
  });
});
export const createSharedExpense = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const title = stringValue(request.data?.title, 'Expense name', 100);
  const totalMinor = positiveMoney(request.data?.totalMinor);
  const expenseDate = localDate(request.data?.expenseDate, 'Expense date');
  const paidByUid = stringValue(request.data?.paidByUid, 'Who paid', 128);
  const splitMode = oneOf(request.data?.splitMode, sharedExpenseSplitModes, 'split method');
  const requests = parseSharedExpenseSplits(request.data?.splits);
  const note = optionalString(request.data?.note, 500);
  const paidFromGroupFund = request.data?.paidFromGroupFund === true || request.data?.paidFromTripMoney === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const creator = await requireActiveSpaceMember(spaceId, uid);
  if (!['owner', 'admin', 'contributor'].includes(String(creator.role))) {
    throw new HttpsError('permission-denied', 'Your Space access does not allow adding shared expenses.');
  }
  const calculated = calculateSharedExpenseSplits(totalMinor, splitMode, requests);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const payerRef = db.collection('spaceMembers').doc(`${spaceId}_${paidByUid}`);
  const memberRefs = calculated.map((item) => db.collection('spaceMembers').doc(`${spaceId}_${item.memberUid}`));
  const fundRef = db.collection('spaceFunds').doc(spaceId);
  const expenseRef = db.collection('sharedExpenses').doc();
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const [command, spaceSnapshot, payerSnapshot, fundSnapshot, memberSnapshots] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(spaceRef),
      transaction.get(payerRef),
      transaction.get(fundRef),
      Promise.all(memberRefs.map((ref) => transaction.get(ref))),
    ]);
    if (command.exists) return command.data()?.result;
    if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt || spaceSnapshot.data()?.type === 'personal') {
      throw new HttpsError('failed-precondition', 'Choose an active shared Space.');
    }
    if (!payerSnapshot.exists || ['suspended', 'removed'].includes(String(payerSnapshot.data()?.status || ''))) {
      throw new HttpsError('failed-precondition', 'Choose an active member who paid.');
    }
    memberSnapshots.forEach((member) => {
      if (!member.exists || ['suspended', 'removed'].includes(String(member.data()?.status || ''))) {
        throw new HttpsError('failed-precondition', 'One of the selected people is no longer active in this Space.');
      }
    });
    const space = spaceSnapshot.data() || {};
    const currency = String(space.currency || 'BND');
    const now = FieldValue.serverTimestamp();
    const groupMoney = paidFromGroupFund;
    if (groupMoney) {
      const fundMeta = spaceFundMeta(String(space.type || ''));
      if (!fundMeta) throw new HttpsError('failed-precondition', 'A collected group fund is not available for this Space type.');
      if (!fundSnapshot.exists) throw new HttpsError('failed-precondition', `Set up ${fundMeta.title} before using it.`);
      const fund = fundSnapshot.data() || {};
      if (fund.holderUid !== paidByUid) throw new HttpsError('failed-precondition', `Choose the person holding ${fundMeta.title} as the payer.`);
      if (safeMinor(fund.availableMinor, `${fundMeta.title} available`) < totalMinor) throw new HttpsError('failed-precondition', `There is not enough ${fundMeta.title} available for this expense.`);
      const spentMinor = safeMinor(fund.spentMinor, `${fundMeta.title} spent`) + totalMinor;
      transaction.update(fundRef, {
        spentMinor,
        availableMinor: safeMinor(fund.contributedMinor, `${fundMeta.title} collected`) - spentMinor,
        updatedAt: now,
      });
    }

    const initialSettled = groupMoney
      ? totalMinor
      : calculated.filter((item) => item.memberUid === paidByUid).reduce((sum, item) => sum + item.amountMinor, 0);
    const amountLeftMinor = Math.max(0, totalMinor - initialSettled);
    transaction.create(expenseRef, {
      displayId: displayId('SEX'),
      spaceId,
      title,
      totalMinor,
      totalSettledMinor: initialSettled,
      amountLeftMinor,
      currency,
      expenseDate,
      paidByUid,
      paidByName: payerSnapshot.data()?.displayName || '',
      paidByEmail: payerSnapshot.data()?.email || '',
      splitMode,
      note,
      paidFromGroupFund: groupMoney,
      paidFromTripMoney: groupMoney && space.type === 'trip',
      status: amountLeftMinor === 0 ? 'paid' : 'open',
      createdBy: uid,
      closedAt: amountLeftMinor === 0 ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    calculated.forEach((item, index) => {
      const member = memberSnapshots[index].data() || {};
      const paidAlready = groupMoney || item.memberUid === paidByUid;
      const shareRef = db.collection('sharedExpenseShares').doc();
      transaction.create(shareRef, {
        displayId: displayId('SES'),
        expenseId: expenseRef.id,
        spaceId,
        memberUid: item.memberUid,
        memberName: member.displayName || '',
        memberEmail: member.email || '',
        shareMinor: item.amountMinor,
        settledMinor: paidAlready ? item.amountMinor : 0,
        amountLeftMinor: paidAlready ? 0 : item.amountMinor,
        percentageBasisPoints: item.percentageBasisPoints,
        currency,
        status: paidAlready ? 'paid' : 'open',
        currentPaymentId: null,
        lastPaymentId: null,
        createdAt: now,
        updatedAt: now,
      });
      if (!paidAlready) {
        createNotification(transaction, {
          uid: item.memberUid,
          spaceId,
          type: 'shared_expense_added',
          title: 'New shared expense',
          message: `Your share for ${title} is ${item.amountMinor / 100} ${currency}.`,
          now,
        });
      }
    });
    createActivity(transaction, {
      spaceId,
      actorUid: uid,
      actorName: creator.displayName,
      action: 'shared_expense_created',
      targetType: 'shared_expense',
      targetId: expenseRef.id,
      summary: `Added ${title} for ${totalMinor / 100} ${currency}${groupMoney ? ` using ${spaceFundMeta(String(space.type || ''))?.title || 'group fund'}` : ''}.`,
      now,
    });
    const result = { expenseId: expenseRef.id };
    transaction.create(commandRef, { uid, kind: 'create_shared_expense', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const submitSharedExpensePayment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const toUid = stringValue(request.data?.toUid, 'Person being paid', 128);
  const expenseId = optionalString(request.data?.expenseId, 80) || null;
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const paymentDate = localDate(request.data?.paymentDate, 'Payment date');
  const { paymentMethod, paymentMethodLabel } = paymentMethodValues(request.data || {});
  const proofPath = optionalString(request.data?.proofPath, 500) || null;
  const proofName = optionalString(request.data?.proofName, 180) || null;
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  if (uid === toUid) throw new HttpsError('invalid-argument', 'Choose another person to pay.');
  const member = await requireActiveSpaceMember(spaceId, uid);
  const recipient = await requireActiveSpaceMember(spaceId, toUid);
  const space = await db.collection('spaces').doc(spaceId).get();
  if (!space.exists || space.data()?.archivedAt) throw new HttpsError('not-found', 'Space not found.');
  const candidates = await sharedExpensePaymentCandidates({ spaceId, fromUid: uid, toUid, expenseId });
  if (!candidates.length) throw new HttpsError('failed-precondition', 'You do not currently owe this person for the selected shared expenses.');
  const pending = await db.collection('sharedExpensePayments')
    .where('spaceId', '==', spaceId)
    .where('fromUid', '==', uid)
    .where('toUid', '==', toUid)
    .where('status', '==', 'submitted')
    .limit(1)
    .get();
  if (!pending.empty) throw new HttpsError('failed-precondition', 'A payment to this person is already waiting for a check.');
  const paymentRef = db.collection('sharedExpensePayments').doc();
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const paymentData = {
    displayId: displayId('SEP'), spaceId, fromUid: uid, fromName: member.displayName || '', fromEmail: member.email || '',
    toUid, toName: recipient.displayName || '', toEmail: recipient.email || '', expenseId, amountMinor,
    currency: String(space.data()?.currency || 'BND'), paymentDate, paymentMethod, paymentMethodLabel, proofPath, proofName, note,
  };
  const needsApproval = space.data()?.approvalMode === 'owner_approval' && !['owner', 'admin'].includes(String(member.role));

  return db.runTransaction(async (transaction) => {
    const [command, candidateSnapshots] = await Promise.all([
      transaction.get(commandRef),
      Promise.all(candidates.map(async (row) => ({
        share: (await transaction.get(row.shareRef)).data() || {},
        expense: (await transaction.get(row.expenseRef)).data() || {},
      }))),
    ]);
    if (command.exists) return command.data()?.result;
    const now = FieldValue.serverTimestamp();
    let result;
    if (needsApproval) {
      transaction.create(paymentRef, {
        ...paymentData, status: 'submitted', allocations: [], reviewedAt: null, reviewedBy: null,
        postedAt: null, reversedAt: null, reversedBy: null, createdAt: now, updatedAt: now,
      });
      createActivity(transaction, {
        spaceId, actorUid: uid, actorName: member.displayName, action: 'shared_expense_payment_submitted',
        targetType: 'shared_expense_payment', targetId: paymentRef.id,
        summary: `${member.displayName || 'A member'} submitted ${amountMinor / 100} ${paymentData.currency} for checking.`, now,
      });
      const managerUid = String(space.data()?.ownerId || '');
      if (managerUid) createNotification(transaction, { uid: managerUid, spaceId, type: 'shared_expense_payment_waiting', title: 'Payment needs checking', message: `${member.displayName || 'A member'} submitted a payment.`, now });
      result = { paymentId: paymentRef.id, status: 'submitted' };
    } else {
      const allocations = writeSharedExpensePayment({
        transaction, paymentRef, paymentIsNew: true, payment: paymentData, actorUid: uid,
        actorName: member.displayName, candidateRows: candidates, candidateSnapshots, now,
      });
      result = { paymentId: paymentRef.id, status: 'posted', allocations };
    }
    transaction.create(commandRef, { uid, kind: 'submit_shared_expense_payment', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const reviewSharedExpensePayment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const paymentId = stringValue(request.data?.paymentId, 'Payment ID', 80);
  const decision = oneOf(request.data?.decision, sharedExpensePaymentDecisions, 'decision');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const paymentRef = db.collection('sharedExpensePayments').doc(paymentId);
  const pre = await paymentRef.get();
  if (!pre.exists) throw new HttpsError('not-found', 'Payment not found.');
  const payment = pre.data() || {};
  const manager = await requireSpaceManager(String(payment.spaceId), uid);
  const candidates = decision === 'confirmed'
    ? await sharedExpensePaymentCandidates({ spaceId: String(payment.spaceId), fromUid: String(payment.fromUid), toUid: String(payment.toUid), expenseId: payment.expenseId || null })
    : [];
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, current, candidateSnapshots] = await Promise.all([
      transaction.get(commandRef), transaction.get(paymentRef),
      Promise.all(candidates.map(async (row) => ({ share: (await transaction.get(row.shareRef)).data() || {}, expense: (await transaction.get(row.expenseRef)).data() || {} }))),
    ]);
    if (command.exists) return command.data()?.result;
    if (!current.exists || current.data()?.status !== 'submitted') throw new HttpsError('failed-precondition', 'Only a payment waiting for a check can be reviewed.');
    const now = FieldValue.serverTimestamp();
    let result;
    if (decision === 'rejected') {
      transaction.update(paymentRef, { status: 'rejected', reviewNote: note, reviewedAt: now, reviewedBy: uid, updatedAt: now });
      createActivity(transaction, { spaceId: String(payment.spaceId), actorUid: uid, actorName: manager.displayName, action: 'shared_expense_payment_rejected', targetType: 'shared_expense_payment', targetId: paymentId, summary: `Declined ${payment.fromName || 'a member'}'s payment.`, now });
      createNotification(transaction, { uid: String(payment.fromUid), spaceId: String(payment.spaceId), type: 'shared_expense_payment_rejected', title: 'Payment not accepted', message: 'Your shared-expense payment was not accepted.', now });
      result = { paymentId, status: 'rejected' };
    } else {
      if (!candidates.length) throw new HttpsError('failed-precondition', 'The related amount is no longer open.');
      const allocations = writeSharedExpensePayment({ transaction, paymentRef, paymentIsNew: false, payment, actorUid: uid, actorName: manager.displayName, candidateRows: candidates, candidateSnapshots, now });
      result = { paymentId, status: 'posted', allocations };
    }
    transaction.create(commandRef, { uid, kind: 'review_shared_expense_payment', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const reverseSharedExpensePayment = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const paymentId = stringValue(request.data?.paymentId, 'Payment ID', 80);
  const reason = optionalString(request.data?.reason, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const paymentRef = db.collection('sharedExpensePayments').doc(paymentId);
  const pre = await paymentRef.get();
  if (!pre.exists) throw new HttpsError('not-found', 'Payment not found.');
  const payment = pre.data() || {};
  const member = await requireActiveSpaceMember(String(payment.spaceId), uid);
  if (uid !== payment.fromUid && !['owner', 'admin'].includes(String(member.role))) {
    throw new HttpsError('permission-denied', 'Only the person who paid, the Space owner, or an admin can undo this payment.');
  }
  const allocations = Array.isArray(payment.allocations) ? payment.allocations as SharedExpenseAllocation[] : [];
  if (!allocations.length) throw new HttpsError('failed-precondition', 'This payment has no completed amounts to undo.');
  const rows = allocations.map((item) => ({
    allocation: item,
    shareRef: db.collection('sharedExpenseShares').doc(item.shareId),
    expenseRef: db.collection('sharedExpenses').doc(item.expenseId),
  }));
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, current, snapshots] = await Promise.all([
      transaction.get(commandRef), transaction.get(paymentRef),
      Promise.all(rows.map(async (row) => ({ share: (await transaction.get(row.shareRef)).data() || {}, expense: (await transaction.get(row.expenseRef)).data() || {} }))),
    ]);
    if (command.exists) return command.data()?.result;
    if (!current.exists || current.data()?.status !== 'posted') throw new HttpsError('failed-precondition', 'Only a completed payment can be undone.');
    snapshots.forEach((snapshot, index) => {
      if (snapshot.share.lastPaymentId !== paymentId) throw new HttpsError('failed-precondition', 'A newer payment exists. Undo the newest payment first.');
      const allocation = positiveMoney(rows[index].allocation.amountMinor);
      const settled = Math.max(0, safeMinor(snapshot.share.settledMinor, 'Share paid amount') - allocation);
      const shareTotal = positiveMoney(snapshot.share.shareMinor);
      const shareLeft = Math.max(0, shareTotal - settled);
      transaction.update(rows[index].shareRef, { settledMinor: settled, amountLeftMinor: shareLeft, status: settled > 0 ? 'partially_paid' : 'open', lastPaymentId: null, updatedAt: FieldValue.serverTimestamp() });
    });
    const grouped = new Map<string, number>();
    allocations.forEach((item) => grouped.set(item.expenseId, (grouped.get(item.expenseId) || 0) + positiveMoney(item.amountMinor)));
    grouped.forEach((amount, expenseId) => {
      const index = rows.findIndex((row) => row.expenseRef.id === expenseId);
      const expense = snapshots[index].expense;
      const settled = Math.max(0, safeMinor(expense.totalSettledMinor, 'Expense paid amount') - amount);
      const total = positiveMoney(expense.totalMinor);
      const left = Math.max(0, total - settled);
      transaction.update(db.collection('sharedExpenses').doc(expenseId), { totalSettledMinor: settled, amountLeftMinor: left, status: settled > 0 ? 'partially_paid' : 'open', closedAt: null, updatedAt: FieldValue.serverTimestamp() });
    });
    const now = FieldValue.serverTimestamp();
    transaction.update(paymentRef, { status: 'reversed', reversalReason: reason, reversedAt: now, reversedBy: uid, updatedAt: now });
    createActivity(transaction, { spaceId: String(payment.spaceId), actorUid: uid, actorName: member.displayName, action: 'shared_expense_payment_reversed', targetType: 'shared_expense_payment', targetId: paymentId, summary: `Undid ${safeMinor(payment.amountMinor, 'Payment amount') / 100} ${payment.currency} paid by ${payment.fromName || 'a member'}.`, now });
    const result = { paymentId, status: 'reversed' };
    transaction.create(commandRef, { uid, kind: 'reverse_shared_expense_payment', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

async function updateSpaceFundSettingsHandler(request: CallableRequest<Record<string, unknown>>) {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const holderUid = stringValue(request.data?.holderUid, 'Money holder', 128);
  const requestedBudgetMinor = request.data?.budgetMinor;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const manager = await requireSpaceManager(spaceId, uid);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const holderRef = db.collection('spaceMembers').doc(`${spaceId}_${holderUid}`);
  const fundRef = db.collection('spaceFunds').doc(spaceId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, space, holder, fund] = await Promise.all([transaction.get(commandRef), transaction.get(spaceRef), transaction.get(holderRef), transaction.get(fundRef)]);
    if (command.exists) return command.data()?.result;
    const fundMeta = spaceFundMeta(String(space.data()?.type || ''));
    if (!space.exists || !fundMeta || space.data()?.archivedAt) throw new HttpsError('failed-precondition', 'Choose an active Trip, Household, or Custom Space.');
    if (!holder.exists || ['suspended', 'removed'].includes(String(holder.data()?.status || ''))) throw new HttpsError('failed-precondition', `Choose an active member to hold ${fundMeta.title}.`);
    const budgetMinor = fundMeta.kind === 'trip' ? positiveMoney(requestedBudgetMinor) : nonNegativeMoney(requestedBudgetMinor);
    const now = FieldValue.serverTimestamp();
    const contributedMinor = fund.exists ? safeMinor(fund.data()?.contributedMinor, `${fundMeta.title} collected`) : 0;
    const spentMinor = fund.exists ? safeMinor(fund.data()?.spentMinor, `${fundMeta.title} spent`) : 0;
    const values = {
      spaceId,
      kind: fundMeta.kind,
      label: fundMeta.title,
      holderUid,
      holderName: holder.data()?.displayName || '',
      holderEmail: holder.data()?.email || '',
      budgetMinor,
      contributedMinor,
      spentMinor,
      availableMinor: contributedMinor - spentMinor,
      currency: space.data()?.currency || 'BND',
      updatedAt: now,
    };
    if (fund.exists) transaction.update(fundRef, values); else transaction.create(fundRef, { ...values, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'space_fund_settings_updated', targetType: 'space_fund', targetId: spaceId, summary: `Updated ${fundMeta.title} and the person holding the money.`, now });
    const result = { spaceId, kind: fundMeta.kind };
    transaction.create(commandRef, { uid, kind: 'update_space_fund_settings', idempotencyKey: key, result, createdAt: now });
    return result;
  });
}

async function recordSpaceFundContributionHandler(request: CallableRequest<Record<string, unknown>>) {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const memberUid = stringValue(request.data?.memberUid, 'Member ID', 128);
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const contributionDate = localDate(request.data?.contributionDate, 'Contribution date');
  const { paymentMethod, paymentMethodLabel } = paymentMethodValues(request.data || {});
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const actor = await requireActiveSpaceMember(spaceId, uid);
  if (uid !== memberUid && !['owner', 'admin'].includes(String(actor.role))) throw new HttpsError('permission-denied', 'You can record only your own contribution.');
  const spaceRef = db.collection('spaces').doc(spaceId);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${memberUid}`);
  const fundRef = db.collection('spaceFunds').doc(spaceId);
  const contributionRef = db.collection('spaceFundContributions').doc();
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, space, member, fund] = await Promise.all([transaction.get(commandRef), transaction.get(spaceRef), transaction.get(memberRef), transaction.get(fundRef)]);
    if (command.exists) return command.data()?.result;
    const fundMeta = spaceFundMeta(String(space.data()?.type || ''));
    if (!space.exists || !fundMeta || space.data()?.archivedAt) throw new HttpsError('failed-precondition', 'Choose an active Trip, Household, or Custom Space.');
    if (!member.exists || ['suspended', 'removed'].includes(String(member.data()?.status || ''))) throw new HttpsError('failed-precondition', 'Choose an active member.');
    if (!fund.exists) throw new HttpsError('failed-precondition', `Set up ${fundMeta.title} first.`);
    const fundData = fund.data() || {};
    const holderUid = String(fundData.holderUid || '').trim();
    if (!holderUid) throw new HttpsError('failed-precondition', `Set up ${fundMeta.title} first and choose the person holding the money.`);
    const holder = await transaction.get(db.collection('spaceMembers').doc(`${spaceId}_${holderUid}`));
    if (!holder.exists || ['suspended', 'removed'].includes(String(holder.data()?.status || ''))) {
      throw new HttpsError('failed-precondition', `Choose an active member to hold ${fundMeta.title} before adding a contribution.`);
    }
    const now = FieldValue.serverTimestamp();
    const contributedMinor = safeMinor(fundData.contributedMinor, `${fundMeta.title} collected`) + amountMinor;
    const spentMinor = safeMinor(fundData.spentMinor, `${fundMeta.title} spent`);
    transaction.create(contributionRef, {
      displayId: displayId(fundMeta.contributionPrefix),
      spaceId,
      fundKind: fundMeta.kind,
      memberUid,
      memberName: member.data()?.displayName || '',
      memberEmail: member.data()?.email || '',
      amountMinor,
      currency: fundData.currency || 'BND',
      contributionDate,
      paymentMethod,
      paymentMethodLabel,
      note,
      status: 'posted',
      reversedAt: null,
      reversedBy: null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    });
    transaction.update(fundRef, { contributedMinor, availableMinor: contributedMinor - spentMinor, updatedAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: actor.displayName, action: 'space_fund_contribution', targetType: 'space_fund_contribution', targetId: contributionRef.id, summary: `${member.data()?.displayName || 'A member'} added ${amountMinor / 100} ${fundData.currency || 'BND'} to ${fundMeta.title}.`, now });
    createNotification(transaction, { uid: memberUid, spaceId, type: fundMeta.kind === 'trip' ? 'trip_contribution_added' : 'space_fund_contribution_added', title: `${fundMeta.title} contribution added`, message: `${(amountMinor / 100).toFixed(2)} ${fundData.currency || 'BND'} was added for ${member.data()?.displayName || 'you'}.`, targetPath: `/spaces/${spaceId}?tab=${fundMeta.tab}`, actionLabel: `Open ${fundMeta.title}`, now });
    if (holderUid !== memberUid) createNotification(transaction, { uid: holderUid, spaceId, type: fundMeta.kind === 'trip' ? 'trip_contribution_received' : 'space_fund_contribution_received', title: `${fundMeta.title} received`, message: `${member.data()?.displayName || 'A member'} added ${(amountMinor / 100).toFixed(2)} ${fundData.currency || 'BND'}.`, targetPath: `/spaces/${spaceId}?tab=${fundMeta.tab}`, actionLabel: `Open ${fundMeta.title}`, now });
    const result = { contributionId: contributionRef.id, kind: fundMeta.kind };
    transaction.create(commandRef, { uid, kind: 'record_space_fund_contribution', idempotencyKey: key, result, createdAt: now });
    return result;
  });
}

async function reverseSpaceFundContributionHandler(request: CallableRequest<Record<string, unknown>>) {
  const uid = requireAuth(request.auth?.uid);
  const contributionId = stringValue(request.data?.contributionId, 'Contribution ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const contributionRef = db.collection('spaceFundContributions').doc(contributionId);
  const pre = await contributionRef.get();
  if (!pre.exists) throw new HttpsError('not-found', 'Fund contribution not found.');
  const contribution = pre.data() || {};
  const actor = await requireActiveSpaceMember(String(contribution.spaceId), uid);
  if (uid !== contribution.memberUid && !['owner', 'admin'].includes(String(actor.role))) throw new HttpsError('permission-denied', 'Only the member, Space owner, or admin can undo this contribution.');
  const spaceRef = db.collection('spaces').doc(String(contribution.spaceId));
  const fundRef = db.collection('spaceFunds').doc(String(contribution.spaceId));
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, current, space, fund] = await Promise.all([transaction.get(commandRef), transaction.get(contributionRef), transaction.get(spaceRef), transaction.get(fundRef)]);
    if (command.exists) return command.data()?.result;
    const fundMeta = spaceFundMeta(String(space.data()?.type || '')) || { kind: 'group' as const, title: 'Group fund', contributionPrefix: 'GFC', tab: 'group_fund' };
    if (!current.exists || current.data()?.status !== 'posted') throw new HttpsError('failed-precondition', 'This contribution has already been undone.');
    if (!fund.exists) throw new HttpsError('not-found', `${fundMeta.title} record not found.`);
    const amountMinor = positiveMoney(current.data()?.amountMinor);
    const available = safeMinor(fund.data()?.availableMinor, `${fundMeta.title} available`);
    if (available < amountMinor) throw new HttpsError('failed-precondition', `This ${fundMeta.title} has already been spent and cannot be removed.`);
    const contributedMinor = Math.max(0, safeMinor(fund.data()?.contributedMinor, `${fundMeta.title} collected`) - amountMinor);
    const spentMinor = safeMinor(fund.data()?.spentMinor, `${fundMeta.title} spent`);
    const now = FieldValue.serverTimestamp();
    transaction.update(contributionRef, { status: 'reversed', reversedAt: now, reversedBy: uid, updatedAt: now });
    transaction.update(fundRef, { contributedMinor, availableMinor: contributedMinor - spentMinor, updatedAt: now });
    createActivity(transaction, { spaceId: String(contribution.spaceId), actorUid: uid, actorName: actor.displayName, action: 'space_fund_contribution_reversed', targetType: 'space_fund_contribution', targetId: contributionId, summary: `Removed ${amountMinor / 100} ${contribution.currency || 'BND'} from ${fundMeta.title}.`, now });
    const result = { contributionId, status: 'reversed' };
    transaction.create(commandRef, { uid, kind: 'reverse_space_fund_contribution', idempotencyKey: key, result, createdAt: now });
    return result;
  });
}

// New generic callables plus the original Trip-money names for older clients.
export const updateSpaceFundSettings = onCall({ region }, updateSpaceFundSettingsHandler);
export const recordSpaceFundContribution = onCall({ region }, recordSpaceFundContributionHandler);
export const reverseSpaceFundContribution = onCall({ region }, reverseSpaceFundContributionHandler);
export const updateTripMoneySettings = onCall({ region }, updateSpaceFundSettingsHandler);
export const recordTripMoneyContribution = onCall({ region }, recordSpaceFundContributionHandler);
export const reverseTripMoneyContribution = onCall({ region }, reverseSpaceFundContributionHandler);

// v0.11.6 account and personal-data deletion
const accountDeletionCoolingOffDays = 7;
const accountReRegistrationCooldownDays = 30;
const recentAuthenticationSeconds = 5 * 60;
const recentExportMilliseconds = 24 * 60 * 60 * 1000;
const accountDeletionTokenDrainMilliseconds = 2 * 60 * 60 * 1000;
const deletedMemberName = 'Deleted member';

type AccountDeletionBlockerCode = 'space_ownership' | 'trip_fund_holder';
// v0.11.7 recurring ordinary income and expense templates
export const createRecurringTransactionTemplate = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const name = stringValue(request.data?.name, 'Recurring money name', 80);
  const type = oneOf(request.data?.type, recurringTransactionTypes, 'recurring money type');
  const accountId = stringValue(request.data?.accountId, 'Account', 80);
  const spaceId = stringValue(request.data?.spaceId, 'Space', 80);
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const categoryId = stringValue(request.data?.categoryId, 'Category ID', 80);
  const counterparty = optionalString(request.data?.counterparty, 120);
  const note = optionalString(request.data?.note, 500);
  const { paymentMethod, paymentMethodLabel } = paymentMethodValues(request.data || {});
  const frequency = oneOf(request.data?.frequency, recurringTransactionFrequencies, 'repeat frequency');
  const nextRunDate = localDate(request.data?.nextRunDate, 'Next date');
  const endDate = optionalLocalDate(request.data?.endDate, 'End date');
  if (endDate && endDate < nextRunDate) throw new HttpsError('invalid-argument', 'End date must be on or after the next date.');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  const commandRef = recurringCommand(uid, key);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  const accountRef = db.collection('accounts').doc(accountId);
  const customCategoryRef = categoryId.startsWith('custom-') ? db.collection('categories').doc(categoryId) : null;

  return db.runTransaction(async (transaction) => {
    const [command, spaceSnapshot, memberSnapshot, accountSnapshot, customCategorySnapshot] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(spaceRef),
      transaction.get(memberRef),
      transaction.get(accountRef),
      customCategoryRef ? transaction.get(customCategoryRef) : Promise.resolve(null),
    ]);
    if (command.exists) return command.data()?.result;
    if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) throw new HttpsError('failed-precondition', 'The selected Space is unavailable.');
    const member = memberSnapshot.data();
    if (!memberSnapshot.exists || member?.status === 'removed' || member?.status === 'suspended' || member?.canUseAccounts !== true) {
      throw new HttpsError('permission-denied', 'You cannot use Accounts in this Space.');
    }
    const account = assertAccount(accountSnapshot.data(), uid, 'Account');
    const space = spaceSnapshot.data() || {};
    if (account.currency !== space.currency) throw new HttpsError('failed-precondition', 'Account and Space currencies must match.');
    const timezone = typeof space.timezone === 'string' && space.timezone ? space.timezone : 'Asia/Brunei';
    if (nextRunDate < localDateForTimezone(timezone)) throw new HttpsError('invalid-argument', 'Choose today or a future date.');
    const selectedScope: Exclude<CategoryScope, 'both'> = space.type === 'sme' ? 'business' : 'personal';
    const category = categorySnapshotFromData({ categoryId, requiredKind: type, selectedScope, uid, customData: customCategorySnapshot?.data() });
    const ref = db.collection('recurringTransactionTemplates').doc();
    const now = FieldValue.serverTimestamp();
    const preferredDay = recurringDateParts(nextRunDate).day;
    const result = { templateId: ref.id };
    transaction.create(ref, {
      displayId: displayId('RCT'), ownerId: uid, name, type, spaceId, accountId, amountMinor,
      currency: account.currency, categoryId: category.id, category: category.name,
      categoryIcon: category.icon, categoryColor: category.color, categoryScope: category.scope,
      counterparty, note, paymentMethod, paymentMethodLabel, frequency, startDate: nextRunDate, nextRunDate, endDate,
      preferredDay, preferMonthEnd: isMonthEndDate(nextRunDate), timezone, status: 'active',
      generatedCount: 0, skippedCount: 0, lastRunDate: null, lastTransactionId: null,
      lastError: null, pausedAt: null, stoppedAt: null, stoppedPreviousNextRunDate: null,
      completedAt: null, createdAt: now, updatedAt: now,
    });
    transaction.create(commandRef, { uid, kind: 'create_recurring_transaction_template', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const updateRecurringTransactionTemplate = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const templateId = stringValue(request.data?.templateId, 'Recurring money ID', 80);
  const name = stringValue(request.data?.name, 'Recurring money name', 80);
  const type = oneOf(request.data?.type, recurringTransactionTypes, 'recurring money type');
  const accountId = stringValue(request.data?.accountId, 'Account', 80);
  const spaceId = stringValue(request.data?.spaceId, 'Space', 80);
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const categoryId = stringValue(request.data?.categoryId, 'Category ID', 80);
  const counterparty = optionalString(request.data?.counterparty, 120);
  const note = optionalString(request.data?.note, 500);
  const { paymentMethod, paymentMethodLabel } = paymentMethodValues(request.data || {});
  const frequency = oneOf(request.data?.frequency, recurringTransactionFrequencies, 'repeat frequency');
  const nextRunDate = localDate(request.data?.nextRunDate, 'Next date');
  const endDate = optionalLocalDate(request.data?.endDate, 'End date');
  if (endDate && endDate < nextRunDate) throw new HttpsError('invalid-argument', 'End date must be on or after the next date.');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  const ref = db.collection('recurringTransactionTemplates').doc(templateId);
  const commandRef = recurringCommand(uid, key);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  const accountRef = db.collection('accounts').doc(accountId);
  const customCategoryRef = categoryId.startsWith('custom-') ? db.collection('categories').doc(categoryId) : null;

  return db.runTransaction(async (transaction) => {
    const [command, current, spaceSnapshot, memberSnapshot, accountSnapshot, customCategorySnapshot] = await Promise.all([
      transaction.get(commandRef), transaction.get(ref), transaction.get(spaceRef), transaction.get(memberRef), transaction.get(accountRef),
      customCategoryRef ? transaction.get(customCategoryRef) : Promise.resolve(null),
    ]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Recurring money was not found.');
    const currentData = current.data() || {};
    if (currentData.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this recurring money.');
    if (['stopped', 'completed'].includes(String(currentData.status || ''))) throw new HttpsError('failed-precondition', 'Restart this recurring money before editing it.');
    if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) throw new HttpsError('failed-precondition', 'The selected Space is unavailable.');
    const member = memberSnapshot.data();
    if (!memberSnapshot.exists || member?.status === 'removed' || member?.status === 'suspended' || member?.canUseAccounts !== true) throw new HttpsError('permission-denied', 'You cannot use Accounts in this Space.');
    const account = assertAccount(accountSnapshot.data(), uid, 'Account');
    const space = spaceSnapshot.data() || {};
    if (account.currency !== space.currency) throw new HttpsError('failed-precondition', 'Account and Space currencies must match.');
    const timezone = typeof space.timezone === 'string' && space.timezone ? space.timezone : 'Asia/Brunei';
    if (nextRunDate < localDateForTimezone(timezone)) throw new HttpsError('invalid-argument', 'Choose today or a future date.');
    const selectedScope: Exclude<CategoryScope, 'both'> = space.type === 'sme' ? 'business' : 'personal';
    const category = categorySnapshotFromData({ categoryId, requiredKind: type, selectedScope, uid, customData: customCategorySnapshot?.data() });
    const now = FieldValue.serverTimestamp();
    const status = currentData.status === 'paused' ? 'paused' : 'active';
    transaction.update(ref, {
      name, type, spaceId, accountId, amountMinor, currency: account.currency,
      categoryId: category.id, category: category.name, categoryIcon: category.icon,
      categoryColor: category.color, categoryScope: category.scope, counterparty, note, paymentMethod, paymentMethodLabel,
      frequency, nextRunDate, endDate, preferredDay: recurringDateParts(nextRunDate).day,
      preferMonthEnd: isMonthEndDate(nextRunDate), timezone, status, lastError: null, updatedAt: now,
    });
    const result = { templateId, updated: true };
    transaction.create(commandRef, { uid, kind: 'update_recurring_transaction_template', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const manageRecurringTransactionTemplate = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const templateId = stringValue(request.data?.templateId, 'Recurring money ID', 80);
  const action = oneOf(request.data?.action, recurringTransactionActions, 'recurring money action');
  const nextRunDate = action === 'resume' || action === 'restart' ? localDate(request.data?.nextRunDate, 'Next date') : null;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const ref = db.collection('recurringTransactionTemplates').doc(templateId);
  const commandRef = recurringCommand(uid, key);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Recurring money was not found.');
  const data = snapshot.data() as RecurringTemplateRecord;
  if (data.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this recurring money.');

  if ((action === 'resume' || action === 'restart') && nextRunDate) {
    if (nextRunDate < localDateForTimezone(data.timezone || 'Asia/Brunei')) throw new HttpsError('invalid-argument', 'Choose today or a future date.');
    if (data.endDate && nextRunDate > data.endDate) throw new HttpsError('failed-precondition', 'The selected date is after this recurring money ends. Edit the end date first.');
  }
  if (action === 'delete') {
    const used = Number(data.generatedCount || 0) > 0 || await queryHasDocuments(db.collection('recurringTransactionRuns').where('templateId', '==', templateId));
    if (used) throw new HttpsError('failed-precondition', 'This recurring money has saved history. Stop it instead.');
  }

  return db.runTransaction(async (transaction) => {
    const [command, current] = await Promise.all([transaction.get(commandRef), transaction.get(ref)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'Recurring money was not found.');
    const currentData = current.data() as RecurringTemplateRecord;
    const now = FieldValue.serverTimestamp();
    let result: Record<string, unknown> = { templateId, action };

    if (action === 'delete') {
      transaction.delete(ref);
      result = { ...result, deleted: true };
    } else if (action === 'pause') {
      if (currentData.status !== 'active' && currentData.status !== 'needs_attention') throw new HttpsError('failed-precondition', 'Only active recurring money can be paused.');
      transaction.update(ref, { status: 'paused', pausedAt: now, lastError: null, updatedAt: now });
    } else if (action === 'resume' || action === 'restart') {
      if (!nextRunDate) throw new HttpsError('invalid-argument', 'Choose the next date.');
      if (action === 'restart' && !['stopped', 'completed'].includes(currentData.status)) throw new HttpsError('failed-precondition', 'This recurring money has not ended.');
      if (action === 'resume' && !['paused', 'needs_attention'].includes(currentData.status)) throw new HttpsError('failed-precondition', 'This recurring money is not paused.');
      transaction.update(ref, {
        status: 'active', nextRunDate, preferredDay: recurringDateParts(nextRunDate).day,
        preferMonthEnd: isMonthEndDate(nextRunDate), pausedAt: null, stoppedAt: null,
        stoppedPreviousNextRunDate: null, completedAt: null, lastError: null, updatedAt: now,
      });
    } else if (action === 'skip') {
      if (currentData.status !== 'active' || !currentData.nextRunDate) throw new HttpsError('failed-precondition', 'There is no active date to skip.');
      const runRef = db.collection('recurringTransactionRuns').doc(recurringRunId(templateId, currentData.nextRunDate));
      const existingRun = await transaction.get(runRef);
      if (existingRun.exists) throw new HttpsError('already-exists', 'This date has already been handled. Refresh the page.');
      const calculatedNext = addRecurringFrequency(currentData.nextRunDate, currentData.frequency, currentData.preferredDay, currentData.preferMonthEnd);
      const completed = Boolean(currentData.endDate && calculatedNext > currentData.endDate);
      transaction.create(runRef, {
        ownerId: uid, templateId, scheduledDate: currentData.nextRunDate, status: 'skipped',
        transactionId: null, error: null, createdAt: now, updatedAt: now,
      });
      transaction.update(ref, {
        skippedCount: Number(currentData.skippedCount || 0) + 1,
        nextRunDate: completed ? null : calculatedNext,
        status: completed ? 'completed' : 'active', completedAt: completed ? now : null,
        lastError: null, updatedAt: now,
      });
      result = { ...result, skippedDate: currentData.nextRunDate, nextRunDate: completed ? null : calculatedNext };
    } else if (action === 'stop') {
      if (['stopped', 'completed'].includes(currentData.status)) throw new HttpsError('failed-precondition', 'This recurring money has already ended.');
      transaction.update(ref, {
        status: 'stopped', stoppedAt: now, stoppedPreviousNextRunDate: currentData.nextRunDate || null,
        nextRunDate: null, lastError: null, updatedAt: now,
      });
    }
    transaction.create(commandRef, { uid, kind: `recurring_transaction_${action}`, idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

async function markRecurringNeedsAttention(templateId: string, message: string) {
  const ref = db.collection('recurringTransactionTemplates').doc(templateId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return;
    const data = snapshot.data() || {};
    if (data.status === 'stopped' || data.status === 'completed') return;
    const now = FieldValue.serverTimestamp();
    transaction.update(ref, { status: 'needs_attention', lastError: message, updatedAt: now });
    if (data.status !== 'needs_attention') {
      createNotification(transaction, {
        uid: String(data.ownerId || ''), spaceId: String(data.spaceId || ''), type: 'recurring_transaction_attention',
        title: 'Recurring money needs attention', message: `${data.name || 'Recurring money'} could not be posted. ${message}`,
        targetPath: '/recurring', actionLabel: 'Check recurring money', now,
      });
    }
  });
}

async function postRecurringOccurrence(templateId: string, expectedOwnerId?: string) {
  const templateRef = db.collection('recurringTransactionTemplates').doc(templateId);
  const initialSnapshot = await templateRef.get();
  if (!initialSnapshot.exists) throw new HttpsError('not-found', 'Recurring money was not found.');
  const initial = initialSnapshot.data() as RecurringTemplateRecord;
  if (expectedOwnerId && initial.ownerId !== expectedOwnerId) throw new HttpsError('permission-denied', 'You do not own this recurring money.');
  if (initial.status !== 'active') throw new HttpsError('failed-precondition', 'This recurring money is not active.');
  if (!initial.nextRunDate) throw new HttpsError('failed-precondition', 'This recurring money has no next date.');
  const scheduledDate = initial.nextRunDate;
  if (scheduledDate > localDateForTimezone(initial.timezone || 'Asia/Brunei')) throw new HttpsError('failed-precondition', 'This recurring money is not due yet.');

  const accountRef = db.collection('accounts').doc(initial.accountId);
  const spaceRef = db.collection('spaces').doc(initial.spaceId);
  const memberRef = db.collection('spaceMembers').doc(`${initial.spaceId}_${initial.ownerId}`);
  const runRef = db.collection('recurringTransactionRuns').doc(recurringRunId(templateId, scheduledDate));
  const budgetCandidateRefs = initial.type === 'expense'
    ? (await db.collection('budgets').where('ownerId', '==', initial.ownerId).where('spaceId', '==', initial.spaceId).get()).docs.map((item) => item.ref)
    : [];

  return db.runTransaction(async (transaction) => {
    const [currentSnapshot, existingRun, accountSnapshot, spaceSnapshot, memberSnapshot, budgetSnapshots] = await Promise.all([
      transaction.get(templateRef), transaction.get(runRef), transaction.get(accountRef), transaction.get(spaceRef), transaction.get(memberRef),
      Promise.all(budgetCandidateRefs.map((ref) => transaction.get(ref))),
    ]);
    if (existingRun.exists) return { templateId, scheduledDate, transactionId: existingRun.data()?.transactionId || null, duplicate: true };
    if (!currentSnapshot.exists) throw new HttpsError('not-found', 'Recurring money was not found.');
    const current = currentSnapshot.data() as RecurringTemplateRecord;
    if (current.status !== 'active' || current.nextRunDate !== scheduledDate) throw new HttpsError('failed-precondition', 'This recurring date changed. Refresh the page.');
    if (!spaceSnapshot.exists || spaceSnapshot.data()?.archivedAt) throw new HttpsError('failed-precondition', 'The selected Space is archived or unavailable.');
    const member = memberSnapshot.data();
    if (!memberSnapshot.exists || member?.status === 'removed' || member?.status === 'suspended' || member?.canUseAccounts !== true) throw new HttpsError('failed-precondition', 'Account access in this Space is no longer available.');
    const account = assertAccount(accountSnapshot.data(), current.ownerId, 'Account');
    if (account.currency !== current.currency || spaceSnapshot.data()?.currency !== current.currency) throw new HttpsError('failed-precondition', 'The Account or Space currency changed.');
    const amountMinor = positiveMoney(current.amountMinor);
    const transactionRef = db.collection('transactions').doc();
    const now = FieldValue.serverTimestamp();
    const flow = current.type === 'income' ? 'in' : 'out';
    const delta = accountEffect(account.type, flow, amountMinor);
    updateAccountBalance(transaction, accountRef, account, delta);
    const occurrenceKey = `rct-${templateId.slice(0, 20)}-${scheduledDate.replace(/-/g, '')}`;
    const ledgerEntryId = createLedgerEntry(transaction, {
      accountId: current.accountId, ownerId: current.ownerId, spaceId: current.spaceId,
      transactionId: transactionRef.id, entryType: `recurring_${current.type}`, amountMinor: delta,
      currency: current.currency, idempotencyKey: occurrenceKey, now,
    });
    const budgetIds = current.type === 'expense'
      ? matchingBudgetIds(budgetSnapshots, { spaceId: current.spaceId, categoryId: current.categoryId, transactionDate: scheduledDate })
      : [];
    if (budgetIds.length) updateBudgetsSpent(transaction, budgetSnapshots, budgetIds, amountMinor);

    transaction.create(transactionRef, {
      displayId: displayId('TXN'), ownerId: current.ownerId, createdBy: current.ownerId,
      type: current.type, status: 'posted', spaceId: current.spaceId, accountId: current.accountId,
      destinationAccountId: null, amountMinor, currency: current.currency,
      category: current.category, categoryId: current.categoryId, categoryIcon: current.categoryIcon,
      categoryColor: current.categoryColor, categoryScope: current.categoryScope,
      categoryIsSystem: !String(current.categoryId).startsWith('custom-'), counterparty: current.counterparty || '',
      note: current.note || '', paymentMethod: current.paymentMethod || null, paymentMethodLabel: current.paymentMethodLabel || null,
      transactionDate: scheduledDate, reversalOf: null, reversedBy: null,
      budgetIds, commitmentId: null, commitmentPaymentId: null,
      recurringTemplateId: templateId, recurringRunId: runRef.id, recurringScheduledDate: scheduledDate,
      createdAt: now, postedAt: now, updatedAt: now,
    });
    transaction.create(runRef, {
      ownerId: current.ownerId, templateId, scheduledDate, status: 'posted', transactionId: transactionRef.id,
      error: null, createdAt: now, updatedAt: now,
    });
    const calculatedNext = addRecurringFrequency(scheduledDate, current.frequency, current.preferredDay, current.preferMonthEnd);
    const completed = Boolean(current.endDate && calculatedNext > current.endDate);
    transaction.update(templateRef, {
      generatedCount: Number(current.generatedCount || 0) + 1, lastRunDate: scheduledDate,
      lastTransactionId: transactionRef.id, nextRunDate: completed ? null : calculatedNext,
      status: completed ? 'completed' : 'active', completedAt: completed ? now : null,
      lastError: null, updatedAt: now,
    });
    createNotification(transaction, {
      uid: current.ownerId, spaceId: current.spaceId, type: 'recurring_transaction_posted',
      title: 'Recurring money saved', message: `${current.name} was posted for ${scheduledDate}.`,
      targetPath: '/transactions', actionLabel: 'Open money activity', now,
    });
    return { templateId, scheduledDate, transactionId: transactionRef.id, ledgerEntryId, nextRunDate: completed ? null : calculatedNext };
  });
}

export const postDueRecurringTransaction = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const templateId = stringValue(request.data?.templateId, 'Recurring money ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const commandRef = recurringCommand(uid, key);
  const command = await commandRef.get();
  if (command.exists) return command.data()?.result;
  try {
    const result = await postRecurringOccurrence(templateId, uid);
    await commandRef.create({ uid, kind: 'post_due_recurring_transaction', idempotencyKey: key, result, createdAt: FieldValue.serverTimestamp() });
    return result;
  } catch (error) {
    const message = safeRecurringError(error);
    await markRecurringNeedsAttention(templateId, message).catch(() => undefined);
    throw error;
  }
});

export const processRecurringTransactions = onSchedule({
  region,
  schedule: '10 * * * *',
  timeZone: 'Asia/Brunei',
  retryCount: 3,
}, async () => {
  const activeSnapshot = await db.collection('recurringTransactionTemplates').where('status', '==', 'active').limit(200).get();
  let processed = 0;
  for (const item of activeSnapshot.docs) {
    for (let catchUp = 0; catchUp < 12 && processed < 100; catchUp += 1) {
      const current = await item.ref.get();
      if (!current.exists) break;
      const data = current.data() as RecurringTemplateRecord;
      if (data.status !== 'active' || !data.nextRunDate || data.nextRunDate > localDateForTimezone(data.timezone || 'Asia/Brunei')) break;
      try {
        await postRecurringOccurrence(item.id);
        processed += 1;
      } catch (error) {
        const message = safeRecurringError(error);
        console.error(`Recurring transaction failed for ${item.id}.`, error);
        await markRecurringNeedsAttention(item.id, message).catch(() => undefined);
        break;
      }
    }
  }
  console.log(`Processed ${processed} recurring transaction occurrence(s).`);
});


interface AccountDeletionBlocker {
  code: AccountDeletionBlockerCode;
  message: string;
  spaceId?: string;
  spaceName?: string;
}

interface AccountDeletionEligibilityResult {
  eligible: boolean;
  blockers: AccountDeletionBlocker[];
  coolingOffDays: number;
  ownedSpaces: number;
  sharedMemberships: number;
  exportPrepared: boolean;
  exportPreparedAt: string | null;
  exportExpiresAt: string | null;
}

type RegistrationRestrictionMode = 'cooldown' | 'manual_review';
type RegistrationRestrictionReason = 'cooldown' | 'manual_review' | 'already_re_registered' | null;

interface RegistrationEligibilityResult {
  allowed: boolean;
  existingAccount: boolean;
  freshStart: boolean;
  reason: RegistrationRestrictionReason;
  reRegistrationAllowedAt: string | null;
  cooldownDays: number;
  message: string | null;
}

function normalizeRegistrationEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function registrationEmailHash(email: string): string {
  return createHash('sha256').update(`bajetbn-registration-v1:${normalizeRegistrationEmail(email)}`).digest('hex');
}

function registrationDateLabel(milliseconds: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Brunei', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(milliseconds));
}

async function registrationEligibilityForAuthenticatedUser(uid: string, emailValue: unknown): Promise<RegistrationEligibilityResult> {
  const email = normalizeRegistrationEmail(emailValue);
  if (!email) throw new HttpsError('failed-precondition', 'A verified email address is required to use BajetBN.');

  const profileRef = db.collection('users').doc(uid);
  const restrictionRef = db.collection('accountRegistrationRestrictions').doc(registrationEmailHash(email));

  return db.runTransaction(async (transaction) => {
    const [profile, restriction] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(restrictionRef),
    ]);

    if (profile.exists) {
      return {
        allowed: true, existingAccount: true, freshStart: false, reason: null,
        reRegistrationAllowedAt: null, cooldownDays: accountReRegistrationCooldownDays, message: null,
      };
    }

    if (!restriction.exists) {
      return {
        allowed: true, existingAccount: false, freshStart: false, reason: null,
        reRegistrationAllowedAt: null, cooldownDays: accountReRegistrationCooldownDays, message: null,
      };
    }

    const data = restriction.data() || {};
    const restrictionMode = String(data.restrictionMode || 'cooldown') as RegistrationRestrictionMode;
    const reRegisteredUid = typeof data.reRegisteredUid === 'string' ? data.reRegisteredUid : '';
    const approvedAt = timestampMilliseconds(data.manualReviewApprovedAt);
    const allowedAt = timestampMilliseconds(data.reRegistrationAllowedAt);

    if (reRegisteredUid === uid) {
      return {
        allowed: true, existingAccount: false, freshStart: true, reason: null,
        reRegistrationAllowedAt: allowedAt === null ? null : new Date(allowedAt).toISOString(),
        cooldownDays: accountReRegistrationCooldownDays,
        message: 'This is a new BajetBN account. Previous Spaces, balances and memberships are not restored.',
      };
    }

    if (reRegisteredUid && reRegisteredUid !== uid) {
      return {
        allowed: false, existingAccount: false, freshStart: false, reason: 'already_re_registered',
        reRegistrationAllowedAt: allowedAt === null ? null : new Date(allowedAt).toISOString(),
        cooldownDays: accountReRegistrationCooldownDays,
        message: 'This email has already been used to create a new BajetBN account after deletion. Sign in to that account or contact support.',
      };
    }

    if (restrictionMode === 'manual_review' && approvedAt === null) {
      return {
        allowed: false, existingAccount: false, freshStart: false, reason: 'manual_review',
        reRegistrationAllowedAt: null, cooldownDays: accountReRegistrationCooldownDays,
        message: 'This account requires a security review before a new BajetBN account can be created.',
      };
    }

    if (restrictionMode === 'cooldown' && allowedAt !== null && allowedAt > Date.now()) {
      return {
        allowed: false, existingAccount: false, freshStart: false, reason: 'cooldown',
        reRegistrationAllowedAt: new Date(allowedAt).toISOString(),
        cooldownDays: accountReRegistrationCooldownDays,
        message: `This email was linked to a recently deleted BajetBN account. You may create a new account after ${registrationDateLabel(allowedAt)}.`,
      };
    }

    const now = Timestamp.now();
    transaction.set(restrictionRef, {
      status: 'fulfilled',
      reRegisteredUid: uid,
      reRegisteredAt: now,
      updatedAt: now,
    }, { merge: true });

    return {
      allowed: true, existingAccount: false, freshStart: true, reason: null,
      reRegistrationAllowedAt: allowedAt === null ? null : new Date(allowedAt).toISOString(),
      cooldownDays: accountReRegistrationCooldownDays,
      message: 'A completely new BajetBN account will be created. Previous Spaces, balances and memberships will not be restored.',
    };
  });
}

async function removeBlockedRegistrationAuthUser(uid: string) {
  try {
    await getAuth().revokeRefreshTokens(uid);
    await getAuth().deleteUser(uid);
  } catch (error) {
    if (!authUserMissing(error)) throw error;
  }
}

interface MutationPlan {
  sets: Map<string, { ref: DocumentReference; data: DocumentData }>;
  updates: Map<string, { ref: DocumentReference; data: DocumentData }>;
  deletes: Map<string, DocumentReference>;
}

function requireRecentAuthentication(authTime: unknown) {
  if (!Number.isFinite(authTime)) throw new HttpsError('unauthenticated', 'Sign in again before deleting your account.');
  const ageSeconds = Math.floor(Date.now() / 1000) - Number(authTime);
  if (ageSeconds < 0 || ageSeconds > recentAuthenticationSeconds) {
    throw new HttpsError('unauthenticated', 'Confirm your sign-in again before deleting your account.');
  }
}

function timestampMilliseconds(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return Number((value as { toMillis: () => number }).toMillis());
  }
  return null;
}

function accountDeletionRequestResult(uid: string, data: DocumentData): DocumentData {
  return {
    uid,
    status: data.status,
    requestedAt: data.requestedAt || null,
    scheduledFor: data.scheduledFor || null,
    cancelledAt: data.cancelledAt || null,
    processingAt: data.processingAt || null,
    blockedAt: data.blockedAt || null,
    failedAt: data.failedAt || null,
    updatedAt: data.updatedAt || null,
    blockers: Array.isArray(data.blockers) ? data.blockers : [],
    lastError: data.lastError || null,
  };
}

async function accountDeletionEligibility(uid: string): Promise<AccountDeletionEligibilityResult> {
  const [profile, ownedSpaces, memberships, heldFunds] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('spaces').where('ownerId', '==', uid).get(),
    db.collection('spaceMembers').where('uid', '==', uid).get(),
    db.collection('spaceFunds').where('holderUid', '==', uid).get(),
  ]);

  const blockers: AccountDeletionBlocker[] = [];
  const membershipSpaces = new Set(memberships.docs.map((item) => String(item.data().spaceId || '')).filter(Boolean));

  const ownershipChecks = await Promise.all(ownedSpaces.docs.map(async (space) => {
    const members = await db.collection('spaceMembers').where('spaceId', '==', space.id).get();
    const otherMembers = members.docs.filter((item) => String(item.data().uid || '') !== uid);
    return { space, otherMembers };
  }));

  for (const { space, otherMembers } of ownershipChecks) {
    if (!otherMembers.length) continue;
    const data = space.data();
    blockers.push({
      code: 'space_ownership',
      spaceId: space.id,
      spaceName: String(data.name || 'Shared Space'),
      message: `${String(data.name || 'A shared Space')} still has other member records. Transfer ownership or resolve the Space before deleting your account.`,
    });
  }

  for (const fund of heldFunds.docs) {
    const spaceId = fund.id;
    const space = await db.collection('spaces').doc(spaceId).get();
    if (!space.exists || String(space.data()?.ownerId || '') === uid) continue;
    blockers.push({
      code: 'trip_fund_holder',
      spaceId,
      spaceName: String(space.data()?.name || 'Trip Space'),
      message: `You are holding collected group money for ${String(space.data()?.name || 'a shared Space')}. Ask the Space owner to choose another holder first.`,
    });
  }

  const exportAtMillis = timestampMilliseconds(profile.data()?.lastDataExportAt);
  const exportPrepared = exportAtMillis !== null && Date.now() - exportAtMillis <= recentExportMilliseconds;
  const exportExpiresAt = exportAtMillis === null ? null : new Date(exportAtMillis + recentExportMilliseconds).toISOString();

  return {
    eligible: blockers.length === 0,
    blockers,
    coolingOffDays: accountDeletionCoolingOffDays,
    ownedSpaces: ownedSpaces.size,
    sharedMemberships: Array.from(membershipSpaces).filter((spaceId) => !ownedSpaces.docs.some((item) => item.id === spaceId)).length,
    exportPrepared,
    exportPreparedAt: exportAtMillis === null ? null : new Date(exportAtMillis).toISOString(),
    exportExpiresAt,
  };
}

export const enforceRegistrationEligibility = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const result = await registrationEligibilityForAuthenticatedUser(uid, request.auth?.token.email);
  if (!result.allowed) {
    await removeBlockedRegistrationAuthUser(uid);
    throw new HttpsError('failed-precondition', result.message || 'This email cannot create a BajetBN account yet.', result);
  }
  return result;
});

export const checkAccountDeletionEligibility = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  return accountDeletionEligibility(uid);
});

export const recordAccountDataExport = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const userRef = db.collection('users').doc(uid);
  if (!(await userRef.get()).exists) throw new HttpsError('not-found', 'Your BajetBN profile was not found.');
  await userRef.update({ lastDataExportAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { recorded: true };
});

export const requestAccountDeletion = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  requireRecentAuthentication(request.auth?.token.auth_time);
  if (request.data?.confirmation !== 'DELETE') throw new HttpsError('invalid-argument', 'Type DELETE to confirm.');
  if (request.data?.exportAcknowledged !== true) throw new HttpsError('failed-precondition', 'Download your data before continuing.');
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const userRef = db.collection('users').doc(uid);
  const requestRef = db.collection('accountDeletionRequests').doc(uid);
  const commandRef = db.collection('accountDeletionCommands').doc(commandId(uid, key));
  const [userSnapshot, currentRequest, commandSnapshot, eligibility] = await Promise.all([
    userRef.get(), requestRef.get(), commandRef.get(), accountDeletionEligibility(uid),
  ]);
  if (commandSnapshot.exists) return commandSnapshot.data()?.result;
  if (!userSnapshot.exists) throw new HttpsError('not-found', 'Your BajetBN profile was not found.');
  if (currentRequest.exists && ['pending', 'processing'].includes(String(currentRequest.data()?.status || ''))) {
    return accountDeletionRequestResult(uid, currentRequest.data() || {});
  }
  if (!eligibility.eligible) {
    throw new HttpsError('failed-precondition', 'Resolve the shared-Space items shown before deleting your account.', { blockers: eligibility.blockers });
  }
  if (!eligibility.exportPrepared) {
    throw new HttpsError('failed-precondition', 'Download a current copy of your data before requesting deletion.');
  }

  const requestedAt = Timestamp.now();
  const scheduledFor = Timestamp.fromMillis(requestedAt.toMillis() + accountDeletionCoolingOffDays * 24 * 60 * 60 * 1000);
  const result = {
    uid,
    status: 'pending',
    requestedAt,
    scheduledFor,
    cancelledAt: null,
    processingAt: null,
    blockedAt: null,
    failedAt: null,
    blockers: [],
    lastError: null,
  };

  await db.runTransaction(async (transaction) => {
    const [latestUser, latestRequest, command] = await Promise.all([
      transaction.get(userRef), transaction.get(requestRef), transaction.get(commandRef),
    ]);
    if (command.exists) return;
    if (!latestUser.exists) throw new HttpsError('not-found', 'Your BajetBN profile was not found.');
    if (latestRequest.exists && ['pending', 'processing'].includes(String(latestRequest.data()?.status || ''))) return;
    transaction.set(requestRef, {
      ...result,
      idempotencyKey: key,
      requestVersion: 1,
      eligibilitySnapshot: eligibility,
      updatedAt: requestedAt,
    });
    transaction.update(userRef, {
      accountDeletionStatus: 'pending',
      accountDeletionScheduledFor: scheduledFor,
      updatedAt: requestedAt,
    });
    transaction.create(db.collection('accountDeletionAudit').doc(), {
      subjectId: uid,
      action: 'requested',
      requestedAt,
      scheduledFor,
      requestVersion: 1,
      createdAt: requestedAt,
    });
    transaction.create(commandRef, { uid, kind: 'request_account_deletion', idempotencyKey: key, result, createdAt: requestedAt });
  });

  return result;
});

export const cancelAccountDeletion = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const userRef = db.collection('users').doc(uid);
  const requestRef = db.collection('accountDeletionRequests').doc(uid);
  const commandRef = db.collection('accountDeletionCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [current, command, user] = await Promise.all([
      transaction.get(requestRef), transaction.get(commandRef), transaction.get(userRef),
    ]);
    if (command.exists) return command.data()?.result;
    if (!current.exists) throw new HttpsError('not-found', 'No account deletion request was found.');
    const status = String(current.data()?.status || '');
    const authenticationDisabled = timestampMilliseconds(current.data()?.authDisabledAt) !== null;
    if (!['pending', 'blocked', 'failed'].includes(status) || authenticationDisabled) {
      throw new HttpsError('failed-precondition', 'This deletion request can no longer be cancelled.');
    }
    const now = Timestamp.now();
    const result = { cancelled: true };
    transaction.update(requestRef, { status: 'cancelled', cancelledAt: now, updatedAt: now, blockers: [], lastError: null });
    if (user.exists) transaction.update(userRef, {
      accountDeletionStatus: FieldValue.delete(),
      accountDeletionScheduledFor: FieldValue.delete(),
      updatedAt: now,
    });
    transaction.create(db.collection('accountDeletionAudit').doc(), {
      subjectId: uid,
      action: 'cancelled',
      requestId: requestRef.id,
      createdAt: now,
    });
    transaction.create(commandRef, { uid, kind: 'cancel_account_deletion', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

function createMutationPlan(): MutationPlan {
  return { sets: new Map(), updates: new Map(), deletes: new Map() };
}

function queueSet(plan: MutationPlan, ref: DocumentReference, data: DocumentData) {
  if (plan.deletes.has(ref.path)) return;
  plan.sets.set(ref.path, { ref, data: { ...(plan.sets.get(ref.path)?.data || {}), ...data } });
}

function queueUpdate(plan: MutationPlan, ref: DocumentReference, data: DocumentData) {
  if (plan.deletes.has(ref.path)) return;
  plan.updates.set(ref.path, { ref, data: { ...(plan.updates.get(ref.path)?.data || {}), ...data } });
}

function queueDelete(plan: MutationPlan, ref: DocumentReference) {
  plan.sets.delete(ref.path);
  plan.updates.delete(ref.path);
  plan.deletes.set(ref.path, ref);
}

async function commitMutationPlan(plan: MutationPlan) {
  const writer = db.bulkWriter();
  for (const item of plan.sets.values()) writer.set(item.ref, item.data, { merge: true });
  for (const item of plan.updates.values()) writer.update(item.ref, item.data);
  for (const ref of plan.deletes.values()) writer.delete(ref);
  await writer.close();
}

async function documentsWhere(collectionName: string, field: string, value: string): Promise<QueryDocumentSnapshot[]> {
  return (await db.collection(collectionName).where(field, '==', value).get()).docs;
}

function addProofPath(paths: Set<string>, data: DocumentData) {
  for (const field of ['proofPath', 'paymentProofPath', 'storagePath']) {
    const value = data[field];
    if (typeof value === 'string' && value.trim()) paths.add(value.trim());
  }
}

function anonymizedReferenceUpdates(anonymousId: string, now: Timestamp): DocumentData {
  return { privacyAnonymizedAt: now, privacyAnonymousId: anonymousId, updatedAt: now };
}

async function queueFieldAnonymization(input: {
  plan: MutationPlan;
  collectionName: string;
  field: string;
  uid: string;
  updates: (data: DocumentData) => DocumentData;
  proofPaths?: Set<string>;
}) {
  const rows = await documentsWhere(input.collectionName, input.field, input.uid);
  for (const row of rows) {
    if (input.proofPaths) addProofPath(input.proofPaths, row.data());
    queueUpdate(input.plan, row.ref, input.updates(row.data()));
  }
}


function anonymousSharedBillAssignmentId(anonymousId: string, originalId: string): string {
  const digest = createHash('sha256').update(`${anonymousId}:${originalId}`).digest('hex').slice(0, 24);
  return `deleted-assignment-${digest}`;
}

async function queueSharedBillAssignmentAnonymization(input: {
  plan: MutationPlan;
  uid: string;
  anonymousId: string;
  now: Timestamp;
  proofPaths: Set<string>;
}) {
  const assignments = await documentsWhere('sharedBillAssignments', 'memberUid', input.uid);
  for (const assignment of assignments) {
    const data = assignment.data();
    addProofPath(input.proofPaths, data);
    const replacementRef = db.collection('sharedBillAssignments').doc(anonymousSharedBillAssignmentId(input.anonymousId, assignment.id));
    queueSet(input.plan, replacementRef, {
      ...data,
      memberUid: input.anonymousId,
      memberName: deletedMemberName,
      memberEmail: '',
      note: '',
      proofPath: null,
      proofName: null,
      ...anonymizedReferenceUpdates(input.anonymousId, input.now),
    });
    queueDelete(input.plan, assignment.ref);

    for (const payment of await documentsWhere('sharedBillPayments', 'assignmentId', assignment.id)) {
      queueUpdate(input.plan, payment.ref, { assignmentId: replacementRef.id, ...anonymizedReferenceUpdates(input.anonymousId, input.now) });
    }
    for (const reversal of await documentsWhere('sharedBillPaymentReversals', 'assignmentId', assignment.id)) {
      queueUpdate(input.plan, reversal.ref, { assignmentId: replacementRef.id, ...anonymizedReferenceUpdates(input.anonymousId, input.now) });
    }
    for (const transaction of await documentsWhere('transactions', 'sharedBillAssignmentId', assignment.id)) {
      queueUpdate(input.plan, transaction.ref, { sharedBillAssignmentId: replacementRef.id, ...anonymizedReferenceUpdates(input.anonymousId, input.now) });
    }
    for (const activity of await documentsWhere('spaceActivities', 'targetId', assignment.id)) {
      queueUpdate(input.plan, activity.ref, { targetId: replacementRef.id, ...anonymizedReferenceUpdates(input.anonymousId, input.now) });
    }
  }
}

async function queueOwnedSpaceDeletion(plan: MutationPlan, spaceId: string, proofPaths: Set<string>) {
  const collections = [
    'transactions', 'budgets', 'goals', 'commitments', 'sharedBillAssignments', 'sharedBillPayments',
    'sharedBillPaymentReversals', 'spaceActivities', 'tripItineraryItems', 'tripTasks', 'tripBookings', 'spaceWorkItems', 'sharedExpenses', 'sharedExpenseShares',
    'sharedExpensePayments', 'spaceFundContributions', 'spaceInvitations', 'spaceMembers',
    'userNotifications', 'reminderHistory', 'recurringTransactionTemplates', 'recurringTransactionRuns',
    'transactionAttachments', 'collectionItems', 'collectionItemMovements', 'smePosAccess', 'smePosProducts', 'smePosCustomers',
    'smePosSellers', 'smePosListings', 'smePosSales', 'smePosReturns', 'smePosSellerLedger', 'smePosPayouts', 'smePosReservations', 'smePosCommands',
  ];
  for (const collectionName of collections) {
    const rows = await documentsWhere(collectionName, 'spaceId', spaceId);
    for (const row of rows) {
      const rowData = row.data();
      addProofPath(proofPaths, rowData);
      if (collectionName === 'spaceWorkItems' && rowData.photoPath) {
        const workPhotoPath = String(rowData.photoPath || '');
        if (workPhotoPath.startsWith('spaces/' + spaceId + '/work-items/')) proofPaths.add(workPhotoPath);
      }
      if (collectionName === 'collectionItems' && Array.isArray(rowData.photos)) {
        for (const photo of rowData.photos as unknown[]) {
          if (!photo || typeof photo !== 'object') continue;
          const storagePath = String((photo as { storagePath?: unknown }).storagePath || '');
          if (storagePath.startsWith(`spaces/${spaceId}/collection-items/`)) {
            // Collection photo path retained for Storage privacy cleanup.
            proofPaths.add(storagePath);
          }
        }
      }
      queueDelete(plan, row.ref);
    }
  }
  queueDelete(plan, db.collection('smePosSettings').doc(spaceId));
  queueDelete(plan, db.collection('spaceFunds').doc(spaceId));
  queueDelete(plan, db.collection('spaces').doc(spaceId));
}

function authUserMissing(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && String((error as { code?: unknown }).code) === 'auth/user-not-found');
}

function safeDeletionError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 300);
  return 'Account deletion could not be completed automatically.';
}

async function deleteStorageForAccount(uid: string, proofPaths: Set<string>) {
  const bucket = getStorage().bucket();
  await bucket.deleteFiles({ prefix: `users/${uid}/` });
  const paths = Array.from(proofPaths).filter((item) => !item.startsWith(`users/${uid}/`));
  for (let index = 0; index < paths.length; index += 20) {
    await Promise.all(paths.slice(index, index + 20).map(async (filePath) => {
      try { await bucket.file(filePath).delete({ ignoreNotFound: true }); }
      catch (error) { console.error(`Unable to delete privacy file ${filePath}.`, error); }
    }));
  }
}

async function finalizeAccountDeletion(uid: string) {
  const requestRef = db.collection('accountDeletionRequests').doc(uid);
  const userRef = db.collection('users').doc(uid);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) return { skipped: true };
  const requestData = requestSnapshot.data() || {};
  if (requestData.status === 'cancelled') return { skipped: true };
  const scheduledFor = timestampMilliseconds(requestData.scheduledFor);
  if (scheduledFor !== null && scheduledFor > Date.now()) return { skipped: true };

  const eligibility = await accountDeletionEligibility(uid);
  if (!eligibility.eligible) {
    const now = Timestamp.now();
    await requestRef.set({ status: 'blocked', blockers: eligibility.blockers, blockedAt: now, updatedAt: now, lastError: 'Shared-Space responsibilities must be resolved first.' }, { merge: true });
    if ((await userRef.get()).exists) await userRef.update({ accountDeletionStatus: 'blocked', updatedAt: now });
    return { blocked: true };
  }

  const now = Timestamp.now();
  const anonymousId = typeof requestData.anonymousId === 'string' && requestData.anonymousId
    ? requestData.anonymousId
    : `deleted-${randomBytes(10).toString('hex')}`;
  const authDisabledAt = timestampMilliseconds(requestData.authDisabledAt);
  const cleanupAfter = timestampMilliseconds(requestData.cleanupAfter);

  if (authDisabledAt === null) {
    try {
      await getAuth().updateUser(uid, { disabled: true });
      await getAuth().revokeRefreshTokens(uid);
    } catch (error) {
      if (!authUserMissing(error)) throw error;
    }
    const disabledAt = Timestamp.now();
    const nextCleanupAt = Timestamp.fromMillis(disabledAt.toMillis() + accountDeletionTokenDrainMilliseconds);
    await requestRef.set({
      status: 'processing',
      processingAt: requestData.processingAt || disabledAt,
      authDisabledAt: disabledAt,
      cleanupAfter: nextCleanupAt,
      anonymousId,
      blockers: [],
      lastError: null,
      updatedAt: disabledAt,
    }, { merge: true });
    if ((await userRef.get()).exists) await userRef.update({ accountDeletionStatus: 'processing', updatedAt: disabledAt });
    return { processing: true, cleanupAfter: nextCleanupAt };
  }

  if (cleanupAfter !== null && cleanupAfter > Date.now()) return { processing: true, waitingForTokenExpiry: true };

  await requestRef.set({ status: 'processing', processingAt: requestData.processingAt || now, anonymousId, blockers: [], lastError: null, updatedAt: now }, { merge: true });
  if ((await userRef.get()).exists) await userRef.update({ accountDeletionStatus: 'processing', updatedAt: now });

  try {
    const plan = createMutationPlan();
    const proofPaths = new Set<string>();
    const [profile, ownedSpaces, memberships, authRecord] = await Promise.all([
      userRef.get(),
      db.collection('spaces').where('ownerId', '==', uid).get(),
      db.collection('spaceMembers').where('uid', '==', uid).get(),
      getAuth().getUser(uid).catch((error) => {
        if (authUserMissing(error)) return null;
        throw error;
      }),
    ]);
    const email = normalizeRegistrationEmail(profile.data()?.email || authRecord?.email || '');
    const emailHash = email ? registrationEmailHash(email) : '';
    const registrationRestrictionRef = emailHash ? db.collection('accountRegistrationRestrictions').doc(emailHash) : null;
    const existingRegistrationRestriction = registrationRestrictionRef ? await registrationRestrictionRef.get() : null;
    const preserveManualReview = String(existingRegistrationRestriction?.data()?.restrictionMode || '') === 'manual_review';
    const ownedSpaceIds = new Set(ownedSpaces.docs.map((item) => item.id));

    for (const space of ownedSpaces.docs) await queueOwnedSpaceDeletion(plan, space.id, proofPaths);

    for (const membership of memberships.docs) {
      const data = membership.data();
      const spaceId = String(data.spaceId || '');
      if (ownedSpaceIds.has(spaceId)) continue;
      const replacementRef = db.collection('spaceMembers').doc(`${spaceId}_${anonymousId}`);
      queueSet(plan, replacementRef, {
        ...data,
        uid: anonymousId,
        role: 'member',
        status: 'removed',
        displayName: deletedMemberName,
        email: '',
        canUseAccounts: false,
        canViewBalances: false,
        canViewLedger: false,
        privacyAnonymizedAt: now,
        updatedAt: now,
      });
      queueDelete(plan, membership.ref);
    }

    const ownedAccounts = await documentsWhere('accounts', 'ownerId', uid);
    for (const account of ownedAccounts) {
      queueDelete(plan, account.ref);
      for (const access of await documentsWhere('accountAccess', 'accountId', account.id)) queueDelete(plan, access.ref);
    }

    for (const collectionName of ['accounts', 'ledgerEntries', 'transactions', 'transactionAttachments', 'budgets', 'goals', 'goalContributions', 'categories', 'recurringTransactionTemplates', 'recurringTransactionRuns']) {
      for (const row of await documentsWhere(collectionName, 'ownerId', uid)) {
        addProofPath(proofPaths, row.data());
        queueDelete(plan, row.ref);
      }
    }
    for (const row of await documentsWhere('accountAccess', 'uid', uid)) queueDelete(plan, row.ref);
    for (const row of await documentsWhere('smePosAccess', 'uid', uid)) queueDelete(plan, row.ref);

    const preservedCommitmentIds = new Set<string>();
    for (const commitment of await documentsWhere('commitments', 'ownerId', uid)) {
      const data = commitment.data();
      if (ownedSpaceIds.has(String(data.spaceId || ''))) {
        queueDelete(plan, commitment.ref);
      } else {
        preservedCommitmentIds.add(commitment.id);
        queueUpdate(plan, commitment.ref, {
          ownerId: anonymousId,
          payee: '',
          note: '',
          accountId: null,
          status: 'completed',
          nextDueDate: null,
          stoppedAt: now,
          ...anonymizedReferenceUpdates(anonymousId, now),
        });
      }
    }

    for (const payment of await documentsWhere('commitmentPayments', 'ownerId', uid)) {
      const data = payment.data();
      if (preservedCommitmentIds.has(String(data.commitmentId || ''))) {
        queueUpdate(plan, payment.ref, {
          ownerId: anonymousId,
          transactionId: null,
          paidByUid: data.paidByUid === uid ? anonymousId : data.paidByUid || null,
          ...anonymizedReferenceUpdates(anonymousId, now),
        });
      } else queueDelete(plan, payment.ref);
    }

    for (const collectionName of ['userNotifications', 'reminderHistory', 'pushDevices', 'financialCommands', 'collaborationCommands', 'lifecycleCommands', 'smePosCommands', 'accountDeletionCommands']) {
      for (const row of await documentsWhere(collectionName, 'uid', uid)) queueDelete(plan, row.ref);
    }

    if (email) {
      for (const invitation of await documentsWhere('spaceInvitations', 'email', email)) {
        if (ownedSpaceIds.has(String(invitation.data().spaceId || ''))) continue;
        queueUpdate(plan, invitation.ref, {
          email: '', token: '', status: invitation.data().status === 'pending' ? 'declined' : invitation.data().status,
          declinedBy: invitation.data().status === 'pending' ? anonymousId : invitation.data().declinedBy || null,
          ...anonymizedReferenceUpdates(anonymousId, now),
        });
      }
    }

    await queueFieldAnonymization({ plan, collectionName: 'spaceMembers', field: 'invitedBy', uid, updates: () => ({ invitedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceInvitations', field: 'invitedBy', uid, updates: () => ({ invitedBy: anonymousId, invitedByName: deletedMemberName, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceInvitations', field: 'acceptedBy', uid, updates: () => ({ acceptedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceInvitations', field: 'declinedBy', uid, updates: () => ({ declinedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });

    await queueSharedBillAssignmentAnonymization({ plan, uid, anonymousId, now, proofPaths });
    await queueFieldAnonymization({ plan, collectionName: 'sharedBillAssignments', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedBillAssignments', field: 'reviewedBy', uid, updates: () => ({ reviewedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });

    await queueFieldAnonymization({ plan, collectionName: 'sharedBillPayments', field: 'memberUid', uid, proofPaths, updates: () => ({ memberUid: anonymousId, memberName: deletedMemberName, memberEmail: '', accountId: null, transactionId: null, ledgerEntryId: null, proofPath: null, proofName: null, note: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedBillPayments', field: 'reviewedBy', uid, updates: () => ({ reviewedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedBillPayments', field: 'reversedBy', uid, updates: () => ({ reversedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedBillPaymentReversals', field: 'memberUid', uid, updates: () => ({ memberUid: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedBillPaymentReversals', field: 'reversedBy', uid, updates: () => ({ reversedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });

    await queueFieldAnonymization({ plan, collectionName: 'tripItineraryItems', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'tripBookings', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'tripTasks', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'tripTasks', field: 'assigneeUid', uid, updates: () => ({ assigneeUid: anonymousId, assigneeName: deletedMemberName, assigneeEmail: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'tripTasks', field: 'completedBy', uid, updates: () => ({ completedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceWorkItems', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceWorkItems', field: 'assigneeUid', uid, updates: () => ({ assigneeUid: anonymousId, assigneeName: deletedMemberName, assigneeEmail: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceWorkItems', field: 'completedBy', uid, updates: () => ({ completedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceAnnouncements', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, createdByName: deletedMemberName, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spacePolls', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, createdByName: deletedMemberName, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spacePollVotes', field: 'uid', uid, updates: () => ({ uid: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceApprovals', field: 'requestedBy', uid, updates: () => ({ requestedBy: anonymousId, requestedByName: deletedMemberName, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceApprovals', field: 'reviewedBy', uid, updates: () => ({ reviewedBy: anonymousId, reviewedByName: deletedMemberName, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceMessages', field: 'senderUid', uid, proofPaths, updates: () => ({ senderUid: anonymousId, storagePath: null, fileName: null, contentType: null, sizeBytes: null, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceActivities', field: 'actorUid', uid, updates: () => ({ actorUid: anonymousId, actorName: deletedMemberName, summary: 'Activity retained after a member deleted their account.', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceActivities', field: 'targetId', uid, updates: () => ({ targetId: anonymousId, summary: 'Member-related activity retained after account deletion.', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpenses', field: 'paidByUid', uid, updates: () => ({ paidByUid: anonymousId, paidByName: deletedMemberName, paidByEmail: '', note: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpenses', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'collectionItems', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'collectionItemMovements', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpenseShares', field: 'memberUid', uid, updates: () => ({ memberUid: anonymousId, memberName: deletedMemberName, memberEmail: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpensePayments', field: 'fromUid', uid, proofPaths, updates: () => ({ fromUid: anonymousId, fromName: deletedMemberName, fromEmail: '', proofPath: null, proofName: null, note: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpensePayments', field: 'toUid', uid, proofPaths, updates: () => ({ toUid: anonymousId, toName: deletedMemberName, toEmail: '', proofPath: null, proofName: null, note: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpensePayments', field: 'reviewedBy', uid, updates: () => ({ reviewedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpensePayments', field: 'reversedBy', uid, updates: () => ({ reversedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceFundContributions', field: 'memberUid', uid, updates: () => ({ memberUid: anonymousId, memberName: deletedMemberName, memberEmail: '', note: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceFundContributions', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceFundContributions', field: 'reversedBy', uid, updates: () => ({ reversedBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'commitmentPayments', field: 'paidByUid', uid, updates: () => ({ paidByUid: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'transactions', field: 'createdBy', uid, updates: (data) => ({ createdBy: anonymousId, note: data.ownerId === uid ? data.note || '' : '', ...anonymizedReferenceUpdates(anonymousId, now) }) });

    for (const audit of await documentsWhere('accountDeletionAudit', 'subjectId', uid)) {
      queueUpdate(plan, audit.ref, { subjectId: anonymousId, anonymizedAt: now });
    }

    await commitMutationPlan(plan);
    await deleteStorageForAccount(uid, proofPaths);

    try { await getAuth().deleteUser(uid); }
    catch (error) { if (!authUserMissing(error)) throw error; }

    const finalWriter = db.bulkWriter();
    const reRegistrationAllowedAt = Timestamp.fromMillis(now.toMillis() + accountReRegistrationCooldownDays * 24 * 60 * 60 * 1000);
    if (registrationRestrictionRef) {
      finalWriter.set(registrationRestrictionRef, {
        emailHash,
        restrictionMode: preserveManualReview ? 'manual_review' : 'cooldown',
        status: 'active',
        deletionType: 'user_requested',
        completedAt: now,
        reRegistrationAllowedAt: preserveManualReview ? null : reRegistrationAllowedAt,
        manualReviewRequired: preserveManualReview,
        previousAnonymousId: anonymousId,
        policyVersion: 1,
        updatedAt: now,
      }, { merge: true });
    }
    finalWriter.set(db.collection('deletedUsers').doc(anonymousId), {
      anonymousId,
      deletionVersion: 1,
      completedAt: now,
      retainedSharedHistory: true,
      source: 'self_service_account_deletion',
      emailHash: emailHash || null,
      reRegistrationPolicy: preserveManualReview ? 'manual_review' : 'automatic_after_cooldown',
      reRegistrationAllowedAt: preserveManualReview ? null : reRegistrationAllowedAt,
    });
    finalWriter.set(db.collection('accountDeletionAudit').doc(), {
      subjectId: anonymousId,
      action: 'completed',
      deletionVersion: 1,
      completedAt: now,
      privateDataDeleted: true,
      sharedHistoryAnonymized: true,
      createdAt: now,
    });
    finalWriter.delete(userRef);
    finalWriter.delete(requestRef);
    await finalWriter.close();
    return { completed: true, anonymousId };
  } catch (error) {
    const message = safeDeletionError(error);
    console.error(`Account deletion failed for ${uid}.`, error);
    await requestRef.set({ status: 'failed', failedAt: Timestamp.now(), updatedAt: Timestamp.now(), lastError: message }, { merge: true });
    const userSnapshot = await userRef.get();
    if (userSnapshot.exists) await userRef.update({ accountDeletionStatus: 'failed', updatedAt: Timestamp.now() });
    throw error;
  }
}

export const processAccountDeletionRequests = onSchedule({
  region,
  schedule: '15 * * * *',
  timeZone: 'Asia/Brunei',
  retryCount: 3,
}, async () => {
  const snapshot = await db.collection('accountDeletionRequests').get();
  const due = snapshot.docs.filter((item) => {
    const data = item.data();
    if (!['pending', 'processing', 'blocked', 'failed'].includes(String(data.status || ''))) return false;
    const scheduledFor = timestampMilliseconds(data.scheduledFor);
    return scheduledFor === null || scheduledFor <= Date.now();
  }).slice(0, 10);

  for (const request of due) {
    try { await finalizeAccountDeletion(request.id); }
    catch (error) { console.error(`Scheduled deletion retry failed for ${request.id}.`, error); }
  }
});


/* =========================================================
   v1.8.0 Slice 2A - Household / SME Tasks + To-Buy
   ========================================================= */

type SpaceWorkActor = {
  space: DocumentData;
  member: DocumentData;
};

async function requireSpaceWorkActor(
  spaceId: string,
  uid: string,
): Promise<SpaceWorkActor> {
  const [spaceSnapshot, memberSnapshot] = await Promise.all([
    db.collection('spaces').doc(spaceId).get(),
    db.collection('spaceMembers').doc(spaceId + '_' + uid).get(),
  ]);

  if (!spaceSnapshot.exists) {
    throw new HttpsError('not-found', 'Space was not found.');
  }

  const space = spaceSnapshot.data() || {};

  if (space.archivedAt) {
    throw new HttpsError(
      'failed-precondition',
      'Archived Spaces cannot change Tasks or To-Buy items.',
    );
  }

  if (!['household', 'sme'].includes(String(space.type || ''))) {
    throw new HttpsError(
      'failed-precondition',
      'Tasks and To-Buy in this workflow are available for Household and SME Spaces.',
    );
  }

  if (
    !memberSnapshot.exists
    || (
      memberSnapshot.data()?.status
      && memberSnapshot.data()?.status !== 'active'
    )
  ) {
    throw new HttpsError(
      'permission-denied',
      'An active Space membership is required.',
    );
  }

  return {
    space,
    member: memberSnapshot.data() || {},
  };
}

function canManageSpaceWork(member: DocumentData) {
  return ['owner', 'admin', 'contributor'].includes(
    String(member.role || ''),
  );
}

function spaceWorkOptionalText(
  value: unknown,
  label: string,
  maxLength: number,
): string | null {
  const result = String(value || '').trim();

  if (!result) return null;

  if (result.length > maxLength) {
    throw new HttpsError(
      'invalid-argument',
      label + ' is too long.',
    );
  }

  return result;
}

function spaceWorkDate(
  value: unknown,
  label: string,
): string | null {
  const result = spaceWorkOptionalText(value, label, 10);

  if (!result) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    throw new HttpsError(
      'invalid-argument',
      'Choose a valid ' + label.toLowerCase() + '.',
    );
  }

  return result;
}

function spaceWorkMinor(
  value: unknown,
  label: string,
  required = false,
): number | null {
  if (
    value === undefined
    || value === null
    || value === ''
  ) {
    if (required) {
      throw new HttpsError(
        'invalid-argument',
        label + ' is required.',
      );
    }

    return null;
  }

  const result = Number(value);

  if (
    !Number.isSafeInteger(result)
    || result < 0
    || result > 99_999_999_999
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Choose a valid ' + label.toLowerCase() + '.',
    );
  }

  return result;
}

function spaceWorkQuantity(value: unknown) {
  const result = Number(value ?? 1);

  if (
    !Number.isFinite(result)
    || result <= 0
    || result > 1_000_000
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Choose a valid quantity.',
    );
  }

  return result;
}

function spaceWorkPriority(value: unknown) {
  const result = String(value || 'normal');

  if (!['low', 'normal', 'high', 'urgent'].includes(result)) {
    throw new HttpsError(
      'invalid-argument',
      'Choose a valid priority.',
    );
  }

  return result;
}

export const saveSpaceWorkItem = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);
    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );
    const itemId = spaceWorkOptionalText(
      request.data?.itemId,
      'Item ID',
      80,
    );
    const kind = stringValue(
      request.data?.kind,
      'Item type',
      20,
    );

    if (!['task', 'buy'].includes(kind)) {
      throw new HttpsError(
        'invalid-argument',
        'Choose Task or To-Buy.',
      );
    }

    const title = stringValue(
      request.data?.title,
      kind === 'task' ? 'Task title' : 'Item name',
      120,
    );

    const actor = await requireSpaceWorkActor(
      spaceId,
      uid,
    );

    if (!canManageSpaceWork(actor.member)) {
      throw new HttpsError(
        'permission-denied',
        'Only a Space manager or contributor can add or edit this item.',
      );
    }

    const assigneeUid = spaceWorkOptionalText(
      request.data?.assigneeUid,
      'Assignee ID',
      128,
    );

    const assignee = assigneeUid
      ? await requireActiveSpaceMember(
          spaceId,
          assigneeUid,
        )
      : null;

    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const ref = itemId
      ? db.collection('spaceWorkItems').doc(itemId)
      : db.collection('spaceWorkItems').doc();

    const commandRef = db
      .collection('collaborationCommands')
      .doc(commandId(uid, key));

    return db.runTransaction(async (transaction) => {
      const command = await transaction.get(commandRef);

      if (command.exists) {
        return command.data()?.result;
      }

      const existing = itemId
        ? await transaction.get(ref)
        : null;

      if (itemId && !existing?.exists) {
        throw new HttpsError(
          'not-found',
          'Task or To-Buy item was not found.',
        );
      }

      if (
        existing?.exists
        && String(existing.data()?.spaceId || '') !== spaceId
      ) {
        throw new HttpsError(
          'permission-denied',
          'This item belongs to another Space.',
        );
      }

      if (
        existing?.exists
        && String(existing.data()?.kind || '') !== kind
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Task and To-Buy item types cannot be changed.',
        );
      }

      const previousAssigneeUid = String(
        existing?.data()?.assigneeUid || '',
      );

      const now = FieldValue.serverTimestamp();

      const data = {
        spaceId,
        spaceType: String(actor.space.type),
        kind,
        title,

        brand:
          kind === 'buy'
            ? spaceWorkOptionalText(
                request.data?.brand,
                'Brand',
                100,
              )
            : null,

        model:
          kind === 'buy'
            ? spaceWorkOptionalText(
                request.data?.model,
                'Model',
                100,
              )
            : null,

        size:
          kind === 'buy'
            ? spaceWorkOptionalText(
                request.data?.size,
                'Size',
                100,
              )
            : null,

        unit:
          kind === 'buy'
            ? spaceWorkOptionalText(
                request.data?.unit,
                'Unit',
                40,
              )
            : null,

        quantity:
          kind === 'buy'
            ? spaceWorkQuantity(request.data?.quantity)
            : 1,

        targetPriceMinor:
          kind === 'buy'
            ? spaceWorkMinor(
                request.data?.targetPriceMinor,
                'Target price',
              )
            : null,

        preferredPlace:
          kind === 'buy'
            ? spaceWorkOptionalText(
                request.data?.preferredPlace,
                'Preferred place',
                160,
              )
            : null,

        assigneeUid,
        assigneeName:
          assignee?.displayName || null,
        assigneeEmail:
          assignee?.email || null,

        priority: spaceWorkPriority(
          request.data?.priority,
        ),

        dueDate: spaceWorkDate(
          request.data?.dueDate,
          'Due date',
        ),

        note: spaceWorkOptionalText(
          request.data?.note,
          'Note',
          500,
        ),

        updatedAt: now,
      };

      if (existing?.exists) {
        transaction.update(ref, data);
      } else {
        transaction.create(ref, {
          displayId: displayId(
            kind === 'task' ? 'WTK' : 'WBY',
          ),
          ...data,
          status: 'open',
          actualPriceMinor: null,
          actualPlace: null,
          purchasedOn: null,
          photoPath: null,
          linkedTransactionId: null,
          createdBy: uid,
          completedBy: null,
          completedAt: null,
          archivedAt: null,
          createdAt: now,
        });
      }

      createActivity(transaction, {
        spaceId,
        actorUid: uid,
        actorName:
          actor.member.displayName
          || actor.member.email
          || 'Member',
        action:
          kind === 'task'
            ? existing?.exists
              ? 'space_task_updated'
              : 'space_task_created'
            : existing?.exists
              ? 'space_buy_updated'
              : 'space_buy_created',
        targetType:
          kind === 'task'
            ? 'space_task'
            : 'space_buy_item',
        targetId: ref.id,
        summary:
          (existing?.exists ? 'Updated ' : 'Added ')
          + (kind === 'task' ? 'Task: ' : 'To-Buy item: ')
          + title
          + '.',
        now,
      });

      if (
        assigneeUid
        && assigneeUid !== uid
        && assigneeUid !== previousAssigneeUid
      ) {
        createNotification(transaction, {
          uid: assigneeUid,
          spaceId,
          type:
            kind === 'task'
              ? 'space_task_assigned'
              : 'space_buy_assigned',
          title:
            kind === 'task'
              ? 'A Task was assigned to you'
              : 'A To-Buy item was assigned to you',
          message:
            data.dueDate
              ? title + ' is due on ' + data.dueDate + '.'
              : title,
          targetPath:
            '/spaces/'
            + spaceId
            + '?tab=overview#space-work',
          actionLabel:
            kind === 'task'
              ? 'Open Tasks'
              : 'Open To-Buy',
          now,
        });
      }

      const result = { itemId: ref.id };

      transaction.create(commandRef, {
        uid,
        kind: 'save_space_work_item',
        idempotencyKey: key,
        result,
        createdAt: now,
      });

      return result;
    });
  },
);

export const setSpaceWorkItemStatus = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);
    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );
    const itemId = stringValue(
      request.data?.itemId,
      'Item ID',
      80,
    );
    const status = stringValue(
      request.data?.status,
      'Task status',
      20,
    );

    if (!['open', 'completed'].includes(status)) {
      throw new HttpsError(
        'invalid-argument',
        'Choose Open or Completed.',
      );
    }

    const actor = await requireSpaceWorkActor(
      spaceId,
      uid,
    );

    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const ref = db
      .collection('spaceWorkItems')
      .doc(itemId);

    const commandRef = db
      .collection('collaborationCommands')
      .doc(commandId(uid, key));

    return db.runTransaction(async (transaction) => {
      const command = await transaction.get(commandRef);

      if (command.exists) {
        return command.data()?.result;
      }

      const snapshot = await transaction.get(ref);

      if (
        !snapshot.exists
        || String(snapshot.data()?.spaceId || '') !==
          spaceId
      ) {
        throw new HttpsError(
          'not-found',
          'Task was not found.',
        );
      }

      const item = snapshot.data() || {};

      if (item.kind !== 'task') {
        throw new HttpsError(
          'failed-precondition',
          'Only Tasks use the Complete action.',
        );
      }

      if (
        !canManageSpaceWork(actor.member)
        && String(item.assigneeUid || '') !== uid
      ) {
        throw new HttpsError(
          'permission-denied',
          'Only the assignee or a Space manager can change this Task.',
        );
      }

      const now = FieldValue.serverTimestamp();

      transaction.update(ref, {
        status,
        completedBy:
          status === 'completed' ? uid : null,
        completedAt:
          status === 'completed' ? now : null,
        updatedAt: now,
      });

      createActivity(transaction, {
        spaceId,
        actorUid: uid,
        actorName:
          actor.member.displayName
          || actor.member.email
          || 'Member',
        action:
          status === 'completed'
            ? 'space_task_completed'
            : 'space_task_reopened',
        targetType: 'space_task',
        targetId: itemId,
        summary:
          (status === 'completed'
            ? 'Completed Task: '
            : 'Reopened Task: ')
          + String(item.title || 'Task')
          + '.',
        now,
      });

      const result = { itemId, status };

      transaction.create(commandRef, {
        uid,
        kind: 'set_space_work_item_status',
        idempotencyKey: key,
        result,
        createdAt: now,
      });

      return result;
    });
  },
);

export const markSpaceWorkItemBought = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);
    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );
    const itemId = stringValue(
      request.data?.itemId,
      'Item ID',
      80,
    );

    const actualPriceMinor = spaceWorkMinor(
      request.data?.actualPriceMinor,
      'Actual price',
      true,
    );

    const actualPlace = stringValue(
      request.data?.actualPlace,
      'Actual shop or vendor',
      160,
    );

    const purchasedOn = spaceWorkDate(
      request.data?.purchasedOn,
      'Purchase date',
    );

    if (!purchasedOn) {
      throw new HttpsError(
        'invalid-argument',
        'Purchase date is required.',
      );
    }

    const actor = await requireSpaceWorkActor(
      spaceId,
      uid,
    );

    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const ref = db
      .collection('spaceWorkItems')
      .doc(itemId);

    const commandRef = db
      .collection('collaborationCommands')
      .doc(commandId(uid, key));

    return db.runTransaction(async (transaction) => {
      const command = await transaction.get(commandRef);

      if (command.exists) {
        return command.data()?.result;
      }

      const snapshot = await transaction.get(ref);

      if (
        !snapshot.exists
        || String(snapshot.data()?.spaceId || '') !==
          spaceId
      ) {
        throw new HttpsError(
          'not-found',
          'To-Buy item was not found.',
        );
      }

      const item = snapshot.data() || {};

      if (item.kind !== 'buy') {
        throw new HttpsError(
          'failed-precondition',
          'Only To-Buy items can be marked bought.',
        );
      }

      if (
        !canManageSpaceWork(actor.member)
        && String(item.assigneeUid || '') !== uid
      ) {
        throw new HttpsError(
          'permission-denied',
          'Only the assignee or a Space manager can record this purchase.',
        );
      }

      const now = FieldValue.serverTimestamp();

      transaction.update(ref, {
        status: 'bought',
        actualPriceMinor,
        actualPlace,
        purchasedOn,
        completedBy: uid,
        completedAt: now,
        updatedAt: now,
      });

      createActivity(transaction, {
        spaceId,
        actorUid: uid,
        actorName:
          actor.member.displayName
          || actor.member.email
          || 'Member',
        action: 'space_buy_completed',
        targetType: 'space_buy_item',
        targetId: itemId,
        summary:
          'Bought '
          + String(item.title || 'item')
          + ' at '
          + actualPlace
          + '.',
        now,
      });

      const result = {
        itemId,
        status: 'bought',
      };

      transaction.create(commandRef, {
        uid,
        kind: 'mark_space_work_item_bought',
        idempotencyKey: key,
        result,
        createdAt: now,
      });

      return result;
    });
  },
);

export const archiveSpaceWorkItem = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);
    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );
    const itemId = stringValue(
      request.data?.itemId,
      'Item ID',
      80,
    );
    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const actor = await requireSpaceWorkActor(
      spaceId,
      uid,
    );

    if (!canManageSpaceWork(actor.member)) {
      throw new HttpsError(
        'permission-denied',
        'Only a Space manager or contributor can archive this item.',
      );
    }

    const ref = db
      .collection('spaceWorkItems')
      .doc(itemId);

    const commandRef = db
      .collection('collaborationCommands')
      .doc(commandId(uid, key));

    return db.runTransaction(async (transaction) => {
      const command = await transaction.get(commandRef);

      if (command.exists) {
        return command.data()?.result;
      }

      const snapshot = await transaction.get(ref);

      if (
        !snapshot.exists
        || String(snapshot.data()?.spaceId || '') !==
          spaceId
      ) {
        throw new HttpsError(
          'not-found',
          'Task or To-Buy item was not found.',
        );
      }

      const now = FieldValue.serverTimestamp();

      transaction.update(ref, {
        archivedAt: now,
        updatedAt: now,
      });

      createActivity(transaction, {
        spaceId,
        actorUid: uid,
        actorName:
          actor.member.displayName
          || actor.member.email
          || 'Member',
        action: 'space_work_item_archived',
        targetType:
          snapshot.data()?.kind === 'task'
            ? 'space_task'
            : 'space_buy_item',
        targetId: itemId,
        summary:
          'Archived '
          + String(
            snapshot.data()?.title
            || 'Space item',
          )
          + '.',
        now,
      });

      const result = {
        itemId,
        archived: true,
      };

      transaction.create(commandRef, {
        uid,
        kind: 'archive_space_work_item',
        idempotencyKey: key,
        result,
        createdAt: now,
      });

      return result;
    });
  },
);


/* =========================================================
   v1.8.0 Slice 2B - Work item photos + financial link
   ========================================================= */

export const setSpaceWorkItemPhoto = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);

    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );

    const itemId = stringValue(
      request.data?.itemId,
      'Item ID',
      80,
    );

    const storagePath = stringValue(
      request.data?.storagePath,
      'Photo path',
      500,
    );

    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const actor = await requireSpaceWorkActor(
      spaceId,
      uid,
    );

    if (!canManageSpaceWork(actor.member)) {
      throw new HttpsError(
        'permission-denied',
        'Only a Space manager or contributor can change the item photo.',
      );
    }

    const expectedPrefix =
      'spaces/'
      + spaceId
      + '/work-items/'
      + itemId
      + '/';

    if (!storagePath.startsWith(expectedPrefix)) {
      throw new HttpsError(
        'permission-denied',
        'Item photo path is invalid.',
      );
    }

    const bucket = getStorage().bucket();
    const fileHandle = bucket.file(storagePath);

    const [exists] = await fileHandle.exists();

    if (!exists) {
      throw new HttpsError(
        'failed-precondition',
        'Upload the item photo before saving it.',
      );
    }

    const [metadata] = await fileHandle.getMetadata();

    const contentType = String(
      metadata.contentType || '',
    );

    const sizeBytes = Number(metadata.size || 0);

    if (
      !contentType.startsWith('image/')
      || !Number.isFinite(sizeBytes)
      || sizeBytes <= 0
      || sizeBytes >= 5 * 1024 * 1024
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Item photo must be an image smaller than 5 MB.',
      );
    }

    const itemRef =
      db.collection('spaceWorkItems').doc(itemId);

    const commandRef =
      db
        .collection('collaborationCommands')
        .doc(commandId(uid, key));

    const result = await db.runTransaction(
      async (transaction) => {
        const [command, itemSnapshot] =
          await Promise.all([
            transaction.get(commandRef),
            transaction.get(itemRef),
          ]);

        if (command.exists) {
          return command.data()?.result;
        }

        if (
          !itemSnapshot.exists
          || String(
            itemSnapshot.data()?.spaceId || '',
          ) !== spaceId
        ) {
          throw new HttpsError(
            'not-found',
            'To-Buy item was not found.',
          );
        }

        if (itemSnapshot.data()?.kind !== 'buy') {
          throw new HttpsError(
            'failed-precondition',
            'Only To-Buy items use item photos.',
          );
        }

        const previousPhotoPath = String(
          itemSnapshot.data()?.photoPath || '',
        );

        const now = FieldValue.serverTimestamp();

        transaction.update(itemRef, {
          photoPath: storagePath,
          updatedAt: now,
        });

        createActivity(transaction, {
          spaceId,
          actorUid: uid,
          actorName:
            actor.member.displayName
            || actor.member.email
            || 'Member',
          action: 'space_buy_photo_updated',
          targetType: 'space_buy_item',
          targetId: itemId,
          summary:
            'Updated photo for '
            + String(
              itemSnapshot.data()?.title
              || 'To-Buy item',
            )
            + '.',
          now,
        });

        const commandResult = {
          photoPath: storagePath,
          previousPhotoPath,
        };

        transaction.create(commandRef, {
          uid,
          kind: 'set_space_work_item_photo',
          idempotencyKey: key,
          result: commandResult,
          createdAt: now,
        });

        return commandResult;
      },
    );

    const previousPhotoPath = String(
      result?.previousPhotoPath || '',
    );

    if (
      previousPhotoPath
      && previousPhotoPath !== storagePath
      && previousPhotoPath.startsWith(
        'spaces/'
        + spaceId
        + '/work-items/'
        + itemId
        + '/',
      )
    ) {
      await bucket
        .file(previousPhotoPath)
        .delete({ ignoreNotFound: true });
    }

    return {
      photoPath: storagePath,
    };
  },
);

export const removeSpaceWorkItemPhoto = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);

    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );

    const itemId = stringValue(
      request.data?.itemId,
      'Item ID',
      80,
    );

    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const actor = await requireSpaceWorkActor(
      spaceId,
      uid,
    );

    if (!canManageSpaceWork(actor.member)) {
      throw new HttpsError(
        'permission-denied',
        'Only a Space manager or contributor can remove the item photo.',
      );
    }

    const itemRef =
      db.collection('spaceWorkItems').doc(itemId);

    const commandRef =
      db
        .collection('collaborationCommands')
        .doc(commandId(uid, key));

    const result = await db.runTransaction(
      async (transaction) => {
        const [command, itemSnapshot] =
          await Promise.all([
            transaction.get(commandRef),
            transaction.get(itemRef),
          ]);

        if (command.exists) {
          return command.data()?.result;
        }

        if (
          !itemSnapshot.exists
          || String(
            itemSnapshot.data()?.spaceId || '',
          ) !== spaceId
        ) {
          throw new HttpsError(
            'not-found',
            'To-Buy item was not found.',
          );
        }

        const photoPath = String(
          itemSnapshot.data()?.photoPath || '',
        );

        const now = FieldValue.serverTimestamp();

        transaction.update(itemRef, {
          photoPath: null,
          updatedAt: now,
        });

        createActivity(transaction, {
          spaceId,
          actorUid: uid,
          actorName:
            actor.member.displayName
            || actor.member.email
            || 'Member',
          action: 'space_buy_photo_removed',
          targetType: 'space_buy_item',
          targetId: itemId,
          summary:
            'Removed photo from '
            + String(
              itemSnapshot.data()?.title
              || 'To-Buy item',
            )
            + '.',
          now,
        });

        const commandResult = {
          itemId,
          photoPath,
        };

        transaction.create(commandRef, {
          uid,
          kind: 'remove_space_work_item_photo',
          idempotencyKey: key,
          result: commandResult,
          createdAt: now,
        });

        return commandResult;
      },
    );

    const photoPath = String(
      result?.photoPath || '',
    );

    if (
      photoPath
      && photoPath.startsWith(
        'spaces/'
        + spaceId
        + '/work-items/'
        + itemId
        + '/',
      )
    ) {
      await getStorage()
        .bucket()
        .file(photoPath)
        .delete({ ignoreNotFound: true });
    }

    return {
      itemId,
      removed: true,
    };
  },
);

export const recordSpaceWorkPurchaseExpense = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);

    const spaceId = stringValue(
      request.data?.spaceId,
      'Space ID',
      80,
    );

    const itemId = stringValue(
      request.data?.itemId,
      'Item ID',
      80,
    );

    const accountId = stringValue(
      request.data?.accountId,
      'Account',
      80,
    );

    const categoryId = stringValue(
      request.data?.categoryId,
      'Category ID',
      80,
    );

    const {
      paymentMethod,
      paymentMethodLabel,
    } = paymentMethodValues(
      request.data || {},
    );

    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const actor = await requireSpaceWorkActor(
      spaceId,
      uid,
    );

    if (actor.member.canUseAccounts !== true) {
      throw new HttpsError(
        'permission-denied',
        'Your Space access does not allow financial transactions.',
      );
    }

    const itemRef =
      db.collection('spaceWorkItems').doc(itemId);

    const accountRef =
      db.collection('accounts').doc(accountId);

    const customCategoryRef =
      categoryId.startsWith('custom-')
        ? db.collection('categories').doc(categoryId)
        : null;

    const commandRef =
      db
        .collection('financialCommands')
        .doc(commandId(uid, key));

    const budgetCandidateRefs =
      (
        await db
          .collection('budgets')
          .where('ownerId', '==', uid)
          .where('spaceId', '==', spaceId)
          .get()
      ).docs.map((item) => item.ref);

    return db.runTransaction(
      async (transaction) => {
        const command =
          await transaction.get(commandRef);

        if (command.exists) {
          return command.data()?.result;
        }

        const [
          itemSnapshot,
          accountSnapshot,
          customCategorySnapshot,
          budgetSnapshots,
        ] = await Promise.all([
          transaction.get(itemRef),
          transaction.get(accountRef),
          customCategoryRef
            ? transaction.get(customCategoryRef)
            : Promise.resolve(null),
          Promise.all(
            budgetCandidateRefs.map(
              (ref) => transaction.get(ref),
            ),
          ),
        ]);

        if (
          !itemSnapshot.exists
          || String(
            itemSnapshot.data()?.spaceId || '',
          ) !== spaceId
        ) {
          throw new HttpsError(
            'not-found',
            'Purchased To-Buy item was not found.',
          );
        }

        const item = itemSnapshot.data() || {};

        if (
          item.kind !== 'buy'
          || item.status !== 'bought'
          || item.archivedAt
        ) {
          throw new HttpsError(
            'failed-precondition',
            'Mark this item bought before recording the expense.',
          );
        }

        if (item.linkedTransactionId) {
          throw new HttpsError(
            'already-exists',
            'This purchase is already linked to money activity.',
          );
        }

        if (
          !canManageSpaceWork(actor.member)
          && String(item.assigneeUid || '') !== uid
        ) {
          throw new HttpsError(
            'permission-denied',
            'Only the assignee or a Space manager can record this purchase.',
          );
        }

        const amountMinor =
          positiveMoney(item.actualPriceMinor);

        const transactionDate = localDate(
          item.purchasedOn,
          'Purchase date',
        );

        const actualPlace = stringValue(
          item.actualPlace,
          'Purchase place',
          160,
        );

        const account = assertAccount(
          accountSnapshot.data(),
          uid,
          'Account',
        );

        const spaceCurrency = String(
          actor.space.currency || 'BND',
        );

        if (account.currency !== spaceCurrency) {
          throw new HttpsError(
            'failed-precondition',
            'Account and Space currencies must match.',
          );
        }

        const selectedScope =
          String(actor.space.type) === 'sme'
            ? 'business'
            : 'personal';

        const category =
          categorySnapshotFromData({
            categoryId,
            requiredKind: 'expense',
            selectedScope,
            uid,
            customData:
              customCategorySnapshot?.data(),
          });

        const budgetIds =
          matchingBudgetIds(
            budgetSnapshots,
            {
              spaceId,
              categoryId: category.id,
              transactionDate,
            },
          );

        const transactionRef =
          db.collection('transactions').doc();

        const now =
          FieldValue.serverTimestamp();

        const delta = accountEffect(
          account.type,
          'out',
          amountMinor,
        );

        updateAccountBalance(
          transaction,
          accountRef,
          account,
          delta,
        );

        const ledgerEntryId =
          createLedgerEntry(transaction, {
            accountId,
            ownerId: uid,
            spaceId,
            transactionId: transactionRef.id,
            entryType: 'space_work_purchase',
            amountMinor: delta,
            currency: account.currency,
            idempotencyKey: key,
            now,
          });

        if (budgetIds.length) {
          updateBudgetsSpent(
            transaction,
            budgetSnapshots,
            budgetIds,
            amountMinor,
          );
        }

        transaction.create(transactionRef, {
          displayId: displayId('TXN'),
          ownerId: uid,
          createdBy: uid,
          type: 'expense',
          status: 'posted',
          spaceId,
          accountId,
          destinationAccountId: null,
          amountMinor,
          currency: account.currency,
          category: category.name,
          categoryId: category.id,
          categoryIcon: category.icon,
          categoryColor: category.color,
          categoryScope: category.scope,
          categoryIsSystem: category.isSystem,
          counterparty: actualPlace,
          note:
            'Purchased from To-Buy: '
            + String(item.title || 'Item'),
          paymentMethod,
          paymentMethodLabel,
          transactionDate,
          reversalOf: null,
          reversedBy: null,
          budgetIds,
          commitmentId: null,
          commitmentPaymentId: null,
          spaceWorkItemId: itemId,
          createdAt: now,
          postedAt: now,
          updatedAt: now,
        });

        transaction.update(itemRef, {
          linkedTransactionId:
            transactionRef.id,
          updatedAt: now,
        });

        createActivity(transaction, {
          spaceId,
          actorUid: uid,
          actorName:
            actor.member.displayName
            || actor.member.email
            || 'Member',
          action:
            String(actor.space.type) === 'sme'
              ? 'space_buy_sme_purchase_recorded'
              : 'space_buy_household_expense_recorded',
          targetType: 'space_buy_item',
          targetId: itemId,
          summary:
            'Recorded '
            + String(item.title || 'purchase')
            + ' as money activity.',
          now,
        });

        const result = {
          transactionId:
            transactionRef.id,
          ledgerEntryId,
          itemId,
        };

        transaction.create(commandRef, {
          uid,
          kind: 'record_space_work_purchase_expense',
          idempotencyKey: key,
          result,
          createdAt: now,
        });

        return result;
      },
    );
  },
);



const subscriptionPlatformAdminEmail =
  'zardeerwandy@gmail.com';

const subscriptionSources = [
  'whatsapp_manual',
  'complimentary',
  'internal',
] as const;

type SubscriptionSource =
  (typeof subscriptionSources)[number];

function normalizedRequestEmail(
  request: CallableRequest,
): string {
  return String(
    request.auth?.token.email || '',
  ).trim().toLowerCase();
}

function timestampToIso(
  value: unknown,
): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return null;
}

async function requirePlatformAdmin(
  request: CallableRequest,
): Promise<string> {
  const uid = requireAuth(request.auth?.uid);

  if (request.auth?.token.platformAdmin !== true) {
    throw new HttpsError(
      'permission-denied',
      'BajetBN platform administrator access is required.',
    );
  }

  return uid;
}

function validSubscriptionSource(
  value: unknown,
): SubscriptionSource {
  return oneOf(
    value ?? 'whatsapp_manual',
    subscriptionSources,
    'subscription source',
  );
}

function addSubscriptionMonths(
  base: Date,
  months: number,
): Date {
  const result = new Date(base.getTime());

  result.setUTCMonth(
    result.getUTCMonth() + months,
  );

  return result;
}

function subscriptionExpiryFromInput(
  data: Record<string, unknown>,
  currentExpiry: unknown,
): Date {
  const requestedMonths =
    data.months == null
      ? null
      : Number(data.months);

  const customExpiry =
    optionalString(
      data.customExpiresAt,
      40,
    );

  const now = new Date();

  if (customExpiry) {
    const parsed = new Date(customExpiry);

    if (
      Number.isNaN(parsed.getTime())
      || parsed.getTime() <= now.getTime()
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Choose a future subscription expiry date.',
      );
    }

    return parsed;
  }

  if (
    requestedMonths == null
    || ![1, 3, 6, 12].includes(requestedMonths)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Choose a 1, 3, 6 or 12 month subscription.',
    );
  }

  let base = now;

  if (
    data.action === 'extend'
    && currentExpiry instanceof Timestamp
    && currentExpiry.toMillis() > now.getTime()
  ) {
    base = currentExpiry.toDate();
  }

  return addSubscriptionMonths(
    base,
    requestedMonths,
  );
}

export const ensureMyPlatformAdmin = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);
    const email = normalizedRequestEmail(request);

    if (
      email !== subscriptionPlatformAdminEmail
      || request.auth?.token.email_verified !== true
    ) {
      return {
        platformAdmin: false,
      };
    }

    const auth = getAuth();
    const authUser = await auth.getUser(uid);

    const claims = {
      ...(authUser.customClaims || {}),
      platformAdmin: true,
    };

    await auth.setCustomUserClaims(
      uid,
      claims,
    );

    await db
      .collection('users')
      .doc(uid)
      .set(
        {
          platformRole: 'platform_admin',
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return {
      platformAdmin: true,
      refreshToken: true,
    };
  },
);

export const adminListSubscriptions = onCall(
  { region },
  async (request) => {
    await requirePlatformAdmin(request);

    const snapshot = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const users = snapshot.docs.map(
      (document) => {
        const data = document.data();

        const expiresAt =
          data.subscriptionExpiresAt;

        const plusActive =
          data.subscriptionPlan === 'plus'
          && data.subscriptionStatus === 'active'
          && (
            !(expiresAt instanceof Timestamp)
            || expiresAt.toMillis() > Date.now()
          );

        return {
          uid: document.id,
          fullName:
            String(data.fullName || ''),
          email:
            String(data.email || ''),
          platformRole:
            data.platformRole === 'platform_admin'
              ? 'platform_admin'
              : 'user',
          effectivePlan:
            plusActive
              ? 'plus'
              : 'basic',
          subscriptionPlan:
            data.subscriptionPlan === 'plus'
              ? 'plus'
              : 'basic',
          subscriptionStatus:
            String(
              data.subscriptionStatus
              || 'basic',
            ),
          subscriptionSource:
            data.subscriptionSource
              ? String(
                  data.subscriptionSource,
                )
              : null,
          subscriptionStartedAt:
            timestampToIso(
              data.subscriptionStartedAt,
            ),
          subscriptionExpiresAt:
            timestampToIso(
              expiresAt,
            ),
          createdAt:
            timestampToIso(
              data.createdAt,
            ),
        };
      },
    );

    return { users };
  },
);

export const adminUpdateSubscription = onCall(
  { region },
  async (request) => {
    const adminUid =
      await requirePlatformAdmin(request);

    const targetUid = stringValue(
      request.data?.uid,
      'User',
      128,
    );

    const action = oneOf(
      request.data?.action,
      [
        'activate',
        'extend',
        'cancel',
        'lifetime',
      ] as const,
      'subscription action',
    );

    const source =
      validSubscriptionSource(
        request.data?.source,
      );

    const userRef =
      db.collection('users').doc(targetUid);

    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new HttpsError(
        'not-found',
        'The BajetBN user was not found.',
      );
    }

    const current = snapshot.data() || {};
    const now =
      FieldValue.serverTimestamp();

    if (action === 'lifetime') {
      await userRef.set(
        {
          subscriptionPlan: 'plus',
          subscriptionStatus: 'active',
          subscriptionStartedAt:
            current.subscriptionStartedAt
            || Timestamp.now(),
          subscriptionExpiresAt: null,
          subscriptionLifetime: true,
          subscriptionSource: source,
          updatedAt: now,
        },
        { merge: true },
      );

      await db
        .collection('subscriptionAudit')
        .add({
          targetUid,
          targetEmail:
            String(current.email || ''),
          action: 'lifetime',
          previousPlan:
            current.subscriptionPlan
            || 'basic',
          previousStatus:
            current.subscriptionStatus
            || 'basic',
          previousExpiresAt:
            current.subscriptionExpiresAt
            || null,
          nextPlan: 'plus',
          nextStatus: 'active',
          nextExpiresAt: null,
          source,
          adminUid,
          createdAt: now,
        });

      return {
        uid: targetUid,
        effectivePlan: 'plus',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: null,
        lifetime: true,
      };
    }

    if (action === 'cancel') {
      await userRef.set(
        {
          subscriptionPlan: 'plus',
          subscriptionStatus:
            'cancelled',
          subscriptionExpiresAt:
            Timestamp.now(),
          subscriptionLifetime: false,
          subscriptionSource: source,
          updatedAt: now,
        },
        { merge: true },
      );

      await db
        .collection('subscriptionAudit')
        .add({
          targetUid,
          targetEmail:
            String(current.email || ''),
          action: 'cancel',
          previousPlan:
            current.subscriptionPlan
            || 'basic',
          previousStatus:
            current.subscriptionStatus
            || 'basic',
          nextPlan: 'basic',
          nextStatus: 'cancelled',
          source,
          adminUid,
          createdAt: now,
        });

      return {
        uid: targetUid,
        effectivePlan: 'basic',
        subscriptionStatus:
          'cancelled',
        subscriptionExpiresAt:
          new Date().toISOString(),
      };
    }

    const expiry =
      subscriptionExpiryFromInput(
        {
          ...(request.data || {}),
          action,
        },
        current.subscriptionExpiresAt,
      );

    const expiryTimestamp =
      Timestamp.fromDate(expiry);

    const startedAt =
      action === 'extend'
      && current.subscriptionStartedAt
        ? current.subscriptionStartedAt
        : Timestamp.now();

    await userRef.set(
      {
        subscriptionPlan: 'plus',
        subscriptionStatus:
          'active',
        subscriptionStartedAt:
          startedAt,
        subscriptionExpiresAt:
          expiryTimestamp,
        subscriptionLifetime: false,
        subscriptionSource:
          source,
        updatedAt: now,
      },
      { merge: true },
    );

    await db
      .collection('subscriptionAudit')
      .add({
        targetUid,
        targetEmail:
          String(current.email || ''),
        action,
        previousPlan:
          current.subscriptionPlan
          || 'basic',
        previousStatus:
          current.subscriptionStatus
          || 'basic',
        previousExpiresAt:
          current.subscriptionExpiresAt
          || null,
        nextPlan: 'plus',
        nextStatus: 'active',
        nextExpiresAt:
          expiryTimestamp,
        source,
        adminUid,
        createdAt: now,
      });

    return {
      uid: targetUid,
      effectivePlan: 'plus',
      subscriptionStatus:
        'active',
      subscriptionExpiresAt:
        expiry.toISOString(),
    };
  },
);

export const adminListSubscriptionAudit = onCall(
  { region },
  async (request) => {
    await requirePlatformAdmin(request);

    const snapshot = await db
      .collection('subscriptionAudit')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return {
      entries: snapshot.docs.map(
        (document) => {
          const data = document.data();

          return {
            id: document.id,
            targetUid:
              String(data.targetUid || ''),
            targetEmail:
              String(
                data.targetEmail || '',
              ),
            action:
              String(data.action || ''),
            previousPlan:
              String(
                data.previousPlan || '',
              ),
            previousStatus:
              String(
                data.previousStatus || '',
              ),
            nextPlan:
              String(data.nextPlan || ''),
            nextStatus:
              String(
                data.nextStatus || '',
              ),
            source:
              String(data.source || ''),
            createdAt:
              timestampToIso(
                data.createdAt,
              ),
          };
        },
      ),
    };
  },
);

export const processSubscriptionExpiries =
  onSchedule(
    {
      region,
      schedule: 'every 60 minutes',
      timeZone: 'Asia/Brunei',
    },
    async () => {
      const now = Timestamp.now();

      const snapshot = await db
        .collection('users')
        .where(
          'subscriptionExpiresAt',
          '<=',
          now,
        )
        .orderBy(
          'subscriptionExpiresAt',
          'asc',
        )
        // Each expiry can write both the user
        // and one audit row. 240 users stays
        // safely below Firestore batch limits.
        .limit(240)
        .get();

      if (snapshot.empty) {
        return;
      }

      const batch = db.batch();
      let changed = 0;

      for (const document of snapshot.docs) {
        const data = document.data();

        if (
          data.subscriptionPlan !== 'plus'
          || data.subscriptionStatus
            !== 'active'
        ) {
          continue;
        }

        batch.set(
          document.ref,
          {
            subscriptionStatus:
              'expired',
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        const auditRef =
          db.collection(
            'subscriptionAudit',
          ).doc();

        batch.set(
          auditRef,
          {
            targetUid:
              document.id,
            targetEmail:
              String(
                data.email || '',
              ),
            action:
              'automatic_expiry',
            previousPlan:
              'plus',
            previousStatus:
              'active',
            nextPlan:
              'basic',
            nextStatus:
              'expired',
            source:
              data.subscriptionSource
              || 'whatsapp_manual',
            adminUid: null,
            createdAt:
              FieldValue.serverTimestamp(),
          },
        );

        changed += 1;
      }

      if (changed > 0) {
        await batch.commit();
      }
    },
  );

const basicSubscriptionLimits = {
  householdSpaces: 1,
  tripSpaces: 1,
  smeSpaces: 1,
  smeInventoryItems: 20,
  smeCustomers: 10,
  smeSellers: 3,
  smeAdditionalMembers: 1,
} as const;

const creatableSpaceTypes = [
  'household',
  'sme',
  'trip',
  'goal',
  'collection',
  'vehicle',
  'property',
  'project',
  'event',
  'asset',
  'custom',
] as const;

type CreatableSpaceType =
  (typeof creatableSpaceTypes)[number];

async function userHasActivePlus(
  uid: string,
): Promise<boolean> {
  const profile = await db
    .collection('users')
    .doc(uid)
    .get();

  if (!profile.exists) {
    return false;
  }

  const data = profile.data() || {};

  if (
    data.subscriptionPlan !== 'plus'
    || data.subscriptionStatus !== 'active'
  ) {
    return false;
  }

  const expiresAt = data.subscriptionExpiresAt;

  if (!(expiresAt instanceof Timestamp)) {
    return true;
  }

  return expiresAt.toMillis() > Date.now();
}

function basicSpaceAllowance(
  type: CreatableSpaceType,
): number {
  switch (type) {
    case 'household':
      return basicSubscriptionLimits.householdSpaces;

    case 'trip':
      return basicSubscriptionLimits.tripSpaces;

    case 'sme':
      return basicSubscriptionLimits.smeSpaces;

    default:
      return 0;
  }
}

function activeDocumentCount(
  docs: QueryDocumentSnapshot[],
): number {
  return docs.filter((document) => {
    const data = document.data();

    return (
      !data.archivedAt
      && !data.deletedAt
    );
  }).length;
}

async function assertCanCreateSpaceForPlan(
  uid: string,
  type: CreatableSpaceType,
): Promise<void> {
  if (await userHasActivePlus(uid)) {
    return;
  }

  const allowance =
    basicSpaceAllowance(type);

  if (allowance === 0) {
    throw new HttpsError(
      'failed-precondition',
      'This Space type is available with BajetBN Plus. Upgrade to Plus to create it. Your existing information remains safe.',
    );
  }

  const spaces = await db
    .collection('spaces')
    .where('ownerId', '==', uid)
    .get();

  const activeOfType =
    spaces.docs.filter((document) => {
      const data = document.data();

      return (
        data.type === type
        && !data.archivedAt
      );
    }).length;

  if (activeOfType >= allowance) {
    const label =
      type === 'sme'
        ? 'SME'
        : type.charAt(0).toUpperCase()
          + type.slice(1);

    throw new HttpsError(
      'failed-precondition',
      `BajetBN Basic includes ${allowance} ${label} Space. Upgrade to BajetBN Plus to create another. Your existing Space remains safe.`,
    );
  }
}

async function assertBasicSmeInventoryCapacity(
  ownerUid: string,
  spaceId: string,
): Promise<void> {
  if (await userHasActivePlus(ownerUid)) {
    return;
  }

  const [products, listings] =
    await Promise.all([
      db.collection('smePosProducts')
        .where('spaceId', '==', spaceId)
        .get(),

      db.collection('smePosListings')
        .where('spaceId', '==', spaceId)
        .get(),
    ]);

  const activeCount =
    activeDocumentCount(products.docs)
    + activeDocumentCount(listings.docs);

  if (
    activeCount
    >= basicSubscriptionLimits.smeInventoryItems
  ) {
    throw new HttpsError(
      'failed-precondition',
      `BajetBN Basic supports up to ${basicSubscriptionLimits.smeInventoryItems} SME inventory items. Upgrade to BajetBN Plus to add more. Existing inventory remains safe.`,
    );
  }
}

async function assertBasicSmeCustomerCapacity(
  ownerUid: string,
  spaceId: string,
): Promise<void> {
  if (await userHasActivePlus(ownerUid)) {
    return;
  }

  const customers = await db
    .collection('smePosCustomers')
    .where('spaceId', '==', spaceId)
    .get();

  if (
    activeDocumentCount(customers.docs)
    >= basicSubscriptionLimits.smeCustomers
  ) {
    throw new HttpsError(
      'failed-precondition',
      `BajetBN Basic supports up to ${basicSubscriptionLimits.smeCustomers} SME customers. Upgrade to BajetBN Plus to add more. Existing customers remain safe.`,
    );
  }
}

async function assertBasicSmeSellerCapacity(
  ownerUid: string,
  spaceId: string,
): Promise<void> {
  if (await userHasActivePlus(ownerUid)) {
    return;
  }

  const sellers = await db
    .collection('smePosSellers')
    .where('spaceId', '==', spaceId)
    .get();

  if (
    activeDocumentCount(sellers.docs)
    >= basicSubscriptionLimits.smeSellers
  ) {
    throw new HttpsError(
      'failed-precondition',
      `BajetBN Basic supports up to ${basicSubscriptionLimits.smeSellers} SME sellers. Upgrade to BajetBN Plus to add more. Existing seller records remain safe.`,
    );
  }
}

async function assertBasicSmeAdditionalMemberCapacity(
  ownerUid: string,
  spaceId: string,
  ignoredInvitationId = '',
): Promise<void> {
  if (await userHasActivePlus(ownerUid)) {
    return;
  }

  const [members, invitations] =
    await Promise.all([
      db.collection('spaceMembers')
        .where('spaceId', '==', spaceId)
        .get(),

      db.collection('spaceInvitations')
        .where('spaceId', '==', spaceId)
        .get(),
    ]);

  const additionalMembers =
    members.docs.filter((document) => {
      const data = document.data();

      return (
        data.uid !== ownerUid
        && (
          !data.status
          || data.status === 'active'
        )
      );
    }).length;

  const pendingInvitations =
    invitations.docs.filter((document) => {
      const data = document.data();

      return (
        document.id !== ignoredInvitationId
        && data.status === 'pending'
      );
    }).length;

  if (
    additionalMembers + pendingInvitations
    >= basicSubscriptionLimits.smeAdditionalMembers
  ) {
    throw new HttpsError(
      'failed-precondition',
      `BajetBN Basic includes the SME owner plus ${basicSubscriptionLimits.smeAdditionalMembers} additional member. Upgrade to BajetBN Plus to invite more team members.`,
    );
  }
}


type BasicSmeCapacityKind =
  | 'inventory'
  | 'customers'
  | 'sellers'
  | 'members';

async function assertBasicSmeCapacityInTransaction(
  transaction: Transaction,
  ownerUid: string,
  spaceId: string,
  kind: BasicSmeCapacityKind,
  ignoredInvitationId = '',
): Promise<void> {
  const profileRef =
    db.collection('users').doc(ownerUid);

  const lockRef =
    db.collection('subscriptionCapacityLocks')
      .doc(`sme_${spaceId}_${kind}`);

  const [
    profileSnapshot,
    lockSnapshot,
  ] = await Promise.all([
    transaction.get(profileRef),
    transaction.get(lockRef),
  ]);

  const profile =
    profileSnapshot.data() || {};

  const expiresAt =
    profile.subscriptionExpiresAt;

  const plusActive =
    profile.subscriptionPlan === 'plus'
    && profile.subscriptionStatus === 'active'
    && (
      !(expiresAt instanceof Timestamp)
      || expiresAt.toMillis() > Date.now()
    );

  if (plusActive) {
    return;
  }

  let activeCount = 0;
  let limit = 0;
  let message = '';

  if (kind === 'inventory') {
    const [
      products,
      listings,
    ] = await Promise.all([
      transaction.get(
        db.collection('smePosProducts')
          .where('spaceId', '==', spaceId),
      ),

      transaction.get(
        db.collection('smePosListings')
          .where('spaceId', '==', spaceId),
      ),
    ]);

    activeCount =
      activeDocumentCount(products.docs)
      + activeDocumentCount(listings.docs);

    limit =
      basicSubscriptionLimits
        .smeInventoryItems;

    message =
      `BajetBN Basic supports up to ${limit} SME inventory items. Upgrade to BajetBN Plus to add more. Existing inventory remains safe.`;
  }
  else if (kind === 'customers') {
    const customers =
      await transaction.get(
        db.collection('smePosCustomers')
          .where('spaceId', '==', spaceId),
      );

    activeCount =
      activeDocumentCount(
        customers.docs,
      );

    limit =
      basicSubscriptionLimits.smeCustomers;

    message =
      `BajetBN Basic supports up to ${limit} SME customers. Upgrade to BajetBN Plus to add more. Existing customers remain safe.`;
  }
  else if (kind === 'sellers') {
    const sellers =
      await transaction.get(
        db.collection('smePosSellers')
          .where('spaceId', '==', spaceId),
      );

    activeCount =
      activeDocumentCount(
        sellers.docs,
      );

    limit =
      basicSubscriptionLimits.smeSellers;

    message =
      `BajetBN Basic supports up to ${limit} SME sellers. Upgrade to BajetBN Plus to add more. Existing seller records remain safe.`;
  }
  else {
    const [
      members,
      invitations,
    ] = await Promise.all([
      transaction.get(
        db.collection('spaceMembers')
          .where('spaceId', '==', spaceId),
      ),

      transaction.get(
        db.collection('spaceInvitations')
          .where('spaceId', '==', spaceId),
      ),
    ]);

    const additionalMembers =
      members.docs.filter(
        (document) => {
          const data =
            document.data();

          return (
            data.uid !== ownerUid
            && (
              !data.status
              || data.status === 'active'
            )
          );
        },
      ).length;

    const pendingInvitations =
      invitations.docs.filter(
        (document) => {
          const data =
            document.data();

          return (
            document.id !== ignoredInvitationId
            && data.status === 'pending'
          );
        },
      ).length;

    activeCount =
      additionalMembers
      + pendingInvitations;

    limit =
      basicSubscriptionLimits
        .smeAdditionalMembers;

    message =
      `BajetBN Basic includes the SME owner plus ${limit} additional member. Upgrade to BajetBN Plus to invite more team members.`;
  }

  if (activeCount >= limit) {
    throw new HttpsError(
      'failed-precondition',
      message,
    );
  }

  const version =
    Number(
      lockSnapshot.data()?.version || 0,
    );

  transaction.set(
    lockRef,
    {
      scope: kind,
      ownerUid,
      spaceId,
      version: version + 1,
      updatedAt:
        FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export const createSpaceWithEntitlement =
  onCall(
    { region },
    async (request) => {
      const uid =
        requireAuth(request.auth?.uid);

      const name = stringValue(
        request.data?.name,
        'Space name',
        100,
      );

      const type = oneOf(
        request.data?.type,
        creatableSpaceTypes,
        'Space type',
      );

      const currency = stringValue(
        request.data?.currency,
        'Currency',
        10,
      );

      const timezone = stringValue(
        request.data?.timezone,
        'Timezone',
        80,
      );

      const description = optionalString(
        request.data?.description,
        500,
      );

      const rawModules =
        Array.isArray(request.data?.customModules)
          ? request.data.customModules
          : [];

      const customModules = [
        ...new Set(
          rawModules
            .filter(
              (value: unknown) =>
                typeof value === 'string'
                && value.length > 0
                && value.length <= 80,
            )
            .map(
              (value: unknown) =>
                String(value),
            ),
        ),
      ].slice(0, 20);

      // Fast UX pre-check. The authoritative capacity
      // check is repeated inside the transaction below.
      await assertCanCreateSpaceForPlan(
        uid,
        type,
      );

      const spaceRef =
        db.collection('spaces').doc();

      const memberRef =
        db.collection('spaceMembers')
          .doc(`${spaceRef.id}_${uid}`);

      const profileRef =
        db.collection('users').doc(uid);

      const ownedSpacesQuery =
        db.collection('spaces')
          .where('ownerId', '==', uid);

      const capacityLockRef =
        db.collection('subscriptionCapacityLocks')
          .doc(`spaces_${uid}`);

      const now =
        FieldValue.serverTimestamp();

      await db.runTransaction(
        async (transaction) => {
          const [
            profileSnapshot,
            ownedSpaces,
            capacityLock,
          ] = await Promise.all([
            transaction.get(profileRef),
            transaction.get(ownedSpacesQuery),
            transaction.get(capacityLockRef),
          ]);

          const profile =
            profileSnapshot.data() || {};

          const expiresAt =
            profile.subscriptionExpiresAt;

          const plusActive =
            profile.subscriptionPlan === 'plus'
            && profile.subscriptionStatus === 'active'
            && (
              !(expiresAt instanceof Timestamp)
              || expiresAt.toMillis() > Date.now()
            );

          if (!plusActive) {
            const allowance =
              basicSpaceAllowance(type);

            if (allowance === 0) {
              throw new HttpsError(
                'failed-precondition',
                'This Space type is available with BajetBN Plus. Upgrade to Plus to create it. Your existing information remains safe.',
              );
            }

            const activeOfType =
              ownedSpaces.docs.filter(
                (document) => {
                  const data =
                    document.data();

                  return (
                    data.type === type
                    && !data.archivedAt
                  );
                },
              ).length;

            if (activeOfType >= allowance) {
              const label =
                type === 'sme'
                  ? 'SME'
                  : type.charAt(0).toUpperCase()
                    + type.slice(1);

              throw new HttpsError(
                'failed-precondition',
                `BajetBN Basic includes ${allowance} ${label} Space. Upgrade to BajetBN Plus to create another. Your existing Space remains safe.`,
              );
            }
          }

          const lockVersion =
            Number(
              capacityLock.data()?.version || 0,
            );

          transaction.set(
            capacityLockRef,
            {
              scope: 'spaces',
              ownerUid: uid,
              version: lockVersion + 1,
              updatedAt: now,
            },
            { merge: true },
          );

          transaction.create(
            spaceRef,
            {
              displayId: displayId('SPC'),
              name,
              type,
              ownerId: uid,
              collaborationMode:
                'owner_managed',
              approvalMode: 'none',
              headWhatsapp: '',
              currency,
              timezone,
              description,
              ...(type === 'custom'
                ? { customModules }
                : {}),
              archivedAt: null,
              createdAt: now,
              updatedAt: now,
            },
          );

          transaction.create(
            memberRef,
            {
              spaceId: spaceRef.id,
              uid,
              role: 'owner',
              status: 'active',
              canUseAccounts: true,
              canViewBalances: true,
              canViewLedger: true,
              joinedAt: now,
            },
          );
        },
      );

      return {
        spaceId: spaceRef.id,
      };
    },
  );

export const voidSmePosSale = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const saleId = stringValue(request.data?.saleId, 'Sale ID', 80);
  const voidDate = localDate(request.data?.voidDate, 'Void date');
  const reason = stringValue(request.data?.reason, 'Void reason', 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);

  const context = await requireSmePosActor(spaceId, uid, ['owner']);

  const commandRef = db
    .collection('smePosCommands')
    .doc(commandId(uid, key));

  const saleRef = db
    .collection('smePosSales')
    .doc(saleId);

  return db.runTransaction(async (transaction) => {
    const [command, saleSnapshot] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(saleRef),
    ]);

    if (command.exists) {
      return command.data()?.result;
    }

    if (!saleSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'POS sale not found.',
      );
    }

    const sale = saleSnapshot.data() || {};

    if (
      sale.spaceId !== spaceId
      || sale.ownerId !== context.settings.ownerId
    ) {
      throw new HttpsError(
        'permission-denied',
        'This sale belongs to another shop.',
      );
    }

    if (sale.status === 'voided') {
      throw new HttpsError(
        'failed-precondition',
        'This sale has already been voided.',
      );
    }

    const sourceMode = oneOf(
      sale.sourceMode,
      smePosModes,
      'POS sale mode',
    );

    const totalMinor =
      nonNegativeMoney(sale.totalMinor || 0);

    const currentReturnedMinor =
      nonNegativeMoney(sale.returnedMinor || 0);

    if (currentReturnedMinor > totalMinor) {
      throw new HttpsError(
        'failed-precondition',
        'This sale has invalid return totals.',
      );
    }

    const voidedMinor =
      totalMinor - currentReturnedMinor;

    if (voidedMinor <= 0) {
      throw new HttpsError(
        'failed-precondition',
        'This sale has already been fully refunded. There is no remaining amount to void.',
      );
    }

    const items: DocumentData[] =
      Array.isArray(sale.items)
        ? sale.items.map((item: unknown) => ({
            ...((item || {}) as DocumentData),
          }))
        : [];

    if (!items.length) {
      throw new HttpsError(
        'failed-precondition',
        'This sale has no item history to reverse.',
      );
    }

    const netLineTotals = smePosNetLineTotals(
      items,
      nonNegativeMoney(sale.discountMinor || 0),
    );

    const remainingRealLines = items
      .map((line, index) => {
        const quantity = integerBetween(
          line.quantity,
          'Sold quantity',
          1,
          9_999,
        );

        const returnedQuantity = integerBetween(
          line.returnedQuantity || 0,
          'Returned quantity',
          0,
          quantity,
        );

        return {
          line,
          index,
          remainingQuantity: quantity - returnedQuantity,
        };
      })
      .filter(
        (row) =>
          row.remainingQuantity > 0
          && row.line.quickAdd !== true,
      );

    const itemRefs = remainingRealLines.map((row) => {
      const itemId = stringValue(
        sourceMode === 'marketplace_consignment'
          ? row.line.listingId || row.line.productId
          : row.line.productId,
        'POS item ID',
        80,
      );

      return sourceMode === 'marketplace_consignment'
        ? db.collection('smePosListings').doc(itemId)
        : db.collection('smePosProducts').doc(itemId);
    });

    const sellerIds =
      sourceMode === 'marketplace_consignment'
        ? [
            ...new Set(
              items
                .filter((line) => {
                  const quantity = Number(line.quantity || 0);
                  const returned = Number(line.returnedQuantity || 0);

                  return quantity > returned && line.sellerId;
                })
                .map((line) => String(line.sellerId)),
            ),
          ]
        : [];

    const sellerRefs = sellerIds.map((sellerId) =>
      db.collection('smePosSellers').doc(sellerId),
    );

    const customerRef = sale.customerId
      ? db.collection('smePosCustomers').doc(String(sale.customerId))
      : null;

    const reservationRef = sale.reservationId
      ? db.collection('smePosReservations').doc(String(sale.reservationId))
      : null;

    const [
      itemSnapshots,
      sellerSnapshots,
      customerSnapshot,
      reservationSnapshot,
    ] = await Promise.all([
      Promise.all(
        itemRefs.map((ref) => transaction.get(ref)),
      ),
      Promise.all(
        sellerRefs.map((ref) => transaction.get(ref)),
      ),
      customerRef
        ? transaction.get(customerRef)
        : Promise.resolve(null),
      reservationRef
        ? transaction.get(reservationRef)
        : Promise.resolve(null),
    ]);

    const itemById = new Map(
      itemSnapshots.map((snapshot) => [
        snapshot.id,
        snapshot,
      ]),
    );

    const sellerById = new Map(
      sellerSnapshots.map((snapshot) => [
        snapshot.id,
        snapshot,
      ]),
    );

    const sellerAdjustments = new Map<
      string,
      {
        gross: number;
        commission: number;
        earnings: number;
        quantity: number;
        name: string;
        sellerUid: string | null;
      }
    >();

    const now = FieldValue.serverTimestamp();

    const originalPayments: DocumentData[] =
      Array.isArray(sale.payments)
      && sale.payments.length
        ? sale.payments.map((row: unknown) => ({
            ...((row || {}) as DocumentData),
          }))
        : [
            {
              accountId: stringValue(
                sale.paymentAccountId,
                'Original payment account',
                80,
              ),
              accountName: String(
                sale.paymentAccountName
                || 'Business account',
              ),
              paymentMethod:
                sale.paymentMethod || null,
              paymentMethodLabel:
                sale.paymentMethodLabel || null,
              amountMinor: totalMinor,
              returnedMinor:
                currentReturnedMinor,
              transactionId:
                String(sale.transactionId || ''),
              ledgerEntryId:
                String(sale.ledgerEntryId || ''),
            },
          ];

    let remainingToReverse =
      voidedMinor;

    const allocations =
      new Map<number, number>();

    originalPayments.forEach((payment, index) => {
      if (remainingToReverse <= 0) {
        return;
      }

      const capacity = Math.max(
        0,
        nonNegativeMoney(payment.amountMinor || 0)
        - nonNegativeMoney(payment.returnedMinor || 0),
      );

      const amount = Math.min(
        capacity,
        remainingToReverse,
      );

      if (amount > 0) {
        allocations.set(index, amount);
        remainingToReverse -= amount;
      }
    });

    if (remainingToReverse !== 0) {
      throw new HttpsError(
        'failed-precondition',
        'Original split payments do not have enough remaining balance to reverse this sale.',
      );
    }

    const reversalRows: SmePosPaymentRequestRow[] =
      [...allocations.entries()].map(
        ([index, amountMinor]) => ({
          accountId: stringValue(
            originalPayments[index].accountId,
            'Original payment account',
            80,
          ),

          paymentMethod:
            originalPayments[index].paymentMethod
              ? oneOf(
                  originalPayments[index].paymentMethod,
                  paymentMethodCodes,
                  'Payment method',
                )
              : null,

          paymentMethodLabel:
            optionalString(
              originalPayments[index].paymentMethodLabel,
              80,
            ) || null,

          amountMinor,
        }),
      );

    const reversalPayments =
      await postSmePosPayments({
        transaction,
        rows: reversalRows,
        settings: context.settings,
        spaceId,
        uid,
        idempotencyKey: `${key}:void`,
        now,
        transactionDate: voidDate,
        direction: 'out',
        entryType:
          sourceMode === 'marketplace_consignment'
            ? 'marketplace_pos_sale_void'
            : 'sme_pos_sale_void',
        counterparty:
          sale.customerName || 'POS customer',
        note:
          `Void reversal for POS receipt ${sale.receiptNumber || saleId}: ${reason}`,
        categoryId: 'expense-other',
        extra: {
          posSaleId: saleId,
          posVoid: true,
        },
      });

    const updatedItems = items.map((line, index) => {
      const quantity = integerBetween(
        line.quantity,
        'Sold quantity',
        1,
        9_999,
      );

      const previousReturned = integerBetween(
        line.returnedQuantity || 0,
        'Returned quantity',
        0,
        quantity,
      );

      const remainingQuantity =
        quantity - previousReturned;

      const lineNetMinor =
        netLineTotals[index];

      const previousRefundMinor =
        Number.isSafeInteger(line.returnedMinor)
          ? nonNegativeMoney(line.returnedMinor)
          : cumulativeShare(
              lineNetMinor,
              quantity,
              previousReturned,
            );

      const remainingNetMinor = Math.max(
        0,
        lineNetMinor - previousRefundMinor,
      );

      const quickAdd =
        line.quickAdd === true;

      const rawItemId =
        sourceMode === 'marketplace_consignment'
          ? line.listingId || line.productId
          : line.productId;

      const itemSnapshot =
        !quickAdd
        && remainingQuantity > 0
        && rawItemId
          ? itemById.get(String(rawItemId))
          : null;

      if (
        itemSnapshot
        && (
          !itemSnapshot.exists
          || itemSnapshot.data()?.spaceId !== spaceId
          || itemSnapshot.data()?.ownerId !== context.settings.ownerId
        )
      ) {
        throw new HttpsError(
          'failed-precondition',
          'A POS item needed for this reversal is unavailable.',
        );
      }

      if (sourceMode === 'marketplace_consignment') {
        const totalCommissionMinor =
          nonNegativeMoney(line.commissionMinor || 0);

        const previousCommissionMinor =
          Number.isSafeInteger(line.commissionReturnedMinor)
            ? nonNegativeMoney(line.commissionReturnedMinor)
            : cumulativeShare(
                totalCommissionMinor,
                quantity,
                previousReturned,
              );

        const remainingCommissionMinor = Math.max(
          0,
          totalCommissionMinor - previousCommissionMinor,
        );

        const totalSellerEarningMinor =
          Number.isSafeInteger(line.sellerEarningMinor)
            ? nonNegativeMoney(line.sellerEarningMinor)
            : Math.max(
                0,
                lineNetMinor - totalCommissionMinor,
              );

        const previousSellerEarningMinor =
          Number.isSafeInteger(line.sellerEarningReturnedMinor)
            ? nonNegativeMoney(line.sellerEarningReturnedMinor)
            : Math.max(
                0,
                previousRefundMinor - previousCommissionMinor,
              );

        const remainingSellerEarningMinor = Math.max(
          0,
          totalSellerEarningMinor - previousSellerEarningMinor,
        );

        const sellerId = stringValue(
          line.sellerId,
          'Seller ID',
          80,
        );

        const sellerSnapshot =
          sellerById.get(sellerId);

        if (
          !sellerSnapshot?.exists
          || sellerSnapshot.data()?.spaceId !== spaceId
          || sellerSnapshot.data()?.ownerId !== context.settings.ownerId
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The seller record needed for this reversal is unavailable.',
          );
        }

        const adjustment =
          sellerAdjustments.get(sellerId) || {
            gross: 0,
            commission: 0,
            earnings: 0,
            quantity: 0,
            name: String(
              sellerSnapshot.data()?.name
              || line.sellerName
              || 'Seller',
            ),
            sellerUid:
              sellerSnapshot.data()?.linkedUid
              || line.sellerUid
              || null,
          };

        adjustment.gross += remainingNetMinor;
        adjustment.commission += remainingCommissionMinor;
        adjustment.earnings += remainingSellerEarningMinor;
        adjustment.quantity += remainingQuantity;

        sellerAdjustments.set(
          sellerId,
          adjustment,
        );

        if (
          itemSnapshot
          && remainingQuantity > 0
        ) {
          const listing =
            itemSnapshot.data() || {};

          transaction.update(
            itemSnapshot.ref,
            {
              quantityOnHand:
                Number(listing.quantityOnHand || 0)
                + remainingQuantity,

              soldQuantity: Math.max(
                0,
                Number(listing.soldQuantity || 0)
                - remainingQuantity,
              ),

              grossSalesMinor: Math.max(
                0,
                Number(listing.grossSalesMinor || 0)
                - remainingNetMinor,
              ),

              commissionEarnedMinor: Math.max(
                0,
                Number(listing.commissionEarnedMinor || 0)
                - remainingCommissionMinor,
              ),

              sellerEarningsMinor: Math.max(
                0,
                Number(listing.sellerEarningsMinor || 0)
                - remainingSellerEarningMinor,
              ),

              updatedAt: now,
            },
          );
        }

        return {
          ...line,
          returnedQuantity: quantity,
          returnedMinor: lineNetMinor,
          commissionReturnedMinor:
            totalCommissionMinor,
          sellerEarningReturnedMinor:
            totalSellerEarningMinor,
        };
      }

      if (
        itemSnapshot
        && remainingQuantity > 0
      ) {
        const product =
          itemSnapshot.data() || {};

        const lineGrossMinor =
          nonNegativeMoney(
            line.lineTotalMinor || 0,
          );

        const previousGrossMinor =
          cumulativeShare(
            lineGrossMinor,
            quantity,
            previousReturned,
          );

        const remainingGrossMinor =
          Math.max(
            0,
            lineGrossMinor - previousGrossMinor,
          );

        transaction.update(
          itemSnapshot.ref,
          {
            quantityOnHand:
              product.trackStock === false
                ? 0
                : Number(product.quantityOnHand || 0)
                  + remainingQuantity,

            soldQuantity: Math.max(
              0,
              Number(product.soldQuantity || 0)
              - remainingQuantity,
            ),

            salesRevenueMinor: Math.max(
              0,
              Number(product.salesRevenueMinor || 0)
              - remainingGrossMinor,
            ),

            updatedAt: now,
          },
        );
      }

      return {
        ...line,
        returnedQuantity: quantity,
        returnedMinor: lineNetMinor,
      };
    });

    const updatedPayments =
      originalPayments.map((payment) => ({
        ...payment,
        returnedMinor:
          nonNegativeMoney(payment.amountMinor || 0),
      }));

    sellerAdjustments.forEach(
      (adjustment, sellerId) => {
        const sellerSnapshot =
          sellerById.get(sellerId)!;

        const currentBalance =
          signedMoney(
            sellerSnapshot.data()?.balanceMinor || 0,
            'Seller balance',
          );

        const nextBalance =
          currentBalance - adjustment.earnings;

        if (!Number.isSafeInteger(nextBalance)) {
          throw new HttpsError(
            'out-of-range',
            'Seller balance is outside the supported range.',
          );
        }

        transaction.update(
          sellerSnapshot.ref,
          {
            grossSalesMinor: Math.max(
              0,
              Number(sellerSnapshot.data()?.grossSalesMinor || 0)
              - adjustment.gross,
            ),

            commissionEarnedMinor: Math.max(
              0,
              Number(sellerSnapshot.data()?.commissionEarnedMinor || 0)
              - adjustment.commission,
            ),

            balanceMinor:
              nextBalance,

            soldQuantity: Math.max(
              0,
              Number(sellerSnapshot.data()?.soldQuantity || 0)
              - adjustment.quantity,
            ),

            updatedAt: now,
          },
        );

        const ledgerRef =
          db.collection('smePosSellerLedger').doc();

        transaction.create(
          ledgerRef,
          {
            displayId: displayId('SLG'),
            spaceId,
            ownerId:
              context.settings.ownerId,
            sellerId,
            sellerName:
              adjustment.name,
            sellerUid:
              adjustment.sellerUid,
            kind: 'void_adjustment',
            amountMinor:
              -adjustment.earnings,
            balanceAfterMinor:
              nextBalance,
            currency:
              String(
                sale.currency
                || context.settings.currency,
              ),
            saleId,
            receiptNumber:
              sale.receiptNumber || null,
            payoutId: null,
            note:
              `Void adjustment for ${adjustment.quantity} item(s): ${reason}`,
            createdAt: now,
          },
        );
      },
    );

    if (
      customerRef
      && customerSnapshot?.exists
      && customerSnapshot.data()?.spaceId === spaceId
    ) {
      transaction.update(
        customerRef,
        {
          totalSpentMinor: Math.max(
            0,
            Number(customerSnapshot.data()?.totalSpentMinor || 0)
            - voidedMinor,
          ),

          visitCount: Math.max(
            0,
            Number(customerSnapshot.data()?.visitCount || 0)
            - 1,
          ),

          updatedAt: now,
        },
      );
    }

    if (
      reservationRef
      && reservationSnapshot?.exists
      && reservationSnapshot.data()?.spaceId === spaceId
    ) {
      transaction.update(
        reservationRef,
        {
          saleVoidedAt: now,
          saleVoidedBy: uid,
          saleVoidReason: reason,
          updatedAt: now,
        },
      );
    }

    transaction.update(
      saleRef,
      {
        items: updatedItems,
        payments: updatedPayments,
        status: 'voided',
        returnStatus: 'full',
        returnedMinor: totalMinor,
        costMinor: 0,
        profitMinor: 0,

        ...(sourceMode === 'marketplace_consignment'
          ? {
              marketplaceCommissionMinor: 0,
              sellerEarningsMinor: 0,
            }
          : {}),

        voidedAt: now,
        voidedBy: uid,
        voidDate,
        voidReason: reason,
        voidedMinor,
        voidPayments:
          reversalPayments,
        voidTransactionIds:
          reversalPayments.map(
            (payment) => payment.transactionId,
          ),
        voidLedgerEntryIds:
          reversalPayments.map(
            (payment) => payment.ledgerEntryId,
          ),
        updatedAt: now,
      },
    );

    const result = {
      saleId,
      voidedMinor,
      transactionIds:
        reversalPayments.map(
          (payment) => payment.transactionId,
        ),
      sellerAdjustments:
        sellerAdjustments.size,
    };

    transaction.create(
      commandRef,
      {
        uid,
        kind: 'void_sme_pos_sale',
        idempotencyKey: key,
        result,
        createdAt: now,
      },
    );

    createActivity(
      transaction,
      {
        spaceId,
        actorUid: uid,
        actorName:
          context.member.displayName
          || context.member.email,
        action:
          sourceMode === 'marketplace_consignment'
            ? 'marketplace_pos_sale_voided'
            : 'pos_sale_voided',
        targetType: 'sme_pos_sale',
        targetId: saleId,
        summary:
          `Voided POS receipt ${sale.receiptNumber || saleId}. Reversed ${voidedMinor / 100} ${sale.currency || context.settings.currency}. Reason: ${reason}`,
        now,
      },
    );

    return result;
  });
});

export const setSpaceAvatar = onCall(
  { region },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        'unauthenticated',
        'Sign in before changing a Space icon.',
      );
    }

    const spaceId =
      typeof request.data?.spaceId === 'string'
        ? request.data.spaceId.trim()
        : '';

    const storagePath =
      typeof request.data?.storagePath === 'string'
        ? request.data.storagePath.trim()
        : '';

    if (!spaceId || !storagePath) {
      throw new HttpsError(
        'invalid-argument',
        'Space and image are required.',
      );
    }

    const expectedPrefix = `spaces/${spaceId}/avatar/`;

    if (
      !storagePath.startsWith(expectedPrefix)
      || !storagePath.endsWith('.jpg')
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid Space icon path.',
      );
    }

    const spaceRef = db.collection('spaces').doc(spaceId);
    const spaceSnapshot = await spaceRef.get();

    if (!spaceSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Space not found.',
      );
    }

    const space = spaceSnapshot.data() || {};

    if (space.ownerId !== uid) {
      throw new HttpsError(
        'permission-denied',
        'Only the Space owner can change its icon.',
      );
    }

    const bucket = getStorage().bucket();
    const uploadedFile = bucket.file(storagePath);
    const [exists] = await uploadedFile.exists();

    if (!exists) {
      throw new HttpsError(
        'failed-precondition',
        'Uploaded Space icon was not found.',
      );
    }

    const [metadata] = await uploadedFile.getMetadata();

    if (
      metadata.contentType !== 'image/jpeg'
      || Number(metadata.size || 0) <= 0
      || Number(metadata.size || 0) >= 700 * 1024
    ) {
      await uploadedFile.delete({ ignoreNotFound: true });

      throw new HttpsError(
        'invalid-argument',
        'Space icon must be a compressed JPEG smaller than 700 KB.',
      );
    }

    const previousPath =
      typeof space.avatarPath === 'string'
        ? space.avatarPath
        : '';

    await spaceRef.update({
      avatarPath: storagePath,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (
      previousPath
      && previousPath !== storagePath
      && previousPath.startsWith(expectedPrefix)
    ) {
      try {
        await bucket
          .file(previousPath)
          .delete({ ignoreNotFound: true });
      } catch {
        // New avatar remains safely linked.
      }
    }

    return {
      avatarPath: storagePath,
    };
  },
);

export const removeSpaceAvatar = onCall(
  { region },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        'unauthenticated',
        'Sign in before changing a Space icon.',
      );
    }

    const spaceId =
      typeof request.data?.spaceId === 'string'
        ? request.data.spaceId.trim()
        : '';

    if (!spaceId) {
      throw new HttpsError(
        'invalid-argument',
        'Space is required.',
      );
    }

    const spaceRef = db.collection('spaces').doc(spaceId);
    const spaceSnapshot = await spaceRef.get();

    if (!spaceSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Space not found.',
      );
    }

    const space = spaceSnapshot.data() || {};

    if (space.ownerId !== uid) {
      throw new HttpsError(
        'permission-denied',
        'Only the Space owner can remove its icon.',
      );
    }

    const previousPath =
      typeof space.avatarPath === 'string'
        ? space.avatarPath
        : '';

    await spaceRef.update({
      avatarPath: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (
      previousPath
      && previousPath.startsWith(`spaces/${spaceId}/avatar/`)
    ) {
      try {
        await getStorage()
          .bucket()
          .file(previousPath)
          .delete({ ignoreNotFound: true });
      } catch {
        // Metadata is already safely cleared.
      }
    }

    return {
      removed: true,
    };
  },
);

export const createDebt = onCall(
  { region },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        'unauthenticated',
        'Sign in before adding debt.',
      );
    }

    const key = stringValue(
      request.data?.idempotencyKey,
      'Idempotency key',
      64,
    );

    const direction =
      request.data?.direction === 'owe'
      || request.data?.direction === 'owed'
        ? request.data.direction
        : '';

    const counterparty =
      typeof request.data?.counterparty === 'string'
        ? request.data.counterparty.trim()
        : '';

    const description =
      typeof request.data?.description === 'string'
        ? request.data.description.trim().slice(0, 1000)
        : '';

    const principalMinor =
      Number.isInteger(request.data?.principalMinor)
        ? request.data.principalMinor
        : 0;

    const interestType =
      ['none', 'fixed', 'percentage'].includes(
        request.data?.interestType,
      )
        ? request.data.interestType
        : 'none';

    const interestRateBps =
      Number.isInteger(request.data?.interestRateBps)
        ? Math.max(
            0,
            Math.min(
              100000,
              request.data.interestRateBps,
            ),
          )
        : 0;

    const suppliedInterestMinor =
      Number.isInteger(request.data?.interestMinor)
        ? Math.max(0, request.data.interestMinor)
        : 0;

    const startDate =
      typeof request.data?.startDate === 'string'
        ? request.data.startDate
        : '';

    const dueDate =
      typeof request.data?.dueDate === 'string'
      && request.data.dueDate
        ? request.data.dueDate
        : null;

    const schedule =
      ['none', 'weekly', 'monthly', 'custom'].includes(
        request.data?.schedule,
      )
        ? request.data.schedule
        : 'none';

    const scheduleNote =
      typeof request.data?.scheduleNote === 'string'
        ? request.data.scheduleNote.trim().slice(0, 300)
        : '';

    const reminderEnabled =
      request.data?.reminderEnabled !== false;

    const spaceId =
      typeof request.data?.spaceId === 'string'
      && request.data.spaceId.trim()
        ? request.data.spaceId.trim()
        : null;

    if (!direction) {
      throw new HttpsError(
        'invalid-argument',
        'Choose whether you owe this money or it is owed to you.',
      );
    }

    if (!counterparty || counterparty.length > 160) {
      throw new HttpsError(
        'invalid-argument',
        'Enter a valid person, lender or borrower.',
      );
    }

    if (
      !Number.isInteger(principalMinor)
      || principalMinor <= 0
      || principalMinor > 999999999999
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Enter a valid debt amount.',
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new HttpsError(
        'invalid-argument',
        'Choose a valid start date.',
      );
    }

    if (
      dueDate
      && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Choose a valid due date.',
      );
    }

    if (spaceId) {
      const memberId = `${spaceId}_${uid}`;

      const [
        spaceSnapshot,
        memberSnapshot,
      ] = await Promise.all([
        db.collection('spaces')
          .doc(spaceId)
          .get(),

        db.collection('spaceMembers')
          .doc(memberId)
          .get(),
      ]);

      if (!spaceSnapshot.exists) {
        throw new HttpsError(
          'not-found',
          'The linked Space was not found.',
        );
      }

      const memberStatus =
        memberSnapshot.exists
          ? String(memberSnapshot.data()?.status || '')
          : '';

      const activeMember =
        memberSnapshot.exists
        && (
          !memberStatus
          || memberStatus === 'active'
        );

      const ownsSpace =
        spaceSnapshot.data()?.ownerId === uid;

      if (!ownsSpace && !activeMember) {
        throw new HttpsError(
          'permission-denied',
          'You cannot link this debt to that Space.',
        );
      }
    }

    const interestMinor =
      interestType === 'percentage'
        ? Math.round(
            principalMinor
            * interestRateBps
            / 10000,
          )
        : interestType === 'fixed'
          ? suppliedInterestMinor
          : 0;

    const totalMinor =
      principalMinor + interestMinor;

    const debtRef =
      db.collection('debts')
        .doc(commandId(uid, key));

    await db.runTransaction(
      async (transaction) => {
        const existing =
          await transaction.get(debtRef);

        if (existing.exists) {
          if (existing.data()?.ownerId !== uid) {
            throw new HttpsError(
              'permission-denied',
              'You cannot use this Debt command.',
            );
          }

          return;
        }

        const now =
          FieldValue.serverTimestamp();

        transaction.create(
          debtRef,
          {
            displayId:
              `DEBT-${debtRef.id.slice(-8).toUpperCase()}`,
            ownerId: uid,
            direction,
            counterparty,
            description,
            principalMinor,
            interestType,
            interestRateBps:
              interestType === 'percentage'
                ? interestRateBps
                : 0,
            interestMinor,
            totalMinor,
            paidMinor: 0,
            balanceMinor: totalMinor,
            currency: 'BND',
            startDate,
            dueDate,
            schedule,
            scheduleNote,
            reminderEnabled,
            spaceId,
            status: 'active',
            settledAt: null,
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        );
      },
    );

    return {
      debtId: debtRef.id,
    };
  },
);

export const archiveDebt = onCall(
  { region },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        'unauthenticated',
        'Sign in before changing debt.',
      );
    }

    const debtId =
      typeof request.data?.debtId === 'string'
        ? request.data.debtId.trim()
        : '';

    if (!debtId) {
      throw new HttpsError(
        'invalid-argument',
        'Debt record is required.',
      );
    }

    const debtRef =
      db.collection('debts').doc(debtId);

    const debtSnapshot =
      await debtRef.get();

    if (!debtSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Debt record not found.',
      );
    }

    if (debtSnapshot.data()?.ownerId !== uid) {
      throw new HttpsError(
        'permission-denied',
        'You cannot change this debt record.',
      );
    }

    await debtRef.update({
      status: 'archived',
      archivedAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    return {
      debtId,
    };
  },
);

export const recordDebtPayment = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);

    const debtId =
      stringValue(request.data?.debtId, 'Debt record', 160);

    const accountId =
      stringValue(request.data?.accountId, 'Account', 160);

    const amountMinor =
      positiveMoney(request.data?.amountMinor);

    const paymentDate =
      localDate(request.data?.paymentDate, 'Payment date');

    const note =
      optionalString(request.data?.note, 500);

    const idempotencyKey =
      stringValue(
        request.data?.idempotencyKey,
        'Idempotency key',
        64,
      );

    const paymentRef =
      db.collection('debtPayments')
        .doc(`${uid}_${idempotencyKey}`);

    const debtRef =
      db.collection('debts').doc(debtId);

    const accountRef =
      db.collection('accounts').doc(accountId);

    const transactionRef =
      db.collection('transactions').doc();

    const result = await db.runTransaction(
      async (transaction) => {
        const existingPayment =
          await transaction.get(paymentRef);

        if (existingPayment.exists) {
          const existing =
            existingPayment.data() || {};

          return {
            paymentId: paymentRef.id,
            transactionId:
              String(existing.transactionId || ''),
          };
        }

        const debtSnapshot =
          await transaction.get(debtRef);

        const accountSnapshot =
          await transaction.get(accountRef);

        if (!debtSnapshot.exists) {
          throw new HttpsError(
            'not-found',
            'Debt record not found.',
          );
        }

        const debt =
          debtSnapshot.data() || {};

        if (debt.ownerId !== uid) {
          throw new HttpsError(
            'permission-denied',
            'You cannot record a payment for this debt.',
          );
        }

        if (debt.status !== 'active') {
          throw new HttpsError(
            'failed-precondition',
            'Only active debt can receive a payment.',
          );
        }

        const currentBalance =
          nonNegativeMoney(debt.balanceMinor);

        const currentPaid =
          nonNegativeMoney(debt.paidMinor);

        if (amountMinor > currentBalance) {
          throw new HttpsError(
            'failed-precondition',
            'Payment is greater than the outstanding debt balance.',
          );
        }

        const account =
          assertAccount(
            accountSnapshot.data(),
            uid,
            'Account',
          );

        if (account.currency !== 'BND') {
          throw new HttpsError(
            'failed-precondition',
            'Debt payments currently require a BND account.',
          );
        }

        const direction =
          debt.direction === 'owed'
            ? 'owed'
            : 'owe';

        const flow =
          direction === 'owe'
            ? 'out'
            : 'in';

        const accountDelta =
          accountEffect(
            account.type,
            flow,
            amountMinor,
          );

        const nextBalance =
          currentBalance - amountMinor;

        const nextPaid =
          currentPaid + amountMinor;

        const now =
          FieldValue.serverTimestamp();

        const accountData =
          accountSnapshot.data() || {};

        const spaceId =
          typeof debt.spaceId === 'string' && debt.spaceId
            ? debt.spaceId
            : String(accountData.spaceId || '');

        const transactionType =
          direction === 'owe'
            ? 'expense'
            : 'income';

        transaction.create(
          transactionRef,
          {
            displayId: displayId('TXN'),
            ownerId: uid,
            type: transactionType,
            status: 'posted',
            accountId,
            destinationAccountId: null,
            spaceId,
            amountMinor,
            currency: 'BND',
            transactionDate: paymentDate,
            categoryId: null,
            category:
              direction === 'owe'
                ? 'Debt repayment'
                : 'Debt repayment received',
            categoryIcon: 'repeat',
            categoryColor: 'slate',
            categoryScope: 'personal',
            counterparty:
              String(debt.counterparty || ''),
            note,
            paymentMethod: null,
            paymentMethodLabel: null,
            sourceType: 'debt_payment',
            sourceId: paymentRef.id,
            postedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        );

        const ledgerEntryId =
          createLedgerEntry(
            transaction,
            {
              accountId,
              ownerId: uid,
              spaceId,
              transactionId: transactionRef.id,
              entryType:
                direction === 'owe'
                  ? 'debt_payment_out'
                  : 'debt_payment_in',
              amountMinor: accountDelta,
              currency: 'BND',
              idempotencyKey,
              now,
            },
          );

        updateAccountBalance(
          transaction,
          accountRef,
          account,
          accountDelta,
        );

        transaction.create(
          paymentRef,
          {
            displayId: displayId('DPAY'),
            ownerId: uid,
            debtId,
            direction,
            amountMinor,
            currency: 'BND',
            paymentDate,
            accountId,
            accountName:
              String(accountData.name || 'Account'),
            transactionId: transactionRef.id,
            ledgerEntryId,
            proofPath: null,
            note,
            reversedAt: null,
            reversedBy: null,
            reversalReason: null,
            reversalTransactionId: null,
            reversalLedgerEntryId: null,
            createdAt: now,
          },
        );

        transaction.update(
          debtRef,
          {
            paidMinor: nextPaid,
            balanceMinor: nextBalance,
            status:
              nextBalance === 0
                ? 'settled'
                : 'active',
            settledAt:
              nextBalance === 0
                ? now
                : null,
            updatedAt: now,
          },
        );

        return {
          paymentId: paymentRef.id,
          transactionId: transactionRef.id,
        };
      },
    );

    return result;
  },
);

export const reverseDebtPayment = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);

    const paymentId =
      stringValue(
        request.data?.paymentId,
        'Debt payment',
        200,
      );

    const reversalDate =
      localDate(
        request.data?.reversalDate,
        'Reversal date',
      );

    const reason =
      stringValue(
        request.data?.reason,
        'Reversal reason',
        500,
      );

    const idempotencyKey =
      stringValue(
        request.data?.idempotencyKey,
        'Idempotency key',
        64,
      );

    const paymentRef =
      db.collection('debtPayments').doc(paymentId);

    const reversalTransactionRef =
      db.collection('transactions').doc();

    const result = await db.runTransaction(
      async (transaction) => {
        const paymentSnapshot =
          await transaction.get(paymentRef);

        if (!paymentSnapshot.exists) {
          throw new HttpsError(
            'not-found',
            'Debt payment not found.',
          );
        }

        const payment =
          paymentSnapshot.data() || {};

        if (payment.ownerId !== uid) {
          throw new HttpsError(
            'permission-denied',
            'You cannot reverse this debt payment.',
          );
        }

        if (payment.reversedAt) {
          return {
            paymentId,
            reversalTransactionId:
              String(payment.reversalTransactionId || ''),
          };
        }

        const debtId =
          String(payment.debtId || '');

        const accountId =
          String(payment.accountId || '');

        const transactionId =
          String(payment.transactionId || '');

        const debtRef =
          db.collection('debts').doc(debtId);

        const accountRef =
          db.collection('accounts').doc(accountId);

        const originalTransactionRef =
          db.collection('transactions').doc(transactionId);

        const debtSnapshot =
          await transaction.get(debtRef);

        const accountSnapshot =
          await transaction.get(accountRef);

        const originalTransactionSnapshot =
          await transaction.get(originalTransactionRef);

        if (!debtSnapshot.exists) {
          throw new HttpsError(
            'failed-precondition',
            'The linked debt record no longer exists.',
          );
        }

        const debt =
          debtSnapshot.data() || {};

        if (debt.ownerId !== uid) {
          throw new HttpsError(
            'permission-denied',
            'You cannot change this debt.',
          );
        }

        const account =
          assertAccount(
            accountSnapshot.data(),
            uid,
            'Account',
            true,
          );

        const amountMinor =
          positiveMoney(payment.amountMinor);

        const direction =
          payment.direction === 'owed'
            ? 'owed'
            : 'owe';

        const originalFlow =
          direction === 'owe'
            ? 'out'
            : 'in';

        const originalDelta =
          accountEffect(
            account.type,
            originalFlow,
            amountMinor,
          );

        const reversalDelta =
          -originalDelta;

        const currentPaid =
          nonNegativeMoney(debt.paidMinor);

        const currentBalance =
          nonNegativeMoney(debt.balanceMinor);

        const nextPaid =
          Math.max(0, currentPaid - amountMinor);

        const nextBalance =
          currentBalance + amountMinor;

        if (
          !Number.isSafeInteger(nextBalance) ||
          nextBalance > Number(debt.totalMinor || 0)
        ) {
          throw new HttpsError(
            'failed-precondition',
            'Debt balance cannot be safely reversed.',
          );
        }

        const now =
          FieldValue.serverTimestamp();

        const accountData =
          accountSnapshot.data() || {};

        const originalTransactionData =
          originalTransactionSnapshot.data() || {};

        const spaceId =
          String(
            originalTransactionData.spaceId ||
            debt.spaceId ||
            accountData.spaceId ||
            '',
          );

        transaction.create(
          reversalTransactionRef,
          {
            displayId: displayId('TXN'),
            ownerId: uid,
            type: 'reversal',
            status: 'posted',
            accountId,
            destinationAccountId: null,
            spaceId,
            amountMinor,
            currency: 'BND',
            transactionDate: reversalDate,
            categoryId: null,
            category: 'Debt payment reversal',
            categoryIcon: 'repeat',
            categoryColor: 'slate',
            categoryScope: 'personal',
            counterparty:
              String(debt.counterparty || ''),
            note: reason,
            paymentMethod: null,
            paymentMethodLabel: null,
            sourceType: 'debt_payment_reversal',
            sourceId: paymentId,
            reversalOf: transactionId,
            postedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        );

        const reversalLedgerEntryId =
          createLedgerEntry(
            transaction,
            {
              accountId,
              ownerId: uid,
              spaceId,
              transactionId:
                reversalTransactionRef.id,
              entryType:
                direction === 'owe'
                  ? 'debt_payment_reversal_in'
                  : 'debt_payment_reversal_out',
              amountMinor: reversalDelta,
              currency: 'BND',
              idempotencyKey,
              now,
            },
          );

        updateAccountBalance(
          transaction,
          accountRef,
          account,
          reversalDelta,
        );

        if (originalTransactionSnapshot.exists) {
          transaction.update(
            originalTransactionRef,
            {
              status: 'reversed',
              reversedAt: now,
              reversalTransactionId:
                reversalTransactionRef.id,
              updatedAt: now,
            },
          );
        }

        transaction.update(
          paymentRef,
          {
            reversedAt: now,
            reversedBy: uid,
            reversalReason: reason,
            reversalTransactionId:
              reversalTransactionRef.id,
            reversalLedgerEntryId,
          },
        );

        transaction.update(
          debtRef,
          {
            paidMinor: nextPaid,
            balanceMinor: nextBalance,
            status: 'active',
            settledAt: null,
            updatedAt: now,
          },
        );

        return {
          paymentId,
          reversalTransactionId:
            reversalTransactionRef.id,
        };
      },
    );

    return result;
  },
);

export const setDebtPaymentProof = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);

    const paymentId =
      stringValue(
        request.data?.paymentId,
        'Debt payment',
        200,
      );

    const storagePath =
      stringValue(
        request.data?.storagePath,
        'Payment proof path',
        500,
      );

    const fileName =
      stringValue(
        request.data?.fileName,
        'Payment proof file name',
        180,
      );

    const contentType =
      stringValue(
        request.data?.contentType,
        'Payment proof content type',
        120,
      );

    const sizeBytes =
      Number(request.data?.sizeBytes);

    const expectedPrefix =
      `users/${uid}/debt-payment-proofs/${paymentId}/`;

    if (!storagePath.startsWith(expectedPrefix)) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid Debt payment proof path.',
      );
    }

    if (
      contentType !== 'application/pdf'
      && !contentType.startsWith('image/')
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Payment proof must be an image or PDF.',
      );
    }

    if (
      !Number.isSafeInteger(sizeBytes)
      || sizeBytes <= 0
      || sizeBytes >= 10 * 1024 * 1024
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Payment proof must be smaller than 10 MB.',
      );
    }

    const paymentRef =
      db.collection('debtPayments').doc(paymentId);

    const paymentSnapshot =
      await paymentRef.get();

    if (!paymentSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Debt payment not found.',
      );
    }

    const payment =
      paymentSnapshot.data() || {};

    if (payment.ownerId !== uid) {
      throw new HttpsError(
        'permission-denied',
        'You cannot attach proof to this payment.',
      );
    }

    const bucket = getStorage().bucket();
    const uploadedFile = bucket.file(storagePath);
    const [exists] = await uploadedFile.exists();

    if (!exists) {
      throw new HttpsError(
        'failed-precondition',
        'Uploaded payment proof was not found.',
      );
    }

    const [metadata] =
      await uploadedFile.getMetadata();

    const actualSize =
      Number(metadata.size || 0);

    const actualType =
      String(metadata.contentType || '');

    if (
      actualSize <= 0
      || actualSize >= 10 * 1024 * 1024
      || (
        actualType !== 'application/pdf'
        && !actualType.startsWith('image/')
      )
    ) {
      await uploadedFile.delete({
        ignoreNotFound: true,
      });

      throw new HttpsError(
        'invalid-argument',
        'Stored payment proof is not a supported image or PDF.',
      );
    }

    const previousPath =
      typeof payment.proofPath === 'string'
        ? payment.proofPath
        : '';

    await paymentRef.update({
      proofPath: storagePath,
      proofFileName: fileName,
      proofContentType: actualType,
      proofSizeBytes: actualSize,
    });

    if (
      previousPath
      && previousPath !== storagePath
      && previousPath.startsWith(
        `users/${uid}/debt-payment-proofs/${paymentId}/`,
      )
    ) {
      try {
        await bucket
          .file(previousPath)
          .delete({
            ignoreNotFound: true,
          });
      } catch {
        // New proof is already safely linked.
      }
    }

    return {
      paymentId,
    };
  },
);

export const removeDebtPaymentProof = onCall(
  { region },
  async (request) => {
    const uid = requireAuth(request.auth?.uid);

    const paymentId =
      stringValue(
        request.data?.paymentId,
        'Debt payment',
        200,
      );

    const paymentRef =
      db.collection('debtPayments').doc(paymentId);

    const paymentSnapshot =
      await paymentRef.get();

    if (!paymentSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Debt payment not found.',
      );
    }

    const payment =
      paymentSnapshot.data() || {};

    if (payment.ownerId !== uid) {
      throw new HttpsError(
        'permission-denied',
        'You cannot remove proof from this payment.',
      );
    }

    const previousPath =
      typeof payment.proofPath === 'string'
        ? payment.proofPath
        : '';

    await paymentRef.update({
      proofPath: null,
      proofFileName: null,
      proofContentType: null,
      proofSizeBytes: null,
    });

    if (
      previousPath
      && previousPath.startsWith(
        `users/${uid}/debt-payment-proofs/${paymentId}/`,
      )
    ) {
      try {
        await getStorage()
          .bucket()
          .file(previousPath)
          .delete({
            ignoreNotFound: true,
          });
      } catch {
        // Firestore no longer exposes the proof.
      }
    }

    return {
      paymentId,
    };
  },
);


/* ==================================================
 * v1.9.0 Plus payment proof workflow
 * ================================================== */

const bajetBnPlusRequestPlans = {
  monthly: {
    label: '1 Month',
    months: 1,
    amountMinor: 490,
  },
  threeMonths: {
    label: '3 Months',
    months: 3,
    amountMinor: 1300,
  },
  sixMonths: {
    label: '6 Months',
    months: 6,
    amountMinor: 2400,
  },
  yearly: {
    label: '12 Months',
    months: 12,
    amountMinor: 4200,
  },
} as const;

type BajetBnPlusRequestPlanKey =
  keyof typeof bajetBnPlusRequestPlans;

function subscriptionRequestResponse(
  snapshot: FirebaseFirestore.DocumentSnapshot,
) {
  const data = snapshot.data() || {};

  return {
    id: snapshot.id,
    reference:
      String(data.reference || snapshot.id),
    uid:
      String(data.uid || ''),
    email:
      String(data.email || ''),
    fullName:
      String(data.fullName || ''),
    planKey:
      String(data.planKey || ''),
    planLabel:
      String(data.planLabel || ''),
    months:
      Number(data.months || 0),
    amountMinor:
      Number(data.amountMinor || 0),
    currency: 'BND' as const,
    status:
      String(data.status || 'awaiting_payment'),
    proofPath:
      data.proofPath
        ? String(data.proofPath)
        : null,
    createdAt:
      timestampToIso(data.createdAt),
    submittedAt:
      timestampToIso(data.submittedAt),
    reviewedAt:
      timestampToIso(data.reviewedAt),
    reviewedBy:
      data.reviewedBy
        ? String(data.reviewedBy)
        : null,
    reviewNote:
      data.reviewNote
        ? String(data.reviewNote)
        : null,
  };
}

export const createSubscriptionRequest = onCall(
  { region },
  async (request) => {
    const uid =
      requireAuth(request.auth?.uid);

    const planKey = oneOf(
      request.data?.planKey,
      [
        'monthly',
        'threeMonths',
        'sixMonths',
        'yearly',
      ] as const,
      'Plus plan',
    ) as BajetBnPlusRequestPlanKey;

    const plan =
      bajetBnPlusRequestPlans[planKey];

    const userSnapshot =
      await db
        .collection('users')
        .doc(uid)
        .get();

    if (!userSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'BajetBN user profile not found.',
      );
    }

    const user =
      userSnapshot.data() || {};

    const requestRef =
      db.collection(
        'subscriptionRequests',
      ).doc();

    const reference =
      `BBN-${Date.now().toString(36).toUpperCase()}-${requestRef.id.slice(0, 6).toUpperCase()}`;

    const now =
      FieldValue.serverTimestamp();

    await requestRef.create({
      reference,
      uid,
      email:
        String(user.email || ''),
      fullName:
        String(user.fullName || ''),
      planKey,
      planLabel: plan.label,
      months: plan.months,
      amountMinor: plan.amountMinor,
      currency: 'BND',
      status: 'awaiting_payment',
      proofPath: null,
      createdAt: now,
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
      updatedAt: now,
    });

    const snapshot =
      await requestRef.get();

    return {
      request:
        subscriptionRequestResponse(
          snapshot,
        ),
    };
  },
);

export const submitSubscriptionPaymentProof = onCall(
  { region },
  async (request) => {
    const uid =
      requireAuth(request.auth?.uid);

    const requestId =
      stringValue(
        request.data?.requestId,
        'Subscription request',
        128,
      );

    const proofPath =
      stringValue(
        request.data?.proofPath,
        'Payment proof',
        500,
      );

    const expectedPrefix =
      `subscription-proofs/${uid}/${requestId}/`;

    if (
      !proofPath.startsWith(
        expectedPrefix,
      )
    ) {
      throw new HttpsError(
        'permission-denied',
        'The payment proof path is invalid.',
      );
    }

    const requestRef =
      db.collection(
        'subscriptionRequests',
      ).doc(requestId);

    await db.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            requestRef,
          );

        if (!snapshot.exists) {
          throw new HttpsError(
            'not-found',
            'Subscription request not found.',
          );
        }

        const data =
          snapshot.data() || {};

        if (data.uid !== uid) {
          throw new HttpsError(
            'permission-denied',
            'This subscription request belongs to another user.',
          );
        }

        if (
          data.status
          !== 'awaiting_payment'
        ) {
          throw new HttpsError(
            'failed-precondition',
            'This subscription request has already been submitted.',
          );
        }

        const now =
          FieldValue.serverTimestamp();

        transaction.update(
          requestRef,
          {
            proofPath,
            status: 'pending_review',
            submittedAt: now,
            updatedAt: now,
          },
        );
      },
    );

    return {
      request:
        subscriptionRequestResponse(
          await requestRef.get(),
        ),
    };
  },
);

export const listMySubscriptionRequests = onCall(
  { region },
  async (request) => {
    const uid =
      requireAuth(request.auth?.uid);

    const snapshot =
      await db
        .collection(
          'subscriptionRequests',
        )
        .where('uid', '==', uid)
        .limit(50)
        .get();

    const requests =
      snapshot.docs
        .sort(
          (a, b) =>
            (
              b.data().createdAt
                ?.toMillis?.()
              || 0
            )
            - (
              a.data().createdAt
                ?.toMillis?.()
              || 0
            ),
        )
        .map(
          subscriptionRequestResponse,
        );

    return { requests };
  },
);

export const adminListSubscriptionRequests = onCall(
  { region },
  async (request) => {
    await requirePlatformAdmin(
      request,
    );

    const snapshot =
      await db
        .collection(
          'subscriptionRequests',
        )
        .orderBy(
          'createdAt',
          'desc',
        )
        .limit(100)
        .get();

    return {
      requests:
        snapshot.docs.map(
          subscriptionRequestResponse,
        ),
    };
  },
);

export const adminReviewSubscriptionRequest = onCall(
  { region },
  async (request) => {
    const adminUid =
      await requirePlatformAdmin(
        request,
      );

    const requestId =
      stringValue(
        request.data?.requestId,
        'Subscription request',
        128,
      );

    const decision =
      oneOf(
        request.data?.decision,
        [
          'approve',
          'reject',
        ] as const,
        'Review decision',
      );

    const note =
      optionalString(
        request.data?.note,
        500,
      );

    const requestRef =
      db.collection(
        'subscriptionRequests',
      ).doc(requestId);

    return db.runTransaction(
      async (transaction) => {
        const requestSnapshot =
          await transaction.get(
            requestRef,
          );

        if (!requestSnapshot.exists) {
          throw new HttpsError(
            'not-found',
            'Subscription request not found.',
          );
        }

        const paymentRequest =
          requestSnapshot.data() || {};

        if (
          paymentRequest.status
          !== 'pending_review'
        ) {
          throw new HttpsError(
            'failed-precondition',
            'This payment request is no longer waiting for review.',
          );
        }

        if (
          !paymentRequest.proofPath
        ) {
          throw new HttpsError(
            'failed-precondition',
            'This payment request has no proof attached.',
          );
        }

        const targetUid =
          stringValue(
            paymentRequest.uid,
            'User',
            128,
          );

        const userRef =
          db.collection('users')
            .doc(targetUid);

        const userSnapshot =
          await transaction.get(
            userRef,
          );

        if (!userSnapshot.exists) {
          throw new HttpsError(
            'not-found',
            'The BajetBN user was not found.',
          );
        }

        const current =
          userSnapshot.data() || {};

        const now =
          FieldValue.serverTimestamp();

        if (decision === 'reject') {
          transaction.update(
            requestRef,
            {
              status: 'rejected',
              reviewedAt: now,
              reviewedBy: adminUid,
              reviewNote: note || null,
              updatedAt: now,
            },
          );

          const auditRef =
            db.collection(
              'subscriptionAudit',
            ).doc();

          transaction.create(
            auditRef,
            {
              targetUid,
              targetEmail:
                String(
                  current.email || '',
                ),
              action:
                'payment_request_rejected',
              previousPlan:
                current.subscriptionPlan
                || 'basic',
              previousStatus:
                current.subscriptionStatus
                || 'basic',
              nextPlan:
                current.subscriptionPlan
                || 'basic',
              nextStatus:
                current.subscriptionStatus
                || 'basic',
              source:
                'whatsapp_manual',
              adminUid,
              subscriptionRequestId:
                requestId,
              createdAt: now,
            },
          );

          return {
            requestId,
            decision,
          };
        }

        if (
          current.subscriptionPlan
            === 'plus'
          && current.subscriptionStatus
            === 'active'
          && current.subscriptionExpiresAt
            == null
        ) {
          throw new HttpsError(
            'failed-precondition',
            'This user already has non-expiring Plus access.',
          );
        }

        const expiresAt =
          current.subscriptionExpiresAt;

        const currentlyPlus =
          current.subscriptionPlan
            === 'plus'
          && current.subscriptionStatus
            === 'active'
          && (
            !(expiresAt instanceof Timestamp)
            || expiresAt.toMillis()
              > Date.now()
          );

        const months =
          integerBetween(
            paymentRequest.months,
            'Subscription months',
            1,
            12,
          );

        if (
          ![1, 3, 6, 12].includes(
            months,
          )
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The requested Plus duration is invalid.',
          );
        }

        const expiry =
          subscriptionExpiryFromInput(
            {
              action:
                currentlyPlus
                  ? 'extend'
                  : 'activate',
              months,
            },
            current.subscriptionExpiresAt,
          );

        const expiryTimestamp =
          Timestamp.fromDate(expiry);

        transaction.set(
          userRef,
          {
            subscriptionPlan: 'plus',
            subscriptionStatus:
              'active',
            subscriptionStartedAt:
              currentlyPlus
              && current.subscriptionStartedAt
                ? current.subscriptionStartedAt
                : Timestamp.now(),
            subscriptionExpiresAt:
              expiryTimestamp,
            subscriptionLifetime: false,
            subscriptionSource:
              'whatsapp_manual',
            updatedAt: now,
          },
          { merge: true },
        );

        transaction.update(
          requestRef,
          {
            status: 'approved',
            reviewedAt: now,
            reviewedBy: adminUid,
            reviewNote: note || null,
            approvedExpiresAt:
              expiryTimestamp,
            updatedAt: now,
          },
        );

        const auditRef =
          db.collection(
            'subscriptionAudit',
          ).doc();

        transaction.create(
          auditRef,
          {
            targetUid,
            targetEmail:
              String(
                current.email || '',
              ),
            action:
              currentlyPlus
                ? 'extend'
                : 'activate',
            previousPlan:
              current.subscriptionPlan
              || 'basic',
            previousStatus:
              current.subscriptionStatus
              || 'basic',
            previousExpiresAt:
              current.subscriptionExpiresAt
              || null,
            nextPlan: 'plus',
            nextStatus: 'active',
            nextExpiresAt:
              expiryTimestamp,
            source:
              'whatsapp_manual',
            adminUid,
            subscriptionRequestId:
              requestId,
            createdAt: now,
          },
        );

        return {
          requestId,
          decision,
          subscriptionExpiresAt:
            expiry.toISOString(),
        };
      },
    );
  },
);

/* ==================================================
 * v1.9.0 permanent POS sale deletion
 * ================================================== */

export const deleteSmePosSalePermanently = onCall(
  { region },
  async (request) => {
    const uid =
      requireAuth(request.auth?.uid);

    const spaceId =
      stringValue(
        request.data?.spaceId,
        'Space ID',
        80,
      );

    const saleId =
      stringValue(
        request.data?.saleId,
        'Sale ID',
        80,
      );

    const reason =
      stringValue(
        request.data?.reason,
        'Deletion reason',
        500,
      );

    const confirmation =
      stringValue(
        request.data?.confirmation,
        'Deletion confirmation',
        20,
      );

    if (
      confirmation !== 'DELETE'
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Type DELETE to confirm permanent deletion.',
      );
    }

    const key =
      stringValue(
        request.data?.idempotencyKey,
        'Idempotency key',
        64,
      );

    const context =
      await requireSmePosActor(
        spaceId,
        uid,
        ['owner'],
      );

    const saleRef =
      db.collection(
        'smePosSales',
      ).doc(saleId);

    const auditRef =
      db.collection(
        'smePosDeletionAudit',
      ).doc(saleId);

    const commandRef =
      db.collection(
        'smePosCommands',
      ).doc(
        commandId(uid, key),
      );

    const previousAudit =
      await auditRef.get();

    if (previousAudit.exists) {
      const audit =
        previousAudit.data() || {};

      if (
        audit.spaceId === spaceId
        && audit.ownerId
          === context.settings.ownerId
      ) {
        return {
          saleId,
          deleted: true,
        };
      }
    }

    const initialSale =
      await saleRef.get();

    if (!initialSale.exists) {
      throw new HttpsError(
        'not-found',
        'POS sale not found.',
      );
    }

    const initialData =
      initialSale.data() || {};

    if (
      initialData.spaceId !== spaceId
      || initialData.ownerId
        !== context.settings.ownerId
    ) {
      throw new HttpsError(
        'permission-denied',
        'This sale belongs to another shop.',
      );
    }

    const totalMinor =
      nonNegativeMoney(
        initialData.totalMinor || 0,
      );

    const returnedMinor =
      nonNegativeMoney(
        initialData.returnedMinor || 0,
      );

    const safelyReversed =
      initialData.status === 'voided'
      || initialData.status === 'refunded'
      || returnedMinor >= totalMinor;

    if (!safelyReversed) {
      throw new HttpsError(
        'failed-precondition',
        'Void the remaining sale before permanently deleting it.',
      );
    }

    const [
      sellerLedgerSnapshot,
      activitySnapshot,
    ] = await Promise.all([
      db.collection(
        'smePosSellerLedger',
      )
        .where(
          'saleId',
          '==',
          saleId,
        )
        .limit(100)
        .get(),

      db.collection(
        'spaceActivities',
      )
        .where(
          'targetId',
          '==',
          saleId,
        )
        .limit(100)
        .get(),
    ]);

    if (
      sellerLedgerSnapshot.size >= 100
      || activitySnapshot.size >= 100
    ) {
      throw new HttpsError(
        'failed-precondition',
        'This sale has unusually large related history. Contact the platform administrator before deleting it.',
      );
    }

    return db.runTransaction(
      async (transaction) => {
        const [
          command,
          tombstone,
          saleSnapshot,
        ] = await Promise.all([
          transaction.get(
            commandRef,
          ),
          transaction.get(
            auditRef,
          ),
          transaction.get(
            saleRef,
          ),
        ]);

        if (command.exists) {
          return command.data()
            ?.result;
        }

        if (tombstone.exists) {
          const result = {
            saleId,
            deleted: true,
          };

          transaction.create(
            commandRef,
            {
              uid,
              kind:
                'delete_sme_pos_sale_permanently',
              idempotencyKey: key,
              result,
              createdAt:
                FieldValue.serverTimestamp(),
            },
          );

          return result;
        }

        if (!saleSnapshot.exists) {
          throw new HttpsError(
            'not-found',
            'POS sale not found.',
          );
        }

        const sale =
          saleSnapshot.data() || {};

        if (
          sale.spaceId !== spaceId
          || sale.ownerId
            !== context.settings.ownerId
        ) {
          throw new HttpsError(
            'permission-denied',
            'This sale belongs to another shop.',
          );
        }

        const saleTotal =
          nonNegativeMoney(
            sale.totalMinor || 0,
          );

        const saleReturned =
          nonNegativeMoney(
            sale.returnedMinor || 0,
          );

        if (
          sale.status !== 'voided'
          && sale.status !== 'refunded'
          && saleReturned < saleTotal
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The sale is not fully reversed.',
          );
        }

        const now =
          FieldValue.serverTimestamp();

        transaction.delete(
          saleRef,
        );

        sellerLedgerSnapshot.docs
          .forEach((document) => {
            transaction.delete(
              document.ref,
            );
          });

        activitySnapshot.docs
          .filter(
            (document) =>
              document.data()?.spaceId
                === spaceId
              && document.data()
                ?.targetType
                === 'sme_pos_sale',
          )
          .forEach((document) => {
            transaction.delete(
              document.ref,
            );
          });

        transaction.create(
          auditRef,
          {
            saleId,
            receiptNumber:
              String(
                sale.receiptNumber
                || saleId,
              ),
            spaceId,
            ownerId:
              context.settings.ownerId,
            deletedBy: uid,
            deletionReason:
              reason,
            deletedAt: now,
          },
        );

        const result = {
          saleId,
          deleted: true,
        };

        transaction.create(
          commandRef,
          {
            uid,
            kind:
              'delete_sme_pos_sale_permanently',
            idempotencyKey: key,
            result,
            createdAt: now,
          },
        );

        return result;
      },
    );
  },
);
