import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { AccountDeletionEligibility, AccountDeletionRequest } from '../types/models';

interface CallableResult<T> {
  data: T;
}

export async function checkAccountDeletionEligibility(): Promise<AccountDeletionEligibility> {
  const { functions } = requireFirebase();
  const callable = httpsCallable(functions, 'checkAccountDeletionEligibility');
  const result = await callable() as CallableResult<AccountDeletionEligibility>;
  return result.data;
}

export async function recordAccountDataExport(): Promise<{ recorded: true }> {
  const { functions } = requireFirebase();
  const callable = httpsCallable(functions, 'recordAccountDataExport');
  const result = await callable() as CallableResult<{ recorded: true }>;
  return result.data;
}

export async function requestAccountDeletion(input: {
  confirmation: string;
  exportAcknowledged: boolean;
}): Promise<AccountDeletionRequest> {
  const { functions, auth } = requireFirebase();
  const callable = httpsCallable(functions, 'requestAccountDeletion');
  await callable({ ...input, idempotencyKey: crypto.randomUUID() });
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Please sign in again.');
  const request = await getAccountDeletionRequest(uid);
  if (!request) throw new Error('The deletion request was submitted but could not be reloaded.');
  return request;
}

export async function cancelAccountDeletion(): Promise<{ cancelled: true }> {
  const { functions } = requireFirebase();
  const callable = httpsCallable(functions, 'cancelAccountDeletion');
  const result = await callable({ idempotencyKey: crypto.randomUUID() }) as CallableResult<{ cancelled: true }>;
  return result.data;
}

export async function getAccountDeletionRequest(uid: string): Promise<AccountDeletionRequest | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'accountDeletionRequests', uid));
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as AccountDeletionRequest) : null;
}
