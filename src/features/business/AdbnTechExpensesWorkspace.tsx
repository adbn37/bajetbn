import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listAccountsForOwnerSpace,
} from '../../repositories/accountRepository';
import {
  ADBN_TECH_ADMIN_EMAIL,
  connectAdbnTechReadOnly,
  getAdbnTechConnectedEmail,
  loadAdbnTechExpensesReadOnly,
  type AdbnTechExpenseMirror,
  type AdbnTechExpensesReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  adbnExpenseCanPost,
  adbnExpenseTransactionMatches,
  autoReconcileChangedAdbnTechExpenses,
  autoSyncNewAdbnTechExpensesToBajetBn,
  findPostedAdbnExpenseTransaction,
  findStalePostedAdbnExpenseTransactions,
  reconcileAdbnTechExpenseToBajetBn,
  syncAdbnTechExpenseToBajetBn,
} from '../../repositories/adbnTechExpenseSyncRepository';
import {
  reverseStaleAdbnExpenseMoneyActivity,
} from '../../repositories/businessMoneyActivityRepository';
import {
  getSpace,
  markAdbnTechIntegrationConnected,
  setAdbnTechExpenseAutoSync,
} from '../../repositories/spaceRepository';
import {
  listBusinessTransactionsForSpace,
} from '../../repositories/transactionRepository';
import type {
  Account,
  FinancialTransaction,
} from '../../types/models';

function bnd(value: number) {
  return new Intl.NumberFormat('en-BN', {
    style: 'currency',
    currency: 'BND',
  }).format(value || 0);
}

function simpleDate(value: string) {
  if (!value) return '—';
  const parsed = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-BN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(parsed);
}

function simpleDateTime(
  value: string,
) {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(parsed);
}

function accountLabel(account: Account | undefined) {
  return account?.name || account?.id || '';
}

