import {
  lazy,
  Suspense,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import {
  listAccounts,
  listAccountsForSpace,
} from '../../repositories/accountRepository';
import { getBusinessProfile } from '../../repositories/businessAdvancedRepository';
import { listAllCustomCategories } from '../../repositories/categoryRepository';
import { postTransaction } from '../../repositories/transactionRepository';
import type {
  Account,
  BusinessIndustry,
  SmePosRole,
  Space,
  SpaceMember,
  TransactionCategory,
} from '../../types/models';
import { getSpaceHomeExperience } from './spaceExperience';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../categories/defaultCategories';

const CollaborationPage = lazy(
  async () => {
    const module =
      await import('../collaboration/CollaborationPage');

    return {
      default: module.CollaborationPage,
    };
  },
);

const MoneyActivityModal = lazy(
  async () => {
    const module =
      await import('../transactions/TransactionsPage');

    return {
      default: module.MoneyActivityModal,
    };
  },
);

const SharedExpensesPanel = lazy(
  async () => {
    const module =
      await import('./SharedExpensesPanel');

    return {
      default: module.SharedExpensesPanel,
    };
  },
);

const SpaceFundPanel = lazy(
  async () => {
    const module =
      await import('./SpaceFundPanel');

    return {
      default: module.SpaceFundPanel,
    };
  },
);

const TripPlanningPanel = lazy(
  async () => {
    const module =
      await import('./TripPlanningPanel');

    return {
      default: module.TripPlanningPanel,
    };
  },
);

const SpaceWorkPanel = lazy(
  async () => {
    const module =
      await import('./SpaceWorkPanel');

    return {
      default: module.SpaceWorkPanel,
    };
  },
);

type SpaceTool =
  | 'fund'
  | 'expenses'
  | 'balances'
  | 'bills'
  | 'trip_planning'
  | 'tasks'
  | 'shopping';

const shortcutGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
  gap: '0.5rem',
};

const shortcutStyle: CSSProperties = {
  minHeight: '48px',
  width: '100%',
  padding: '0.6rem 0.7rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  textAlign: 'left',
};

