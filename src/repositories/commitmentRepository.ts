import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { Commitment, CommitmentFrequency, CommitmentPayment, CommitmentType, PaymentMethodCode } from '../types/models';

export async function listAllCommitments(uid: string): Promise<Commitment[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'commitments'), where('ownerId', '==', uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Commitment)
    .sort((a, b) => (a.nextDueDate || '9999-12-31').localeCompare(b.nextDueDate || '9999-12-31'));
}

export async function listCommitmentsForOwnerSpace(
  uid: string,
  spaceId: string,
): Promise<Commitment[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(query(
    collection(db, 'commitments'),
    where('ownerId', '==', uid),
    where('spaceId', '==', spaceId),
  ));

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Commitment)
    .filter((item) => !item.archivedAt && !item.stoppedAt)
    .sort((a, b) =>
      (a.nextDueDate || '9999-12-31')
        .localeCompare(
          b.nextDueDate || '9999-12-31',
        ),
    );
}

export async function listCommitmentsForSpace(spaceId: string): Promise<Commitment[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'commitments'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Commitment)
    .filter((item) => !item.archivedAt && !item.stoppedAt)
    .sort((a, b) => (a.nextDueDate || '9999-12-31').localeCompare(b.nextDueDate || '9999-12-31'));
}

export async function listCommitmentPaymentsForCommitment(
  commitmentId: string,
): Promise<CommitmentPayment[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(query(
    collection(db, 'commitmentPayments'),
    where('commitmentId', '==', commitmentId),
  ));

  return snapshot.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as CommitmentPayment,
    )
    .sort(
      (a, b) =>
        b.paymentDate.localeCompare(
          a.paymentDate,
        ),
    );
}

export async function listCommitmentPayments(uid: string): Promise<CommitmentPayment[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'commitmentPayments'), where('ownerId', '==', uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CommitmentPayment)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export async function createCommitment(input: {
  type: CommitmentType;
  name: string;
  payee?: string;
  spaceId: string;
  accountId?: string;
  categoryId: string;
  amountMinor: number;
  totalAmountMinor?: number;
  frequency: CommitmentFrequency;
  startDate: string;
  endDate?: string;
  reminderDays: number;
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'createCommitment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateCommitment(input: {
  commitmentId: string;
  name: string;
  payee?: string;
  accountId?: string;
  categoryId: string;
  amountMinor: number;
  totalAmountMinor?: number;
  frequency: CommitmentFrequency;
  nextDueDate: string;
  endDate?: string;
  reminderDays: number;
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'updateCommitment')(input);
}

export async function archiveCommitment(commitmentId: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'archiveCommitment')({ commitmentId, idempotencyKey: crypto.randomUUID() });
}

export async function payCommitment(input: { commitmentId: string; accountId: string; amountMinor?: number; paymentDate: string; paymentMethod?: PaymentMethodCode; paymentMethodLabel?: string; note?: string }) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'payCommitment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function listCommitments(uid: string): Promise<Commitment[]> {
  return (await listAllCommitments(uid)).filter((item) => !item.archivedAt && !item.stoppedAt);
}
