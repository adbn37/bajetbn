import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import { suggestedPaymentMethod } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_TRANSACTION_CATEGORIES, categoryIconGlyph } from '../categories/defaultCategories';
import {
  listAccounts,
  listAccountsForSpace,
} from '../../repositories/accountRepository';
import { listCustomCategories } from '../../repositories/categoryRepository';
import {
  createCommitment,
  getSpaceCommitmentWorkspace,
  listAllCommitments,
  listCommitmentPayments,
  payCommitment,
  requestBusinessCommitmentPayment,
  updateCommitment,
} from '../../repositories/commitmentRepository';
import { manageCommitment } from '../../repositories/lifecycleRepository';
import {
  getSpace,
  listSpaces,
} from '../../repositories/spaceRepository';
import type { Account, Commitment, CommitmentFrequency, CommitmentPayment, CommitmentType, PaymentMethodCode, Space, TransactionCategory } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { shareBillToWhatsApp } from '../../services/billShare';
import { formatMoney, toMinorUnits } from '../../utils/money';

type CommitmentLifecycleAction = 'stop' | 'delete';

function today() { return new Date().toISOString().slice(0, 10); }
const dueLabels = { completed: 'Finished', overdue: 'Overdue', due: 'Due today', upcoming: 'Coming up' } as const;
const frequencyLabels: Record<CommitmentFrequency, string> = { once: 'One time', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly' };
function dueState(item: Commitment): 'completed' | 'overdue' | 'due' | 'upcoming' { if (item.status === 'completed') return 'completed'; const due = item.nextDueDate || item.startDate; const now = today(); if (due < now) return 'overdue'; if (due === now) return 'due'; return 'upcoming'; }

export function CommitmentsPage({
  spaceIdOverride,
  embedded = false,
  typeOverride,
}: {
  spaceIdOverride?: string;
  embedded?: boolean;
  typeOverride?: CommitmentType;
} = {}) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Commitment[]>([]); const [payments, setPayments] = useState<CommitmentPayment[]>([]); const [accounts, setAccounts] = useState<Account[]>([]); const [spaces, setSpaces] = useState<Space[]>([]); const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [editing, setEditing] = useState<Commitment | null>(null); const [paying, setPaying] = useState<Commitment | null>(null); const [showForm, setShowForm] = useState(false); const [typeFilter, setTypeFilter] = useState<'all' | CommitmentType>(typeOverride || 'all'); const [commitmentStatusFilter, setCommitmentStatusFilter] = useState<'all' | 'upcoming' | 'due' | 'overdue' | 'completed'>('all'); const [busyId, setBusyId] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [lifecycleDialog, setLifecycleDialog] = useState<LifecycleConfirmState<Commitment, CommitmentLifecycleAction> | null>(null);
  const load = async () => {
    if (!user) return;

    setError('');

    try {
      const [
        nextSpaces,
        nextAccounts,
        custom,
      ] = await Promise.all([
        listSpaces(user.uid),
        listAccounts(user.uid),
        listCustomCategories(user.uid),
      ]);

      const ownedSpaces =
        nextSpaces.filter(
          (nextSpace) =>
            !nextSpace.archivedAt
            && nextSpace.ownerId === user.uid,
        );

      if (spaceIdOverride) {
        const targetSpace =
          await getSpace(
            spaceIdOverride,
          );

        if (!targetSpace) {
          throw new Error(
            'This Space is no longer available.',
          );
        }

        const workspace =
          await getSpaceCommitmentWorkspace(
            spaceIdOverride,
          );

        const nextItems =
          workspace.commitments;

        const nextPayments =
          workspace.payments;

        const editableSpaces =
          ownedSpaces.some(
            (nextSpace) =>
              nextSpace.id === targetSpace.id,
          )
            ? ownedSpaces
            : [
                ...ownedSpaces,
                targetSpace,
              ];

        const spaceAccounts =
          targetSpace.type === 'sme'
            ? await listAccountsForSpace(
                targetSpace.id,
              )
            : nextAccounts;

        setItems(nextItems);
        setPayments(nextPayments);
        setAccounts(spaceAccounts);
        setSpaces(editableSpaces);

        setCategories([
          ...DEFAULT_TRANSACTION_CATEGORIES.filter(
            (nextCategory) =>
              nextCategory.kind === 'expense',
          ),
          ...custom.filter(
            (nextCategory) =>
              nextCategory.kind === 'expense',
          ),
        ]);

        return;
      }

      const [
        nextItems,
        nextPayments,
      ] = await Promise.all([
        listAllCommitments(user.uid),
        listCommitmentPayments(user.uid),
      ]);

      /*
       * Main Bills is global across all Spaces owned by the user.
       */
      setItems(nextItems);
      setPayments(nextPayments);
      setAccounts(nextAccounts);
      setSpaces(ownedSpaces);

      setCategories([
        ...DEFAULT_TRANSACTION_CATEGORIES.filter(
          (nextCategory) =>
            nextCategory.kind === 'expense',
        ),
        ...custom.filter(
          (nextCategory) =>
            nextCategory.kind === 'expense',
        ),
      ]);
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    }
  };

  useEffect(
    () => {
      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) void load();
      });

      return () => {
        cancelled = true;
      };
    },
    [spaceIdOverride, user],
  );

  useEffect(
    () => {
      if (!typeOverride) return;

      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) setTypeFilter(typeOverride);
      });

      return () => {
        cancelled = true;
      };
    },
    [typeOverride],
  );
  const active = items.filter((item) => !item.archivedAt && !item.stoppedAt);
  const inactive = items.filter((item) => item.archivedAt || item.stoppedAt);
  const effectiveTypeFilter =
    typeOverride || typeFilter;

  const visible = active
    .filter((item) => (effectiveTypeFilter === 'all' || item.type === effectiveTypeFilter) && (commitmentStatusFilter === 'all' || dueState(item) === commitmentStatusFilter))
    .sort((a, b) => (a.nextDueDate || a.startDate || '9999-12-31').localeCompare(b.nextDueDate || b.startDate || '9999-12-31'));
  const upcoming = active.filter((item) => dueState(item) === 'upcoming' || dueState(item) === 'due').length; const overdue = active.filter((item) => dueState(item) === 'overdue').length; const outstanding = active.reduce((sum, item) => sum + (item.type === 'instalment' && item.totalAmountMinor ? Math.max(0, item.totalAmountMinor - item.amountPaidMinor) : item.status === 'active' ? item.amountMinor : 0), 0);
  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);

  const spaceMap =
    useMemo(
      () =>
        new Map(
          spaces.map(
            (item) => [
              item.id,
              item.name,
            ],
          ),
        ),
      [spaces],
    );

  const currentSpace =
    spaceIdOverride
      ? spaces.find(
          (item) =>
            item.id === spaceIdOverride,
        )
      : undefined;

  const canManageCurrentSpace =
    !spaceIdOverride
    || currentSpace?.ownerId === user?.uid;

  const canRequestCurrentSpacePayment =
    canManageCurrentSpace
    || (
      currentSpace?.type === 'sme'
      && accounts.some(
        (account) =>
          account.classification === 'business'
          && account.sharedCanUseAccount === true,
      )
    );

  const accountsForCommitment = (
    commitment: Commitment,
  ) => {
    const commitmentSpace =
      spaces.find(
        (nextSpace) =>
          nextSpace.id === commitment.spaceId,
      );

    const businessAccount =
      commitmentSpace?.type === 'sme';

    return accounts.filter(
      (account) =>
        account.currency === commitment.currency
        && (
          businessAccount
            ? (
                account.classification === 'business'
                && (
                  account.ownerId === user?.uid
                  || account.sharedCanUseAccount === true
                )
              )
            : account.classification !== 'business'
        ),
    );
  };
  function askLifecycle(item: Commitment, action: CommitmentLifecycleAction) {
    setError('');
    setLifecycleDialog(action === 'stop'
      ? { record: item, action, title: `Stop ${item.name}?`, description: 'It will move to Stopped Bills & Instalments and future payment dates will stop.', note: 'Previous payments and account history will stay available.', confirmLabel: `Stop ${item.type === 'bill' ? 'bill' : 'instalment'}` }
      : { record: item, action, title: `Delete ${item.name} permanently?`, description: 'Permanent deletion only works when no payment or shared bill has used this item.', note: 'This cannot be undone.', confirmLabel: 'Delete permanently', tone: 'danger' });
  }
  async function runLifecycle() {
    if (!lifecycleDialog) return;
    const { record: item, action } = lifecycleDialog;
    setBusyId(item.id); setError('');
    try { await manageCommitment(item.id, action); setLifecycleDialog(null); await load(); }
    catch (nextError) {
      const message = getErrorMessage(nextError);
      if (action === 'delete' && /stop/i.test(message)) {
        setLifecycleDialog({ record: item, action: 'stop', title: `${item.name} cannot be deleted`, description: message, note: 'Stop it instead. It will be hidden from current bills while previous payments remain correct.', confirmLabel: `Stop ${item.type === 'bill' ? 'bill' : 'instalment'} instead` });
      } else setError(message);
    }
    finally { setBusyId(''); }
  }
  return <main className={embedded ? 'page embedded-module-page commitments-page-v115' : 'page commitments-page-v115'}><PageHeader
      eyebrow={
        embedded
          ? currentSpace?.type === 'sme'
            ? 'Business Space'
            : currentSpace?.type === 'household'
              ? 'Household Space'
              : currentSpace?.type === 'trip'
                ? 'Trip Space'
                : currentSpace?.type === 'collection'
                  ? 'Collection Space'
                  : 'Personal Space'
          : 'Planning'
      }
      title={
        typeOverride === 'bill'
          ? 'Bills'
          : typeOverride === 'instalment'
            ? 'Instalments'
            : 'Bills & instalments'
      }
      description="Track what is due and record payments."
      action={
        embedded
          ? canManageCurrentSpace
            ? (
                <button
                  className="button primary"
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                >
                  {typeOverride === 'bill'
                    ? 'Add bill'
                    : typeOverride === 'instalment'
                      ? 'Add instalment'
                      : 'Add bill or instalment'}
                </button>
              )
            : null
          : (
              <div className="page-header-action-row">
                <Link
                  className="button secondary archive-button"
                  to="/bills/archived"
                >
                  Stopped Items
                  {' '}
                  <span>{inactive.length}</span>
                </Link>

                <button
                  className="button primary"
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                >
                  Add bill or instalment
                </button>
              </div>
            )
      }
    />{error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}
    {embedded && !canManageCurrentSpace && <div className="notice"><strong>Space payment history</strong><span>{canRequestCurrentSpacePayment ? 'You can request a payment from a shared Business account. The Account Owner must approve it before any money or commitment balance changes.' : 'Bills and instalments are visible here. Account-use permission is required before you can request a payment.'}</span></div>}
    <section className="summary-grid"><article className="summary-card featured"><span>Still to pay</span><strong>{formatMoney(outstanding, profile?.currency || 'BND')}</strong><small>Instalments and upcoming bills</small></article><article className="summary-card"><span>Coming up</span><strong>{upcoming}</strong><small>Due today or later</small></article><article className="summary-card"><span>Overdue</span><strong>{overdue}</strong><small>Needs attention</small></article><article className="summary-card"><span>Stopped</span><strong>{inactive.length}</strong><small>Can be restored when allowed</small></article></section>
    {!typeOverride && <div className="segmented-control planning-filter"><button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>All</button><button className={typeFilter === 'bill' ? 'active' : ''} onClick={() => setTypeFilter('bill')}>Bills</button><button className={typeFilter === 'instalment' ? 'active' : ''} onClick={() => setTypeFilter('instalment')}>Instalments</button></div>}
    {!spaceIdOverride && <div className="commitment-global-filter-v115"><label>Status<select value={commitmentStatusFilter} onChange={(event) => setCommitmentStatusFilter(event.target.value as 'all' | 'upcoming' | 'due' | 'overdue' | 'completed')}><option value="all">All statuses</option><option value="upcoming">Coming up</option><option value="due">Due today</option><option value="overdue">Overdue</option><option value="completed">Finished / paid</option></select></label><span>Grouped by Space · sorted by due date</span></div>}
    <CommitmentGrid items={visible} payments={payments} accountMap={accountMap} spaceMap={spaceMap} showSpace={!spaceIdOverride} groupBySpace={!spaceIdOverride} busyId={busyId} onPay={canRequestCurrentSpacePayment ? setPaying : undefined} onEdit={canManageCurrentSpace ? (item) => { setEditing(item); setShowForm(true); } : undefined} onStop={canManageCurrentSpace ? (item) => askLifecycle(item, 'stop') : undefined} onDelete={canManageCurrentSpace ? (item) => askLifecycle(item, 'delete') : undefined} onShare={canManageCurrentSpace ? (item, payment) => shareBillToWhatsApp(item, payment) : undefined} />
    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}
    {showForm && <Modal title={editing ? 'Edit bill or instalment' : 'Add bill or instalment'} onClose={() => setShowForm(false)}><CommitmentForm item={editing} accounts={accounts} spaces={spaces} categories={categories} lockedSpaceId={spaceIdOverride} typeOverride={typeOverride} onSaved={async () => { setShowForm(false); await load(); }} /></Modal>}
    {paying && <Modal title={`Pay ${paying.name}`} onClose={() => setPaying(null)}><PaymentForm item={paying} accounts={accountsForCommitment(paying)} onSaved={async (status) => { setPaying(null); setSuccess(status === 'pending_approval' ? 'Payment request sent to the Account Owner. No account or commitment balance changes until it is approved.' : 'Payment saved.'); await load(); }} /></Modal>}
  </main>;
}

