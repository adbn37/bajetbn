import { type FormEvent, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { SmePosPaymentSplitEditor, createSmePosPaymentDraft, paymentDraftTotalMinor, paymentDraftsToInput, type SmePosPaymentDraft } from './SmePosPaymentSplitEditor';
import {
  addSmePosReservationDeposit,
  cancelSmePosReservation,
  completeSmePosReservation,
  createSmePosReservation,
} from '../repositories/smePosRepository';
import type { SmePosCustomer, SmePosMode, SmePosPaymentAccount, SmePosReservation, SmePosRole, SmePosSettings, Space } from '../types/models';
import { getErrorMessage } from '../utils/errors';
import { formatMoney, toMinorUnits } from '../utils/money';

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Brunei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export interface SmePosReservationDraftItem {
  itemId: string;
  name: string;
  quantity: number;
  lineTotalMinor: number;
}

interface CreateProps {
  space: Space;
  settings: SmePosSettings;
  sourceMode: SmePosMode;
  items: SmePosReservationDraftItem[];
  customers: SmePosCustomer[];
  paymentAccounts: SmePosPaymentAccount[];
  initialCustomerId?: string;
  initialDiscountMinor?: number;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function SmePosCreateReservationModal({ space, settings, sourceMode, items, customers, paymentAccounts, initialCustomerId = '', initialDiscountMinor = 0, onClose, onSaved }: CreateProps) {
  const subtotalMinor = useMemo(() => items.reduce((sum, item) => sum + item.lineTotalMinor, 0), [items]);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [discount, setDiscount] = useState((Math.max(0, initialDiscountMinor) / 100).toFixed(2));
  const [deposit, setDeposit] = useState('0.00');
  const [reservationDate, setReservationDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [paymentRows, setPaymentRows] = useState<SmePosPaymentDraft[]>([createSmePosPaymentDraft(settings.defaultPaymentAccountId || '', 0)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  let discountMinor = 0;
  let depositMinor = 0;
  try { discountMinor = Math.max(0, toMinorUnits(discount || '0')); } catch { discountMinor = 0; }
  try { depositMinor = Math.max(0, toMinorUnits(deposit || '0')); } catch { depositMinor = 0; }
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);

  function setDepositAndPayment(value: string) {
    setDeposit(value);
    try {
      const minor = Math.max(0, toMinorUnits(value || '0'));
      setPaymentRows((current) => current.length === 1 ? [{ ...current[0], amount: (minor / 100).toFixed(2) }] : current);
    } catch { /* user is still typing */ }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!customerId) { setError('Choose a saved customer for the booking.'); return; }
    if (discountMinor >= subtotalMinor) { setError('Discount must be less than the subtotal.'); return; }
    if (depositMinor > totalMinor) { setError('Deposit cannot be more than the booking total.'); return; }
    if (depositMinor > 0 && paymentDraftTotalMinor(paymentRows) !== depositMinor) { setError('Deposit payment rows must match the deposit amount exactly.'); return; }
    if (depositMinor > 0 && paymentRows.some((row) => !row.accountId)) { setError('Choose an account for each deposit payment.'); return; }
    setBusy(true); setError('');
    try {
      await createSmePosReservation({
        spaceId: space.id,
        sourceMode,
        items: items.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
        customerId,
        discountMinor,
        reservationDate,
        dueDate: dueDate || null,
        depositPayments: depositMinor > 0 ? paymentDraftsToInput(paymentRows) : [],
        note,
      });
      await onSaved();
      onClose();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  return <Modal title="Reserve current cart" onClose={() => !busy && onClose()}>
    <form className="form-stack" onSubmit={submit}>
      <div className="notice">The selected stock is held for this customer and cannot be sold in another checkout until the booking is completed or cancelled.</div>
      {error && <div className="notice error">{error}</div>}
      <div className="sme-pos-booking-items">{items.map((item) => <div key={item.itemId}><span>{item.quantity} × {item.name}</span><strong>{formatMoney(item.lineTotalMinor, settings.currency)}</strong></div>)}</div>
      <label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Choose customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label>
      <div className="form-grid"><label>Booking date<input type="date" value={reservationDate} onChange={(event) => setReservationDate(event.target.value)} required /></label><label>Hold until<input type="date" min={reservationDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
      <label>Discount ({settings.currency})<input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
      <div className="sme-pos-totals"><span>Subtotal <strong>{formatMoney(subtotalMinor, settings.currency)}</strong></span><span>Discount <strong>-{formatMoney(discountMinor, settings.currency)}</strong></span><span className="total">Booking total <strong>{formatMoney(totalMinor, settings.currency)}</strong></span></div>
      <label>Deposit now ({settings.currency})<input inputMode="decimal" value={deposit} onChange={(event) => setDepositAndPayment(event.target.value)} /></label>
      {depositMinor > 0 && <SmePosPaymentSplitEditor accounts={paymentAccounts} currency={settings.currency} totalMinor={depositMinor} rows={paymentRows} onChange={setPaymentRows} disabled={busy} label="Deposit payment" />}
      <label>Booking note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional collection time, item note or reference" /></label>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Creating booking…' : 'Reserve items'}</button></div>
    </form>
  </Modal>;
}

interface PanelProps {
  space: Space;
  settings: SmePosSettings;
  role: SmePosRole;
  reservations: SmePosReservation[];
  paymentAccounts: SmePosPaymentAccount[];
  onRefresh: () => Promise<void> | void;
}

type ReservationAction = { kind: 'deposit' | 'complete' | 'cancel'; reservation: SmePosReservation } | null;

export function SmePosReservationsPanel({ space, settings, role, reservations, paymentAccounts, onRefresh }: PanelProps) {
  const [action, setAction] = useState<ReservationAction>(null);
  const [rows, setRows] = useState<SmePosPaymentDraft[]>([]);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canCancel = role === 'owner' || role === 'manager';

  function open(kind: 'deposit' | 'complete' | 'cancel', reservation: SmePosReservation) {
    setAction({ kind, reservation });
    setDate(today()); setNote(''); setError(''); setSuccess('');
    if (kind === 'deposit' || (kind === 'complete' && reservation.remainingMinor > 0)) {
      setRows([createSmePosPaymentDraft(settings.defaultPaymentAccountId || '', reservation.remainingMinor)]);
    } else setRows([]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    const reservation = action.reservation;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (action.kind === 'deposit') {
        const amount = paymentDraftTotalMinor(rows);
        if (amount <= 0 || amount > reservation.remainingMinor) throw new Error('Deposit must be more than zero and no more than the remaining balance.');
        if (rows.some((row) => !row.accountId)) throw new Error('Choose an account for each payment.');
        const result = await addSmePosReservationDeposit({ spaceId: space.id, reservationId: reservation.id, payments: paymentDraftsToInput(rows), paymentDate: date, note });
        setSuccess(`Deposit recorded. ${formatMoney(result.data.remainingMinor, reservation.currency)} remains.`);
      } else if (action.kind === 'complete') {
        if (reservation.remainingMinor > 0) {
          if (paymentDraftTotalMinor(rows) !== reservation.remainingMinor) throw new Error('Final payments must match the remaining balance exactly.');
          if (rows.some((row) => !row.accountId)) throw new Error('Choose an account for each payment.');
        }
        const result = await completeSmePosReservation({ spaceId: space.id, reservationId: reservation.id, payments: reservation.remainingMinor > 0 ? paymentDraftsToInput(rows) : [], saleDate: date, note });
        setSuccess(`Booking completed. Receipt ${result.data.receiptNumber} is ready in Sales.`);
      } else {
        const result = await cancelSmePosReservation({ spaceId: space.id, reservationId: reservation.id, cancelDate: date, reason: note });
        setSuccess(result.data.refundedMinor > 0 ? `Booking cancelled. ${formatMoney(result.data.refundedMinor, reservation.currency)} deposit refunded automatically.` : 'Booking cancelled and stock released.');
      }
      await onRefresh();
      setAction(null);
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  return <div className="panel sme-pos-module-panel">
    <div className="panel-heading"><div><h3>Bookings & deposits</h3><p>Hold stock for a customer, collect deposits, then complete the sale later.</p></div></div>
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}
    <div className="sme-pos-booking-list">
      {reservations.map((reservation) => <article className="sme-pos-booking-card" key={reservation.id}>
        <div className="panel-heading compact"><div><strong>{reservation.reservationNumber}</strong><small>{reservation.customerName} · {reservation.itemCount} item(s){reservation.dueDate ? ` · Hold until ${reservation.dueDate}` : ''}</small></div><span className="status-badge posted">{reservation.status.replace('_', ' ')}</span></div>
        <div className="sme-pos-booking-items">{reservation.items.map((item) => <div key={item.itemId}><span>{item.quantity} × {item.productName}</span><strong>{formatMoney(item.lineTotalMinor, reservation.currency)}</strong></div>)}</div>
        <div className="sme-pos-booking-money"><span>Total <strong>{formatMoney(reservation.totalMinor, reservation.currency)}</strong></span><span>Deposit <strong>{formatMoney(reservation.depositMinor, reservation.currency)}</strong></span><span>Remaining <strong>{formatMoney(reservation.remainingMinor, reservation.currency)}</strong></span></div>
        <small>Created by {reservation.createdByName || 'staff'} on {reservation.reservationDate}</small>
        <div className="button-row">{reservation.remainingMinor > 0 && <button className="button secondary small" type="button" onClick={() => open('deposit', reservation)}>Add deposit</button>}<button className="button primary small" type="button" onClick={() => open('complete', reservation)}>{reservation.remainingMinor > 0 ? 'Take balance & complete' : 'Complete sale'}</button>{canCancel && <button className="button ghost danger small" type="button" onClick={() => open('cancel', reservation)}>Cancel booking</button>}</div>
      </article>)}
    </div>
    {!reservations.length && <div className="empty-inline">No active bookings.</div>}

    {action && <Modal title={action.kind === 'deposit' ? `Add deposit · ${action.reservation.reservationNumber}` : action.kind === 'complete' ? `Complete booking · ${action.reservation.reservationNumber}` : `Cancel booking · ${action.reservation.reservationNumber}`} onClose={() => !busy && setAction(null)}>
      <form className="form-stack" onSubmit={submit}>
        {action.kind === 'cancel' ? <div className="notice warning">Reserved stock will be released. Any deposit already collected will be refunded automatically to the original payment account(s).</div> : <div className="notice">Remaining balance: <strong>{formatMoney(action.reservation.remainingMinor, action.reservation.currency)}</strong></div>}
        {action.kind !== 'cancel' && action.reservation.remainingMinor > 0 && <SmePosPaymentSplitEditor accounts={paymentAccounts} currency={action.reservation.currency} totalMinor={action.kind === 'complete' ? action.reservation.remainingMinor : paymentDraftTotalMinor(rows)} rows={rows} onChange={setRows} disabled={busy} label={action.kind === 'complete' ? 'Final payment' : 'Additional deposit'} />}
        <label>{action.kind === 'cancel' ? 'Cancellation date' : action.kind === 'complete' ? 'Sale date' : 'Payment date'}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
        <label>{action.kind === 'cancel' ? 'Reason' : 'Note'}<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" /></label>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setAction(null)} disabled={busy}>Back</button><button className={`button ${action.kind === 'cancel' ? 'danger' : 'primary'}`} type="submit" disabled={busy}>{busy ? 'Saving…' : action.kind === 'deposit' ? 'Record deposit' : action.kind === 'complete' ? 'Complete sale' : 'Cancel & refund'}</button></div>
      </form>
    </Modal>}
  </div>;
}
