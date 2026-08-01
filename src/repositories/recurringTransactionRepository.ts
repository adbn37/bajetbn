import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  CategoryScope,
  PaymentMethodCode,
  RecurringTransactionFrequency,
  RecurringTransactionTemplate,
  RecurringTransactionType,
} from '../types/models';

export async function listRecurringTransactionTemplates(uid: string): Promise<RecurringTransactionTemplate[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'recurringTransactionTemplates'), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as RecurringTransactionTemplate)
    .sort((a, b) => {
      const aDate = a.nextRunDate || '9999-12-31';
      const bDate = b.nextRunDate || '9999-12-31';
      return aDate.localeCompare(bDate) || a.name.localeCompare(b.name);
    });
}

export interface RecurringTransactionInput {
  templateId?: string;
  name: string;
  type: RecurringTransactionType;
  accountId: string;
  spaceId: string;
  amountMinor: number;
  categoryId: string;
  counterparty?: string;
  note?: string;
  paymentMethod?: PaymentMethodCode;
  paymentMethodLabel?: string;
  frequency: RecurringTransactionFrequency;
  nextRunDate: string;
  endDate?: string;
}

export async function createRecurringTransactionTemplate(input: RecurringTransactionInput) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'createRecurringTransactionTemplate');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function updateRecurringTransactionTemplate(input: RecurringTransactionInput & {
  templateId: string;
  category?: string;
  categoryIcon?: string;
  categoryColor?: string;
  categoryScope?: CategoryScope;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'updateRecurringTransactionTemplate');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function manageRecurringTransactionTemplate(input: {
  templateId: string;
  action: 'pause' | 'resume' | 'skip' | 'stop' | 'restart' | 'delete';
  nextRunDate?: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'manageRecurringTransactionTemplate');
  return call({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function postDueRecurringTransaction(templateId: string) {
  const { functions } = requireFirebase();
  const call = httpsCallable(functions, 'postDueRecurringTransaction');
  return call({ templateId, idempotencyKey: crypto.randomUUID() });
}
