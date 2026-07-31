import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { requireFirebase } from '../services/firebase';
import type {
  SharedExpense,
  SharedExpensePayment,
  SharedExpenseSplitMode,
  SharedExpenseShare,
  SpaceFund,
  SpaceFundContribution,
} from '../types/models';

export interface SharedExpenseSplitInput {
  memberUid: string;
  amountMinor?: number;
  percentageBasisPoints?: number;
}

export async function listSharedExpenses(spaceId: string): Promise<SharedExpense[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'sharedExpenses'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SharedExpense)
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
}

export async function listSharedExpenseShares(spaceId: string): Promise<SharedExpenseShare[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'sharedExpenseShares'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SharedExpenseShare)
    .sort((a, b) => Number(a.createdAt?.toMillis?.() || 0) - Number(b.createdAt?.toMillis?.() || 0));
}

export async function listSharedExpensePayments(spaceId: string): Promise<SharedExpensePayment[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'sharedExpensePayments'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SharedExpensePayment)
    .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0));
}

export async function getSpaceFund(spaceId: string): Promise<SpaceFund | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, 'spaceFunds', spaceId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as SpaceFund) : null;
}

export async function listSpaceFundContributions(spaceId: string): Promise<SpaceFundContribution[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'spaceFundContributions'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SpaceFundContribution)
    .sort((a, b) => b.contributionDate.localeCompare(a.contributionDate));
}

export async function createSharedExpense(input: {
  spaceId: string;
  title: string;
  totalMinor: number;
  expenseDate: string;
  paidByUid: string;
  splitMode: SharedExpenseSplitMode;
  splits: SharedExpenseSplitInput[];
  note?: string;
  paidFromTripMoney?: boolean;
}): Promise<{ expenseId: string }> {
  const { functions } = requireFirebase();
  const result = await httpsCallable<typeof input & { idempotencyKey: string }, { expenseId: string }>(
    functions,
    'createSharedExpense',
  )({ ...input, idempotencyKey: crypto.randomUUID() });
  return result.data;
}

export async function uploadSharedExpenseProof(input: { spaceId: string; referenceId: string; file: File }) {
  if (!['application/pdf'].includes(input.file.type) && !input.file.type.startsWith('image/')) {
    throw new Error('Upload an image or PDF proof of payment.');
  }
  if (input.file.size >= 10 * 1024 * 1024) throw new Error('Proof of payment must be smaller than 10 MB.');
  const { storage } = requireFirebase();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folder = `shared-expense-${input.referenceId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const path = `spaces/${input.spaceId}/payment-proofs/${folder}/${crypto.randomUUID()}-${safeName}`;
  await uploadBytes(ref(storage, path), input.file, { contentType: input.file.type });
  return { proofPath: path, proofName: input.file.name };
}

export async function getSharedExpenseProofUrl(proofPath: string) {
  const { storage } = requireFirebase();
  return getDownloadURL(ref(storage, proofPath));
}

export async function submitSharedExpensePayment(input: {
  spaceId: string;
  toUid: string;
  expenseId?: string;
  amountMinor: number;
  paymentDate: string;
  proofPath?: string;
  proofName?: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'submitSharedExpensePayment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function reviewSharedExpensePayment(input: {
  paymentId: string;
  decision: 'confirmed' | 'rejected';
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'reviewSharedExpensePayment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function reverseSharedExpensePayment(input: {
  paymentId: string;
  reason?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'reverseSharedExpensePayment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateTripMoneySettings(input: {
  spaceId: string;
  holderUid: string;
  budgetMinor: number;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'updateTripMoneySettings')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function recordTripMoneyContribution(input: {
  spaceId: string;
  memberUid: string;
  amountMinor: number;
  contributionDate: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'recordTripMoneyContribution')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function reverseTripMoneyContribution(contributionId: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'reverseTripMoneyContribution')({ contributionId, idempotencyKey: crypto.randomUUID() });
}
