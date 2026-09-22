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
  disconnectAdbnTechReadOnly,
  getAdbnTechConnectedEmail,
  loadAdbnTechPaymentsReadOnly,
  type AdbnTechPaymentsReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  getSpace,
  markAdbnTechIntegrationConnected,
  setAdbnTechAccountMappings,
} from '../../repositories/spaceRepository';
import type { Account } from '../../types/models';

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

export function AdbnTechPaymentsWorkspace({
  spaceId,
}: {
  spaceId: string;
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

  const [query, setQuery] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [mappingBusy, setMappingBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [mappingMessage, setMappingMessage] =
    useState('');

  const loadBajetBnSide = useCallback(
    async () => {
      if (!user?.uid) return;

      try {
        const [
          nextAccounts,
          nextSpace,
        ] = await Promise.all([
          listAccountsForOwnerSpace(
            user.uid,
            spaceId,
          ),
          getSpace(spaceId),
        ]);

        const nextMappings =
          nextSpace?.externalIntegrationAccountMappings
          || {};

        setBajetAccounts(nextAccounts);
        setMappings(nextMappings);
        setSavedMappings(nextMappings);
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
                    colSpan={8}
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
        Source of truth: ADBN TECH. Slice 23A stores only account-ID mappings in BajetBN. No BajetBN Money activity or ADBN TECH write is performed yet.
      </small>
    </section>
  );
}
