import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listSpaceMembers } from '../../repositories/collaborationRepository';
import {
  getMySmePosAccess,
  getSmePosSettings,
  getSmePosUsageCounts,
  listSmePosAccess,
  saveSmePosSetup,
  setSmePosAccessRole,
  setSmePosStatus,
} from '../../repositories/smePosRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  Account,
  SmePosAccess,
  SmePosMode,
  SmePosRole,
  SmePosSettings,
  SmePosUsageCounts,
  Space,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

const emptyCounts: SmePosUsageCounts = { products: 0, customers: 0, sellers: 0, listings: 0, sales: 0 };

const modeCopy: Record<SmePosMode, { title: string; detail: string; points: string[] }> = {
  standard: {
    title: 'Standard POS',
    detail: 'Sell products owned by your business.',
    points: ['Normal shop stock', 'Simple checkout', 'Sales and profit reports'],
  },
  marketplace_consignment: {
    title: 'Marketplace Consignment POS',
    detail: 'Sell products owned by different independent sellers.',
    points: ['Seller-linked stock', 'Automatic commission split', 'Seller balances and payouts'],
  },
};

const roleLabels: Record<SmePosRole, string> = {
  owner: 'POS owner',
  manager: 'Manager',
  cashier: 'Cashier',
  stock_staff: 'Stock staff',
  seller: 'Seller',
  viewer: 'View only',
};

type ConfirmPayload =
  | { kind: 'save' }
  | { kind: 'status'; status: 'active' | 'paused' };

