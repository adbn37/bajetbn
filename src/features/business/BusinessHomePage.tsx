import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBusinessProfile,
} from '../../repositories/businessAdvancedRepository';
import {
  getMySmePosAccess,
  getSmePosSettings,
} from '../../repositories/smePosRepository';
import {
  getSpace,
  prepareAdbnTechIntegration,
} from '../../repositories/spaceRepository';
import {
  autoSyncNewAdbnTechPaymentsToBajetBn,
} from '../../repositories/adbnTechPaymentSyncRepository';
import {
  disconnectAdbnTechReadOnly,
  getAdbnTechConnectedEmail,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  listBusinessTransactionsForSpace,
} from '../../repositories/transactionRepository';
import type {
  BusinessIndustry,
  FinancialTransaction,
  Space,
  SmePosRole,
  SmePosSettings,
} from '../../types/models';
import { formatMoney } from '../../utils/money';
import {
  BusinessActivityTimeline,
} from './BusinessActivityTimeline';
import {
  AdbnTechMirrorWorkspace,
} from './AdbnTechMirrorWorkspace';
import {
  AdbnTechPaymentsWorkspace,
} from './AdbnTechPaymentsWorkspace';
import {
  AdbnTechPurchasesWorkspace,
} from './AdbnTechPurchasesWorkspace';
import {
  BusinessReportsWorkspace,
} from './BusinessReportsWorkspace';
import { AccountsPage } from '../accounts/AccountsPage';
import { CommitmentsPage } from '../commitments/CommitmentsPage';
import { SpaceAvatar } from '../spaces/SpaceAvatar';
import {
  SmeOperationalAttentionPanel,
} from '../spaces/SmeOperationalAttentionPanel';
import {
  MarketplaceConsignmentPosWorkspace,
  type MarketplaceManagementTab,
} from '../sme-pos/MarketplaceConsignmentPosWorkspace';
import {
  StandardPosWorkspace,
} from '../sme-pos/StandardPosWorkspace';

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

type BusinessWorkspaceView =
  | 'home'
  | 'inventory'
  | 'documents'
  | 'finance'
  | 'sellers'
  | 'reports'
  | 'adbn_customers'
  | 'adbn_invoices'
  | 'adbn_payments'
  | 'adbn_purchases'
  | 'setup';

function workspaceViewFromSearch(
  value: string | null,
): BusinessWorkspaceView {
  if (
    value === 'inventory'
    || value === 'documents'
    || value === 'finance'
    || value === 'sellers'
    || value === 'reports'
    || value === 'adbn_customers'
    || value === 'adbn_invoices'
    || value === 'adbn_payments'
    || value === 'adbn_purchases'
    || value === 'setup'
  ) {
    return value;
  }

  return 'home';
}

