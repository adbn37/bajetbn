import { type CSSProperties, useEffect, useState } from 'react';
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

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
  gap: '0.5rem',
};

const shortcutStyle: CSSProperties = {
  minHeight: '44px',
  width: '100%',
  padding: '0.55rem 0.7rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  textAlign: 'left',
};

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

  const [snapshot, setSnapshot] =
    useState<AttentionSnapshot>(emptySnapshot);
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

      const reservations =
        reservationsResult.status === 'fulfilled'
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
        ? marketplaceResult.value.sellers.filter(
            (item) => item.balanceMinor > 0,
          )
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
        setWarning(
          'Inventory attention could not be refreshed. Open POS for the latest stock.',
        );
      } else if (reservationsResult.status === 'rejected') {
        setWarning(
          'Booking attention could not be refreshed. Open POS for current bookings.',
        );
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [operationalRole, space.id]);

  if (!operationalRole || loading) return null;

  const attentionTotal =
    snapshot.lowStock
    + snapshot.openBookings
    + snapshot.sellerPayouts;

  if (attentionTotal === 0 && !warning) return null;

  return (
    <section
      aria-label="SME items needing attention"
      style={{ marginBottom: '0.75rem' }}
    >
      {attentionTotal > 0 && (
        <div style={gridStyle}>
          {snapshot.lowStock > 0 && (
            <Link
              className="button secondary compact"
              style={shortcutStyle}
              to={`/spaces/${space.id}/pos`}
            >
              <span>Low Stock</span>
              <span className="type-badge">{snapshot.lowStock}</span>
            </Link>
          )}

          {snapshot.openBookings > 0 && (
            <Link
              className="button secondary compact"
              style={shortcutStyle}
              to={`/spaces/${space.id}/pos`}
              title={
                snapshot.overdueBookings
                  ? `${snapshot.overdueBookings} overdue`
                  : 'Open bookings'
              }
            >
              <span>Bookings</span>
              <span className="type-badge">
                {snapshot.openBookings}
              </span>
            </Link>
          )}

          {snapshot.marketplace && snapshot.sellerPayouts > 0 && (
            <Link
              className="button secondary compact"
              style={shortcutStyle}
              to={`/spaces/${space.id}/pos`}
              title={`${formatMoney(
                snapshot.payoutWaitingMinor,
                space.currency,
              )} waiting`}
            >
              <span>Payouts</span>
              <span className="type-badge">
                {snapshot.sellerPayouts}
              </span>
            </Link>
          )}
        </div>
      )}

      {warning && (
        <div
          className="notice warning compact-notice"
          style={{ marginTop: '0.5rem' }}
        >
          {warning}
        </div>
      )}
    </section>
  );
}
