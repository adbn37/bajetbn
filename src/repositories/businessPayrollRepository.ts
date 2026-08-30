import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  httpsCallable,
} from 'firebase/functions';

import {
  requireFirebase,
} from '../services/firebase';

import type {
  BusinessEmployee,
  BusinessPayrollRun,
} from '../types/models';

export interface BusinessEmployeeInput {
  name: string;
  roleTitle: string;
  employeeNumber: string;
  phone: string;
  monthlyWageMinor: number;
  currency: string;
}

export interface BusinessPayrollRunInput {
  spaceId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  payDate: string;
  grossMinor: number;
  deductionsMinor: number;
  accountId: string;
  accountName: string;
  currency: string;
  note: string;
}

function requireUid(): string {
  const { auth } = requireFirebase();

  const uid =
    auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      'Your session has ended. Sign in again.',
    );
  }

  return uid;
}

function requireOnline(): void {
  if (!navigator.onLine) {
    throw new Error(
      'Payroll posting needs an internet connection so the wage payment and account ledger stay in sync.',
    );
  }
}

function displayId(
  prefix: string,
): string {
  const suffix =
    typeof globalThis.crypto?.randomUUID
      === 'function'
      ? globalThis.crypto
          .randomUUID()
          .replace(/-/g, '')
          .slice(0, 8)
          .toUpperCase()
      : Math.random()
          .toString(36)
          .slice(2, 10)
          .toUpperCase();

  return prefix + '-' + suffix;
}

function newKey(): string {
  if (
    typeof globalThis.crypto?.randomUUID
      === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    'payroll-'
    + Date.now()
    + '-'
    + Math.random()
        .toString(36)
        .slice(2, 18)
  );
}

function errorMessage(
  error: unknown,
): string {
  if (
    error
    && typeof error === 'object'
    && 'message' in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message
      || 'Payroll posting failed.',
    ).slice(
      0,
      1000,
    );
  }

  return 'Payroll posting failed.';
}

export async function listBusinessEmployees(
  spaceId: string,
): Promise<BusinessEmployee[]> {
  const { db } = requireFirebase();

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          'businessEmployees',
        ),
        where(
          'spaceId',
          '==',
          spaceId,
        ),
      ),
    );

  return snapshot.docs
    .map(
      (item) => ({
        id: item.id,
        ...item.data(),
      }) as BusinessEmployee,
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
        ),
    );
}

export async function createBusinessEmployee(
  spaceId: string,
  input: BusinessEmployeeInput,
): Promise<string> {
  const { db } = requireFirebase();
  const uid = requireUid();

  const ref = doc(
    collection(
      db,
      'businessEmployees',
    ),
  );

  await setDoc(
    ref,
    {
      displayId:
        displayId('EMP'),
      spaceId,
      ownerId:
        uid,
      name:
        input.name.trim(),
      roleTitle:
        input.roleTitle.trim(),
      employeeNumber:
        input.employeeNumber.trim(),
      phone:
        input.phone.trim(),
      monthlyWageMinor:
        Math.max(
          0,
          Math.round(
            input.monthlyWageMinor,
          ),
        ),
      currency:
        input.currency,
      archivedAt:
        null,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    },
  );

  return ref.id;
}

