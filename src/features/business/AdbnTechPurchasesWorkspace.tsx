import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ADBN_TECH_ADMIN_EMAIL,
  connectAdbnTechReadOnly,
  getAdbnTechConnectedEmail,
  loadAdbnTechPurchasesReadOnly,
  type AdbnTechPurchasesReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  markAdbnTechIntegrationConnected,
} from '../../repositories/spaceRepository';

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

export function AdbnTechPurchasesWorkspace({
  spaceId,
}: {
  spaceId: string;
}) {
  const { user } = useAuth();
  const [connectedEmail, setConnectedEmail] =
    useState(() => getAdbnTechConnectedEmail());
  const [snapshot, setSnapshot] =
    useState<AdbnTechPurchasesReadOnlySnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPurchases = useCallback(async () => {
    if (getAdbnTechConnectedEmail() !== ADBN_TECH_ADMIN_EMAIL) {
      setConnectedEmail('');
      setSnapshot(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const next = await loadAdbnTechPurchasesReadOnly();
      setSnapshot(next);
      setConnectedEmail(next.connectedEmail);
      await markAdbnTechIntegrationConnected(spaceId);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH purchases could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases]);

  const connect = async () => {
    setLoading(true);
    setError('');
    try {
      const email = await connectAdbnTechReadOnly();
      setConnectedEmail(email);
      await markAdbnTechIntegrationConnected(spaceId);
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

  const normalizedQuery = query.trim().toLowerCase();
  const purchases = useMemo(() => {
    const rows = snapshot?.purchases || [];
    if (!normalizedQuery) return rows;
    return rows.filter((item) =>
      [
        item.purchaseNo,
        item.sellerName,
        item.brand,
        item.model,
        item.category,
        item.orderStatus,
        item.paymentStatus,
        item.linkedBuildNo,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [normalizedQuery, snapshot]);

  const visibleTotal = useMemo(
    () => purchases.reduce((sum, item) => sum + item.totalCost, 0),
    [purchases],
  );

  if (user?.email?.trim().toLowerCase() !== 'zardeerwandy@gmail.com') {
    return null;
  }

  if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL) {
    return (
      <section
        className="panel adbn-tech-mirror-connect-v115"
        data-adbn-tech-purchases-connect
      >
        <span className="eyebrow">ADBN TECH read-only purchases</span>
        <h2>Connect the ADBN TECH admin account</h2>
        <p className="muted">
          This mirror reads supplier purchases only. It does not create BajetBN expenses, Money Activity or inventory movements.
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
          Slice 24A reads supplierPartPurchases only. ADBN TECH remains the purchase and stock source of truth.
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
          <span>ADBN TECH · Read-only mirror</span>
          <h2>Purchases</h2>
        </div>
      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>Connected as <strong>{connectedEmail}</strong></span>
        <span>Purchases <strong>{snapshot?.purchases.length || 0}</strong></span>
        <span>Visible total <strong>{bnd(visibleTotal)}</strong></span>
        <span>Source <strong>supplierPartPurchases</strong></span>
      </div>

      <label className="adbn-tech-mirror-search-v115">
        <span>Search</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Purchase no., seller, part, status…"
        />
      </label>

      {error && <div className="notice error">{error}</div>}

      {!snapshot && loading ? (
        <div className="loading-panel">Loading ADBN TECH purchases…</div>
      ) : (
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
              {purchases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.purchaseNo || item.id}</strong>
                    <small>{simpleDate(item.purchaseDate)}</small>
                  </td>
                  <td>
                    <strong>{[item.brand, item.model].filter(Boolean).join(' ') || item.category || 'Unnamed part'}</strong>
                    <small>{[item.category, item.condition, item.linkedBuildNo ? 'Build ' + item.linkedBuildNo : ''].filter(Boolean).join(' · ') || '—'}</small>
                  </td>
                  <td>
                    <span>{item.sellerName || '—'}</span>
                    <small>{item.sellerType || 'Supplier'}</small>
                  </td>
                  <td>
                    <strong>{item.quantityReceived}/{item.quantity}</strong>
                    <small>{item.quantityOutstanding > 0 ? item.quantityOutstanding + ' outstanding' : item.receivedDate ? 'Received ' + simpleDate(item.receivedDate) : 'No outstanding quantity'}</small>
                  </td>
                  <td>
                    <strong>{bnd(item.totalCost)}</strong>
                    <small>{item.quantity > 0 ? bnd(item.unitPrice) + ' each' : '—'}</small>
                  </td>
                  <td>
                    <span>{item.orderStatus || '—'}</span>
                    <small>{[item.paymentStatus, item.inventoryAdded ? 'Inventory added' : item.linkedProductId ? 'Product linked' : ''].filter(Boolean).join(' · ') || 'Read only'}</small>
                  </td>
                </tr>
              ))}
              {!purchases.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No ADBN TECH purchase records match this view.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="notice">
        Read-only integration: this page does not create or edit BajetBN Money Activity, POS stock, inventory, purchase records or ADBN TECH records.
      </div>
    </section>
  );
}
