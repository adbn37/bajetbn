import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { listSpaces } from '../../repositories/spaceRepository';
import { listTransactionsForOwnerSpace } from '../../repositories/transactionRepository';
import type {
  FinancialTransaction,
  Space,
} from '../../types/models';
import { formatMoney } from '../../utils/money';

function currentBruneiMonth() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        year: 'numeric',
        month: '2-digit',
        timeZone: 'Asia/Brunei',
      },
    ).formatToParts(new Date());

  const year =
    parts.find((item) => item.type === 'year')?.value
    || '';

  const month =
    parts.find((item) => item.type === 'month')?.value
    || '';

  return `${year}-${month}`;
}

function displayDate(value: string) {
  const [year, month, day] =
    value.split('-').map(Number);

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

function activityTitle(
  transaction: FinancialTransaction,
) {
  return (
    transaction.counterparty?.trim()
    || transaction.note?.trim()
    || transaction.category?.trim()
    || (
      transaction.type === 'income'
        ? 'Money in'
        : transaction.type === 'expense'
          ? 'Money out'
          : transaction.type === 'transfer'
            ? 'Transfer'
            : 'Business activity'
    )
  );
}

function postedMillis(
  transaction: FinancialTransaction,
) {
  return (
    transaction.postedAt?.toMillis?.()
    || 0
  );
}

interface Props {
  userId: string;
  currency: string;
}

export function GlobalBusinessOverview({
  userId,
  currency,
}: Props) {
  const [
    spaces,
    setSpaces,
  ] = useState<Space[]>([]);

  const [
    transactions,
    setTransactions,
  ] = useState<FinancialTransaction[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const load =
    useCallback(async () => {
      if (!userId) {
        setSpaces([]);
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const nextSpaces =
          (
            await listSpaces(userId)
          ).filter(
            (space) =>
              space.type === 'sme'
              && space.ownerId === userId
              && !space.archivedAt,
          );

        const groups =
          await Promise.all(
            nextSpaces.map(
              (space) =>
                listTransactionsForOwnerSpace(
                  userId,
                  space.id,
                ),
            ),
          );

        const uniqueTransactions =
          new Map<
            string,
            FinancialTransaction
          >();

        groups
          .flat()
          .filter(
            (transaction) =>
              transaction.status === 'posted'
              && transaction.type !== 'reversal',
          )
          .forEach(
            (transaction) => {
              uniqueTransactions.set(
                transaction.id,
                transaction,
              );
            },
          );

        setSpaces(nextSpaces);

        setTransactions(
          Array.from(
            uniqueTransactions.values(),
          ).sort(
            (a, b) => {
              const byDate =
                b.transactionDate.localeCompare(
                  a.transactionDate,
                );

              if (byDate !== 0) {
                return byDate;
              }

              return (
                postedMillis(b)
                - postedMillis(a)
              );
            },
          ),
        );
      } catch {
        setSpaces([]);
        setTransactions([]);
        setError(
          'Business overview could not load. Check your connection and try again.',
        );
      } finally {
        setLoading(false);
      }
    }, [
      userId,
    ]);

  useEffect(
    () => {
      void load();
    },
    [load],
  );

  const month =
    currentBruneiMonth();

  const primaryCurrencyRows =
    useMemo(
      () =>
        transactions.filter(
          (transaction) =>
            transaction.currency === currency,
        ),
      [
        transactions,
        currency,
      ],
    );

  const allTimeIncome =
    primaryCurrencyRows
      .filter(
        (transaction) =>
          transaction.type === 'income',
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amountMinor,
        0,
      );

  const allTimeExpense =
    primaryCurrencyRows
      .filter(
        (transaction) =>
          transaction.type === 'expense',
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amountMinor,
        0,
      );

  const allBusinessTotal =
    allTimeIncome - allTimeExpense;

  const monthRows =
    primaryCurrencyRows.filter(
      (transaction) =>
        transaction.transactionDate.startsWith(
          month,
        ),
    );

  const monthIncome =
    monthRows
      .filter(
        (transaction) =>
          transaction.type === 'income',
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amountMinor,
        0,
      );

  const monthExpense =
    monthRows
      .filter(
        (transaction) =>
          transaction.type === 'expense',
      )
      .reduce(
        (sum, transaction) =>
          sum + transaction.amountMinor,
        0,
      );

  const spaceNameById =
    useMemo(
      () =>
        new Map(
          spaces.map(
            (space) => [
              space.id,
              space.name,
            ],
          ),
        ),
      [spaces],
    );

  const businessRows =
    useMemo(
      () =>
        spaces.map(
          (space) => {
            const allRows =
              transactions.filter(
                (transaction) =>
                  transaction.spaceId === space.id
                  && transaction.currency === space.currency,
              );

            const allIncome =
              allRows
                .filter(
                  (transaction) =>
                    transaction.type === 'income',
                )
                .reduce(
                  (sum, transaction) =>
                    sum + transaction.amountMinor,
                  0,
                );

            const allExpense =
              allRows
                .filter(
                  (transaction) =>
                    transaction.type === 'expense',
                )
                .reduce(
                  (sum, transaction) =>
                    sum + transaction.amountMinor,
                  0,
                );

            const currentRows =
              allRows.filter(
                (transaction) =>
                  transaction.transactionDate.startsWith(
                    month,
                  ),
              );

            const currentIncome =
              currentRows
                .filter(
                  (transaction) =>
                    transaction.type === 'income',
                )
                .reduce(
                  (sum, transaction) =>
                    sum + transaction.amountMinor,
                  0,
                );

            const currentExpense =
              currentRows
                .filter(
                  (transaction) =>
                    transaction.type === 'expense',
                )
                .reduce(
                  (sum, transaction) =>
                    sum + transaction.amountMinor,
                  0,
                );

            return {
              space,
              allTimeNet:
                allIncome - allExpense,
              currentIncome,
              currentExpense,
              currentNet:
                currentIncome - currentExpense,
            };
          },
        ),
      [
        spaces,
        transactions,
        month,
      ],
    );

  const otherCurrencyTotals =
    useMemo(
      () => {
        const groups =
          new Map<
            string,
            {
              income: number;
              expense: number;
            }
          >();

        transactions.forEach(
          (transaction) => {
            if (
              transaction.currency === currency
              || (
                transaction.type !== 'income'
                && transaction.type !== 'expense'
              )
            ) {
              return;
            }

            const current =
              groups.get(
                transaction.currency,
              )
              || {
                income: 0,
                expense: 0,
              };

            if (
              transaction.type === 'income'
            ) {
              current.income +=
                transaction.amountMinor;
            } else {
              current.expense +=
                transaction.amountMinor;
            }

            groups.set(
              transaction.currency,
              current,
            );
          },
        );

        return Array.from(
          groups.entries(),
        )
          .map(
            ([code, value]) => [
              code,
              value.income
              - value.expense,
            ] as const,
          )
          .sort(
            ([a], [b]) =>
              a.localeCompare(b),
          );
      },
      [
        transactions,
        currency,
      ],
    );

  const recent =
    transactions.slice(
      0,
      10,
    );

  if (loading) {
    return (
      <section
        className="global-business-home-v115"
        data-global-business-home
      >
        <div className="loading-panel">
          Loading Business overview…
        </div>
      </section>
    );
  }

  return (
    <section
      className="global-business-home-v115"
      data-global-business-home
    >
      {error && (
        <div className="notice">
          {error}
        </div>
      )}

      <section
        className="global-business-total-v115"
        aria-label="All Business transaction total"
      >
        <div className="global-business-total-head-v115">
          <div>
            <span>All-time Business net</span>
            <small>
              All-time money in minus money out across Businesses you own
            </small>
          </div>

          <Link to="/spaces">
            Businesses
          </Link>
        </div>

        <strong>
          {formatMoney(
            allBusinessTotal,
            currency,
          )}
        </strong>

        <div className="global-business-total-meta-v115">
          <span>
            {spaces.length}
            {' '}
            active Business
            {spaces.length === 1 ? '' : 'es'}
          </span>
          <span>
            Transfers excluded
          </span>
        </div>

        {otherCurrencyTotals.length > 0 && (
          <div className="global-business-other-currencies-v115">
            {otherCurrencyTotals.map(
              ([code, value]) => (
                <span key={code}>
                  {formatMoney(
                    value,
                    code,
                  )}
                </span>
              ),
            )}
          </div>
        )}
      </section>

      <section className="global-business-month-v115">
        <article>
          <span>Money in</span>
          <strong>
            {formatMoney(
              monthIncome,
              currency,
            )}
          </strong>
          <small>This month</small>
        </article>

        <article>
          <span>Money out</span>
          <strong>
            {formatMoney(
              monthExpense,
              currency,
            )}
          </strong>
          <small>This month</small>
        </article>

        <article>
          <span>Net</span>
          <strong>
            {formatMoney(
              monthIncome
              - monthExpense,
              currency,
            )}
          </strong>
          <small>This month</small>
        </article>
      </section>

      <section className="global-business-section-v115">
        <div className="bajetbn-home-section-title">
          <div>
            <h2>Your Businesses</h2>
            <small>
              Each card uses transactions from that Business Space only.
            </small>
          </div>
        </div>

        {businessRows.length > 0 ? (
          <div className="global-business-grid-v115">
            {businessRows.map(
              ({
                space,
                allTimeNet,
                currentIncome,
                currentExpense,
                currentNet,
              }) => (
                <article
                  key={space.id}
                  className="global-business-card-v115"
                >
                  <div className="global-business-card-head-v115">
                    <div>
                      <span>Business</span>
                      <h3>
                        {space.name}
                      </h3>
                    </div>

                    <Link
                      to={
                        '/business/'
                        + encodeURIComponent(
                          space.id,
                        )
                      }
                    >
                      Open
                    </Link>
                  </div>

                  <span className="global-business-card-total-label-v115">
                    All-time net
                  </span>

                  <strong className="global-business-card-total-v115">
                    {formatMoney(
                      allTimeNet,
                      space.currency,
                    )}
                  </strong>

                  <div className="global-business-card-stats-v115">
                    <div>
                      <span>In</span>
                      <strong>
                        {formatMoney(
                          currentIncome,
                          space.currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Out</span>
                      <strong>
                        {formatMoney(
                          currentExpense,
                          space.currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Net</span>
                      <strong>
                        {formatMoney(
                          currentNet,
                          space.currency,
                        )}
                      </strong>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="home-v110-empty">
            <span aria-hidden="true">
              B
            </span>

            <strong>
              No active Business Space yet
            </strong>

            <p>
              Create a Business Space to start the Business overview.
            </p>

            <Link
              className="button primary"
              to="/spaces"
            >
              Open Spaces
            </Link>
          </div>
        )}
      </section>

      <section className="global-business-section-v115">
        <div className="bajetbn-home-section-title">
          <div>
            <h2>Recent Business Activity</h2>
            <small>
              Across Businesses you own.
            </small>
          </div>
        </div>

        {recent.length > 0 ? (
          <div className="global-business-activity-v115">
            {recent.map(
              (transaction) => (
                <article
                  key={transaction.id}
                  className="global-business-activity-row-v115"
                >
                  <span
                    className={
                      'global-business-activity-icon-v115 '
                      + transaction.type
                    }
                    aria-hidden="true"
                  >
                    {transaction.type === 'income'
                      ? '+'
                      : transaction.type === 'expense'
                        ? '−'
                        : '↔'}
                  </span>

                  <div>
                    <strong>
                      {activityTitle(
                        transaction,
                      )}
                    </strong>

                    <small>
                      {[
                        spaceNameById.get(
                          transaction.spaceId,
                        )
                        || 'Business',
                        displayDate(
                          transaction.transactionDate,
                        ),
                      ].join(' · ')}
                    </small>
                  </div>

                  <b className={transaction.type}>
                    {transaction.type === 'income'
                      ? '+'
                      : transaction.type === 'expense'
                        ? '-'
                        : ''}
                    {formatMoney(
                      transaction.amountMinor,
                      transaction.currency
                      || currency,
                    )}
                  </b>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="home-v110-empty">
            <span aria-hidden="true">
              ◎
            </span>

            <strong>
              No Business activity yet
            </strong>

            <p>
              Business income and expenses will appear here.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