export function SmePosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { spaceId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<SmePosSettings | null>(null);
  const [access, setAccess] = useState<SmePosAccess[]>([]);
  const [myAccess, setMyAccess] = useState<SmePosAccess | null>(null);
  const [counts, setCounts] = useState<SmePosUsageCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [confirm, setConfirm] = useState<ActionConfirmState<ConfirmPayload> | null>(null);

  const [mode, setMode] = useState<SmePosMode>('standard');
  const [shopName, setShopName] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us.');
  const [defaultPaymentAccountId, setDefaultPaymentAccountId] = useState('');

  const currentMember = members.find((item) => item.uid === user?.uid) || null;
  const isOwner = Boolean(space && user && space.ownerId === user.uid && currentMember?.role === 'owner');
  const canManageAccess = isOwner;
  const canUsePos = isOwner || myAccess?.status === 'active';

  const businessAccounts = useMemo(
    () => accounts.filter((item) => item.classification === 'business' && item.currency === (space?.currency || 'BND')),
    [accounts, space?.currency],
  );

  const accessByUid = useMemo(() => new Map(access.map((item) => [item.uid, item])), [access]);

  const load = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    setError('');
    setAccessDenied(false);
    try {
      const [spaces, nextMembers, nextAccounts] = await Promise.all([
        listSpaces(user.uid),
        listSpaceMembers(spaceId),
        listAccounts(user.uid),
      ]);
      const nextSpace = spaces.find((item) => item.id === spaceId) || null;
      setSpace(nextSpace);
      setMembers(nextMembers);
      setAccounts(nextAccounts);
      if (!nextSpace || nextSpace.type !== 'sme') return;

      const owner = nextSpace.ownerId === user.uid && nextMembers.find((item) => item.uid === user.uid)?.role === 'owner';
      let nextSettings: SmePosSettings | null = null;
      try {
        nextSettings = await getSmePosSettings(spaceId);
      } catch (nextError) {
        if (!owner) {
          setAccessDenied(true);
          setSettings(null);
          setAccess([]);
          setMyAccess(null);
          setCounts(emptyCounts);
          return;
        }
        throw nextError;
      }

      setSettings(nextSettings);
      if (nextSettings) {
        setMode(nextSettings.mode);
        setShopName(nextSettings.shopName);
        setReceiptName(nextSettings.receiptName);
        setReceiptFooter(nextSettings.receiptFooter || '');
        setDefaultPaymentAccountId(nextSettings.defaultPaymentAccountId || '');

        const [nextCounts, nextMyAccess] = await Promise.all([
          getSmePosUsageCounts(spaceId),
          getMySmePosAccess(spaceId, user.uid).catch(() => null),
        ]);
        setCounts(nextCounts);
        setMyAccess(nextMyAccess);
        if (owner) setAccess(await listSmePosAccess(spaceId));
        else setAccess(nextMyAccess ? [nextMyAccess] : []);
      } else {
        setMode('standard');
        setShopName(nextSpace.name);
        setReceiptName(nextSpace.name);
        setReceiptFooter('Thank you for shopping with us.');
        setDefaultPaymentAccountId('');
        setCounts(emptyCounts);
        setAccess([]);
        setMyAccess(null);
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => { void load(); }, [load]);

  function checkOnline() {
    if (space?.archivedAt) {
      setError('Restore this SME Space before changing POS setup or access.');
      return false;
    }
    if (navigator.onLine) return true;
    setError('Connect to the internet to change POS setup or access.');
    return false;
  }

  function askToSave(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!shopName.trim() || !receiptName.trim()) {
      setError('Shop name and receipt name are required.');
      return;
    }
    if (!settings || settings.mode === mode || settings.status === 'draft') {
      void runSave();
      return;
    }

    const downgrading = settings.mode === 'marketplace_consignment' && mode === 'standard';
    setConfirm({
      payload: { kind: 'save' },
      title: downgrading ? 'Change to Standard POS?' : 'Upgrade to Marketplace POS?',
      description: downgrading
        ? 'BajetBN will only allow this when there are no seller listings or saved sales that depend on Marketplace mode.'
        : 'Your existing shop setup and history will stay. Marketplace seller and commission tools can then be added.',
      note: downgrading
        ? 'If Marketplace records already exist, BajetBN will stop the change to protect your history.'
        : 'This does not create seller listings automatically.',
      confirmLabel: downgrading ? 'Check and change mode' : 'Upgrade POS mode',
    });
  }

  async function runSave() {
    if (!space || !checkOnline()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await saveSmePosSetup({
        spaceId: space.id,
        mode,
        shopName,
        receiptName,
        receiptFooter,
        defaultPaymentAccountId: defaultPaymentAccountId || null,
      });
      setConfirm(null);
      setSuccess(settings ? 'POS setup updated.' : 'POS setup saved. You can review it before activating checkout.');
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function askStatus(status: 'active' | 'paused') {
    setError('');
    setSuccess('');
    setConfirm({
      payload: { kind: 'status', status },
      title: status === 'active' ? (settings?.status === 'paused' ? 'Resume this POS?' : 'Activate this POS?') : 'Pause this POS?',
      description: status === 'active'
        ? 'The POS will be marked ready for shop use. Checkout and stock features will be added in the next POS steps.'
        : 'The setup and saved history will stay, but the POS will be marked unavailable for normal selling.',
      note: status === 'active' ? 'This foundation release does not yet process live checkout sales.' : 'You can resume it later.',
      confirmLabel: status === 'active' ? (settings?.status === 'paused' ? 'Resume POS' : 'Activate POS') : 'Pause POS',
    });
  }

  async function runStatus(status: 'active' | 'paused') {
    if (!space || !checkOnline()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await setSmePosStatus(space.id, status);
      setConfirm(null);
      setSuccess(status === 'active' ? 'POS is active.' : 'POS is paused.');
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: SpaceMember, role: Exclude<SmePosRole, 'owner'> | '') {
    if (!space || !checkOnline()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await setSmePosAccessRole({
        spaceId: space.id,
        memberUid: member.uid,
        role: role || 'viewer',
        active: Boolean(role),
      });
      setSuccess(role ? `${member.displayName || member.email || 'Member'} can now use the POS as ${roleLabels[role]}.` : 'POS access removed.');
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    if (!confirm) return;
    if (confirm.payload.kind === 'save') await runSave();
    else await runStatus(confirm.payload.status);
  }

  if (loading) return <main className="page"><div className="loading-panel">Loading SME POS…</div></main>;

  if (!space || space.type !== 'sme') {
    return <main className="page">
      <PageHeader eyebrow="SME POS" title="SME Space required" description="Point of sale is available inside an SME Space." />
      {error && <div className="notice error">{error}</div>}
      <Link className="button primary" to="/spaces">Back to Spaces</Link>
    </main>;
  }

  if (accessDenied || (!isOwner && !settings)) {
    return <main className="page">
      <PageHeader eyebrow="SME POS" title={space.name} description="Your Space owner has not added POS access for your account." action={<Link className="button secondary" to={`/spaces/${space.id}`}>Back to Space</Link>} />
      <EmptyState title="No POS access yet" description="Ask the Space owner to add you as a manager, cashier, stock staff, seller, or view-only user." />
    </main>;
  }

  return <main className="page sme-pos-page">
    <PageHeader
      eyebrow="SME Space · Point of sale"
      title={settings?.shopName || space.name}
      description="Choose how your shop sells, prepare staff access, and keep the POS connected to this SME Space."
      action={<Link className="button secondary" to={`/spaces/${space.id}`}>Back to Space</Link>}
    />

    {space.archivedAt && <div className="notice">This SME Space is archived. Restore it before changing POS setup or access.</div>}
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    {settings && canUsePos && <section className="summary-grid sme-pos-summary">
      <article className="summary-card featured"><span>POS mode</span><strong>{modeCopy[settings.mode].title}</strong><small>{settings.status === 'active' ? 'Ready for shop use' : settings.status === 'paused' ? 'Paused' : 'Setup in progress'}</small></article>
      <article className="summary-card"><span>Products</span><strong>{counts.products}</strong><small>Product setup comes in the Standard POS step</small></article>
      <article className="summary-card"><span>Customers</span><strong>{counts.customers}</strong><small>Customer records prepared for the next POS step</small></article>
      <article className="summary-card"><span>{settings.mode === 'marketplace_consignment' ? 'Sellers' : 'POS users'}</span><strong>{settings.mode === 'marketplace_consignment' ? counts.sellers : access.length}</strong><small>{settings.mode === 'marketplace_consignment' ? 'Independent seller setup comes next' : 'People with active POS access'}</small></article>
    </section>}

    {isOwner ? <div className="sme-pos-layout">
      <form className="panel form-stack sme-pos-setup" onSubmit={askToSave}>
        <div className="panel-heading"><div><span className="eyebrow">POS setup</span><h2>{settings ? 'Shop and POS settings' : 'Choose your POS type'}</h2></div>{settings && <span className={`status-badge ${settings.status === 'active' ? 'posted' : settings.status === 'paused' ? 'needs_attention' : 'pending'}`}>{settings.status === 'active' ? 'Active' : settings.status === 'paused' ? 'Paused' : 'Setup'}</span>}</div>

        <fieldset className="sme-pos-mode-fieldset">
          <legend>How does this shop sell?</legend>
          <div className="sme-pos-mode-grid">
            {(Object.keys(modeCopy) as SmePosMode[]).map((item) => <button
              key={item}
              type="button"
              className={`sme-pos-mode-card ${mode === item ? 'selected' : ''}`}
              onClick={() => setMode(item)}
              aria-pressed={mode === item}
            >
              <span className="sme-pos-mode-icon">{item === 'standard' ? '▣' : '◫'}</span>
              <strong>{modeCopy[item].title}</strong>
              <small>{modeCopy[item].detail}</small>
              <ul>{modeCopy[item].points.map((point) => <li key={point}>{point}</li>)}</ul>
            </button>)}
          </div>
        </fieldset>

        <div className="form-grid">
          <label>Shop name<input value={shopName} onChange={(event) => setShopName(event.target.value)} maxLength={100} required /></label>
          <label>Receipt name<input value={receiptName} onChange={(event) => setReceiptName(event.target.value)} maxLength={100} required /><small>This appears at the top of future POS receipts.</small></label>
          <label className="span-2">Receipt message<textarea value={receiptFooter} onChange={(event) => setReceiptFooter(event.target.value)} rows={3} maxLength={240} placeholder="Thank you for shopping with us." /></label>
          <label className="span-2">Default payment account<select value={defaultPaymentAccountId} onChange={(event) => setDefaultPaymentAccountId(event.target.value)}><option value="">Choose during checkout</option>{businessAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select><small>Only active business accounts in {space.currency} are shown.</small></label>
        </div>

        {!businessAccounts.length && <div className="notice">No active business account is available. You may save the setup now and choose an account later.</div>}
        <div className="button-row">
          <button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : settings ? 'Save POS settings' : 'Save POS setup'}</button>
          {settings?.status === 'draft' && <button className="button secondary" type="button" disabled={busy} onClick={() => askStatus('active')}>Activate POS</button>}
          {settings?.status === 'active' && <button className="button secondary" type="button" disabled={busy} onClick={() => askStatus('paused')}>Pause POS</button>}
          {settings?.status === 'paused' && <button className="button secondary" type="button" disabled={busy} onClick={() => askStatus('active')}>Resume POS</button>}
        </div>
      </form>

      <section className="panel sme-pos-roadmap-panel">
        <div className="panel-heading"><div><span className="eyebrow">What this foundation prepares</span><h2>Shop modules</h2></div></div>
        <div className="sme-pos-module-list">
          <div><span>▣</span><div><strong>Products and stock</strong><small>Own-stock products for Standard POS, with seller-linked batches for Marketplace POS.</small></div><em>Next</em></div>
          <div><span>◎</span><div><strong>Customers</strong><small>Simple customer records linked to future sales and receipts.</small></div><em>Next</em></div>
          <div><span>↔</span><div><strong>Checkout</strong><small>One simple staff checkout with payment account selection.</small></div><em>Next</em></div>
          <div><span>⌁</span><div><strong>Reports</strong><small>Daily sales, stock, profit, seller balance, commission and payout reports.</small></div><em>Planned</em></div>
        </div>
      </section>
    </div> : settings && <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Your POS access</span><h2>{myAccess ? roleLabels[myAccess.role] : 'Space member'}</h2></div></div>
      <p>The Space owner controls shop settings and POS roles. Your available checkout, stock, seller, and report tools will follow this role.</p>
    </section>}

    {settings && canManageAccess && <section className="panel sme-pos-access-panel">
      <div className="panel-heading"><div><span className="eyebrow">Shop team</span><h2>POS access</h2></div><span>{access.length} active</span></div>
      <p>POS roles are separate from general Space roles. Add only the access each person needs.</p>
      <div className="sme-pos-access-list">
        {members.filter((member) => (member.status || 'active') === 'active').map((member) => {
          const current = member.uid === space.ownerId ? 'owner' : accessByUid.get(member.uid)?.role || '';
          return <div className="sme-pos-access-row" key={member.uid}>
            <div><strong>{member.displayName || member.email || 'Space member'}</strong><small>{member.email || member.role}</small></div>
            {member.uid === space.ownerId ? <span className="type-badge">POS owner</span> : <label><span className="sr-only">POS role</span><select value={current} disabled={busy} onChange={(event) => void changeRole(member, event.target.value as Exclude<SmePosRole, 'owner'> | '')}><option value="">No POS access</option><option value="manager">Manager</option><option value="cashier">Cashier</option><option value="stock_staff">Stock staff</option>{settings.mode === 'marketplace_consignment' && <option value="seller">Seller</option>}<option value="viewer">View only</option></select></label>}
          </div>;
        })}
      </div>
      {settings.mode === 'standard' && <div className="notice">Seller access appears after upgrading this shop to Marketplace Consignment POS.</div>}
    </section>}

    {confirm && <ActionConfirmModal state={confirm} busy={busy} error={error} onClose={() => { setConfirm(null); setError(''); }} onConfirm={() => void confirmAction()} />}
  </main>;
}
