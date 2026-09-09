import { formatMoney } from '../utils/money';

export interface TransactionShareSnapshot {
  type:
    | 'income'
    | 'expense'
    | 'transfer'
    | 'reversal';
  amountMinor: number;
  currency: string;
  transactionDate: string;
  category?: string;
  counterparty?: string;
  note?: string;
  spaceName?: string;
  sourceAccountName?: string;
  destinationAccountName?: string;
}

export interface PublicTransactionSharePayload {
  v: 1;
  kind: 'transaction';
  title: string;
  type:
    | 'income'
    | 'expense'
    | 'transfer'
    | 'reversal';
  amountMinor: number;
  currency: string;
  transactionDate: string;
  category?: string;
  spaceName?: string;
  sharedAt: string;
}

const typeLabels = {
  income: 'Money in',
  expense: 'Money out',
  transfer: 'Transfer',
  reversal: 'Undo',
} as const;

function clean(
  value?: string,
): string {
  return value?.trim() || '';
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

function formatDate(
  value: string,
): string {
  const parts =
    value.split('-');

  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-BN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Brunei',
      },
    ).format(
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
          4,
        ),
      ),
    );
  } catch {
    return value;
  }
}

export function transactionShareTypeLabel(
  type: TransactionShareSnapshot['type'],
): string {
  return typeLabels[type];
}

export function createTransactionSharePayload(
  snapshot: TransactionShareSnapshot,
): PublicTransactionSharePayload {
  /*
   * Public-link snapshot intentionally excludes:
   * Account names
   * Notes
   * Balances
   * Receipts
   * Internal IDs
   */
  const title =
    clean(snapshot.counterparty)
    || clean(snapshot.category)
    || typeLabels[snapshot.type];

  return {
    v: 1,
    kind: 'transaction',

    title:
      title.slice(0, 120),

    type:
      snapshot.type,

    amountMinor:
      Math.max(
        0,
        Math.round(
          snapshot.amountMinor,
        ),
      ),

    currency:
      clean(snapshot.currency)
        .slice(0, 8)
      || 'BND',

    transactionDate:
      snapshot.transactionDate
        .slice(0, 10),

    category:
      clean(snapshot.category)
        .slice(0, 80)
      || undefined,

    spaceName:
      clean(snapshot.spaceName)
        .slice(0, 120)
      || undefined,

    sharedAt:
      new Date().toISOString(),
  };
}

export function encodeTransactionSharePayload(
  payload: PublicTransactionSharePayload,
): string {
  return encodeBase64Url(
    JSON.stringify(payload),
  );
}

export function decodeTransactionSharePayload(
  encoded: string,
): PublicTransactionSharePayload | null {
  try {
    const parsed =
      JSON.parse(
        decodeBase64Url(
          encoded,
        ),
      ) as Partial<PublicTransactionSharePayload>;

    if (
      parsed.v !== 1
      || parsed.kind !== 'transaction'
      || typeof parsed.title !== 'string'
      || !parsed.title.trim()
      || ![
        'income',
        'expense',
        'transfer',
        'reversal',
      ].includes(
        parsed.type || '',
      )
      || typeof parsed.amountMinor !== 'number'
      || !Number.isFinite(
        parsed.amountMinor,
      )
      || parsed.amountMinor < 0
      || typeof parsed.currency !== 'string'
      || typeof parsed.transactionDate !== 'string'
      || typeof parsed.sharedAt !== 'string'
    ) {
      return null;
    }

    return {
      v: 1,
      kind: 'transaction',

      title:
        parsed.title
          .trim()
          .slice(0, 120),

      type:
        parsed.type as PublicTransactionSharePayload['type'],

      amountMinor:
        Math.max(
          0,
          Math.round(
            parsed.amountMinor,
          ),
        ),

      currency:
        parsed.currency
          .trim()
          .slice(0, 8),

      transactionDate:
        parsed.transactionDate
          .slice(0, 10),

      category:
        typeof parsed.category === 'string'
          && parsed.category.trim()
          ? parsed.category
              .trim()
              .slice(0, 80)
          : undefined,

      spaceName:
        typeof parsed.spaceName === 'string'
          && parsed.spaceName.trim()
          ? parsed.spaceName
              .trim()
              .slice(0, 120)
          : undefined,

      sharedAt:
        parsed.sharedAt,
    };
  } catch {
    return null;
  }
}

export function buildTransactionShareUrl(
  snapshot: TransactionShareSnapshot,
): string {
  const encoded =
    encodeTransactionSharePayload(
      createTransactionSharePayload(
        snapshot,
      ),
    );

  return (
    window.location.origin
    + '/share/transaction#'
    + encoded
  );
}

export function buildTransactionShareMessage(
  snapshot: TransactionShareSnapshot,
): string {
  const title =
    clean(snapshot.counterparty)
    || clean(snapshot.note)
    || clean(snapshot.category)
    || typeLabels[snapshot.type];

  const lines: string[] = [
    'BajetBN Money Activity',
    '',
    title,
  ];

  if (clean(snapshot.spaceName)) {
    lines.push(
      'Space: '
        + clean(snapshot.spaceName),
    );
  }

  lines.push(
    typeLabels[snapshot.type]
      + ': '
      + formatMoney(
        snapshot.amountMinor,
        snapshot.currency || 'BND',
      ),
  );

  if (clean(snapshot.category)) {
    lines.push(
      'Category: '
        + clean(snapshot.category),
    );
  }

  if (snapshot.type === 'transfer') {
    if (clean(snapshot.sourceAccountName)) {
      lines.push(
        'From: '
          + clean(snapshot.sourceAccountName),
      );
    }

    if (clean(snapshot.destinationAccountName)) {
      lines.push(
        'To: '
          + clean(snapshot.destinationAccountName),
      );
    }
  } else if (
    clean(snapshot.sourceAccountName)
  ) {
    lines.push(
      'Account: '
        + clean(snapshot.sourceAccountName),
    );
  }

  lines.push(
    'Date: '
      + formatDate(
        snapshot.transactionDate,
      ),
  );

  const note =
    clean(snapshot.note);

  if (
    note
    && note !== title
  ) {
    lines.push(
      'Note: ' + note,
    );
  }

  lines.push(
    '',
    'View details:',
    buildTransactionShareUrl(
      snapshot,
    ),
    '',
    'Recorded in BajetBN',
  );

  return lines.join('\n');
}

export function shareTransactionToWhatsApp(
  snapshot: TransactionShareSnapshot,
) {
  const target =
    'https://wa.me/?text='
      + encodeURIComponent(
        buildTransactionShareMessage(
          snapshot,
        ),
      );

  const popup =
    window.open(
      target,
      '_blank',
    );

  if (popup) {
    popup.opener = null;
    return;
  }

  window.location.assign(
    target,
  );
}