export async function updateBusinessEmployee(
  employeeId: string,
  input: Omit<
    BusinessEmployeeInput,
    'currency'
  >,
): Promise<void> {
  const { db } = requireFirebase();

  await updateDoc(
    doc(
      db,
      'businessEmployees',
      employeeId,
    ),
    {
      name:
        input.name.trim(),
      roleTitle:
        input.roleTitle.trim(),
      employeeNumber:
        input.employeeNumber.trim(),
      phone:
        input.phone.trim(),
      monthlyWageMinor:
        Math.max(
          0,
          Math.round(
            input.monthlyWageMinor,
          ),
        ),
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function setBusinessEmployeeArchived(
  employeeId: string,
  archived: boolean,
): Promise<void> {
  const { db } = requireFirebase();

  await updateDoc(
    doc(
      db,
      'businessEmployees',
      employeeId,
    ),
    {
      archivedAt:
        archived
          ? serverTimestamp()
          : null,
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function listBusinessPayrollRuns(
  uid: string,
  spaceId: string,
): Promise<BusinessPayrollRun[]> {
  const { db } = requireFirebase();

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          'businessPayrollRuns',
        ),
        where(
          'ownerId',
          '==',
          uid,
        ),
        where(
          'spaceId',
          '==',
          spaceId,
        ),
      ),
    );

  return snapshot.docs
    .map(
      (item) => ({
        id: item.id,
        ...item.data(),
      }) as BusinessPayrollRun,
    )
    .sort(
      (a, b) => {
        const dateCompare =
          b.payDate.localeCompare(
            a.payDate,
          );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return (
          (b.createdAt?.toMillis() || 0)
          - (a.createdAt?.toMillis() || 0)
        );
      },
    );
}

async function postPayrollTransaction(
  runId: string,
  input: BusinessPayrollRunInput,
  idempotencyKey: string,
): Promise<string> {
  requireOnline();

  const {
    db,
    functions,
  } = requireFirebase();

  const runRef = doc(
    db,
    'businessPayrollRuns',
    runId,
  );

  const netMinor =
    input.grossMinor
    - input.deductionsMinor;

  const call =
    httpsCallable(
      functions,
      'postTransaction',
    );

  try {
    const result =
      await call({
        type:
          'expense',
        accountId:
          input.accountId,
        spaceId:
          input.spaceId,
        amountMinor:
          netMinor,
        currency:
          input.currency,
        transactionDate:
          input.payDate,
        category:
          'Payroll / Wages',
        categoryScope:
          'business',
        counterparty:
          input.employeeName,
        note:
          input.note.trim()
          || (
            'Payroll '
            + input.period
            + ' · '
            + input.employeeName
          ),
        labels: [
          'payroll',
          'payroll-' + input.period,
        ],
        idempotencyKey,
      });

    const data =
      result.data as {
        transactionId?: string;
      };

    if (!data.transactionId) {
      throw new Error(
        'Payroll transaction did not return a transaction ID.',
      );
    }

    await updateDoc(
      runRef,
      {
        status:
          'posted',
        transactionId:
          data.transactionId,
        failureReason:
          null,
        updatedAt:
          serverTimestamp(),
      },
    );

    return data.transactionId;
  } catch (error) {
    try {
      await updateDoc(
        runRef,
        {
          failureReason:
            errorMessage(error),
          updatedAt:
            serverTimestamp(),
        },
      );
    } catch {
      // Preserve original posting error.
    }

    throw error;
  }
}

export async function postBusinessPayrollRun(
  input: BusinessPayrollRunInput,
): Promise<{
  runId: string;
  transactionId: string;
}> {
  requireOnline();

  if (
    input.grossMinor <= 0
    || input.deductionsMinor < 0
    || input.deductionsMinor
      >= input.grossMinor
  ) {
    throw new Error(
      'Gross pay must be above zero and deductions must be lower than gross pay.',
    );
  }

  const {
    db,
  } = requireFirebase();

  const uid = requireUid();

  const runRef = doc(
    collection(
      db,
      'businessPayrollRuns',
    ),
  );

  const idempotencyKey =
    newKey();

  const netMinor =
    input.grossMinor
    - input.deductionsMinor;

  await setDoc(
    runRef,
    {
      displayId:
        displayId('PAY'),
      spaceId:
        input.spaceId,
      ownerId:
        uid,
      employeeId:
        input.employeeId,
      employeeName:
        input.employeeName,
      period:
        input.period,
      payDate:
        input.payDate,
      grossMinor:
        input.grossMinor,
      deductionsMinor:
        input.deductionsMinor,
      netMinor,
      accountId:
        input.accountId,
      accountName:
        input.accountName,
      currency:
        input.currency,
      note:
        input.note.trim(),
      status:
        'pending',
      transactionId:
        null,
      idempotencyKey,
      failureReason:
        null,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    },
  );

  const transactionId =
    await postPayrollTransaction(
      runRef.id,
      input,
      idempotencyKey,
    );

  return {
    runId:
      runRef.id,
    transactionId,
  };
}

export async function retryBusinessPayrollRun(
  run: BusinessPayrollRun,
): Promise<string> {
  if (run.status !== 'pending') {
    throw new Error(
      'Only a pending payroll run can be retried.',
    );
  }

  return postPayrollTransaction(
    run.id,
    {
      spaceId:
        run.spaceId,
      employeeId:
        run.employeeId,
      employeeName:
        run.employeeName,
      period:
        run.period,
      payDate:
        run.payDate,
      grossMinor:
        run.grossMinor,
      deductionsMinor:
        run.deductionsMinor,
      accountId:
        run.accountId,
      accountName:
        run.accountName,
      currency:
        run.currency,
      note:
        run.note,
    },
    run.idempotencyKey,
  );
}

export async function cancelBusinessPayrollRun(
  runId: string,
): Promise<void> {
  const {
    db,
  } = requireFirebase();

  await updateDoc(
    doc(
      db,
      'businessPayrollRuns',
      runId,
    ),
    {
      status:
        'cancelled',
      failureReason:
        null,
      updatedAt:
        serverTimestamp(),
    },
  );
}