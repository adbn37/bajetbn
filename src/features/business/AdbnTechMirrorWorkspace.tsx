import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ADBN_TECH_ADMIN_EMAIL,
  connectAdbnTechReadOnly,
  disconnectAdbnTechReadOnly,
  getAdbnTechConnectedEmail,
  loadAdbnTechReadOnlySnapshot,
  type AdbnTechReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  markAdbnTechIntegrationConnected,
} from '../../repositories/spaceRepository';

type MirrorView = 'customers' | 'invoices';

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

export function AdbnTechMirrorWorkspace({
  spaceId,
  view,
}: {
  spaceId: string;
  view: MirrorView;
}) {
  const [snapshot, setSnapshot] =
    useState<AdbnTechReadOnlySnapshot | null>(null);
  const [connectedEmail, setConnectedEmail] =
    useState(() => getAdbnTechConnectedEmail());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] =
    useState('');

  const load = useCallback(async () => {
    if (getAdbnTechConnectedEmail() !== ADBN_TECH_ADMIN_EMAIL) {
      setSnapshot(null);
      setConnectedEmail('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const next = await loadAdbnTechReadOnlySnapshot();
      setSnapshot(next);
      setConnectedEmail(next.connectedEmail);
      await markAdbnTechIntegrationConnected(spaceId);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH data could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setLoading(true);
    setError('');

    try {
      const email = await connectAdbnTechReadOnly();
      setConnectedEmail(email);
      await markAdbnTechIntegrationConnected(spaceId);
      await load();
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

  const normalizedQuery = query.trim().toLowerCase();

  const customers = useMemo(() => {
    const rows = snapshot?.customers || [];
    if (!normalizedQuery) return rows;
    return rows.filter((item) =>
      [
        item.customerNo,
        item.name,
        item.email,
        item.phone,
        item.whatsapp,
        item.status,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [normalizedQuery, snapshot]);

  const invoices = useMemo(() => {
    const rows = snapshot?.invoices || [];
    if (!normalizedQuery) return rows;
    return rows.filter((item) =>
      [
        item.invoiceNo,
        item.customerNo,
        item.customerName,
        item.customerEmail,
        item.saleType,
        item.status,
        item.title,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [normalizedQuery, snapshot]);

  const selectedInvoice = useMemo(
    () =>
      snapshot?.invoices.find(
        (item) => item.id === selectedInvoiceId,
      ) || null,
    [selectedInvoiceId, snapshot],
  );

  if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL) {
    return (
      <section
        className="panel adbn-tech-mirror-connect-v115"
        data-adbn-tech-readonly-connect
      >
        <span className="eyebrow">ADBN TECH read-only bridge</span>
        <h2>Connect the ADBN TECH admin account</h2>
        <p className="muted">
          BajetBN stays signed in as zardeerwandy@gmail.com. A separate Google popup connects only the ADBN TECH Firebase session.
        </p>
        <div className="adbn-tech-mirror-connect-actions-v115">
          <button
            type="button"
            className="button primary"
            disabled={loading}
            onClick={() => void connect()}
          >
            {loading ? 'Connecting…' : 'Connect ADBN TECH'}
          </button>
          <small>Choose {ADBN_TECH_ADMIN_EMAIL} in the Google account picker.</small>
        </div>
        {error && <div className="notice error">{error}</div>}
        <small className="muted">
          Slice 22 can only read ADBN TECH customers and invoices. It does not create, update or delete ADBN TECH records.
        </small>
      </section>
    );
  }

  return (
    <section
      className="business-workspace-embedded-v115 adbn-tech-mirror-v115"
      data-adbn-tech-readonly-workspace={view}
    >
      <div className="business-home-v115-section-heading">
        <div>
          <span>ADBN TECH · Read-only mirror</span>
          <h2>{view === 'customers' ? 'Customers' : 'Invoices'}</h2>
        </div>
        <div className="adbn-tech-mirror-heading-actions-v115">
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => void disconnect()}
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>Connected as <strong>{connectedEmail}</strong></span>
        <span>Customers <strong>{snapshot?.customers.length || 0}</strong></span>
        <span>Invoices <strong>{snapshot?.invoices.length || 0}</strong></span>
      </div>

      <label className="adbn-tech-mirror-search-v115">
        <span>Search</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            view === 'customers'
              ? 'Name, customer no., email, phone…'
              : 'Invoice no., customer, status…'
          }
        />
      </label>

      {error && <div className="notice error">{error}</div>}

      {!snapshot && loading ? (
        <div className="loading-panel">Loading ADBN TECH…</div>
      ) : view === 'customers' ? (
        <div className="adbn-tech-table-wrap-v115">
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name || 'Unnamed customer'}</strong>
                    <small>{item.customerNo || item.id}</small>
                  </td>
                  <td>
                    <span>{item.phone || item.whatsapp || '—'}</span>
                    <small>{item.email || 'No email'}</small>
                  </td>
                  <td>{item.status || '—'}</td>
                  <td>{simpleDate(item.customerSince)}</td>
                </tr>
              ))}
              {!customers.length && (
                <tr>
                  <td colSpan={4} className="muted">No matching ADBN TECH customers.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {selectedInvoice && (
            <section
              className="panel adbn-tech-invoice-detail-v115"
              data-adbn-tech-invoice-detail
            >
              <div className="adbn-tech-invoice-detail-heading-v115">
                <div>
                  <span className="eyebrow">Read-only invoice detail</span>
                  <h3>{selectedInvoice.invoiceNo || selectedInvoice.id}</h3>
                  <p className="muted">
                    {selectedInvoice.title
                      || selectedInvoice.saleType
                      || 'ADBN TECH invoice'}
                  </p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSelectedInvoiceId('')}
                >
                  Close
                </button>
              </div>

              <div className="adbn-tech-invoice-detail-grid-v115">
                <div>
                  <span>Customer</span>
                  <strong>{selectedInvoice.customerName || '—'}</strong>
                  <small>
                    {selectedInvoice.customerNo
                      || selectedInvoice.customerEmail
                      || '—'}
                  </small>
                </div>
                <div>
                  <span>Contact</span>
                  <strong>{selectedInvoice.customerPhone || '—'}</strong>
                  <small>{selectedInvoice.customerEmail || 'No email'}</small>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{bnd(selectedInvoice.total)}</strong>
                  <small>Invoice amount</small>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{bnd(selectedInvoice.paid)}</strong>
                  <small>Recorded in ADBN TECH</small>
                </div>
                <div>
                  <span>Balance</span>
                  <strong>{bnd(selectedInvoice.balance)}</strong>
                  <small>Outstanding</small>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedInvoice.status || '—'}</strong>
                  <small>
                    Fulfilment: {selectedInvoice.fulfilmentStatus || '—'}
                  </small>
                </div>
                <div>
                  <span>Invoice date</span>
                  <strong>{simpleDate(selectedInvoice.invoiceDate)}</strong>
                  <small>Created invoice date</small>
                </div>
                <div>
                  <span>Next due</span>
                  <strong>
                    {simpleDate(
                      selectedInvoice.nextDueDate
                      || selectedInvoice.dueDate,
                    )}
                  </strong>
                  <small>
                    Original due: {simpleDate(selectedInvoice.dueDate)}
                  </small>
                </div>
                <div>
                  <span>Payment plan</span>
                  <strong>
                    {selectedInvoice.monthlyAmount > 0
                      ? bnd(selectedInvoice.monthlyAmount) + ' / month'
                      : '—'}
                  </strong>
                  <small>
                    {selectedInvoice.termMonths > 0
                      ? selectedInvoice.termMonths + ' month term'
                      : 'No term recorded'}
                  </small>
                </div>
                <div>
                  <span>Source</span>
                  <strong>{selectedInvoice.source || '—'}</strong>
                  <small>{selectedInvoice.saleType || 'Invoice'}</small>
                </div>
              </div>

              <small className="muted">
                Read-only mirror. Edit, delete and payment actions remain in ADBN TECH.
              </small>
            </section>
          )}

          <div className="adbn-tech-table-wrap-v115">
            <table className="adbn-tech-table-v115">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th aria-label="Invoice actions" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      selectedInvoiceId === item.id
                        ? 'is-selected'
                        : ''
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className="adbn-tech-record-link-v115"
                        onClick={() => setSelectedInvoiceId(item.id)}
                      >
                        <strong>{item.invoiceNo || item.id}</strong>
                        <small>{item.saleType || item.title || 'Invoice'}</small>
                      </button>
                    </td>
                    <td>
                      <span>{item.customerName || '—'}</span>
                      <small>{item.customerNo || item.customerEmail || ''}</small>
                    </td>
                    <td>{bnd(item.total)}</td>
                    <td>{bnd(item.paid)}</td>
                    <td>{bnd(item.balance)}</td>
                    <td>{simpleDate(item.nextDueDate || item.dueDate)}</td>
                    <td>{item.status || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="button secondary adbn-tech-view-button-v115"
                        onClick={() => setSelectedInvoiceId(item.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr>
                    <td colSpan={8} className="muted">No matching ADBN TECH invoices.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <small className="muted">
        Source of truth: ADBN TECH. This view is read-only in Slice 22.
      </small>
    </section>
  );
}
