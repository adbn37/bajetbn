import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';

initializeApp();
const db = getFirestore();
const region = 'asia-southeast1';

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
  const type = oneOf(request.data?.type, ['bank', 'cash', 'e_wallet', 'credit_card'] as const, 'account type');
  const classification = oneOf(request.data?.classification, ['personal', 'business'] as const, 'classification');
  const currency = oneOf(request.data?.currency, ['BND', 'MYR', 'SGD', 'USD'] as const, 'currency');
  const openingBalanceMinor = request.data?.openingBalanceMinor;
  if (!Number.isSafeInteger(openingBalanceMinor) || Math.abs(openingBalanceMinor) > 999_999_999_99) {
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
  const type = oneOf(request.data?.type, ['bank', 'cash', 'e_wallet', 'credit_card'] as const, 'account type');
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
