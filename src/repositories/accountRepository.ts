import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  Account,
  AccountAccess,
  AccountClassification,
  AccountType,
  InstitutionCode,
} from '../types/models';

export function businessSpaceIdsForAccount(account: Pick<Account, 'businessSpaceIds' | 'spaceId'>): string[] {
  const ids = Array.isArray(account.businessSpaceIds)
    ? account.businessSpaceIds.filter(Boolean)
    : [];
  if (ids.length) return Array.from(new Set(ids));
  return account.spaceId ? [account.spaceId] : [];
}

export function posSpaceIdsForAccount(account: Pick<Account, 'posSpaceIds' | 'spaceId' | 'posEnabled'>): string[] {
  const ids = Array.isArray(account.posSpaceIds)
    ? account.posSpaceIds.filter(Boolean)
    : [];
  if (ids.length) return Array.from(new Set(ids));
  return account.spaceId && account.posEnabled ? [account.spaceId] : [];
}

export async function listAllAccounts(uid: string): Promise<Account[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'accounts'), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Account)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAllPersonalAccounts(
  uid: string,
): Promise<Account[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(query(
    collection(db, 'accounts'),
    where('ownerId', '==', uid),
    where('classification', '==', 'personal'),
  ));

  return snapshot.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Account,
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name),
    );
}

export async function listPersonalAccounts(
  uid: string,
): Promise<Account[]> {
  return (
    await listAllPersonalAccounts(uid)
  ).filter(
    (item) =>
      !item.archivedAt
      && !item.closedAt,
  );
}

export async function listAccountsForOwnerSpace(
  uid: string,
  spaceId: string,
): Promise<Account[]> {
  return (await listAllAccounts(uid))
    .filter((item) =>
      !item.archivedAt
      && !item.closedAt
      && item.classification === 'business'
      && businessSpaceIdsForAccount(item).includes(spaceId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAccountsForSpace(
  spaceId: string,
): Promise<Account[]> {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'getBusinessSpaceAccounts');
  const result = await call({ spaceId });
  return ((result.data as { accounts?: Account[] })?.accounts || [])
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAccountAccess(
  accountId: string,
): Promise<AccountAccess[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(
    collection(db, 'accountAccess'),
    where('accountId', '==', accountId),
  ));
  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as AccountAccess,
  );
}

export async function setBusinessAccountMemberAccess(input: {
  accountId: string;
  spaceId: string;
  memberUid: string;
  canUseAccount: boolean;
  canViewBalance: boolean;
  canViewLedger: boolean;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'setBusinessAccountMemberAccess');
  return call(input);
}

export async function createAccount(input: {
  name: string;
  institution?: string;
  institutionCode?: InstitutionCode | null;
  type: AccountType;
  classification: AccountClassification;
  /** Legacy callers remain accepted; new UI uses the arrays below. */
  spaceId?: string | null;
  posEnabled?: boolean;
  businessSpaceIds?: string[];
  posSpaceIds?: string[];
  currency: string;
  openingBalanceMinor: number;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'createAccount');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateAccount(input: {
  accountId: string;
  name: string;
  institution?: string;
  institutionCode?: InstitutionCode | null;
  type: AccountType;
  classification: AccountClassification;
  /** Legacy callers remain accepted; new UI uses the arrays below. */
  spaceId?: string | null;
  posEnabled?: boolean;
  businessSpaceIds?: string[];
  posSpaceIds?: string[];
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'updateAccountProfile');
  return call(input);
}

export async function archiveAccount(accountId: string) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'archiveAccount');
  return call({ accountId, idempotencyKey: crypto.randomUUID() });
}

export async function listAccounts(uid: string): Promise<Account[]> {
  return (await listAllAccounts(uid)).filter((account) => !account.archivedAt && !account.closedAt);
}
