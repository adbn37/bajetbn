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
  getBusinessProfile,
} from '../../repositories/businessAdvancedRepository';
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
  BusinessIndustry,
  FinancialTransaction,
  Space,
  SmePosRole,
} from '../../types/models';
import { formatMoney } from '../../utils/money';
import { AccountAvatar } from '../accounts/AccountAvatar';
import { SpaceAvatar } from '../spaces/SpaceAvatar';
import {
  SmeOperationalAttentionPanel,
} from '../spaces/SmeOperationalAttentionPanel';

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

  const [
    businessIndustry,
    setBusinessIndustry,
  ] = useState<BusinessIndustry>('general');

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
        nextAccess,
        nextProfile,
      ] = await Promise.all([
        isOwner
          ? Promise.resolve(null)
          : getMySmePosAccess(
              spaceId,
              user.uid,
            ).catch(() => null),
        getBusinessProfile(
          spaceId,
        ).catch(() => null),
      ]);

      const nextRole =
        nextAccess?.status === 'active'
          ? nextAccess.role
          : null;

      setPosRole(nextRole);
      setBusinessIndustry(
        nextProfile?.industry
        || 'general',
      );

      /*
       * Financial data is not merely hidden in the UI.
       * Restricted POS roles do not request it at all.
       *
       * This mirrors the existing Business financial rule:
       * Owner / Manager can see Business financials.
       * Cashier / Stock Staff / Seller / View Only cannot.
       */
      const canReadFinancials =
        isOwner
        || nextRole === 'manager';

      if (!canReadFinancials) {
        setAccounts([]);
        setTransactions([]);
        return;
      }

      const [
        nextAccounts,
        nextTransactions,
      ] = await Promise.all([
        listAccountsForSpace(spaceId),
        listBusinessTransactionsForSpace(
          spaceId,
        ),
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

  const canViewFinancials =
    isOwner
    || posRole === 'manager';

  const workspaceTitle =
    posRole === 'cashier'
      ? 'Cashier workspace'
      : posRole === 'stock_staff'
        ? 'Stock workspace'
        : posRole === 'seller'
          ? 'Seller workspace'
          : posRole === 'viewer'
            ? 'View-only workspace'
            : 'Business workspace';

  const workspaceDescription =
    posRole === 'cashier'
      ? 'Open the POS and handle customer sales. Business money and account balances stay private.'
      : posRole === 'stock_staff'
        ? 'Work with stock and POS tools. Business money and account balances stay private.'
        : posRole === 'seller'
          ? 'Use your seller and POS tools. Other Business financial information stays private.'
          : posRole === 'viewer'
            ? 'View the operational tools available to your role. Financial information stays private.'
            : 'Your Business tools are ready.';

  const businessActions: Array<{
    label: string;
    icon: string;
    to: string;
  }> = [];

  if (
    posRole === 'cashier'
    || posRole === 'stock_staff'
    || posRole === 'seller'
    || posRole === 'viewer'
  ) {
    businessActions.push({
      label:
        posRole === 'stock_staff'
          ? 'Inventory / POS'
          : posRole === 'seller'
            ? 'Seller / POS'
            : posRole === 'viewer'
              ? 'View POS'
              : 'POS',
      icon: '▦',
      to:
        '/spaces/'
        + space.id
        + '/pos',
    });
  } else if (
    businessIndustry === 'marketplace'
  ) {
    businessActions.push(
      {
        label: 'POS',
        icon: '▦',
        to:
          '/spaces/'
          + space.id
          + '/pos',
      },
      {
        label: 'Listings',
        icon: '▤',
        to:
          '/spaces/'
          + space.id
          + '?section=marketplace-listings',
      },
    );

    if (
      isOwner
      || posRole === 'manager'
    ) {
      businessActions.push({
        label: 'Sellers',
        icon: '♙',
        to:
          '/spaces/'
          + space.id
          + '?section=marketplace-sellers',
      });
    }

    businessActions.push({
      label: 'Operations',
      icon: '▦',
      to:
        '/spaces/'
        + space.id
        + '/business',
    });
  } else if (
    businessIndustry === 'retail'
  ) {
    businessActions.push(
      {
        label: 'POS',
        icon: '▦',
        to:
          '/spaces/'
          + space.id
          + '/pos',
      },
      {
        label: 'Operations',
        icon: '▤',
        to:
          '/spaces/'
          + space.id
          + '/business',
      },
    );

    if (isOwner) {
      businessActions.push({
        label: 'Business Setup',
        icon: '⚙',
        to:
          '/spaces/'
          + space.id
          + '/business/setup',
      });
    }
  } else {
    if (
      isOwner
      && (
        businessIndustry === 'service'
        || businessIndustry === 'rental'
      )
    ) {
      businessActions.push({
        label:
          businessIndustry === 'rental'
            ? 'Rent'
            : 'Invoices',
        icon: '▤',
        to:
          '/spaces/'
          + space.id
          + '/business/invoices',
      });
    }

    businessActions.push({
      label: 'Operations',
      icon: '▦',
      to:
        '/spaces/'
        + space.id
        + '/business',
    });

    if (isOwner) {
      businessActions.push({
        label: 'Business Setup',
        icon: '⚙',
        to:
          '/spaces/'
          + space.id
          + '/business/setup',
      });
    }
  }

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

      {canViewFinancials ? (
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
      ) : (
        <section className="business-home-v115-role-hero">
          <span className="eyebrow">
            {currentRole}
          </span>

          <h2>{workspaceTitle}</h2>

          <p>
            {workspaceDescription}
          </p>
        </section>
      )}

      {businessActions.length > 0 && (
        <section
          className="business-home-v115-actions"
          aria-label="Business actions"
        >
          {businessActions.map(
            (action) => (
              <Link
                key={
                  action.label
                  + action.to
                }
                to={action.to}
              >
                <span>{action.icon}</span>
                <strong>
                  {action.label}
                </strong>
              </Link>
            ),
          )}
        </section>
      )}

      {canViewFinancials && (
        <div
          className="business-home-v115-attention"
          data-business-home-attention
        >
          <SmeOperationalAttentionPanel
            space={space}
            role={
              isOwner
                ? 'owner'
                : posRole
            }
          />
        </div>
      )}

      {canViewFinancials && (
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
      )}

      {canViewFinancials && (
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
      )}
    </main>
  );
}
