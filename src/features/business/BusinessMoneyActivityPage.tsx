import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import { listAccountsForSpace } from '../../repositories/accountRepository';
import {
  reverseBusinessMoneyActivity,
  updateBusinessMoneyActivityDetails,
} from '../../repositories/businessMoneyActivityRepository';
import { listSpaceMembers } from '../../repositories/collaborationRepository';
import { getMySmePosAccess } from '../../repositories/smePosRepository';
import {
  getSpace,
  listSpaces,
} from '../../repositories/spaceRepository';
import {
  listBusinessTransactionsForSpace,
  postTransaction,
  type TransactionInput,
} from '../../repositories/transactionRepository';
import type {
  Account,
  FinancialTransaction,
  PaymentMethodCode,
  Space,
  TransactionCategory,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';
import {
  DEFAULT_TRANSACTION_CATEGORIES,
  categoryIconGlyph,
} from '../categories/defaultCategories';
import { MoneyActivityModal, MoneyScopeSwitch } from '../transactions/TransactionsPage';
import { AdbnTechSupplierPurchaseModal } from './AdbnTechSupplierPurchaseModal';

type PrimaryType = 'income' | 'expense' | 'transfer';
type TypeFilter = 'all' | PrimaryType;
type StatusFilter = 'all' | 'posted' | 'reversed';
type PeriodFilter =
  | 'current_month'
  | 'last_month'
  | 'current_year'
  | 'all'
  | 'custom';

const typeLabels = {
  income: 'Money in',
  expense: 'Money out',
  transfer: 'Move money',
  reversal: 'Undo',
} as const;

const statusLabels = {
  posted: 'Saved',
  reversed: 'Undone',
} as const;

const paymentMethods: PaymentMethodCode[] = [
  'bank_transfer',
  'cash',
  'debit_card',
  'credit_card',
  'e_wallet',
  'qr_payment',
  'bank_deposit',
  'cheque',
  'other',
];

function dateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((item) => [item.type, item.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addMonths(yyyyMmDd: string, offset: number): string {
  const year = Number(yyyyMmDd.slice(0, 4));
  const month = Number(yyyyMmDd.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function transactionTimestampMillis(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;

  const timestamp = value as {
    toMillis?: () => number;
    seconds?: number | string;
    _seconds?: number | string;
  };

  if (typeof timestamp.toMillis === 'function') {
    return Number(timestamp.toMillis()) || 0;
  }

  return Number(timestamp.seconds ?? timestamp._seconds ?? 0) * 1000;
}

function transactionCategorySnapshot(
  item: FinancialTransaction,
): TransactionCategory {
  const kind =
    item.originalType === 'income'
    || item.type === 'income'
      ? 'income'
      : 'expense';

  return {
    id: item.categoryId || `business-history-${item.id}`,
    ownerId: null,
    name: item.category || typeLabels[item.type],
    kind,
    scope: item.categoryScope || 'business',
    icon:
      item.categoryIcon
      || (
        item.type === 'transfer'
          ? 'transfer'
          : item.type === 'reversal'
            ? 'reversal'
            : 'dots'
      ),
    color: item.categoryColor || 'slate',
    isSystem: !item.categoryId?.startsWith('custom-'),
    archivedAt: null,
  };
}

function managedSourceLabel(item: FinancialTransaction): string | null {
  const linked =
    item as FinancialTransaction
    & Record<string, unknown>;

  if (
    linked.smePosSaleId
    || linked.posSaleId
    || linked.smePosReturnId
    || linked.smePosPayoutId
    || linked.reservationId
  ) {
    return 'Marketplace / POS';
  }

  if (
    item.businessInvoiceId
    || item.businessInvoicePaymentId
  ) {
    return 'Business invoice';
  }

  if (
    item.commitmentId
    || item.commitmentPaymentId
    || item.sharedBillAssignmentId
    || item.sharedBillPaymentId
  ) {
    return 'Bill / instalment';
  }

  if (
    item.recurringTemplateId
    || item.recurringRunId
  ) {
    return 'Recurring money';
  }

  if (item.spaceWorkItemId) {
    return 'Space work item';
  }

  if (
    (item.labels || [])
      .some(
        (label) =>
          label.toLowerCase() === 'adbn_purchase',
      )
  ) {
    return 'ADBN TECH supplier purchase';
  }

  return null;
}

function correctionInput(
  item: FinancialTransaction,
): TransactionInput | null {
  if (
    item.type !== 'income'
    && item.type !== 'expense'
  ) {
    return null;
  }

  return {
    type: item.type,
    accountId: item.accountId,
    spaceId: item.spaceId,
    amountMinor: item.amountMinor,
    currency: item.currency,
    transactionDate: item.transactionDate,
    categoryId: item.categoryId,
    category: item.category,
    categoryIcon: item.categoryIcon,
    categoryColor: item.categoryColor,
    categoryScope: item.categoryScope,
    counterparty: item.counterparty,
    note: item.note,
    labels: item.labels || [],
    paymentMethod: item.paymentMethod || undefined,
    paymentMethodLabel: item.paymentMethodLabel || undefined,
  };
}

export function BusinessMoneyActivityPage() {
  const { user, profile } = useAuth();
  const { online } = useOfflineSync();
  const { spaceId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedAccountId = searchParams.get('accountId') || 'all';

  const [space, setSpace] = useState<Space | null>(null);
  const [businessSpaces, setBusinessSpaces] = useState<Space[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] =
    useState<FinancialTransaction[]>([]);
  const [canView, setCanView] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canRequestTransfer, setCanRequestTransfer] =
    useState(false);
  const [requestMoveOnly, setRequestMoveOnly] =
    useState(false);
  const [accessLabel, setAccessLabel] = useState('Member');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilter>('current_month');
  const [accountFilter, setAccountFilter] = useState(requestedAccountId);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState('all');
  const [search, setSearch] = useState('');

  const timezone = profile?.timezone || 'Asia/Brunei';
  const today = dateInTimezone(timezone);
  const [customFrom, setCustomFrom] =
    useState(`${today.slice(0, 8)}01`);
  const [customTo, setCustomTo] = useState(today);

  const [showAdd, setShowAdd] = useState(false);
  const [
    showSupplierPurchase,
    setShowSupplierPurchase,
  ] = useState(false);
  const [detail, setDetail] =
    useState<FinancialTransaction | null>(null);
  const [editItem, setEditItem] =
    useState<FinancialTransaction | null>(null);
  const [correctionDraft, setCorrectionDraft] =
    useState<TransactionInput | null>(null);
  const [reverseDialog, setReverseDialog] =
    useState<ActionConfirmState<FinancialTransaction> | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);

  const writableAccounts =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            !account.archivedAt
            && !account.closedAt
            && account.sharedCanUseAccount
              !== false,
        ),
      [accounts],
    );

  const load = useCallback(async () => {
    if (!user || !spaceId) return;

    setLoading(true);
    setError('');

    try {
      const nextSpace = await getSpace(spaceId);

      if (!nextSpace || nextSpace.type !== 'sme') {
        setSpace(null);
        setCanView(false);
        setCanManage(false);
        setCanRequestTransfer(false);
        return;
      }

      setSpace(nextSpace);

      const accessibleSpaces =
        await listSpaces(user.uid);

      setBusinessSpaces(
        accessibleSpaces
          .filter(
            (item) =>
              item.type === 'sme'
              && !item.archivedAt,
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name),
          ),
      );

      const members =
        await listSpaceMembers(spaceId);

      const currentMember =
        members.find(
          (member) =>
            member.uid === user.uid
            && (member.status || 'active') === 'active',
        ) || null;

      const posAccess =
        nextSpace.ownerId === user.uid
          ? null
          : await getMySmePosAccess(
              spaceId,
              user.uid,
            ).catch(() => null);

      const isOwner =
        nextSpace.ownerId === user.uid;

      const isAdmin =
        currentMember?.role === 'admin';

      const isManager =
        posAccess?.status === 'active'
        && posAccess.role === 'manager';

      const nextCanManage =
        isOwner || isAdmin;

      const nextCanView =
        nextCanManage || isManager;

      setCanManage(nextCanManage);
      setCanRequestTransfer(
        Boolean(isManager),
      );
      setCanView(Boolean(nextCanView));
      setAccessLabel(
        isOwner
          ? 'Owner'
          : isAdmin
            ? 'Admin'
            : isManager
              ? 'Manager'
              : 'Member',
      );

      if (!nextCanView) {
        setAccounts([]);
        setTransactions([]);
        setCanRequestTransfer(false);
        return;
      }

      const [nextAccounts, nextTransactions] =
        await Promise.all([
          listAccountsForSpace(spaceId),
          listBusinessTransactionsForSpace(spaceId),
        ]);

      setAccounts(
        nextAccounts.sort(
          (a, b) =>
            a.name.localeCompare(b.name),
        ),
      );

      setTransactions(nextTransactions);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void load();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (requestedAccountId !== 'all') setAccountFilter(requestedAccountId);
  }, [requestedAccountId]);

  useEffect(() => {
    if (
      searchParams.get('quick') !== '1'
      || loading
      || !canManage
      || writableAccounts.length === 0
    ) {
      return;
    }

    setShowAdd(true);

    const next =
      new URLSearchParams(
        searchParams,
      );

    next.delete('quick');

    setSearchParams(
      next,
      { replace: true },
    );
  }, [
    canManage,
    loading,
    searchParams,
    setSearchParams,
    writableAccounts.length,
  ]);

  const allCategories = useMemo(() => {
    const map =
      new Map<string, TransactionCategory>();

    DEFAULT_TRANSACTION_CATEGORIES
      .filter(
        (category) =>
          category.scope === 'business'
          || category.scope === 'both',
      )
      .forEach(
        (category) =>
          map.set(category.id, category),
      );

    transactions.forEach((item) => {
      const category =
        transactionCategorySnapshot(item);

      if (!map.has(category.id)) {
        map.set(category.id, category);
      }
    });

    return [...map.values()]
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name),
      );
  }, [transactions]);

  const categoryMap = useMemo(
    () =>
      new Map(
        allCategories.map(
          (category) =>
            [category.id, category],
        ),
      ),
    [allCategories],
  );

  const accountMap = useMemo(
    () =>
      new Map(
        accounts.map(
          (account) =>
            [account.id, account],
        ),
      ),
    [accounts],
  );

  const availableLabels = useMemo(
    () =>
      Array.from(
        new Set(
          transactions.flatMap(
            (item) =>
              item.labels || [],
          ),
        ),
      ).sort((a, b) =>
        a.localeCompare(b),
      ),
    [transactions],
  );

  const periodWindow = useMemo(() => {
    if (periodFilter === 'all') {
      return {
        from: '0000-01-01',
        to: '9999-12-31',
        label: 'All time',
      };
    }

    if (periodFilter === 'custom') {
      return {
        from: customFrom,
        to: customTo,
        label: `${customFrom} to ${customTo}`,
      };
    }

    if (periodFilter === 'current_year') {
      return {
        from: `${today.slice(0, 4)}-01-01`,
        to: `${today.slice(0, 4)}-12-31`,
        label: 'This year',
      };
    }

    const month =
      periodFilter === 'last_month'
        ? addMonths(today, -1)
        : today.slice(0, 7);

    const monthDate =
      new Date(
        Date.UTC(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0,
        ),
      );

    const lastDay =
      String(
        monthDate.getUTCDate(),
      ).padStart(2, '0');

    return {
      from: `${month}-01`,
      to: `${month}-${lastDay}`,
      label:
        periodFilter === 'last_month'
          ? 'Last month'
          : 'This month',
    };
  }, [
    customFrom,
    customTo,
    periodFilter,
    today,
  ]);

  const periodRows = useMemo(
    () =>
      transactions.filter(
        (item) =>
          item.transactionDate
            >= periodWindow.from
          && item.transactionDate
            <= periodWindow.to,
      ),
    [
      periodWindow.from,
      periodWindow.to,
      transactions,
    ],
  );

  const summaryRows =
    periodRows.filter(
      (item) =>
        item.status === 'posted'
        && item.type !== 'reversal',
    );

  const moneyIn =
    summaryRows
      .filter(
        (item) =>
          item.type === 'income',
      )
      .reduce(
        (sum, item) =>
          sum + item.amountMinor,
        0,
      );

  const moneyOut =
    summaryRows
      .filter(
        (item) =>
          item.type === 'expense',
      )
      .reduce(
        (sum, item) =>
          sum + item.amountMinor,
        0,
      );

  const transferCount =
    summaryRows.filter(
      (item) =>
        item.type === 'transfer',
    ).length;

  const visibleRows = useMemo(() => {
    const needle =
      search.trim().toLowerCase();

    return periodRows.filter((item) => {
      if (
        typeFilter !== 'all'
        && item.type !== typeFilter
      ) {
        return false;
      }

      if (
        statusFilter !== 'all'
        && item.status !== statusFilter
      ) {
        return false;
      }

      if (
        accountFilter !== 'all'
        && item.accountId !== accountFilter
        && item.destinationAccountId
          !== accountFilter
      ) {
        return false;
      }

      if (
        categoryFilter !== 'all'
        && item.categoryId !== categoryFilter
      ) {
        return false;
      }

      if (
        labelFilter !== 'all'
        && !(item.labels || [])
          .includes(labelFilter)
      ) {
        return false;
      }

      if (!needle) return true;

      return [
        item.category,
        item.counterparty,
        item.note,
        item.accountId,
        item.destinationAccountId,
        ...(item.labels || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [
    accountFilter,
    categoryFilter,
    labelFilter,
    periodRows,
    search,
    statusFilter,
    typeFilter,
  ]);

  const sortedRows =
    [...visibleRows].sort(
      (a, b) => {
        const dateCompare =
          b.transactionDate.localeCompare(
            a.transactionDate,
          );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return (
          transactionTimestampMillis(
            b.postedAt,
          )
          - transactionTimestampMillis(
            a.postedAt,
          )
        );
      },
    );

  async function handleReverse() {
    if (!reverseDialog) return;

    setReverseBusy(true);
    setError('');

    try {
      await reverseBusinessMoneyActivity({
        transactionId:
          reverseDialog.payload.id,
        transactionDate: today,
        reason:
          'Deleted / undone from Business Money Activity.',
      });

      setReverseDialog(null);
      setDetail(null);
      setFeedback(
        'Money activity was undone. The Business Account, ledger and reports were updated.',
      );
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setReverseBusy(false);
    }
  }

  async function startCorrection(
    item: FinancialTransaction,
  ) {
    const source =
      managedSourceLabel(item);

    if (source) {
      setError(
        `This record is managed by ${source}. Change it from that original workflow.`,
      );
      return;
    }

    const draft =
      correctionInput(item);

    if (!draft) {
      setError(
        'Transfers cannot be corrected from this Business Space yet. Undo the transfer and add the correct record.',
      );
      return;
    }

    setReverseBusy(true);
    setError('');

    try {
      await reverseBusinessMoneyActivity({
        transactionId: item.id,
        transactionDate: today,
        reason:
          'Corrected from Business Money Activity.',
      });

      setDetail(null);
      setCorrectionDraft(draft);
      setFeedback(
        'Original activity was undone. Review the replacement before saving.',
      );
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setReverseBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading Business Money Activity...
        </div>
      </main>
    );
  }

  if (!space) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business money"
          title="Business Space not found"
          description="This Business Space is not available."
        />
        <Link
          className="button secondary"
          to="/spaces"
        >
          Back to Spaces
        </Link>
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business money"
          title={`${space.name} - Money activity`}
          description="Money activity is limited to authorised Business financial roles."
          action={
            <Link
              className="button secondary"
              to={`/spaces/${space.id}`}
            >
              Back to Business
            </Link>
          }
        />
        <div className="notice warning">
          Your current Business role does not have access to this financial workspace.
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <PageHeader
        eyebrow="Business money"
        title={`${space.name} - Money activity`}
        description="The same Money Activity workspace, locked to this Business Space only."
        action={
          <div className="header-actions">
            <Link
              className="button secondary"
              to={`/spaces/${space.id}`}
            >
              Back to Business
            </Link>

            <Link
              className="button secondary"
              to={`/spaces/${space.id}?section=reports`}
            >
              Business money reports
            </Link>

            {canManage
              && space.externalIntegrationProvider === 'adbn_tech'
              && space.externalIntegrationStatus === 'connected'
              && (
                <button
                  className="button secondary"
                  type="button"
                  disabled={
                    !online
                    || writableAccounts.length === 0
                  }
                  onClick={() =>
                    setShowSupplierPurchase(true)
                  }
                >
                  + Supplier purchase
                </button>
              )}

            {canManage && (
              <button
                className="button primary"
                type="button"
                disabled={
                  !online
                  || writableAccounts.length === 0
                }
                onClick={() => {
                  setRequestMoveOnly(false);
                  setShowAdd(true);
                }}
              >
                + Add money activity
              </button>
            )}

            {!canManage
              && canRequestTransfer
              && (
                <button
                  className="button primary"
                  type="button"
                  disabled={
                    !online
                    || writableAccounts.length < 2
                  }
                  onClick={() => {
                    setRequestMoveOnly(true);
                    setShowAdd(true);
                  }}
                >
                  Request money move
                </button>
              )}
          </div>
        }
      />

      <MoneyScopeSwitch mode="business" businessSpaces={businessSpaces.length ? businessSpaces : [space]} currentBusinessId={space.id} />

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {feedback && (
        <div className="notice success">
          {feedback}
        </div>
      )}

      {canManage
        && accounts.length > 0
        && writableAccounts.length === 0
        && (
          <div className="notice warning">
            You can view Business accounts here, but none are shared with permission to post money activity. Ask the Business owner to enable Can use account for at least one account.
          </div>
        )}

      <div className="info-banner">
        <strong>
          Business ledger only.
        </strong>
        <span>
          Only {space.name} records are shown here.
          Marketplace Reports remain separate POS operational reports,
          so sales, seller earnings, commissions and payouts can differ
          from ledger Money Activity totals.
        </span>
      </div>

      <div className="transaction-account-scope">
        <span>Business Space</span>
        <strong>
          {space.name} - {accessLabel}
        </strong>
      </div>

      <section className="transaction-summary">
        <div>
          <span>Money in</span>
          <strong className="money-positive">
            {formatMoney(
              moneyIn,
              space.currency,
            )}
          </strong>
          <small>{periodWindow.label}</small>
        </div>

        <div>
          <span>Money out</span>
          <strong className="money-negative">
            {formatMoney(
              moneyOut,
              space.currency,
            )}
          </strong>
          <small>{periodWindow.label}</small>
        </div>

        <div>
          <span>Net</span>
          <strong>
            {formatMoney(
              moneyIn - moneyOut,
              space.currency,
            )}
          </strong>
          <small>
            Money in minus money out
          </small>
        </div>

        <div>
          <span>Money moves</span>
          <strong>{transferCount}</strong>
          <small>{periodWindow.label}</small>
        </div>
      </section>

      <section className="transaction-toolbar transaction-toolbar-expanded">
        <div
          className="segmented-control"
          role="group"
          aria-label="Business transaction type filter"
        >
          {(
            [
              'all',
              'income',
              'expense',
              'transfer',
            ] as const
          ).map((value) => (
            <button
              key={value}
              type="button"
              className={
                typeFilter === value
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setTypeFilter(value)
              }
            >
              {value === 'all'
                ? 'All'
                : typeLabels[value]}
            </button>
          ))}
        </div>

        <input
          className="transaction-search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search category, #label, account or payee..."
        />

        <div className="transaction-filter-grid">
          <label>
            Period
            <select
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(
                  event.target.value as PeriodFilter,
                )
              }
            >
              <option value="current_month">
                This month
              </option>
              <option value="last_month">
                Last month
              </option>
              <option value="current_year">
                This year
              </option>
              <option value="all">
                All time
              </option>
              <option value="custom">
                Custom
              </option>
            </select>
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as StatusFilter,
                )
              }
            >
              <option value="all">
                All statuses
              </option>
              <option value="posted">
                Saved
              </option>
              <option value="reversed">
                Undone
              </option>
            </select>
          </label>

          <label>
            Account
            <select
              value={accountFilter}
              onChange={(event) =>
                setAccountFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                All Business Accounts
              </option>
              {accounts.map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Category
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                All categories
              </option>
              {allCategories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            Label
            <select
              value={labelFilter}
              onChange={(event) =>
                setLabelFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                All labels
              </option>
              {availableLabels.map(
                (label) => (
                  <option
                    key={label.toLowerCase()}
                    value={label}
                  >
                    #{label}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {periodFilter === 'custom' && (
          <div className="form-grid">
            <label>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(event) =>
                  setCustomFrom(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              To
              <input
                type="date"
                value={customTo}
                onChange={(event) =>
                  setCustomTo(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
        )}
      </section>

      {sortedRows.length === 0 ? (
        <EmptyState
          title="No matching Business money activity"
          description="Change the filters or add a new Business money record."
          action={
            (
              canManage
              && writableAccounts.length > 0
            )
            || (
              !canManage
              && canRequestTransfer
              && writableAccounts.length >= 2
            )
              ? (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    setRequestMoveOnly(
                      !canManage,
                    );
                    setShowAdd(true);
                  }}
                >
                  {canManage
                    ? 'Add money activity'
                    : 'Request money move'}
                </button>
              )
              : undefined
          }
        />
      ) : (
        <section className="transaction-list">
          {sortedRows.map((item) => {
            const source =
              accountMap.get(
                item.accountId,
              );

            const destination =
              item.destinationAccountId
                ? accountMap.get(
                    item.destinationAccountId,
                  )
                : undefined;

            const category =
              item.categoryId
                ? (
                  categoryMap.get(
                    item.categoryId,
                  )
                  || transactionCategorySnapshot(
                    item,
                  )
                )
                : transactionCategorySnapshot(
                    item,
                  );

            const isIncome =
              item.type === 'income';

            const isExpense =
              item.type === 'expense';

            return (
              <article
                className={
                  `transaction-row ${
                    item.status === 'reversed'
                      ? 'reversed'
                      : ''
                  }`
                }
                key={item.id}
              >
                <span
                  className={
                    `category-icon category-${category.color}`
                  }
                >
                  {categoryIconGlyph(
                    category.icon,
                  )}
                </span>

                <div className="transaction-main">
                  <div>
                    <h2>
                      {item.category
                        || typeLabels[item.type]}
                    </h2>

                    <p>
                      {item.counterparty
                        || item.note
                        || typeLabels[item.type]}
                    </p>

                    {(item.labels || [])
                      .length > 0 && (
                      <div className="transaction-label-list compact">
                        {(item.labels || [])
                          .map((label) => (
                            <span
                              className="transaction-label-chip"
                              key={
                                `${item.id}-${label.toLowerCase()}`
                              }
                            >
                              #{label}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="transaction-context">
                  <strong>
                    {space.name}
                  </strong>
                  <small>
                    {source?.name
                      || 'Business Account'}
                    {destination
                      ? ` -> ${destination.name}`
                      : ''}
                  </small>
                </div>

                <div className="transaction-amount">
                  <strong
                    className={
                      isIncome
                        ? 'money-positive'
                        : isExpense
                          ? 'money-negative'
                          : ''
                    }
                  >
                    {isIncome
                      ? '+'
                      : isExpense
                        ? '-'
                        : ''}
                    {formatMoney(
                      item.amountMinor,
                      item.currency,
                    )}
                  </strong>
                  <small>
                    {item.transactionDate}
                  </small>
                </div>

                <div className="transaction-status">
                  <span
                    className={
                      `status-badge ${item.status}`
                    }
                  >
                    {statusLabels[
                      item.status
                    ]}
                  </span>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setDetail(item)
                    }
                  >
                    Details
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showSupplierPurchase && (
        <AdbnTechSupplierPurchaseModal
          space={space}
          accounts={writableAccounts}
          online={online}
          onClose={() =>
            setShowSupplierPurchase(false)
          }
          onComplete={async (message) => {
            setShowSupplierPurchase(false);
            setFeedback(message);
            await load();
          }}
        />
      )}

      {showAdd && (
        <MoneyActivityModal
          accounts={writableAccounts}
          spaces={[space]}
          categories={allCategories}
          labelSuggestions={availableLabels}
          timezone={timezone}
          online={online}
          entryMode={
            requestMoveOnly
              ? 'move'
              : undefined
          }
          scopeControls={<MoneyScopeSwitch mode="business" businessSpaces={businessSpaces.length ? businessSpaces : [space]} currentBusinessId={space.id} compact />}
          lockedSpaceId={space.id}
          onClose={() => {
            setShowAdd(false);
            setRequestMoveOnly(false);
          }}
          onSubmit={postTransaction}
          onComplete={async (
            message,
            refresh,
          ) => {
            setShowAdd(false);
            setRequestMoveOnly(false);
            setFeedback(message);
            if (refresh) {
              await load();
            }
          }}
        />
      )}

      {correctionDraft && (
        <MoneyActivityModal
          accounts={writableAccounts}
          spaces={[space]}
          categories={allCategories}
          labelSuggestions={availableLabels}
          timezone={timezone}
          online={online}
          initialValues={correctionDraft}
          lockedSpaceId={space.id}
          onClose={() => {
            setCorrectionDraft(null);
            setFeedback(
              'Original activity remains undone. Add a replacement later if needed.',
            );
          }}
          onSubmit={postTransaction}
          onComplete={async (
            message,
            refresh,
          ) => {
            setCorrectionDraft(null);
            setFeedback(
              `Correction saved. ${message}`,
            );
            if (refresh) {
              await load();
            }
          }}
        />
      )}

      {detail && (
        <BusinessMoneyDetailsModal
          item={detail}
          accountMap={accountMap}
          canManage={canManage}
          online={online}
          busy={reverseBusy}
          onClose={() =>
            setDetail(null)
          }
          onEdit={() =>
            setEditItem(detail)
          }
          onCorrect={() =>
            void startCorrection(
              detail,
            )
          }
          onReverse={() => {
            setError('');
            setReverseDialog({
              payload: detail,
              title:
                'Delete / undo this Business activity?',
              description:
                'BajetBN will reverse the financial effect instead of erasing ledger history.',
              note:
                'The Business Account, ledger, budgets and money reports will be updated. Managed POS, payroll, invoice, bill and recurring records must be changed from their original workflow.',
              confirmLabel:
                'Delete / undo activity',
              tone: 'danger',
            });
          }}
        />
      )}

      {editItem && (
        <BusinessMoneyEditModal
          item={editItem}
          online={online}
          onClose={() =>
            setEditItem(null)
          }
          onSaved={async () => {
            setEditItem(null);
            setDetail(null);
            setFeedback(
              'Business money activity details updated.',
            );
            await load();
          }}
        />
      )}

      {reverseDialog && (
        <ActionConfirmModal
          state={reverseDialog}
          busy={reverseBusy}
          error={error}
          onClose={() => {
            if (!reverseBusy) {
              setReverseDialog(null);
              setError('');
            }
          }}
          onConfirm={() =>
            void handleReverse()
          }
        />
      )}
    </main>
  );
}

function BusinessMoneyDetailsModal({
  item,
  accountMap,
  canManage,
  online,
  busy,
  onClose,
  onEdit,
  onCorrect,
  onReverse,
}: {
  item: FinancialTransaction;
  accountMap: Map<string, Account>;
  canManage: boolean;
  online: boolean;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCorrect: () => void;
  onReverse: () => void;
}) {
  const source =
    accountMap.get(item.accountId);

  const destination =
    item.destinationAccountId
      ? accountMap.get(
          item.destinationAccountId,
        )
      : undefined;

  const managedSource =
    managedSourceLabel(item);

  const canChange =
    canManage
    && online
    && !busy
    && item.status === 'posted'
    && item.type !== 'reversal'
    && !managedSource;

  return (
    <Modal
      title="Business money activity details"
      onClose={onClose}
    >
      <div className="transaction-detail-hero">
        <strong>
          {item.category
            || typeLabels[item.type]}
        </strong>

        <strong
          className={
            item.type === 'income'
              ? 'money-positive'
              : item.type === 'expense'
                ? 'money-negative'
                : ''
          }
        >
          {item.type === 'income'
            ? '+'
            : item.type === 'expense'
              ? '-'
              : ''}
          {formatMoney(
            item.amountMinor,
            item.currency,
          )}
        </strong>

        <span
          className={
            `status-badge ${item.status}`
          }
        >
          {statusLabels[item.status]}
        </span>
      </div>

      {managedSource && (
        <div className="notice warning">
          <strong>
            Managed by {managedSource}
          </strong>
          <span>
            This financial record is linked to another BajetBN workflow.
            Open that source to change the underlying record safely.
          </span>
        </div>
      )}

      <dl className="detail-list">
        <div>
          <dt>Type</dt>
          <dd>
            {item.type === 'reversal'
              && item.originalType
                ? `Undo of ${
                  typeLabels[
                    item.originalType
                  ]
                }`
                : typeLabels[item.type]}
          </dd>
        </div>

        <div>
          <dt>Date</dt>
          <dd>{item.transactionDate}</dd>
        </div>

        <div>
          <dt>Account</dt>
          <dd>
            {source?.name
              || 'Business Account'}
            {destination
              ? ` -> ${destination.name}`
              : ''}
          </dd>
        </div>

        <div>
          <dt>Payee / source</dt>
          <dd>
            {item.counterparty || '-'}
          </dd>
        </div>

        <div>
          <dt>Payment method</dt>
          <dd>
            {item.paymentMethod
              || '-'}
          </dd>
        </div>

        <div>
          <dt>Note</dt>
          <dd>{item.note || '-'}</dd>
        </div>

        <div>
          <dt>Labels</dt>
          <dd>
            {(item.labels || [])
              .length
                ? (item.labels || [])
                  .map(
                    (label) =>
                      `#${label}`,
                  )
                  .join(', ')
                : '-'}
          </dd>
        </div>
      </dl>

      <div className="modal-actions">
        <button
          className="button secondary"
          type="button"
          onClick={onClose}
        >
          Close
        </button>

        {canChange && (
          <button
            className="button secondary"
            type="button"
            onClick={onEdit}
          >
            Edit details
          </button>
        )}

        {canChange && (
          <button
            className="button secondary"
            type="button"
            onClick={onCorrect}
          >
            Correct transaction
          </button>
        )}

        {canChange && (
          <button
            className="button danger"
            type="button"
            onClick={onReverse}
          >
            Delete / undo
          </button>
        )}
      </div>
    </Modal>
  );
}

function BusinessMoneyEditModal({
  item,
  online,
  onClose,
  onSaved,
}: {
  item: FinancialTransaction;
  online: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [counterparty, setCounterparty] =
    useState(
      item.counterparty || '',
    );
  const [note, setNote] =
    useState(item.note || '');
  const [labelDraft, setLabelDraft] =
    useState(
      (item.labels || [])
        .map((label) => `#${label}`)
        .join(', '),
    );
  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    item.paymentMethod || '',
  );
  const [
    paymentMethodLabel,
    setPaymentMethodLabel,
  ] = useState(
    item.paymentMethod === 'other'
      ? item.paymentMethodLabel || ''
      : '',
  );
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState('');

  function labels(): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    labelDraft
      .split(',')
      .forEach((part) => {
        const label =
          part
            .trim()
            .replace(/^#+/, '')
            .replace(/\s+/g, '')
            .replace(
              /[^a-zA-Z0-9._-]/g,
              '',
            )
            .slice(0, 32);

        if (!label) return;

        const key =
          label.toLowerCase();

        if (seen.has(key)) return;

        seen.add(key);
        result.push(label);
      });

    return result.slice(0, 8);
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (busy || !online) return;

    setBusy(true);
    setError('');

    try {
      await updateBusinessMoneyActivityDetails({
        transactionId: item.id,
        counterparty:
          counterparty.trim(),
        note: note.trim(),
        labels: labels(),
        paymentMethod:
          paymentMethod
            ? paymentMethod as PaymentMethodCode
            : null,
        paymentMethodLabel:
          paymentMethod === 'other'
            ? paymentMethodLabel.trim()
            : null,
      });

      await onSaved();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit Business money details"
      onClose={onClose}
    >
      <form
        className="transaction-form"
        onSubmit={submit}
      >
        <div className="info-banner">
          <strong>
            Safe details only
          </strong>
          <span>
            Amount, Account, Business Space, date, category and transaction type stay locked.
            Use Correct transaction when one of those financial fields is wrong.
          </span>
        </div>

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <label>
          Payee / source
          <input
            value={counterparty}
            onChange={(event) =>
              setCounterparty(
                event.target.value,
              )
            }
            maxLength={120}
          />
        </label>

        <div className="form-grid">
          <label>
            Payment method
            <select
              value={paymentMethod}
              onChange={(event) => {
                setPaymentMethod(
                  event.target.value,
                );
                if (
                  event.target.value
                  !== 'other'
                ) {
                  setPaymentMethodLabel('');
                }
              }}
            >
              <option value="">
                Not set
              </option>
              {paymentMethods.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value.replace(/_/g, ' ')}
                  </option>
                ),
              )}
            </select>
          </label>

          {paymentMethod === 'other' && (
            <label>
              Other payment method
              <input
                value={paymentMethodLabel}
                onChange={(event) =>
                  setPaymentMethodLabel(
                    event.target.value,
                  )
                }
                maxLength={80}
              />
            </label>
          )}
        </div>

        <label>
          Labels
          <input
            value={labelDraft}
            onChange={(event) =>
              setLabelDraft(
                event.target.value,
              )
            }
            placeholder="#Shop, #Rental"
            maxLength={280}
          />
        </label>

        <label>
          Note
          <textarea
            rows={3}
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
            maxLength={500}
          />
        </label>

        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="button primary"
            disabled={
              busy || !online
            }
          >
            {busy
              ? 'Saving...'
              : 'Save details'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
