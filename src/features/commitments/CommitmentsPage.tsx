import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import { suggestedPaymentMethod } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_TRANSACTION_CATEGORIES, categoryIconGlyph } from '../categories/defaultCategories';
import { listAccounts } from '../../repositories/accountRepository';
import { listCustomCategories } from '../../repositories/categoryRepository';
import {
  createCommitment,
  listAllCommitments,
  listCommitmentPayments,
  listCommitmentPaymentsForCommitment,
  listCommitmentsForOwnerSpace,
  payCommitment,
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
  const [editing, setEditing] = useState<Commitment | null>(null); const [paying, setPaying] = useState<Commitment | null>(null); const [showForm, setShowForm] = useState(false); const [typeFilter, setTypeFilter] = useState<'all' | CommitmentType>(typeOverride || 'all'); const [busyId, setBusyId] = useState(''); const [error, setError] = useState('');
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

        const nextItems =
          await listCommitmentsForOwnerSpace(
            user.uid,
            spaceIdOverride,
          );

        const paymentGroups =
          await Promise.all(
            nextItems.map(
              (nextItem) =>
                listCommitmentPaymentsForCommitment(
                  nextItem.id,
                ),
            ),
          );

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

        setItems(nextItems);
        setPayments(paymentGroups.flat());
        setAccounts(nextAccounts);
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

      const personalSpace =
        nextSpaces.find(
          (nextSpace) =>
            nextSpace.type === 'personal'
            && !nextSpace.archivedAt,
        ) || null;

      const personalItems =
        personalSpace
          ? nextItems.filter(
              (nextItem) =>
                nextItem.spaceId === personalSpace.id,
            )
          : [];

      const personalItemIds =
        new Set(
          personalItems.map(
            (nextItem) =>
              nextItem.id,
          ),
        );

      setItems(personalItems);

      setPayments(
        nextPayments.filter(
          (nextPayment) =>
            personalItemIds.has(
              nextPayment.commitmentId,
            ),
        ),
      );

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
      void load();
    },
    [spaceIdOverride, user],
  );

  useEffect(
    () => {
      if (typeOverride) {
        setTypeFilter(typeOverride);
      }
    },
    [typeOverride],
  );
  const active = items.filter((item) => !item.archivedAt && !item.stoppedAt);
  const inactive = items.filter((item) => item.archivedAt || item.stoppedAt);
  const effectiveTypeFilter =
    typeOverride || typeFilter;

  const visible = active.filter(
    (item) =>
      effectiveTypeFilter === 'all'
      || item.type === effectiveTypeFilter,
  );
  const upcoming = active.filter((item) => dueState(item) === 'upcoming' || dueState(item) === 'due').length; const overdue = active.filter((item) => dueState(item) === 'overdue').length; const outstanding = active.reduce((sum, item) => sum + (item.type === 'instalment' && item.totalAmountMinor ? Math.max(0, item.totalAmountMinor - item.amountPaidMinor) : item.status === 'active' ? item.amountMinor : 0), 0);
  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);

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
            ? account.classification === 'business'
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
  return <main className={embedded ? 'page embedded-module-page' : 'page'}><PageHeader
      eyebrow={
        embedded
          ? spaces[0]?.type === 'sme'
            ? 'Business Space'
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
      description="Track what is due, then record payments from the account you used."
      action={
        embedded
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
    <section className="summary-grid"><article className="summary-card featured"><span>Still to pay</span><strong>{formatMoney(outstanding, profile?.currency || 'BND')}</strong><small>Instalments and upcoming bills</small></article><article className="summary-card"><span>Coming up</span><strong>{upcoming}</strong><small>Due today or later</small></article><article className="summary-card"><span>Overdue</span><strong>{overdue}</strong><small>Needs attention</small></article><article className="summary-card"><span>Stopped</span><strong>{inactive.length}</strong><small>Can be restored when allowed</small></article></section>
    {!typeOverride && <div className="segmented-control planning-filter"><button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>All</button><button className={typeFilter === 'bill' ? 'active' : ''} onClick={() => setTypeFilter('bill')}>Bills</button><button className={typeFilter === 'instalment' ? 'active' : ''} onClick={() => setTypeFilter('instalment')}>Instalments</button></div>}
    <CommitmentGrid items={visible} payments={payments} accountMap={accountMap} busyId={busyId} onPay={setPaying} onEdit={(item) => { setEditing(item); setShowForm(true); }} onStop={(item) => askLifecycle(item, 'stop')} onDelete={(item) => askLifecycle(item, 'delete')} onShare={(item, payment) => shareBillToWhatsApp(item, payment)} />
    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}
    {showForm && <Modal title={editing ? 'Edit bill or instalment' : 'Add bill or instalment'} onClose={() => setShowForm(false)}><CommitmentForm item={editing} accounts={accounts} spaces={spaces} categories={categories} lockedSpaceId={spaceIdOverride} typeOverride={typeOverride} onSaved={async () => { setShowForm(false); await load(); }} /></Modal>}
    {paying && <Modal title={`Pay ${paying.name}`} onClose={() => setPaying(null)}><PaymentForm item={paying} accounts={accountsForCommitment(paying)} onSaved={async () => { setPaying(null); await load(); }} /></Modal>}
  </main>;
}

