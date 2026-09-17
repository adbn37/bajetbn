import { httpsCallable } from 'firebase/functions';

import { requireFirebase } from '../services/firebase';

import type {
  BusinessEmployee,
  BusinessPayrollRun,
} from '../types/models';

export interface BusinessPayrollWorkspace {
  ownerId: string;
  spaceId: string;
  spaceName: string;
  currency: string;
  role: 'owner' | 'admin' | 'member';
  isOwner: boolean;
  isAdmin: boolean;
  canViewPayroll: boolean;
  canDeletePayroll: boolean;
  employees: BusinessEmployee[];
  runs: BusinessPayrollRun[];
}

export interface DeleteBusinessPayrollResult {
  runId: string;
  status: 'cancelled';
  reversalTransactionId: string | null;
  auditId: string;
  payslipsCancelled: number;
}

function requireOnline(): void {
  if (!navigator.onLine) {
    throw new Error(
      'Payroll deletion needs an internet connection so the payroll record and Business Account stay in sync.',
    );
  }
}

function newKey(): string {
  if (
    typeof globalThis.crypto?.randomUUID
      === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    'payroll-delete-'
    + Date.now()
    + '-'
    + Math.random()
        .toString(36)
        .slice(2, 18)
  );
}

export async function getBusinessPayrollWorkspace(
  spaceId: string,
): Promise<BusinessPayrollWorkspace> {
  const { functions } = requireFirebase();

  const call = httpsCallable<
    { spaceId: string },
    BusinessPayrollWorkspace
  >(
    functions,
    'getBusinessPayrollWorkspace',
  );

  const result = await call({
    spaceId,
  });

  return result.data;
}

export async function deleteBusinessPayrollRun(
  input: {
    runId: string;
    transactionDate: string;
    reason?: string;
  },
): Promise<DeleteBusinessPayrollResult> {
  requireOnline();

  const { functions } = requireFirebase();

  const call = httpsCallable<
    {
      runId: string;
      transactionDate: string;
      reason?: string;
      idempotencyKey: string;
    },
    DeleteBusinessPayrollResult
  >(
    functions,
    'deleteBusinessPayrollRun',
  );

  const result = await call({
    ...input,
    idempotencyKey:
      newKey(),
  });

  return result.data;
}
