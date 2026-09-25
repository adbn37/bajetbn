import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getSpaceCommitmentWorkspace } from '../../repositories/commitmentRepository';
import {
  listMyAdbnCustomerLinks,
  type AdbnCustomerLink,
} from '../../repositories/adbnCustomerLinkRepository';
import { getSpace } from '../../repositories/spaceRepository';
import type { Commitment, CommitmentPayment, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

function outstandingMinor(item: Commitment) {
  if (item.totalAmountMinor != null) {
    return Math.max(0, item.totalAmountMinor - item.amountPaidMinor);
  }
  if (item.status !== 'active') return 0;
  return Math.max(0, item.amountMinor - item.amountPaidMinor);
}

function displayDate(value?: string | null) {
  if (!value) return 'No due date';
  const parsed = new Date(value + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-BN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(parsed);
}

export function AdbnCustomerSpacePage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [link, setLink] = useState<AdbnCustomerLink | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [payments, setPayments] = useState<CommitmentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user || !spaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [nextSpace, links, billing] = await Promise.all([
        getSpace(spaceId),
        listMyAdbnCustomerLinks(),
        getSpaceCommitmentWorkspace(spaceId),
      ]);
      setSpace(nextSpace);
      setLink(
        links.find((item) => item.status === 'accepted' && item.targetSpaceId === spaceId)
        || null,
      );
      setCommitments(
        billing.commitments.filter(
          (item) => item.externalIntegrationProvider === 'adbn_tech'
            && item.externalIntegrationMirrorStatus !== 'stale',
        ),
      );
      setPayments(
        billing.payments.filter(
          (item) => item.externalIntegrationProvider === 'adbn_tech'
            && item.externalIntegrationMirrorStatus !== 'stale'
            && item.status === 'posted',
        ),
      );
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => { void load(); }, [load]);

  const activeCommitments = useMemo(
    () => commitments
      .filter((item) => item.status === 'active')
      .sort((a, b) => String(a.nextDueDate || '9999-12-31')
        .localeCompare(String(b.nextDueDate || '9999-12-31'))),
    [commitments],
  );

  const nextCommitment = activeCommitments[0] || null;
  const remainingMinor = commitments.reduce((sum, item) => sum + outstandingMinor(item), 0);
  const totalMinor = commitments.reduce(
    (sum, item) => sum + (item.totalAmountMinor ?? item.amountMinor), 0,
  );
  const paidMinor = commitments.reduce((sum, item) => sum + Math.max(0, item.amountPaidMinor), 0);
  const progressPercent = totalMinor > 0
    ? Math.max(0, Math.min(100, Math.round(paidMinor / totalMinor * 100)))
    : 0;

  if (loading) {
    return <main className="page"><div className="loading-panel">Loading ADBN TECH Space…</div></main>;
  }

  const validSpace = Boolean(
    space && user && space.ownerId === user.uid && space.type === 'custom'
    && space.externalIntegrationProvider === 'adbn_tech'
    && space.externalIntegrationRole === 'customer',
  );

  if (!validSpace) {
    return <main className="page">
      <PageHeader eyebrow="ADBN TECH" title="ADBN TECH Space unavailable" description="This Space is not linked to your ADBN TECH customer account." />
      {error && <div className="notice error">{error}</div>}
      <Link className="button primary" to="/adbn-links">Customer links</Link>
    </main>;
  }

  const nextAmount = nextCommitment
    ? Math.min(nextCommitment.amountMinor, outstandingMinor(nextCommitment) || nextCommitment.amountMinor)
    : 0;

  return <main className="page" data-adbn-customer-space>
    <PageHeader
      eyebrow="ADBN TECH"
      title="ADBN TECH"
      description="Your private ADBN TECH customer portal in BajetBN."
      action={<Link className="button secondary" to="/adbn-links">Customer link</Link>}
    />

    <div className="info-banner">
      <strong>Separate from your Personal money.</strong>
      <span>ADBN TECH is the source of truth for these billing records. Your other BajetBN Spaces, bank accounts, balances and transactions remain private.</span>
    </div>

    {error && <div className="notice error">{error}</div>}

    <div className="summary-grid">
      <article className="summary-card featured">
        <span>Next payment</span>
        <strong>{nextCommitment ? formatMoney(nextAmount, nextCommitment.currency) : '—'}</strong>
        <small>{nextCommitment ? 'Due ' + displayDate(nextCommitment.nextDueDate) : commitments.length ? 'No payment currently due' : 'Waiting for ADBN billing sync'}</small>
      </article>
      <article className="summary-card">
        <span>Remaining balance</span>
        <strong>{formatMoney(remainingMinor, space?.currency || 'BND')}</strong>
        <small>Across synced ADBN billing records</small>
      </article>
      <article className="summary-card">
        <span>Payment progress</span>
        <strong>{commitments.length ? progressPercent + '%' : '—'}</strong>
        <small>{commitments.length ? formatMoney(paidMinor, space?.currency || 'BND') + ' recorded as paid' : 'Billing has not been synced yet'}</small>
      </article>
    </div>

    {commitments.length === 0 ? (
      <section className="panel" data-adbn-customer-space-billing-placeholder>
        <span className="eyebrow">Monthly payments</span>
        <h2>Your ADBN TECH Space is ready</h2>
        <p className="muted">Your customer link is active. ADBN TECH billing has not been mirrored into BajetBN yet.</p>
      </section>
    ) : <>
      <section className="panel" data-adbn-customer-billing-plans>
        <div className="panel-heading">
          <div><span className="eyebrow">Bills & instalments</span><h2>ADBN TECH payments</h2></div>
          <Link className="button secondary" to="/bills">Open all Bills & Instalments</Link>
        </div>
        <div className="business-contact-list">
          {commitments.map((item) => {
            const remaining = outstandingMinor(item);
            return <article className="business-contact-card" key={item.id} data-adbn-customer-billing-record>
              <div>
                <small>{item.externalIntegrationSourceNo || (item.type === 'instalment' ? 'Monthly plan' : 'ADBN bill')}</small>
                <h3>{item.name}</h3>
                <p>{item.type === 'instalment' ? 'Monthly ' + formatMoney(item.amountMinor, item.currency) : 'Amount ' + formatMoney(item.amountMinor, item.currency)}</p>
                <span className="status-pill">{item.status === 'completed' ? 'Paid' : item.nextDueDate ? 'Due ' + displayDate(item.nextDueDate) : 'Active'}</span>
              </div>
              <div><strong>{formatMoney(remaining, item.currency)}</strong><small> remaining</small></div>
            </article>;
          })}
        </div>
      </section>

      <section className="panel" data-adbn-customer-payment-history>
        <div className="panel-heading"><div><span className="eyebrow">Payment history</span><h2>Recent ADBN payments</h2></div></div>
        {payments.length > 0 ? <div className="business-contact-list">
          {payments.slice(0, 10).map((payment) => <article className="business-contact-card" key={payment.id}>
            <div><small>{payment.externalIntegrationSourceNo || 'ADBN payment'}</small><h3>{displayDate(payment.paymentDate)}</h3><p>{payment.paymentMethodLabel || 'Payment'}</p></div>
            <strong>{formatMoney(payment.amountMinor, payment.currency)}</strong>
          </article>)}
        </div> : <div className="mini-empty"><h3>No payment history yet</h3><p>Confirmed ADBN payments will appear here after billing sync.</p></div>}
      </section>
    </>}

    <section className="panel">
      <span className="eyebrow">Notifications</span>
      <h2>Due reminders use BajetBN</h2>
      <p className="muted">Active ADBN bills and instalments use BajetBN's existing due-soon, due-today and overdue reminder system. Reminder delivery follows your BajetBN notification settings.</p>
    </section>
  </main>;
}
