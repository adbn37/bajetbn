import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import { suggestedPaymentMethod } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import { listAllAccounts } from '../../repositories/accountRepository';
import { listAllCustomCategories } from '../../repositories/categoryRepository';
import { uploadTransactionAttachment } from '../../repositories/transactionRepository';
import { DEFAULT_TRANSACTION_CATEGORIES, categoryApplies } from '../categories/defaultCategories';
import {
  archiveSpaceWorkItem,
  listSpaceWorkItems,
  markSpaceWorkItemBought,
  reopenSpaceWorkItem,
  saveSpaceWorkItem,
  setSpaceWorkItemStatus,
  uploadSpaceWorkItemPhoto,
  getSpaceWorkItemPhotoUrl,
  removeSpaceWorkItemPhoto,
  recordSpaceWorkPurchaseExpense,
} from '../../repositories/spaceWorkRepository';
import type {
  Space,
  SpaceMember,
  SpaceWorkItem,
  SpaceWorkPriority,
  Account,
  PaymentMethodCode,
  TransactionCategory,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type WorkView = 'tasks' | 'shopping';

function formText(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function optionalMinor(value: string) {
  if (!value) return undefined;

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a valid non-negative amount.');
  }

  return Math.round(amount * 100);
}

function requiredMinor(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter the actual purchase price.');
  }

  return Math.round(amount * 100);
}

