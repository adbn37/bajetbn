import {
  useCallback,
  useEffect,
  useMemo,
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
  adbnExpenseSyncLabel,
  syncAdbnTechExpenseToBajetBn,
} from '../../repositories/adbnTechExpenseSyncRepository';
import {
  getSpace,
  markAdbnTechIntegrationConnected,
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

  const accountById = useMemo(
    () => new Map(bajetAccounts.map((account) => [account.id, account])),
    [bajetAccounts],
  );

  const syncedLabels = useMemo(
    () => new Set(
      businessTransactions
        .flatMap((item) => item.labels || [])
        .map((label) => label.trim().toLowerCase()),
    ),
    [businessTransactions],
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
      syncedLabels.has(adbnExpenseSyncLabel(expense.id).toLowerCase()),
    ).length,
    [snapshot, syncedLabels],
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
          ADBN TECH expenses are already paid bank-ledger debits. This first slice keeps historical import manual: choose Sync to BajetBN only for the records you want in Money Activity. Account mapping is reused from Payments. Expense edits and deletions remain controlled in ADBN TECH and are not reconciled automatically in this slice.
        </span>
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
                const synced = syncedLabels.has(
                  adbnExpenseSyncLabel(expense.id).toLowerCase(),
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
                      {synced ? (
                        <><strong>Synced</strong><small>Money Out</small></>
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
    </section>
  );
}
