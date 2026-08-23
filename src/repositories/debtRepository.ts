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
