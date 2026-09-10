import {
  httpsCallable,
} from 'firebase/functions';

import {
  requireFirebase,
} from './firebase';

import {
  formatMoney,
} from '../utils/money';

export interface TransactionShareSnapshot {
  /*
   * Private runtime reference.
   *
   * This ID is used only to ask the authenticated backend
   * for an opaque Smart Share token. It is never placed
   * inside the public share snapshot.
   */
  transactionId?: string;

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

  /*
   * Random opaque Smart Share token.
   *
   * This is NOT a transaction, Space, Account or user ID.
   * It never grants access by itself. The backend checks
   * the signed-in user's permissions before resolving it.
   */
  shareToken?: string;

  sharedAt: string;
}

export interface ResolvedTransactionShareTarget {
  destination:
    | 'transaction'
    | 'space';

  transactionId: string;
  spaceId: string;
  hasReceipt: boolean;
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

function validShareToken(
  value: string,
): boolean {
  return /^[a-zA-Z0-9_-]{32,128}$/.test(
    value,
  );
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

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

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

async function requestTransactionShareToken(
  transactionId?: string,
): Promise<string> {
  const id =
    clean(
      transactionId,
    );

  if (!id) {
    return '';
  }

  try {
    const {
      functions,
    } = requireFirebase();

    const call =
      httpsCallable(
        functions,
        'createTransactionShareToken',
      );

    const result =
      await call({
        transactionId:
          id,
      });

    const token =
      String(
        (
          result.data as {
            token?: string;
          }
        )?.token
        || '',
      );

    return validShareToken(
      token,
    )
      ? token
      : '';
  } catch {
    /*
     * Public sharing must continue working even when the
     * authenticated deep-link service is unavailable.
     */
    return '';
  }
}

export async function resolveTransactionShareTarget(
  shareToken: string,
): Promise<ResolvedTransactionShareTarget> {
  if (
    !validShareToken(
      shareToken,
    )
  ) {
    throw new Error(
      'This private BajetBN link is not valid.',
    );
  }

  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'resolveTransactionShareTarget',
    );

  const result =
    await call({
      token:
        shareToken,
    });

  const data =
    (
      result.data
      || {}
    ) as Partial<ResolvedTransactionShareTarget>;

  if (
    (
      data.destination !== 'transaction'
      && data.destination !== 'space'
    )
    || typeof data.transactionId !== 'string'
    || !data.transactionId
    || typeof data.spaceId !== 'string'
    || typeof data.hasReceipt !== 'boolean'
  ) {
    throw new Error(
      'BajetBN could not resolve the original transaction.',
    );
  }

  return {
    destination:
      data.destination,

    transactionId:
      data.transactionId,

    spaceId:
      data.spaceId,

    hasReceipt:
      data.hasReceipt,
  };
}

export function createTransactionSharePayload(
  snapshot: TransactionShareSnapshot,
  shareToken = '',
): PublicTransactionSharePayload {
  /*
   * Public snapshot intentionally excludes:
   *
   * Transaction ID
   * Space ID
   * Account IDs
   * Account names
   * User / owner IDs
   * Balances
   * Receipts
   * Private notes
   */
  const title =
    clean(snapshot.counterparty)
    || clean(snapshot.category)
    || typeLabels[snapshot.type];

  return {
    v: 1,
    kind: 'transaction',

    title:
      title.slice(
        0,
        120,
      ),

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
        .slice(
          0,
          8,
        )
      || 'BND',

    transactionDate:
      snapshot.transactionDate
        .slice(
          0,
          10,
        ),

    category:
      clean(snapshot.category)
        .slice(
          0,
          80,
        )
      || undefined,

    spaceName:
      clean(snapshot.spaceName)
        .slice(
          0,
          120,
        )
      || undefined,

    shareToken:
      validShareToken(
        shareToken,
      )
        ? shareToken
        : undefined,

    sharedAt:
      new Date()
        .toISOString(),
  };
}

export function encodeTransactionSharePayload(
  payload: PublicTransactionSharePayload,
): string {
  return encodeBase64Url(
    JSON.stringify(
      payload,
    ),
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
        parsed.type
        || '',
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

    const shareToken =
      typeof parsed.shareToken === 'string'
      && validShareToken(
        parsed.shareToken,
      )
        ? parsed.shareToken
        : undefined;

    return {
      v: 1,
      kind: 'transaction',

      title:
        parsed.title
          .trim()
          .slice(
            0,
            120,
          ),

      type:
        (parsed.type as PublicTransactionSharePayload['type']),

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
          .slice(
            0,
            8,
          ),

      transactionDate:
        parsed.transactionDate
          .slice(
            0,
            10,
          ),

      category:
        typeof parsed.category === 'string'
        && parsed.category.trim()
          ? parsed.category
              .trim()
              .slice(
                0,
                80,
              )
          : undefined,

      spaceName:
        typeof parsed.spaceName === 'string'
        && parsed.spaceName.trim()
          ? parsed.spaceName
              .trim()
              .slice(
                0,
                120,
              )
          : undefined,

      shareToken,

      sharedAt:
        parsed.sharedAt,
    };
  } catch {
    return null;
  }
}

export async function buildTransactionShareUrl(
  snapshot: TransactionShareSnapshot,
): Promise<string> {
  const shareToken =
    await requestTransactionShareToken(
      snapshot.transactionId,
    );

  const encoded =
    encodeTransactionSharePayload(
      createTransactionSharePayload(
        snapshot,
        shareToken,
      ),
    );

  /*
   * The snapshot/token are stored in the URL fragment.
   * The fragment is not part of the HTTP request sent
   * to the web server.
   */
  return (
    window.location.origin
    + '/share/transaction#'
    + encoded
  );
}

export async function buildTransactionShareMessage(
  snapshot: TransactionShareSnapshot,
): Promise<string> {
  const title =
    clean(snapshot.counterparty)
    || clean(snapshot.note)
    || clean(snapshot.category)
    || typeLabels[snapshot.type];

  const shareUrl =
    await buildTransactionShareUrl(
      snapshot,
    );

  const lines: string[] = [
    'BajetBN Money Activity',
    '',
    title,
  ];

  if (
    clean(
      snapshot.spaceName,
    )
  ) {
    lines.push(
      'Space: '
      + clean(
        snapshot.spaceName,
      ),
    );
  }

  lines.push(
    typeLabels[snapshot.type]
    + ': '
    + formatMoney(
      snapshot.amountMinor,
      snapshot.currency
      || 'BND',
    ),
  );

  if (
    clean(
      snapshot.category,
    )
  ) {
    lines.push(
      'Category: '
      + clean(
        snapshot.category,
      ),
    );
  }

  if (
    snapshot.type === 'transfer'
  ) {
    if (
      clean(
        snapshot.sourceAccountName,
      )
    ) {
      lines.push(
        'From: '
        + clean(
          snapshot.sourceAccountName,
        ),
      );
    }

    if (
      clean(
        snapshot.destinationAccountName,
      )
    ) {
      lines.push(
        'To: '
        + clean(
          snapshot.destinationAccountName,
        ),
      );
    }
  } else if (
    clean(
      snapshot.sourceAccountName,
    )
  ) {
    lines.push(
      'Account: '
      + clean(
        snapshot.sourceAccountName,
      ),
    );
  }

  lines.push(
    'Date: '
    + formatDate(
      snapshot.transactionDate,
    ),
  );

  const note =
    clean(
      snapshot.note,
    );

  if (
    note
    && note !== title
  ) {
    lines.push(
      'Note: '
      + note,
    );
  }

  lines.push(
    '',
    'View details:',
    shareUrl,
    '',
    'Recorded in BajetBN',
  );

  return lines.join(
    '\n',
  );
}

export async function shareTransactionToWhatsApp(
  snapshot: TransactionShareSnapshot,
): Promise<void> {
  /*
   * Open the new tab immediately while the browser still
   * considers this a direct user action. We then resolve
   * the Smart Share token and navigate that tab to WhatsApp.
   */
  const popup =
    window.open(
      '',
      '_blank',
    );

  try {
    const message =
      await buildTransactionShareMessage(
        snapshot,
      );

    const target =
      'https://wa.me/?text='
      + encodeURIComponent(
        message,
      );

    if (popup) {
      popup.opener =
        null;

      popup.location.href =
        target;

      return;
    }

    window.location.assign(
      target,
    );
  } catch (error) {
    if (popup) {
      popup.close();
    }

    throw error;
  }
}
