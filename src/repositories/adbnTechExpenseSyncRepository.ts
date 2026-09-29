import type {
  FinancialTransaction,
  PaymentMethodCode,
} from '../types/models';
import type {
  AdbnTechExpenseMirror,
} from './adbnTechIntegrationRepository';
import {
  listBusinessTransactionsForSpace,
  postTransactionWithIdempotencyKey,
  type PostTransactionOutcome,
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

  const method =
    paymentMethodFromAdbn(
      expense.paymentMethod,
    );

  return postTransactionWithIdempotencyKey(
    {
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
    },
    adbnExpenseSyncKey(
      expense.id,
    ),
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
