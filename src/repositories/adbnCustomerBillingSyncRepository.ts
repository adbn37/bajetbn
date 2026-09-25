import {
  httpsCallable,
} from 'firebase/functions';

import {
  requireFirebase,
} from '../services/firebase';

import type {
  AdbnTechInvoiceMirror,
  AdbnTechPaymentMirror,
} from './adbnTechIntegrationRepository';

export async function syncAdbnCustomerBillingToBajetBn(
  input: {
    businessSpaceId: string;
    adbnCustomerId: string;
    invoices: AdbnTechInvoiceMirror[];
    payments: AdbnTechPaymentMirror[];
  },
): Promise<{
  linkId: string;
  targetSpaceId: string;
  commitmentsSynced: number;
  paymentsSynced: number;
  staleCommitments: number;
  stalePayments: number;
}> {
  const { functions } = requireFirebase();

  const call = httpsCallable(
    functions,
    'syncAdbnCustomerBillingMirror',
  );

  const invoices = input.invoices
    .slice(0, 100)
    .map((item) => ({
      id: item.id,
      invoiceNo: item.invoiceNo,
      customerId: item.customerId,
      customerNo: item.customerNo,
      title: item.title,
      saleType: item.saleType,
      total: item.total,
      paid: item.paid,
      balance: item.balance,
      invoiceDate: item.invoiceDate,
      dueDate: item.dueDate,
      nextDueDate: item.nextDueDate,
      status: item.status,
      monthlyAmount: item.monthlyAmount,
      termMonths: item.termMonths,
    }));

  const payments = input.payments
    .slice(0, 500)
    .map((item) => ({
      id: item.id,
      paymentNo: item.paymentNo,
      invoiceId: item.invoiceId,
      customerId: item.customerId,
      customerNo: item.customerNo,
      amount: item.amount,
      paymentDate: item.paymentDate,
      paymentMethod: item.paymentMethod,
      reference: item.reference,
      status: item.status,
    }));

  const result = await call({
    businessSpaceId: input.businessSpaceId,
    adbnCustomerId: input.adbnCustomerId,
    invoices,
    payments,
  });

  return result.data as {
    linkId: string;
    targetSpaceId: string;
    commitmentsSynced: number;
    paymentsSynced: number;
    staleCommitments: number;
    stalePayments: number;
  };
}
