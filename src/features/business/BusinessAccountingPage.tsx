import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  useAuth,
} from '../../contexts/AuthContext';

import {
  listAccountsForOwnerSpace,
} from '../../repositories/accountRepository';

import {
  listBusinessInvoices,
} from '../../repositories/businessInvoiceRepository';

import {
  listBusinessPayrollRuns,
} from '../../repositories/businessPayrollRepository';

import {
  getSpace,
} from '../../repositories/spaceRepository';

import {
  listTransactionsForOwnerSpace,
} from '../../repositories/transactionRepository';

import type {
  Account,
  BusinessInvoice,
  BusinessPayrollRun,
  FinancialTransaction,
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

function money(
  amountMinor: number,
  currency: string,
): string {
  return new Intl.NumberFormat(
    'en-BN',
    {
      style: 'currency',
      currency,
    },
  ).format(
    amountMinor / 100,
  );
}

function monthLabel(
  value: string,
): string {
  return new Date(
    `${value}-01T00:00:00`,
  ).toLocaleDateString(
    'en-BN',
    {
      month: 'short',
      year: 'numeric',
    },
  );
}

export function BusinessAccountingPage() {
  const {
    user,
  } = useAuth();

  const {
    spaceId = '',
  } = useParams();

  const [
    space,
    setSpace,
  ] = useState<Space | null>(
    null,
  );

  const [
    accounts,
    setAccounts,
  ] = useState<Account[]>(
    [],
  );

  const [
    transactions,
    setTransactions,
  ] = useState<FinancialTransaction[]>(
    [],
  );

  const [
    invoices,
    setInvoices,
  ] = useState<BusinessInvoice[]>(
    [],
  );

  const [
    payrollRuns,
    setPayrollRuns,
  ] = useState<BusinessPayrollRun[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  useEffect(
    () => {
      let active = true;

      void (
        async () => {
          if (
            !user
            || !spaceId
          ) {
            setLoading(false);
            return;
          }

          setLoading(true);
          setError('');

          try {
            const nextSpace =
              await getSpace(
                spaceId,
              );

            if (!active) {
              return;
            }

            setSpace(
              nextSpace,
            );

            if (
              !nextSpace
              || nextSpace.type
                !== 'sme'
              || nextSpace.ownerId
                !== user.uid
            ) {
              return;
            }

            const [
              nextAccounts,
              nextTransactions,
              nextInvoices,
              nextPayrollRuns,
            ] =
              await Promise.all([
                listAccountsForOwnerSpace(
                  user.uid,
                  spaceId,
                ),
                listTransactionsForOwnerSpace(
                  user.uid,
                  spaceId,
                ),
                listBusinessInvoices(
                  user.uid,
                  spaceId,
                ),
                listBusinessPayrollRuns(
                  user.uid,
                  spaceId,
                ),
              ]);

            if (!active) {
              return;
            }

            setAccounts(
              nextAccounts,
            );

            setTransactions(
              nextTransactions,
            );

            setInvoices(
              nextInvoices,
            );

            setPayrollRuns(
              nextPayrollRuns,
            );
          } catch (
            nextError
          ) {
            if (active) {
              setError(
                getErrorMessage(
                  nextError,
                ),
              );
            }
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        }
      )();

      return () => {
        active = false;
      };
    },
    [
      spaceId,
      user,
    ],
  );

  const posted =
    useMemo(
      () =>
        transactions.filter(
          (item) =>
            item.status === 'posted'
            && (
              item.type === 'income'
              || item.type === 'expense'
            ),
        ),
      [
        transactions,
      ],
    );

  const incomeMinor =
    useMemo(
      () =>
        posted.reduce(
          (
            total,
            item,
          ) =>
            item.type === 'income'
              ? total
                + item.amountMinor
              : total,
          0,
        ),
      [
        posted,
      ],
    );

  const expenseMinor =
    useMemo(
      () =>
        posted.reduce(
          (
            total,
            item,
          ) =>
            item.type === 'expense'
              ? total
                + item.amountMinor
              : total,
          0,
        ),
      [
        posted,
      ],
    );

  const receivableMinor =
    useMemo(
      () =>
        invoices.reduce(
          (
            total,
            invoice,
          ) =>
            (
              invoice.status === 'issued'
              || invoice.status
                === 'partially_paid'
            )
              ? total
                + invoice.balanceDueMinor
              : total,
          0,
        ),
      [
        invoices,
      ],
    );

  const accountBalanceMinor =
    useMemo(
      () =>
        accounts.reduce(
          (
            total,
            account,
          ) =>
            total
            + account.ledgerBalanceMinor,
          0,
        ),
      [
        accounts,
      ],
    );

  const payrollTransactionIds =
    useMemo(
      () =>
        new Set(
          payrollRuns
            .filter(
              (run) =>
                run.status === 'posted'
                && Boolean(
                  run.transactionId,
                ),
            )
            .map(
              (run) =>
                run.transactionId as string,
            ),
        ),
      [
        payrollRuns,
      ],
    );

  const monthly =
    useMemo(
      () => {
        const values =
          new Map<
            string,
            {
              income: number;
              expense: number;
            }
          >();

        for (
          const transaction
          of posted
        ) {
          const month =
            transaction
              .transactionDate
              .slice(
                0,
                7,
              );

          const current =
            values.get(month)
            || {
              income: 0,
              expense: 0,
            };

          if (
            transaction.type
              === 'income'
          ) {
            current.income +=
              transaction.amountMinor;
          } else {
            current.expense +=
              transaction.amountMinor;
          }

          values.set(
            month,
            current,
          );
        }

        return Array.from(
          values.entries(),
        )
          .sort(
            (
              [a],
              [b],
            ) =>
              b.localeCompare(a),
          )
          .slice(
            0,
            12,
          );
      },
      [
        posted,
      ],
    );

  function sourceLabel(
    transaction:
      FinancialTransaction,
  ): string {
    if (
      transaction
        .businessInvoicePaymentId
    ) {
      return 'Invoice payment';
    }

    if (
      payrollTransactionIds.has(
        transaction.id,
      )
    ) {
      return 'Payroll / wages';
    }

    return (
      transaction.category
      || 'Business transaction'
    );
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading business accounting...
        </div>
      </main>
    );
  }

  if (
    !space
    || space.type !== 'sme'
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business accounting"
          title="SME Space not found"
          description="Open an SME Space to view business accounting."
        />
      </main>
    );
  }

  if (
    space.ownerId
    !== user?.uid
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business accounting"
          title={space.name}
          description="Business accounting is currently restricted to the business owner."
          action={
            <Link
              className="button secondary"
              to={`/spaces/${space.id}`}
            >
              Back to Space
            </Link>
          }
        />
      </main>
    );
  }

  const currency =
    space.currency
    || 'BND';

  return (
    <main
      className="page"
      data-business-accounting
    >
      <PageHeader
        eyebrow="Business accounting"
        title={space.name}
        description="Income, expenses, account balances, receivables and monthly results derived from this SME Space."
        action={
          <Link
            className="button secondary"
            to={`/spaces/${space.id}/business`}
          >
            Business Admin
          </Link>
        }
      />

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="notice">
        Accounting uses the existing BajetBN
        transaction ledger as the source of truth.
        Transfers and reversed transactions are not
        counted as business income or expenses.
      </div>

      <section className="summary-grid">
        <article className="summary-card featured">
          <span>
            Income
          </span>

          <strong>
            {money(
              incomeMinor,
              currency,
            )}
          </strong>

          <small>
            Posted SME income
          </small>
        </article>

        <article className="summary-card">
          <span>
            Expenses
          </span>

          <strong>
            {money(
              expenseMinor,
              currency,
            )}
          </strong>

          <small>
            Posted SME expenses
          </small>
        </article>

        <article className="summary-card">
          <span>
            Net result
          </span>

          <strong>
            {money(
              incomeMinor
                - expenseMinor,
              currency,
            )}
          </strong>

          <small>
            Income less expenses
          </small>
        </article>

        <article className="summary-card">
          <span>
            Receivables
          </span>

          <strong>
            {money(
              receivableMinor,
              currency,
            )}
          </strong>

          <small>
            Open invoice balance
          </small>
        </article>
      </section>

      <section className="panel">
        <span className="eyebrow">
          Business accounts
        </span>

        <h2>
          {money(
            accountBalanceMinor,
            currency,
          )}
        </h2>

        <p>
          Combined ledger balance across
          {` ${accounts.length} `}
          active Business Account
          {accounts.length === 1
            ? ''
            : 's'}.
        </p>

        <Link
          className="button secondary"
          to={`/spaces/${space.id}?section=accounts`}
        >
          Open Business Accounts
        </Link>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Business financial report
            </span>

            <h2>
              Monthly result
            </h2>

            <p>
              Latest active months from the SME transaction ledger.
            </p>
          </div>
        </div>

        {monthly.length === 0 ? (
          <div className="mini-empty">
            <h3>
              No posted business activity yet
            </h3>

            <p>
              Business income and expenses will appear here as transactions are posted.
            </p>
          </div>
        ) : (
          <div className="business-contact-list">
            {monthly.map(
              ([
                month,
                values,
              ]) => (
                <article
                  className="business-contact-card"
                  key={month}
                >
                  <div>
                    <small>
                      {monthLabel(month)}
                    </small>

                    <h3>
                      {money(
                        values.income
                          - values.expense,
                        currency,
                      )}
                    </h3>

                    <p>
                      Income{' '}
                      {money(
                        values.income,
                        currency,
                      )}
                      {' · '}
                      Expenses{' '}
                      {money(
                        values.expense,
                        currency,
                      )}
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Accounting records
            </span>

            <h2>
              SME ledger
            </h2>

            <p>
              Posted income and expense records attached to this business.
            </p>
          </div>
        </div>

        {posted.length === 0 ? (
          <div className="mini-empty">
            <h3>
              No accounting records yet
            </h3>

            <p>
              POS sales, invoice payments, payroll and normal SME money activity will appear here.
            </p>
          </div>
        ) : (
          <div className="business-contact-list">
            {posted
              .slice(
                0,
                100,
              )
              .map(
                (
                  transaction,
                ) => (
                  <article
                    className="business-contact-card"
                    key={
                      transaction.id
                    }
                  >
                    <div>
                      <small>
                        {
                          transaction
                            .transactionDate
                        }
                        {' · '}
                        {
                          transaction
                            .type
                        }
                      </small>

                      <h3>
                        {sourceLabel(
                          transaction,
                        )}
                      </h3>

                      <p>
                        {
                          transaction
                            .counterparty
                          || 'No counterparty'
                        }
                      </p>
                    </div>

                    <strong>
                      {
                        transaction.type
                          === 'expense'
                          ? '-'
                          : '+'
                      }
                      {money(
                        transaction
                          .amountMinor,
                        transaction
                          .currency
                          || currency,
                      )}
                    </strong>
                  </article>
                ),
              )}
          </div>
        )}
      </section>
    </main>
  );
}