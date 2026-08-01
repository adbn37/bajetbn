import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue, getFirestore, Timestamp, type DocumentData, type DocumentReference, type Query, type QueryDocumentSnapshot, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createHash, randomBytes } from 'node:crypto';

initializeApp();
const db = getFirestore();
const region = 'asia-southeast1';

const accountTypes = ['bank', 'cash', 'e_wallet', 'credit_card'] as const;
const transactionTypes = ['income', 'expense', 'transfer'] as const;
const categoryKinds = ['income', 'expense'] as const;
const categoryScopes = ['personal', 'business', 'both'] as const;
const categoryIcons = ['wallet', 'briefcase', 'gift', 'shop', 'laptop', 'home', 'food', 'cart', 'fuel', 'car', 'bus', 'bill', 'phone', 'school', 'health', 'family', 'heart', 'bag', 'game', 'repeat', 'tools', 'staff', 'building', 'bank', 'plane', 'dots'] as const;
const categoryColors = ['teal', 'blue', 'violet', 'amber', 'rose', 'green', 'slate'] as const;
const budgetPeriodTypes = ['monthly', 'custom'] as const;
const commitmentTypes = ['bill', 'instalment'] as const;
const commitmentFrequencies = ['once', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
type AccountType = (typeof accountTypes)[number];
type PostedTransactionType = (typeof transactionTypes)[number];
type CategoryKind = (typeof categoryKinds)[number];
type CategoryScope = (typeof categoryScopes)[number];
type CommitmentFrequency = (typeof commitmentFrequencies)[number];

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
  if (!allowArchived && data.archivedAt) throw new HttpsError('failed-precondition', `${label} is archived.`);
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
      uid, fullName, email: request.auth?.token.email || '', language, currency, timezone,
      appearance: 'dark', textSize: 'normal', notificationsEnabled: true,
      dueSoonReminders: true, lateReminders: true, sharedPaymentNotifications: true,
      whatsappRemindersEnabled: true, reminderDaysBefore: 3,
      onboardingCompleted: true, personalSpaceId: spaceRef.id,
      createdAt: userSnapshot.exists ? userSnapshot.data()?.createdAt || now : now, updatedAt: now,
    }, { merge: true });
    return { personalSpaceId: spaceRef.id, alreadyCompleted: false };
  });
});

