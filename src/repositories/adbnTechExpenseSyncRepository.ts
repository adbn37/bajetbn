import type {
  FinancialTransaction,
  PaymentMethodCode,
} from '../types/models';
import {
  ADBN_TECH_ADMIN_EMAIL,
  getAdbnTechConnectedEmail,
  loadAdbnTechExpensesReadOnly,
  type AdbnTechExpenseMirror,
} from './adbnTechIntegrationRepository';
import {
  listBusinessTransactionsForSpace,
  postTransactionWithIdempotencyKey,
  reverseTransactionWithIdempotencyKey,
  type PostTransactionOutcome,
  type TransactionInput,
} from './transactionRepository';

function externalExpenseToken(
  value: string,
) {
  let first = 2166136261;
  let second = 5381;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    const code =
      value.charCodeAt(index);

    first =
      Math.imul(
        first ^ code,
        16777619,
      );

    second =
      Math.imul(
        second,
        33,
      )
      ^ code;
  }

  return (
    (first >>> 0)
      .toString(16)
      .padStart(8, '0')
    + (second >>> 0)
      .toString(16)
      .padStart(8, '0')
  );
}

export function adbnExpenseSyncLabel(
  expenseId: string,
) {
  return (
    'adbn_exp_'
    + externalExpenseToken(
      expenseId,
    )
  );
}

function adbnExpenseSyncKey(
  expenseId: string,
) {
  return (
    'adbn-expense-'
    + externalExpenseToken(
      expenseId,
    )
  );
}

function normalizedExpenseDate(
  value: string,
) {
  const direct =
    value.match(
      /^\d{4}-\d{2}-\d{2}/,
    )?.[0];

  if (direct) {
    return direct;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return '';
  }

  return parsed
    .toISOString()
    .slice(0, 10);
}

function paymentMethodFromAdbn(
  value: string,
): {
  paymentMethod: PaymentMethodCode;
  paymentMethodLabel?: string;
} {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized.includes('bank')
    || normalized.includes(
      'transfer',
    )
  ) {
    return {
      paymentMethod:
        'bank_transfer',
    };
  }

  if (
    normalized.includes('cash')
  ) {
    return {
      paymentMethod: 'cash',
    };
  }

  if (
    normalized.includes('debit')
  ) {
    return {
      paymentMethod:
        'debit_card',
    };
  }

  if (
    normalized.includes('credit')
  ) {
    return {
      paymentMethod:
        'credit_card',
    };
  }

  if (
    normalized.includes('wallet')
    || normalized.includes(
      'e-wallet',
    )
  ) {
    return {
      paymentMethod:
        'e_wallet',
    };
  }

  if (
    normalized.includes('qr')
  ) {
    return {
      paymentMethod:
        'qr_payment',
    };
  }

  return {
    paymentMethod: 'other',
    paymentMethodLabel:
      value.trim()
      || 'ADBN TECH',
  };
}

function categoryIdFromAdbn(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      'utilit',
    )
  ) {
    return 'expense-utilities';
  }

  if (
    normalized.includes(
      'salary',
    )
    || normalized.includes(
      'wage',
    )
  ) {
    return 'expense-wages';
  }

  if (
    normalized.includes(
      'rental',
    )
    || normalized === 'rent'
  ) {
    return 'expense-rent';
  }

  if (
    normalized.includes(
      'part',
    )
    || normalized.includes(
      'suppl',
    )
  ) {
    return 'expense-supplies';
  }

  if (
    normalized.includes(
      'bank',
    )
  ) {
    return 'expense-bank';
  }

  return 'expense-other';
}

