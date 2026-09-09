import {
  Link,
} from 'react-router-dom';

import {
  Brand,
} from '../../components/Brand';

import {
  decodeTransactionSharePayload,
  transactionShareTypeLabel,
} from '../../services/transactionShare';

import {
  formatMoney,
} from '../../utils/money';

function publicDate(
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

export function PublicTransactionSharePage() {
  const encoded =
    typeof window !== 'undefined'
      ? window.location.hash
          .replace(/^#/, '')
      : '';

  const payload =
    encoded
      ? decodeTransactionSharePayload(
          encoded,
        )
      : null;

  if (!payload) {
    return (
      <main className="public-bill-share-page">
        <section className="public-bill-share-shell">
          <Brand />

          <div className="public-bill-share-card">
            <span className="eyebrow">
              BajetBN shared money activity
            </span>

            <h1>
              This transaction link is not available
            </h1>

            <p>
              The link may be incomplete or no longer
              contain a valid shared summary.
            </p>

            <Link
              className="button primary"
              to="/register?source=shared-transaction"
            >
              Try BajetBN
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="public-bill-share-page">
      <section className="public-bill-share-shell">
        <Brand />

        <div className="public-bill-share-card">
          <div className="public-bill-share-heading">
            <div>
              <span className="eyebrow">
                Shared from BajetBN
              </span>

              <h1>
                {payload.title}
              </h1>
            </div>

            <span className="public-bill-status paid">
              {transactionShareTypeLabel(
                payload.type,
              )}
            </span>
          </div>

          <div className="public-bill-share-amount">
            <span>
              Amount
            </span>

            <strong>
              {formatMoney(
                payload.amountMinor,
                payload.currency,
              )}
            </strong>
          </div>

          {payload.spaceName && (
            <div className="public-bill-share-row">
              <span>
                Space
              </span>

              <strong>
                {payload.spaceName}
              </strong>
            </div>
          )}

          {payload.category && (
            <div className="public-bill-share-row">
              <span>
                Category
              </span>

              <strong>
                {payload.category}
              </strong>
            </div>
          )}

          <div className="public-bill-share-row">
            <span>
              Date
            </span>

            <strong>
              {publicDate(
                payload.transactionDate,
              )}
            </strong>
          </div>

          <div className="public-bill-share-note">
            This summary was intentionally shared by
            the sender. No bank-account details,
            balances, private notes, receipts,
            internal IDs or account history are
            included in this public link.
          </div>

          <div className="public-bill-share-invite">
            <span className="eyebrow">
              Life, connected by money
            </span>

            <h2>
              Keep your money organised with BajetBN
            </h2>

            <p>
              Track personal, household and business
              money in one place. Create an account
              when you are ready to manage your own
              money activity.
            </p>

            <div className="button-row">
              <Link
                className="button primary"
                to="/register?source=shared-transaction"
              >
                Create free account
              </Link>

              <Link
                className="button secondary"
                to="/login?source=shared-transaction"
              >
                Sign in
              </Link>
            </div>
          </div>

          <small className="public-bill-share-disclaimer">
            A shared money-activity summary is not a
            bank receipt. Confirm payment with the
            sender when necessary.
          </small>
        </div>
      </section>
    </main>
  );
}
