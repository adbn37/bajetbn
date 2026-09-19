import { httpsCallable } from 'firebase/functions';

import { requireFirebase } from '../services/firebase';

import type {
  BusinessSalesOrder,
} from '../types/models';

function key(): string {
  return crypto.randomUUID();
}

function requireOnline() {
  if (!navigator.onLine) {
    throw new Error(
      'Sales Order actions need an internet connection.',
    );
  }
}

export async function getBusinessSalesOrderWorkspace(
  spaceId: string,
): Promise<{
  ownerId: string;
  isOwner: boolean;
  canManageSalesOrders: boolean;
  salesOrders: BusinessSalesOrder[];
}> {
  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'getBusinessSalesOrderWorkspace',
  );

  const result = await call({
    spaceId,
  });

  return result.data as {
    ownerId: string;
    isOwner: boolean;
    canManageSalesOrders: boolean;
    salesOrders: BusinessSalesOrder[];
  };
}

export async function setBusinessSalesOrderStatus(
  salesOrderId: string,
  status: 'confirmed' | 'cancelled',
): Promise<void> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'setBusinessSalesOrderStatus',
  );

  await call({
    salesOrderId,
    status,
    idempotencyKey: key(),
  });
}

export async function convertBusinessSalesOrderToInvoice(
  salesOrderId: string,
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
      salesOrderId: string;
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
    'convertBusinessSalesOrderToInvoice',
  );

  const result = await call({
    salesOrderId,
    issueDate,
    dueDate,
    idempotencyKey: key(),
  });

  return result.data;
}
