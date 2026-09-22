import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import { paymentMethodLabel } from '../../config/bruneiMoneyOptions';
import {
  createSpaceInvitation,
} from '../../repositories/collaborationRepository';
import {
  createSharedExpense,
  getSharedExpenseProofUrl,
  listSharedExpensePayments,
  listSharedExpenses,
  listSharedExpenseShares,
  reviewSharedExpensePayment,
  reverseSharedExpensePayment,
  submitSharedExpensePayment,
  uploadSharedExpenseProof,
} from '../../repositories/sharedExpenseRepository';
import type {
  PaymentMethodCode,
  SharedExpense,
  SharedExpensePayment,
  SharedExpenseShare,
  SharedExpenseSplitMode,
  Space,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

function today() { return new Date().toISOString().slice(0, 10); }
function memberLabel(member?: SpaceMember | null) { return member?.displayName || member?.email || 'Member'; }
function paymentStatusLabel(status: string) {
  if (status === 'submitted') return 'Waiting for check';
  if (status === 'posted') return 'Paid';
  if (status === 'rejected') return 'Not accepted';
  if (status === 'reversed') return 'Undone';
  return status;
}

interface OwedRow {
  fromUid: string;
  toUid: string;
  amountMinor: number;
  expenseIds: string[];
}

function calculateWhoOwes(
  expenses: SharedExpense[],
  shares: SharedExpenseShare[],
): OwedRow[] {
  const expenseMap = new Map(expenses.map((item) => [item.id, item]));
  const direct = new Map<string, { fromUid: string; toUid: string; amountMinor: number; expenseIds: Set<string> }>();
  shares.forEach((share) => {
    if (share.amountLeftMinor <= 0) return;
    const expense = expenseMap.get(share.expenseId);
    if (!expense || expense.paidFromGroupFund || expense.paidFromTripMoney || share.memberUid === expense.paidByUid) return;
    const key = `${share.memberUid}::${expense.paidByUid}`;
    const current = direct.get(key) || { fromUid: share.memberUid, toUid: expense.paidByUid, amountMinor: 0, expenseIds: new Set<string>() };
    current.amountMinor += share.amountLeftMinor;
    current.expenseIds.add(expense.id);
    direct.set(key, current);
  });

  const seen = new Set<string>();
  const result: OwedRow[] = [];
  direct.forEach((row) => {
    const pairKey = [row.fromUid, row.toUid].sort().join('::');
    if (seen.has(pairKey)) return;
    seen.add(pairKey);
    const forward = direct.get(`${row.fromUid}::${row.toUid}`);
    const backward = direct.get(`${row.toUid}::${row.fromUid}`);
    const difference = (forward?.amountMinor || 0) - (backward?.amountMinor || 0);
    if (difference > 0 && forward) result.push({ ...forward, amountMinor: difference, expenseIds: Array.from(forward.expenseIds) });
    if (difference < 0 && backward) result.push({ ...backward, amountMinor: Math.abs(difference), expenseIds: Array.from(backward.expenseIds) });
  });
  return result.sort((a, b) => b.amountMinor - a.amountMinor);
}

export function SharedExpensesPanel({
  space,
  members,
  currentMember,
  canManage,
  view,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
  canManage: boolean;
  view: 'expenses' | 'balances';
}) {
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [shares, setShares] = useState<SharedExpenseShare[]>([]);
  const [payments, setPayments] = useState<SharedExpensePayment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const [
    inviteOpen,
    setInviteOpen,
  ] = useState(false);

  const [paying, setPaying] = useState<{ toUid: string; amountMinor: number; expenseId?: string; title: string } | null>(null);
  const [undoDialog, setUndoDialog] = useState<ActionConfirmState<SharedExpensePayment> | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeMembers = useMemo(() => members.filter((item) => (item.status || 'active') === 'active'), [members]);
  const memberMap = useMemo(() => new Map(activeMembers.map((item) => [item.uid, item])), [activeMembers]);
  const sharesByExpense = useMemo(() => {
    const map = new Map<string, SharedExpenseShare[]>();
    shares.forEach((share) => map.set(share.expenseId, [...(map.get(share.expenseId) || []), share]));
    return map;
  }, [shares]);
  const whoOwes = useMemo(() => calculateWhoOwes(expenses, shares), [expenses, shares]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextExpenses, nextShares, nextPayments] = await Promise.all([
        listSharedExpenses(space.id),
        listSharedExpenseShares(space.id),
        listSharedExpensePayments(space.id),
      ]);
      setExpenses(nextExpenses);
      setShares(nextShares);
      setPayments(nextPayments);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [space.id]);

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
  };

  const runUndoPayment = async () => {
    if (!undoDialog) return;
    setUndoBusy(true);
    setError('');
    try {
      await reverseSharedExpensePayment({ paymentId: undoDialog.payload.id, reason: 'Undone from Space' });
      setUndoDialog(null);
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setUndoBusy(false);
    }
  };

  if (loading) return <div className="loading-panel">Loading shared expenses…</div>;

  const month = today().slice(0, 7);
  const monthExpenses = expenses.filter((item) => item.expenseDate.startsWith(month));
  const monthTotal = monthExpenses.reduce((sum, item) => sum + item.totalMinor, 0);
  const monthLeft = monthExpenses.reduce((sum, item) => sum + item.amountLeftMinor, 0);


  if (view === 'balances' && space.type === 'trip') {
    const openTotalMinor =
      whoOwes.reduce(
        (sum, row) =>
          sum + row.amountMinor,
        0,
      );

    const postedPaymentMinor =
      payments
        .filter(
          (payment) =>
            payment.status === 'posted',
        )
        .reduce(
          (sum, payment) =>
            sum + payment.amountMinor,
          0,
        );

    const pendingPaymentMinor =
      payments
        .filter(
          (payment) =>
            payment.status === 'submitted',
        )
        .reduce(
          (sum, payment) =>
            sum + payment.amountMinor,
          0,
        );

    return (
      <section
        className="panel trip-settle-sheet-v115"
        data-trip-settle-spreadsheet
      >
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Trip worksheet
            </span>

            <h2>Settle Up</h2>

            <p className="muted">
              See who owes whom and keep member payment history in one worksheet.
            </p>
          </div>

          <div className="button-row">
            {canManage && (
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setInviteOpen(true)
                }
              >
                Invite participant
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <div className="trip-sheet-summary">
          <span>
            Open{' '}
            {formatMoney(
              openTotalMinor,
              space.currency,
            )}
          </span>

          <span>
            Paid{' '}
            {formatMoney(
              postedPaymentMinor,
              space.currency,
            )}
          </span>

          <span>
            Waiting{' '}
            {formatMoney(
              pendingPaymentMinor,
              space.currency,
            )}
          </span>
        </div>

        <div className="info-banner">
          <strong>
            One simple amount per pair.
          </strong>

          <span>
            BajetBN combines open shares between the same two people.
            Member repayments do not change bank account balances.
          </span>
        </div>

        <div className="trip-sheet-section-heading">
          <div>
            <span className="eyebrow">
              Open balances
            </span>

            <h3>
              Who pays whom
            </h3>
          </div>
        </div>

        <div className="trip-sheet-scroll">
          <table
            className="trip-sheet-table trip-settle-balance-table"
            aria-label="Trip open balances worksheet"
          >
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Expenses</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {whoOwes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="trip-sheet-empty-cell"
                  >
                    Everyone is settled for the current Trip Expenses.
                  </td>
                </tr>
              ) : (
                whoOwes.map(
                  (row) => {
                    const from =
                      memberMap.get(
                        row.fromUid,
                      );

                    const to =
                      memberMap.get(
                        row.toUid,
                      );

                    const mine =
                      currentMember?.uid
                      === row.fromUid;

                    return (
                      <tr
                        key={
                          `${row.fromUid}-${row.toUid}`
                        }
                      >
                        <td>
                          <strong>
                            {memberLabel(
                              from,
                            )}
                          </strong>
                        </td>

                        <td>
                          {memberLabel(
                            to,
                          )}
                        </td>

                        <td>
                          {row.expenseIds.length}{' '}
                          {row.expenseIds.length === 1
                            ? 'expense'
                            : 'expenses'}
                        </td>

                        <td className="trip-budget-number-cell">
                          {formatMoney(
                            row.amountMinor,
                            space.currency,
                          )}
                        </td>

                        <td className="trip-sheet-actions-cell">
                          {mine ? (
                            <button
                              className="button primary compact"
                              type="button"
                              onClick={() =>
                                setPaying({
                                  toUid:
                                    row.toUid,
                                  amountMinor:
                                    row.amountMinor,
                                  title:
                                    `Pay ${memberLabel(to)}`,
                                })
                              }
                            >
                              Pay
                            </button>
                          ) : (
                            <span className="muted">
                              Waiting
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="trip-sheet-section-heading">
          <div>
            <span className="eyebrow">
              Payment history
            </span>

            <h3>
              Recent member payments
            </h3>
          </div>
        </div>

        <div className="trip-sheet-scroll">
          <table
            className="trip-sheet-table trip-settle-payment-table"
            aria-label="Trip payment history worksheet"
          >
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="trip-sheet-empty-cell"
                  >
                    No member payments yet.
                  </td>
                </tr>
              ) : (
                payments
                  .slice(0, 30)
                  .map(
                    (payment) => {
                      const canReview =
                        canManage
                        && payment.status
                          === 'submitted';

                      const canUndo =
                        payment.status
                          === 'posted'
                        && (
                          canManage
                          || currentMember?.uid
                            === payment.fromUid
                        );

                      return (
                        <tr
                          key={payment.id}
                          className={
                            `trip-settle-payment-status-${payment.status}`
                          }
                        >
                          <td>
                            {payment.paymentDate}
                          </td>

                          <td>
                            {payment.fromName
                              || payment.fromEmail
                              || 'Member'}
                          </td>

                          <td>
                            {payment.toName
                              || payment.toEmail
                              || 'Member'}
                          </td>

                          <td className="trip-budget-number-cell">
                            {formatMoney(
                              payment.amountMinor,
                              payment.currency,
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                `trip-settle-status status-${payment.status}`
                              }
                            >
                              {paymentStatusLabel(
                                payment.status,
                              )}
                            </span>
                          </td>

                          <td>
                            {payment.proofPath ? (
                              <button
                                className="text-button"
                                type="button"
                                onClick={() =>
                                  void getSharedExpenseProofUrl(
                                    payment.proofPath
                                    || '',
                                  ).then(
                                    (url) =>
                                      window.open(
                                        url,
                                        '_blank',
                                        'noopener,noreferrer',
                                      ),
                                  )
                                }
                              >
                                View proof
                              </button>
                            ) : (
                              <span className="muted">
                                —
                              </span>
                            )}
                          </td>

                          <td className="trip-sheet-actions-cell">
                            <div className="trip-sheet-row-actions">
                              {canReview && (
                                <>
                                  <button
                                    className="button primary compact"
                                    type="button"
                                    onClick={() =>
                                      void run(
                                        () =>
                                          reviewSharedExpensePayment({
                                            paymentId:
                                              payment.id,
                                            decision:
                                              'confirmed',
                                          }),
                                      )
                                    }
                                  >
                                    Confirm
                                  </button>

                                  <button
                                    className="button danger-outline compact"
                                    type="button"
                                    onClick={() =>
                                      void run(
                                        () =>
                                          reviewSharedExpensePayment({
                                            paymentId:
                                              payment.id,
                                            decision:
                                              'rejected',
                                          }),
                                      )
                                    }
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {canUndo && (
                                <button
                                  className="button danger-outline compact"
                                  type="button"
                                  onClick={() =>
                                    setUndoDialog({
                                      payload:
                                        payment,
                                      title:
                                        'Undo this payment?',
                                      description:
                                        'The payment will be reversed and the amount will be shown as owed again.',
                                      note:
                                        'The original payment stays in the history as an undone record.',
                                      confirmLabel:
                                        'Undo member payment',
                                      tone:
                                        'danger',
                                    })
                                  }
                                >
                                  Undo
                                </button>
                              )}

                              {!canReview
                                && !canUndo
                                && (
                                  <span className="muted">
                                    —
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )
              )}
            </tbody>
          </table>
        </div>

        {undoDialog && (
          <ActionConfirmModal
            state={undoDialog}
            busy={undoBusy}
            error={error}
            onClose={() => {
              setUndoDialog(null);
              setError('');
            }}
            onConfirm={() =>
              void runUndoPayment()
            }
          />
        )}

        {paying && (
          <Modal
            title={paying.title}
            onClose={() =>
              setPaying(null)
            }
          >
            <SharedExpensePaymentForm
              space={space}
              payment={paying}
              onSaved={async () => {
                setPaying(null);
                await load();
              }}
            />
          </Modal>
        )}

        {inviteOpen && (
          <Modal
            title="Invite to Settlements"
            onClose={() =>
              setInviteOpen(false)
            }
          >
            <SharedExpenseInviteForm
              space={space}
              destination="balances"
              onDone={() =>
                setInviteOpen(false)
              }
            />
          </Modal>
        )}
      </section>
    );
  }

  if (view === 'balances') {
    return <section className="panel shared-expense-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Member balances</span>
          <h2>{space.type === 'trip' ? 'Settle Up' : 'Settlements'}</h2>
        </div>

        {canManage && (
          <button
            className="button secondary"
            type="button"
            onClick={() => setInviteOpen(true)}
          >
            Invite participant
          </button>
        )}
      </div>
      {error && <div className="notice error">{error}</div>}
      <div className="info-banner"><strong>One simple amount per pair</strong><span>BajetBN combines open shares between the same two people. These payments do not change bank account balances.</span></div>
      <div className="who-owes-list">
        {whoOwes.length === 0 ? <p>Everyone is settled for the current shared expenses.</p> : whoOwes.map((row) => {
          const from = memberMap.get(row.fromUid);
          const to = memberMap.get(row.toUid);
          const mine = currentMember?.uid === row.fromUid;
          return <article className="who-owes-row" key={`${row.fromUid}-${row.toUid}`}>
            <div><strong>{memberLabel(from)} pays {memberLabel(to)}</strong><small>{row.expenseIds.length} shared expense{row.expenseIds.length === 1 ? '' : 's'} combined</small></div>
            <strong>{formatMoney(row.amountMinor, space.currency)}</strong>
            {mine && <button className="button primary" onClick={() => setPaying({ toUid: row.toUid, amountMinor: row.amountMinor, title: `Pay ${memberLabel(to)}` })}>Pay this person</button>}
          </article>;
        })}
      </div>

      <div className="panel-heading subheading"><div><span className="eyebrow">Payments</span><h2>Recent member payments</h2></div></div>
      <div className="shared-payment-list">
        {payments.length === 0 ? <p>No member payments yet.</p> : payments.slice(0, 30).map((payment) => {
          const canReview = canManage && payment.status === 'submitted';
          const canUndo = payment.status === 'posted' && (canManage || currentMember?.uid === payment.fromUid);
          return <article className={`shared-payment-row status-${payment.status}`} key={payment.id}>
            <div><strong>{payment.fromName || 'Member'} → {payment.toName || 'Member'}</strong><small>{payment.paymentDate} · {paymentStatusLabel(payment.status)}</small></div>
            <strong>{formatMoney(payment.amountMinor, payment.currency)}</strong>
            <div className="button-row">
              {payment.proofPath && <button className="text-button" onClick={() => void getSharedExpenseProofUrl(payment.proofPath || '').then((url) => window.open(url, '_blank', 'noopener,noreferrer'))}>View proof</button>}
              {canReview && <><button className="button primary" onClick={() => void run(() => reviewSharedExpensePayment({ paymentId: payment.id, decision: 'confirmed' }))}>Confirm</button><button className="button danger-outline" onClick={() => void run(() => reviewSharedExpensePayment({ paymentId: payment.id, decision: 'rejected' }))}>Decline</button></>}
              {canUndo && <button className="button danger-outline" onClick={() => setUndoDialog({ payload: payment, title: 'Undo this payment?', description: 'The payment will be reversed and the amount will be shown as owed again.', note: 'The original payment stays in the history as an undone record.', confirmLabel: 'Undo member payment', tone: 'danger' })}>Undo payment</button>}
            </div>
          </article>;
        })}
      </div>
      {undoDialog && <ActionConfirmModal state={undoDialog} busy={undoBusy} error={error} onClose={() => { setUndoDialog(null); setError(''); }} onConfirm={() => void runUndoPayment()} />}
      {paying && <Modal title={paying.title} onClose={() => setPaying(null)}><SharedExpensePaymentForm space={space} payment={paying} onSaved={async () => { setPaying(null); await load(); }} /></Modal>}

      {inviteOpen && (
        <Modal
          title="Invite to Settlements"
          onClose={() => setInviteOpen(false)}
        >
          <SharedExpenseInviteForm
            space={space}
            destination="balances"
            onDone={() => setInviteOpen(false)}
          />
        </Modal>
      )}
    </section>;
  }

  return <>
    {space.type === 'household' && <section className="summary-grid household-month-summary">
      <article className="summary-card featured"><span>This month</span><strong>{formatMoney(monthTotal, space.currency)}</strong><small>Shared household spending</small></article>
      <article className="summary-card"><span>Paid back</span><strong>{formatMoney(monthTotal - monthLeft, space.currency)}</strong><small>Including each payer's own share</small></article>
      <article className="summary-card"><span>Still to pay</span><strong>{formatMoney(monthLeft, space.currency)}</strong><small>Open member shares</small></article>
    </section>}
    <section className="panel shared-expense-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Group spending</span>
          <h2>Shared expenses</h2>
        </div>

        <div className="button-row">
          {canManage && (
            <button
              className="button secondary"
              type="button"
              onClick={() => setInviteOpen(true)}
            >
              Invite participant
            </button>
          )}

          {canManage
            || ['owner', 'admin', 'contributor'].includes(
              currentMember?.role || '',
            )
            ? (
              <button
                className="button primary"
                onClick={() => setCreateOpen(true)}
              >
                Add shared expense
              </button>
            )
            : undefined}
        </div>
      </div>
      {error && <div className="notice error">{error}</div>}
      <div className="info-banner"><strong>Spend first or plan first.</strong><span>No budget is required. Record what was paid, select who shares it, and BajetBN keeps the running member balance.</span></div>
      <div className="shared-expense-grid">
        {expenses.length === 0 ? <p>No shared expenses yet.</p> : expenses.map((expense) => {
          const expenseShares = sharesByExpense.get(expense.id) || [];
          const mine = expenseShares.find((item) => item.memberUid === currentMember?.uid);
          const mayPay = Boolean(mine && mine.amountLeftMinor > 0 && expense.paidByUid !== currentMember?.uid);
          const payer = memberMap.get(expense.paidByUid);
          return <article className={`shared-expense-card status-${expense.status}`} key={expense.id}>
            <div className="planning-card-head"><div><span className="eyebrow">{expense.paidFromGroupFund || expense.paidFromTripMoney ? (space.type === 'trip' ? 'Paid using Trip money' : space.type === 'household' ? 'Paid using Household fund' : 'Paid using Group fund') : expense.status === 'paid' ? 'Everyone paid' : 'Payment still open'}</span><h3>{expense.title}</h3></div><strong>{formatMoney(expense.totalMinor, expense.currency)}</strong></div>
            <div className="planning-meta"><span>Paid by {memberLabel(payer)}</span><span>{expense.expenseDate}</span><span>{expenseShares.length} {expenseShares.length === 1 ? 'person' : 'people'} - {expense.splitMode === 'equal' ? 'Split equally' : expense.splitMode === 'custom' ? 'Different amounts' : 'By percentage'}</span></div>
            <div className="transaction-preview"><div><span>Paid back</span><strong>{formatMoney(expense.totalSettledMinor, expense.currency)}</strong></div><div><span>Still to pay</span><strong>{formatMoney(expense.amountLeftMinor, expense.currency)}</strong></div></div>
            {expense.note && <p>{expense.note}</p>}
            <div className="expense-share-list">{expenseShares.map((share) => <span className={`expense-share-chip status-${share.status}`} key={share.id}>{share.memberName || share.memberEmail || 'Member'} · {formatMoney(share.shareMinor, share.currency)}{share.amountLeftMinor > 0 ? ` · ${formatMoney(share.amountLeftMinor, share.currency)} left` : ' · paid'}</span>)}</div>
            <div className="button-row">
              {mayPay && <button className="button primary" onClick={() => setPaying({ toUid: expense.paidByUid, amountMinor: mine?.amountLeftMinor || 0, expenseId: expense.id, title: `Pay for ${expense.title}` })}>Pay my share</button>}
              {space.headWhatsapp && currentMember?.uid !== expense.paidByUid && <a className="button secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${space.headWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I am checking my share for ${expense.title} in ${space.name}.`)}`}>WhatsApp group head</a>}
            </div>
          </article>;
        })}
      </div>
      {createOpen && <Modal title="Add expense" onClose={() => setCreateOpen(false)}><SharedExpenseForm space={space} members={activeMembers} onSaved={async () => { setCreateOpen(false); await load(); }} /></Modal>}
      {paying && <Modal title={paying.title} onClose={() => setPaying(null)}><SharedExpensePaymentForm space={space} payment={paying} onSaved={async () => { setPaying(null); await load(); }} /></Modal>}

      {inviteOpen && (
        <Modal
          title="Invite to Shared Expenses"
          onClose={() => setInviteOpen(false)}
        >
          <SharedExpenseInviteForm
            space={space}
            destination="expenses"
            onDone={() => setInviteOpen(false)}
          />
        </Modal>
      )}
    </section>
  </>;
}

function SharedExpenseInviteForm({
  space,
  destination,
  onDone,
}: {
  space: Space;
  destination: 'expenses' | 'balances';
  onDone: () => void;
}) {
  const [whatsappNumber, setWhatsappNumber] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const submit = async (
    delivery: 'copy' | 'whatsapp',
  ) => {
    if (busy) {
      return;
    }

    const whatsappWindow =
      delivery === 'whatsapp'
        ? window.open(
            'about:blank',
            '_blank',
          )
        : null;

    if (whatsappWindow) {
      whatsappWindow.opener =
        null;
    }

    setBusy(true);
    setError('');

    try {
      const result =
        await createSpaceInvitation({
          spaceId:
            space.id,
          email:
            email.trim() || null,
          role:
            'payer',
          canUseAccounts:
            false,
          canViewBalances:
            false,
          canViewLedger:
            false,
          posRole:
            null,
        });

      const nextPath =
        '/spaces/'
        + space.id
        + (
          destination === 'balances'
            ? '?tab=balances'
            : '?tab=expenses'
        );

      const inviteUrl =
        window.location.origin
        + '/join?token='
        + encodeURIComponent(
            result.data.token,
          )
        + '&next='
        + encodeURIComponent(
            nextPath,
          );

      if (delivery === 'copy') {
        await navigator.clipboard.writeText(
          inviteUrl,
        );

        onDone();
        return;
      }

      const digits =
        whatsappNumber.replace(
          /D/g,
          '',
        );

      const message =
        destination === 'balances'
          ? (
              'Join '
              + space.name
              + ' in BajetBN to view and settle shared expenses: '
              + inviteUrl
            )
          : (
              'Join '
              + space.name
              + ' in BajetBN for shared expenses: '
              + inviteUrl
            );

      const href =
        'https://wa.me/'
        + digits
        + '?text='
        + encodeURIComponent(
            message,
          );

      if (whatsappWindow) {
        whatsappWindow.location.href =
          href;
      } else {
        window.open(
          href,
          '_blank',
          'noopener,noreferrer',
        );
      }

      onDone();
    } catch (nextError) {
      whatsappWindow?.close();

      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        void submit('whatsapp');
      }}
      data-shared-expense-invite
    >
      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="info-banner">
        <strong>Invite first, then split expenses</strong>
        <span>
          The secure link adds the person to this Space
          only after they accept. After joining, BajetBN
          returns them directly to {
            destination === 'balances'
              ? 'Settlements'
              : 'Shared Expenses'
          }.
        </span>
      </div>

      <label>
        WhatsApp number
        <span className="optional-label">
          Optional
        </span>

        <input
          value={whatsappNumber}
          onChange={(event) =>
            setWhatsappNumber(
              event.target.value,
            )
          }
          inputMode="tel"
          placeholder="6738XXXXXX"
        />

        <small>
          Leave blank to choose the WhatsApp contact yourself.
        </small>
      </label>

      <label>
        Email address
        <span className="optional-label">
          Optional security lock
        </span>

        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value,
            )
          }
          placeholder="person@example.com"
        />

        <small>
          If entered, only that email can accept this invite.
        </small>
      </label>

      <div className="modal-actions">
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => void submit('copy')}
        >
          Copy invite link
        </button>

        <button
          className="button primary"
          type="submit"
          disabled={busy}
        >
          {busy
            ? 'Creating invite…'
            : 'Send via WhatsApp'}
        </button>
      </div>
    </form>
  );
}

function SharedExpenseForm({ space, members, onSaved }: { space: Space; members: SpaceMember[]; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [paidByUid, setPaidByUid] = useState(members[0]?.uid || '');
  const [splitMode, setSplitMode] = useState<SharedExpenseSplitMode>('equal');
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(members.map((item) => [item.uid, true])));
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [paidFromGroupFund, setPaidFromGroupFund] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedMembers = members.filter((item) => selected[item.uid]);
  const payer = members.find((item) => item.uid === paidByUid);
  const numericTotal = Number(total);
  const previewTotalMinor = Number.isFinite(numericTotal) && numericTotal > 0
    ? Math.round(numericTotal * 100)
    : 0;
  const equalShareMinor = selectedMembers.length > 0
    ? Math.floor(previewTotalMinor / selectedMembers.length)
    : 0;

  const selectEveryone = () => {
    setSelected(Object.fromEntries(members.map((item) => [item.uid, true])));
  };

  const clearEveryone = () => {
    setSelected(Object.fromEntries(members.map((item) => [item.uid, false])));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!selectedMembers.length) throw new Error('Choose at least one person.');
      const splits = selectedMembers.map((member) => splitMode === 'custom'
        ? { memberUid: member.uid, amountMinor: toMinorUnits(amounts[member.uid] || '0') }
        : splitMode === 'percentage'
          ? { memberUid: member.uid, percentageBasisPoints: Math.round(Number(percentages[member.uid] || 0) * 100) }
          : { memberUid: member.uid });
      await createSharedExpense({ spaceId: space.id, title, totalMinor: toMinorUnits(total), expenseDate, paidByUid, splitMode, splits, note, paidFromGroupFund });
      await onSaved();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <form className="form-stack shared-expense-simple-form" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}

    <div className="info-banner">
      <strong>No budget needed.</strong>
      <span>Add what was paid, choose who shares it, and BajetBN works out the split.</span>
    </div>

    <label>
      What was it for?
      <input
        autoFocus
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Food, groceries, taxi, hotel..."
      />
    </label>

    <label>
      Amount ({space.currency})
      <input
        required
        inputMode="decimal"
        value={total}
        onChange={(event) => setTotal(event.target.value)}
        placeholder="0.00"
      />
    </label>

    <label>
      Who paid?
      <select required value={paidByUid} onChange={(event) => setPaidByUid(event.target.value)}>
        {members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}
      </select>
    </label>

    <fieldset className="member-split-editor">
      <legend>Who shares this?</legend>

      <div className="button-row">
        <button className="text-button" type="button" onClick={selectEveryone}>Everyone</button>
        <button className="text-button" type="button" onClick={clearEveryone}>Clear</button>
      </div>

      {members.map((member) => <div className="member-split-row" key={member.uid}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={Boolean(selected[member.uid])}
            onChange={(event) => setSelected((current) => ({ ...current, [member.uid]: event.target.checked }))}
          />
          {memberLabel(member)}
        </label>

        {selected[member.uid] && splitMode === 'custom' && (
          <input
            aria-label={`${memberLabel(member)} amount`}
            inputMode="decimal"
            placeholder={space.currency}
            value={amounts[member.uid] || ''}
            onChange={(event) => setAmounts((current) => ({ ...current, [member.uid]: event.target.value }))}
          />
        )}

        {selected[member.uid] && splitMode === 'percentage' && (
          <input
            aria-label={`${memberLabel(member)} percentage`}
            inputMode="decimal"
            placeholder="%"
            value={percentages[member.uid] || ''}
            onChange={(event) => setPercentages((current) => ({ ...current, [member.uid]: event.target.value }))}
          />
        )}
      </div>)}
    </fieldset>

    {selectedMembers.length > 0 && previewTotalMinor > 0 && (
      <div className="transaction-preview">
        <div>
          <span>{splitMode === 'equal' ? 'Automatic split' : 'Shared by'}</span>
          <strong>
            {selectedMembers.length} {selectedMembers.length === 1 ? 'person' : 'people'}
          </strong>
        </div>

        {splitMode === 'equal' && (
          <div>
            <span>Each person</span>
            <strong>~ {formatMoney(equalShareMinor, space.currency)}</strong>
          </div>
        )}

        <small>
          {memberLabel(payer)} paid {formatMoney(previewTotalMinor, space.currency)}.
          {splitMode === 'equal'
            ? " BajetBN will track each selected person's share automatically."
            : ' BajetBN will track the split you enter below.'}
        </small>
      </div>
    )}

    <details className="shared-expense-more-options">
      <summary>More options</summary>

      <div className="form-stack">
        <label>
          How should it be split?
          <select value={splitMode} onChange={(event) => setSplitMode(event.target.value as SharedExpenseSplitMode)}>
            <option value="equal">Split equally</option>
            <option value="custom">Enter different amounts</option>
            <option value="percentage">Split by percentage</option>
          </select>
        </label>

        <label>
          Date
          <input type="date" required value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
        </label>

        {(space.type === 'trip' || space.type === 'household' || space.type === 'custom') && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={paidFromGroupFund}
              onChange={(event) => setPaidFromGroupFund(event.target.checked)}
            />
            {space.type === 'trip'
              ? 'Paid using collected Trip money'
              : space.type === 'household'
                ? 'Paid using collected Household fund'
                : 'Paid using collected Group fund'}
          </label>
        )}

        <label>
          Note
          <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
    </details>

    <button className="button primary full" disabled={busy || selectedMembers.length === 0}>
      {busy ? 'Saving...' : 'Save expense'}
    </button>
  </form>;
}
function SharedExpensePaymentForm({ space, payment, onSaved }: { space: Space; payment: { toUid: string; amountMinor: number; expenseId?: string }; onSaved: () => Promise<void> }) {
  const [amount, setAmount] = useState(String(payment.amountMinor / 100));
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('bank_transfer');
  const [paymentMethodCustom, setPaymentMethodCustom] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const amountMinor = toMinorUnits(amount);
      if (amountMinor <= 0 || amountMinor > payment.amountMinor) throw new Error('Enter an amount up to the amount you owe.');
      const proof = file ? await uploadSharedExpenseProof({ spaceId: space.id, referenceId: payment.expenseId || `balance-${payment.toUid}`, file }) : {};
      await submitSharedExpensePayment({ spaceId: space.id, toUid: payment.toUid, expenseId: payment.expenseId, amountMinor, paymentDate, paymentMethod, paymentMethodLabel: paymentMethod === 'other' ? paymentMethodCustom.trim() : undefined, note, ...proof });
      await onSaved();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <form className="form-stack" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    <div className="transaction-preview"><div><span>Amount you owe</span><strong>{formatMoney(payment.amountMinor, space.currency)}</strong></div><small>You can pay part of it. This records a payment between members and does not change a bank account balance.</small></div>
    <label>Amount paid now (BND)<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
    <PaymentMethodField value={paymentMethod} customLabel={paymentMethodCustom} onChange={(value, custom) => { setPaymentMethod(value); setPaymentMethodCustom(custom); }} />
    <label>Payment date<input required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label>
    <label>Proof of payment<input type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /><small>Optional unless this Space requires it.</small></label>
    <label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <button className="button primary full" disabled={busy}>{busy ? 'Sending…' : 'Mark as paid'}</button>
  </form>;
}
