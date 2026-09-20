import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { InviteForm } from '../collaboration/CollaborationPage';
import {
  businessSpaceIdsForAccount,
  listAccounts,
} from '../../repositories/accountRepository';
import {
  listSpaceInvitations,
  listSpaceMembers,
} from '../../repositories/collaborationRepository';
import {
  getSmePosSettings,
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
  Space,
  SpaceInvitation,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

const modeCopy: Record<SmePosMode, { title: string; detail: string; points: string[] }> = {
  standard: {
    title: 'Standard POS',
    detail: 'Sell products owned by your business.',
    points: ['Normal shop stock', 'Simple register', 'Sales and profit reports'],
  },
  marketplace_consignment: {
    title: 'Multi-Seller POS',
    detail: 'Sell your own items or items for other sellers.',
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

export function SmePosSettingsPage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<SmePosSettings | null>(null);
  const [access, setAccess] = useState<SmePosAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirm, setConfirm] = useState<ActionConfirmState<ConfirmPayload> | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  type StaffPosRole =
    Exclude<SmePosRole, 'owner'>;

  function staffRoleFromAccess(
    item: SmePosAccess | undefined,
  ): StaffPosRole {
    switch (item?.role) {
      case 'manager':
      case 'cashier':
      case 'stock_staff':
      case 'seller':
      case 'viewer':
        return item.role;
      default:
        return 'viewer';
    }
  }

  function staffRoleFromValue(
    value: string,
  ): StaffPosRole {
    switch (value) {
      case 'manager':
      case 'cashier':
      case 'stock_staff':
      case 'seller':
      case 'viewer':
        return value;
      default:
        return 'viewer';
    }
  }

  const [
    customRoleEditor,
    setCustomRoleEditor,
  ] = useState<{
    member: SpaceMember;
    name: string;
    baseRole: StaffPosRole;
  } | null>(null);

  const [mode, setMode] = useState<SmePosMode>('standard');
  const [shopName, setShopName] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us.');
  const [defaultPaymentAccountId, setDefaultPaymentAccountId] = useState('');

  const currentMember = members.find((item) => item.uid === user?.uid) || null;
  const isOwner = Boolean(space && user && space.ownerId === user.uid && currentMember?.role === 'owner');
  const eligiblePaymentAccounts = useMemo(() => {
    const legacyIds = new Set(settings?.paymentAccountIds || []);
    return accounts.filter((item) => item.classification === 'business'
      && item.currency === (space?.currency || 'BND')
      && (
        businessSpaceIdsForAccount(item).includes(space?.id || '')
        || (businessSpaceIdsForAccount(item).length === 0 && legacyIds.has(item.id))
      ));
  }, [accounts, settings?.paymentAccountIds, space?.currency, space?.id]);
  const accessByUid = useMemo(() => new Map(access.map((item) => [item.uid, item])), [access]);
  const pendingPosInvitations = useMemo(
    () => invitations.filter((item) => item.status === 'pending' && item.posRole),
    [invitations],
  );

  const load = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    setError('');
    try {
      const [spaces, nextMembers, nextAccounts, nextInvitations] = await Promise.all([
        listSpaces(user.uid),
        listSpaceMembers(spaceId),
        listAccounts(user.uid),
        listSpaceInvitations(spaceId),
      ]);
      const nextSpace = spaces.find((item) => item.id === spaceId) || null;
      setSpace(nextSpace);
      setMembers(nextMembers);
      setAccounts(nextAccounts);
      setInvitations(nextInvitations);
      const owner = Boolean(nextSpace && nextSpace.ownerId === user.uid && nextMembers.find((item) => item.uid === user.uid)?.role === 'owner');
      if (!nextSpace || nextSpace.type !== 'sme' || !owner) return;

      const nextSettings = await getSmePosSettings(spaceId);
      setSettings(nextSettings);
      if (nextSettings) {
        setMode(nextSettings.mode);
        setShopName(nextSettings.shopName);
        setReceiptName(nextSettings.receiptName);
        setReceiptFooter(nextSettings.receiptFooter || '');
        const legacyIds = new Set(nextSettings.paymentAccountIds || []);
        const nextEligibleAccounts = nextAccounts.filter((item) => item.classification === 'business'
          && item.currency === nextSpace.currency
          && (
            businessSpaceIdsForAccount(item).includes(nextSpace.id)
            || (businessSpaceIdsForAccount(item).length === 0 && legacyIds.has(item.id))
          ));
        setDefaultPaymentAccountId(
          nextSettings.defaultPaymentAccountId && nextEligibleAccounts.some((item) => item.id === nextSettings.defaultPaymentAccountId)
            ? nextSettings.defaultPaymentAccountId
            : '',
        );
        setAccess(await listSmePosAccess(spaceId));
      } else {
        setMode('standard');
        setShopName(nextSpace.name);
        setReceiptName(nextSpace.name);
        setReceiptFooter('Thank you for shopping with us.');
        setDefaultPaymentAccountId('');
        setAccess([]);
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
      setError('Restore this Business Space before changing POS settings or staff access.');
      return false;
    }
    if (navigator.onLine) return true;
    setError('Connect to the internet to change POS settings or staff access.');
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
    if (!eligiblePaymentAccounts.length) {
      setError(`Add or edit a business account in Accounts, link it to ${space?.name || 'this Business'} first.`);
      return;
    }
    if (defaultPaymentAccountId && !eligiblePaymentAccounts.some((item) => item.id === defaultPaymentAccountId)) {
      setError('The default payment account must be linked to this Business.');
      return;
    }
    if (!settings || settings.mode === mode || settings.status === 'draft') {
      void runSave();
      return;
    }
    const downgrading = settings.mode === 'marketplace_consignment' && mode === 'standard';
    setConfirm({
      payload: { kind: 'save' },
      title: downgrading ? 'Change to Standard POS?' : 'Upgrade to Multi-Seller POS?',
      description: downgrading
        ? 'BajetBN will only allow this when no seller listing, commission, payout, or Marketplace sale depends on the current mode.'
        : 'Your existing shop products, customers, sales, and settings will stay.',
      note: downgrading
        ? 'The change will be stopped when Marketplace records need protection.'
        : 'Seller and commission tools are added in the Multi-Seller POS phase.',
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
      setSuccess(settings ? 'POS settings updated.' : 'POS setup saved. Review it and activate the register when ready.');
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
        ? 'Staff with POS access will be able to open the register and complete sales.'
        : 'Saved products, customers, and sales stay, but new checkout is blocked until the POS is resumed.',
      note: status === 'active' ? 'Make sure a business payment account is ready for checkout.' : 'You can resume the POS later.',
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

  async function changeRole(
    member: SpaceMember,
    role: StaffPosRole | '',
  ) {
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
        customRoleName: null,
      });
      setSuccess(role ? `${member.displayName || member.email || 'Member'} can now use the POS as ${roleLabels[role]}.` : 'POS access removed.');
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomRole() {
    if (
      !space
      || !customRoleEditor
      || !checkOnline()
    ) {
      return;
    }

    const name =
      customRoleEditor.name.trim();

    if (!name) {
      setError(
        'Enter a name for this custom role.',
      );
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await setSmePosAccessRole({
        spaceId: space.id,
        memberUid:
          customRoleEditor.member.uid,
        role:
          customRoleEditor.baseRole,
        active: true,
        customRoleName: name,
      });

      setSuccess(
        (customRoleEditor.member.displayName
          || customRoleEditor.member.email
          || 'Member')
        + ' now uses the custom role '
        + name
        + '.',
      );

      setCustomRoleEditor(null);
      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    if (!confirm) return;
    if (confirm.payload.kind === 'save') await runSave();
    else await runStatus(confirm.payload.status);
  }

  if (loading) return <main className="page"><div className="loading-panel">Loading POS settings…</div></main>;

  if (!space || space.type !== 'sme') {
    return <main className="page"><PageHeader eyebrow="Business POS" title="Business Space required" description="POS settings are available inside an Business Space." /><Link className="button primary" to="/spaces">Back to Spaces</Link></main>;
  }

  if (!isOwner) {
    return <main className="page">
      <PageHeader eyebrow="Business POS settings" title={space.name} description="Only the Business Space owner can change shop settings and staff POS roles." action={<Link className="button secondary" to={`/spaces/${space.id}/pos`}>Back to POS</Link>} />
      <EmptyState title="Owner access required" description="Ask the Space owner to update the shop setup or your POS role." />
    </main>;
  }

  return <main className="page sme-pos-page">
    <PageHeader eyebrow="Owner settings" title="POS Settings" description={`Shop setup and staff access for ${settings?.shopName || space.name}.`} action={<Link className="button secondary" to={`/spaces/${space.id}/pos`}>Back to POS</Link>} />
    {space.archivedAt && <div className="notice">This Business Space is archived. Restore it before changing POS settings.</div>}
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    <div className="sme-pos-layout">
      <form className="panel form-stack sme-pos-setup" onSubmit={askToSave}>
        <div className="panel-heading"><div><span className="eyebrow">Shop setup</span><h2>{settings ? 'Shop and receipt settings' : 'Choose your POS type'}</h2></div>{settings && <span className={`status-badge ${settings.status === 'active' ? 'posted' : settings.status === 'paused' ? 'needs_attention' : 'pending'}`}>{settings.status === 'active' ? 'Active' : settings.status === 'paused' ? 'Paused' : 'Setup'}</span>}</div>

        <fieldset className="sme-pos-mode-fieldset">
          <legend>How does this shop sell?</legend>
          <div className="sme-pos-mode-grid">
            {(Object.keys(modeCopy) as SmePosMode[]).map((item) => <button key={item} type="button" className={`sme-pos-mode-card ${mode === item ? 'selected' : ''}`} onClick={() => setMode(item)} aria-pressed={mode === item}>
              <span className="sme-pos-mode-icon">{item === 'standard' ? '▣' : '◫'}</span>
              <strong>{modeCopy[item].title}</strong>
              <small>{modeCopy[item].detail}</small>
              <ul>{modeCopy[item].points.map((point) => <li key={point}>{point}</li>)}</ul>
            </button>)}
          </div>
        </fieldset>

        <div className="form-grid">
          <label>Shop name<input value={shopName} onChange={(event) => setShopName(event.target.value)} maxLength={100} required /></label>
          <label>Receipt name<input value={receiptName} onChange={(event) => setReceiptName(event.target.value)} maxLength={100} required /><small>This appears at the top of receipts.</small></label>
          <label className="span-2">Receipt message<textarea value={receiptFooter} onChange={(event) => setReceiptFooter(event.target.value)} rows={3} maxLength={240} placeholder="Thank you for shopping with us." /></label>
          <fieldset className="span-2">
            <legend>Payment accounts</legend>
            <small>All active Business Accounts linked to this Business are available here. Managers and cashiers cannot attach another account.</small>
            <div className="form-stack compact">
              {eligiblePaymentAccounts.map((account) => <div key={account.id}>
                <strong>{account.name}</strong> · {account.type.replace('_', ' ')} · {account.currency}
                {!account.spaceId && <small>Legacy setup · link this account to {space.name} from Accounts.</small>}
              </div>)}
              {!eligiblePaymentAccounts.length && <small>No payment account is linked to this Business yet.</small>}
            </div>
            <Link className="text-button" to="/accounts">Manage business accounts →</Link>
          </fieldset>
          <label className="span-2">Default payment account<select value={defaultPaymentAccountId} onChange={(event) => setDefaultPaymentAccountId(event.target.value)}><option value="">Choose during checkout</option>{eligiblePaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select><small>Optional. The account must be linked to {space.name}.</small></label>
        </div>

        {!eligiblePaymentAccounts.length && <div className="notice">No payment account is linked to {space.name}. Open Accounts and link a Business Account to this Business.</div>}
        <div className="button-row">
          <button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : settings ? 'Save POS settings' : 'Save POS setup'}</button>
          {settings?.status === 'draft' && <button className="button secondary" type="button" disabled={busy} onClick={() => askStatus('active')}>Activate POS</button>}
          {settings?.status === 'active' && <button className="button secondary" type="button" disabled={busy} onClick={() => askStatus('paused')}>Pause POS</button>}
          {settings?.status === 'paused' && <button className="button secondary" type="button" disabled={busy} onClick={() => askStatus('active')}>Resume POS</button>}
        </div>
      </form>

      <section className="panel sme-pos-roadmap-panel">
        <div className="panel-heading"><div><span className="eyebrow">Daily staff flow</span><h2>How staff use the POS</h2></div></div>
        <div className="sme-pos-module-list">
          <div><span>1</span><div><strong>Sign in</strong><small>Each staff member uses their own BajetBN account.</small></div><em>Required</em></div>
          <div><span>2</span><div><strong>Open Register</strong><small>Cashiers search products, build the cart, and choose the customer.</small></div><em>Daily</em></div>
          <div><span>3</span><div><strong>Take payment</strong><small>Select the payment method and complete the sale.</small></div><em>Daily</em></div>
          <div><span>4</span><div><strong>Issue receipt</strong><small>Print the receipt after the sale is saved once.</small></div><em>Daily</em></div>
        </div>
      </section>
    </div>

    {settings && <section className="panel sme-pos-access-panel">
      <div className="panel-heading"><div><span className="eyebrow">People & access</span><h2>Shop team</h2></div><div className="button-row"><span>{access.length} active</span><button className="button primary" type="button" disabled={busy || Boolean(space.archivedAt)} onClick={() => setInviteOpen(true)}>+ Invite person</button></div></div>
      <p>This uses the same Business invitation as the Members page. Choose the person's business role once; BajetBN applies their Space membership and POS access together.</p>
      <div className="sme-pos-access-list">
        {members.filter((member) => (member.status || 'active') === 'active').map((member) => {
          const currentAccess =
            accessByUid.get(member.uid);

          const current =
            member.uid === space.ownerId
              ? 'owner'
              : currentAccess?.customRoleName
                ? 'custom'
                : currentAccess?.role
                  || '';

          return (
            <div
              className="sme-pos-access-row"
              key={member.uid}
            >
              <div>
                <strong>
                  {member.displayName
                    || member.email
                    || 'Space member'}
                </strong>

                <small>
                  {currentAccess?.customRoleName
                    ? currentAccess.customRoleName
                      + ' · '
                      + roleLabels[
                        currentAccess.role
                      ]
                    : member.email
                      || member.role}
                </small>
              </div>

              {member.uid === space.ownerId ? (
                <span className="type-badge">
                  POS owner
                </span>
              ) : (
                <label>
                  <span className="sr-only">
                    POS role
                  </span>

                  <select
                    value={current}
                    disabled={busy}
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      if (value === 'custom') {
                        setCustomRoleEditor({
                          member,
                          name:
                            currentAccess
                              ?.customRoleName
                            || '',
                          baseRole:
                            staffRoleFromAccess(
                              currentAccess,
                            ),
                        });
                        return;
                      }

                      void changeRole(
                        member,
                        value
                          ? staffRoleFromValue(
                              value,
                            )
                          : '',
                      );
                    }}
                  >
                    <option value="">
                      No POS access
                    </option>
                    <option value="manager">
                      Manager
                    </option>
                    <option value="cashier">
                      Cashier
                    </option>
                    <option value="stock_staff">
                      Stock staff
                    </option>
                    {settings.mode === 'marketplace_consignment' && <option value="seller">Seller</option>}
                    <option value="viewer">
                      View only
                    </option>
                    <option value="custom">
                      Custom role…
                    </option>
                  </select>
                </label>
              )}
            </div>
          );
        })}
        {pendingPosInvitations.map((invitation) => <div className="sme-pos-access-row" key={invitation.id}>
          <div><strong>{invitation.email || 'WhatsApp / secure link invite'}</strong><small>Waiting for this person to join</small></div>
          <span className="type-badge">{roleLabels[invitation.posRole!]} · Invite pending</span>
        </div>)}
      </div>
      {settings.mode === 'standard' && <div className="notice">Seller access appears after upgrading this shop to Multi-Seller POS.</div>}
    </section>}

    {confirm && <ActionConfirmModal state={confirm} busy={busy} error={error} onClose={() => { setConfirm(null); setError(''); }} onConfirm={() => void confirmAction()} />}

    {customRoleEditor && (
      <Modal
        title="Custom business role"
        onClose={() => {
          if (!busy) {
            setCustomRoleEditor(null);
            setError('');
          }
        }}
      >
        <div
          className="form-stack custom-business-role-editor"
          data-custom-business-role-editor
        >
          <p>
            Give this role your own name, then choose
            the secure access template it should use.
            BajetBN still enforces the selected template
            on the server.
          </p>

          {error && (
            <div className="notice error">
              {error}
            </div>
          )}

          <label>
            Role name
            <input
              value={customRoleEditor.name}
              maxLength={60}
              placeholder="Example: Senior Cashier"
              onChange={(event) =>
                setCustomRoleEditor(
                  (current) =>
                    current
                      ? {
                          ...current,
                          name:
                            event.target.value,
                        }
                      : current,
                )}
            />
          </label>

          <label>
            Access template
            <select
              value={
                customRoleEditor.baseRole
              }
              onChange={(event) =>
                setCustomRoleEditor(
                  (current) =>
                    current
                      ? {
                          ...current,
                          baseRole:
                            staffRoleFromValue(
                              event.target.value,
                            ),
                        }
                      : current,
                )}
            >
              <option value="manager">
                Manager
              </option>
              <option value="cashier">
                Cashier
              </option>
              <option value="stock_staff">
                Stock staff
              </option>
              {settings?.mode
                === 'marketplace_consignment'
                && (
                  <option value="seller">
                    Seller
                  </option>
                )}
              <option value="viewer">
                View only
              </option>
            </select>

            <small>
              The template controls the real permissions.
              The custom name changes how the role appears
              in this Business.
            </small>
          </label>

          <div className="button-row">
            <button
              className="button primary"
              type="button"
              disabled={
                busy
                || !customRoleEditor.name.trim()
              }
              onClick={() =>
                void saveCustomRole()}
            >
              {busy
                ? 'Saving…'
                : 'Save custom role'}
            </button>

            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                setCustomRoleEditor(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    )}

    {inviteOpen && settings && <Modal title={`Invite person to ${space.name}`} onClose={() => setInviteOpen(false)}><InviteForm space={space} canAssignPosRole defaultPosRole="cashier" onSaved={async () => { setInviteOpen(false); await load(); }} /></Modal>}
  </main>;
}
