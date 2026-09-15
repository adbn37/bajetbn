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

export async function getBusinessInvoiceWorkspace(
  spaceId: string,
): Promise<{
  ownerId: string;
  isOwner: boolean;
  canManageInvoices: boolean;
  canCancelInvoices: boolean;
  invoices: BusinessInvoice[];
}> {
  const { functions } =
    requireFirebase();

  const call =
    httpsCallable(
      functions,
      'getBusinessInvoiceWorkspace',
    );

  const result =
    await call({
      spaceId,
    });

  return result.data as {
    ownerId: string;
    isOwner: boolean;
    canManageInvoices: boolean;
    canCancelInvoices: boolean;
    invoices: BusinessInvoice[];
  };
}

export async function listBusinessInvoices(
  _uid: string,
  spaceId: string,
): Promise<BusinessInvoice[]> {
  const workspace =
    await getBusinessInvoiceWorkspace(
      spaceId,
    );

  return workspace.invoices;
}
export async function listBusinessInvoicePayments(
  invoiceId: string,
): Promise<BusinessInvoicePayment[]> {
  const { functions } =
    requireFirebase();

  const call =
    httpsCallable(
      functions,
      'getBusinessInvoicePayments',
    );

  const result =
    await call({
      invoiceId,
    });

  return (
    (
      result.data as {
        payments?:
          BusinessInvoicePayment[];
      }
    ).payments
    || []
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
