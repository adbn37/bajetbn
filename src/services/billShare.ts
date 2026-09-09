import type {
  Commitment,
  CommitmentPayment,
} from '../types/models';

import {
  formatMoney,
} from '../utils/money';

export interface PublicBillSharePayload {
  v: 1;
  kind: 'bill';
  name: string;
  amountMinor: number;
  currency: string;
  status:
    | 'completed'
    | 'overdue'
    | 'due'
    | 'upcoming';
  latestPaymentMinor?: number;
  paymentDate?: string;
  nextDueDate?: string;
  sharedAt: string;
}

function encodeBase64Url(
  value: string,
): string {
  const bytes =
    new TextEncoder()
      .encode(value);

  let binary = '';

  for (const byte of bytes) {
    binary +=
      String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(
  value: string,
): string {
  const normalized =
    value
      .replace(/-/g, '+')
      .replace(/_/g, '/');

  const padded =
    normalized
    + '='.repeat(
      (
        4
        - normalized.length % 4
      ) % 4,
    );

  const binary =
    atob(padded);

  const bytes =
    Uint8Array.from(
      binary,
      (character) =>
        character.charCodeAt(0),
    );

  return new TextDecoder()
    .decode(bytes);
}

function bruneiToday(): string {
  return new Date(
    Date.now()
    + 8 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
}

function billStatus(
  item: Commitment,
): PublicBillSharePayload['status'] {
  if (
    item.status === 'completed'
  ) {
    return 'completed';
  }

  const dueDate =
    item.nextDueDate
    || item.startDate;

  if (!dueDate) {
    return 'upcoming';
  }

  const today =
    bruneiToday();

  if (dueDate < today) {
    return 'overdue';
  }

  if (dueDate === today) {
    return 'due';
  }

  return 'upcoming';
}

export function createBillSharePayload(
  item: Commitment,
  payment?: CommitmentPayment,
): PublicBillSharePayload {
  const postedPayment =
    payment?.status === 'posted'
      ? payment
      : undefined;

  return {
    v: 1,
    kind: 'bill',

    name:
      item.name
        .trim()
        .slice(0, 120),

    amountMinor:
      item.amountMinor,

    currency:
      item.currency || 'BND',

    status:
      billStatus(item),

    latestPaymentMinor:
      postedPayment?.amountMinor,

    paymentDate:
      postedPayment?.paymentDate,

    nextDueDate:
      item.nextDueDate
      || undefined,

    sharedAt:
      new Date().toISOString(),
  };
}

export function encodeBillSharePayload(
  payload: PublicBillSharePayload,
): string {
  return encodeBase64Url(
    JSON.stringify(payload),
  );
}

export function decodeBillSharePayload(
  encoded: string,
): PublicBillSharePayload | null {
  try {
    const parsed =
      JSON.parse(
        decodeBase64Url(
          encoded,
        ),
      ) as Partial<PublicBillSharePayload>;

    if (
      parsed.v !== 1
      || parsed.kind !== 'bill'
      || typeof parsed.name
        !== 'string'
      || !parsed.name.trim()
      || typeof parsed.amountMinor
        !== 'number'
      || !Number.isFinite(
        parsed.amountMinor,
      )
      || parsed.amountMinor < 0
      || typeof parsed.currency
        !== 'string'
      || ![
        'completed',
        'overdue',
        'due',
        'upcoming',
      ].includes(
        parsed.status || '',
      )
      || typeof parsed.sharedAt
        !== 'string'
    ) {
      return null;
    }

    return {
      v: 1,
      kind: 'bill',

      name:
        parsed.name
          .trim()
          .slice(0, 120),

      amountMinor:
        Math.round(
          parsed.amountMinor,
        ),

      currency:
        parsed.currency
          .slice(0, 8),

      status:
        parsed.status as PublicBillSharePayload['status'],

      latestPaymentMinor:
        typeof parsed.latestPaymentMinor
          === 'number'
          && Number.isFinite(
            parsed.latestPaymentMinor,
          )
          ? Math.max(
              0,
              Math.round(
                parsed.latestPaymentMinor,
              ),
            )
          : undefined,

      paymentDate:
        typeof parsed.paymentDate
          === 'string'
          ? parsed.paymentDate
              .slice(0, 10)
          : undefined,

      nextDueDate:
        typeof parsed.nextDueDate
          === 'string'
          ? parsed.nextDueDate
              .slice(0, 10)
          : undefined,

      sharedAt:
        parsed.sharedAt,
    };
  } catch {
    return null;
  }
}

export function buildBillShareUrl(
  item: Commitment,
  payment?: CommitmentPayment,
): string {
  const encoded =
    encodeBillSharePayload(
      createBillSharePayload(
        item,
        payment,
      ),
    );

  /*
   * Fragment contents are not sent to
   * the web server.
   */
  return (
    `${window.location.origin}`
    + `/share/bill#${encoded}`
  );
}

function statusLabel(
  status:
    PublicBillSharePayload['status'],
): string {
  if (status === 'completed') {
    return 'Completed ✅';
  }

  if (status === 'overdue') {
    return 'Overdue';
  }

  if (status === 'due') {
    return 'Due today';
  }

  return 'Coming up';
}

export function buildBillWhatsAppMessage(
  item: Commitment,
  payment?: CommitmentPayment,
): string {
  const payload =
    createBillSharePayload(
      item,
      payment,
    );

  const shareUrl =
    buildBillShareUrl(
      item,
      payment,
    );

  const lines = [
    '🧾 *Bill shared from BajetBN*',
    '',
    `*${payload.name}*`,
    `Bill amount: *${formatMoney(
      payload.amountMinor,
      payload.currency,
    )}*`,
    `Status: ${statusLabel(
      payload.status,
    )}`,
  ];

  if (
    payload.latestPaymentMinor
    !== undefined
  ) {
    lines.push(
      `Latest payment: *${formatMoney(
        payload.latestPaymentMinor,
        payload.currency,
      )}* ✅`,
    );
  }

  if (payload.paymentDate) {
    lines.push(
      `Paid on: ${payload.paymentDate}`,
    );
  }

  if (payload.nextDueDate) {
    lines.push(
      `Next due: ${payload.nextDueDate}`,
    );
  }

  lines.push(
    '',
    'View bill summary:',
    shareUrl,
  );

  return lines.join('\n');
}

export function shareBillToWhatsApp(
  item: Commitment,
  payment?: CommitmentPayment,
): void {
  const message =
    buildBillWhatsAppMessage(
      item,
      payment,
    );

  /*
   * No phone number is supplied.
   * WhatsApp lets the sender choose
   * the contact or group.
   */
  const whatsappUrl =
    `https://wa.me/?text=${encodeURIComponent(
      message,
    )}`;

  const opened =
    window.open(
      whatsappUrl,
      '_blank',
      'noopener,noreferrer',
    );

  if (!opened) {
    window.location.assign(
      whatsappUrl,
    );
  }
}