function CommitmentGrid({ items, payments, accountMap, spaceMap, showSpace = false, groupBySpace = false, busyId, inactive = false, onPay, onEdit, onStop, onDelete, onRestore, onShare }: { items: Commitment[]; payments: CommitmentPayment[]; accountMap: Map<string, Account>; spaceMap: Map<string, string>; showSpace?: boolean; groupBySpace?: boolean; busyId: string; inactive?: boolean; onPay?: (item: Commitment) => void; onEdit?: (item: Commitment) => void; onStop?: (item: Commitment) => void; onDelete?: (item: Commitment) => void; onRestore?: (item: Commitment) => void; onShare?: (item: Commitment, payment?: CommitmentPayment) => void }) {
  const renderCard = (item: Commitment) => {
    const state = inactive ? 'completed' : dueState(item);
    const remaining = item.totalAmountMinor ? Math.max(0, item.totalAmountMinor - item.amountPaidMinor) : 0;
    const ratio = item.totalAmountMinor ? Math.min(100, Math.round(item.amountPaidMinor / item.totalAmountMinor * 100)) : item.status === 'completed' ? 100 : 0;
    const recent = payments.filter((payment) => payment.commitmentId === item.id).slice(0, 2);
    return <article className={`planning-card commitment-card state-${state} ${inactive ? 'archived' : ''}`} key={item.id}>
      <div className="planning-card-head"><div><span className="eyebrow">{inactive ? 'Stopped' : dueLabels[state]}</span><h3>{item.name}</h3></div><span className="type-badge">{item.type === 'bill' ? 'Bill' : 'Instalment'}</span></div>
      <div className="budget-amount-line"><span>{item.type === 'bill' ? 'Amount due each cycle' : 'Instalment amount per cycle'}</span><strong>{formatMoney(item.amountMinor, item.currency)}</strong><span>{frequencyLabels[item.frequency]}</span></div>
      {item.type === 'instalment' && <><div className="progress planning-progress"><span style={{ width: `${ratio}%` }} /></div><div className="planning-meta"><span>Paid {formatMoney(item.amountPaidMinor,item.currency)}</span><span>Left {formatMoney(remaining,item.currency)}</span></div></>}
      <div className="planning-meta"><span>{item.payee || item.categoryName}{showSpace ? ` · ${spaceMap.get(item.spaceId) || 'Space'}` : ''}</span><span>{inactive ? 'Future dates stopped' : item.nextDueDate ? `Due ${item.nextDueDate}` : 'Finished'}</span></div>
      <div className="planning-meta"><span>{accountMap.get(item.accountId || '')?.name || 'Choose an account when you pay'}</span><span>Remind me {item.reminderDays} day(s)</span></div>
      {recent.length > 0 && <div className="mini-history">{recent.map((payment) => <div key={payment.id}><span>{payment.paymentDate}</span><strong>{formatMoney(payment.amountMinor,payment.currency)}</strong><span>{payment.status === 'posted' ? 'Saved' : 'Undone'}</span></div>)}</div>}
      {(onPay||onEdit||onStop||onDelete||onRestore||onShare) && <div className="button-row">{inactive ? <button className="button secondary" disabled={busyId===item.id} onClick={()=>onRestore?.(item)}>Restore</button> : <><button className="button primary" disabled={item.status==='completed'} onClick={()=>onPay?.(item)}>Add payment</button>{item.type==='bill' && <button className="button secondary" title="Share to WhatsApp" onClick={()=>onShare?.(item,recent.find((payment)=>payment.status==='posted'))}>Share</button>}<button className="button secondary" onClick={()=>onEdit?.(item)}>Edit</button><button className="text-button" disabled={busyId===item.id} onClick={()=>onStop?.(item)}>Stop</button><button className="text-button danger" disabled={busyId===item.id} onClick={()=>onDelete?.(item)}>Delete</button></>}</div>}
    </article>;
  };
  if (!groupBySpace) return <section className="planning-card-grid">{items.map(renderCard)}</section>;
  const grouped = new Map<string, Commitment[]>();
  items.forEach((item) => { const rows=grouped.get(item.spaceId)||[]; rows.push(item); grouped.set(item.spaceId,rows); });
  return <div className="commitment-space-groups-v115">{[...grouped.entries()].map(([spaceId,rows]) => <section className="commitment-space-group-v115" key={spaceId}><div className="commitment-space-group-heading-v115"><div><span className="eyebrow">Space</span><h2>{spaceMap.get(spaceId)||'Personal / Other'}</h2></div><span>{rows.length} item{rows.length===1?'':'s'}</span></div><section className="planning-card-grid">{rows.map(renderCard)}</section></section>)}{items.length===0 && <div className="notice">No bills or instalments match these filters.</div>}</div>;
}

