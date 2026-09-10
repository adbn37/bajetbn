import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  Brand,
} from '../../components/Brand';

import {
  useAuth,
} from '../../contexts/AuthContext';

import {
  decodeTransactionSharePayload,
  resolveTransactionShareTarget,
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

  if (
    parts.length !== 3
  ) {
    return value;
  }

  const year =
    Number(
      parts[0],
    );

  const month =
    Number(
      parts[1],
    );

  const day =
    Number(
      parts[2],
    );

  if (
    !year
    || !month
    || !day
  ) {
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
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    resolving,
    setResolving,
  ] = useState(
    false,
  );

  const [
    accessMessage,
    setAccessMessage,
  ] = useState(
    '',
  );

  const encoded =
    useMemo(
      () =>
        typeof window !== 'undefined'
          ? window.location.hash
              .replace(
                /^#/,
                '',
              )
          : '',
      [],
    );

  const payload =
    useMemo(
      () =>
        encoded
          ? decodeTransactionSharePayload(
              encoded,
            )
          : null,
      [
        encoded,
      ],
    );

  const returnPath =
    typeof window !== 'undefined'
      ? (
          window.location.pathname
          + window.location.hash
        )
      : '/';

  useEffect(
    () => {
      if (
        authLoading
        || !user
        || !payload?.shareToken
      ) {
        return undefined;
      }

      let cancelled =
        false;

      setResolving(
        true,
      );

      setAccessMessage(
        '',
      );

      void resolveTransactionShareTarget(
        payload.shareToken,
      )
        .then(
          (
            target,
          ) => {
            if (
              cancelled
            ) {
              return;
            }

            if (
              target.destination
              === 'transaction'
            ) {
              const destination =
                '/transactions?transactionId='
                + encodeURIComponent(
                    target.transactionId,
                  )
                + (
                  target.hasReceipt
                    ? '&receipt=1'
                    : ''
                );

              navigate(
                destination,
                {
                  replace: true,
                },
              );

              return;
            }

            navigate(
              '/spaces/'
              + encodeURIComponent(
                  target.spaceId,
                )
              + '?section=money',
              {
                replace: true,
              },
            );
          },
        )
        .catch(
          () => {
            if (
              cancelled
            ) {
              return;
            }

            setAccessMessage(
              'You are signed in, but this BajetBN account does not have access to the original transaction or Space. You can still view the shared summary below.',
            );
          },
        )
        .finally(
          () => {
            if (
              !cancelled
            ) {
              setResolving(
                false,
              );
            }
          },
        );

      return () => {
        cancelled =
          true;
      };
    },
    [
      authLoading,
      navigate,
      payload?.shareToken,
      user?.uid,
    ],
  );

  if (
    !payload
  ) {
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
          {resolving && (
            <div className="notice success">
              Signed in. Opening your original
              BajetBN record…
            </div>
          )}

          {accessMessage && (
            <div className="notice warning">
              {accessMessage}
            </div>
          )}

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
            {user ? (
              <>
                <span className="eyebrow">
                  Signed in to BajetBN
                </span>

                <h2>
                  Open your BajetBN
                </h2>

                <p>
                  When this BajetBN account has access
                  to the original record, BajetBN opens
                  the transaction, receipt or Space
                  automatically.
                </p>

                <div className="button-row">
                  <Link
                    className="button primary"
                    to="/"
                  >
                    Open BajetBN
                  </Link>
                </div>
              </>
            ) : (
              <>
                <span className="eyebrow">
                  Life, connected by money
                </span>

                <h2>
                  Keep your money organised with BajetBN
                </h2>

                <p>
                  Track personal, household and business
                  money in one place.
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
                    to="/login"
                    state={{
                      from:
                        returnPath,
                    }}
                  >
                    Sign in
                  </Link>
                </div>
              </>
            )}
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
