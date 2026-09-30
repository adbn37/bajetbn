import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listAccountsForOwnerSpace } from '../../repositories/accountRepository';
import {
  ADBN_TECH_ADMIN_EMAIL,
  getAdbnTechConnectedEmail,
  loadAdbnTechExpensesReadOnly,
  loadAdbnTechInventoryReadOnly,
  loadAdbnTechPaymentsReadOnly,
  loadAdbnTechPurchasesReadOnly,
  loadAdbnTechReadOnlySnapshot,
  type AdbnTechExpensesReadOnlySnapshot,
  type AdbnTechInventoryReadOnlySnapshot,
  type AdbnTechPaymentsReadOnlySnapshot,
  type AdbnTechPurchasesReadOnlySnapshot,
  type AdbnTechReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import { findStalePostedAdbnExpenseTransactions } from '../../repositories/adbnTechExpenseSyncRepository';
import { findStalePostedAdbnPaymentTransactions } from '../../repositories/adbnTechPaymentSyncRepository';
import { getSpace } from '../../repositories/spaceRepository';
import { listBusinessTransactionsForSpace } from '../../repositories/transactionRepository';
import type { Account, FinancialTransaction, Space } from '../../types/models';

type Target =
  | 'adbn_customers'
  | 'adbn_invoices'
  | 'adbn_payments'
  | 'adbn_purchases'
  | 'adbn_expenses'
  | 'adbn_inventory'
  | 'setup';

function hasLabel(item: FinancialTransaction, value: string) {
  return (item.labels || []).some((label) => label.trim().toLowerCase() === value);
}
function hasPattern(item: FinancialTransaction, pattern: RegExp) {
  return (item.labels || []).some((label) => pattern.test(label.trim().toLowerCase()));
}
function dateTime(value: string) {
  if (!value) return 'Not enabled';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-BN', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function AdbnTechIntegrationHealthWorkspace({
  spaceId,
  onNavigate,
}: {
  spaceId: string;
  onNavigate: (view: Target) => void;
}) {
  const { user } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [core, setCore] = useState<AdbnTechReadOnlySnapshot | null>(null);
  const [payments, setPayments] = useState<AdbnTechPaymentsReadOnlySnapshot | null>(null);
  const [purchases, setPurchases] = useState<AdbnTechPurchasesReadOnlySnapshot | null>(null);
  const [expenses, setExpenses] = useState<AdbnTechExpensesReadOnlySnapshot | null>(null);
  const [inventory, setInventory] = useState<AdbnTechInventoryReadOnlySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');
    try {
      const [nextSpace, nextAccounts, nextTransactions] = await Promise.all([
        getSpace(spaceId),
        listAccountsForOwnerSpace(user.uid, spaceId),
        listBusinessTransactionsForSpace(spaceId),
      ]);
      setSpace(nextSpace);
      setAccounts(nextAccounts);
      setTransactions(nextTransactions);

      if (getAdbnTechConnectedEmail() !== ADBN_TECH_ADMIN_EMAIL) {
        setCore(null); setPayments(null); setPurchases(null); setExpenses(null); setInventory(null);
        return;
      }

      const [nextCore, nextPayments, nextPurchases, nextExpenses, nextInventory] =
        await Promise.all([
          loadAdbnTechReadOnlySnapshot(),
          loadAdbnTechPaymentsReadOnly(),
          loadAdbnTechPurchasesReadOnly(),
          loadAdbnTechExpensesReadOnly(),
          loadAdbnTechInventoryReadOnly(),
        ]);

      setCore(nextCore);
      setPayments(nextPayments);
      setPurchases(nextPurchases);
      setExpenses(nextExpenses);
      setInventory(nextInventory);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ADBN TECH integration health could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [spaceId, user?.uid]);

  useEffect(() => { void load(); }, [load]);

  const accountIds = useMemo(() => new Set(accounts.map((a) => a.id)), [accounts]);
  const activeAdbnAccounts = useMemo(
    () => (payments?.bankAccounts || []).filter((a) => a.isActive),
    [payments],
  );
  const mappings = space?.externalIntegrationAccountMappings || {};
  const mapped = activeAdbnAccounts.filter((a) => {
    const id = mappings[a.id];
    return Boolean(id && accountIds.has(id));
  }).length;
  const broken = activeAdbnAccounts.filter((a) => {
    const id = mappings[a.id];
    return Boolean(id && !accountIds.has(id));
  }).length;
  const unmapped = Math.max(0, activeAdbnAccounts.length - mapped - broken);

  const posted = useMemo(
    () => transactions.filter((t) => t.status === 'posted' && t.type !== 'reversal'),
    [transactions],
  );
  const syncedPayments = posted.filter(
    (t) => hasLabel(t, 'adbn_tech') && hasPattern(t, /^adbn_pay_[a-f0-9]{16}$/),
  ).length;
  const syncedSupplierPayments = posted.filter(
    (t) => hasLabel(t, 'adbn_tech')
      && hasLabel(t, 'adbn_supplier_payment')
      && hasPattern(t, /^adbn_suppay_[a-f0-9]{16}$/),
  ).length;
  const syncedExpenses = posted.filter(
    (t) => hasLabel(t, 'adbn_tech')
      && hasLabel(t, 'adbn_expense')
      && hasPattern(t, /^adbn_exp_[a-f0-9]{16}$/),
  ).length;
  const stalePayments = payments
    ? findStalePostedAdbnPaymentTransactions(payments.payments, transactions)
    : [];
  const staleExpenses = expenses
    ? findStalePostedAdbnExpenseTransactions(expenses.expenses, transactions)
    : [];
  const connected = getAdbnTechConnectedEmail() === ADBN_TECH_ADMIN_EMAIL;
  const loadedAt = expenses?.loadedAt || payments?.loadedAt || core?.loadedAt || '';

  if (user?.email?.trim().toLowerCase() !== 'zardeerwandy@gmail.com') return null;

  return (
    <section className="business-workspace-embedded-v115" data-adbn-tech-integration-health>
      <div className="business-home-v115-section-heading">
        <div><span>ADBN TECH · Integration</span><h2>Integration health</h2></div>
        <button type="button" className="button secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <p className="muted">
        One owner view for connection, account mappings, source counts and BajetBN sync health. This page is read-only against ADBN TECH.
      </p>

      {error && <div className="notice error">{error}</div>}

      {!connected ? (
        <div className="notice warning">
          ADBN TECH admin session is not connected. Open Business Setup to connect {ADBN_TECH_ADMIN_EMAIL}.
          <div className="header-actions">
            <button type="button" className="button secondary compact" onClick={() => onNavigate('setup')}>
              Open Business Setup
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="adbn-tech-mirror-meta-v115">
            <span>Session <strong>Connected</strong></span>
            <span>Mapped accounts <strong>{mapped}/{activeAdbnAccounts.length}</strong></span>
            <span>Unmapped <strong>{unmapped}</strong></span>
            <span>Broken mappings <strong>{broken}</strong></span>
            <span>Missing payments <strong>{stalePayments.length}</strong></span>
            <span>Missing expenses <strong>{staleExpenses.length}</strong></span>
            <span>Last read <strong>{loadedAt ? dateTime(loadedAt) : '—'}</strong></span>
          </div>

          {(unmapped > 0 || broken > 0 || stalePayments.length > 0 || staleExpenses.length > 0) && (
            <div className="notice warning">
              Review required: {unmapped} active ADBN account(s) unmapped, {broken} broken mapping(s), {stalePayments.length} stale customer payment Money In record(s), and {staleExpenses.length} stale expense Money Out record(s).
            </div>
          )}

          <div className="business-setup-grid-v115">
            <section className="panel">
              <span className="eyebrow">Customers & billing</span>
              <h3>{core?.customers.length || 0} customers</h3>
              <p className="muted">{core?.invoices.length || 0} invoices · {core?.paymentPlans.length || 0} payment plans.</p>
              <div className="header-actions">
                <button type="button" className="button secondary compact" onClick={() => onNavigate('adbn_customers')}>Customers</button>
                <button type="button" className="button secondary compact" onClick={() => onNavigate('adbn_invoices')}>Invoices</button>
              </div>
            </section>

            <section className="panel">
              <span className="eyebrow">Customer payments</span>
              <h3>{payments?.payments.length || 0} source payments</h3>
              <p className="muted">{syncedPayments} active BajetBN Money In record(s) · {stalePayments.length} missing in ADBN. Auto-sync is {space?.externalIntegrationPaymentAutoSyncEnabled === true ? 'ON' : 'OFF'}.</p>
              <small className="muted">
                {space?.externalIntegrationPaymentAutoSyncEnabled === true
                  ? 'From ' + dateTime(space.externalIntegrationPaymentAutoSyncCutoffIso || '')
                  : 'Historical payments remain manual.'}
              </small>
              <div className="header-actions">
                <button type="button" className="button secondary compact" onClick={() => onNavigate('adbn_payments')}>Open Payments</button>
              </div>
            </section>

            <section className="panel">
              <span className="eyebrow">Supplier purchases</span>
              <h3>{purchases?.purchases.length || 0} purchase line(s)</h3>
              <p className="muted">{purchases?.supplierPayments.length || 0} supplier payment record(s) · {syncedSupplierPayments} active BajetBN Money Out record(s).</p>
              <small className="muted">Automatic supplier Money Out eligibility remains based on ADBN purchase date from 25 Sep 2026 onward.</small>
              <div className="header-actions">
                <button type="button" className="button secondary compact" onClick={() => onNavigate('adbn_purchases')}>Open Purchases</button>
              </div>
            </section>

            <section className="panel">
              <span className="eyebrow">Expenses</span>
              <h3>{expenses?.expenses.length || 0} source expenses</h3>
              <p className="muted">{syncedExpenses} active BajetBN Money Out record(s) · {staleExpenses.length} missing in ADBN.</p>
              <small className="muted">Auto-sync and edit reconciliation are {space?.externalIntegrationExpenseAutoSyncEnabled === true ? 'ON' : 'OFF'}.</small>
              <div className="header-actions">
                <button type="button" className="button secondary compact" onClick={() => onNavigate('adbn_expenses')}>Open Expenses</button>
              </div>
            </section>

            <section className="panel">
              <span className="eyebrow">Inventory</span>
              <h3>{inventory?.products.length || 0} product(s)</h3>
              <p className="muted">ADBN inventory remains the operational source. BajetBN mirrors it for visibility.</p>
              <div className="header-actions">
                <button type="button" className="button secondary compact" onClick={() => onNavigate('adbn_inventory')}>Open Inventory</button>
              </div>
            </section>

            <section className="panel">
              <span className="eyebrow">Account mapping</span>
              <h3>{mapped} healthy mapping(s)</h3>
              <p className="muted">{unmapped} unmapped · {broken} mapped to a missing/closed BajetBN account.</p>
              <div className="header-actions">
                <button type="button" className="button secondary compact" onClick={() => onNavigate('adbn_payments')}>Manage mappings</button>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
