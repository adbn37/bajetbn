import {
  ADBN_TECH_ADMIN_EMAIL,
  getAdbnTechConnectedEmail,
  loadAdbnTechPaymentsReadOnly,
  type AdbnTechPaymentMirror,
} from './adbnTechIntegrationRepository';
import {
  listBusinessTransactionsForSpace,
  postTransactionWithIdempotencyKey,
  reverseTransactionWithIdempotencyKey,
  type PostTransactionOutcome,
  type TransactionInput,
} from './transactionRepository';
import type {
  FinancialTransaction,
  PaymentMethodCode,
} from '../types/models';

function externalPaymentToken(
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

export function adbnPaymentSyncLabel(
  paymentId: string,
) {
  return (
    'adbn_pay_'
    + externalPaymentToken(
      paymentId,
    )
  );
}

function adbnPaymentSyncKey(
  paymentId: string,
) {
  return (
    'adbn-payment-'
    + externalPaymentToken(
      paymentId,
    )
  );
}

function normalizedPaymentDate(
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

export function adbnPaymentCanPost(
  payment: AdbnTechPaymentMirror,
) {
  const status =
    payment.status
      .trim()
      .toLowerCase();

  return (
    payment.amount > 0
    && Boolean(
      normalizedPaymentDate(
        payment.paymentDate,
      ),
    )
    && ![
      'cancel',
      'void',
      'reverse',
      'refund',
      'reject',
      'delete',
      'failed',
    ].some(
      (blocked) =>
        status.includes(
          blocked,
        ),
    )
  );
}

export function adbnPaymentIsAfterCutoff(
  payment: AdbnTechPaymentMirror,
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
      payment.createdAt,
    );

  return (
    createdMillis > 0
    && createdMillis
      >= cutoffMillis
  );
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

function paymentTransactionInput(
  payment: AdbnTechPaymentMirror,
  spaceId: string,
  mappedAccountId: string,
): TransactionInput {
  const method =
    paymentMethodFromAdbn(
      payment.paymentMethod,
    );

  return {
    type: 'income',
    accountId:
      mappedAccountId,
    spaceId,
    amountMinor:
      Math.round(
        payment.amount * 100,
      ),
    transactionDate:
      normalizedPaymentDate(
        payment.paymentDate,
      ),
    categoryId:
      'income-sales',
    counterparty:
      payment.customerName
      || 'ADBN TECH customer',
    note:
      [
        'ADBN TECH payment '
          + (
            payment.paymentNo
            || payment.id
          ),
        payment.invoiceNo
          ? 'Invoice '
            + payment.invoiceNo
          : '',
        payment.reference
          ? 'Reference '
            + payment.reference
          : '',
      ]
        .filter(Boolean)
        .join(' | '),
    labels: [
      'adbn_tech',
      adbnPaymentSyncLabel(
        payment.id,
      ),
    ],
    ...method,
  };
}

function paymentRevisionToken(
  payment: AdbnTechPaymentMirror,
  spaceId: string,
  mappedAccountId: string,
) {
  const input =
    paymentTransactionInput(
      payment,
      spaceId,
      mappedAccountId,
    );

  return externalPaymentToken(
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

export function findPostedAdbnPaymentTransaction(
  paymentId: string,
  transactions: FinancialTransaction[],
) {
  const label =
    adbnPaymentSyncLabel(
      paymentId,
    ).toLowerCase();

  return transactions.find(
    (item) =>
      item.status === 'posted'
      && item.type === 'income'
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

export function findStalePostedAdbnPaymentTransactions(
  payments: AdbnTechPaymentMirror[],
  transactions: FinancialTransaction[],
) {
  const currentSourceLabels =
    new Set(
      payments.map(
        (payment) =>
          adbnPaymentSyncLabel(
            payment.id,
          ).toLowerCase(),
      ),
    );

  return transactions.filter(
    (item) => {
      if (
        item.status !== 'posted'
        || item.type !== 'income'
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
      ) {
        return false;
      }

      const sourceLabel =
        labels.find(
          (value) =>
            /^adbn_pay_[a-f0-9]{16}$/
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

export function adbnPaymentTransactionMatches(
  payment: AdbnTechPaymentMirror,
  transaction: FinancialTransaction,
  spaceId: string,
  mappedAccountId: string,
) {
  if (
    !mappedAccountId
    || !adbnPaymentCanPost(
      payment,
    )
  ) {
    return false;
  }

  const expected =
    paymentTransactionInput(
      payment,
      spaceId,
      mappedAccountId,
    );

  return (
    transaction.status === 'posted'
    && transaction.type === 'income'
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

function validatePaymentPosting(
  payment: AdbnTechPaymentMirror,
  mappedAccountId: string,
) {
  if (
    !adbnPaymentCanPost(
      payment,
    )
  ) {
    throw new Error(
      'This ADBN TECH payment is not eligible for posting.',
    );
  }

  if (!payment.bankAccountId) {
    throw new Error(
      'This ADBN TECH payment has no receiving bank/cash account.',
    );
  }

  if (!mappedAccountId) {
    throw new Error(
      'Map the ADBN TECH receiving account to a BajetBN Business account first.',
    );
  }
}

export async function syncAdbnTechPaymentToBajetBn(
  input: {
    payment: AdbnTechPaymentMirror;
    spaceId: string;
    mappedAccountId: string;
  },
): Promise<PostTransactionOutcome> {
  const {
    payment,
    spaceId,
    mappedAccountId,
  } = input;

  validatePaymentPosting(
    payment,
    mappedAccountId,
  );

  return postTransactionWithIdempotencyKey(
    paymentTransactionInput(
      payment,
      spaceId,
      mappedAccountId,
    ),
    adbnPaymentSyncKey(
      payment.id,
    ),
  );
}

export async function reconcileAdbnTechPaymentToBajetBn(
  input: {
    payment: AdbnTechPaymentMirror;
    currentTransaction: FinancialTransaction;
    spaceId: string;
    mappedAccountId: string;
    reversalDate: string;
  },
): Promise<PostTransactionOutcome> {
  const {
    payment,
    currentTransaction,
    spaceId,
    mappedAccountId,
    reversalDate,
  } = input;

  validatePaymentPosting(
    payment,
    mappedAccountId,
  );

  if (
    currentTransaction.status
      !== 'posted'
    || currentTransaction.type
      !== 'income'
  ) {
    throw new Error(
      'The current BajetBN payment transaction is no longer active.',
    );
  }

  if (
    adbnPaymentTransactionMatches(
      payment,
      currentTransaction,
      spaceId,
      mappedAccountId,
    )
  ) {
    throw new Error(
      'This ADBN TECH payment already matches BajetBN.',
    );
  }

  const revision =
    paymentRevisionToken(
      payment,
      spaceId,
      mappedAccountId,
    );

  const transition =
    externalPaymentToken(
      currentTransaction.id
      + '|'
      + revision,
    );

  await reverseTransactionWithIdempotencyKey(
    currentTransaction.id,
    reversalDate,
    'ADBN TECH payment was edited; previous BajetBN Money In reversed before posting the corrected source values.',
    'adbn-payment-reconcile-reverse-'
      + transition,
  );

  return postTransactionWithIdempotencyKey(
    paymentTransactionInput(
      payment,
      spaceId,
      mappedAccountId,
    ),
    'adbn-payment-reconcile-post-'
      + transition,
  );
}

export interface AdbnTechPaymentAutoSyncSummary {
  connected: boolean;
  posted: number;
  alreadySynced: number;
  beforeCutoff: number;
  blocked: number;
  failed: number;
  firstError: string;
  transactions: FinancialTransaction[];
}

export async function autoSyncNewAdbnTechPaymentsToBajetBn(
  input: {
    spaceId: string;
    mappings: Record<string, string>;
    cutoffIso: string;
    payments?: AdbnTechPaymentMirror[];
  },
): Promise<AdbnTechPaymentAutoSyncSummary> {
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

  const payments =
    input.payments
    || (
      await loadAdbnTechPaymentsReadOnly()
    ).payments;

  const knownLabels =
    new Set(
      currentTransactions
        .flatMap(
          (item) =>
            item.labels || [],
        )
        .map(
          (label) =>
            label.toLowerCase(),
        ),
    );

  let posted = 0;
  let alreadySynced = 0;
  let beforeCutoff = 0;
  let blocked = 0;
  let failed = 0;
  let firstError = '';

  for (
    const payment
    of payments
  ) {
    const syncLabel =
      adbnPaymentSyncLabel(
        payment.id,
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
      !adbnPaymentIsAfterCutoff(
        payment,
        input.cutoffIso,
      )
    ) {
      beforeCutoff += 1;
      continue;
    }

    const mappedAccountId =
      payment.bankAccountId
        ? input.mappings[
            payment.bankAccountId
          ]
        : '';

    if (
      !mappedAccountId
      || !adbnPaymentCanPost(
        payment,
      )
    ) {
      blocked += 1;
      continue;
    }

    try {
      const outcome =
        await syncAdbnTechPaymentToBajetBn(
          {
            payment,
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
            : 'ADBN TECH payment auto-sync failed.';
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
