import { httpsCallable } from 'firebase/functions';

import { requireFirebase } from '../services/firebase';

import type {
  BusinessQuotation,
  BusinessQuotationStatus,
} from '../types/models';

export interface BusinessQuotationLineInput {
  description: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface BusinessQuotationInput {
  spaceId: string;
  customerId: string;
  quoteDate: string;
  validUntil: string;
  lines: BusinessQuotationLineInput[];
  notes: string;
}

function key(): string {
  return crypto.randomUUID();
}

function requireOnline() {
  if (!navigator.onLine) {
    throw new Error(
      'Quotation actions need an internet connection.',
    );
  }
}

export async function getBusinessQuotationWorkspace(
  spaceId: string,
): Promise<{
  ownerId: string;
  isOwner: boolean;
  canManageQuotations: boolean;
  quotations: BusinessQuotation[];
}> {
  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'getBusinessQuotationWorkspace',
  );

  const result = await call({
    spaceId,
  });

  return result.data as {
    ownerId: string;
    isOwner: boolean;
    canManageQuotations: boolean;
    quotations: BusinessQuotation[];
  };
}

export async function createBusinessQuotation(
  input: BusinessQuotationInput,
): Promise<{
  quotationId: string;
  quotationNumber: string;
}> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable<
    BusinessQuotationInput & {
      idempotencyKey: string;
    },
    {
      quotationId: string;
      quotationNumber: string;
    }
  >(
    functions,
    'createBusinessQuotation',
  );

  const result = await call({
    ...input,
    idempotencyKey: key(),
  });

  return result.data;
}

export async function updateBusinessQuotation(
  quotationId: string,
  input: Omit<
    BusinessQuotationInput,
    'spaceId'
  >,
): Promise<void> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'updateBusinessQuotation',
  );

  await call({
    ...input,
    quotationId,
    idempotencyKey: key(),
  });
}

export async function setBusinessQuotationStatus(
  quotationId: string,
  status: Extract<
    BusinessQuotationStatus,
    'sent' | 'accepted' | 'rejected' | 'cancelled'
  >,
): Promise<void> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'setBusinessQuotationStatus',
  );

  await call({
    quotationId,
    status,
    idempotencyKey: key(),
  });
}

export async function convertBusinessQuotationToSalesOrder(
  quotationId: string,
  orderDate: string,
  expectedDate: string,
): Promise<{
  salesOrderId: string;
  salesOrderNumber: string;
}> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable<
    {
      quotationId: string;
      orderDate: string;
      expectedDate: string;
      idempotencyKey: string;
    },
    {
      salesOrderId: string;
      salesOrderNumber: string;
    }
  >(
    functions,
    'convertBusinessQuotationToSalesOrder',
  );

  const result = await call({
    quotationId,
    orderDate,
    expectedDate,
    idempotencyKey: key(),
  });

  return result.data;
}

export async function convertBusinessQuotationToInvoice(
  quotationId: string,
  issueDate: string,
  dueDate: string,
): Promise<{
  invoiceId: string;
  invoiceNumber: string;
}> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable<
    {
      quotationId: string;
      issueDate: string;
      dueDate: string;
      idempotencyKey: string;
    },
    {
      invoiceId: string;
      invoiceNumber: string;
    }
  >(
    functions,
    'convertBusinessQuotationToInvoice',
  );

  const result = await call({
    quotationId,
    issueDate,
    dueDate,
    idempotencyKey: key(),
  });

  return result.data;
}
