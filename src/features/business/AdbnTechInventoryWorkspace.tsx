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
  loadAdbnTechInventoryReadOnly,
  type AdbnTechInventoryProductMirror,
  type AdbnTechInventoryReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  markAdbnTechIntegrationConnected,
} from '../../repositories/spaceRepository';

type StockFilter =
  | 'all'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock';

function bnd(value: number) {
  return new Intl.NumberFormat('en-BN', {
    style: 'currency',
    currency: 'BND',
  }).format(value || 0);
}

function availableStock(
  item: AdbnTechInventoryProductMirror,
) {
  return Math.max(
    item.stock - item.reservedStock,
    0,
  );
}

function stockState(
  item: AdbnTechInventoryProductMirror,
) {
  const available =
    availableStock(item);

  if (available <= 0) {
    return 'Out of Stock';
  }

  if (
    item.minimumStock > 0
    && available <= item.minimumStock
  ) {
    return 'Low Stock';
  }

  return 'In Stock';
}

export function AdbnTechInventoryWorkspace({
  spaceId,
}: {
  spaceId: string;
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
    AdbnTechInventoryReadOnlySnapshot | null
  >(null);

  const [query, setQuery] =
    useState('');

  const [
    stockFilter,
    setStockFilter,
  ] = useState<StockFilter>('all');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const loadInventory =
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
            await loadAdbnTechInventoryReadOnly();

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
              : 'ADBN TECH inventory could not be loaded.',
          );
        } finally {
          setLoading(false);
        }
      },
      [spaceId],
    );

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

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

      await loadInventory();
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

  const normalizedQuery =
    query.trim().toLowerCase();

  const products = useMemo(
    () => {
      const rows =
        snapshot?.products || [];

      return rows.filter(
        (item) => {
          const matchesSearch =
            !normalizedQuery
            || [
              item.sku,
              item.barcode,
              item.category,
              item.brand,
              item.model,
              item.description,
              item.condition,
              item.supplier,
              item.status,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    normalizedQuery,
                  ),
            );

          const state =
            stockState(item);

          const matchesStock =
            stockFilter === 'all'
            || (
              stockFilter === 'in_stock'
              && state === 'In Stock'
            )
            || (
              stockFilter === 'low_stock'
              && state === 'Low Stock'
            )
            || (
              stockFilter === 'out_of_stock'
              && state === 'Out of Stock'
            );

          return (
            matchesSearch
            && matchesStock
          );
        },
      );
    },
    [
      normalizedQuery,
      snapshot,
      stockFilter,
    ],
  );

  const totals =
    useMemo(
      () => {
        const all =
          snapshot?.products || [];

        return all.reduce(
          (sum, item) => ({
            onHand:
              sum.onHand
              + item.stock,
            reserved:
              sum.reserved
              + item.reservedStock,
            available:
              sum.available
              + availableStock(item),
            costValue:
              sum.costValue
              + (
                item.stock
                * item.purchasePrice
              ),
          }),
          {
            onHand: 0,
            reserved: 0,
            available: 0,
            costValue: 0,
          },
        );
      },
      [snapshot],
    );

  const stateCounts =
    useMemo(
      () => {
        const all =
          snapshot?.products || [];

        return {
          inStock:
            all.filter(
              (item) =>
                stockState(item)
                === 'In Stock',
            ).length,
          lowStock:
            all.filter(
              (item) =>
                stockState(item)
                === 'Low Stock',
            ).length,
          outOfStock:
            all.filter(
              (item) =>
                stockState(item)
                === 'Out of Stock',
            ).length,
        };
      },
      [snapshot],
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
        data-adbn-tech-inventory-connect
      >
        <span className="eyebrow">
          ADBN TECH read-only inventory
        </span>

        <h2>
          Connect the ADBN TECH admin account
        </h2>

        <p className="muted">
          This workspace reads the authoritative ADBN TECH products collection. It does not create or adjust BajetBN POS stock and it does not write inventory back to ADBN TECH.
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
          ADBN TECH remains the source of truth for on-hand stock, reservations, receiving and fulfilment.
        </small>
      </section>
    );
  }

  return (
    <section
      className="business-workspace-embedded-v115 adbn-tech-mirror-v115"
      data-adbn-tech-inventory-workspace
    >
      <div className="business-home-v115-section-heading">
        <div>
          <span>
            ADBN TECH · Read-only mirror
          </span>
          <h2>Inventory</h2>
        </div>
      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>
          Products{' '}
          <strong>
            {snapshot?.products.length || 0}
          </strong>
        </span>

        <span>
          On hand{' '}
          <strong>
            {totals.onHand}
          </strong>
        </span>

        <span>
          Reserved{' '}
          <strong>
            {totals.reserved}
          </strong>
        </span>

        <span>
          Available{' '}
          <strong>
            {totals.available}
          </strong>
        </span>

        <span>
          Cost value{' '}
          <strong>
            {bnd(totals.costValue)}
          </strong>
        </span>

        <span>
          Source{' '}
          <strong>products</strong>
        </span>
      </div>

      <label className="adbn-tech-mirror-search-v115">
        <span>Search</span>
        <input
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
          placeholder="SKU, barcode, brand, model, category, supplier…"
        />
      </label>

      <div
        className="business-finance-nav-v115"
        aria-label="Inventory stock filter"
      >
        <button
          type="button"
          className={
            stockFilter === 'all'
              ? 'active'
              : ''
          }
          onClick={() =>
            setStockFilter('all')
          }
        >
          All
        </button>

        <button
          type="button"
          className={
            stockFilter === 'in_stock'
              ? 'active'
              : ''
          }
          onClick={() =>
            setStockFilter(
              'in_stock',
            )
          }
        >
          In Stock ({stateCounts.inStock})
        </button>

        <button
          type="button"
          className={
            stockFilter === 'low_stock'
              ? 'active'
              : ''
          }
          onClick={() =>
            setStockFilter(
              'low_stock',
            )
          }
        >
          Low Stock ({stateCounts.lowStock})
        </button>

        <button
          type="button"
          className={
            stockFilter === 'out_of_stock'
              ? 'active'
              : ''
          }
          onClick={() =>
            setStockFilter(
              'out_of_stock',
            )
          }
        >
          Out of Stock ({stateCounts.outOfStock})
        </button>
      </div>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {!snapshot && loading ? (
        <div className="loading-panel">
          Loading ADBN TECH inventory…
        </div>
      ) : (
        <div className="adbn-tech-table-wrap-v115">
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Cost</th>
                <th>Selling</th>
                <th>Supplier</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {products.map(
                (item) => {
                  const state =
                    stockState(item);

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {[
                            item.brand,
                            item.model,
                          ]
                            .filter(Boolean)
                            .join(' ')
                            || item.sku
                            || 'Unnamed item'}
                        </strong>

                        <small>
                          {[
                            item.sku,
                            item.barcode
                              ? 'Barcode '
                                + item.barcode
                              : '',
                            item.condition,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                            || '—'}
                        </small>
                      </td>

                      <td>
                        <span>
                          {item.category
                            || 'Other'}
                        </span>
                        <small>
                          {item.description
                            || '—'}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {item.stock}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {item.reservedStock}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {availableStock(item)}
                        </strong>
                        <small>
                          Minimum {item.minimumStock}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {bnd(item.purchasePrice)}
                        </strong>
                        <small>
                          {item.latestLandedUnitCost > 0
                            ? 'Latest landed '
                              + bnd(item.latestLandedUnitCost)
                            : 'Average / purchase cost'}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {bnd(item.sellingPrice)}
                        </strong>
                        <small>
                          {item.monthlyPrice > 0
                            ? bnd(item.monthlyPrice)
                              + ' monthly'
                            : '—'}
                        </small>
                      </td>

                      <td>
                        <span>
                          {item.supplier
                            || '—'}
                        </span>
                        <small>
                          {item.warranty
                            || 'No warranty note'}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {state}
                        </strong>
                        <small>
                          {item.status
                            || 'Available'}
                        </small>
                      </td>
                    </tr>
                  );
                },
              )}

              {!products.length && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      No ADBN TECH inventory items match this view.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="notice">
        Read-only inventory integration: ADBN TECH controls stock receiving, reservations, releases and deductions. BajetBN does not duplicate or mutate those quantities in Slice 24D.1.
      </div>
    </section>
  );
}
