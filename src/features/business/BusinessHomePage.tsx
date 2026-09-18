import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useParams,
} from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  listAccountsForSpace,
} from '../../repositories/accountRepository';
import {
  getMySmePosAccess,
} from '../../repositories/smePosRepository';
import {
  getSpace,
} from '../../repositories/spaceRepository';
import {
  listBusinessTransactionsForSpace,
} from '../../repositories/transactionRepository';
import type {
  Account,
  FinancialTransaction,
  Space,
  SmePosRole,
} from '../../types/models';
import { formatMoney } from '../../utils/money';
import { AccountAvatar } from '../accounts/AccountAvatar';
import { SpaceAvatar } from '../spaces/SpaceAvatar';

function monthPrefix() {
  return new Date()
    .toISOString()
    .slice(0, 7);
}

function roleLabel(
  role: SmePosRole | null,
  isOwner: boolean,
) {
  if (isOwner) return 'Owner';

  switch (role) {
    case 'manager':
      return 'Manager';
    case 'cashier':
      return 'Cashier';
    case 'stock_staff':
      return 'Stock Staff';
    case 'seller':
      return 'Seller';
    case 'viewer':
      return 'View Only';
    default:
      return 'Member';
  }
}

function transactionTitle(
  item: FinancialTransaction,
) {
  return (
    item.counterparty?.trim()
    || item.note?.trim()
    || item.category?.trim()
    || (
      item.type === 'income'
        ? 'Money in'
        : item.type === 'expense'
          ? 'Money out'
          : 'Transfer'
    )
  );
}

function transactionAmount(
  item: FinancialTransaction,
) {
  const amount =
    formatMoney(
      item.amountMinor,
      item.currency,
    );

  if (item.type === 'income') {
    return '+' + amount;
  }

  if (item.type === 'expense') {
    return '-' + amount;
  }

  return amount;
}

