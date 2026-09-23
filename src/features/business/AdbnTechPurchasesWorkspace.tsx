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
  loadAdbnTechPurchasesReadOnly,
  type AdbnTechPurchaseMirror,
  type AdbnTechPurchasesReadOnlySnapshot,
  type AdbnTechSupplierPaymentMirror,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  adbnSupplierPaymentCanPost,
  adbnSupplierPaymentSyncLabel,
  syncAdbnTechSupplierPaymentToBajetBn,
} from '../../repositories/adbnTechSupplierPaymentSyncRepository';
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

type PurchaseView =
  | 'purchases'
  | 'supplier_payments';

function bnd(value: number) {
  return new Intl.NumberFormat('en-BN', {
    style: 'currency',
    currency: 'BND',
  }).format(value || 0);
}

function simpleDate(value: string) {
  if (!value) return '—';

  const parsed = new Date(
    value
    + (
      value.length === 10
        ? 'T00:00:00'
        : ''
    ),
  );

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    },
  ).format(parsed);
}

function accountLabel(
  account: Account | undefined,
) {
  if (!account) {
    return '';
  }

  return account.name || account.id;
}

export function AdbnTechPurchasesWorkspace({
  spaceId,
  onFinancialSync,
}: {
  spaceId: string;
  onFinancialSync?: () => void | Promise<void>;
}) {
  const { user } = useAuth();

  const [
    connectedEmail,
    setConnectedEmail,
  ] = useState(
    () => getAdbnTechConnectedEmail(),
  );

  const [
    snapshot,
    setSnapshot,
  ] = useState<
    AdbnTechPurchasesReadOnlySnapshot | null
  >(null);

  const [
    view,
    setView,
  ] = useState<PurchaseView>('purchases');

  const [
    bajetAccounts,
    setBajetAccounts,
  ] = useState<Account[]>([]);

  const [
    savedMappings,
    setSavedMappings,
  ] = useState<Record<string, string>>({});

  const [
    businessTransactions,
    setBusinessTransactions,
  ] = useState<FinancialTransaction[]>([]);

  const [query, setQuery] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    syncBusyPaymentId,
    setSyncBusyPaymentId,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [syncMessage, setSyncMessage] =
    useState('');

  const loadBajetBnSide =
    useCallback(
      async () => {
        if (!user?.uid) {
          return;
        }

        try {
          const [
            nextAccounts,
            nextSpace,
            nextTransactions,
          ] = await Promise.all([
            listAccountsForOwnerSpace(
              user.uid,
              spaceId,
            ),
            getSpace(spaceId),
            listBusinessTransactionsForSpace(
              spaceId,
            ),
          ]);

          setBajetAccounts(nextAccounts);
          setSavedMappings(
            nextSpace
              ?.externalIntegrationAccountMappings
            || {},
          );
          setBusinessTransactions(
            nextTransactions,
          );
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'BajetBN purchase sync information could not be loaded.',
          );
        }
      },
      [spaceId, user?.uid],
    );

  const loadPurchases =
    useCallback(
      async () => {
        if (
          getAdbnTechConnectedEmail()
          !== ADBN_TECH_ADMIN_EMAIL
        ) {
          setConnectedEmail('');
          setSnapshot(null);
          return;
        }

        setLoading(true);
        setError('');

        try {
          const next =
            await loadAdbnTechPurchasesReadOnly();

          setSnapshot(next);
          setConnectedEmail(
            next.connectedEmail,
          );

          await markAdbnTechIntegrationConnected(
            spaceId,
          );
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'ADBN TECH purchases could not be loaded.',
          );
        } finally {
          setLoading(false);
        }
      },
      [spaceId],
    );

  useEffect(() => {
    void loadBajetBnSide();
  }, [loadBajetBnSide]);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases]);

  const connect = async () => {
    setLoading(true);
    setError('');

    try {
      const email =
        await connectAdbnTechReadOnly();

      setConnectedEmail(email);

      await markAdbnTechIntegrationConnected(
        spaceId,
      );

      await loadPurchases();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH connection failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  const syncedLabels =
    useMemo(
      () =>
        new Set(
          businessTransactions
            .flatMap(
              (item) =>
                item.labels || [],
            )
            .map(
              (label) =>
                label.toLowerCase(),
            ),
        ),
      [businessTransactions],
    );

  const accountById =
    useMemo(
      () =>
        new Map(
          bajetAccounts.map(
            (account) => [
              account.id,
              account,
            ],
          ),
        ),
      [bajetAccounts],
    );

  const syncSupplierPayment =
    async (
      payment: AdbnTechSupplierPaymentMirror,
    ) => {
      if (
        syncBusyPaymentId
        || !adbnSupplierPaymentCanPost(
          payment,
        )
      ) {
        return;
      }

      const mappedAccountId =
        payment.bankAccountId
          ? savedMappings[
              payment.bankAccountId
            ]
          : '';

      if (!mappedAccountId) {
        setError(
          'Map this ADBN TECH bank or cash account under Payments first.',
        );
        return;
      }

      const syncLabel =
        adbnSupplierPaymentSyncLabel(
          payment.id,
        );

      const alreadySynced =
        syncedLabels.has(
          syncLabel.toLowerCase(),
        );

      if (alreadySynced) {
        setSyncMessage(
          (payment.paymentNo || payment.id)
          + ' is already synced to BajetBN.',
        );
        return;
      }

      setSyncBusyPaymentId(
        payment.id,
      );
      setSyncMessage('');
      setError('');

      try {
        const outcome =
          await syncAdbnTechSupplierPaymentToBajetBn(
            {
              payment,
              spaceId,
              mappedAccountId,
            },
          );

        if (outcome.mode !== 'posted') {
          throw new Error(
            'The supplier payment did not post immediately.',
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
          (payment.paymentNo || payment.id)
          + ' synced to BajetBN Money activity as Money Out.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH supplier payment could not be synced.',
        );
      } finally {
        setSyncBusyPaymentId('');
      }
    };

  const normalizedQuery =
    query.trim().toLowerCase();

  const purchases =
    useMemo(
      () => {
        const rows =
          snapshot?.purchases || [];

        if (!normalizedQuery) {
          return rows;
        }

        return rows.filter(
          (item) =>
            [
              item.purchaseNo,
              item.sellerName,
              item.brand,
              item.model,
              item.category,
              item.orderStatus,
              item.paymentStatus,
              item.linkedBuildNo,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    normalizedQuery,
                  ),
            ),
        );
      },
      [normalizedQuery, snapshot],
    );

  const supplierPayments =
    useMemo(
      () => {
        const rows =
          snapshot?.supplierPayments
          || [];

        if (!normalizedQuery) {
          return rows;
        }

        return rows.filter(
          (item) =>
            [
              item.paymentNo,
              item.purchaseNo,
              item.supplierName,
              item.paymentMethod,
              item.reference,
              item.note,
              item.bankAccountName,
              item.status,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    normalizedQuery,
                  ),
            ),
        );
      },
      [normalizedQuery, snapshot],
    );

  const visibleTotal =
    useMemo(
      () =>
        purchases.reduce(
          (sum, item) =>
            sum + item.totalCost,
          0,
        ),
      [purchases],
    );

  const visibleSupplierPaid =
    useMemo(
      () =>
        supplierPayments.reduce(
          (sum, item) =>
            item.amount > 0
              ? sum + item.amount
              : sum,
          0,
        ),
      [supplierPayments],
    );

  const syncedSupplierPaymentCount =
    useMemo(
      () =>
        (snapshot?.supplierPayments || [])
          .filter(
            (payment) =>
              syncedLabels.has(
                adbnSupplierPaymentSyncLabel(
                  payment.id,
                ).toLowerCase(),
              ),
          )
          .length,
      [snapshot, syncedLabels],
    );

  if (
    user?.email
      ?.trim()
      .toLowerCase()
    !== 'zardeerwandy@gmail.com'
  ) {
    return null;
  }

  if (
    connectedEmail
    !== ADBN_TECH_ADMIN_EMAIL
  ) {
    return (
      <section
        className="panel adbn-tech-mirror-connect-v115"
        data-adbn-tech-purchases-connect
      >
        <span className="eyebrow">
          ADBN TECH purchases
        </span>

        <h2>
          Connect the ADBN TECH admin account
        </h2>

        <p className="muted">
          ADBN TECH remains read-only from BajetBN. Once connected, purchase records can be reviewed and eligible supplier payments can be posted into BajetBN Money Activity.
        </p>

        <div className="adbn-tech-mirror-connect-actions-v115">
          <button
            type="button"
            className="button primary"
            disabled={loading}
            onClick={() =>
              void connect()
            }
          >
            {loading
              ? 'Connecting…'
              : 'Connect ADBN TECH'}
          </button>

          <small>
            Choose {ADBN_TECH_ADMIN_EMAIL} in the Google account picker.
          </small>
        </div>

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <small className="muted">
          ADBN TECH remains the source of truth for purchases, supplier payments and stock.
        </small>
      </section>
    );
  }

  return (
    <section
      className="business-workspace-embedded-v115 adbn-tech-mirror-v115"
      data-adbn-tech-purchases-workspace
    >
      <div className="business-home-v115-section-heading">
        <div>
          <span>
            ADBN TECH · Operational mirror
          </span>
          <h2>Purchases</h2>
        </div>
      </div>

      <div
        className="business-finance-nav-v115"
        aria-label="ADBN TECH purchase view"
      >
        <button
          type="button"
          className={
            view === 'purchases'
              ? 'active'
              : ''
          }
          onClick={() => {
            setView('purchases');
            setQuery('');
          }}
        >
          Purchases
        </button>

        <button
          type="button"
          className={
            view === 'supplier_payments'
              ? 'active'
              : ''
          }
          onClick={() => {
            setView('supplier_payments');
            setQuery('');
          }}
        >
          Supplier Payments
        </button>
      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>
          Connected as{' '}
          <strong>
            {connectedEmail}
          </strong>
        </span>

        <span>
          Purchases{' '}
          <strong>
            {snapshot?.purchases.length || 0}
          </strong>
        </span>

        <span>
          Supplier payments{' '}
          <strong>
            {snapshot?.supplierPayments.length || 0}
          </strong>
        </span>

        <span>
          Synced Money Out{' '}
          <strong>
            {syncedSupplierPaymentCount}
          </strong>
        </span>

        <span>
          {view === 'purchases'
            ? 'Visible total '
            : 'Visible paid '}
          <strong>
            {view === 'purchases'
              ? bnd(visibleTotal)
              : bnd(visibleSupplierPaid)}
          </strong>
        </span>

        <span>
          Source{' '}
          <strong>
            {view === 'purchases'
              ? 'supplierPartPurchases'
              : 'supplierPayments'}
          </strong>
        </span>
      </div>

      <label className="adbn-tech-mirror-search-v115">
        <span>
          Search
        </span>

        <input
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
          placeholder={
            view === 'purchases'
              ? 'Purchase no., seller, part, status...'
              : 'Payment, purchase, supplier, account, reference...'
          }
        />
      </label>

      {syncMessage && (
        <div className="notice success">
          {syncMessage}
        </div>
      )}

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {!snapshot && loading ? (
        <div className="loading-panel">
          Loading ADBN TECH purchases…
        </div>
      ) : view === 'purchases' ? (
        <div className="adbn-tech-table-wrap-v115">
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Purchase</th>
                <th>Part</th>
                <th>Seller</th>
                <th>Receiving</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {purchases.map(
                (
                  item:
                    AdbnTechPurchaseMirror,
                ) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.purchaseNo
                          || item.id}
                      </strong>
                      <small>
                        {simpleDate(
                          item.purchaseDate,
                        )}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {[
                          item.brand,
                          item.model,
                        ]
                          .filter(Boolean)
                          .join(' ')
                          || item.category
                          || 'Unnamed part'}
                      </strong>
                      <small>
                        {[
                          item.category,
                          item.condition,
                          item.linkedBuildNo
                            ? 'Build '
                              + item.linkedBuildNo
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')
                          || '—'}
                      </small>
                    </td>

                    <td>
                      <span>
                        {item.sellerName
                          || '—'}
                      </span>
                      <small>
                        {item.sellerType
                          || 'Supplier'}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {item.quantityReceived}
                        /
                        {item.quantity}
                      </strong>
                      <small>
                        {item.quantityOutstanding > 0
                          ? item.quantityOutstanding
                            + ' outstanding'
                          : item.receivedDate
                            ? 'Received '
                              + simpleDate(
                                item.receivedDate,
                              )
                            : 'No outstanding quantity'}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {bnd(item.totalCost)}
                      </strong>
                      <small>
                        {item.quantity > 0
                          ? bnd(item.unitPrice)
                            + ' each'
                          : '—'}
                      </small>
                    </td>

                    <td>
                      <span>
                        {item.orderStatus
                          || '—'}
                      </span>
                      <small>
                        {[
                          item.paymentStatus,
                          item.inventoryAdded
                            ? 'Inventory added'
                            : item.linkedProductId
                              ? 'Product linked'
                              : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')
                          || 'Read only'}
                      </small>
                    </td>
                  </tr>
                ),
              )}

              {!purchases.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      No ADBN TECH purchase records match this view.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="adbn-tech-table-wrap-v115"
          data-adbn-tech-supplier-payment-sync
        >
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Payment</th>
                <th>Purchase</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Paid From</th>
                <th>BajetBN Mapping</th>
                <th>BajetBN Sync</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {supplierPayments.map(
                (payment) => {
                  const mappedAccountId =
                    payment.bankAccountId
                      ? savedMappings[
                          payment.bankAccountId
                        ]
                      : '';

                  const mappedAccount =
                    mappedAccountId
                      ? accountById.get(
                          mappedAccountId,
                        )
                      : undefined;

                  const syncLabel =
                    adbnSupplierPaymentSyncLabel(
                      payment.id,
                    );

                  const synced =
                    syncedLabels.has(
                      syncLabel
                        .toLowerCase(),
                    );

                  const ready =
                    Boolean(mappedAccountId)
                    && adbnSupplierPaymentCanPost(
                      payment,
                    );

                  return (
                    <tr key={payment.id}>
                      <td>
                        <strong>
                          {payment.paymentNo
                            || payment.id}
                        </strong>
                        <small>
                          ADBN supplier payment
                        </small>
                      </td>

                      <td>
                        <strong>
                          {payment.purchaseNo
                            || payment.purchaseGroupId
                            || payment.purchaseId
                            || '—'}
                        </strong>
                      </td>

                      <td>
                        <span>
                          {payment.supplierName
                            || '—'}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {bnd(
                            Math.abs(
                              payment.amount,
                            ),
                          )}
                        </strong>
                        <small>
                          {payment.amount < 0
                            ? 'Reversal / credit'
                            : 'Supplier payment'}
                        </small>
                      </td>

                      <td>
                        {simpleDate(
                          payment.paymentDate,
                        )}
                      </td>

                      <td>
                        <span>
                          {payment.bankAccountName
                            || payment.bankAccountId
                            || 'Unassigned'}
                        </span>
                        <small>
                          {payment.paymentMethod
                            || 'No method'}
                        </small>
                      </td>

                      <td>
                        {mappedAccountId ? (
                          <>
                            <strong>
                              {accountLabel(
                                mappedAccount,
                              )
                                || mappedAccountId}
                            </strong>
                            <small>
                              {mappedAccount?.currency
                                || 'Mapped in Payments'}
                            </small>
                          </>
                        ) : (
                          <>
                            <span className="adbn-tech-mapping-required-v115">
                              Mapping required
                            </span>
                            <small>
                              Set account mapping in Payments
                            </small>
                          </>
                        )}
                      </td>

                      <td>
                        {synced ? (
                          <>
                            <strong>
                              Synced
                            </strong>
                            <small>
                              Money Out
                            </small>
                          </>
                        ) : ready ? (
                          <button
                            type="button"
                            className="button secondary compact"
                            disabled={
                              Boolean(
                                syncBusyPaymentId,
                              )
                            }
                            onClick={() =>
                              void syncSupplierPayment(
                                payment,
                              )
                            }
                          >
                            {syncBusyPaymentId
                              === payment.id
                              ? 'Syncing...'
                              : 'Sync to BajetBN'}
                          </button>
                        ) : (
                          <>
                            <span>
                              Blocked
                            </span>
                            <small>
                              {payment.isReversal
                                || payment.amount < 0
                                || payment.reversalOfSupplierPaymentId
                                ? 'Reversal stays manual'
                                : !payment.bankAccountId
                                  ? 'No ADBN account'
                                  : 'Map account / check payment'}
                            </small>
                          </>
                        )}
                      </td>

                      <td>
                        <span>
                          {payment.status
                            || (
                              payment.isReversal
                                ? 'Reversal'
                                : 'Recorded'
                            )}
                        </span>
                        <small>
                          {payment.reference
                            || payment.note
                            || ''}
                        </small>
                      </td>
                    </tr>
                  );
                },
              )}

              {!supplierPayments.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="muted"
                  >
                    No matching ADBN TECH supplier payments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="notice">
        ADBN TECH remains the purchase and supplier-payment source of truth. Slice 24E.1 only posts eligible positive supplier payments to BajetBN Money Activity as Money Out. Reversals and credits stay blocked for manual review.
      </div>
    </section>
  );
}