function shortcutIcon(
  label: string,
) {
  const value =
    label.toLowerCase();

  if (
    value.includes('money')
    || value.includes('account')
    || value.includes('fund')
    || value.includes('balance')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M5 7h12a2 2 0 0 1 2 2v9H6a2 2 0 0 1-2-2V7.5A2.5 2.5 0 0 1 6.5 5H17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 11h5v4h-5a2 2 0 0 1 0-4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (
    value.includes('bill')
    || value.includes('invoice')
    || value.includes('rent')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M7 4h10v16l-2-1-2 1-2-1-2 1-2-1V4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M10 9h4M10 13h4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (
    value.includes('pos')
    || value.includes('listing')
    || value.includes('sale')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M5 9h14v10H5V9Zm1-4h12l2 4H4l2-4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9 13h6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (
    value.includes('purchase')
    || value.includes('buy')
    || value.includes('shopping')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M4 5h2l2 10h9l2-7H7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="19" r="1.2" fill="currentColor" />
        <circle cx="17" cy="19" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (
    value.includes('task')
    || value.includes('to-do')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M9 6h10M9 12h10M9 18h10M4.5 6l1.2 1.2L7.8 5M4.5 12l1.2 1.2L7.8 11M4.5 18l1.2 1.2L7.8 17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (
    value.includes('member')
    || value.includes('seller')
    || value.includes('customer')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <circle
          cx="9"
          cy="8"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M4 19c.7-3.2 2.5-5 5-5s4.3 1.8 5 5M15 6.5c2.2.2 3.5 1.5 3.5 3.5s-1.3 3.3-3.5 3.5M16 14.5c2 .7 3.2 2.2 3.7 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (value.includes('chat')) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M5 5h14v10H9l-4 4V5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9 9h6M9 12h4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (
    value.includes('report')
    || value.includes('activity')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M5 19V9M10 19V5M15 19v-7M20 19V8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (
    value.includes('setting')
    || value.includes('setup')
    || value.includes('admin')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (
    value.includes('trip')
    || value.includes('plan')
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="m3 13 7-2 3-7 2 1-1 6 6-1 1 2-7 3-2 6-2-1v-5l-5 1-2-3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24">
      <rect x="4" y="4" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="14" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ShortcutLink({
  to,
  label,
  badge,
  primary = false,
  onClick,
}: {
  to: string;
  label: string;
  badge?: string | number;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      className={`button ${primary ? 'primary primary-action' : 'secondary'} compact`}
      style={shortcutStyle}
      to={to}
      onClick={onClick}
    >
      <span
        className="space-shortcut-icon"
        aria-hidden="true"
      >
        {shortcutIcon(label)}
      </span>

      <span className="space-shortcut-copy">
        <strong>{label}</strong>
      </span>

      {badge !== undefined && badge !== null && (
        <span className="type-badge">{badge}</span>
      )}
    </Link>
  );
}

function ShortcutButton({
  label,
  badge,
  primary = false,
  onClick,
}: {
  label: string;
  badge?: string | number;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`button ${primary ? 'primary primary-action' : 'secondary'} compact`}
      style={shortcutStyle}
      onClick={onClick}
    >
      <span
        className="space-shortcut-icon"
        aria-hidden="true"
      >
        {shortcutIcon(label)}
      </span>

      <span className="space-shortcut-copy">
        <strong>{label}</strong>
      </span>

      {badge !== undefined && badge !== null && (
        <span className="type-badge">{badge}</span>
      )}
    </button>
  );
}

function smePosLabel(role: SmePosRole | null) {
  if (role === 'cashier') return 'Open POS';
  if (role === 'stock_staff') return 'Inventory / POS';
  if (role === 'seller') return 'Seller / POS';
  if (role === 'viewer') return 'View POS';
  return 'POS & Operations';
}

function smePosRoleLabel(role: SmePosRole | null) {
  switch (role) {
    case 'owner':
      return 'Owner';
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

export function SpaceActionHub({
  space,
  members,
  currentMember,
  supportsGroupFund,
  fundLabel,
  smePosRole = null,
  canViewSmeFinancials = false,
  onRefresh,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
  supportsGroupFund: boolean;
  fundLabel: string;
  smePosRole?: SmePosRole | null;
  canViewSmeFinancials?: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { user, profile } = useAuth();
  const { online } = useOfflineSync();
  const [searchParams] = useSearchParams();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customCategories, setCustomCategories] = useState<TransactionCategory[]>([]);
  const [moneyType, setMoneyType] = useState<'income' | 'expense' | null>(null);
  const [tool, setTool] = useState<SpaceTool | null>(null);
  const [spaceMoreOpen, setSpaceMoreOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [businessIndustry, setBusinessIndustry] =
    useState<BusinessIndustry>('general');

  useEffect(() => {
    if (space.type !== 'sme') {
      return;
    }

    let active = true;

    void getBusinessProfile(space.id)
      .then((nextProfile) => {
        if (active) {
          setBusinessIndustry(
            nextProfile?.industry
            || 'general',
          );
        }
      })
      .catch(() => {
        if (active) {
          setBusinessIndustry(
            'general',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [space.id, space.type]);

  const loadMoneyOptions = useCallback(async () => {
    if (!user) return;

    try {
      const [nextAccounts, nextCategories] = await Promise.all([
        space.type === 'sme'
          ? listAccountsForSpace(space.id)
          : listAccounts(user.uid),
        space.type === 'sme' && space.ownerId !== user.uid
          ? Promise.resolve([])
          : listAllCustomCategories(user.uid),
      ]);

      setAccounts(
        nextAccounts.filter(
          (item) =>
            !item.archivedAt
            && !item.closedAt
            && (
              space.type !== 'sme'
              || item.sharedCanUseAccount !== false
            ),
        ),
      );
      setCustomCategories(nextCategories);
      setError('');
    } catch {
      setError(
        'Money shortcuts could not load your accounts or categories. Other Space tools are still available.',
      );
    }
  }, [space.id, space.ownerId, space.type, user]);

  async function openMoney(
    type: 'income' | 'expense',
  ) {
    await loadMoneyOptions();
    setMoneyType(type);
  }

  const allCategories = useMemo(
    () => [
      ...DEFAULT_TRANSACTION_CATEGORIES,
      ...customCategories.filter((item) => !item.archivedAt),
    ],
    [customCategories],
  );

  async function reloadCategories(): Promise<TransactionCategory[]> {
    if (!user) return allCategories;

    if (space.type === 'sme' && space.ownerId !== user.uid) {
      setCustomCategories([]);
      return [...DEFAULT_TRANSACTION_CATEGORIES];
    }

    const next = await listAllCustomCategories(user.uid);
    setCustomCategories(next);

    return [
      ...DEFAULT_TRANSACTION_CATEGORIES,
      ...next.filter((item) => !item.archivedAt),
    ];
  }

  const shared = space.type !== 'personal';
  const canManage =
    space.type === 'sme'
      ? (
          space.ownerId === user?.uid
          || smePosRole === 'owner'
          || smePosRole === 'manager'
          || (
            smePosRole === null
            && currentMember?.role === 'admin'
          )
        )
      : (
          space.ownerId === user?.uid
          || currentMember?.role === 'owner'
          || currentMember?.role === 'admin'
        );

  const experience =
    getSpaceHomeExperience(space, currentMember);

  const accessRoleLabel =
    space.type === 'sme' && smePosRole
      ? smePosRoleLabel(smePosRole)
      : experience.roleLabel;

  const isPrimary = (
    action: 'expense' | 'income' | 'fund' | 'expenses' | 'balances' | 'bills',
  ) => experience.primary === action;

  const toolTitle: Record<SpaceTool, string> = {
    fund: fundLabel,
    expenses: space.type === 'trip' ? 'Trip Expenses' : 'Shared expenses',
    balances: space.type === 'trip' ? 'Settle Up' : 'Settlements',
    bills: 'Shared Bills',
    trip_planning: 'Trip Plan',
    tasks: space.type === 'household' ? 'To-Do' : 'Tasks',
    shopping: space.type === 'sme' ? 'Purchase List' : 'To-Buy',
  };

  const isBusinessOwner =
    space.type === 'sme'
    && space.ownerId === user?.uid;

  const salesFocusedBusiness =
    businessIndustry === 'retail'
    || businessIndustry === 'marketplace';

  const businessWorkflowLabel =
    businessIndustry === 'service'
      ? 'Service Operations'
      : businessIndustry === 'rental'
        ? 'Rental Operations'
        : businessIndustry === 'transport_delivery'
          ? 'Delivery Operations'
          : 'Operations';

  const businessAdminLabel =
    businessIndustry === 'rental'
      ? 'Renters & Admin'
      : 'Customers & Admin';

  const showBusinessInvoices =
    isBusinessOwner
    && (
      businessIndustry === 'service'
      || businessIndustry === 'rental'
      || businessIndustry === 'transport_delivery'
    );

  const simplifiedSpaceNavigation = true;

  /*
   * Space navigation state follows the actual destination.
   *
   * Styling deliberately continues through ShortcutLink /
   * ShortcutButton "primary", which uses BajetBN's existing
   * theme accent variables. No fixed navigation colour.
   */
  const activeSection =
    searchParams.get('section');

  const householdNavigationTarget =
    space.type !== 'household'
      ? null
      : spaceMoreOpen
        ? 'more'
        : activeSection === 'fund'
          ? 'fund'
          : activeSection === 'bills'
            ? 'bills'
            : activeSection === 'shared-expenses'
              ? 'expenses'
              : activeSection === 'todo'
                ? 'tasks'
                : activeSection === 'shopping'
                  ? 'shopping'
                  : activeSection === 'chat'
                    ? 'chat'
                    : [
                        'budgets',
                        'members',
                        'activity',
                        'settings',
                      ].includes(
                        activeSection || '',
                      )
                      ? 'more'
                      : activeSection
                        ? null
                        : 'home';

  return (
    <>
      <section
        className="space-action-hub"
        aria-label={`${space.name} shortcuts`}
        style={{ marginBottom: '0.75rem' }}
      >
        <div
          className="space-home-access"
          aria-label="Your access in this Space"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.45rem 0.6rem',
            marginBottom: '0.55rem',
          }}
        >
          <div>
            <span className="muted">Your access</span>{' '}
            <strong>{accessRoleLabel}</strong>
          </div>

          <small className="muted">
            {space.type === 'sme'
              ? 'Business'
              : space.type === 'household'
                ? 'Household'
                : space.type === 'trip'
                  ? 'Trip'
                  : space.type === 'personal'
                    ? 'Personal'
                    : 'Shared Space'}
          </small>
        </div>

        {feedback && (
          <div className="notice success compact-notice">{feedback}</div>
        )}

        {error && (
          <div className="notice warning compact-notice">{error}</div>
        )}


        {simplifiedSpaceNavigation && (
          <div
            className="space-action-buttons simplified-space-actions"
            data-simplified-space-navigation
            data-space-launcher={space.type}
            data-business-industry={
              space.type === 'sme'
                ? businessIndustry
                : undefined
            }
            style={shortcutGridStyle}
          >
            {space.type === 'sme' && businessIndustry === 'marketplace' && <>
              <ShortcutLink
                to={`/spaces/${space.id}/pos`}
                label="POS"
              />

              {smePosRole !== 'seller' && (
                <ShortcutLink
                  to={`/spaces/${space.id}?section=marketplace-listings`}
                  label="Listings"
                  primary={
                    activeSection === 'marketplace-listings'
                  }
                />
              )}

              {(smePosRole === 'owner'
                || smePosRole === 'manager') && (
                <ShortcutLink
                  to={`/spaces/${space.id}?section=marketplace-sellers`}
                  label="Sellers"
                  primary={
                    activeSection === 'marketplace-sellers'
                  }
                />
              )}

              {(smePosRole === 'owner'
                || smePosRole === 'manager') && (
                <ShortcutLink
                  to={`/spaces/${space.id}?section=marketplace-payouts`}
                  label="Payouts"
                  primary={
                    activeSection === 'marketplace-payouts'
                  }
                />
              )}

              {(smePosRole === 'owner'
                || smePosRole === 'manager') && (
                <ShortcutButton
                  label="Purchase List"
                  onClick={() => setTool('shopping')}
                />
              )}

              <ShortcutButton
                label="More"
                primary={
                  [
                    'marketplace-customers',
                    'marketplace-reports',
                  ].includes(
                    activeSection || '',
                  )
                }
                onClick={() => setSpaceMoreOpen(true)}
              />
            </>}

            {space.type === 'sme' && businessIndustry === 'retail' && <>
              <ShortcutLink to={`/spaces/${space.id}/pos`} label="POS" primary />
              {canViewSmeFinancials && (
                <ShortcutLink to={`/spaces/${space.id}?section=accounts`} label="Money" />
              )}
              <ShortcutButton label="Purchases" onClick={() => setTool('shopping')} />
              <ShortcutButton label="Tasks" onClick={() => setTool('tasks')} />
              <ShortcutButton label="More" onClick={() => setSpaceMoreOpen(true)} />
            </>}

            {space.type === 'sme' && !salesFocusedBusiness && <>
              {businessIndustry === 'service' || businessIndustry === 'rental' ? (
                <ShortcutLink
                  to={`/spaces/${space.id}/business/invoices`}
                  label={businessIndustry === 'rental' ? 'Rent' : 'Invoices'}
                  primary
                />
              ) : businessIndustry === 'transport_delivery' ? (
                <ShortcutButton label="Jobs" primary onClick={() => setTool('tasks')} />
              ) : canViewSmeFinancials ? (
                <ShortcutLink to={`/spaces/${space.id}?section=accounts`} label="Money" primary />
              ) : (
                <ShortcutButton label="Tasks" primary onClick={() => setTool('tasks')} />
              )}

              {canViewSmeFinancials && businessIndustry !== 'general' && businessIndustry !== 'other' && (
                <ShortcutLink to={`/spaces/${space.id}?section=accounts`} label="Money" />
              )}
              {isBusinessOwner && (
                <ShortcutLink
                  to={`/spaces/${space.id}/business`}
                  label={businessIndustry === 'rental' ? 'Renters' : 'Customers'}
                />
              )}
              {businessIndustry !== 'transport_delivery' && (
                <ShortcutButton label="Tasks" onClick={() => setTool('tasks')} />
              )}
              <ShortcutButton label="More" onClick={() => setSpaceMoreOpen(true)} />
            </>}

            {space.type === 'trip' && <>
              <ShortcutLink
                to={`/spaces/${space.id}`}
                label="Home"
                primary={
                  tool === null
                  && !spaceMoreOpen
                  && !activeSection
                }
              />

              <ShortcutButton
                label="Plan"
                primary={tool === 'trip_planning'}
                onClick={() => setTool('trip_planning')}
              />

              <ShortcutButton
                label="Fund"
                primary={tool === 'fund'}
                onClick={() => setTool('fund')}
              />

              <ShortcutButton
                label="Expenses"
                primary={tool === 'expenses'}
                onClick={() => setTool('expenses')}
              />

              <ShortcutButton
                label="Settle"
                primary={tool === 'balances'}
                onClick={() => setTool('balances')}
              />

              <ShortcutButton
                label="More"
                primary={spaceMoreOpen}
                onClick={() => setSpaceMoreOpen(true)}
              />
            </>}

            {space.type === 'household' && <>
              <ShortcutLink
                to={`/spaces/${space.id}`}
                label="Home"
                primary={
                  householdNavigationTarget === 'home'
                }
              />

              <ShortcutLink
                to={`/spaces/${space.id}?section=fund`}
                label="Fund"
                primary={
                  householdNavigationTarget === 'fund'
                }
              />

              <ShortcutLink
                to={`/spaces/${space.id}?section=bills`}
                label="Bills"
                primary={
                  householdNavigationTarget === 'bills'
                }
              />

              <ShortcutLink
                to={`/spaces/${space.id}?section=shared-expenses`}
                label="Expenses"
                primary={
                  householdNavigationTarget === 'expenses'
                }
              />

              <ShortcutLink
                to={`/spaces/${space.id}?section=todo`}
                label="To-Do"
                primary={
                  householdNavigationTarget === 'tasks'
                }
              />

              <ShortcutLink
                to={`/spaces/${space.id}?section=shopping`}
                label="Shopping"
                primary={
                  householdNavigationTarget === 'shopping'
                }
              />

              <ShortcutLink
                to={`/spaces/${space.id}?section=chat`}
                label="Chat"
                primary={
                  householdNavigationTarget === 'chat'
                }
              />

              <ShortcutButton
                label="More"
                primary={
                  householdNavigationTarget === 'more'
                }
                onClick={() => setSpaceMoreOpen(true)}
              />
            </>}

            {space.type === 'personal' && <>
              <ShortcutLink
                to={`/spaces/${space.id}`}
                label="Home"
                primary={
                  !activeSection
                  && !spaceMoreOpen
                }
              />

              <ShortcutLink
                to="/accounts"
                label="Accounts"
              />

              <ShortcutLink
                to="/transactions"
                label="Money"
              />

              <ShortcutLink
                to="/bills"
                label="Bills"
              />

              <ShortcutButton
                label="More"
                primary={spaceMoreOpen}
                onClick={() => setSpaceMoreOpen(true)}
              />
            </>}

            {!['sme', 'trip', 'household', 'personal'].includes(space.type) && <>
              <ShortcutLink
                to={`/spaces/${space.id}`}
                label="Home"
                primary={
                  tool === null
                  && !spaceMoreOpen
                  && !activeSection
                }
              />

              {supportsGroupFund && (
                <ShortcutButton
                  label={fundLabel}
                  primary={tool === 'fund'}
                  onClick={() => setTool('fund')}
                />
              )}

              <ShortcutButton
                label="Expenses"
                primary={tool === 'expenses'}
                onClick={() => setTool('expenses')}
              />

              <ShortcutLink
                to={`/spaces/${space.id}?tab=members`}
                label="Members"
              />

              <ShortcutLink
                to={`/spaces/${space.id}?tab=chat`}
                label="Chat"
              />
            </>}
          </div>
        )}

        {!simplifiedSpaceNavigation && (
          <>
        {space.type === 'sme' ? (
          <div
            className="space-action-buttons sme-space-actions-v111"
            data-space-launcher="sme"
            data-secondary-label="Business Space tools"
            data-business-industry={businessIndustry}
            style={shortcutGridStyle}
          >
            <ShortcutLink
              to={`/spaces/${space.id}?details=1`}
              label="Business Overview"
              primary
            />

            {salesFocusedBusiness ? (
              <ShortcutLink
                to={`/spaces/${space.id}/pos`}
                label={
                  businessIndustry === 'marketplace'
                    ? 'POS & Marketplace'
                    : smePosLabel(smePosRole)
                }
              />
            ) : (
              <ShortcutLink
                to={`/spaces/${space.id}/business/industry`}
                label={businessWorkflowLabel}
              />
            )}

            {isBusinessOwner && (
              <ShortcutLink
                to={`/spaces/${space.id}?section=accounts`}
                label="Business Accounts"
              />
            )}

            {isBusinessOwner && (
              <ShortcutLink
                to={`/spaces/${space.id}/business`}
                label={businessAdminLabel}
              />
            )}

            {showBusinessInvoices && (
              <ShortcutLink
                to={`/spaces/${space.id}/business/invoices`}
                label={
                  businessIndustry === 'rental'
                    ? 'Rent & Collections'
                    : 'Invoices & Collections'
                }
              />
            )}

            <ShortcutButton
              label="Tasks"
              onClick={() => setTool('tasks')}
            />

            {salesFocusedBusiness && (
              <ShortcutButton
                label="Purchase List"
                onClick={() => setTool('shopping')}
              />
            )}

            <ShortcutLink
              to={`/spaces/${space.id}?tab=activity`}
              label="Activity"
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : space.type === 'trip' ? (
          <div
            className="space-action-buttons trip-space-actions-v111"
            data-space-launcher="trip"
            data-secondary-label="Trip Space tools"
            style={shortcutGridStyle}
          >
            <ShortcutButton
              label="Trip Plan"
              primary
              onClick={() => setTool('trip_planning')}
            />

            <ShortcutButton
              label="Trip Fund"
              onClick={() => setTool('fund')}
            />

            <ShortcutButton
              label="Trip Expenses"
              onClick={() => setTool('expenses')}
            />

            <ShortcutButton
              label="Settle Up"
              onClick={() => setTool('balances')}
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : space.type === 'household' ? (
          <div
            className="space-action-buttons household-space-actions-v111"
            data-space-launcher="household"
            data-secondary-label="Household Space tools"
            style={shortcutGridStyle}
          >
            <ShortcutButton
              label="Household Fund"
              primary
              onClick={() => setTool('fund')}
            />

            <ShortcutButton
              label="Add Expense"
              onClick={() => void openMoney('expense')}
            />

            <ShortcutButton
              label="To-Do"
              onClick={() => setTool('tasks')}
            />

            <ShortcutButton
              label="To-Buy"
              onClick={() => setTool('shopping')}
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : space.type === 'personal' ? (
          <div
            className="space-action-buttons personal-space-actions-v111"
            data-personal-home-v111
            data-space-launcher="personal"
            data-secondary-label="Personal money tools"
            style={shortcutGridStyle}
          >
            <ShortcutLink
              to={`/spaces/${space.id}?section=accounts`}
              label="Accounts"
              primary
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=income`}
              label="Income"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=expenses`}
              label="Expenses"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=budgets`}
              label="Budget"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=goals`}
              label="Goals"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=bills`}
              label="Bills"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=instalments`}
              label="Instalments"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=reports`}
              label="Reports"
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : (
          <div
            className="space-action-buttons"
            data-secondary-label="More Space tools"
            style={shortcutGridStyle}
          >
            <ShortcutButton
              label="Add Expense"
              primary={isPrimary('expense')}
              onClick={() => void openMoney('expense')}
            />

            <ShortcutButton
              label="Add Income"
              primary={isPrimary('income')}
              onClick={() => void openMoney('income')}
            />

            {shared && supportsGroupFund && (
              <ShortcutButton
                label={fundLabel}
                primary={isPrimary('fund')}
                onClick={() => setTool('fund')}
              />
            )}

            {shared && (
              <>
                <ShortcutButton
                  label="Shared expenses"
                  primary={isPrimary('expenses')}
                  onClick={() => setTool('expenses')}
                />

                <ShortcutButton
                  label="Settlements"
                  primary={isPrimary('balances')}
                  onClick={() => setTool('balances')}
                />

                <ShortcutButton
                  label="Shared Bills"
                  primary={isPrimary('bills')}
                  onClick={() => setTool('bills')}
                />

                <ShortcutLink
                  to={`/spaces/${space.id}?tab=members`}
                  label="Members"
                />

                <ShortcutLink
                  to={`/spaces/${space.id}?tab=chat`}
                  label="Chat"
                />

                <ShortcutLink
                  to={`/spaces/${space.id}?tab=activity`}
                  label="Activity"
                />
              </>
            )}
          </div>
        )}
          </>
        )}

      </section>


      {spaceMoreOpen && (
        <Modal
          title={`${space.name} — More`}
          onClose={() => setSpaceMoreOpen(false)}
        >
          <div
            className="space-more-sheet-v111"
            data-space-more-v111
          >
            <div className="space-more-context-v111">
              <strong>{space.name}</strong>
              <span>More for this Space.</span>
            </div>

            <div
              className="space-action-buttons space-more-actions-v111"
              style={shortcutGridStyle}
            >
              {simplifiedSpaceNavigation && <>
                {space.type === 'household' && <>
                  <ShortcutLink
                    to={`/spaces/${space.id}?section=budgets`}
                    label="Budget"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=members`}
                    label="Members"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=activity`}
                    label="Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {currentMember?.role === 'owner' && (
                    <ShortcutLink
                      to={`/spaces/${space.id}?section=settings`}
                      label="Settings"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                </>}

                {space.type === 'trip' && <>
                  <ShortcutLink to={`/spaces/${space.id}?section=budgets`} label="Budget" onClick={() => setSpaceMoreOpen(false)} />
                  <ShortcutLink to={`/spaces/${space.id}?tab=members`} label="Members" onClick={() => setSpaceMoreOpen(false)} />
                  <ShortcutLink to={`/spaces/${space.id}?tab=chat`} label="Chat" onClick={() => setSpaceMoreOpen(false)} />
                  {currentMember?.role === 'owner' && (
                    <ShortcutLink to={`/spaces/${space.id}?tab=settings`} label="Settings" onClick={() => setSpaceMoreOpen(false)} />
                  )}
                </>}

                {space.type === 'sme' && <>
                  {businessIndustry === 'marketplace' ? (
                    <ShortcutLink to={`/spaces/${space.id}?section=marketplace-customers`} label="Customers" onClick={() => setSpaceMoreOpen(false)} />
                  ) : (
                    <ShortcutLink to={`/spaces/${space.id}/business`} label={businessAdminLabel} onClick={() => setSpaceMoreOpen(false)} />
                  )}
                  {businessIndustry === 'marketplace' && isBusinessOwner && (
                    <ShortcutLink
                      to={`/spaces/${space.id}/business`}
                      label="Business Admin"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                  {businessIndustry === 'retail' && (
                    <ShortcutButton label="Purchase List" onClick={() => { setSpaceMoreOpen(false); setTool('shopping'); }} />
                  )}
                  {businessIndustry === 'marketplace' ? (
                    <ShortcutLink to={`/spaces/${space.id}?section=marketplace-reports`} label="Reports" onClick={() => setSpaceMoreOpen(false)} />
                  ) : canViewSmeFinancials ? (
                    <ShortcutLink to={`/spaces/${space.id}?section=reports`} label="Reports" onClick={() => setSpaceMoreOpen(false)} />
                  ) : null}
                  <ShortcutLink to={`/spaces/${space.id}?tab=members`} label="Members" onClick={() => setSpaceMoreOpen(false)} />
                  {(smePosRole === 'owner' || currentMember?.role === 'owner') && (
                    <ShortcutLink to={`/spaces/${space.id}/business/setup`} label="Business Setup" onClick={() => setSpaceMoreOpen(false)} />
                  )}
                </>}

                {space.type === 'personal' && <>
                  <ShortcutLink to="/transactions" label="Money" onClick={() => setSpaceMoreOpen(false)} />
                  <ShortcutLink to="/settings" label="Settings" onClick={() => setSpaceMoreOpen(false)} />
                </>}

                {!['sme', 'trip', 'household', 'personal'].includes(space.type) && <>
                  <ShortcutLink to={`/spaces/${space.id}?tab=members`} label="Members" onClick={() => setSpaceMoreOpen(false)} />
                  <ShortcutLink to={`/spaces/${space.id}?tab=chat`} label="Chat" onClick={() => setSpaceMoreOpen(false)} />
                  {currentMember?.role === 'owner' && (
                    <ShortcutLink to={`/spaces/${space.id}?tab=settings`} label="Settings" onClick={() => setSpaceMoreOpen(false)} />
                  )}
                </>}
              </>}

              {!simplifiedSpaceNavigation && <>
              {space.type === 'personal' && (
                <>
                  <ShortcutLink
                    to={`/spaces/${space.id}?section=money`}
                    label="Money Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=calendar`}
                    label="Calendar"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=settings`}
                    label="Space Settings"
                    onClick={() => setSpaceMoreOpen(false)}
                  />
                </>
              )}

              {space.type === 'household' && (
                <>
                  <ShortcutButton
                    label="Shared Expenses"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('expenses');
                    }}
                  />

                  <ShortcutButton
                    label="Shared Bills"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('bills');
                    }}
                  />

                  <ShortcutButton
                    label="Settlements"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('balances');
                    }}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=budgets`}
                    label="Budget"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=reports`}
                    label="Reports"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=calendar`}
                    label="Calendar"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=members`}
                    label="Members"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=chat`}
                    label="Chat"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=activity`}
                    label="Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {currentMember?.role === 'owner' && (
                    <ShortcutLink
                      to={`/spaces/${space.id}?tab=settings`}
                      label="Space Settings"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                </>
              )}

              {space.type === 'trip' && (
                <>
                  <ShortcutLink
                    to={`/spaces/${space.id}?section=budgets`}
                    label="Trip Budget"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutButton
                    label="Shared Bills"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('bills');
                    }}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=members`}
                    label="Members"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=chat`}
                    label="Chat"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=activity`}
                    label="Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {currentMember?.role === 'owner' && (
                    <ShortcutLink
                      to={`/spaces/${space.id}?tab=settings`}
                      label="Space Settings"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                </>
              )}

              {space.type === 'sme' && (
                <>
                  {isBusinessOwner && (
                    <ShortcutLink
                      to={`/spaces/${space.id}/business/setup`}
                      label="Business Setup"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}

                  <ShortcutLink
                    to={`/spaces/${space.id}/business/industry`}
                    label="Industry Workflow"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}/business/guide`}
                    label="Staff Guide"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=updates`}
                    label="Updates"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=approvals`}
                    label="Approvals"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {canViewSmeFinancials && (
                    <>
                      {currentMember?.canUseAccounts && (
                        <>
                          <ShortcutButton
                            label="Add Income"
                            onClick={() => {
                              setSpaceMoreOpen(false);
                              void openMoney('income');
                            }}
                          />
                          <ShortcutButton
                            label="Add Expense"
                            onClick={() => {
                              setSpaceMoreOpen(false);
                              void openMoney('expense');
                            }}
                          />
                        </>
                      )}

                      <ShortcutLink
                        to={`/spaces/${space.id}?section=reports`}
                        label="Reports"
                        onClick={() => setSpaceMoreOpen(false)}
                      />

                      <ShortcutButton
                        label="Expenses"
                        onClick={() => {
                          setSpaceMoreOpen(false);
                          setTool('expenses');
                        }}
                      />

                      <ShortcutButton
                        label="Shared Bills"
                        onClick={() => {
                          setSpaceMoreOpen(false);
                          setTool('bills');
                        }}
                      />
                    </>
                  )}

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=members`}
                    label="Members"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=chat`}
                    label="Chat"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=activity`}
                    label="Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {(smePosRole === 'owner'
                    || currentMember?.role === 'owner') && (
                    <ShortcutLink
                      to={`/spaces/${space.id}?tab=settings`}
                      label="Space Settings"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                </>
              )}

              </>}
            </div>
          </div>
        </Modal>
      )}

      {moneyType && (
        <Suspense
          fallback={
            <div className="loading-panel">
              Loading Money Activity...
            </div>
          }
        >
        <MoneyActivityModal
          accounts={accounts}
          spaces={[space]}
          categories={allCategories}
          timezone={profile?.timezone || space.timezone || 'Asia/Brunei'}
          online={online}
          initialType={moneyType}
          lockedSpaceId={space.id}
          onCategoriesChanged={reloadCategories}
          onClose={() => setMoneyType(null)}
          onSubmit={postTransaction}
          onComplete={async (message, refresh) => {
            setMoneyType(null);
            setFeedback(message);

            if (refresh) {
              await onRefresh();
            }
          }}
        />
        </Suspense>
      )}

      {tool && (
        <Modal
          title={`${space.name} - ${toolTitle[tool]}`}
          onClose={() => setTool(null)}
        >
          <Suspense
            fallback={
              <div className="loading-panel">
                Loading Space tool...
              </div>
            }
          >
          <div className="space-tool-modal">
            {tool === 'trip_planning' && space.type === 'trip' && (
              <TripPlanningPanel
                space={space}
                members={members}
                currentMember={currentMember}
              />
            )}

            {(tool === 'tasks' || tool === 'shopping')
              && (space.type === 'household' || space.type === 'sme') && (
                <SpaceWorkPanel
                  space={space}
                  members={members}
                  currentMember={currentMember}
                  initialView={tool === 'tasks' ? 'tasks' : 'shopping'}
                />
              )}

            {tool === 'fund' && supportsGroupFund && (
              <SpaceFundPanel
                space={space}
                members={members}
                currentMember={currentMember}
                canManage={canManage}
              />
            )}

            {tool === 'expenses' && (
              <SharedExpensesPanel
                space={space}
                members={members}
                currentMember={currentMember}
                canManage={canManage}
                view="expenses"
              />
            )}

            {tool === 'balances' && (
              <SharedExpensesPanel
                space={space}
                members={members}
                currentMember={currentMember}
                canManage={canManage}
                view="balances"
              />
            )}

            {tool === 'bills' && (
              <CollaborationPage
                embedded
                spaceIdOverride={space.id}
                activeTab="bills"
                onSpaceUpdated={onRefresh}
              />
            )}
          </div>
          </Suspense>
        </Modal>
      )}
    </>
  );
}