export function BusinessHomePage() {
  const { spaceId = '' } = useParams();
  const { user } = useAuth();

  const [space, setSpace] =
    useState<Space | null>(null);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [transactions, setTransactions] =
    useState<FinancialTransaction[]>([]);

  const [posRole, setPosRole] =
    useState<SmePosRole | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load = useCallback(async () => {
    if (!user || !spaceId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextSpace =
        await getSpace(spaceId);

      if (
        !nextSpace
        || nextSpace.type !== 'sme'
      ) {
        setSpace(null);
        setAccounts([]);
        setTransactions([]);
        setPosRole(null);
        return;
      }

      setSpace(nextSpace);

      const isOwner =
        nextSpace.ownerId === user.uid;

      const [
        nextAccounts,
        nextTransactions,
        nextAccess,
      ] = await Promise.all([
        listAccountsForSpace(spaceId),
        listBusinessTransactionsForSpace(
          spaceId,
        ),
        isOwner
          ? Promise.resolve(null)
          : getMySmePosAccess(
              spaceId,
              user.uid,
            ).catch(() => null),
      ]);

      setAccounts(
        nextAccounts.filter(
          (item) =>
            !item.archivedAt
            && !item.closedAt,
        ),
      );

      setTransactions(
        nextTransactions.filter(
          (item) =>
            item.status === 'posted'
            && item.type !== 'reversal',
        ),
      );

      setPosRole(
        nextAccess?.status === 'active'
          ? nextAccess.role
          : null,
      );
    } catch {
      setError(
        'Business Home could not load. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentMonth =
    monthPrefix();

  const monthlyRows =
    useMemo(
      () =>
        transactions.filter(
          (item) =>
            item.transactionDate
              .startsWith(currentMonth),
        ),
      [currentMonth, transactions],
    );

  const moneyIn =
    useMemo(
      () =>
        monthlyRows
          .filter(
            (item) =>
              item.type === 'income',
          )
          .reduce(
            (sum, item) =>
              sum + item.amountMinor,
            0,
          ),
      [monthlyRows],
    );

  const moneyOut =
    useMemo(
      () =>
        monthlyRows
          .filter(
            (item) =>
              item.type === 'expense',
          )
          .reduce(
            (sum, item) =>
              sum + item.amountMinor,
            0,
          ),
      [monthlyRows],
    );

  const visibleBalanceAccounts =
    useMemo(
      () =>
        accounts.filter(
          (item) =>
            item.sharedCanViewBalance
              !== false,
        ),
      [accounts],
    );

  const totalBusinessFunds =
    useMemo(
      () =>
        visibleBalanceAccounts.reduce(
          (sum, item) =>
            sum
            + item.ledgerBalanceMinor,
          0,
        ),
      [visibleBalanceAccounts],
    );

  const recentRows =
    useMemo(
      () =>
        transactions
          .slice(0, 5),
      [transactions],
    );

  if (loading) {
    return (
      <main className="page business-home-v115">
        <div className="loading-panel">
          Loading Business Home…
        </div>
      </main>
    );
  }

  if (!space) {
    return (
      <main className="page business-home-v115">
        <section className="panel">
          <h1>Business not found</h1>
          <p className="muted">
            This Business Space is unavailable
            or you do not have access.
          </p>
          <Link
            className="button primary"
            to="/spaces"
          >
            Back to Spaces
          </Link>
        </section>
      </main>
    );
  }

  const isOwner =
    space.ownerId === user?.uid;

  const currentRole =
    roleLabel(posRole, isOwner);

  return (
    <main
      className="page business-home-v115"
      data-business-home-v115
    >
      <header className="business-home-v115-header">
        <div className="business-home-v115-title">
          <SpaceAvatar
            space={space}
            size="large"
          />

          <div>
            <span className="eyebrow">
              Business Home
            </span>

            <h1>{space.name}</h1>

            <p>
              {currentRole} · Business
            </p>
          </div>
        </div>

        <Link
          className="button secondary compact"
          to={'/spaces/' + space.id}
        >
          Space
        </Link>
      </header>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <section className="business-home-v115-hero">
        <div className="business-home-v115-hero-heading">
          <div>
            <span>Business funds</span>
            <small>
              Business accounts only
            </small>
          </div>

          <Link
            to={
              '/spaces/'
              + space.id
              + '?section=accounts'
            }
          >
            Accounts
          </Link>
        </div>

        <strong>
          {formatMoney(
            totalBusinessFunds,
            space.currency,
          )}
        </strong>

        <div className="business-home-v115-hero-stats">
          <div>
            <span>Money in</span>
            <strong>
              {formatMoney(
                moneyIn,
                space.currency,
              )}
            </strong>
            <small>This month</small>
          </div>

          <div>
            <span>Money out</span>
            <strong>
              {formatMoney(
                moneyOut,
                space.currency,
              )}
            </strong>
            <small>This month</small>
          </div>
        </div>
      </section>

      <section className="business-home-v115-actions">
        <Link
          to={
            '/spaces/'
            + space.id
            + '/business/money'
          }
        >
          <span>↕</span>
          <strong>Money</strong>
        </Link>

        <Link
          to={
            '/spaces/'
            + space.id
            + '?section=accounts'
          }
        >
          <span>▣</span>
          <strong>Accounts</strong>
        </Link>

        <Link
          to={
            '/spaces/'
            + space.id
            + '/business'
          }
        >
          <span>▦</span>
          <strong>Operations</strong>
        </Link>

        <Link
          to={'/spaces/' + space.id}
        >
          <span>•••</span>
          <strong>More</strong>
        </Link>
      </section>

      <section className="business-home-v115-section">
        <div className="business-home-v115-section-heading">
          <div>
            <span>Accounts</span>
            <h2>Business accounts</h2>
          </div>

          <Link
            to={
              '/spaces/'
              + space.id
              + '?section=accounts'
            }
          >
            See all
          </Link>
        </div>

        {accounts.length > 0 ? (
          <div className="business-home-v115-account-strip">
            {accounts.map(
              (account) => (
                <article
                  key={account.id}
                  className="business-home-v115-account-card"
                >
                  <AccountAvatar
                    account={account}
                  />

                  <div>
                    <strong>
                      {account.name}
                    </strong>

                    <small>
                      {account.institution
                        || (
                          account.type
                            === 'cash'
                            ? 'Cash'
                            : account.type
                                .replace(
                                  /_/g,
                                  ' ',
                                )
                        )}
                    </small>
                  </div>

                  <b>
                    {account.sharedCanViewBalance
                      === false
                      ? 'Hidden'
                      : formatMoney(
                          account.ledgerBalanceMinor,
                          account.currency,
                        )}
                  </b>
                </article>
              ),
            )}
          </div>
        ) : (
          <p className="muted">
            No Business account is linked yet.
          </p>
        )}
      </section>

      <section className="business-home-v115-section">
        <div className="business-home-v115-section-heading">
          <div>
            <span>Recent</span>
            <h2>Business activity</h2>
          </div>

          <Link
            to={
              '/spaces/'
              + space.id
              + '/business/money'
            }
          >
            See all
          </Link>
        </div>

        {recentRows.length > 0 ? (
          <div className="business-home-v115-activity-list">
            {recentRows.map(
              (item) => (
                <Link
                  key={item.id}
                  className="business-home-v115-activity-row"
                  to={
                    '/spaces/'
                    + space.id
                    + '/business/money'
                  }
                >
                  <span
                    className={
                      'business-home-v115-activity-icon '
                      + item.type
                    }
                    aria-hidden="true"
                  >
                    {item.type === 'income'
                      ? '↓'
                      : item.type
                          === 'expense'
                        ? '↑'
                        : '↔'}
                  </span>

                  <span>
                    <strong>
                      {transactionTitle(item)}
                    </strong>
                    <small>
                      {item.category
                        || item.transactionDate}
                    </small>
                  </span>

                  <b className={item.type}>
                    {transactionAmount(item)}
                  </b>
                </Link>
              ),
            )}
          </div>
        ) : (
          <p className="muted">
            No Business money activity yet.
          </p>
        )}
      </section>
    </main>
  );
}
