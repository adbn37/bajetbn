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
