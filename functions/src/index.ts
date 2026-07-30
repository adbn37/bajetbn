import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentData, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';

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
      balanceVersion: 1, archivedAt: null, createdAt: now, updatedAt: now,
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
  return db.runTransaction(async transaction=>{const[command,space,member]=await Promise.all([transaction.get(commandRef),transaction.get(spaceRef),transaction.get(memberRef)]);if(command.exists)return command.data()?.result;if(!space.exists||space.data()?.archivedAt)throw new HttpsError('failed-precondition','The selected Space is unavailable.');if(!member.exists)throw new HttpsError('permission-denied','You are not a member of this Space.');const ref=db.collection('goals').doc();const now=FieldValue.serverTimestamp();const result={goalId:ref.id};transaction.create(ref,{displayId:displayId('GOL'),ownerId:uid,name,spaceId,targetMinor,currentMinor:0,currency:space.data()?.currency,targetDate,status:'active',note,archivedAt:null,createdAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'create_goal',idempotencyKey:key,result,createdAt:now});return result;});
});

export const updateGoal = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const goalId=stringValue(request.data?.goalId,'Goal ID');const name=stringValue(request.data?.name,'Goal name',80);const targetMinor=positiveMoney(request.data?.targetMinor);const targetDate=optionalLocalDate(request.data?.targetDate,'Target date');const note=optionalString(request.data?.note,500);const ref=db.collection('goals').doc(goalId);const snapshot=await ref.get();if(!snapshot.exists)throw new HttpsError('not-found','Goal not found.');if(snapshot.data()?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this goal.');if(snapshot.data()?.archivedAt)throw new HttpsError('failed-precondition','Archived goals cannot be edited.');const current=Number(snapshot.data()?.currentMinor||0);await ref.update({name,targetMinor,targetDate,note,status:current>=targetMinor?'completed':'active',updatedAt:FieldValue.serverTimestamp()});return{goalId};});

export const archiveGoal = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const goalId=stringValue(request.data?.goalId,'Goal ID');const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const ref=db.collection('goals').doc(goalId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,g]=await Promise.all([transaction.get(commandRef),transaction.get(ref)]);if(c.exists)return c.data()?.result;if(!g.exists)throw new HttpsError('not-found','Goal not found.');if(g.data()?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this goal.');const now=FieldValue.serverTimestamp();const result={goalId,archived:true};transaction.update(ref,{archivedAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'archive_goal',idempotencyKey:key,result,createdAt:now});return result;});});

export const recordGoalContribution = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const goalId=stringValue(request.data?.goalId,'Goal ID');const amountMinor=positiveMoney(request.data?.amountMinor);const contributionDate=localDate(request.data?.contributionDate,'Contribution date');const note=optionalString(request.data?.note,500);const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const goalRef=db.collection('goals').doc(goalId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,g]=await Promise.all([transaction.get(commandRef),transaction.get(goalRef)]);if(c.exists)return c.data()?.result;if(!g.exists)throw new HttpsError('not-found','Goal not found.');const goal=g.data();if(goal?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this goal.');if(goal?.archivedAt||goal?.status==='completed')throw new HttpsError('failed-precondition','This goal is not accepting contributions.');const current=Number(goal?.currentMinor||0);if(!Number.isSafeInteger(current))throw new HttpsError('failed-precondition','Goal progress is invalid.');const next=current+amountMinor;const ref=db.collection('goalContributions').doc();const now=FieldValue.serverTimestamp();const result={contributionId:ref.id,goalId};transaction.create(ref,{displayId:displayId('GCT'),ownerId:uid,goalId,amountMinor,currency:goal?.currency,contributionDate,note,status:'posted',reversalOf:null,reversedBy:null,createdAt:now,updatedAt:now});transaction.update(goalRef,{currentMinor:next,status:next>=Number(goal?.targetMinor||0)?'completed':'active',updatedAt:now});transaction.create(commandRef,{uid,kind:'record_goal_contribution',idempotencyKey:key,result,createdAt:now});return result;});});

export const reverseGoalContribution = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const contributionId=stringValue(request.data?.contributionId,'Contribution ID');const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const originalRef=db.collection('goalContributions').doc(contributionId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,o]=await Promise.all([transaction.get(commandRef),transaction.get(originalRef)]);if(c.exists)return c.data()?.result;if(!o.exists)throw new HttpsError('not-found','Goal contribution not found.');const original=o.data();if(original?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this contribution.');if(original?.status!=='posted'||original?.reversalOf||original?.reversedBy)throw new HttpsError('failed-precondition','This contribution cannot be reversed.');const goalRef=db.collection('goals').doc(String(original?.goalId));const goal=await transaction.get(goalRef);if(!goal.exists)throw new HttpsError('not-found','Goal not found.');const amount=positiveMoney(original?.amountMinor);const next=Math.max(0,Number(goal.data()?.currentMinor||0)-amount);const reversalRef=db.collection('goalContributions').doc();const now=FieldValue.serverTimestamp();const result={contributionId:reversalRef.id,originalContributionId:contributionId};transaction.create(reversalRef,{displayId:displayId('GCT'),ownerId:uid,goalId:original?.goalId,amountMinor:amount,currency:original?.currency,contributionDate:new Date().toISOString().slice(0,10),note:`Reversal of ${original?.displayId||contributionId}`,status:'posted',reversalOf:contributionId,reversedBy:null,createdAt:now,updatedAt:now});transaction.update(originalRef,{status:'reversed',reversedBy:reversalRef.id,updatedAt:now});transaction.update(goalRef,{currentMinor:next,status:next>=Number(goal.data()?.targetMinor||0)?'completed':'active',updatedAt:now});transaction.create(commandRef,{uid,kind:'reverse_goal_contribution',idempotencyKey:key,result,createdAt:now});return result;});});

export const createCommitment = onCall({ region }, async request=>{
  const uid=requireAuth(request.auth?.uid);const type=oneOf(request.data?.type,commitmentTypes,'commitment type');const name=stringValue(request.data?.name,'Commitment name',80);const payee=optionalString(request.data?.payee,120);const spaceId=stringValue(request.data?.spaceId,'Space');const accountId=optionalString(request.data?.accountId,80)||null;const categoryId=stringValue(request.data?.categoryId,'Category ID',80);const amountMinor=positiveMoney(request.data?.amountMinor);const totalAmountMinor=type==='instalment'?positiveMoney(request.data?.totalAmountMinor):null;if(type==='instalment'&&Number(totalAmountMinor)<amountMinor)throw new HttpsError('invalid-argument','Instalment total must be at least one payment amount.');const frequency=oneOf(request.data?.frequency,commitmentFrequencies,'frequency');const startDate=localDate(request.data?.startDate,'Start date');const endDate=optionalLocalDate(request.data?.endDate,'End date');const reminderDays=integerBetween(request.data?.reminderDays,'Reminder days',0,60);const note=optionalString(request.data?.note,500);const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);
  const commandRef=db.collection('financialCommands').doc(commandId(uid,key));const spaceRef=db.collection('spaces').doc(spaceId);const memberRef=db.collection('spaceMembers').doc(`${spaceId}_${uid}`);const accountRef=accountId?db.collection('accounts').doc(accountId):null;const categoryRef=categoryId.startsWith('custom-')?db.collection('categories').doc(categoryId):null;
  return db.runTransaction(async transaction=>{const[command,space,member,account,custom]=await Promise.all([transaction.get(commandRef),transaction.get(spaceRef),transaction.get(memberRef),accountRef?transaction.get(accountRef):Promise.resolve(null),categoryRef?transaction.get(categoryRef):Promise.resolve(null)]);if(command.exists)return command.data()?.result;if(!space.exists||space.data()?.archivedAt)throw new HttpsError('failed-precondition','The selected Space is unavailable.');if(!member.exists)throw new HttpsError('permission-denied','You are not a member of this Space.');if(account){const data=assertAccount(account.data(),uid,'Account');if(data.currency!==space.data()?.currency)throw new HttpsError('failed-precondition','Account and Space currencies must match.');}const scope:Exclude<CategoryScope,'both'>=space.data()?.type==='sme'?'business':'personal';const category=categorySnapshotFromData({categoryId,requiredKind:'expense',selectedScope:scope,uid,customData:custom?.data()});const ref=db.collection('commitments').doc();const now=FieldValue.serverTimestamp();const result={commitmentId:ref.id};transaction.create(ref,{displayId:displayId(type==='bill'?'BIL':'INS'),ownerId:uid,type,name,payee,spaceId,accountId,categoryId:category.id,categoryName:category.name,categoryIcon:category.icon,categoryColor:category.color,amountMinor,totalAmountMinor,amountPaidMinor:0,sharedCycleDueDate:startDate,sharedAssignedMinor:0,sharedSettledMinor:0,currency:space.data()?.currency,frequency,startDate,nextDueDate:startDate,endDate,reminderDays,status:'active',note,archivedAt:null,createdAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'create_commitment',idempotencyKey:key,result,createdAt:now});return result;});
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

function createNotification(transaction: Transaction, input: { uid: string; spaceId?: string | null; type: string; title: string; message: string; now: FieldValue }) {
  const ref = db.collection('userNotifications').doc();
  transaction.create(ref, { uid: input.uid, spaceId: input.spaceId || null, type: input.type, title: input.title, message: input.message, readAt: null, createdAt: input.now });
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
  const commandRef = db.collection('collaborationCommands').doc(commandId(uid, key));
  const invitationRef = db.collection('spaceInvitations').doc();
  const token = randomBytes(24).toString('hex');
  return db.runTransaction(async (transaction) => {
    const command = await transaction.get(commandRef);
    if (command.exists) return command.data()?.result;
    const now = FieldValue.serverTimestamp();
    const result = { invitationId: invitationRef.id, token };
    transaction.create(invitationRef, {
      displayId: displayId('INV'), spaceId, email, role, canUseAccounts, canViewBalances, canViewLedger,
      token, status: 'pending', invitedBy: uid, acceptedBy: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: now, updatedAt: now,
    });
    createActivity(transaction, { spaceId, actorUid: uid, actorName: manager.displayName, action: 'member_invited', targetType: 'invitation', targetId: invitationRef.id, summary: `Invited ${email} as ${role}.`, now });
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
    createNotification(transaction, { uid: String(invitation.invitedBy), spaceId, type: 'member_joined', title: 'A member joined your Space', message: `${profile.data()?.fullName || authEmail} accepted the invitation to ${space.data()?.name || 'your Space'}.`, now });
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