export function BusinessHomePage() {
  const { spaceId = '' } = useParams();
  const { user } = useAuth();
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const workspaceView =
    workspaceViewFromSearch(
      searchParams.get('workspace'),
    );

  const financeView =
    searchParams.get('finance')
      === 'bills'
      ? 'bills'
      : 'accounts';

  const [space, setSpace] =
    useState<Space | null>(null);

  const [transactions, setTransactions] =
    useState<FinancialTransaction[]>([]);

  const [posRole, setPosRole] =
    useState<SmePosRole | null>(null);

  const [posSettings, setPosSettings] =
    useState<SmePosSettings | null>(null);

  const [
    customRoleName,
    setCustomRoleName,
  ] = useState('');

  const [
    businessIndustry,
    setBusinessIndustry,
  ] = useState<BusinessIndustry>('general');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    integrationBusy,
    setIntegrationBusy,
  ] = useState(false);

  const [
    adbnTechSessionEmail,
    setAdbnTechSessionEmail,
  ] = useState(
    () => getAdbnTechConnectedEmail(),
  );

  const [
    adbnTechSessionBusy,
    setAdbnTechSessionBusy,
  ] = useState(false);

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
        setTransactions([]);
        setPosRole(null);
        setPosSettings(null);
        setCustomRoleName('');
        return;
      }

      setSpace(nextSpace);

      const isOwner =
        nextSpace.ownerId === user.uid;

      const [
        nextAccess,
        nextProfile,
        nextPosSettings,
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
        getSmePosSettings(
          spaceId,
        ).catch(() => null),
      ]);

      const nextRole =
        nextAccess?.status === 'active'
          ? nextAccess.role
          : null;

      setPosRole(nextRole);
      setPosSettings(nextPosSettings);
      setCustomRoleName(
        nextAccess?.status === 'active'
          ? nextAccess.customRoleName
            || ''
          : '',
      );
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
        setTransactions([]);
        return;
      }

      if (
        isOwner
        && nextSpace
          .externalIntegrationProvider
          === 'adbn_tech'
        && nextSpace
          .externalIntegrationPaymentAutoSyncEnabled
          === true
        && nextSpace
          .externalIntegrationPaymentAutoSyncCutoffIso
      ) {
        await autoSyncNewAdbnTechPaymentsToBajetBn(
          {
            spaceId,
            mappings:
              nextSpace
                .externalIntegrationAccountMappings
              || {},
            cutoffIso:
              nextSpace
                .externalIntegrationPaymentAutoSyncCutoffIso,
          },
        ).catch(() => null);
      }

      const nextTransactions =
        await listBusinessTransactionsForSpace(
          spaceId,
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

  useEffect(() => {
    if (workspaceView === 'setup') {
      setAdbnTechSessionEmail(
        getAdbnTechConnectedEmail(),
      );
    }
  }, [workspaceView]);

  const refreshBusinessTransactions =
    useCallback(
      async () => {
        const nextTransactions =
          await listBusinessTransactionsForSpace(
            spaceId,
          );

        setTransactions(
          nextTransactions.filter(
            (item) =>
              item.status === 'posted'
              && item.type !== 'reversal',
          ),
        );
      },
      [spaceId],
    );

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

  const allTimeMoneyIn =
    useMemo(
      () =>
        transactions
          .filter(
            (item) =>
              item.type === 'income',
          )
          .reduce(
            (sum, item) =>
              sum + item.amountMinor,
            0,
          ),
      [transactions],
    );

  const allTimeMoneyOut =
    useMemo(
      () =>
        transactions
          .filter(
            (item) =>
              item.type === 'expense',
          )
          .reduce(
            (sum, item) =>
              sum + item.amountMinor,
            0,
          ),
      [transactions],
    );

  const businessTransactionTotal =
    allTimeMoneyIn
    - allTimeMoneyOut;

  const monthNet =
    moneyIn - moneyOut;

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

  const isAdbnTechSpace =
    space.externalIntegrationProvider
        === 'adbn_tech'
    || space.name
      .trim()
      .toLowerCase()
      === 'adbn tech';

  const canManageAdbnTechConnection =
    isOwner
    && user?.email?.trim().toLowerCase()
      === 'zardeerwandy@gmail.com'
    && isAdbnTechSpace;

  const adbnTechPrepared =
    space.externalIntegrationProvider
      === 'adbn_tech'
    && (
      space.externalIntegrationStatus
        === 'prepared'
      || space.externalIntegrationStatus
        === 'connected'
    );

  const adbnTechConnected =
    space.externalIntegrationProvider
      === 'adbn_tech'
    && space.externalIntegrationStatus
      === 'connected';

  const currentRole =
    isOwner
      ? 'Owner'
      : customRoleName
        || roleLabel(posRole, false);

  const canViewFinancials =
    isOwner
    || posRole === 'manager';

  const workspaceTitle =
    customRoleName
      ? customRoleName + ' workspace'
      : posRole === 'cashier'
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

  const effectivePosRole: SmePosRole =
    isOwner
      ? 'owner'
      : posRole || 'viewer';

  const canUseEmbeddedMarketplace =
    businessIndustry === 'marketplace'
    && posSettings?.mode
      === 'marketplace_consignment';

  const canUseEmbeddedStandard =
    Boolean(posSettings)
    && !canUseEmbeddedMarketplace;

  const canAccessInventoryWorkspace =
    Boolean(posSettings)
    && (
      isOwner
      || posRole === 'manager'
      || posRole === 'stock_staff'
      || posRole === 'viewer'
      || (
        canUseEmbeddedMarketplace
        && posRole === 'cashier'
      )
    );

  const canAccessSellersWorkspace =
    canUseEmbeddedMarketplace
    && (
      isOwner
      || posRole === 'manager'
    );

  const marketplaceWorkspaceTab:
    MarketplaceManagementTab | null =
      workspaceView === 'inventory'
        ? 'listings'
        : workspaceView === 'sellers'
          ? 'sellers'
          : workspaceView === 'reports'
            ? 'reports'
            : null;

  const setFinanceView = (
    nextView: 'accounts' | 'bills',
  ) => {
    const next =
      new URLSearchParams(
        searchParams,
      );

    next.set(
      'workspace',
      'finance',
    );
    next.set(
      'finance',
      nextView,
    );

    setSearchParams(next);
  };

  const setWorkspaceView = (
    nextView: BusinessWorkspaceView,
  ) => {
    const next =
      new URLSearchParams(
        searchParams,
      );

    if (nextView === 'home') {
      next.delete('workspace');
    } else {
      next.set(
        'workspace',
        nextView,
      );
    }

    next.delete('adbn');

    setSearchParams(next);
  };

  const refreshAdbnTechConnection =
    async () => {
      if (adbnTechSessionBusy) {
        return;
      }

      setAdbnTechSessionBusy(true);
      setError('');

      try {
        setAdbnTechSessionEmail(
          getAdbnTechConnectedEmail(),
        );

        await load();
      } finally {
        setAdbnTechSessionBusy(false);
      }
    };

  const disconnectAdbnTechConnection =
    async () => {
      if (adbnTechSessionBusy) {
        return;
      }

      setAdbnTechSessionBusy(true);
      setError('');

      try {
        await disconnectAdbnTechReadOnly();
        setAdbnTechSessionEmail('');
      } catch {
        setError(
          'ADBN TECH could not be disconnected. Try again.',
        );
      } finally {
        setAdbnTechSessionBusy(false);
      }
    };

  const prepareAdbnTechConnection =
    async () => {
      if (
        !canManageAdbnTechConnection
        || integrationBusy
      ) {
        return;
      }

      setIntegrationBusy(true);
      setError('');

      try {
        await prepareAdbnTechIntegration(
          space.id,
        );

        setSpace(
          (current) =>
            current
              ? {
                  ...current,
                  externalIntegrationProvider:
                    'adbn_tech',
                  externalIntegrationStatus:
                    'prepared',
                  externalIntegrationKey:
                    'adbntech',
                }
              : current,
        );
      } catch {
        setError(
          'The ADBN TECH connection could not be prepared. Check your connection and try again.',
        );
      } finally {
        setIntegrationBusy(false);
      }
    };

  const businessActions: Array<{
    label: string;
    icon: string;
    to: string;
  }> = [];

  if (posRole === 'cashier') {
    businessActions.push(
      {
        label: 'Open Register',
        icon: '▦',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab=register',
      },
      {
        label: 'Customers',
        icon: '♙',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab=customers',
      },
      {
        label: 'Bookings',
        icon: '▤',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab=bookings',
      },
      {
        label: 'My Sales',
        icon: '↗',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab=sales',
      },
    );
  } else if (posRole === 'stock_staff') {
    businessActions.push({
      label:
        businessIndustry === 'marketplace'
          ? 'Listings & Stock'
          : 'Products & Stock',
      icon: '▤',
      to:
        '/spaces/'
        + space.id
        + '/pos?tab='
        + (
          businessIndustry === 'marketplace'
            ? 'listings'
            : 'products'
        ),
    });
  } else if (posRole === 'seller') {
    businessActions.push(
      {
        label: 'My Balance',
        icon: '▦',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab=balance',
      },
      {
        label: 'My Reports',
        icon: '▤',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab=reports',
      },
    );
  } else if (posRole === 'viewer') {
    businessActions.push(
      {
        label:
          businessIndustry === 'marketplace'
            ? 'View Listings'
            : 'View Products',
        icon: '▤',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab='
          + (
            businessIndustry === 'marketplace'
              ? 'listings'
              : 'products'
          ),
      },
      {
        label: 'View Customers',
        icon: '♙',
        to:
          '/spaces/'
          + space.id
          + '/pos?tab=customers',
      },
    );
  } else if (
    businessIndustry === 'marketplace'
  ) {
    // Marketplace Home already exposes POS, stock, sellers,
    // finance and reports in the workspace navigation.
    // Keep the Home action row empty so the operational
    // overview can use the full available width.
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
        </div>      </header>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <nav
        className="business-workspace-nav-v115"
        aria-label="Business workspace"
        data-business-workspace-nav
      >
        <button
          type="button"
          className={
            workspaceView === 'home'
              ? 'active'
              : ''
          }
          onClick={() =>
            setWorkspaceView('home')
          }
        >
          Home
        </button>

        {canManageAdbnTechConnection && (
          <>
            <button
              type="button"
              className={
                workspaceView === 'adbn_customers'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setWorkspaceView('adbn_customers')
              }
            >
              Customers
            </button>

            <button
              type="button"
              className={
                workspaceView === 'adbn_invoices'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setWorkspaceView('adbn_invoices')
              }
            >
              Invoices
            </button>

            <button
              type="button"
              className={
                workspaceView === 'adbn_payments'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setWorkspaceView('adbn_payments')
              }
            >
              Payments
            </button>

            <button
              type="button"
              className={
                workspaceView === 'adbn_purchases'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setWorkspaceView('adbn_purchases')
              }
            >
              Purchases
            </button>
          </>
        )}

        {posSettings && (
          <Link
            to={
              '/spaces/'
              + space.id
              + '/pos'
            }
          >
            POS
          </Link>
        )}

        {canAccessInventoryWorkspace && (
          <button
            type="button"
            className={
              workspaceView
                === 'inventory'
                ? 'active'
                : ''
            }
            onClick={() =>
              setWorkspaceView(
                'inventory',
              )
            }
          >
            Products & Stock
          </button>
        )}

        {canViewFinancials && (
          <button
            type="button"
            className={
              workspaceView
                === 'documents'
                ? 'active'
                : ''
            }
            onClick={() =>
              setWorkspaceView(
                'documents',
              )
            }
          >
            Sales & Documents
          </button>
        )}

        {canAccessSellersWorkspace && (
          <button
            type="button"
            className={
              workspaceView
                === 'sellers'
                ? 'active'
                : ''
            }
            onClick={() =>
              setWorkspaceView(
                'sellers',
              )
            }
          >
            Sellers
          </button>
        )}

        {canViewFinancials && (
          <button
            type="button"
            className={
              workspaceView
                === 'finance'
                ? 'active'
                : ''
            }
            onClick={() =>
              setWorkspaceView(
                'finance',
              )
            }
          >
            Finance
          </button>
        )}

        {(canViewFinancials
          || (
            canUseEmbeddedMarketplace
            && posRole === 'seller'
          ))
          && (
            <button
              type="button"
              className={
                workspaceView
                  === 'reports'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setWorkspaceView(
                  'reports',
                )
              }
            >
              Reports
            </button>
          )}

        {isOwner && (
          <button
            type="button"
            className={
              workspaceView
                === 'setup'
                ? 'active'
                : ''
            }
            onClick={() =>
              setWorkspaceView(
                'setup',
              )
            }
          >
            Business Setup
          </button>
        )}
      </nav>

      {workspaceView === 'adbn_customers'
        && canManageAdbnTechConnection
        ? (
          <AdbnTechMirrorWorkspace
            spaceId={space.id}
            view="customers"
          />
        )
        : workspaceView === 'adbn_invoices'
        && canManageAdbnTechConnection
        ? (
          <AdbnTechMirrorWorkspace
            spaceId={space.id}
            view="invoices"
            onFinancialSync={
              refreshBusinessTransactions
            }
          />
        )
        : workspaceView === 'adbn_payments'
        && canManageAdbnTechConnection
        ? (
          <AdbnTechPaymentsWorkspace
            spaceId={space.id}
            onFinancialSync={
              refreshBusinessTransactions
            }
          />
        )
        : workspaceView === 'adbn_purchases'
        && canManageAdbnTechConnection
        ? (
          <AdbnTechPurchasesWorkspace
            spaceId={space.id}
          />
        )
        : workspaceView === 'reports'
        && canViewFinancials
        ? (
          <BusinessReportsWorkspace
            spaceId={space.id}
            currency={space.currency}
            businessIndustry={businessIndustry}
          />
        )
        : workspaceView === 'setup'
        && isOwner
        ? (
          <section
            className="business-setup-workspace-v115"
            data-business-setup-workspace
          >
            <div className="business-home-v115-section-heading">
              <div>
                <span>Owner controls</span>
                <h2>Business Setup</h2>
              </div>
            </div>

            <p className="muted">
              Configure this Business without mixing setup tools into the day-to-day workspace. Existing owner-only security remains unchanged.
            </p>

            <div className="business-setup-grid-v115">
              <Link
                className="business-setup-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/pos/settings'
                }
              >
                <span>01</span>
                <div>
                  <strong>Staff & Roles</strong>
                  <small>
                    Invite staff, assign secure role templates and manage custom role labels.
                  </small>
                </div>
              </Link>

              <Link
                className="business-setup-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/business/setup'
                }
              >
                <span>02</span>
                <div>
                  <strong>Business Profile</strong>
                  <small>
                    Business identity, contact details, industry, invoice settings and tax defaults.
                  </small>
                </div>
              </Link>

              <Link
                className="business-setup-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/pos/settings'
                }
              >
                <span>03</span>
                <div>
                  <strong>POS Settings</strong>
                  <small>
                    POS mode, payment account, receipt details, staff access and operational settings.
                  </small>
                </div>
              </Link>

              <Link
                className="business-setup-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/business'
                }
              >
                <span>04</span>
                <div>
                  <strong>Workflow</strong>
                  <small>
                    Open the existing Business operations workspace for advanced workflow configuration.
                  </small>
                </div>
              </Link>

              <Link
                className="business-setup-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/business/guide'
                }
              >
                <span>05</span>
                <div>
                  <strong>Staff Guide</strong>
                  <small>
                    Practical instructions for staff using Business, inventory and POS tools.
                  </small>
                </div>
              </Link>
            </div>

            {canManageAdbnTechConnection && (
              <section
                className="panel adbn-tech-connection-v115"
                data-adbn-tech-connection
              >
              <div>
                <span className="eyebrow">
                  External business connection
                </span>

                <h3>
                  ADBN TECH
                </h3>

                <p className="muted">
                  Connection and integration controls live here. Customers, Invoices, Payments and Purchases remain normal Business navigation items.
                </p>

                {adbnTechPrepared && (
                  <small>
                    Connection Space ID: {space.id}
                  </small>
                )}
              </div>

              <div className="adbn-tech-connection-actions-v115">
                <span className="status-pill">
                  {adbnTechSessionEmail
                    ? 'Session connected'
                    : adbnTechConnected
                      ? 'Integration connected · session signed out'
                      : adbnTechPrepared
                        ? 'BajetBN side ready'
                        : 'Not prepared'}
                </span>

                <button
                  type="button"
                  className="button secondary"
                  disabled={adbnTechSessionBusy}
                  onClick={() =>
                    void refreshAdbnTechConnection()
                  }
                >
                  {adbnTechSessionBusy
                    ? 'Checking…'
                    : 'Refresh ADBN TECH'}
                </button>

                {adbnTechSessionEmail && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={adbnTechSessionBusy}
                    onClick={() =>
                      void disconnectAdbnTechConnection()
                    }
                  >
                    Disconnect ADBN TECH
                  </button>
                )}

                {!adbnTechPrepared && (
                  <button
                    type="button"
                    className="button primary"
                    disabled={integrationBusy}
                    onClick={() =>
                      void prepareAdbnTechConnection()
                    }
                  >
                    {integrationBusy
                      ? 'Preparing…'
                      : 'Prepare ADBN TECH connection'}
                  </button>
                )}

              </div>

                <small className="muted">
                  {adbnTechSessionEmail
                    ? 'Signed in to ADBN TECH as ' + adbnTechSessionEmail + '. '
                    : 'ADBN TECH session is currently signed out. '}
                  ADBN TECH remains the source of truth for mirrored operational records. Existing payment sync safeguards and account mappings are unchanged.
                </small>
              </section>
            )}

            <div className="notice">
              Custom role names still use the existing secure access templates. Granular combined permissions remain a separate future security redesign.
            </div>
          </section>
        )
        : workspaceView === 'finance'
        && canViewFinancials
        ? (
          <section
            className="business-finance-workspace-v115"
            data-business-finance-workspace
          >
            <div className="business-home-v115-section-heading">
              <div>
                <span>Business money</span>
                <h2>Finance</h2>
              </div>
            </div>

            <p className="muted">
              Accounts remain global financial containers. This Business only sees and uses the Global Business Accounts linked to it.
            </p>

            <div
              className="business-finance-nav-v115"
              aria-label="Business finance"
            >
              <button
                type="button"
                className={
                  financeView === 'accounts'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setFinanceView(
                    'accounts',
                  )
                }
              >
                Accounts
              </button>

              <Link
                to={
                  '/spaces/'
                  + space.id
                  + '/business/money'
                }
              >
                Money Activity
              </Link>

              <button
                type="button"
                className={
                  financeView === 'bills'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setFinanceView(
                    'bills',
                  )
                }
              >
                Bills & Expenses
              </button>

              <Link
                to={
                  '/spaces/'
                  + space.id
                  + '/business/accounting'
                }
              >
                Accounting
              </Link>

              <Link
                to={
                  '/spaces/'
                  + space.id
                  + '/business/tax'
                }
              >
                Tax
              </Link>

              <Link
                to={
                  '/spaces/'
                  + space.id
                  + '/business/payroll'
                }
              >
                Payroll
              </Link>
            </div>

            {financeView === 'accounts'
              ? (
                <AccountsPage
                  spaceIdOverride={space.id}
                  embedded
                />
              )
              : (
                <CommitmentsPage
                  spaceIdOverride={space.id}
                  embedded
                />
              )}
          </section>
        )
        : workspaceView === 'documents'
        && canViewFinancials
        ? (
          <section
            className="business-sales-documents-v115"
            data-business-sales-documents
          >
            <div className="business-home-v115-section-heading">
              <div>
                <span>Commercial flow</span>
                <h2>Sales & Documents</h2>
              </div>
            </div>

            <p className="muted">
              Move from quotation to invoice and payment without retyping customer or line-item details.
            </p>

            <div className="business-document-flow-v115">
              <Link
                className="business-document-flow-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/business/quotations'
                }
              >
                <span>1</span>
                <strong>Quotations</strong>
                <small>
                  Draft, send, accept and convert customer quotations.
                </small>
              </Link>

              <Link
                className="business-document-flow-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/business/sales-orders'
                }
              >
                <span>2</span>
                <strong>Sales Orders</strong>
                <small>
                  Confirm accepted customer work before invoicing.
                </small>
              </Link>

              <Link
                className="business-document-flow-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/business/invoices'
                }
              >
                <span>3</span>
                <strong>Invoices</strong>
                <small>
                  Issue invoices, track receivables and record payments.
                </small>
              </Link>

              <Link
                className="business-document-flow-card-v115"
                to={
                  '/spaces/'
                  + space.id
                  + '/business/invoices'
                }
              >
                <span>4</span>
                <strong>Payments</strong>
                <small>
                  Post invoice payments into linked Business Accounts.
                </small>
              </Link>
            </div>
          </section>
        )
        : workspaceView === 'inventory'
        && canUseEmbeddedStandard
        && canAccessInventoryWorkspace
        && posSettings
        ? (
          <section
            className="business-workspace-embedded-v115 business-standard-inventory-v115"
            data-business-standard-inventory
          >
            <div className="business-home-v115-section-heading">
              <div>
                <span>Inventory</span>
                <h2>Products & Stock</h2>
              </div>
            </div>

            <StandardPosWorkspace
              space={space}
              settings={posSettings}
              role={effectivePosRole}
              onChanged={load}
              embeddedManagementTab="products"
            />
          </section>
        )
        : workspaceView !== 'home'
        && canUseEmbeddedMarketplace
        && marketplaceWorkspaceTab
        ? (
          <section
            className="business-workspace-embedded-v115"
            data-business-workspace-embedded
          >
            <MarketplaceConsignmentPosWorkspace
              space={space}
              settings={posSettings}
              inventoryProfile={
                businessIndustry
                  === 'marketplace'
                  ? 'general'
                  : 'general'
              }
              role={effectivePosRole}
              onChanged={load}
              embeddedManagementTab={
                marketplaceWorkspaceTab
              }
              hideManagementTabs
            />
          </section>
        )
        : (
        <>

      {canViewFinancials ? (
        <section className="business-home-v115-hero">
          <div className="business-home-v115-hero-heading">
            <div>
              <span>All-time Business total</span>
              <small>
                Posted money in minus money out in this Business only
              </small>
            </div>

            <Link
              to={
                '/spaces/'
                + space.id
                + '/business/money'
              }
            >
              Money activity
            </Link>
          </div>

          <strong>
            {formatMoney(
              businessTransactionTotal,
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

            <div>
              <span>Net</span>
              <strong>
                {formatMoney(
                  monthNet,
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

      <div className={`business-home-v115-lower-layout${businessActions.length ? '' : ' no-actions'}`}>
        <div className="business-home-v115-lower-main">
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
            <section
              className="business-home-v115-section"
              data-business-activity-section
            >
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
                  Money activity
                </Link>
              </div>

              <p className="muted business-activity-intro-v115">
                Sales, documents, bookings, payouts and money movements in one timeline.
              </p>

              <BusinessActivityTimeline
                spaceId={space.id}
                businessIndustry={businessIndustry}
                transactions={transactions}
              />
            </section>
          )}
        </div>

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
      </div>
        </>
      )}
    </main>
  );
}
