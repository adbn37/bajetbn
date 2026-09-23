import type {
  PaymentMethodCode,
} from '../types/models';
import {
  postTransactionWithIdempotencyKey,
  type PostTransactionOutcome,
} from './transactionRepository';
import type {
  AdbnTechSupplierPaymentMirror,
} from './adbnTechIntegrationRepository';

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
