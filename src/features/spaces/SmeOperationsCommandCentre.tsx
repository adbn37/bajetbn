import { Link } from 'react-router-dom';
import type {
  Account,
  Commitment,
  FinancialTransaction,
  SmePosRole,
  Space,
} from '../../types/models';
import { formatMoney } from '../../utils/money';

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateAfterDays(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return localDate(value);
}

function roleLabel(role: SmePosRole | null) {
  if (role === 'owner') return 'Owner';
  if (role === 'manager') return 'Manager';
  if (role === 'cashier') return 'Cashier';
  if (role === 'stock_staff') return 'Stock Staff';
  if (role === 'seller') return 'Seller';
  if (role === 'viewer') return 'View Only';
  return 'No POS role';
}

function roleFocus(role: SmePosRole | null) {
  if (role === 'owner') {
    return {
      title: 'Business operations',
      detail: 'See business money and stay on top of daily shop operations.',
      action: 'Open operations',
    };
  }

  if (role === 'manager') {
    return {
      title: 'Daily operations',
      detail: 'Run the shop, review activity and keep operations moving.',
      action: 'Open operations',
    };
  }

  if (role === 'cashier') {
    return {
      title: 'Register',
      detail: 'Your daily workspace opens directly around checkout and customers.',
      action: 'Open Register',
    };
  }

  if (role === 'stock_staff') {
    return {
      title: 'Inventory',
      detail: 'Your workspace stays focused on products, listings and stock.',
      action: 'Open Inventory',
    };
  }

  if (role === 'seller') {
    return {
      title: 'Seller area',
      detail: 'Review your stock, sales, earnings and payouts.',
      action: 'Open Seller area',
    };
  }

  if (role === 'viewer') {
    return {
      title: 'Read-only workspace',
      detail: 'Review the shop information available to your View Only role.',
      action: 'Open read-only POS',
    };
  }

  return {
    title: 'POS access not assigned',
    detail: 'Ask the SME owner to assign your business role before opening shop tools.',
    action: '',
  };
}

