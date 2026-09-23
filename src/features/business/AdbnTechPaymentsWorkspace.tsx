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
  disconnectAdbnTechReadOnly,
  getAdbnTechConnectedEmail,
  loadAdbnTechPaymentsReadOnly,
  type AdbnTechPaymentMirror,
  type AdbnTechPaymentsReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  getSpace,
  markAdbnTechIntegrationConnected,
  setAdbnTechAccountMappings,
  setAdbnTechPaymentAutoSync,
} from '../../repositories/spaceRepository';
import {
  adbnPaymentCanPost,
  adbnPaymentSyncLabel,
  autoSyncNewAdbnTechPaymentsToBajetBn,
  syncAdbnTechPaymentToBajetBn,
} from '../../repositories/adbnTechPaymentSyncRepository';
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
  account: {
    accountName: string;
    bankName: string;
    accountType: string;
    id: string;
  },
) {
  return (
    account.accountName
    || account.bankName
    || account.accountType
    || account.id
  );
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

export function AdbnTechPaymentsWorkspace({
  spaceId,
  onFinancialSync,
}: {
  spaceId: string;
  onFinancialSync?: () => void | Promise<void>;
}) {
  const { user } = useAuth();

  const [connectedEmail, setConnectedEmail] =
    useState(() => getAdbnTechConnectedEmail());

  const [snapshot, setSnapshot] =
    useState<AdbnTechPaymentsReadOnlySnapshot | null>(
      null,
    );

  const [bajetAccounts, setBajetAccounts] =
    useState<Account[]>([]);

  const [mappings, setMappings] =
    useState<Record<string, string>>({});

  const [savedMappings, setSavedMappings] =
    useState<Record<string, string>>({});

  const [
    businessTransactions,
    setBusinessTransactions,
  ] = useState<FinancialTransaction[]>([]);

  const [query, setQuery] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [mappingBusy, setMappingBusy] =
    useState(false);

  const [
    syncBusyPaymentId,
    setSyncBusyPaymentId,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [mappingMessage, setMappingMessage] =
    useState('');

  const [syncMessage, setSyncMessage] =
    useState('');

  const [
    autoSyncEnabled,
    setAutoSyncEnabled,
  ] = useState(false);

  const [
    autoSyncCutoffIso,
    setAutoSyncCutoffIso,
  ] = useState('');

  const [autoSyncBusy, setAutoSyncBusy] =
    useState(false);

  const [autoSyncMessage, setAutoSyncMessage] =
    useState('');

  const autoSyncRunRef =
    useRef('');

  const loadBajetBnSide = useCallback(
    async () => {
      if (!user?.uid) return;

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

        const nextMappings =
          nextSpace?.externalIntegrationAccountMappings
          || {};

        setBajetAccounts(nextAccounts);
        setMappings(nextMappings);
        setSavedMappings(nextMappings);
        setBusinessTransactions(
          nextTransactions,
        );

        setAutoSyncEnabled(
          nextSpace
            ?.externalIntegrationPaymentAutoSyncEnabled
          === true,
        );

        setAutoSyncCutoffIso(
          nextSpace
            ?.externalIntegrationPaymentAutoSyncCutoffIso
          || '',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'BajetBN account mapping could not be loaded.',
        );
      }
    },
    [spaceId, user?.uid],
  );

  const loadPayments = useCallback(
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
          await loadAdbnTechPaymentsReadOnly();

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
            : 'ADBN TECH payments could not be loaded.',
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
    void loadPayments();
  }, [loadPayments]);

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

      await loadPayments();
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

  const disconnect = async () => {
    await disconnectAdbnTechReadOnly();
    setConnectedEmail('');
    setSnapshot(null);
    setBusinessTransactions([]);
    setSyncMessage('');
    setError('');
  };

  const changeMapping = (
    adbnAccountId: string,
    bajetAccountId: string,
  ) => {
    setMappingMessage('');

    setMappings((current) => ({
      ...current,
      [adbnAccountId]:
        bajetAccountId,
    }));
  };

  const saveMappings = async () => {
    setMappingBusy(true);
    setMappingMessage('');
    setError('');

    try {
      const cleanMappings =
        Object.fromEntries(
          Object.entries(mappings)
            .filter(
              ([, accountId]) =>
                Boolean(accountId),
            ),
        );

      await setAdbnTechAccountMappings(
        spaceId,
        cleanMappings,
      );

      setMappings(cleanMappings);
      setSavedMappings(cleanMappings);
      setMappingMessage(
        'ADBN TECH account mappings saved in BajetBN.',
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH account mappings could not be saved.',
      );
    } finally {
      setMappingBusy(false);
    }
  };

  const syncPaymentToBajetBn =
    async (
      payment: AdbnTechPaymentMirror,
    ) => {
      if (
        syncBusyPaymentId
        || !adbnPaymentCanPost(payment)
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
          'Map this ADBN TECH receiving account to a BajetBN Business account first.',
        );
        return;
      }

      const syncLabel =
        adbnPaymentSyncLabel(
          payment.id,
        );

      const alreadySynced =
        businessTransactions.some(
          (item) =>
            (item.labels || [])
              .some(
                (label) =>
                  label.toLowerCase()
                  === syncLabel.toLowerCase(),
              ),
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
          await syncAdbnTechPaymentToBajetBn(
            {
              payment,
              spaceId,
              mappedAccountId,
            },
          );

        if (
          outcome.mode
          !== 'posted'
        ) {
          throw new Error(
            'The payment did not post immediately.',
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
          + ' synced to BajetBN Money activity.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment could not be synced.',
        );
      } finally {
        setSyncBusyPaymentId('');
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
        await setAdbnTechPaymentAutoSync(
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
        setAutoSyncMessage(
          'Auto-sync enabled. Only ADBN TECH payments created after this moment can post automatically.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment auto-sync could not be enabled.',
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
        await setAdbnTechPaymentAutoSync(
          spaceId,
          {
            enabled: false,
          },
        );

        setAutoSyncEnabled(false);
        setAutoSyncMessage(
          'Auto-sync is off. Manual Sync to BajetBN remains available.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment auto-sync could not be disabled.',
        );
      } finally {
        setAutoSyncBusy(false);
      }
    };

  const runFuturePaymentAutoSync =
    useCallback(
      async (
        payments:
          AdbnTechPaymentMirror[],
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
          const summary =
            await autoSyncNewAdbnTechPaymentsToBajetBn(
              {
                spaceId,
                mappings:
                  savedMappings,
                cutoffIso:
                  autoSyncCutoffIso,
                payments,
              },
            );

          setBusinessTransactions(
            summary.transactions,
          );

          if (
            summary.posted > 0
            && onFinancialSync
          ) {
            await onFinancialSync();
          }

          if (
            summary.connected
            && (
              summary.posted > 0
              || summary.failed > 0
              || summary.blocked > 0
            )
          ) {
            setAutoSyncMessage(
              summary.posted
              + ' new payment'
              + (
                summary.posted === 1
                  ? ''
                  : 's'
              )
              + ' auto-synced. '
              + summary.blocked
              + ' blocked. '
              + summary.failed
              + ' failed.'
            );
          }

          if (
            summary.firstError
          ) {
            setError(
              summary.firstError,
            );
          }
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'ADBN TECH payment auto-sync check failed.',
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

      void runFuturePaymentAutoSync(
        snapshot.payments,
      );
    },
    [
      autoSyncCutoffIso,
      autoSyncEnabled,
      runFuturePaymentAutoSync,
      savedMappings,
      snapshot,
    ],
  );

  const normalizedQuery =
    query.trim().toLowerCase();

  const payments = useMemo(
    () => {
      const rows =
        snapshot?.payments || [];

      if (!normalizedQuery) {
        return rows;
      }

      return rows.filter((item) =>
        [
          item.paymentNo,
          item.invoiceNo,
          item.customerNo,
          item.customerName,
          item.paymentMethod,
          item.reference,
          item.status,
          item.note,
          item.bankAccountName,
          item.bankAccountType,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      );
    },
    [normalizedQuery, snapshot],
  );

  const mappedCount = useMemo(
    () =>
      (snapshot?.bankAccounts || [])
        .filter((account) =>
          Boolean(
            savedMappings[account.id],
          ),
        )
        .length,
    [savedMappings, snapshot],
  );

  const paymentsNeedingMapping = useMemo(
    () =>
      (snapshot?.payments || [])
        .filter((payment) =>
          !payment.bankAccountId
          || !savedMappings[
            payment.bankAccountId
          ],
        )
        .length,
    [savedMappings, snapshot],
  );

  const hasUnsavedMappings =
    JSON.stringify(mappings)
    !== JSON.stringify(savedMappings);

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

  const syncedPaymentCount =
    useMemo(
      () =>
        (snapshot?.payments || [])
          .filter(
            (payment) =>
              syncedLabels.has(
                adbnPaymentSyncLabel(
                  payment.id,
                ).toLowerCase(),
              ),
          )
          .length,
      [snapshot, syncedLabels],
    );

  const bajetAccountById = useMemo(
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

  if (
    user?.email?.trim().toLowerCase()
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
        data-adbn-tech-payments-connect
      >
        <span className="eyebrow">
          ADBN TECH read-only payments
        </span>

        <h2>
          Connect the ADBN TECH admin account
        </h2>

        <p className="muted">
          BajetBN stays signed in as zardeerwandy@gmail.com. The separate ADBN TECH Firebase session is used only to read bank accounts and payment records.
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
          Slice 23A reads ADBN TECH bankAccounts and payments only. It does not post, edit or delete ADBN TECH financial records.
        </small>
      </section>
    );
  }

  return (
    <section
      className="business-workspace-embedded-v115 adbn-tech-mirror-v115"
      data-adbn-tech-payments-workspace
    >
      <div className="business-home-v115-section-heading">
        <div>
          <span>
            ADBN TECH · Read-only mirror
          </span>
          <h2>Payments</h2>
        </div>

        <div className="adbn-tech-mirror-heading-actions-v115">
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={() =>
              void loadPayments()
            }
          >
            {loading
              ? 'Refreshing…'
              : 'Refresh'}
          </button>

          <button
            type="button"
            className="button secondary"
            onClick={() =>
              void disconnect()
            }
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>
          Connected as{' '}
          <strong>{connectedEmail}</strong>
        </span>

        <span>
          ADBN accounts{' '}
          <strong>
            {snapshot?.bankAccounts.length || 0}
          </strong>
        </span>

        <span>
          Mapped{' '}
          <strong>
            {mappedCount}
            /
            {snapshot?.bankAccounts.length || 0}
          </strong>
        </span>

        <span>
          Payments{' '}
          <strong>
            {snapshot?.payments.length || 0}
          </strong>
        </span>

        <span>
          Synced{' '}
          <strong>
            {syncedPaymentCount}
          </strong>
        </span>
      </div>

      <section
        className="panel adbn-tech-account-mapping-v115"
        data-adbn-tech-account-mapping
      >
        <div>
          <span className="eyebrow">
            Account-aware mapping
          </span>

          <h3>
            ADBN TECH account → BajetBN account
          </h3>

          <p className="muted">
            Map each ADBN TECH receiving account to the matching BajetBN Business account. Payments with an unmapped or missing ADBN account will stay blocked from future automatic posting.
          </p>
        </div>

        {!bajetAccounts.length ? (
          <div className="notice">
            No active BajetBN Business account is linked to this ADBN TECH Space yet. Create or link the corresponding BIBD, Baiduri, Cash or other Business account under Finance → Accounts first.
          </div>
        ) : (
          <>
            <div className="adbn-tech-account-mapping-list-v115">
              {(snapshot?.bankAccounts || [])
                .map((account) => (
                  <div
                    className="adbn-tech-account-mapping-row-v115"
                    key={account.id}
                  >
                    <div>
                      <strong>
                        {accountLabel(account)}
                      </strong>

                      <small>
                        {account.accountType || 'Account'}
                        {' · '}
                        {account.currency || 'BND'}
                        {!account.isActive
                          ? ' · Inactive'
                          : ''}
                      </small>

                      <small>
                        ADBN ID: {account.id}
                      </small>
                    </div>

                    <span
                      className="adbn-tech-account-mapping-arrow-v115"
                      aria-hidden="true"
                    >
                      →
                    </span>

                    <label>
                      BajetBN Business account
                      <select
                        value={
                          mappings[account.id]
                          || ''
                        }
                        onChange={(event) =>
                          changeMapping(
                            account.id,
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Mapping required
                        </option>

                        {bajetAccounts.map(
                          (bajetAccount) => (
                            <option
                              key={bajetAccount.id}
                              value={bajetAccount.id}
                            >
                              {bajetAccount.name}
                              {' · '}
                              {bajetAccount.currency}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                ))}
            </div>

            {!snapshot?.bankAccounts.length && (
              <div className="notice">
                No ADBN TECH bank accounts were returned. Payment records can still be reviewed, but automatic posting must remain disabled until receiving accounts are available.
              </div>
            )}

            <div className="adbn-tech-account-mapping-footer-v115">
              <div>
                <strong>
                  {paymentsNeedingMapping}
                </strong>
                <span>
                  {' '}
                  payment
                  {paymentsNeedingMapping === 1
                    ? ''
                    : 's'} currently require account mapping.
                </span>
              </div>

              <button
                type="button"
                className="button primary"
                disabled={
                  mappingBusy
                  || !hasUnsavedMappings
                }
                onClick={() =>
                  void saveMappings()
                }
              >
                {mappingBusy
                  ? 'Saving…'
                  : 'Save mappings'}
              </button>
            </div>
          </>
        )}

        {mappingMessage && (
          <div className="notice success">
            {mappingMessage}
          </div>
        )}

        {syncMessage && (
          <div className="notice success">
            {syncMessage}
          </div>
        )}
      </section>

      <section
        className="panel adbn-tech-account-mapping-v115"
        data-adbn-tech-payment-auto-sync
      >
        <div>
          <span className="eyebrow">
            Future payments
          </span>

          <h3>
            Auto-sync new ADBN TECH payments
          </h3>

          <p className="muted">
            Existing receipts stay manual. When enabled, only ADBN TECH payments created after the activation time can post automatically into the mapped BajetBN Business account.
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
                Older payments will never be imported automatically.
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
      </section>

      <label className="adbn-tech-mirror-search-v115">
        <span>Search payments</span>

        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Payment, invoice, customer, account, reference, status…"
        />
      </label>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {!snapshot && loading ? (
        <div className="loading-panel">
          Loading ADBN TECH accounts and payments…
        </div>
      ) : (
        <div className="adbn-tech-table-wrap-v115">
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Payment</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Received Into</th>
                <th>BajetBN Mapping</th>
                <th>BajetBN Sync</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => {
                const mappedBajetAccount =
                  payment.bankAccountId
                    ? bajetAccountById.get(
                        savedMappings[
                          payment.bankAccountId
                        ],
                      )
                    : null;

                const syncLabel =
                  adbnPaymentSyncLabel(
                    payment.id,
                  );

                const paymentSynced =
                  syncedLabels.has(
                    syncLabel.toLowerCase(),
                  );

                const paymentReady =
                  Boolean(
                    mappedBajetAccount,
                  )
                  && adbnPaymentCanPost(
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
                        Read-only
                      </small>
                    </td>

                    <td>
                      <strong>
                        {payment.invoiceNo
                          || payment.invoiceId
                          || '—'}
                      </strong>
                    </td>

                    <td>
                      <span>
                        {payment.customerName
                          || '—'}
                      </span>
                      <small>
                        {payment.customerNo
                          || payment.customerId
                          || ''}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {bnd(payment.amount)}
                      </strong>
                    </td>

                    <td>
                      {simpleDate(
                        payment.paymentDate,
                      )}
                    </td>

                    <td>
                      <span>
                        {payment.bankAccountName
                          || 'Unassigned'}
                      </span>
                      <small>
                        {payment.bankAccountType
                          || payment.bankAccountId
                          || 'No ADBN account ID'}
                      </small>
                    </td>

                    <td>
                      {mappedBajetAccount ? (
                        <>
                          <strong>
                            {mappedBajetAccount.name}
                          </strong>
                          <small>
                            {mappedBajetAccount.currency}
                          </small>
                        </>
                      ) : (
                        <span className="adbn-tech-mapping-required-v115">
                          Mapping required
                        </span>
                      )}
                    </td>

                    <td>
                      {paymentSynced ? (
                        <>
                          <strong>
                            Synced
                          </strong>
                          <small>
                            Money activity
                          </small>
                        </>
                      ) : paymentReady ? (
                        <button
                          type="button"
                          className="button secondary compact"
                          disabled={
                            Boolean(
                              syncBusyPaymentId,
                            )
                          }
                          onClick={() =>
                            void syncPaymentToBajetBn(
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
                            Map account / check payment
                          </small>
                        </>
                      )}
                    </td>

                    <td>
                      <span>
                        {payment.status || '—'}
                      </span>
                      <small>
                        {payment.paymentMethod
                          || payment.reference
                          || ''}
                      </small>
                    </td>
                  </tr>
                );
              })}

              {!payments.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="muted"
                  >
                    No matching ADBN TECH payments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <small className="muted">
        Source of truth: ADBN TECH. Manual sync remains available for older receipts. When future-only auto-sync is enabled, only payments created after the stored cutoff can post automatically. ADBN TECH remains read-only.
      </small>
    </section>
  );
}