function CommitmentForm({
  item,
  accounts,
  spaces,
  categories,
  lockedSpaceId,
  typeOverride,
  onSaved,
}: {
  item: Commitment | null;
  accounts: Account[];
  spaces: Space[];
  categories: TransactionCategory[];
  lockedSpaceId?: string;
  typeOverride?: CommitmentType;
  onSaved: () => Promise<void>;
}) {
  const initialSpaceId =
    item?.spaceId
    || lockedSpaceId
    || spaces.find(
      (nextSpace) =>
        nextSpace.type === 'personal',
    )?.id
    || spaces[0]?.id
    || '';

  const [type, setType] =
    useState<CommitmentType>(
      typeOverride
      || item?.type
      || 'bill',
    );

  const [name, setName] =
    useState(item?.name || '');

  const [payee, setPayee] =
    useState(item?.payee || '');

  const [spaceId, setSpaceId] =
    useState(initialSpaceId);

  const [accountId, setAccountId] =
    useState(item?.accountId || '');

  const [categoryId, setCategoryId] =
    useState(
      item?.categoryId
      || 'expense-utilities',
    );

  const [amount, setAmount] =
    useState(
      item
        ? String(item.amountMinor / 100)
        : '',
    );

  const [total, setTotal] =
    useState(
      item?.totalAmountMinor
        ? String(item.totalAmountMinor / 100)
        : '',
    );

  const [frequency, setFrequency] =
    useState<CommitmentFrequency>(
      item?.frequency || 'monthly',
    );

  const [dueDate, setDueDate] =
    useState(
      item?.nextDueDate
      || item?.startDate
      || today(),
    );

  const [endDate, setEndDate] =
    useState(item?.endDate || '');

  const [reminderDays, setReminderDays] =
    useState(
      String(
        item?.reminderDays ?? 3,
      ),
    );

  const [note, setNote] =
    useState(item?.note || '');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  /*
   * New bill from a Space stays locked there.
   * Existing bill can be moved to another owned Space.
   */
  const availableSpaces =
    item
      ? spaces
      : lockedSpaceId
        ? spaces.filter(
            (nextSpace) =>
              nextSpace.id
              === lockedSpaceId,
          )
        : spaces;

  const selectedSpace =
    spaces.find(
      (nextSpace) =>
        nextSpace.id === spaceId,
    );

  const scope =
    selectedSpace?.type === 'sme'
      ? 'business'
      : 'personal';

  const scopedCategories =
    categories.filter(
      (category) =>
        category.scope === 'both'
        || category.scope === scope,
    );

  const scopedAccounts =
    accounts.filter(
      (account) =>
        account.currency
          === selectedSpace?.currency
        && (
          scope === 'business'
            ? account.classification
              === 'business'
            : account.classification
              !== 'business'
        ),
    );

  const movingSpace =
    Boolean(
      item
      && item.spaceId !== spaceId,
    );

  const submit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (!spaceId) {
        throw new Error(
          'Choose a Space.',
        );
      }

      const amountMinor =
        toMinorUnits(amount);

      if (amountMinor <= 0) {
        throw new Error(
          'Enter an amount greater than BND 0.00.',
        );
      }

      const totalAmountMinor =
        type === 'instalment'
          ? toMinorUnits(total)
          : undefined;

      if (
        type === 'instalment'
        && (
          !totalAmountMinor
          || totalAmountMinor
            < amountMinor
        )
      ) {
        throw new Error(
          'The full instalment total must be the same as or more than one payment.',
        );
      }

      if (!categoryId) {
        throw new Error(
          'Choose a spending category.',
        );
      }

      const base = {
        spaceId,
        name,
        payee:
          payee || undefined,
        accountId:
          accountId || undefined,
        categoryId,
        amountMinor,
        totalAmountMinor,
        frequency,
        nextDueDate: dueDate,
        endDate:
          endDate || undefined,
        reminderDays:
          Number(reminderDays),
        note,
      };

      if (item) {
        await updateCommitment({
          commitmentId: item.id,
          ...base,
        });
      } else {
        await createCommitment({
          type,
          startDate: dueDate,
          ...base,
        });
      }

      await onSaved();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="form-stack"
      onSubmit={submit}
    >
      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="form-grid">
        <label>
          Type
          <select
            value={type}
            onChange={(event) =>
              setType(
                event.target.value as CommitmentType,
              )
            }
            disabled={
              Boolean(item)
              || Boolean(typeOverride)
            }
          >
            <option value="bill">
              Bill
            </option>
            <option value="instalment">
              Instalment
            </option>
          </select>
        </label>

        <label>
          Name
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </label>

        <label>
          Paid to
          <input
            value={payee}
            onChange={(event) =>
              setPayee(event.target.value)
            }
            placeholder="DST, landlord, supplier"
          />
        </label>

        <label>
          Space
          <select
            value={spaceId}
            onChange={(event) => {
              setSpaceId(
                event.target.value,
              );

              /*
               * Destination changed:
               * require a fresh valid account/category.
               */
              setAccountId('');
              setCategoryId('');
            }}
            disabled={
              Boolean(lockedSpaceId)
              && !item
            }
          >
            {availableSpaces.map(
              (nextSpace) => (
                <option
                  key={nextSpace.id}
                  value={nextSpace.id}
                >
                  {nextSpace.name}
                </option>
              ),
            )}
          </select>

          {movingSpace && (
            <small>
              Future bill cycles will use the new Space.
              Existing posted transactions stay in their original Space.
            </small>
          )}
        </label>

        <label>
          Usual account
          <select
            value={accountId}
            onChange={(event) =>
              setAccountId(
                event.target.value,
              )
            }
          >
            <option value="">
              Choose when paying
            </option>

            {scopedAccounts.map(
              (account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
                  {account.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Spending category
          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(
                event.target.value,
              )
            }
            required
          >
            <option
              value=""
              disabled
            >
              Choose category
            </option>

            {scopedCategories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {categoryIconGlyph(
                    category.icon,
                  )}{' '}
                  {category.name}
                </option>
              ),
            )}
          </select>
        </label>

        {type === 'bill'
          ? (
            <label>
              Amount due each cycle (BND)
              <input
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                inputMode="decimal"
                required
              />
              <small>
                The amount you normally pay each time this bill is due.
              </small>
            </label>
          )
          : (
            <>
              <label>
                Full instalment total (BND)
                <input
                  value={total}
                  onChange={(event) =>
                    setTotal(
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  required
                />
                <small>
                  The full amount you need to pay from start to finish.
                </small>
              </label>

              <label>
                Instalment amount per cycle (BND)
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  required
                />
                <small>
                  The amount you normally pay each time.
                </small>
              </label>
            </>
          )}

        <label>
          How often
          <select
            value={frequency}
            onChange={(event) =>
              setFrequency(
                event.target.value as CommitmentFrequency,
              )
            }
          >
            <option value="once">
              One time
            </option>
            <option value="weekly">
              Weekly
            </option>
            <option value="monthly">
              Monthly
            </option>
            <option value="quarterly">
              Every 3 months
            </option>
            <option value="yearly">
              Yearly
            </option>
          </select>
        </label>

        <label>
          Next due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) =>
              setDueDate(
                event.target.value,
              )
            }
            required
          />
        </label>

        <label>
          End date
          <input
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          Remind me this many days early
          <input
            type="number"
            min="0"
            max="60"
            value={reminderDays}
            onChange={(event) =>
              setReminderDays(
                event.target.value,
              )
            }
          />
        </label>
      </div>

      <label>
        Note
        <textarea
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value,
            )
          }
          rows={2}
        />
      </label>

      <button
        className="button primary full"
        disabled={busy}
      >
        {busy
          ? 'Saving…'
          : 'Save bill or instalment'}
      </button>
    </form>
  );
}