function CommitmentGrid({ items, payments, accountMap, busyId, inactive = false, onPay, onEdit, onStop, onDelete, onRestore, onShare }: { items: Commitment[]; payments: CommitmentPayment[]; accountMap: Map<string, Account>; busyId: string; inactive?: boolean; onPay?: (item: Commitment) => void; onEdit?: (item: Commitment) => void; onStop?: (item: Commitment) => void; onDelete?: (item: Commitment) => void; onRestore?: (item: Commitment) => void; onShare?: (item: Commitment, payment?: CommitmentPayment) => void }) {
  return <section className="planning-card-grid">{items.map((item) => { const state = inactive ? 'completed' : dueState(item); const remaining = item.totalAmountMinor ? Math.max(0, item.totalAmountMinor - item.amountPaidMinor) : 0; const ratio = item.totalAmountMinor ? Math.min(100, Math.round(item.amountPaidMinor / item.totalAmountMinor * 100)) : item.status === 'completed' ? 100 : 0; const recent = payments.filter((payment) => payment.commitmentId === item.id).slice(0, 2); return <article className={`planning-card commitment-card state-${state} ${inactive ? 'archived' : ''}`} key={item.id}><div className="planning-card-head"><div><span className="eyebrow">{inactive ? 'Stopped' : dueLabels[state]}</span><h3>{item.name}</h3></div><span className="type-badge">{item.type === 'bill' ? 'Bill' : 'Instalment'}</span></div><div className="budget-amount-line"><span>{item.type === 'bill' ? 'Amount due each cycle' : 'Instalment amount per cycle'}</span><strong>{formatMoney(item.amountMinor, item.currency)}</strong><span>{frequencyLabels[item.frequency]}</span></div>{item.type === 'instalment' && <><div className="progress planning-progress"><span style={{ width: `${ratio}%` }} /></div><div className="planning-meta"><span>Paid {formatMoney(item.amountPaidMinor, item.currency)}</span><span>Left {formatMoney(remaining, item.currency)}</span></div></>}<div className="planning-meta"><span>{item.payee || item.categoryName}</span><span>{inactive ? 'Future dates stopped' : item.nextDueDate ? `Due ${item.nextDueDate}` : 'Finished'}</span></div><div className="planning-meta"><span>{accountMap.get(item.accountId || '')?.name || 'Choose an account when you pay'}</span><span>Remind me {item.reminderDays} day(s)</span></div>{recent.length > 0 && <div className="mini-history">{recent.map((payment) => <div key={payment.id}><span>{payment.paymentDate}</span><strong>{formatMoney(payment.amountMinor, payment.currency)}</strong><span>{payment.status === 'posted' ? 'Saved' : 'Undone'}</span></div>)}</div>}<div className="button-row">{inactive ? <button className="button secondary" disabled={busyId === item.id} onClick={() => onRestore?.(item)}>Restore</button> : <><button className="button primary" disabled={item.status === 'completed'} onClick={() => onPay?.(item)}>Add payment</button>{item.type === 'bill' && <button className="button secondary" title="Share to WhatsApp" onClick={() => onShare?.(item, recent.find((payment) => payment.status === 'posted'))}>Share</button>}<button className="button secondary" onClick={() => onEdit?.(item)}>Edit</button><button className="text-button" disabled={busyId === item.id} onClick={() => onStop?.(item)}>Stop</button><button className="text-button danger" disabled={busyId === item.id} onClick={() => onDelete?.(item)}>Delete</button></>}</div></article>; })}</section>;
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
        : spaces.filter(
            (nextSpace) =>
              nextSpace.type
              === 'personal',
          );

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

function PaymentForm({ item, accounts, onSaved }: { item: Commitment; accounts: Account[]; onSaved: () => Promise<void> }) {
  const [accountId, setAccountId] = useState(item.accountId || accounts[0]?.id || '');
  const available = accounts.filter((account) => account.currency === item.currency);
  const selectedAccount = available.find((account) => account.id === accountId);
  const [amount, setAmount] = useState(String((item.type === 'instalment' && item.totalAmountMinor ? Math.min(item.amountMinor, item.totalAmountMinor - item.amountPaidMinor) : item.amountMinor) / 100));
  const [date, setDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>(suggestedPaymentMethod(selectedAccount));
  const [paymentMethodCustom, setPaymentMethodCustom] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const parsedAmountMinor = useMemo(() => { try { return Math.max(0, toMinorUnits(amount)); } catch { return 0; } }, [amount]);
  const remainingBefore = item.type === 'instalment' && item.totalAmountMinor ? Math.max(0, item.totalAmountMinor - item.amountPaidMinor) : 0;
  const remainingAfter = Math.max(0, remainingBefore - parsedAmountMinor);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const amountMinor = toMinorUnits(amount);
      if (amountMinor <= 0) throw new Error('Enter a payment greater than BND 0.00.');
      await payCommitment({ commitmentId: item.id, accountId, amountMinor, paymentDate: date, paymentMethod, paymentMethodLabel: paymentMethod === 'other' ? paymentMethodCustom.trim() : undefined, note });
      await onSaved();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <form className="form-stack" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    <div className="notice">This saves a payment and updates the selected account balance once.</div>
    <label>Account used<select value={accountId} onChange={(event) => { const nextId = event.target.value; setAccountId(nextId); setPaymentMethod(suggestedPaymentMethod(available.find((account) => account.id === nextId))); setPaymentMethodCustom(''); }} required>{available.map((account) => <option value={account.id} key={account.id}>{account.name} — {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>
    <PaymentMethodField value={paymentMethod} customLabel={paymentMethodCustom} onChange={(value, custom) => { setPaymentMethod(value); setPaymentMethodCustom(custom); }} />
    <label>Amount paid now (BND)<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required/><small>The amount you are paying now.</small></label>
    {item.type === 'instalment' && item.totalAmountMinor && <div className="transaction-preview"><div><span>Amount left before payment</span><strong>{formatMoney(remainingBefore, item.currency)}</strong></div><div><span>Amount left after payment</span><strong>{formatMoney(remainingAfter, item.currency)}</strong></div><small>The amount left cannot go below BND 0.00.</small></div>}
    <label>Payment date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required/></label>
    <label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2}/></label>
    <button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</button>
  </form>;
}
