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
              </tr>
            </thead>
            <tbody>
              {invoices.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.invoiceNo || item.id}</strong>
                    <small>{item.saleType || item.title || 'Invoice'}</small>
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
                </tr>
              ))}
              {!invoices.length && (
                <tr>
                  <td colSpan={7} className="muted">No matching ADBN TECH invoices.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <small className="muted">
        Source of truth: ADBN TECH. This view is read-only in Slice 22.
      </small>
    </section>
  );
}
