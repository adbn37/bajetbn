import {
  Link,
} from 'react-router-dom';

import {
  Brand,
} from '../../components/Brand';

import {
  decodeBillSharePayload,
} from '../../services/billShare';

import {
  formatMoney,
} from '../../utils/money';

function statusLabel(
  status:
    | 'completed'
    | 'overdue'
    | 'due'
    | 'upcoming',
) {
  if (status === 'completed') {
    return 'Completed ✓';
  }

  if (status === 'overdue') {
    return 'Overdue';
  }

  if (status === 'due') {
    return 'Due today';
  }

  return 'Coming up';
}

export function PublicBillSharePage() {
  const encoded =
    typeof window !== 'undefined'
      ? window.location.hash
          .replace(/^#/, '')
      : '';

  const payload =
    encoded
      ? decodeBillSharePayload(
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
              BajetBN shared bill
            </span>

            <h1>
              This bill link is not available
            </h1>

            <p>
              The link may be incomplete or no longer
              contain a valid bill summary.
            </p>

            <Link
              className="button primary"
              to="/register?source=shared-bill"
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

              <h1>{payload.name}</h1>
            </div>

            <span
              className={
                payload.status === 'completed'
                  ? 'public-bill-status paid'
                  : 'public-bill-status due'
              }
            >
              {statusLabel(
                payload.status,
              )}
            </span>
          </div>

          <div className="public-bill-share-amount">
            <span>
              Bill amount
            </span>

            <strong>
              {formatMoney(
                payload.amountMinor,
                payload.currency,
              )}
            </strong>
          </div>

          {payload.latestPaymentMinor
            !== undefined && (
            <div className="public-bill-share-row">
              <span>
                Latest payment
              </span>

              <strong>
                {formatMoney(
                  payload.latestPaymentMinor,
                  payload.currency,
                )}
              </strong>
            </div>
          )}

          {payload.paymentDate && (
            <div className="public-bill-share-row">
              <span>
                Payment date
              </span>

              <strong>
                {payload.paymentDate}
              </strong>
            </div>
          )}

          {payload.nextDueDate && (
            <div className="public-bill-share-row">
              <span>
                Next due
              </span>

              <strong>
                {payload.nextDueDate}
              </strong>
            </div>
          )}

          <div className="public-bill-share-note">
            This summary was intentionally shared by
            the sender. No bank-account details,
            private notes, internal IDs or account
            history are included.
          </div>

          <div className="public-bill-share-invite">
            <span className="eyebrow">
              Keep your own bills organised
            </span>

            <h2>
              Track it with BajetBN
            </h2>

            <p>
              Manage bills, payments and shared
              expenses in one place. You only need
              an account when you want to track your
              own activity.
            </p>

            <div className="button-row">
              <Link
                className="button primary"
                to="/register?source=shared-bill"
              >
                Create free account
              </Link>

              <Link
                className="button secondary"
                to="/login?source=shared-bill"
              >
                Sign in
              </Link>
            </div>
          </div>

          <small className="public-bill-share-disclaimer">
            A shared summary is not a bank receipt.
            Confirm payment with the sender when
            necessary.
          </small>
        </div>
      </section>
    </main>
  );
}
