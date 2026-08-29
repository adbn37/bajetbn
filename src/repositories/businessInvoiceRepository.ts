import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { httpsCallable } from 'firebase/functions';

import { requireFirebase } from '../services/firebase';

import type {
  BusinessInvoice,
  BusinessInvoicePayment,
  PaymentMethodCode,
} from '../types/models';

export interface BusinessInvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface BusinessInvoiceInput {
  spaceId: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  lines: BusinessInvoiceLineInput[];
  notes: string;
}

function key(): string {
  return crypto.randomUUID();
}

function requireOnline() {
  if (!navigator.onLine) {
    throw new Error(
      'Invoice financial actions need an internet connection so the invoice and account stay in sync.',
    );
  }
}

export async function listBusinessInvoices(
  uid: string,
  spaceId: string,
): Promise<BusinessInvoice[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(
    query(
      collection(db, 'businessInvoices'),
      where('ownerId', '==', uid),
      where('spaceId', '==', spaceId),
    ),
  );

  return snapshot.docs
    .map(
      (item) => ({
        id: item.id,
        ...item.data(),
      }) as BusinessInvoice,
    )
    .sort(
      (a, b) =>
        b.issueDate.localeCompare(
          a.issueDate,
        ),
    );
}

export async function listBusinessInvoicePayments(
  uid: string,
  invoiceId: string,
): Promise<BusinessInvoicePayment[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(
    query(
      collection(
        db,
        'businessInvoicePayments',
      ),
      where('ownerId', '==', uid),
      where('invoiceId', '==', invoiceId),
    ),
  );

  return snapshot.docs
    .map(
      (item) => ({
        id: item.id,
        ...item.data(),
      }) as BusinessInvoicePayment,
    )
    .sort(
      (a, b) =>
        b.paymentDate.localeCompare(
          a.paymentDate,
        ),
    );
}

export async function createBusinessInvoice(
  input: BusinessInvoiceInput,
): Promise<{ invoiceId: string }> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable<
    BusinessInvoiceInput & {
      idempotencyKey: string;
    },
    { invoiceId: string }
  >(
    functions,
    'createBusinessInvoice',
  );

  const result = await call({
    ...input,
    idempotencyKey: key(),
  });

  return result.data;
}

export async function updateBusinessInvoice(
  invoiceId: string,
  input: Omit<BusinessInvoiceInput, 'spaceId'>,
): Promise<{ invoiceId: string }> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable<
    Omit<BusinessInvoiceInput, 'spaceId'> & {
      invoiceId: string;
      idempotencyKey: string;
    },
    { invoiceId: string }
  >(
    functions,
    'updateBusinessInvoice',
  );

  const result = await call({
    ...input,
    invoiceId,
    idempotencyKey: key(),
  });

  return result.data;
}

export async function issueBusinessInvoice(
  invoiceId: string,
): Promise<void> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'issueBusinessInvoice',
  );

  await call({
    invoiceId,
    idempotencyKey: key(),
  });
}

export async function cancelBusinessInvoice(
  invoiceId: string,
): Promise<void> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'cancelBusinessInvoice',
  );

  await call({
    invoiceId,
    idempotencyKey: key(),
  });
}

export async function recordBusinessInvoicePayment(
  input: {
    invoiceId: string;
    accountId: string;
    amountMinor: number;
    paymentDate: string;
    paymentMethod?: PaymentMethodCode;
    paymentMethodLabel?: string;
    note?: string;
  },
): Promise<{
  paymentId: string;
  transactionId: string;
}> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable<
    typeof input & {
      idempotencyKey: string;
    },
    {
      paymentId: string;
      transactionId: string;
    }
  >(
    functions,
    'recordBusinessInvoicePayment',
  );

  const result = await call({
    ...input,
    idempotencyKey: key(),
  });

  return result.data;
}
