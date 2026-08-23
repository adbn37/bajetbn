import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  DebtDirection,
  DebtInterestType,
  DebtRecord,
  DebtSchedule,
  DebtPayment,
} from '../types/models';

export async function listDebts(uid: string): Promise<DebtRecord[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(
    query(
      collection(db, 'debts'),
      where('ownerId', '==', uid),
    ),
  );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }) as DebtRecord)
    .sort((a, b) => {
      const left = a.dueDate || '9999-12-31';
      const right = b.dueDate || '9999-12-31';
      return left.localeCompare(right);
    });
}

export async function createDebt(input: {
  direction: DebtDirection;
  counterparty: string;
  description?: string;
  principalMinor: number;
  interestType: DebtInterestType;
  interestRateBps?: number;
  interestMinor?: number;
  startDate: string;
  dueDate?: string;
  schedule: DebtSchedule;
  scheduleNote?: string;
  reminderEnabled: boolean;
  spaceId?: string;
}) {
  const { functions } = requireFirebase();

  const call = httpsCallable<
    typeof input & { idempotencyKey: string },
    { debtId: string }
  >(
    functions,
    'createDebt',
  );

  const result = await call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function archiveDebt(debtId: string) {
  const { functions } = requireFirebase();

  const call = httpsCallable<
    {
      debtId: string;
      idempotencyKey: string;
    },
    { debtId: string }
  >(
    functions,
    'archiveDebt',
  );

  const result = await call({
    debtId,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function listDebtPayments(
  uid: string,
): Promise<DebtPayment[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(
    query(
      collection(db, 'debtPayments'),
      where('ownerId', '==', uid),
    ),
  );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }) as DebtPayment)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export async function recordDebtPayment(input: {
  debtId: string;
  amountMinor: number;
  paymentDate: string;
  accountId: string;
  note?: string;
}): Promise<{
  paymentId: string;
  transactionId: string;
}> {
  if (!navigator.onLine) {
    throw new Error(
      'Connect to the internet before recording a debt payment.',
    );
  }

  const { functions } = requireFirebase();

  const call = httpsCallable<
    typeof input & { idempotencyKey: string },
    {
      paymentId: string;
      transactionId: string;
    }
  >(
    functions,
    'recordDebtPayment',
  );

  const result = await call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function reverseDebtPayment(input: {
  paymentId: string;
  reversalDate: string;
  reason: string;
}): Promise<{
  paymentId: string;
  reversalTransactionId: string;
}> {
  if (!navigator.onLine) {
    throw new Error(
      'Connect to the internet before reversing a debt payment.',
    );
  }

  const { functions } = requireFirebase();

  const call = httpsCallable<
    typeof input & { idempotencyKey: string },
    {
      paymentId: string;
      reversalTransactionId: string;
    }
  >(
    functions,
    'reverseDebtPayment',
  );

  const result = await call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}