export function AdbnTechExpensesWorkspace({
  spaceId,
  onFinancialSync,
}: {
  spaceId: string;
  onFinancialSync?: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [connectedEmail, setConnectedEmail] = useState(() => getAdbnTechConnectedEmail());
  const [snapshot, setSnapshot] = useState<AdbnTechExpensesReadOnlySnapshot | null>(null);
  const [bajetAccounts, setBajetAccounts] = useState<Account[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  const [businessTransactions, setBusinessTransactions] = useState<FinancialTransaction[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncBusyExpenseId, setSyncBusyExpenseId] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [error, setError] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncCutoffIso, setAutoSyncCutoffIso] = useState('');
  const [autoSyncBusy, setAutoSyncBusy] = useState(false);
  const [autoSyncMessage, setAutoSyncMessage] = useState('');
  const [staleReverseConfirmId, setStaleReverseConfirmId] = useState('');
  const [staleReverseBusyId, setStaleReverseBusyId] = useState('');
  const autoSyncRunRef = useRef('');

  const load = useCallback(async () => {
    if (getAdbnTechConnectedEmail() !== ADBN_TECH_ADMIN_EMAIL) {
      setConnectedEmail('');
      setSnapshot(null);
      return;
    }

    if (!user?.uid) return;

    setLoading(true);
    setError('');

    try {
      const [nextSnapshot, nextAccounts, nextSpace, nextTransactions] = await Promise.all([
        loadAdbnTechExpensesReadOnly(),
        listAccountsForOwnerSpace(user.uid, spaceId),
        getSpace(spaceId),
        listBusinessTransactionsForSpace(spaceId),
      ]);

      setSnapshot(nextSnapshot);
      setConnectedEmail(nextSnapshot.connectedEmail);
      setBajetAccounts(nextAccounts);
      setSavedMappings(nextSpace?.externalIntegrationAccountMappings || {});
      setBusinessTransactions(nextTransactions);
      setAutoSyncEnabled(
        nextSpace?.externalIntegrationExpenseAutoSyncEnabled
        === true,
      );
      setAutoSyncCutoffIso(
        nextSpace?.externalIntegrationExpenseAutoSyncCutoffIso
        || '',
      );
      await markAdbnTechIntegrationConnected(spaceId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'ADBN TECH expenses could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [spaceId, user?.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setLoading(true);
    setError('');
    try {
      const email = await connectAdbnTechReadOnly();
      setConnectedEmail(email);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'ADBN TECH connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const enableAutoSync =
    async () => {
      const cutoffIso =
        new Date()
          .toISOString();

      setAutoSyncBusy(true);
      setAutoSyncMessage('');
      setError('');

      try {
        await setAdbnTechExpenseAutoSync(
          spaceId,
          {
            enabled: true,
            cutoffIso,
          },
        );

        setAutoSyncEnabled(true);
        setAutoSyncCutoffIso(
          cutoffIso,
        );
        autoSyncRunRef.current = '';
        setAutoSyncMessage(
          'Expense auto-sync enabled. New ADBN TECH expenses can post from now, and changed synced expenses can reconcile automatically.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH expense auto-sync could not be enabled.',
        );
      } finally {
        setAutoSyncBusy(false);
      }
    };

  const disableAutoSync =
    async () => {
      setAutoSyncBusy(true);
      setAutoSyncMessage('');
      setError('');

      try {
        await setAdbnTechExpenseAutoSync(
          spaceId,
          {
            enabled: false,
          },
        );

        setAutoSyncEnabled(false);
        setAutoSyncMessage(
          'Expense auto-sync is off. Manual Sync to BajetBN remains available.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH expense auto-sync could not be disabled.',
        );
      } finally {
        setAutoSyncBusy(false);
      }
    };

  const runFutureExpenseAutoSync =
    useCallback(
      async (
        expenses:
          AdbnTechExpenseMirror[],
      ) => {
        if (
          !autoSyncEnabled
          || !autoSyncCutoffIso
        ) {
          return;
        }

        setAutoSyncBusy(true);
        setAutoSyncMessage('');

        try {
          const syncSummary =
            await autoSyncNewAdbnTechExpensesToBajetBn(
              {
                spaceId,
                mappings:
                  savedMappings,
                cutoffIso:
                  autoSyncCutoffIso,
                expenses,
              },
            );

          const reconciliationSummary =
            await autoReconcileChangedAdbnTechExpenses(
              {
                spaceId,
                mappings:
                  savedMappings,
                expenses,
                transactions:
                  syncSummary.transactions,
                reversalDate:
                  new Intl.DateTimeFormat(
                    'en-CA',
                    {
                      timeZone:
                        'Asia/Brunei',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    },
                  )
                    .format(
                      new Date(),
                    ),
              },
            );

          setBusinessTransactions(
            reconciliationSummary.transactions,
          );

          if (
            (
              syncSummary.posted > 0
              || reconciliationSummary.reconciled > 0
            )
            && onFinancialSync
          ) {
            await onFinancialSync();
          }

          if (
            syncSummary.connected
            && reconciliationSummary.connected
            && (
              syncSummary.posted > 0
              || syncSummary.failed > 0
              || syncSummary.blocked > 0
              || reconciliationSummary.reconciled > 0
              || reconciliationSummary.failed > 0
              || reconciliationSummary.blocked > 0
            )
          ) {
            setAutoSyncMessage(
              syncSummary.posted
              + ' new expense'
              + (
                syncSummary.posted === 1
                  ? ''
                  : 's'
              )
              + ' auto-synced. '
              + reconciliationSummary.reconciled
              + ' changed expense'
              + (
                reconciliationSummary.reconciled === 1
                  ? ''
                  : 's'
              )
              + ' auto-reconciled. '
              + (
                syncSummary.blocked
                + reconciliationSummary.blocked
              )
              + ' blocked. '
              + (
                syncSummary.failed
                + reconciliationSummary.failed
              )
              + ' failed.',
            );
          }

          const firstError =
            syncSummary.firstError
            || reconciliationSummary.firstError;

          if (firstError) {
            setError(firstError);
          }
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'ADBN TECH expense auto-sync and reconciliation check failed.',
          );
        } finally {
          setAutoSyncBusy(false);
        }
      },
      [
        autoSyncCutoffIso,
        autoSyncEnabled,
        onFinancialSync,
        savedMappings,
        spaceId,
      ],
    );

  useEffect(
    () => {
      if (
        !snapshot
        || !autoSyncEnabled
        || !autoSyncCutoffIso
      ) {
        return;
      }

      const signature =
        snapshot.loadedAt
        + '|'
        + autoSyncCutoffIso
        + '|'
        + JSON.stringify(
          savedMappings,
        );

      if (
        autoSyncRunRef.current
        === signature
      ) {
        return;
      }

      autoSyncRunRef.current =
        signature;

      void runFutureExpenseAutoSync(
        snapshot.expenses,
      );
    },
    [
      autoSyncCutoffIso,
      autoSyncEnabled,
      runFutureExpenseAutoSync,
      savedMappings,
      snapshot,
    ],
  );

  const accountById = useMemo(
    () => new Map(bajetAccounts.map((account) => [account.id, account])),
    [bajetAccounts],
  );

  const filteredExpenses = useMemo(() => {
    const source = snapshot?.expenses || [];
    const needle = query.trim().toLowerCase();
    if (!needle) return source;

    return source.filter((expense) => [
      expense.expenseNo,
      expense.date,
      expense.category,
      expense.description,
      expense.supplier,
      expense.paymentMethod,
      expense.bankAccountName,
      expense.reference,
      expense.linkedJobNo,
      expense.linkedInvoiceNo,
      expense.notes,
    ].join(' ').toLowerCase().includes(needle));
  }, [query, snapshot]);

  const visibleTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );

  const syncedCount = useMemo(
    () => (snapshot?.expenses || []).filter((expense) =>
      Boolean(
        findPostedAdbnExpenseTransaction(
          expense.id,
          businessTransactions,
        ),
      ),
    ).length,
    [snapshot, businessTransactions],
  );

  const changedCount = useMemo(
    () => (snapshot?.expenses || []).filter((expense) => {
      const currentTransaction =
        findPostedAdbnExpenseTransaction(
          expense.id,
          businessTransactions,
        );

      if (!currentTransaction) {
        return false;
      }

      const mappedAccountId =
        expense.bankAccountId
          ? savedMappings[
              expense.bankAccountId
            ]
          : '';

      return !adbnExpenseTransactionMatches(
        expense,
        currentTransaction,
        spaceId,
        mappedAccountId,
      );
    }).length,
    [
      snapshot,
      businessTransactions,
      savedMappings,
      spaceId,
    ],
  );

  const staleExpenseTransactions = useMemo(
    () =>
      snapshot
        ? findStalePostedAdbnExpenseTransactions(
            snapshot.expenses,
            businessTransactions,
          )
        : [],
    [
      snapshot,
      businessTransactions,
    ],
  );

  const syncExpense = async (expense: AdbnTechExpenseMirror) => {
    if (syncBusyExpenseId) return;

    const mappedAccountId = expense.bankAccountId
      ? savedMappings[expense.bankAccountId]
      : '';

    if (!expense.bankAccountId) {
      setError('This ADBN TECH expense has no paying bank/cash account.');
      return;
    }

    if (!mappedAccountId) {
      setError('Map the ADBN TECH paying account in Payments first.');
      return;
    }

    setSyncBusyExpenseId(expense.id);
    setSyncMessage('');
    setError('');

    try {
      const outcome = await syncAdbnTechExpenseToBajetBn({
        expense,
        spaceId,
        mappedAccountId,
      });

      if (outcome.mode !== 'posted') {
        throw new Error('ADBN TECH expense did not post immediately.');
      }

      const nextTransactions = await listBusinessTransactionsForSpace(spaceId);
      setBusinessTransactions(nextTransactions);

      if (onFinancialSync) await onFinancialSync();

      setSyncMessage(
        (expense.expenseNo || expense.id)
        + ' synced to BajetBN Money Activity as Money Out.',
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'ADBN TECH expense could not be synced.');
    } finally {
      setSyncBusyExpenseId('');
    }
  };


  const reconcileExpense = async (
    expense: AdbnTechExpenseMirror,
    currentTransaction: FinancialTransaction,
  ) => {
    if (syncBusyExpenseId) return;

    const mappedAccountId =
      expense.bankAccountId
        ? savedMappings[
            expense.bankAccountId
          ]
        : '';

    if (!expense.bankAccountId) {
      setError(
        'This ADBN TECH expense has no paying bank/cash account.',
      );
      return;
    }

    if (!mappedAccountId) {
      setError(
        'Map the ADBN TECH paying account in Payments first.',
      );
      return;
    }

    setSyncBusyExpenseId(
      expense.id,
    );
    setSyncMessage('');
    setError('');

    try {
      const outcome =
        await reconcileAdbnTechExpenseToBajetBn({
          expense,
          currentTransaction,
          spaceId,
          mappedAccountId,
          reversalDate:
            new Intl.DateTimeFormat(
              'en-CA',
              {
                timeZone:
                  'Asia/Brunei',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              },
            )
              .format(
                new Date(),
              ),
        });

      if (
        outcome.mode
        !== 'posted'
      ) {
        throw new Error(
          'ADBN TECH expense correction did not post immediately.',
        );
      }

      const nextTransactions =
        await listBusinessTransactionsForSpace(
          spaceId,
        );

      setBusinessTransactions(
        nextTransactions,
      );

      if (onFinancialSync) {
        await onFinancialSync();
      }

      setSyncMessage(
        (
          expense.expenseNo
          || expense.id
        )
        + ' reconciled. The previous Money Out was reversed and the corrected ADBN expense was posted.',
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH expense change could not be reconciled.',
      );
    } finally {
      setSyncBusyExpenseId('');
    }
  };

  const reverseStaleExpenseFromWorkspace =
    async (
      transaction: FinancialTransaction,
    ) => {
      if (staleReverseBusyId) {
        return;
      }

      if (
        staleReverseConfirmId
        !== transaction.id
      ) {
        setStaleReverseConfirmId(
          transaction.id,
        );
        setSyncMessage('');
        setError('');
        return;
      }

      setStaleReverseBusyId(
        transaction.id,
      );
      setSyncMessage('');
      setError('');

      try {
        const today =
          new Intl.DateTimeFormat(
            'en-CA',
            {
              timeZone:
                'Asia/Brunei',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            },
          )
            .format(
              new Date(),
            );

        await reverseStaleAdbnExpenseMoneyActivity({
          transactionId:
            transaction.id,
          transactionDate:
            today,
          reason:
            'Owner confirmed the ADBN TECH source expense is deleted; stale BajetBN Money Out reversed manually from the Expenses workspace.',
        });

        const nextTransactions =
          await listBusinessTransactionsForSpace(
            spaceId,
          );

        setBusinessTransactions(
          nextTransactions,
        );
        setStaleReverseConfirmId('');

        if (onFinancialSync) {
          await onFinancialSync();
        }

        setSyncMessage(
          'Stale ADBN TECH expense Money Out reversed. History is preserved and the Business Account, ledger, budgets and reports were updated.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Stale ADBN TECH expense could not be reversed.',
        );
      } finally {
        setStaleReverseBusyId('');
      }
    };

  if (user?.email?.trim().toLowerCase() !== 'zardeerwandy@gmail.com') {
    return null;
  }

  if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL) {
    return (
      <section className="panel adbn-tech-mirror-connect-v115" data-adbn-tech-expenses-connect>
        <span className="eyebrow">ADBN TECH expenses</span>
        <h2>Connect the ADBN TECH admin account</h2>
        <p className="muted">
          ADBN TECH remains read-only from BajetBN. Once connected, expenses can be reviewed and deliberately posted into BajetBN Money Activity.
        </p>
        <div className="adbn-tech-mirror-connect-actions-v115">
          <button type="button" className="button primary" disabled={loading} onClick={() => void connect()}>
            {loading ? 'Connecting…' : 'Connect ADBN TECH'}
          </button>
          <small>Choose {ADBN_TECH_ADMIN_EMAIL} in the Google account picker.</small>
        </div>
        {error && <div className="notice error">{error}</div>}
        <small className="muted">ADBN TECH remains the source of truth for expense records and its bank ledger.</small>
      </section>
    );
  }

  return (
    <section className="business-workspace-embedded-v115 adbn-tech-mirror-v115" data-adbn-tech-expenses-workspace>
      <div className="business-home-v115-section-heading">
        <div>
          <span>ADBN TECH · Operational mirror</span>
          <h2>Expenses</h2>
        </div>
      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>Connected as <strong>{connectedEmail}</strong></span>
        <span>Expenses <strong>{snapshot?.expenses.length || 0}</strong></span>
        <span>Synced Money Out <strong>{syncedCount}</strong></span>
        <span>Changed <strong>{changedCount}</strong></span>
        <span>Missing in ADBN <strong>{staleExpenseTransactions.length}</strong></span>
        <span>Visible total <strong>{bnd(visibleTotal)}</strong></span>
        <span>Source <strong>expenses</strong></span>
      </div>

      <label className="adbn-tech-mirror-search-v115">
        <span>Search</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Expense no., category, description, supplier, account..."
        />
      </label>

      <div className="info-banner" data-adbn-expense-manual-sync>
        <strong>Manual Money Out sync</strong>
        <span>
          ADBN TECH expenses are already paid bank-ledger debits. Historical import remains manual. After a synced expense is edited in ADBN TECH, BajetBN marks it Changed and lets you reconcile it by reversing the old Money Out and posting the corrected source values. If a synced Money Out is absent from the current ADBN expense snapshot, BajetBN flags it as Missing in ADBN for owner review; a missing snapshot is never auto-reversed.
        </span>
      </div>

      <div
        className="panel adbn-tech-account-mapping-v115"
        data-adbn-tech-expense-auto-sync
      >
        <div>
          <span className="eyebrow">
            Future expenses
          </span>
          <h3>
            Auto-sync new ADBN TECH expenses
          </h3>
          <p className="muted">
            Existing expenses stay manual. When enabled, only ADBN TECH expense records created after the activation time can post automatically to the mapped BajetBN Business account. The source createdAt timestamp controls this boundary, not the expense date. Already-synced expenses are automatically reconciled if their ADBN source values change. Deleted or missing source expenses are never reversed automatically.
          </p>
        </div>

        {autoSyncEnabled ? (
          <div className="adbn-tech-account-mapping-footer-v115">
            <div>
              <strong>
                Auto-sync on
              </strong>
              <span>
                {' · from '}
                {simpleDateTime(
                  autoSyncCutoffIso,
                )}
              </span>
            </div>

            <button
              type="button"
              className="button secondary"
              disabled={autoSyncBusy}
              onClick={() =>
                void disableAutoSync()
              }
            >
              {autoSyncBusy
                ? 'Updating...'
                : 'Turn off auto-sync'}
            </button>
          </div>
        ) : (
          <div className="adbn-tech-account-mapping-footer-v115">
            <div>
              <strong>
                Auto-sync off
              </strong>
              <span>
                {' '}
                Older expenses will never be imported automatically.
              </span>
            </div>

            <button
              type="button"
              className="button primary"
              disabled={
                autoSyncBusy
                || !Object.keys(
                  savedMappings,
                ).length
              }
              onClick={() =>
                void enableAutoSync()
              }
            >
              {autoSyncBusy
                ? 'Enabling...'
                : 'Enable auto-sync from now'}
            </button>
          </div>
        )}

        {autoSyncMessage && (
          <div className="notice success">
            {autoSyncMessage}
          </div>
        )}
      </div>

      {syncMessage && <div className="notice success">{syncMessage}</div>}
      {error && <div className="notice error">{error}</div>}

      {!snapshot && loading ? (
        <div className="loading-panel">Loading ADBN TECH expenses…</div>
      ) : (
        <div className="adbn-tech-table-wrap-v115" data-adbn-tech-expense-sync>
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Paid From</th>
                <th>BajetBN Mapping</th>
                <th>BajetBN Sync</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const mappedAccountId = expense.bankAccountId
                  ? savedMappings[expense.bankAccountId]
                  : '';
                const mappedAccount = mappedAccountId
                  ? accountById.get(mappedAccountId)
                  : undefined;
                const currentTransaction =
                  findPostedAdbnExpenseTransaction(
                    expense.id,
                    businessTransactions,
                  );

                const synced =
                  Boolean(
                    currentTransaction,
                  );

                const changed =
                  Boolean(
                    currentTransaction,
                  )
                  && !adbnExpenseTransactionMatches(
                    expense,
                    currentTransaction as FinancialTransaction,
                    spaceId,
                    mappedAccountId,
                  );

                const ready = Boolean(mappedAccountId)
                  && Boolean(expense.bankAccountId)
                  && adbnExpenseCanPost(expense);

                return (
                  <tr key={expense.id}>
                    <td><strong>{expense.expenseNo || expense.id}</strong><small>ADBN expense</small></td>
                    <td>{simpleDate(expense.date)}</td>
                    <td><span>{expense.category || 'Other'}</span><small>{expense.accountType || ''}</small></td>
                    <td><span>{expense.description || '—'}</span><small>{expense.supplier || expense.reference || ''}</small></td>
                    <td><strong>{bnd(expense.amount)}</strong><small>{expense.paymentMethod || 'No method'}</small></td>
                    <td><span>{expense.bankAccountName || expense.bankAccountId || 'Unassigned'}</span><small>{expense.bankAccountType || ''}</small></td>
                    <td>
                      {mappedAccountId ? (
                        <><strong>{accountLabel(mappedAccount) || mappedAccountId}</strong><small>{mappedAccount?.currency || 'Mapped in Payments'}</small></>
                      ) : (
                        <><span className="adbn-tech-mapping-required-v115">Mapping required</span><small>Set account mapping in Payments</small></>
                      )}
                    </td>
                    <td>
                      {synced && !changed ? (
                        <><strong>Synced</strong><small>Money Out matches ADBN</small></>
                      ) : synced && changed && ready ? (
                        <button
                          type="button"
                          className="button secondary compact"
                          data-adbn-expense-reconcile
                          disabled={Boolean(syncBusyExpenseId)}
                          onClick={() =>
                            void reconcileExpense(
                              expense,
                              currentTransaction as FinancialTransaction,
                            )
                          }
                        >
                          {syncBusyExpenseId === expense.id
                            ? 'Reconciling...'
                            : 'Reconcile change'}
                        </button>
                      ) : synced && changed ? (
                        <><strong>Changed</strong><small>{!expense.bankAccountId ? 'No ADBN account' : !adbnExpenseCanPost(expense) ? 'Check date / amount' : 'Map account in Payments'}</small></>
                      ) : ready ? (
                        <button
                          type="button"
                          className="button secondary compact"
                          disabled={Boolean(syncBusyExpenseId)}
                          onClick={() => void syncExpense(expense)}
                        >
                          {syncBusyExpenseId === expense.id ? 'Syncing...' : 'Sync to BajetBN'}
                        </button>
                      ) : (
                        <><span>Blocked</span><small>{!expense.bankAccountId ? 'No ADBN account' : !adbnExpenseCanPost(expense) ? 'Check date / amount' : 'Map account in Payments'}</small></>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!filteredExpenses.length && (
                <tr><td colSpan={8} className="muted">No matching ADBN TECH expenses.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {snapshot && staleExpenseTransactions.length > 0 && (
        <section
          className="panel"
          data-adbn-expense-stale-review
        >
          <div className="business-home-v115-section-heading">
            <div>
              <span>Owner review only</span>
              <h3>Missing in ADBN</h3>
            </div>
          </div>

          <div className="notice warning">
            These active BajetBN Money Out records have ADBN expense labels that are absent from the current ADBN expense snapshot. Review the source before reversing. Detection alone never changes money.
          </div>

          <div className="adbn-tech-table-wrap-v115">
            <table className="adbn-tech-table-v115">
              <thead>
                <tr>
                  <th>Money Out</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Account</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {staleExpenseTransactions.map(
                  (transaction) => {
                    const account =
                      accountById.get(
                        transaction.accountId,
                      );

                    const confirming =
                      staleReverseConfirmId
                      === transaction.id;

                    const busy =
                      staleReverseBusyId
                      === transaction.id;

                    return (
                      <tr
                        key={transaction.id}
                        data-adbn-expense-stale-row
                      >
                        <td>
                          <strong>Missing in ADBN</strong>
                          <small>{transaction.id}</small>
                        </td>
                        <td>
                          {simpleDate(
                            transaction.transactionDate,
                          )}
                        </td>
                        <td>
                          <span>
                            {transaction.counterparty
                              || 'ADBN TECH expense'}
                          </span>
                          <small>
                            {transaction.note || ''}
                          </small>
                        </td>
                        <td>
                          <strong>
                            {bnd(
                              transaction.amountMinor
                              / 100,
                            )}
                          </strong>
                        </td>
                        <td>
                          <span>
                            {accountLabel(account)
                              || transaction.accountId}
                          </span>
                          <small>
                            {account?.currency || ''}
                          </small>
                        </td>
                        <td>
                          {confirming ? (
                            <div className="header-actions">
                              <button
                                type="button"
                                className="button danger compact"
                                data-adbn-expense-stale-confirm
                                disabled={busy}
                                onClick={() =>
                                  void reverseStaleExpenseFromWorkspace(
                                    transaction,
                                  )
                                }
                              >
                                {busy
                                  ? 'Reversing...'
                                  : 'Confirm reverse'}
                              </button>

                              <button
                                type="button"
                                className="button secondary compact"
                                disabled={busy}
                                onClick={() =>
                                  setStaleReverseConfirmId('')
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="button danger compact"
                              data-adbn-expense-stale-review-action
                              disabled={Boolean(staleReverseBusyId)}
                              onClick={() =>
                                void reverseStaleExpenseFromWorkspace(
                                  transaction,
                                )
                              }
                            >
                              Reverse stale expense
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