export function SmeOperationsCommandCentre({
  space,
  role,
  canViewFinancials,
  accounts,
  transactions,
  commitments,
  memberCount,
}: {
  space: Space;
  role: SmePosRole | null;
  canViewFinancials: boolean;
  accounts: Account[];
  transactions: FinancialTransaction[];
  commitments: Commitment[];
  memberCount: number;
}) {
  const today = localDate();
  const soon = dateAfterDays(7);

  const postedTransactions = transactions.filter(
    (item) => item.status === 'posted' && item.type !== 'reversal',
  );

  const moneyIn = postedTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const moneyOut = postedTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const businessAccounts = accounts
    .filter(
      (item) =>
        item.classification === 'business'
        && item.spaceId === space.id
        && !item.archivedAt
        && !item.closedAt,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
const activeCommitments = commitments.filter(
    (item) => item.status === 'active' && !item.archivedAt,
  );

  const dueCommitments = activeCommitments.filter((item) => {
    const dueDate = item.nextDueDate || item.startDate;
    return Boolean(dueDate && dueDate <= soon);
  });

  const overdueCommitments = activeCommitments.filter((item) => {
    const dueDate = item.nextDueDate || item.startDate;
    return Boolean(dueDate && dueDate < today);
  });

  const focus = roleFocus(role);
  const operationalRole = role === 'owner' || role === 'manager';

  return (
    <section className="sme-operations-command-centre">
      <div className="sme-operations-heading">
        <div>
          <span className="eyebrow">SME v2</span>
          <h2>SME Operations</h2>
          <p className="muted">
            Your Space home follows your business role. The existing POS remains
            the source of truth for what you can open and change.
          </p>
        </div>

        <span className="type-badge">{roleLabel(role)}</span>
      </div>

      <section className="sme-role-focus-card">
        <div>
          <span className="eyebrow">Your daily focus</span>
          <h3>{focus.title}</h3>
          <p>{focus.detail}</p>
        </div>

        {role && focus.action && (
          <Link
            className="button secondary"
            to={`/spaces/${space.id}/pos`}
          >
            {focus.action}
          </Link>
        )}
      </section>

      {canViewFinancials ? (
        <>
          <div className="sme-operations-grid">
            <article className="sme-operation-card">
              <span>Money in</span>
              <strong>{formatMoney(moneyIn, space.currency)}</strong>
              <small>Posted money activity in this SME Space</small>
            </article>

            <article className="sme-operation-card">
              <span>Money out</span>
              <strong>{formatMoney(moneyOut, space.currency)}</strong>
              <small>Posted spending in this SME Space</small>
            </article>

            <article className="sme-operation-card">
              <span>Business accounts</span>
              <strong>{businessAccounts.length}</strong>
              <small>Accounts assigned directly to this SME Space</small>
            </article>

            <article className="sme-operation-card">
              <span>Active bills</span>
              <strong>{activeCommitments.length}</strong>
              <small>Bills and instalments belonging to this SME Space</small>
            </article>
          </div>

          <section className="sme-business-accounts">
            <div className="sme-business-accounts-heading">
              <div>
                <span className="eyebrow">Finance</span>
                <h3>Business accounts</h3>
                <p>
                  Cash, bank and other business accounts assigned directly to {space.name}.
                </p>
              </div>

              {role === 'owner' && (
                <Link className="text-button" to="/accounts">
                  Manage accounts
                </Link>
              )}
            </div>

            {businessAccounts.length ? (
              <div className="sme-business-account-grid">
                {businessAccounts.map((account) => (
                  <article className="sme-business-account-card" key={account.id}>
                    <div>
                      <strong>{account.name}</strong>
                      <small>
                        {account.type.replace('_', ' ')}
                        {' · '}
                        {account.currency}
                        {' · '}
                        {account.posEnabled
                          ? 'POS payments enabled'
                          : 'POS payments off'}
                      </small>
                    </div>

                    {role === 'owner' ? (
                      <strong>
                        {formatMoney(account.ledgerBalanceMinor, account.currency)}
                      </strong>
                    ) : (
                      <span className="type-badge">Assigned to this SME</span>
                    )}
                  </article>
                ))}
              </div>
            ) : role === 'owner' ? (
              <div className="notice">
                <strong>No business account is assigned to this SME yet.</strong>{' '}
                Open Accounts, create or edit a business account, and assign it to {space.name}.
              </div>
            ) : (
              <div className="notice">
                <strong>No assigned business account is available to you.</strong>{' '}
                The SME owner manages account ownership and account access.
              </div>
            )}
          </section>
          {operationalRole && (
            <section className="sme-operations-attention">
              <div className="sme-operations-attention-heading">
                <div>
                  <span className="eyebrow">Operations</span>
                  <h3>Needs Attention</h3>
                </div>

                <small>
                  {dueCommitments.length
                    ? `${dueCommitments.length} item${dueCommitments.length === 1 ? '' : 's'}`
                    : 'Up to date'}
                </small>
              </div>

              {dueCommitments.length ? (
                <article className="sme-operation-attention-item">
                  <div>
                    <strong>
                      {overdueCommitments.length
                        ? `${overdueCommitments.length} business bill${overdueCommitments.length === 1 ? '' : 's'} overdue`
                        : `${dueCommitments.length} business bill${dueCommitments.length === 1 ? '' : 's'} due soon`}
                    </strong>

                    <small>
                      Review the existing Bills &amp; instalments records for this SME Space.
                    </small>
                  </div>

                  <Link
                    className="button secondary compact"
                    to={`/spaces/${space.id}?section=bills`}
                  >
                    Review bills
                  </Link>
                </article>
              ) : (
                <div className="notice">
                  <strong>No urgent business bills right now.</strong>{' '}
                  New due or overdue SME bills will appear here.
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <div className="sme-role-summary-grid">
          <article>
            <span>Business role</span>
            <strong>{roleLabel(role)}</strong>
            <small>Your POS workspace enforces this access.</small>
          </article>

          <article>
            <span>Team</span>
            <strong>{memberCount}</strong>
            <small>Active people in this SME Space</small>
          </article>

          <article>
            <span>Finance access</span>
            <strong>Restricted</strong>
            <small>Business balances stay hidden for your role.</small>
          </article>
        </div>
      )}
    </section>
  );
}