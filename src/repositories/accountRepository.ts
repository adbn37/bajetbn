import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { Account, AccountClassification, AccountType, InstitutionCode } from '../types/models';

export async function listAllAccounts(uid: string): Promise<Account[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'accounts'), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Account)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createAccount(input: {
  name: string;
  institution?: string;
  institutionCode?: InstitutionCode | null;
  type: AccountType;
  classification: AccountClassification;
  spaceId?: string | null;
  posEnabled?: boolean;
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
  spaceId?: string | null;
  posEnabled?: boolean;
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
