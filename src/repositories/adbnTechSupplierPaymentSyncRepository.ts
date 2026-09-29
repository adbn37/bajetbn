import type {
  FinancialTransaction,
  PaymentMethodCode,
} from '../types/models';
import {
  listBusinessTransactionsForSpace,
  postTransactionWithIdempotencyKey,
  reverseTransactionWithIdempotencyKey,
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
    'adbn_suppay_'
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
          payment.purchaseGroupId,
        )
        && purchase.purchaseGroupId
          === payment.purchaseGroupId
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

export function adbnSupplierPaymentIsReversal(
  payment: AdbnTechSupplierPaymentMirror,
) {
  return (
    payment.isReversal
    || Boolean(
      payment.reversalOfSupplierPaymentId
        .trim(),
    )
    || payment.amount < 0
  );
}

export function adbnSupplierPaymentIsLegacyUnlinkedBeforeCutoff(
  payment: AdbnTechSupplierPaymentMirror,
  purchases: AdbnTechPurchaseMirror[],
  cutoff =
    ADBN_SUPPLIER_PURCHASE_AUTO_SYNC_CUTOFF,
) {
  if (
    adbnSupplierPaymentIsReversal(
      payment,
    )
  ) {
    return false;
  }

  const linkedPurchases =
    linkedPurchasesForSupplierPayment(
      payment,
      purchases,
    );

  if (linkedPurchases.length) {
    return false;
  }

  const paymentDate =
    normalizedPaymentDate(
      payment.paymentDate,
    );

  /*
   * This is diagnostic classification only. Automatic eligibility
   * still depends on the linked purchase date. When an orphaned
   * supplier payment itself predates the automation boundary, keep
   * it manual instead of presenting it as a current integration
   * failure.
   */
  return Boolean(
    paymentDate,
  )
  && paymentDate < cutoff;
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
  reversed: number;
  alreadySynced: number;
  alreadyReversed: number;
  reversalNotSynced: number;
  manualReversals: number;
  manualReversalDetails: string[];
  beforeCutoff: number;
  sourceSkipped: number;
  blocked: number;
  blockedDetails: string[];
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

  const paymentById =
    new Map(
      input.supplierPayments.map(
        (payment) => [
          payment.id,
          payment,
        ],
      ),
    );

  let posted = 0;
  let reversed = 0;
  let alreadySynced = 0;
  let alreadyReversed = 0;
  let reversalNotSynced = 0;
  let manualReversals = 0;
  const manualReversalDetails: string[] = [];
  let beforeCutoff = 0;
  let sourceSkipped = 0;
  let blocked = 0;
  const blockedDetails: string[] = [];
  let failed = 0;
  let firstError = '';

  const recordBlocked = (
    payment: AdbnTechSupplierPaymentMirror,
    reason: string,
  ) => {
    blocked += 1;

    if (blockedDetails.length < 3) {
      blockedDetails.push(
        (payment.paymentNo || payment.id)
        + ': '
        + reason,
      );
    }
  };

  const recordManualReversal = (
    payment: AdbnTechSupplierPaymentMirror,
  ) => {
    manualReversals += 1;

    if (
      manualReversalDetails.length < 3
    ) {
      manualReversalDetails.push(
        payment.paymentNo
        || payment.id,
      );
    }
  };

  /*
   * Pass 1: post positive ADBN-originated supplier payments.
   * Reversal rows are handled only after the refreshed ledger is
   * available, so an original and its reversal can arrive together.
   */
  for (
    const payment
    of input.supplierPayments
  ) {
    if (
      adbnSupplierPaymentIsReversal(
        payment,
      )
    ) {
      continue;
    }

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
      if (
        adbnSupplierPaymentIsLegacyUnlinkedBeforeCutoff(
          payment,
          input.purchases,
          cutoff,
        )
      ) {
        beforeCutoff += 1;
        continue;
      }

      recordBlocked(
        payment,
        'no linked purchase (ID, group ID or purchase number)',
      );
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
      recordBlocked(
        payment,
        'linked purchase has no valid purchase date',
      );
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

    if (!mappedAccountId) {
      recordBlocked(
        payment,
        payment.bankAccountId
          ? 'ADBN account is not mapped to a BajetBN Business account'
          : 'supplier payment has no ADBN bank/cash account',
      );
      continue;
    }

    if (
      !adbnSupplierPaymentCanPost(
        payment,
      )
    ) {
      recordBlocked(
        payment,
        'supplier payment is not eligible for Money Out posting',
      );
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

  let transactions =
    posted > 0
      ? await listBusinessTransactionsForSpace(
          input.spaceId,
        )
      : currentTransactions;

  const reversedOriginalTransactionIds =
    new Set(
      transactions
        .filter(
          (item) =>
            item.status === 'reversed'
            || Boolean(
              item.reversedBy,
            ),
        )
        .map(
          (item) =>
            item.id,
        ),
    );

  /*
   * Pass 2: reverse the exact BajetBN Money Out that belongs to
   * the original ADBN supplier payment. We require an explicit
   * reversalOfSupplierPaymentId; credits without a target are not
   * allowed to guess which Money Out should be restored.
   */
  for (
    const reversal
    of input.supplierPayments
  ) {
    if (
      !adbnSupplierPaymentIsReversal(
        reversal,
      )
    ) {
      continue;
    }

    const originalPaymentId =
      reversal
        .reversalOfSupplierPaymentId
        .trim();

    if (!originalPaymentId) {
      recordManualReversal(
        reversal,
      );
      continue;
    }

    const originalPayment =
      paymentById.get(
        originalPaymentId,
      );

    if (!originalPayment) {
      recordBlocked(
        reversal,
        'original supplier payment is not available in the ADBN snapshot',
      );
      continue;
    }

    if (
      originalPayment.externalSource
        .trim()
        .toLowerCase()
      === 'bajetbn'
    ) {
      sourceSkipped += 1;
      continue;
    }

    const linkedPurchases =
      linkedPurchasesForSupplierPayment(
        originalPayment,
        input.purchases,
      );

    if (!linkedPurchases.length) {
      recordBlocked(
        reversal,
        'original supplier payment has no linked purchase',
      );
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
      recordBlocked(
        reversal,
        'original linked purchase has no valid purchase date',
      );
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

    const originalSyncLabel =
      adbnSupplierPaymentSyncLabel(
        originalPayment.id,
      ).toLowerCase();

    const originalTransaction =
      transactions.find(
        (item) =>
          (item.labels || [])
            .some(
              (label) =>
                label
                  .toLowerCase()
                === originalSyncLabel,
            ),
      );

    if (!originalTransaction) {
      reversalNotSynced += 1;
      continue;
    }

    if (
      reversedOriginalTransactionIds.has(
        originalTransaction.id,
      )
    ) {
      alreadyReversed += 1;
      continue;
    }

    if (
      originalTransaction.type
        !== 'expense'
      || originalTransaction.status
        !== 'posted'
    ) {
      recordBlocked(
        reversal,
        'original BajetBN supplier Money Out is not active',
      );
      continue;
    }

    const reversalDate =
      normalizedPaymentDate(
        reversal.paymentDate,
      );

    if (!reversalDate) {
      recordBlocked(
        reversal,
        'reversal has no valid payment date',
      );
      continue;
    }

    const reversalKey =
      'adbn-supplier-reversal-'
      + externalSupplierPaymentToken(
        reversal.id,
      );

    const reason =
      'ADBN TECH supplier payment reversal '
      + (
        reversal.paymentNo
        || reversal.id
      )
      + ' for '
      + (
        originalPayment.paymentNo
        || originalPayment.id
      );

    try {
      await reverseTransactionWithIdempotencyKey(
        originalTransaction.id,
        reversalDate,
        reason,
        reversalKey,
      );

      reversed += 1;
      reversedOriginalTransactionIds.add(
        originalTransaction.id,
      );
    } catch (error) {
      failed += 1;

      if (!firstError) {
        firstError =
          error instanceof Error
            ? error.message
            : 'ADBN TECH supplier payment reversal sync failed.';
      }
    }
  }

  if (reversed > 0) {
    transactions =
      await listBusinessTransactionsForSpace(
        input.spaceId,
      );
  }

  return {
    posted,
    reversed,
    alreadySynced,
    alreadyReversed,
    reversalNotSynced,
    manualReversals,
    manualReversalDetails,
    beforeCutoff,
    sourceSkipped,
    blocked,
    blockedDetails,
    failed,
    firstError,
    transactions,
  };
}
