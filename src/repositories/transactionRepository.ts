import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { CategoryScope, FinancialTransaction, PaymentMethodCode } from '../types/models';

export async function listTransactions(uid: string): Promise<FinancialTransaction[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'transactions'), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as FinancialTransaction)
    .sort((a, b) => {
      const dateCompare = b.transactionDate.localeCompare(a.transactionDate);
      if (dateCompare !== 0) return dateCompare;
      return (b.postedAt?.toMillis() || 0) - (a.postedAt?.toMillis() || 0);
    });
}

export async function postTransaction(input: {
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  destinationAccountId?: string;
  spaceId: string;
  amountMinor: number;
  transactionDate: string;
  categoryId?: string;
  category?: string;
  categoryIcon?: string;
  categoryColor?: string;
  categoryScope?: CategoryScope;
  counterparty?: string;
  note?: string;
  paymentMethod?: PaymentMethodCode;
  paymentMethodLabel?: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'postTransaction');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function reverseTransaction(transactionId: string, transactionDate: string, reason?: string) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'reverseTransaction');
  return call({ transactionId, transactionDate, reason, idempotencyKey: crypto.randomUUID() });
}
