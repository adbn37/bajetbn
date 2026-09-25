import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { PaymentMethodCode } from '../types/models';

export async function updateBusinessMoneyActivityDetails(input: {
  transactionId: string;
  counterparty: string;
  note: string;
  labels: string[];
  paymentMethod: PaymentMethodCode | null;
  paymentMethodLabel: string | null;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(
    functions,
    'updateBusinessMoneyActivityDetails',
  );

  return call(input);
}

export async function reverseBusinessMoneyActivity(input: {
  transactionId: string;
  transactionDate: string;
  reason?: string;
}) {
  const { functions } = requireFirebase();
  const call = httpsCallable(
    functions,
    'reverseBusinessMoneyActivity',
  );

  return call({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function deleteStaleAdbnPaymentMoneyActivity(input: {
  transactionId: string;
  reason?: string;
}) {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'deleteStaleAdbnPaymentMoneyActivity',
    );

  return call({
    transactionId:
      input.transactionId,
    reason:
      input.reason?.trim()
      || 'ADBN TECH source payment was deleted.',
    idempotencyKey:
      crypto.randomUUID(),
  });
}
