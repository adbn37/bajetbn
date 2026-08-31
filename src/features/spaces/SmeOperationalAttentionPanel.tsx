import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getBusinessProfile,
} from '../../repositories/businessAdvancedRepository';
import {
  getMarketplacePosWorkspace,
  getSmePosStaffWorkspace,
  listSmePosReservations,
} from '../../repositories/smePosRepository';
import type {
  BusinessIndustry,
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

export function SmeOperationalAttentionPanel({
  space,
  role,
}: Props) {
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
      setWarning('');

      let industry: BusinessIndustry =
        'general';

      try {
        const profile =
          await getBusinessProfile(
            space.id,
          );

        industry =
          profile?.industry
          || 'general';
      } catch {
        if (!cancelled) {
          setSnapshot(
            emptySnapshot,
          );
          setWarning('');
          setLoading(false);
        }

        return;
      }

      if (cancelled) return;

      const salesFocused =
        industry === 'retail'
        || industry === 'marketplace';

      /*
       * Rental, Service, Transport, General and Other
       * businesses must not load POS inventory merely
       * because the current member is Owner/Manager.
       */
      if (!salesFocused) {
        setSnapshot(
          emptySnapshot,
        );
        setWarning('');
        setLoading(false);
        return;
      }

      setLoading(true);

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

      const marketplace =
        industry === 'marketplace'
        && marketplaceResult.status === 'fulfilled';

      const lowStock = marketplace
        ? marketplaceResult.value.listings
            .filter(isLowStockItem).length
        : standardResult.status === 'fulfilled'
          ? standardResult.value.products
              .filter(isLowStockItem).length
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
        (item) =>
          Boolean(item.dueDate && item.dueDate < today),
      ).length;

      const sellersWaiting = marketplace
        ? marketplaceResult.value.sellers.filter(
            (item) => item.balanceMinor > 0,
          )
        : [];

      const payoutWaitingMinor = sellersWaiting.reduce(
        (sum, item) =>
          sum + Math.max(0, item.balanceMinor),
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

      const inventoryRejected =
        industry === 'marketplace'
          ? marketplaceResult.status === 'rejected'
          : standardResult.status === 'rejected';

      if (inventoryRejected) {
        setWarning(
          'Inventory attention could not be refreshed. Open POS to review the latest stock.',
        );
      }
      else if (reservationsResult.status === 'rejected') {
        setWarning(
          'Booking attention could not be refreshed. Open POS to review current bookings.',
        );
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

  /*
   * v1.8 home rule:
   * do not occupy homepage space when there is nothing
   * requiring the Owner/Manager's attention.
   */
  if (!loading && !warning && attentionTotal === 0) {
    return null;
  }

  return (
    <section
      className="panel sme-pos-operational-attention"
      aria-label="POS attention"
      style={{
        padding: '0.65rem 0.75rem',
        marginTop: '0.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: warning || attentionTotal ? '0.55rem' : 0,
        }}
      >
        <div>
          <span className="eyebrow">POS attention</span>
          <small className="muted">
            Only items that need action
          </small>
        </div>

        <span className="type-badge">
          {loading ? 'Checking...' : `${attentionTotal} open`}
        </span>
      </div>

      {warning && (
        <div className="notice warning compact-notice">
          {warning}
        </div>
      )}

      {!loading && attentionTotal > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {snapshot.lowStock > 0 && (
            <Link
              className="button secondary compact"
              to={`/spaces/${space.id}/pos`}
              title="Open inventory"
            >
              <span>Low stock</span>
              <span className="type-badge">
                {snapshot.lowStock}
              </span>
              <small>Open inventory</small>
            </Link>
          )}

          {snapshot.openBookings > 0 && (
            <Link
              className="button secondary compact"
              to={`/spaces/${space.id}/pos`}
              title="Open bookings"
            >
              <span>Open bookings</span>
              <span className="type-badge">
                {snapshot.openBookings}
              </span>
              <small>
                {snapshot.overdueBookings > 0
                  ? `${snapshot.overdueBookings} overdue`
                  : 'Open bookings'}
              </small>
            </Link>
          )}

          {snapshot.marketplace
            && snapshot.sellerPayouts > 0 && (
              <Link
                className="button secondary compact"
                to={`/spaces/${space.id}/pos`}
                title={`Seller payouts waiting: ${formatMoney(
                  snapshot.payoutWaitingMinor,
                  space.currency,
                )}`}
              >
                <span>Seller payouts waiting</span>
                <span className="type-badge">
                  {snapshot.sellerPayouts}
                </span>
                <small>Open seller payouts</small>
              </Link>
            )}
        </div>
      )}
    </section>
  );
}