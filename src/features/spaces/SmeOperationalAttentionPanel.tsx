import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMarketplacePosWorkspace,
  getSmePosStaffWorkspace,
  listSmePosReservations,
} from '../../repositories/smePosRepository';
import type {
  SmePosReservation,
  SmePosRole,
  Space,
} from '../../types/models';
import { formatMoney } from '../../utils/money';

interface Props {
  space: Space;
  role: SmePosRole | null;
}

interface StockItem {
  quantityOnHand: number;
  reservedQuantity?: number;
  lowStockLevel: number;
  trackStock?: boolean;
}

interface AttentionSnapshot {
  lowStock: number;
  openBookings: number;
  overdueBookings: number;
  sellerPayouts: number;
  payoutWaitingMinor: number;
  marketplace: boolean;
}

const emptySnapshot: AttentionSnapshot = {
  lowStock: 0,
  openBookings: 0,
  overdueBookings: 0,
  sellerPayouts: 0,
  payoutWaitingMinor: 0,
  marketplace: false,
};

const openBookingStatuses = new Set<SmePosReservation['status']>([
  'reserved',
  'partially_paid',
  'paid',
]);

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isLowStockItem(item: StockItem) {
  if (item.trackStock === false) return false;

  const available = Math.max(
    0,
    item.quantityOnHand - (item.reservedQuantity || 0),
  );

  return available <= item.lowStockLevel;
}

export function SmeOperationalAttentionPanel({ space, role }: Props) {
  const operationalRole = role === 'owner' || role === 'manager';

  const [snapshot, setSnapshot] = useState<AttentionSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!operationalRole) {
      setSnapshot(emptySnapshot);
      setWarning('');
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      setLoading(true);
      setWarning('');

      const [
        standardResult,
        marketplaceResult,
        reservationsResult,
      ] = await Promise.allSettled([
        getSmePosStaffWorkspace(space.id),
        getMarketplacePosWorkspace(space.id),
        listSmePosReservations(space.id),
      ]);

      if (cancelled) return;

      const marketplace = marketplaceResult.status === 'fulfilled';

      const lowStock = marketplace
        ? marketplaceResult.value.listings.filter(isLowStockItem).length
        : standardResult.status === 'fulfilled'
          ? standardResult.value.products.filter(isLowStockItem).length
          : 0;

      const reservations = reservationsResult.status === 'fulfilled'
        ? reservationsResult.value
        : [];

      const openBookings = reservations.filter((item) =>
        openBookingStatuses.has(item.status),
      );

      const today = localDate();

      const overdueBookings = openBookings.filter(
        (item) => Boolean(item.dueDate && item.dueDate < today),
      ).length;

      const sellersWaiting = marketplace
        ? marketplaceResult.value.sellers.filter((item) => item.balanceMinor > 0)
        : [];

      const payoutWaitingMinor = sellersWaiting.reduce(
        (sum, item) => sum + Math.max(0, item.balanceMinor),
        0,
      );

      setSnapshot({
        lowStock,
        openBookings: openBookings.length,
        overdueBookings,
        sellerPayouts: sellersWaiting.length,
        payoutWaitingMinor,
        marketplace,
      });

      if (
        standardResult.status === 'rejected'
        && marketplaceResult.status === 'rejected'
      ) {
        setWarning('Inventory attention could not be refreshed. Open POS to review the latest stock.');
      }
      else if (reservationsResult.status === 'rejected') {
        setWarning('Booking attention could not be refreshed. Open POS to review current bookings.');
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [operationalRole, space.id]);

  if (!operationalRole) return null;

  const attentionTotal =
    snapshot.lowStock
    + snapshot.openBookings
    + snapshot.sellerPayouts;

  return (
    <section className="panel sme-pos-operational-attention">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Daily operations</span>
          <h2>POS attention</h2>
          <p>
            A quick check of stock, bookings and seller payouts.
            Open POS to review or change the underlying records.
          </p>
        </div>

        <span className="type-badge">
          {loading ? 'Checking…' : attentionTotal ? `${attentionTotal} open` : 'Clear'}
        </span>
      </div>

      {loading ? (
        <div className="loading-panel">Checking shop operations…</div>
      ) : (
        <>
          <div className="summary-grid">
            <article className="summary-card">
              <span>Low stock</span>
              <strong>{snapshot.lowStock}</strong>
              <small>Available stock is at or below its alert level</small>
              <Link className="text-button" to={`/spaces/${space.id}/pos`}>
                Open inventory →
              </Link>
            </article>

            <article className="summary-card">
              <span>Open bookings</span>
              <strong>{snapshot.openBookings}</strong>
              <small>
                {snapshot.overdueBookings
                  ? `${snapshot.overdueBookings} overdue`
                  : 'Reservations still waiting to be completed'}
              </small>
              <Link className="text-button" to={`/spaces/${space.id}/pos`}>
                Open bookings →
              </Link>
            </article>

            {snapshot.marketplace && (
              <article className="summary-card">
                <span>Seller payouts waiting</span>
                <strong>{snapshot.sellerPayouts}</strong>
                <small>
                  {snapshot.sellerPayouts
                    ? `${formatMoney(snapshot.payoutWaitingMinor, space.currency)} waiting across seller wallets`
                    : 'No positive seller wallet balances waiting'}
                </small>
                <Link className="text-button" to={`/spaces/${space.id}/pos`}>
                  Open seller payouts →
                </Link>
              </article>
            )}
          </div>

          {attentionTotal === 0 && (
            <div className="empty-inline">
              No POS action needs attention right now.
            </div>
          )}
        </>
      )}

      {warning && <div className="notice warning">{warning}</div>}
    </section>
  );
}