export const createAccount = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const name = stringValue(request.data?.name, 'Account name');
  const institution = optionalString(request.data?.institution);
  const type = oneOf(request.data?.type, accountTypes, 'account type');
  const classification = oneOf(request.data?.classification, ['personal', 'business'] as const, 'classification');
  const currency = oneOf(request.data?.currency, ['BND', 'MYR', 'SGD', 'USD'] as const, 'currency');
  const openingBalanceMinor = request.data?.openingBalanceMinor;
  if (!Number.isSafeInteger(openingBalanceMinor) || Math.abs(openingBalanceMinor) > 99_999_999_999) {
    throw new HttpsError('invalid-argument', 'Opening balance must be a safe integer in minor units.');
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
      displayId: displayId('ACC'), ownerId: uid, name, institution, type, classification,
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
  const type = oneOf(request.data?.type, accountTypes, 'account type');
  const classification = oneOf(request.data?.classification, ['personal', 'business'] as const, 'classification');
  const ref = db.collection('accounts').doc(accountId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Account not found.');
  if (snapshot.data()?.ownerId !== uid) throw new HttpsError('permission-denied', 'You do not own this account.');
  await ref.update({ name, institution, type, classification, updatedAt: FieldValue.serverTimestamp() });
  return { accountId };
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
  const uid=requireAuth(request.auth?.uid);const commitmentId=stringValue(request.data?.commitmentId,'Commitment ID');const accountId=stringValue(request.data?.accountId,'Account');const requestedAmount=request.data?.amountMinor==null?null:positiveMoney(request.data?.amountMinor);const paymentDate=localDate(request.data?.paymentDate,'Payment date');const note=optionalString(request.data?.note,500);const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));const commitmentRef=db.collection('commitments').doc(commitmentId);const accountRef=db.collection('accounts').doc(accountId);const budgetCandidateRefs=(await db.collection('budgets').where('ownerId','==',uid).get()).docs.map(item=>item.ref);
  return db.runTransaction(async transaction=>{const[command,commitmentSnapshot,accountSnapshot,budgetSnapshots]=await Promise.all([transaction.get(commandRef),transaction.get(commitmentRef),transaction.get(accountRef),Promise.all(budgetCandidateRefs.map(ref=>transaction.get(ref)))]);if(command.exists)return command.data()?.result;if(!commitmentSnapshot.exists)throw new HttpsError('not-found','Commitment not found.');const commitment=commitmentSnapshot.data();if(commitment?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this commitment.');if(commitment?.archivedAt||commitment?.status==='completed')throw new HttpsError('failed-precondition','This commitment is not active.');if(Number(commitment?.sharedAssignedMinor||0)>Number(commitment?.sharedSettledMinor||0))throw new HttpsError('failed-precondition','This commitment has open shared bill assignments. Complete or reverse them from Sharing first.');const account=assertAccount(accountSnapshot.data(),uid,'Account');if(account.currency!==commitment?.currency)throw new HttpsError('failed-precondition','Account and commitment currencies must match.');const remaining=commitment?.type==='instalment'?Math.max(0,Number(commitment?.totalAmountMinor||0)-Number(commitment?.amountPaidMinor||0)):Number(commitment?.amountMinor||0);const amountMinor=requestedAmount??Math.min(Number(commitment?.amountMinor||0),remaining);if(commitment?.type==='instalment'&&amountMinor>remaining)throw new HttpsError('invalid-argument','Payment cannot exceed the remaining instalment balance.');const transactionRef=db.collection('transactions').doc();const paymentRef=db.collection('commitmentPayments').doc();const now=FieldValue.serverTimestamp();const delta=accountEffect(account.type,'out',amountMinor);const budgetIds=matchingBudgetIds(budgetSnapshots,{spaceId:String(commitment?.spaceId),categoryId:String(commitment?.categoryId),transactionDate:paymentDate});updateAccountBalance(transaction,accountRef,account,delta);const ledgerEntryId=createLedgerEntry(transaction,{accountId,ownerId:uid,spaceId:String(commitment?.spaceId),transactionId:transactionRef.id,entryType:'commitment_payment',amountMinor:delta,currency:account.currency,idempotencyKey:key,now});if(budgetIds.length)updateBudgetsSpent(transaction,budgetSnapshots,budgetIds,amountMinor);const previousNextDueDate=commitment?.nextDueDate??commitment?.startDate??null;const previousStatus=commitment?.status==='completed'?'completed':'active';const nextPaid=Number(commitment?.amountPaidMinor||0)+amountMinor;let nextDueDate=addFrequency(String(previousNextDueDate||paymentDate),oneOf(commitment?.frequency,commitmentFrequencies,'frequency'));let nextStatus:'active'|'completed'='active';if(commitment?.type==='instalment'&&nextPaid>=Number(commitment?.totalAmountMinor||0)){nextStatus='completed';nextDueDate=null;}else if(commitment?.type==='bill'&&commitment?.frequency==='once'){nextStatus='completed';nextDueDate=null;}else if(nextDueDate&&commitment?.endDate&&nextDueDate>commitment.endDate){nextStatus='completed';nextDueDate=null;}transaction.create(transactionRef,{displayId:displayId('TXN'),ownerId:uid,createdBy:uid,type:'expense',status:'posted',spaceId:commitment?.spaceId,accountId,destinationAccountId:null,amountMinor,currency:account.currency,category:commitment?.categoryName,categoryId:commitment?.categoryId,categoryIcon:commitment?.categoryIcon,categoryColor:commitment?.categoryColor,categoryScope:'both',categoryIsSystem:!String(commitment?.categoryId).startsWith('custom-'),counterparty:commitment?.payee||commitment?.name,note:note||`Payment for ${commitment?.name}`,transactionDate:paymentDate,reversalOf:null,reversedBy:null,budgetIds,commitmentId,commitmentPaymentId:paymentRef.id,createdAt:now,postedAt:now,updatedAt:now});transaction.create(paymentRef,{displayId:displayId('PAY'),ownerId:uid,commitmentId,transactionId:transactionRef.id,amountMinor,currency:account.currency,paymentDate,dueDateApplied:previousNextDueDate,previousNextDueDate,previousStatus,status:'posted',reversedBy:null,createdAt:now,updatedAt:now});transaction.update(commitmentRef,{accountId,amountPaidMinor:nextPaid,nextDueDate,status:nextStatus,sharedCycleDueDate:nextDueDate,sharedAssignedMinor:0,sharedSettledMinor:0,updatedAt:now});const result={transactionId:transactionRef.id,paymentId:paymentRef.id,ledgerEntryId};transaction.create(commandRef,{uid,kind:'pay_commitment',idempotencyKey:key,result,createdAt:now});return result;});
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
    targetPath: input.targetPath || null, actionLabel: input.actionLabel || null, readAt: null, createdAt: input.now,
  });
}

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
  const email = normalizedEmail(request.data?.email);
  const role = oneOf(request.data?.role, collaborationRoles, 'member role');
  const canUseAccounts = request.data?.canUseAccounts === true;
  const canViewBalances = request.data?.canViewBalances === true;
  const canViewLedger = request.data?.canViewLedger === true;
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const manager = await requireSpaceManager(spaceId, uid);
  const space = await db.collection('spaces').doc(spaceId).get();
  if (!space.exists || space.data()?.archivedAt) throw new HttpsError('not-found', 'Space not found.');
  if (space.data()?.type === 'personal') throw new HttpsError('failed-precondition', 'Personal Spaces cannot have members.');
  const existing = await db.collection('spaceInvitations').where('spaceId', '==', spaceId).where('email', '==', email).get();
  if (existing.docs.some((item) => item.data().status === 'pending')) throw new HttpsError('already-exists', 'A pending invitation already exists for this email.');
  const registeredUsers = await db.collection('users').where('email', '==', email).limit(1).get();
  const invitedUserUid = registeredUsers.empty ? '' : registeredUsers.docs[0].id;
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const invitationRef = db.collection('spaceInvitations').doc();
  const token = randomBytes(24).toString('hex');
  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;
    const now = FieldValue.serverTimestamp();
    const result = { invitationId: invitationRef.id, token };
    transaction.create(invitationRef, {
      displayId: displayId('INV'), spaceId, spaceName: space.data()?.name || 'Shared Space', spaceType: space.data()?.type || 'custom',
      email, role, canUseAccounts, canViewBalances, canViewLedger,
      token, status: 'pending', invitedBy: uid, invitedByName: manager.displayName || request.auth?.token.email || 'Space owner', acceptedBy: null, declinedBy: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: now, updatedAt: now,
    });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'member_invited', targetType: 'invitation', targetId: invitationRef.id, summary: `Invited ${email} as ${role}.`, now });
    if (invitedUserUid) createNotification(transaction, {
      uid: invitedUserUid, spaceId, type: 'invitation_received', title: 'You have a Space invitation',
      message: `${manager.displayName || 'A Space owner'} invited you to ${space.data()?.name || 'a shared Space'}.`,
      targetPath: '/spaces', actionLabel: 'View invitation', now,
    });
    transaction.create(commandRef, { uid, kind: 'create_space_invitation', idempotencyKey: key, result, createdAt: now });
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
  if (!authEmail) throw new HttpsError('failed-precondition', 'Your account does not have a verified email address.');
  const invitationQuery = await db.collection('spaceInvitations').where('token', '==', token).limit(1).get();
  if (invitationQuery.empty) throw new HttpsError('not-found', 'Invitation not found.');
  const invitationRef = invitationQuery.docs[0].ref;
  const invitation = invitationQuery.docs[0].data();
  if (invitation.email !== authEmail) throw new HttpsError('permission-denied', 'Sign in using the email address that received this invitation.');
  if (invitation.status !== 'pending') throw new HttpsError('failed-precondition', 'This invitation is no longer active.');
  if (invitation.expiresAt?.toDate?.().getTime() < Date.now()) throw new HttpsError('deadline-exceeded', 'This invitation has expired. Ask the Space owner for a new link.');
  const spaceId = String(invitation.spaceId);
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
  const profileRef = db.collection('users').doc(uid);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, member, profile, space] = await Promise.all([transaction.get(commandRef), transaction.get(memberRef), transaction.get(profileRef), transaction.get(spaceRef)]);
    if (command.exists) return command.data()?.result;
    if (!space.exists || space.data()?.archivedAt) throw new HttpsError('failed-precondition', 'This Space is unavailable.');
    const now = FieldValue.serverTimestamp();
    const result = { spaceId, memberId: memberRef.id };
    transaction.set(memberRef, {
      spaceId, uid, role: invitation.role as CollaborationRole, status: 'active',
      displayName: profile.data()?.fullName || authEmail, email: authEmail,
      canUseAccounts: invitation.canUseAccounts === true, canViewBalances: invitation.canViewBalances === true,
      canViewLedger: invitation.canViewLedger === true, invitedBy: invitation.invitedBy, joinedAt: now, updatedAt: now,
    }, { merge: true });
    transaction.update(invitationRef, { status: 'accepted', acceptedBy: uid, updatedAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: profile.data()?.fullName || authEmail, action: member.exists ? 'member_reactivated' : 'member_joined', targetType: 'member', targetId: uid, summary: `${profile.data()?.fullName || authEmail} joined ${space.data()?.name || 'the Space'}.`, now });
    createNotification(transaction, { uid: String(invitation.invitedBy), spaceId, type: 'member_joined', title: 'A member joined your Space', message: `${profile.data()?.fullName || authEmail} accepted the invitation to ${space.data()?.name || 'your Space'}.`, targetPath: `/spaces/${spaceId}?tab=members`, actionLabel: 'Open members', now });
    createNotification(transaction, { uid, spaceId, type: 'space_joined', title: 'Space joined', message: `You joined ${space.data()?.name || 'the shared Space'}.`, targetPath: `/spaces/${spaceId}`, actionLabel: 'Open Space', now });
    transaction.create(commandRef, { uid, kind: 'accept_space_invitation', idempotencyKey: key, result, createdAt: now });
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
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));

  return db.runTransaction(async (transaction) => {
    const [command, space, currentOwner, newOwner] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(spaceRef),
      transaction.get(currentOwnerRef),
      transaction.get(newOwnerRef),
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
  const base = `Shared bill payment — ${input.commitmentName} — paid by ${input.memberLabel} — claim ${input.paymentDisplayId} — assignment ${input.assignmentDisplayId}`;
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

  if (action === 'delete') {
    const memberSnapshot = await db.collection('spaceMembers').where('spaceId', '==', spaceId).get();
    const hasOtherMembers = memberSnapshot.docs.some((item) => item.data().uid !== uid);
    const checks = await Promise.all([
      queryHasDocuments(db.collection('transactions').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('budgets').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('goals').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('commitments').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('sharedBillAssignments').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('sharedExpenses').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('sharedExpensePayments').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceFundContributions').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceInvitations').where('spaceId', '==', spaceId)),
      queryHasDocuments(db.collection('spaceActivities').where('spaceId', '==', spaceId)),
    ]);
    if (hasOtherMembers || checks.some(Boolean)) {
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

  let openingLedgerRefs: DocumentReference[] = [];
  if (action === 'delete') {
    const [sourceUsed, destinationUsed, commitmentUsed, sharedUsed, ledgerSnapshot] = await Promise.all([
      queryHasDocuments(db.collection('transactions').where('accountId', '==', accountId)),
      queryHasDocuments(db.collection('transactions').where('destinationAccountId', '==', accountId)),
      queryHasDocuments(db.collection('commitments').where('accountId', '==', accountId)),
      queryHasDocuments(db.collection('sharedBillPayments').where('accountId', '==', accountId)),
      db.collection('ledgerEntries').where('accountId', '==', accountId).get(),
    ]);
    const nonOpeningLedger = ledgerSnapshot.docs.some((item) => item.data().entryType !== 'opening_balance');
    if (sourceUsed || destinationUsed || commitmentUsed || sharedUsed || nonOpeningLedger) {
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
    ])).some(Boolean);
    if (used) throw new HttpsError('failed-precondition', 'This category is used in saved records. Hide it instead.');
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
  const paidFromTripMoney = request.data?.paidFromTripMoney === true;
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
    const groupMoney = paidFromTripMoney;
    if (groupMoney) {
      if (space.type !== 'trip') throw new HttpsError('failed-precondition', 'Group money is available only in Trip Spaces.');
      if (!fundSnapshot.exists) throw new HttpsError('failed-precondition', 'Set up Trip money before using it.');
      const fund = fundSnapshot.data() || {};
      if (fund.holderUid !== paidByUid) throw new HttpsError('failed-precondition', 'Choose the person holding the Trip money as the payer.');
      if (safeMinor(fund.availableMinor, 'Trip money available') < totalMinor) throw new HttpsError('failed-precondition', 'There is not enough Trip money available for this expense.');
      const spentMinor = safeMinor(fund.spentMinor, 'Trip money spent') + totalMinor;
      transaction.update(fundRef, {
        spentMinor,
        availableMinor: safeMinor(fund.contributedMinor, 'Trip money collected') - spentMinor,
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
      paidFromTripMoney: groupMoney,
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
      summary: `Added ${title} for ${totalMinor / 100} ${currency}${groupMoney ? ' using Trip money' : ''}.`,
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
    currency: String(space.data()?.currency || 'BND'), paymentDate, proofPath, proofName, note,
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

export const updateTripMoneySettings = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const holderUid = stringValue(request.data?.holderUid, 'Person holding the money', 128);
  const budgetMinor = request.data?.budgetMinor === 0 ? 0 : positiveMoney(request.data?.budgetMinor);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const manager = await requireSpaceManager(spaceId, uid);
  const spaceRef = db.collection('spaces').doc(spaceId);
  const holderRef = db.collection('spaceMembers').doc(`${spaceId}_${holderUid}`);
  const fundRef = db.collection('spaceFunds').doc(spaceId);
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, space, holder, fund] = await Promise.all([transaction.get(commandRef), transaction.get(spaceRef), transaction.get(holderRef), transaction.get(fundRef)]);
    if (command.exists) return command.data()?.result;
    if (!space.exists || space.data()?.type !== 'trip' || space.data()?.archivedAt) throw new HttpsError('failed-precondition', 'Choose an active Trip Space.');
    if (!holder.exists || ['suspended', 'removed'].includes(String(holder.data()?.status || ''))) throw new HttpsError('failed-precondition', 'Choose an active member to hold the Trip money.');
    const now = FieldValue.serverTimestamp();
    const contributedMinor = fund.exists ? safeMinor(fund.data()?.contributedMinor, 'Trip money collected') : 0;
    const spentMinor = fund.exists ? safeMinor(fund.data()?.spentMinor, 'Trip money spent') : 0;
    const values = { spaceId, holderUid, holderName: holder.data()?.displayName || '', holderEmail: holder.data()?.email || '', budgetMinor, contributedMinor, spentMinor, availableMinor: contributedMinor - spentMinor, currency: space.data()?.currency || 'BND', updatedAt: now };
    if (fund.exists) transaction.update(fundRef, values); else transaction.create(fundRef, { ...values, createdAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'trip_money_settings_updated', targetType: 'space_fund', targetId: spaceId, summary: `Updated the Trip budget and person holding the money.`, now });
    const result = { spaceId };
    transaction.create(commandRef, { uid, kind: 'update_trip_money_settings', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const recordTripMoneyContribution = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const spaceId = stringValue(request.data?.spaceId, 'Space ID', 80);
  const memberUid = stringValue(request.data?.memberUid, 'Member ID', 128);
  const amountMinor = positiveMoney(request.data?.amountMinor);
  const contributionDate = localDate(request.data?.contributionDate, 'Contribution date');
  const note = optionalString(request.data?.note, 500);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const actor = await requireActiveSpaceMember(spaceId, uid);
  if (uid !== memberUid && !['owner', 'admin'].includes(String(actor.role))) throw new HttpsError('permission-denied', 'You can record only your own contribution.');
  const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${memberUid}`);
  const fundRef = db.collection('spaceFunds').doc(spaceId);
  const contributionRef = db.collection('spaceFundContributions').doc();
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, member, fund] = await Promise.all([transaction.get(commandRef), transaction.get(memberRef), transaction.get(fundRef)]);
    if (command.exists) return command.data()?.result;
    if (!member.exists || ['suspended', 'removed'].includes(String(member.data()?.status || ''))) throw new HttpsError('failed-precondition', 'Choose an active Trip member.');
    if (!fund.exists) throw new HttpsError('failed-precondition', 'Set up Trip money first.');
    const now = FieldValue.serverTimestamp();
    const contributedMinor = safeMinor(fund.data()?.contributedMinor, 'Trip money collected') + amountMinor;
    const spentMinor = safeMinor(fund.data()?.spentMinor, 'Trip money spent');
    transaction.create(contributionRef, { displayId: displayId('TMC'), spaceId, memberUid, memberName: member.data()?.displayName || '', memberEmail: member.data()?.email || '', amountMinor, currency: fund.data()?.currency || 'BND', contributionDate, note, status: 'posted', reversedAt: null, reversedBy: null, createdBy: uid, createdAt: now, updatedAt: now });
    transaction.update(fundRef, { contributedMinor, availableMinor: contributedMinor - spentMinor, updatedAt: now });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: actor.displayName, action: 'trip_money_contribution', targetType: 'space_fund_contribution', targetId: contributionRef.id, summary: `${member.data()?.displayName || 'A member'} added ${amountMinor / 100} ${fund.data()?.currency || 'BND'} to the Trip money.`, now });
    createNotification(transaction, { uid: memberUid, spaceId, type: 'trip_contribution_added', title: 'Trip contribution added', message: `${(amountMinor / 100).toFixed(2)} ${fund.data()?.currency || 'BND'} was added to the Trip money for ${member.data()?.displayName || 'you'}.`, targetPath: `/spaces/${spaceId}?tab=trip_money`, actionLabel: 'Open Trip money', now });
    const holderUid = String(fund.data()?.holderUid || '');
    if (holderUid && holderUid !== memberUid) createNotification(transaction, { uid: holderUid, spaceId, type: 'trip_contribution_received', title: 'Trip money received', message: `${member.data()?.displayName || 'A member'} added ${(amountMinor / 100).toFixed(2)} ${fund.data()?.currency || 'BND'}.`, targetPath: `/spaces/${spaceId}?tab=trip_money`, actionLabel: 'Open Trip money', now });
    const result = { contributionId: contributionRef.id };
    transaction.create(commandRef, { uid, kind: 'record_trip_money_contribution', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

export const reverseTripMoneyContribution = onCall({ region }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const contributionId = stringValue(request.data?.contributionId, 'Contribution ID', 80);
  const key = stringValue(request.data?.idempotencyKey, 'Idempotency key', 64);
  const contributionRef = db.collection('spaceFundContributions').doc(contributionId);
  const pre = await contributionRef.get();
  if (!pre.exists) throw new HttpsError('not-found', 'Trip contribution not found.');
  const contribution = pre.data() || {};
  const actor = await requireActiveSpaceMember(String(contribution.spaceId), uid);
  if (uid !== contribution.memberUid && !['owner', 'admin'].includes(String(actor.role))) throw new HttpsError('permission-denied', 'Only the member, Space owner, or admin can undo this contribution.');
  const fundRef = db.collection('spaceFunds').doc(String(contribution.spaceId));
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  return db.runTransaction(async (transaction) => {
    const [command, current, fund] = await Promise.all([transaction.get(commandRef), transaction.get(contributionRef), transaction.get(fundRef)]);
    if (command.exists) return command.data()?.result;
    if (!current.exists || current.data()?.status !== 'posted') throw new HttpsError('failed-precondition', 'This contribution has already been undone.');
    if (!fund.exists) throw new HttpsError('not-found', 'Trip money record not found.');
    const amountMinor = positiveMoney(current.data()?.amountMinor);
    const available = safeMinor(fund.data()?.availableMinor, 'Trip money available');
    if (available < amountMinor) throw new HttpsError('failed-precondition', 'This Trip money has already been spent and cannot be removed.');
    const contributedMinor = Math.max(0, safeMinor(fund.data()?.contributedMinor, 'Trip money collected') - amountMinor);
    const spentMinor = safeMinor(fund.data()?.spentMinor, 'Trip money spent');
    const now = FieldValue.serverTimestamp();
    transaction.update(contributionRef, { status: 'reversed', reversedAt: now, reversedBy: uid, updatedAt: now });
    transaction.update(fundRef, { contributedMinor, availableMinor: contributedMinor - spentMinor, updatedAt: now });
    createActivity(transaction, { spaceId: String(contribution.spaceId), actorUid: uid, actorName: actor.displayName, action: 'trip_money_contribution_reversed', targetType: 'space_fund_contribution', targetId: contributionId, summary: `Removed ${amountMinor / 100} ${contribution.currency || 'BND'} from the Trip money record.`, now });
    const result = { contributionId, status: 'reversed' };
    transaction.create(commandRef, { uid, kind: 'reverse_trip_money_contribution', idempotencyKey: key, result, createdAt: now });
    return result;
  });
});

// v0.11.6 account and personal-data deletion
const accountDeletionCoolingOffDays = 7;
const accountReRegistrationCooldownDays = 30;
const recentAuthenticationSeconds = 5 * 60;
const recentExportMilliseconds = 24 * 60 * 60 * 1000;
const accountDeletionTokenDrainMilliseconds = 2 * 60 * 60 * 1000;
const deletedMemberName = 'Deleted member';

type AccountDeletionBlockerCode = 'space_ownership' | 'trip_fund_holder';
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
      message: `You are holding Trip money for ${String(space.data()?.name || 'a shared Space')}. Ask the Space owner to choose another holder first.`,
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
  for (const field of ['proofPath', 'paymentProofPath']) {
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
    'sharedBillPaymentReversals', 'spaceActivities', 'sharedExpenses', 'sharedExpenseShares',
    'sharedExpensePayments', 'spaceFundContributions', 'spaceInvitations', 'spaceMembers',
    'userNotifications', 'reminderHistory',
  ];
  for (const collectionName of collections) {
    const rows = await documentsWhere(collectionName, 'spaceId', spaceId);
    for (const row of rows) {
      addProofPath(proofPaths, row.data());
      queueDelete(plan, row.ref);
    }
  }
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

    for (const collectionName of ['accounts', 'ledgerEntries', 'transactions', 'budgets', 'goals', 'goalContributions', 'categories']) {
      for (const row of await documentsWhere(collectionName, 'ownerId', uid)) {
        addProofPath(proofPaths, row.data());
        queueDelete(plan, row.ref);
      }
    }
    for (const row of await documentsWhere('accountAccess', 'uid', uid)) queueDelete(plan, row.ref);

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

    for (const collectionName of ['userNotifications', 'reminderHistory', 'financialCommands', 'collaborationCommands', 'lifecycleCommands', 'accountDeletionCommands']) {
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

    await queueFieldAnonymization({ plan, collectionName: 'spaceActivities', field: 'actorUid', uid, updates: () => ({ actorUid: anonymousId, actorName: deletedMemberName, summary: 'Activity retained after a member deleted their account.', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'spaceActivities', field: 'targetId', uid, updates: () => ({ targetId: anonymousId, summary: 'Member-related activity retained after account deletion.', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpenses', field: 'paidByUid', uid, updates: () => ({ paidByUid: anonymousId, paidByName: deletedMemberName, paidByEmail: '', note: '', ...anonymizedReferenceUpdates(anonymousId, now) }) });
    await queueFieldAnonymization({ plan, collectionName: 'sharedExpenses', field: 'createdBy', uid, updates: () => ({ createdBy: anonymousId, ...anonymizedReferenceUpdates(anonymousId, now) }) });
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
