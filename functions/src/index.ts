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
  const currency = oneOf(request.data?.currency, ['BND', 'MYR', 'SGD', 'USD'] as const, 'currency');
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
      collaborationMode: 'private', currency, timezone, description: 'Your private financial home.', archivedAt: null,
      createdAt: now, updatedAt: now,
    });
    transaction.set(memberRef, {
      spaceId: spaceRef.id, uid, role: 'owner', canUseAccounts: true,
      canViewBalances: true, canViewLedger: true, joinedAt: now,
    });
    transaction.set(userRef, {
      uid, fullName, email: request.auth?.token.email || '', language, currency, timezone,
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
  return db.runTransaction(async transaction=>{const[command,space,member,account,custom]=await Promise.all([transaction.get(commandRef),transaction.get(spaceRef),transaction.get(memberRef),accountRef?transaction.get(accountRef):Promise.resolve(null),categoryRef?transaction.get(categoryRef):Promise.resolve(null)]);if(command.exists)return command.data()?.result;if(!space.exists||space.data()?.archivedAt)throw new HttpsError('failed-precondition','The selected Space is unavailable.');if(!member.exists)throw new HttpsError('permission-denied','You are not a member of this Space.');if(account){const data=assertAccount(account.data(),uid,'Account');if(data.currency!==space.data()?.currency)throw new HttpsError('failed-precondition','Account and Space currencies must match.');}const scope:Exclude<CategoryScope,'both'>=space.data()?.type==='sme'?'business':'personal';const category=categorySnapshotFromData({categoryId,requiredKind:'expense',selectedScope:scope,uid,customData:custom?.data()});const ref=db.collection('commitments').doc();const now=FieldValue.serverTimestamp();const result={commitmentId:ref.id};transaction.create(ref,{displayId:displayId(type==='bill'?'BIL':'INS'),ownerId:uid,type,name,payee,spaceId,accountId,categoryId:category.id,categoryName:category.name,categoryIcon:category.icon,categoryColor:category.color,amountMinor,totalAmountMinor,amountPaidMinor:0,currency:space.data()?.currency,frequency,startDate,nextDueDate:startDate,endDate,reminderDays,status:'active',note,archivedAt:null,createdAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'create_commitment',idempotencyKey:key,result,createdAt:now});return result;});
});