function itemKey(item: SpaceWorkItem) {
  return [
    item.title,
    item.brand || '',
    item.model || '',
  ]
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function priorityLabel(priority: SpaceWorkPriority) {
  if (priority === 'urgent') return 'Urgent';
  if (priority === 'high') return 'High';
  if (priority === 'low') return 'Low';
  return 'Normal';
}

function PurchaseExpenseForm({
  space,
  item,
  currentMember,
  onSaved,
}: {
  space: Space;
  item: SpaceWorkItem;
  currentMember: SpaceMember | null;
  onSaved: (message: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const { online } = useOfflineSync();

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [categories, setCategories] =
    useState<TransactionCategory[]>([]);

  const [accountId, setAccountId] =
    useState('');

  const [categoryId, setCategoryId] =
    useState('');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodCode>('cash');

  const [
    paymentMethodCustom,
    setPaymentMethodCustom,
  ] = useState('');

  const [receiptFile, setReceiptFile] =
    useState<File | null>(null);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [busyPurchase, setBusyPurchase] =
    useState(false);

  const [purchaseError, setPurchaseError] =
    useState('');

  const scope =
    space.type === 'sme'
      ? 'business'
      : 'personal';

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      if (!user) return;

      setLoadingOptions(true);
      setPurchaseError('');

      try {
        const [
          nextAccounts,
          nextCustomCategories,
        ] = await Promise.all([
          listAllAccounts(user.uid),
          listAllCustomCategories(user.uid),
        ]);

        if (cancelled) return;

        const compatibleAccounts =
          nextAccounts.filter(
            (account) =>
              !account.archivedAt
              && !account.closedAt
              && account.currency ===
                space.currency,
          );

        const expenseCategories = [
          ...DEFAULT_TRANSACTION_CATEGORIES,
          ...nextCustomCategories.filter(
            (category) =>
              !category.archivedAt,
          ),
        ].filter((category) =>
          categoryApplies(
            category,
            'expense',
            scope,
          ),
        );

        setAccounts(compatibleAccounts);
        setCategories(expenseCategories);

        const firstAccount =
          compatibleAccounts[0];

        setAccountId(firstAccount?.id || '');

        setPaymentMethod(
          suggestedPaymentMethod(firstAccount),
        );

        const preferredCategory =
          space.type === 'sme'
            ? 'expense-supplier'
            : 'expense-groceries';

        const defaultCategory =
          expenseCategories.find(
            (category) =>
              category.id ===
              preferredCategory,
          )
          || expenseCategories[0];

        setCategoryId(
          defaultCategory?.id || '',
        );
      } catch (error) {
        if (!cancelled) {
          setPurchaseError(
            getErrorMessage(error),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [scope, space.currency, space.type, user]);

  const selectedAccount =
    accounts.find(
      (account) =>
        account.id === accountId,
    );

  useEffect(() => {
    setPaymentMethod(
      suggestedPaymentMethod(
        selectedAccount,
      ),
    );

    setPaymentMethodCustom('');
  }, [accountId]);

  if (
    currentMember?.canUseAccounts !== true
  ) {
    return (
      <div className="notice">
        Your Space role can record that this item
        was bought, but it cannot post financial
        activity.
      </div>
    );
  }

  if (
    !item.actualPriceMinor
    || item.actualPriceMinor <= 0
  ) {
    return (
      <div className="notice">
        This was recorded as a zero-cost purchase,
        so no expense transaction is required.
      </div>
    );
  }

  async function submitPurchaseExpense(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      busyPurchase
      || !accountId
      || !categoryId
    ) {
      return;
    }

    if (!online) {
      setPurchaseError(
        'Connect to the internet before creating and linking this financial record.',
      );

      return;
    }

    setBusyPurchase(true);
    setPurchaseError('');

    try {
      const result =
        await recordSpaceWorkPurchaseExpense({
          spaceId: space.id,
          itemId: item.id,
          accountId,
          categoryId,
          paymentMethod,
          paymentMethodLabel:
            paymentMethod === 'other'
              ? paymentMethodCustom.trim()
              : undefined,
        });

      let message =
        space.type === 'sme'
          ? 'SME Purchase recorded and linked.'
          : 'Household Expense recorded and linked.';

      if (receiptFile) {
        try {
          await uploadTransactionAttachment({
            transactionId:
              result.transactionId,
            spaceId: space.id,
            file: receiptFile,
          });

          message +=
            ' Receipt/photo attached.';
        } catch (attachmentError) {
          message +=
            ' The financial record is safe, but the receipt/photo could not be uploaded. Add it later from Money Activity. '
            + getErrorMessage(
              attachmentError,
            );
        }
      }

      await onSaved(message);
    } catch (error) {
      setPurchaseError(
        getErrorMessage(error),
      );
    } finally {
      setBusyPurchase(false);
    }
  }

  return (
    <details>
      <summary>
        {space.type === 'sme'
          ? 'Record as SME Purchase'
          : 'Record as Household Expense'}
      </summary>

      <form
        className="form-stack"
        onSubmit={submitPurchaseExpense}
      >
        <div className="notice">
          <strong>
            {formatMoney(
              item.actualPriceMinor || 0,
              space.currency,
            )}
          </strong>

          <span>
            {item.actualPlace || 'No place'}
            {' · '}
            {item.purchasedOn ||
              'No purchase date'}
          </span>
        </div>

        {loadingOptions ? (
          <div className="loading-panel">
            Loading financial options...
          </div>
        ) : (
          <>
            <label className="field">
              <span>Paid from account</span>

              <select
                required
                value={accountId}
                onChange={(event) =>
                  setAccountId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Choose account
                </option>

                {accounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                    {' · '}
                    {formatMoney(
                      account.ledgerBalanceMinor,
                      account.currency,
                    )}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Category</span>

              <select
                required
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Choose category
                </option>

                {categories.map(
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

            <PaymentMethodField
              label="Payment method"
              value={paymentMethod}
              customLabel={
                paymentMethodCustom
              }
              onChange={(value, custom) => {
                setPaymentMethod(value);
                setPaymentMethodCustom(
                  custom,
                );
              }}
            />

            <label className="field">
              <span>
                Receipt or photo (optional)
              </span>

              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={
                  !online || busyPurchase
                }
                onChange={(event) =>
                  setReceiptFile(
                    event.currentTarget
                      .files?.[0]
                    || null,
                  )
                }
              />

              <small className="muted">
                Images or PDF. You can also add
                more receipts later from Money
                Activity.
              </small>
            </label>

            {!accounts.length && (
              <div className="notice warning">
                No active account uses{' '}
                {space.currency}.
              </div>
            )}

            {!online && (
              <div className="notice warning">
                Internet is required because the
                expense and To-Buy link are saved
                together.
              </div>
            )}

            {purchaseError && (
              <div className="notice error">
                {purchaseError}
              </div>
            )}

            <button
              className="button primary"
              disabled={
                busyPurchase
                || !online
                || !accountId
                || !categoryId
              }
            >
              {busyPurchase
                ? 'Recording...'
                : space.type === 'sme'
                  ? 'Record SME Purchase'
                  : 'Record Household Expense'}
            </button>
          </>
        )}
      </form>
    </details>
  );
}

export function SpaceWorkPanel({
  space,
  members,
  currentMember,
  initialView,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
  initialView: WorkView;
}) {
  const [view, setView] = useState<WorkView>(initialView);
  const [items, setItems] = useState<SpaceWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const activeMembers = members.filter(
    (item) => (item.status || 'active') === 'active',
  );

  const canManage = [
    'owner',
    'admin',
    'contributor',
  ].includes(currentMember?.role || '');


  const [photoUrls, setPhotoUrls] =
    useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function resolvePhotos() {
      const rows = await Promise.all(
        items
          .filter((item) => item.photoPath)
          .map(async (item) => {
            try {
              const url =
                await getSpaceWorkItemPhotoUrl(
                  String(item.photoPath),
                );

              return [item.id, url] as const;
            } catch {
              return [item.id, ''] as const;
            }
          }),
      );

      if (!cancelled) {
        setPhotoUrls(
          Object.fromEntries(rows),
        );
      }
    }

    void resolvePhotos();

    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  async function loadItems() {
    setLoading(true);
    setError('');

    try {
      setItems(await listSpaceWorkItems(space.id));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, [space.id]);

  const tasks = useMemo(
    () => items.filter((item) => item.kind === 'task'),
    [items],
  );

  const shopping = useMemo(
    () => items.filter((item) => item.kind === 'buy'),
    [items],
  );

  const boughtHistory = useMemo(
    () =>
      shopping
        .filter((item) => item.status === 'bought')
        .sort((a, b) =>
          String(b.purchasedOn || '').localeCompare(
            String(a.purchasedOn || ''),
          ),
        ),
    [shopping],
  );

  async function runMutation(
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    setError('');
    setMessage('');

    try {
      await action();
      setMessage(success);
      await loadItems();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy('');
    }
  }

  async function submitTask(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    await runMutation(
      'create-task',
      () =>
        saveSpaceWorkItem({
          spaceId: space.id,
          kind: 'task',
          title: formText(data, 'title'),
          assigneeUid:
            formText(data, 'assigneeUid') || undefined,
          priority:
            (formText(data, 'priority') ||
              'normal') as SpaceWorkPriority,
          dueDate:
            formText(data, 'dueDate') || undefined,
          note: formText(data, 'note') || undefined,
        }),
      'Task added.',
    );

    if (!error) form.reset();
  }

  async function submitShopping(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    const quantityValue = Number(
      formText(data, 'quantity') || '1',
    );

    if (
      !Number.isFinite(quantityValue)
      || quantityValue <= 0
    ) {
      setError(
        'Quantity must be greater than zero.',
      );
      return;
    }

    const photoValue =
      data.get('itemPhoto');

    const itemPhoto =
      photoValue instanceof File
        && photoValue.size > 0
        ? photoValue
        : null;

    setBusy('create-buy');
    setError('');
    setMessage('');

    try {
      const result =
        await saveSpaceWorkItem({
          spaceId: space.id,
          kind: 'buy',
          title: formText(data, 'title'),
          brand:
            formText(data, 'brand')
            || undefined,
          model:
            formText(data, 'model')
            || undefined,
          size:
            formText(data, 'size')
            || undefined,
          unit:
            formText(data, 'unit')
            || undefined,
          quantity: quantityValue,
          targetPriceMinor:
            optionalMinor(
              formText(
                data,
                'targetPrice',
              ),
            ),
          preferredPlace:
            formText(
              data,
              'preferredPlace',
            )
            || undefined,
          assigneeUid:
            formText(
              data,
              'assigneeUid',
            )
            || undefined,
          priority:
            (
              formText(
                data,
                'priority',
              )
              || 'normal'
            ) as SpaceWorkPriority,
          dueDate:
            formText(data, 'dueDate')
            || undefined,
          note:
            formText(data, 'note')
            || undefined,
        });

      let success =
        space.type === 'sme'
          ? 'Purchase List item added.'
          : 'To-Buy item added.';

      if (itemPhoto) {
        try {
          await uploadSpaceWorkItemPhoto({
            spaceId: space.id,
            itemId: result.itemId,
            file: itemPhoto,
          });

          success += ' Photo added.';
        } catch (photoError) {
          success +=
            ' The item is saved, but its photo could not be uploaded. '
            + getErrorMessage(photoError);
        }
      }

      setMessage(success);
      form.reset();
      await loadItems();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy('');
    }
  }

  function historyFor(item: SpaceWorkItem) {
    const key = itemKey(item);

    const rows = boughtHistory.filter(
      (history) => itemKey(history) === key,
    );

    if (!rows.length) return null;

    const priced = rows.filter(
      (history) =>
        history.actualPriceMinor !== undefined
        && history.actualPriceMinor !== null,
    );

    const lowest = priced.length
      ? Math.min(
          ...priced.map(
            (history) => history.actualPriceMinor || 0,
          ),
        )
      : null;

    return {
      last: rows[0],
      lowest,
    };
  }

  const visibleTasks = tasks.filter(
    (item) => !item.archivedAt,
  );

  const openShopping = shopping.filter(
    (item) => item.status !== 'bought' && !item.archivedAt,
  );

  return (
    <section
      id="space-work"
      className="space-work-panel"
    >
      <div className="button-row">
        <button
          type="button"
          className={
            view === 'tasks'
              ? 'button primary compact'
              : 'button secondary compact'
          }
          onClick={() => setView('tasks')}
        >
          {space.type === 'household'
            ? 'To-Do'
            : 'Tasks'}
        </button>

        <button
          type="button"
          className={
            view === 'shopping'
              ? 'button primary compact'
              : 'button secondary compact'
          }
          onClick={() => setView('shopping')}
        >
          {space.type === 'sme'
            ? 'Purchase List'
            : 'To-Buy'}
        </button>
      </div>

      {message && (
        <div className="notice success">{message}</div>
      )}

      {error && (
        <div className="notice error">{error}</div>
      )}

      {loading && (
        <div className="loading-panel">
          Loading Space work...
        </div>
      )}

      {!loading && view === 'tasks' && (
        <>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {space.type === 'household'
                  ? 'Household'
                  : 'SME'}
              </span>
              <h2>
                {space.type === 'household'
                  ? 'To-Do'
                  : 'Tasks'}
              </h2>
              <p>
                Assign practical work without creating a
                financial record.
              </p>
            </div>
          </div>

          {canManage && (
            <details>
              <summary>Add Task</summary>

              <form
                className="form-stack"
                onSubmit={submitTask}
              >
                <label className="field">
                  <span>Task</span>
                  <input
                    name="title"
                    required
                    maxLength={120}
                  />
                </label>

                <label className="field">
                  <span>Assign to</span>
                  <select
                    name="assigneeUid"
                    defaultValue=""
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {activeMembers.map((member) => (
                      <option
                        value={member.uid}
                        key={member.uid}
                      >
                        {member.displayName ||
                          member.email ||
                          member.uid}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Due date</span>
                  <input name="dueDate" type="date" />
                </label>

                <label className="field">
                  <span>Priority</span>
                  <select
                    name="priority"
                    defaultValue="normal"
                  >
                    <option value="low">Low</option>
                    <option value="normal">
                      Normal
                    </option>
                    <option value="high">High</option>
                    <option value="urgent">
                      Urgent
                    </option>
                  </select>
                </label>

                <label className="field">
                  <span>Notes</span>
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={500}
                  />
                </label>

                <button
                  className="button primary"
                  disabled={Boolean(busy)}
                >
                  Add Task
                </button>
              </form>
            </details>
          )}

          {!visibleTasks.length ? (
            <div className="empty-inline">
              No Tasks yet. Add the next useful thing
              someone needs to do.
            </div>
          ) : (
            <div className="form-stack">
              {visibleTasks.map((item) => {
                const assignedToMe =
                  item.assigneeUid === currentMember?.uid;

                const canSetStatus =
                  canManage || assignedToMe;

                return (
                  <article
                    className="panel compact-panel"
                    key={item.id}
                  >
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">
                          {item.status === 'completed'
                            ? 'Completed'
                            : priorityLabel(item.priority)}
                        </span>

                        <h3>{item.title}</h3>

                        <small className="muted">
                          {item.assigneeName ||
                            item.assigneeEmail ||
                            'Unassigned'}

                          {item.dueDate
                            ? ' · Due ' + item.dueDate
                            : ''}
                        </small>
                      </div>
                    </div>

                    {item.note && <p>{item.note}</p>}

                    <div className="button-row">
                      {canSetStatus &&
                        item.status !== 'completed' && (
                          <button
                            type="button"
                            className="button secondary compact"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void runMutation(
                                'task-' + item.id,
                                () =>
                                  setSpaceWorkItemStatus({
                                    spaceId: space.id,
                                    itemId: item.id,
                                    status: 'completed',
                                  }),
                                'Task completed.',
                              )
                            }
                          >
                            Complete
                          </button>
                        )}

                      {canSetStatus &&
                        item.status === 'completed' && (
                          <button
                            type="button"
                            className="button secondary compact"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void runMutation(
                                'task-' + item.id,
                                () =>
                                  reopenSpaceWorkItem({
                                    spaceId: space.id,
                                    itemId: item.id,
                                  }),
                                'Task reopened.',
                              )
                            }
                          >
                            Reopen
                          </button>
                        )}

                      {canManage && (
                        <button
                          type="button"
                          className="button ghost compact"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void runMutation(
                              'archive-' + item.id,
                              () =>
                                archiveSpaceWorkItem({
                                  spaceId: space.id,
                                  itemId: item.id,
                                }),
                              'Task archived.',
                            )
                          }
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {!loading && view === 'shopping' && (
        <>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {space.type === 'sme'
                  ? 'Purchase List'
                  : 'Household'}
              </span>

              <h2>
                {space.type === 'sme'
                  ? 'Purchase List'
                  : 'To-Buy'}
              </h2>

              <p>
                Plan what to buy first. Actual spending is
                kept separate until the purchase is made.
              </p>
            </div>
          </div>

          {canManage && (
            <details>
              <summary>
                {space.type === 'sme'
                  ? '+ Add item'
                  : 'Add To-Buy item'}
              </summary>

              <form
                className="form-stack"
                onSubmit={submitShopping}
              >
                <label className="field">
                  <span>Item name</span>
                  <input
                    name="title"
                    required
                    maxLength={120}
                  />
                </label>

                <label className="field">
                  <span>Brand</span>
                  <input
                    name="brand"
                    maxLength={100}
                  />
                </label>

                <label className="field">
                  <span>Model</span>
                  <input
                    name="model"
                    maxLength={100}
                  />
                </label>

                <label className="field">
                  <span>Size / specification</span>
                  <input
                    name="size"
                    maxLength={100}
                  />
                </label>

                <label className="field">
                  <span>Quantity</span>
                  <input
                    name="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue="1"
                  />
                </label>

                <label className="field">
                  <span>Unit</span>
                  <input
                    name="unit"
                    maxLength={40}
                    placeholder="pcs, box, kg..."
                  />
                </label>

                <label className="field">
                  <span>
                    Target / expected price ({space.currency})
                  </span>
                  <input
                    name="targetPrice"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </label>

                <label className="field">
                  <span>
                    Preferred shop / vendor / place
                  </span>
                  <input
                    name="preferredPlace"
                    maxLength={160}
                  />
                </label>

                <label className="field">
                  <span>Assign to</span>
                  <select
                    name="assigneeUid"
                    defaultValue=""
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {activeMembers.map((member) => (
                      <option
                        value={member.uid}
                        key={member.uid}
                      >
                        {member.displayName ||
                          member.email ||
                          member.uid}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Needed by</span>
                  <input name="dueDate" type="date" />
                </label>

                <label className="field">
                  <span>Priority</span>
                  <select
                    name="priority"
                    defaultValue="normal"
                  >
                    <option value="low">Low</option>
                    <option value="normal">
                      Normal
                    </option>
                    <option value="high">High</option>
                    <option value="urgent">
                      Urgent
                    </option>
                  </select>
                </label>

                <label className="field">
                  <span>Notes</span>
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={500}
                  />
                </label>

                <label className="field">
                  <span>Item photo (optional)</span>

                  <input
                    name="itemPhoto"
                    type="file"
                    accept="image/*"
                    disabled={Boolean(busy)}
                  />

                  <small className="muted">
                    One shared item photo, smaller
                    than 5 MB.
                  </small>
                </label>

                <button
                  className="button primary"
                  disabled={Boolean(busy)}
                >
                  Add item
                </button>
              </form>
            </details>
          )}

          {!openShopping.length ? (
            <div className="empty-inline">
              {space.type === 'sme'
                ? 'No items on the Purchase List yet. Use + Add item to plan what the business needs to buy.'
                : 'Nothing waiting to be bought.'}
            </div>
          ) : (
            <div className="form-stack">
              {openShopping.map((item) => {
                const history = historyFor(item);

                return (
                  <article
                    className="panel compact-panel"
                    key={item.id}
                  >
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">
                          {priorityLabel(item.priority)}
                        </span>

                        <h3>{item.title}</h3>

                        <small className="muted">
                          {[
                            item.brand,
                            item.model,
                            item.size,
                            String(item.quantity || 1) +
                              (item.unit
                                ? ' ' + item.unit
                                : ''),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      </div>

                      {item.targetPriceMinor != null && (
                        <strong>
                          {formatMoney(
                            item.targetPriceMinor,
                            space.currency,
                          )}
                        </strong>
                      )}
                    </div>

                    {item.preferredPlace && (
                      <p>
                        Preferred place: {item.preferredPlace}
                      </p>
                    )}

                    {item.assigneeName && (
                      <p>
                        Assigned to: {item.assigneeName}
                      </p>
                    )}

                    {item.note && <p>{item.note}</p>}

                    {item.photoPath
                      && photoUrls[item.id] && (
                        <img
                          src={photoUrls[item.id]}
                          alt={item.title}
                          style={{
                            width: '100%',
                            maxHeight: '220px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                          }}
                        />
                      )}

                    {canManage && (
                      <div className="button-row">
                        <label className="button secondary compact">
                          {item.photoPath
                            ? 'Replace item photo'
                            : 'Add item photo'}

                          <input
                            hidden
                            type="file"
                            accept="image/*"
                            disabled={Boolean(busy)}
                            onChange={(event) => {
                              const file =
                                event.currentTarget
                                  .files?.[0];

                              event.currentTarget.value =
                                '';

                              if (!file) return;

                              void runMutation(
                                'photo-' + item.id,
                                () =>
                                  uploadSpaceWorkItemPhoto({
                                    spaceId: space.id,
                                    itemId: item.id,
                                    file,
                                  }),
                                'Item photo updated.',
                              );
                            }}
                          />
                        </label>

                        {item.photoPath && (
                          <button
                            type="button"
                            className="button ghost compact"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void runMutation(
                                'photo-remove-'
                                  + item.id,
                                () =>
                                  removeSpaceWorkItemPhoto({
                                    spaceId: space.id,
                                    itemId: item.id,
                                  }),
                                'Item photo removed.',
                              )
                            }
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    )}


                    {history && (
                      <div className="notice">
                        <strong>
                          Your own purchase history
                        </strong>

                        <span>
                          Last bought
                          {history.last.actualPlace
                            ? ' at ' +
                              history.last.actualPlace
                            : ''}

                          {history.last.actualPriceMinor !=
                          null
                            ? ' for ' +
                              formatMoney(
                                history.last.actualPriceMinor,
                                space.currency,
                              )
                            : ''}

                          {history.last.purchasedOn
                            ? ' on ' +
                              history.last.purchasedOn
                            : ''}.
                        </span>

                        {history.lowest != null && (
                          <span>
                            Lowest recorded price:{' '}
                            {formatMoney(
                              history.lowest,
                              space.currency,
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {(canManage ||
                      item.assigneeUid ===
                        currentMember?.uid) && (
                      <details>
                        <summary>Mark bought</summary>

                        <form
                          className="form-stack"
                          onSubmit={(event) => {
                            event.preventDefault();

                            const data = new FormData(
                              event.currentTarget,
                            );

                            void runMutation(
                              'bought-' + item.id,
                              () =>
                                markSpaceWorkItemBought({
                                  spaceId: space.id,
                                  itemId: item.id,
                                  actualPriceMinor:
                                    requiredMinor(
                                      formText(
                                        data,
                                        'actualPrice',
                                      ),
                                    ),
                                  actualPlace: formText(
                                    data,
                                    'actualPlace',
                                  ),
                                  purchasedOn: formText(
                                    data,
                                    'purchasedOn',
                                  ),
                                }),
                              'Purchase recorded.',
                            );
                          }}
                        >
                          <label className="field">
                            <span>
                              Actual price ({space.currency})
                            </span>
                            <input
                              name="actualPrice"
                              type="number"
                              min="0"
                              step="0.01"
                              required
                            />
                          </label>

                          <label className="field">
                            <span>
                              Actual shop / vendor / place
                            </span>
                            <input
                              name="actualPlace"
                              required
                              maxLength={160}
                            />
                          </label>

                          <label className="field">
                            <span>Purchase date</span>
                            <input
                              name="purchasedOn"
                              type="date"
                              required
                            />
                          </label>

                          <button
                            className="button primary"
                            disabled={Boolean(busy)}
                          >
                            Mark bought
                          </button>
                        </form>
                      </details>
                    )}

                    {canManage && (
                      <div className="button-row">
                        <button
                          type="button"
                          className="button ghost compact"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void runMutation(
                              'archive-' + item.id,
                              () =>
                                archiveSpaceWorkItem({
                                  spaceId: space.id,
                                  itemId: item.id,
                                }),
                              'Item archived.',
                            )
                          }
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {boughtHistory.length > 0 && (
            <details>
              <summary>
                Purchase history ({boughtHistory.length})
              </summary>

              <div className="form-stack">
                {boughtHistory.map((item) => (
                  <article
                    className="panel compact-panel"
                    key={item.id}
                  >
                    <strong>{item.title}</strong>
                    {item.linkedTransactionId && (
                      <small className="muted">
                        Financial record linked
                      </small>
                    )}

                    <small className="muted">
                      {item.purchasedOn || 'No date'}
                      {item.actualPlace
                        ? ' · ' + item.actualPlace
                        : ''}
                    </small>

                    {item.actualPriceMinor != null && (
                      <strong>
                        {formatMoney(
                          item.actualPriceMinor,
                          space.currency,
                        )}
                      </strong>
                    )}
                  </article>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
