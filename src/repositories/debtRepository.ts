import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
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

export async function uploadDebtPaymentProof(input: {
  paymentId: string;
  file: File;
}): Promise<void> {
  if (!navigator.onLine) {
    throw new Error(
      'Connect to the internet before attaching payment proof.',
    );
  }

  if (
    input.file.type !== 'application/pdf'
    && !input.file.type.startsWith('image/')
  ) {
    throw new Error(
      'Upload an image or PDF as payment proof.',
    );
  }

  if (
    input.file.size <= 0
    || input.file.size >= 10 * 1024 * 1024
  ) {
    throw new Error(
      'Payment proof must be smaller than 10 MB.',
    );
  }

  const {
    auth,
    functions,
    storage,
  } = requireFirebase();

  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      'Your session has ended. Sign in again.',
    );
  }

  const proofId = crypto.randomUUID();

  const safeName =
    input.file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-120)
    || 'payment-proof';

  const storagePath =
    `users/${uid}/debt-payment-proofs/`
    + `${input.paymentId}/${proofId}-${safeName}`;

  const storageRef =
    ref(storage, storagePath);

  await uploadBytes(
    storageRef,
    input.file,
    {
      contentType: input.file.type,
    },
  );

  try {
    const call = httpsCallable<
      {
        paymentId: string;
        storagePath: string;
        fileName: string;
        contentType: string;
        sizeBytes: number;
      },
      { paymentId: string }
    >(
      functions,
      'setDebtPaymentProof',
    );

    await call({
      paymentId: input.paymentId,
      storagePath,
      fileName: input.file.name,
      contentType: input.file.type,
      sizeBytes: input.file.size,
    });
  } catch (error) {
    try {
      await deleteObject(storageRef);
    } catch {
      // Server cleanup also protects orphaned user proof files.
    }

    throw error;
  }
}

export async function getDebtPaymentProofUrl(
  storagePath: string,
): Promise<string> {
  const { storage } = requireFirebase();

  return getDownloadURL(
    ref(storage, storagePath),
  );
}

export async function removeDebtPaymentProof(
  paymentId: string,
): Promise<void> {
  if (!navigator.onLine) {
    throw new Error(
      'Connect to the internet before removing payment proof.',
    );
  }

  const { functions } = requireFirebase();

  const call = httpsCallable<
    { paymentId: string },
    { paymentId: string }
  >(
    functions,
    'removeDebtPaymentProof',
  );

  await call({
    paymentId,
  });
}