function timestampMillis(
  value: unknown,
) {
  if (
    value
    && typeof value === 'object'
    && 'toMillis' in value
    && typeof (
      value as {
        toMillis?: unknown;
      }
    ).toMillis === 'function'
  ) {
    return (
      value as {
        toMillis: () => number;
      }
    ).toMillis();
  }

  if (
    typeof value === 'string'
  ) {
    const parsed =
      Date.parse(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  return 0;
}

export function adbnExpenseIsAfterCutoff(
  expense: AdbnTechExpenseMirror,
  cutoffIso: string,
) {
  const cutoffMillis =
    Date.parse(cutoffIso);

  if (
    !Number.isFinite(
      cutoffMillis,
    )
  ) {
    return false;
  }

  const createdMillis =
    timestampMillis(
      expense.createdAt,
    );

  return (
    createdMillis > 0
    && createdMillis
      >= cutoffMillis
  );
}

export function adbnExpenseCanPost(
  expense: AdbnTechExpenseMirror,
) {
  return (
    expense.amount > 0
    && Boolean(
      normalizedExpenseDate(
        expense.date,
      ),
    )
  );
}

function expenseTransactionInput(
  expense: AdbnTechExpenseMirror,
  spaceId: string,
  mappedAccountId: string,
): TransactionInput {
  const method =
    paymentMethodFromAdbn(
      expense.paymentMethod,
    );

  return {
    type: 'expense',
    accountId:
      mappedAccountId,
    spaceId,
    amountMinor:
      Math.round(
        expense.amount * 100,
      ),
    transactionDate:
      normalizedExpenseDate(
        expense.date,
      ),
    categoryId:
      categoryIdFromAdbn(
        expense.category,
      ),
    counterparty:
      expense.supplier
      || expense.description
      || 'ADBN TECH expense',
    note:
      [
        'ADBN TECH expense '
          + (
            expense.expenseNo
            || expense.id
          ),
        expense.category
          ? 'Category '
            + expense.category
          : '',
        expense.description
          ? expense.description
          : '',
        expense.reference
          ? 'Reference '
            + expense.reference
          : '',
        expense.linkedJobNo
          ? 'Job '
            + expense.linkedJobNo
          : '',
        expense.linkedInvoiceNo
          ? 'Invoice '
            + expense.linkedInvoiceNo
          : '',
        expense.notes
          ? expense.notes
          : '',
      ]
        .filter(Boolean)
        .join(' | '),
    labels: [
      'adbn_tech',
      'adbn_expense',
      adbnExpenseSyncLabel(
        expense.id,
      ),
    ],
    ...method,
  };
}

function expenseRevisionToken(
  expense: AdbnTechExpenseMirror,
  spaceId: string,
  mappedAccountId: string,
) {
  const input =
    expenseTransactionInput(
      expense,
      spaceId,
      mappedAccountId,
    );

  return externalExpenseToken(
    JSON.stringify([
      input.accountId,
      input.amountMinor,
      input.transactionDate,
      input.categoryId || '',
      input.counterparty || '',
      input.note || '',
      input.paymentMethod || '',
      input.paymentMethodLabel || '',
    ]),
  );
}

export function findPostedAdbnExpenseTransaction(
  expenseId: string,
  transactions: FinancialTransaction[],
) {
  const label =
    adbnExpenseSyncLabel(
      expenseId,
    ).toLowerCase();

  return transactions.find(
    (item) =>
      item.status === 'posted'
      && item.type === 'expense'
      && (item.labels || [])
        .some(
          (value) =>
            value
              .trim()
              .toLowerCase()
            === label,
        ),
  );
}

export function findStalePostedAdbnExpenseTransactions(
  expenses: AdbnTechExpenseMirror[],
  transactions: FinancialTransaction[],
) {
  const currentSourceLabels =
    new Set(
      expenses.map(
        (expense) =>
          adbnExpenseSyncLabel(
            expense.id,
          ).toLowerCase(),
      ),
    );

  return transactions.filter(
    (item) => {
      if (
        item.status !== 'posted'
        || item.type !== 'expense'
      ) {
        return false;
      }

      const labels =
        (item.labels || [])
          .map(
            (value) =>
              value
                .trim()
                .toLowerCase(),
          );

      if (
        !labels.includes(
          'adbn_tech',
        )
        || !labels.includes(
          'adbn_expense',
        )
      ) {
        return false;
      }

      const sourceLabel =
        labels.find(
          (value) =>
            /^adbn_exp_[a-f0-9]{16}$/
              .test(value),
        )
        || '';

      return Boolean(
        sourceLabel,
      )
        && !currentSourceLabels.has(
          sourceLabel,
        );
    },
  );
}

export function adbnExpenseTransactionMatches(
  expense: AdbnTechExpenseMirror,
  transaction: FinancialTransaction,
  spaceId: string,
  mappedAccountId: string,
) {
  if (
    !mappedAccountId
    || !adbnExpenseCanPost(
      expense,
    )
  ) {
    return false;
  }

  const expected =
    expenseTransactionInput(
      expense,
      spaceId,
      mappedAccountId,
    );

  return (
    transaction.status === 'posted'
    && transaction.type === 'expense'
    && transaction.accountId
      === expected.accountId
    && transaction.amountMinor
      === expected.amountMinor
    && transaction.transactionDate
      === expected.transactionDate
    && (
      transaction.categoryId
      || ''
    ) === (
      expected.categoryId
      || ''
    )
    && (
      transaction.counterparty
      || ''
    ) === (
      expected.counterparty
      || ''
    )
    && (
      transaction.note
      || ''
    ) === (
      expected.note
      || ''
    )
    && (
      transaction.paymentMethod
      || ''
    ) === (
      expected.paymentMethod
      || ''
    )
    && (
      transaction.paymentMethodLabel
      || ''
    ) === (
      expected.paymentMethodLabel
      || ''
    )
  );
}

function validateExpensePosting(
  expense: AdbnTechExpenseMirror,
  mappedAccountId: string,
) {
  if (
    !adbnExpenseCanPost(
      expense,
    )
  ) {
    throw new Error(
      'This ADBN TECH expense is not eligible for posting.',
    );
  }

  if (!expense.bankAccountId) {
    throw new Error(
      'This ADBN TECH expense has no paying bank/cash account.',
    );
  }

  if (!mappedAccountId) {
    throw new Error(
      'Map the ADBN TECH paying account to a BajetBN Business account first.',
    );
  }
}

export async function syncAdbnTechExpenseToBajetBn(
  input: {
    expense: AdbnTechExpenseMirror;
    spaceId: string;
    mappedAccountId: string;
  },
): Promise<PostTransactionOutcome> {
  const {
    expense,
    spaceId,
    mappedAccountId,
  } = input;

  validateExpensePosting(
    expense,
    mappedAccountId,
  );

  return postTransactionWithIdempotencyKey(
    expenseTransactionInput(
      expense,
      spaceId,
      mappedAccountId,
    ),
    adbnExpenseSyncKey(
      expense.id,
    ),
  );
}

export async function reconcileAdbnTechExpenseToBajetBn(
  input: {
    expense: AdbnTechExpenseMirror;
    currentTransaction: FinancialTransaction;
    spaceId: string;
    mappedAccountId: string;
    reversalDate: string;
  },
): Promise<PostTransactionOutcome> {
  const {
    expense,
    currentTransaction,
    spaceId,
    mappedAccountId,
    reversalDate,
  } = input;

  validateExpensePosting(
    expense,
    mappedAccountId,
  );

  if (
    currentTransaction.status
      !== 'posted'
    || currentTransaction.type
      !== 'expense'
  ) {
    throw new Error(
      'The current BajetBN expense transaction is no longer active.',
    );
  }

  if (
    adbnExpenseTransactionMatches(
      expense,
      currentTransaction,
      spaceId,
      mappedAccountId,
    )
  ) {
    throw new Error(
      'This ADBN TECH expense already matches BajetBN.',
    );
  }

  const revision =
    expenseRevisionToken(
      expense,
      spaceId,
      mappedAccountId,
    );

  const transition =
    externalExpenseToken(
      currentTransaction.id
      + '|'
      + revision,
    );

  await reverseTransactionWithIdempotencyKey(
    currentTransaction.id,
    reversalDate,
    'ADBN TECH expense was edited; previous BajetBN Money Out reversed before posting the corrected source values.',
    'adbn-expense-reconcile-reverse-'
      + transition,
  );

  return postTransactionWithIdempotencyKey(
    expenseTransactionInput(
      expense,
      spaceId,
      mappedAccountId,
    ),
    'adbn-expense-reconcile-post-'
      + transition,
  );
}

export async function countSyncedAdbnExpenses(
  input: {
    spaceId: string;
    expenses: AdbnTechExpenseMirror[];
  },
): Promise<{
  count: number;
  transactions: FinancialTransaction[];
}> {
  const transactions =
    await listBusinessTransactionsForSpace(
      input.spaceId,
    );

  const labels =
    new Set(
      transactions
        .flatMap(
          (item) =>
            item.labels || [],
        )
        .map(
          (label) =>
            label
              .trim()
              .toLowerCase(),
        ),
    );

  return {
    count:
      input.expenses.filter(
        (expense) =>
          labels.has(
            adbnExpenseSyncLabel(
              expense.id,
            ).toLowerCase(),
          ),
      ).length,
    transactions,
  };
}


export interface AdbnTechExpenseAutoSyncSummary {
  connected: boolean;
  posted: number;
  alreadySynced: number;
  beforeCutoff: number;
  blocked: number;
  failed: number;
  firstError: string;
  transactions: FinancialTransaction[];
}

export async function autoSyncNewAdbnTechExpensesToBajetBn(
  input: {
    spaceId: string;
    mappings: Record<string, string>;
    cutoffIso: string;
    expenses?: AdbnTechExpenseMirror[];
  },
): Promise<AdbnTechExpenseAutoSyncSummary> {
  const currentTransactions =
    await listBusinessTransactionsForSpace(
      input.spaceId,
    );

  if (
    getAdbnTechConnectedEmail()
    !== ADBN_TECH_ADMIN_EMAIL
  ) {
    return {
      connected: false,
      posted: 0,
      alreadySynced: 0,
      beforeCutoff: 0,
      blocked: 0,
      failed: 0,
      firstError: '',
      transactions:
        currentTransactions,
    };
  }

  const expenses =
    input.expenses
    || (
      await loadAdbnTechExpensesReadOnly()
    ).expenses;

  const knownLabels =
    new Set(
      currentTransactions
        .flatMap(
          (item) =>
            item.labels || [],
        )
        .map(
          (label) =>
            label
              .trim()
              .toLowerCase(),
        ),
    );

  let posted = 0;
  let alreadySynced = 0;
  let beforeCutoff = 0;
  let blocked = 0;
  let failed = 0;
  let firstError = '';

  for (
    const expense
    of expenses
  ) {
    const syncLabel =
      adbnExpenseSyncLabel(
        expense.id,
      );

    if (
      knownLabels.has(
        syncLabel.toLowerCase(),
      )
    ) {
      alreadySynced += 1;
      continue;
    }

    if (
      !adbnExpenseIsAfterCutoff(
        expense,
        input.cutoffIso,
      )
    ) {
      beforeCutoff += 1;
      continue;
    }

    const mappedAccountId =
      expense.bankAccountId
        ? input.mappings[
            expense.bankAccountId
          ]
        : '';

    if (
      !mappedAccountId
      || !adbnExpenseCanPost(
        expense,
      )
    ) {
      blocked += 1;
      continue;
    }

    try {
      const outcome =
        await syncAdbnTechExpenseToBajetBn(
          {
            expense,
            spaceId:
              input.spaceId,
            mappedAccountId,
          },
        );

      if (
        outcome.mode === 'posted'
      ) {
        posted += 1;

        knownLabels.add(
          syncLabel
            .toLowerCase(),
        );
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;

      if (!firstError) {
        firstError =
          error instanceof Error
            ? error.message
            : 'ADBN TECH expense auto-sync failed.';
      }
    }
  }

  const transactions =
    posted > 0
      ? await listBusinessTransactionsForSpace(
          input.spaceId,
        )
      : currentTransactions;

  return {
    connected: true,
    posted,
    alreadySynced,
    beforeCutoff,
    blocked,
    failed,
    firstError,
    transactions,
  };
}


export interface AdbnTechExpenseAutoReconcileSummary {
  connected: boolean;
  reconciled: number;
  unchanged: number;
  blocked: number;
  failed: number;
  firstError: string;
  transactions: FinancialTransaction[];
}

export async function autoReconcileChangedAdbnTechExpenses(
  input: {
    spaceId: string;
    mappings: Record<string, string>;
    reversalDate: string;
    expenses?: AdbnTechExpenseMirror[];
    transactions?: FinancialTransaction[];
  },
): Promise<AdbnTechExpenseAutoReconcileSummary> {
  const startingTransactions =
    input.transactions
    || await listBusinessTransactionsForSpace(
      input.spaceId,
    );

  if (
    getAdbnTechConnectedEmail()
    !== ADBN_TECH_ADMIN_EMAIL
  ) {
    return {
      connected: false,
      reconciled: 0,
      unchanged: 0,
      blocked: 0,
      failed: 0,
      firstError: '',
      transactions: startingTransactions,
    };
  }

  const expenses =
    input.expenses
    || (
      await loadAdbnTechExpensesReadOnly()
    ).expenses;

  let reconciled = 0;
  let unchanged = 0;
  let blocked = 0;
  let failed = 0;
  let firstError = '';

  for (const expense of expenses) {
    const currentTransaction =
      findPostedAdbnExpenseTransaction(
        expense.id,
        startingTransactions,
      );

    if (!currentTransaction) {
      continue;
    }

    const mappedAccountId =
      expense.bankAccountId
        ? input.mappings[
            expense.bankAccountId
          ]
        : '';

    if (
      adbnExpenseTransactionMatches(
        expense,
        currentTransaction,
        input.spaceId,
        mappedAccountId,
      )
    ) {
      unchanged += 1;
      continue;
    }

    if (
      !mappedAccountId
      || !expense.bankAccountId
      || !adbnExpenseCanPost(
        expense,
      )
    ) {
      blocked += 1;
      continue;
    }

    try {
      const outcome =
        await reconcileAdbnTechExpenseToBajetBn(
          {
            expense,
            currentTransaction,
            spaceId: input.spaceId,
            mappedAccountId,
            reversalDate:
              input.reversalDate,
          },
        );

      if (outcome.mode === 'posted') {
        reconciled += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;

      if (!firstError) {
        firstError =
          error instanceof Error
            ? error.message
            : 'ADBN TECH expense automatic reconciliation failed.';
      }
    }
  }

  const transactions =
    reconciled > 0
      ? await listBusinessTransactionsForSpace(
          input.spaceId,
        )
      : startingTransactions;

  return {
    connected: true,
    reconciled,
    unchanged,
    blocked,
    failed,
    firstError,
    transactions,
  };
}
