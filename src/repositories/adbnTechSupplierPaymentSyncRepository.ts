import type {
  FinancialTransaction,
  PaymentMethodCode,
} from '../types/models';
import {
  listBusinessTransactionsForSpace,
  postTransactionWithIdempotencyKey,
  type PostTransactionOutcome,
} from './transactionRepository';
import type {
  AdbnTechPurchaseMirror,
  AdbnTechSupplierPaymentMirror,
} from './adbnTechIntegrationRepository';

export const ADBN_SUPPLIER_PURCHASE_AUTO_SYNC_CUTOFF =
  '2026-09-25';

function externalSupplierPaymentToken(
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

export function adbnSupplierPaymentSyncLabel(
  paymentId: string,
) {
  return (
    'adbn_supplier_pay_'
    + externalSupplierPaymentToken(
      paymentId,
    )
  );
}

function adbnSupplierPaymentSyncKey(
  paymentId: string,
) {
  return (
    'adbn-supplier-payment-'
    + externalSupplierPaymentToken(
      paymentId,
    )
  );
}

function normalizedPurchaseDate(
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

function linkedPurchasesForSupplierPayment(
  payment: AdbnTechSupplierPaymentMirror,
  purchases: AdbnTechPurchaseMirror[],
) {
  const purchaseIds =
    new Set(
      [
        payment.purchaseId,
        ...(payment.purchaseIds || []),
      ].filter(Boolean),
    );

  return purchases.filter(
    (purchase) =>
      purchaseIds.has(
        purchase.id,
      )
      || (
        Boolean(
          payment.purchaseNo,
        )
        && purchase.purchaseNo
          === payment.purchaseNo
      ),
  );
}

export function adbnSupplierPaymentPurchaseIsOnOrAfterCutoff(
  payment: AdbnTechSupplierPaymentMirror,
  purchases: AdbnTechPurchaseMirror[],
  cutoff =
    ADBN_SUPPLIER_PURCHASE_AUTO_SYNC_CUTOFF,
) {
  const linkedPurchases =
    linkedPurchasesForSupplierPayment(
      payment,
      purchases,
    );

  if (!linkedPurchases.length) {
    return false;
  }

  return linkedPurchases.every(
    (purchase) => {
      const purchaseDate =
        normalizedPurchaseDate(
          purchase.purchaseDate,
        );

      return Boolean(
        purchaseDate,
      )
      && purchaseDate >= cutoff;
    },
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

export function adbnSupplierPaymentCanPost(
  payment: AdbnTechSupplierPaymentMirror,
) {
  const status =
    payment.status
      .trim()
      .toLowerCase();

  const blockedStatus =
    [
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
    );

  return (
    payment.amount > 0
    && Boolean(
      normalizedPaymentDate(
        payment.paymentDate,
      ),
    )
    && Boolean(
      payment.bankAccountId,
    )
    && !payment.isReversal
    && !payment.reversalOfSupplierPaymentId
    && payment.externalSource
      .trim()
      .toLowerCase() !== 'bajetbn'
    && !blockedStatus
  );
}

export async function syncAdbnTechSupplierPaymentToBajetBn(
  input: {
    payment: AdbnTechSupplierPaymentMirror;
    spaceId: string;
    mappedAccountId: string;
  },
): Promise<PostTransactionOutcome> {
  const {
    payment,
    spaceId,
    mappedAccountId,
  } = input;

  if (
    !adbnSupplierPaymentCanPost(
      payment,
    )
  ) {
    throw new Error(
      'This ADBN TECH supplier payment is not eligible for Money Out posting.',
    );
  }

  if (!mappedAccountId) {
    throw new Error(
      'Map the ADBN TECH bank or cash account to a BajetBN Business account first.',
    );
  }

  const method =
    paymentMethodFromAdbn(
      payment.paymentMethod,
    );

  return postTransactionWithIdempotencyKey(
    {
      type: 'expense',
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
        'expense-supplier',
      counterparty:
        payment.supplierName
        || 'ADBN TECH supplier',
      note:
        [
          'ADBN TECH supplier payment '
            + (
              payment.paymentNo
              || payment.id
            ),
          payment.purchaseNo
            ? 'Purchase '
              + payment.purchaseNo
            : '',
          payment.reference
            ? 'Reference '
              + payment.reference
            : '',
          payment.note
            ? payment.note
            : '',
        ]
          .filter(Boolean)
          .join(' | '),
      labels: [
        'adbn_tech',
        'adbn_supplier_payment',
        adbnSupplierPaymentSyncLabel(
          payment.id,
        ),
      ],
      ...method,
    },
    adbnSupplierPaymentSyncKey(
      payment.id,
    ),
  );
}

export interface AdbnTechSupplierPaymentAutoSyncSummary {
  posted: number;
  alreadySynced: number;
  beforeCutoff: number;
  sourceSkipped: number;
  blocked: number;
  failed: number;
  firstError: string;
  transactions: FinancialTransaction[];
}

export async function autoSyncAdbnTechSupplierPaymentsToBajetBn(
  input: {
    spaceId: string;
    mappings: Record<string, string>;
    purchases: AdbnTechPurchaseMirror[];
    supplierPayments: AdbnTechSupplierPaymentMirror[];
    cutoff?: string;
  },
): Promise<AdbnTechSupplierPaymentAutoSyncSummary> {
  const cutoff =
    input.cutoff
    || ADBN_SUPPLIER_PURCHASE_AUTO_SYNC_CUTOFF;

  const currentTransactions =
    await listBusinessTransactionsForSpace(
      input.spaceId,
    );

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
  let sourceSkipped = 0;
  let blocked = 0;
  let failed = 0;
  let firstError = '';

  for (
    const payment
    of input.supplierPayments
  ) {
    const syncLabel =
      adbnSupplierPaymentSyncLabel(
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

    const linkedPurchases =
      linkedPurchasesForSupplierPayment(
        payment,
        input.purchases,
      );

    if (!linkedPurchases.length) {
      blocked += 1;
      continue;
    }

    if (
      linkedPurchases.some(
        (purchase) =>
          purchase.externalSource
            .trim()
            .toLowerCase()
          === 'bajetbn',
      )
    ) {
      sourceSkipped += 1;
      continue;
    }

    const purchaseDates =
      linkedPurchases.map(
        (purchase) =>
          normalizedPurchaseDate(
            purchase.purchaseDate,
          ),
      );

    if (
      purchaseDates.some(
        (date) => !date,
      )
    ) {
      blocked += 1;
      continue;
    }

    if (
      purchaseDates.some(
        (date) =>
          date < cutoff,
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
      || !adbnSupplierPaymentCanPost(
        payment,
      )
    ) {
      blocked += 1;
      continue;
    }

    try {
      const outcome =
        await syncAdbnTechSupplierPaymentToBajetBn(
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
          syncLabel.toLowerCase(),
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
            : 'ADBN TECH supplier payment auto-sync failed.';
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
    posted,
    alreadySynced,
    beforeCutoff,
    sourceSkipped,
    blocked,
    failed,
    firstError,
    transactions,
  };
}