export const updateCommitment = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const commitmentId=stringValue(request.data?.commitmentId,'Commitment ID');const name=stringValue(request.data?.name,'Commitment name',80);const payee=optionalString(request.data?.payee,120);const accountId=optionalString(request.data?.accountId,80)||null;const categoryId=stringValue(request.data?.categoryId,'Category ID',80);const amountMinor=positiveMoney(request.data?.amountMinor);const frequency=oneOf(request.data?.frequency,commitmentFrequencies,'frequency');const nextDueDate=localDate(request.data?.nextDueDate,'Next due date');const endDate=optionalLocalDate(request.data?.endDate,'End date');const reminderDays=integerBetween(request.data?.reminderDays,'Reminder days',0,60);const note=optionalString(request.data?.note,500);const ref=db.collection('commitments').doc(commitmentId);const snapshot=await ref.get();if(!snapshot.exists)throw new HttpsError('not-found','Commitment not found.');const existing=snapshot.data();if(existing?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this commitment.');if(existing?.archivedAt)throw new HttpsError('failed-precondition','Archived commitments cannot be edited.');const totalAmountMinor=existing?.type==='instalment'?positiveMoney(request.data?.totalAmountMinor):null;if(totalAmountMinor&&totalAmountMinor<Number(existing?.amountPaidMinor||0))throw new HttpsError('failed-precondition','Total cannot be below the amount already paid.');const space=await db.collection('spaces').doc(String(existing?.spaceId)).get();const account=accountId?await db.collection('accounts').doc(accountId).get():null;if(account){const data=assertAccount(account.data(),uid,'Account');if(data.currency!==space.data()?.currency)throw new HttpsError('failed-precondition','Account and Space currencies must match.');}const custom=categoryId.startsWith('custom-')?await db.collection('categories').doc(categoryId).get():null;const scope:Exclude<CategoryScope,'both'>=space.data()?.type==='sme'?'business':'personal';const category=categorySnapshotFromData({categoryId,requiredKind:'expense',selectedScope:scope,uid,customData:custom?.data()});await ref.update({name,payee,accountId,categoryId:category.id,categoryName:category.name,categoryIcon:category.icon,categoryColor:category.color,amountMinor,totalAmountMinor,frequency,nextDueDate,endDate,reminderDays,note,status:existing?.status==='completed'&&totalAmountMinor&&Number(existing?.amountPaidMinor||0)<totalAmountMinor?'active':existing?.status,updatedAt:FieldValue.serverTimestamp()});return{commitmentId};});

export const archiveCommitment = onCall({ region }, async request=>{const uid=requireAuth(request.auth?.uid);const commitmentId=stringValue(request.data?.commitmentId,'Commitment ID');const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const ref=db.collection('commitments').doc(commitmentId);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));return db.runTransaction(async transaction=>{const[c,i]=await Promise.all([transaction.get(commandRef),transaction.get(ref)]);if(c.exists)return c.data()?.result;if(!i.exists)throw new HttpsError('not-found','Commitment not found.');if(i.data()?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this commitment.');const now=FieldValue.serverTimestamp();const result={commitmentId,archived:true};transaction.update(ref,{archivedAt:now,updatedAt:now});transaction.create(commandRef,{uid,kind:'archive_commitment',idempotencyKey:key,result,createdAt:now});return result;});});

export const payCommitment = onCall({ region }, async request=>{
  const uid=requireAuth(request.auth?.uid);const commitmentId=stringValue(request.data?.commitmentId,'Commitment ID');const accountId=stringValue(request.data?.accountId,'Account');const requestedAmount=request.data?.amountMinor==null?null:positiveMoney(request.data?.amountMinor);const paymentDate=localDate(request.data?.paymentDate,'Payment date');const note=optionalString(request.data?.note,500);const key=stringValue(request.data?.idempotencyKey,'Idempotency key',64);const commandRef=db.collection('financialCommands').doc(commandId(uid,key));const commitmentRef=db.collection('commitments').doc(commitmentId);const accountRef=db.collection('accounts').doc(accountId);const budgetCandidateRefs=(await db.collection('budgets').where('ownerId','==',uid).get()).docs.map(item=>item.ref);
  return db.runTransaction(async transaction=>{const[command,commitmentSnapshot,accountSnapshot,budgetSnapshots]=await Promise.all([transaction.get(commandRef),transaction.get(commitmentRef),transaction.get(accountRef),Promise.all(budgetCandidateRefs.map(ref=>transaction.get(ref)))]);if(command.exists)return command.data()?.result;if(!commitmentSnapshot.exists)throw new HttpsError('not-found','Commitment not found.');const commitment=commitmentSnapshot.data();if(commitment?.ownerId!==uid)throw new HttpsError('permission-denied','You do not own this commitment.');if(commitment?.archivedAt||commitment?.status==='completed')throw new HttpsError('failed-precondition','This commitment is not active.');const account=assertAccount(accountSnapshot.data(),uid,'Account');if(account.currency!==commitment?.currency)throw new HttpsError('failed-precondition','Account and commitment currencies must match.');const remaining=commitment?.type==='instalment'?Math.max(0,Number(commitment?.totalAmountMinor||0)-Number(commitment?.amountPaidMinor||0)):Number(commitment?.amountMinor||0);const amountMinor=requestedAmount??Math.min(Number(commitment?.amountMinor||0),remaining);if(commitment?.type==='instalment'&&amountMinor>remaining)throw new HttpsError('invalid-argument','Payment cannot exceed the remaining instalment balance.');const transactionRef=db.collection('transactions').doc();const paymentRef=db.collection('commitmentPayments').doc();const now=FieldValue.serverTimestamp();const delta=accountEffect(account.type,'out',amountMinor);const budgetIds=matchingBudgetIds(budgetSnapshots,{spaceId:String(commitment?.spaceId),categoryId:String(commitment?.categoryId),transactionDate:paymentDate});updateAccountBalance(transaction,accountRef,account,delta);const ledgerEntryId=createLedgerEntry(transaction,{accountId,ownerId:uid,spaceId:String(commitment?.spaceId),transactionId:transactionRef.id,entryType:'commitment_payment',amountMinor:delta,currency:account.currency,idempotencyKey:key,now});if(budgetIds.length)updateBudgetsSpent(transaction,budgetSnapshots,budgetIds,amountMinor);const previousNextDueDate=commitment?.nextDueDate??commitment?.startDate??null;const previousStatus=commitment?.status==='completed'?'completed':'active';const nextPaid=Number(commitment?.amountPaidMinor||0)+amountMinor;let nextDueDate=addFrequency(String(previousNextDueDate||paymentDate),oneOf(commitment?.frequency,commitmentFrequencies,'frequency'));let nextStatus:'active'|'completed'='active';if(commitment?.type==='instalment'&&nextPaid>=Number(commitment?.totalAmountMinor||0)){nextStatus='completed';nextDueDate=null;}else if(commitment?.type==='bill'&&commitment?.frequency==='once'){nextStatus='completed';nextDueDate=null;}else if(nextDueDate&&commitment?.endDate&&nextDueDate>commitment.endDate){nextStatus='completed';nextDueDate=null;}transaction.create(transactionRef,{displayId:displayId('TXN'),ownerId:uid,createdBy:uid,type:'expense',status:'posted',spaceId:commitment?.spaceId,accountId,destinationAccountId:null,amountMinor,currency:account.currency,category:commitment?.categoryName,categoryId:commitment?.categoryId,categoryIcon:commitment?.categoryIcon,categoryColor:commitment?.categoryColor,categoryScope:'both',categoryIsSystem:!String(commitment?.categoryId).startsWith('custom-'),counterparty:commitment?.payee||commitment?.name,note:note||`Payment for ${commitment?.name}`,transactionDate:paymentDate,reversalOf:null,reversedBy:null,budgetIds,commitmentId,commitmentPaymentId:paymentRef.id,createdAt:now,postedAt:now,updatedAt:now});transaction.create(paymentRef,{displayId:displayId('PAY'),ownerId:uid,commitmentId,transactionId:transactionRef.id,amountMinor,currency:account.currency,paymentDate,dueDateApplied:previousNextDueDate,previousNextDueDate,previousStatus,status:'posted',reversedBy:null,createdAt:now,updatedAt:now});transaction.update(commitmentRef,{accountId,amountPaidMinor:nextPaid,nextDueDate,status:nextStatus,updatedAt:now});const result={transactionId:transactionRef.id,paymentId:paymentRef.id,ledgerEntryId};transaction.create(commandRef,{uid,kind:'pay_commitment',idempotencyKey:key,result,createdAt:now});return result;});
});