function PaymentForm({
  item,
  accounts,
  onSaved,
}: {
  item: Commitment;
  accounts: Account[];
  onSaved: (
    status:
      | 'posted'
      | 'pending_approval',
  ) => Promise<void>;
}) {
  const { user } =
    useAuth();

  const initialAccountId =
    item.accountId
    && accounts.some(
      (account) =>
        account.id === item.accountId,
    )
      ? item.accountId
      : accounts[0]?.id || '';

  const [accountId, setAccountId] =
    useState(
      initialAccountId,
    );

  const available =
    accounts.filter(
      (account) =>
        account.currency
        === item.currency,
    );

  const selectedAccount =
    available.find(
      (account) =>
        account.id
        === accountId,
    );

  const requiresApproval =
    Boolean(
      selectedAccount
      && user
      && selectedAccount.ownerId
        !== user.uid,
    );

  const [amount, setAmount] =
    useState(
      String(
        (
          item.type === 'instalment'
          && item.totalAmountMinor
            ? Math.min(
                item.amountMinor,
                item.totalAmountMinor
                - item.amountPaidMinor,
              )
            : item.amountMinor
        ) / 100,
      ),
    );

  const [date, setDate] =
    useState(today());

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethodCode>(
      suggestedPaymentMethod(
        selectedAccount,
      ),
    );

  const [
    paymentMethodCustom,
    setPaymentMethodCustom,
  ] =
    useState('');

  const [note, setNote] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const parsedAmountMinor =
    useMemo(
      () => {
        try {
          return Math.max(
            0,
            toMinorUnits(
              amount,
            ),
          );
        } catch {
          return 0;
        }
      },
      [amount],
    );

  const remainingBefore =
    item.type === 'instalment'
    && item.totalAmountMinor
      ? Math.max(
          0,
          item.totalAmountMinor
          - item.amountPaidMinor,
        )
      : 0;

  const remainingAfter =
    Math.max(
      0,
      remainingBefore
      - parsedAmountMinor,
    );

  const submit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (!selectedAccount) {
        throw new Error(
          'Choose an account you are allowed to use.',
        );
      }

      const amountMinor =
        toMinorUnits(
          amount,
        );

      if (amountMinor <= 0) {
        throw new Error(
          'Enter a payment greater than BND 0.00.',
        );
      }

      const input = {
        commitmentId:
          item.id,
        accountId:
          selectedAccount.id,
        amountMinor,
        paymentDate:
          date,
        paymentMethod,
        paymentMethodLabel:
          paymentMethod === 'other'
            ? paymentMethodCustom.trim()
            : undefined,
        note,
      };

      if (requiresApproval) {
        await requestBusinessCommitmentPayment(
          input,
        );

        await onSaved(
          'pending_approval',
        );
      } else {
        await payCommitment(
          input,
        );

        await onSaved(
          'posted',
        );
      }
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="form-stack"
      onSubmit={submit}
    >
      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="notice">
        {requiresApproval
          ? 'This payment uses a shared Business account. It will stay pending until the Account Owner approves it. Nothing is deducted while waiting.'
          : 'This saves a payment and updates the selected account balance once.'}
      </div>

      <label>
        Account used
        <select
          value={accountId}
          onChange={(event) => {
            const nextId =
              event.target.value;

            setAccountId(
              nextId,
            );

            setPaymentMethod(
              suggestedPaymentMethod(
                available.find(
                  (account) =>
                    account.id
                    === nextId,
                ),
              ),
            );

            setPaymentMethodCustom(
              '',
            );
          }}
          required
        >
          {available.map(
            (account) => (
              <option
                value={account.id}
                key={account.id}
              >
                {account.name}
                {' — '}
                {account.sharedCanViewBalance === false
                  ? 'Balance hidden'
                  : formatMoney(
                      account.ledgerBalanceMinor,
                      account.currency,
                    )}
              </option>
            ),
          )}
        </select>
      </label>

      <PaymentMethodField
        value={paymentMethod}
        customLabel={paymentMethodCustom}
        onChange={(value, custom) => {
          setPaymentMethod(
            value,
          );

          setPaymentMethodCustom(
            custom,
          );
        }}
      />

      <label>
        Amount paid now (BND)
        <input
          value={amount}
          onChange={(event) =>
            setAmount(
              event.target.value,
            )
          }
          inputMode="decimal"
          required
        />
        <small>
          The amount you are paying now.
        </small>
      </label>

      {item.type === 'instalment'
        && item.totalAmountMinor
        && (
          <div className="transaction-preview">
            <div>
              <span>
                Amount left before payment
              </span>
              <strong>
                {formatMoney(
                  remainingBefore,
                  item.currency,
                )}
              </strong>
            </div>

            <div>
              <span>
                Amount left after payment
              </span>
              <strong>
                {formatMoney(
                  remainingAfter,
                  item.currency,
                )}
              </strong>
            </div>

            <small>
              The amount left cannot go below BND 0.00.
            </small>
          </div>
        )}

      <label>
        Payment date
        <input
          type="date"
          value={date}
          onChange={(event) =>
            setDate(
              event.target.value,
            )
          }
          required
        />
      </label>

      <label>
        Note
        <textarea
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value,
            )
          }
          rows={2}
        />
      </label>

      <button
        className="button primary full"
        disabled={
          busy
          || !selectedAccount
        }
      >
        {busy
          ? requiresApproval
            ? 'Requesting approval…'
            : 'Saving…'
          : requiresApproval
            ? 'Request payment approval'
            : 'Save payment'}
      </button>
    </form>
  );
}
