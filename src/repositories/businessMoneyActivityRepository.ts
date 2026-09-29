import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { PaymentMethodCode } from '../types/models';
import {
  reverseTransactionWithIdempotencyKey,
} from './transactionRepository';

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

function staleAdbnSupplierReversalToken(
  value: string,
) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      Math.imul(
        hash
        ^ value.charCodeAt(index),
        16777619,
      );
  }

  return (hash >>> 0)
    .toString(16)
    .padStart(8, '0');
}

export async function reverseStaleAdbnSupplierPaymentMoneyActivity(
  input: {
    transactionId: string;
    transactionDate: string;
    reason?: string;
  },
) {
  return reverseTransactionWithIdempotencyKey(
    input.transactionId,
    input.transactionDate,
    input.reason?.trim()
      || 'ADBN TECH supplier payment was deleted or cancelled without a source reversal.',
    'adbn-stale-supplier-'
      + staleAdbnSupplierReversalToken(
        input.transactionId,
      ),
  );
}
