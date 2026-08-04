import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listSpaceMembers } from '../../repositories/collaborationRepository';
import { getMySmePosAccess, getSmePosSettings } from '../../repositories/smePosRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { SmePosAccess, SmePosRole, SmePosSettings, Space, SpaceMember } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { StandardPosWorkspace } from './StandardPosWorkspace';

const roleLabels: Record<SmePosRole, string> = {
  owner: 'POS owner',
  manager: 'Manager',
  cashier: 'Cashier',
  stock_staff: 'Stock staff',
  seller: 'Seller',
  viewer: 'View only',
};

export function SmePosPage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [settings, setSettings] = useState<SmePosSettings | null>(null);
  const [myAccess, setMyAccess] = useState<SmePosAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  const currentMember = useMemo(
    () => members.find((item) => item.uid === user?.uid) || null,
    [members, user?.uid],
  );
  const isOwner = Boolean(space && user && space.ownerId === user.uid && currentMember?.role === 'owner');
  const role: SmePosRole | null = isOwner ? 'owner' : myAccess?.status === 'active' ? myAccess.role : null;

  const load = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    setError('');
    setAccessDenied(false);
    try {
      const [spaces, nextMembers] = await Promise.all([
        listSpaces(user.uid),
        listSpaceMembers(spaceId),
      ]);
      const nextSpace = spaces.find((item) => item.id === spaceId) || null;
      setSpace(nextSpace);
      setMembers(nextMembers);
      if (!nextSpace || nextSpace.type !== 'sme') return;

      const owner = nextSpace.ownerId === user.uid && nextMembers.find((item) => item.uid === user.uid)?.role === 'owner';
      let nextSettings: SmePosSettings | null = null;
      try {
        nextSettings = await getSmePosSettings(spaceId);
      } catch (nextError) {
        if (!owner) {
          setAccessDenied(true);
          setSettings(null);
          setMyAccess(null);
          return;
        }
        throw nextError;
      }
      setSettings(nextSettings);
      if (!nextSettings) {
        setMyAccess(null);
        return;
      }
      if (owner) {
        setMyAccess(null);
      } else {
        const nextAccess = await getMySmePosAccess(spaceId, user.uid).catch(() => null);
        setMyAccess(nextAccess);
        if (!nextAccess || nextAccess.status !== 'active') setAccessDenied(true);
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <main className="page"><div className="loading-panel">Loading SME POS…</div></main>;

  if (!space || space.type !== 'sme') {
    return <main className="page">
      <PageHeader eyebrow="SME POS" title="SME Space required" description="Point of sale is available inside an SME Space." />
      {error && <div className="notice error">{error}</div>}
      <Link className="button primary" to="/spaces">Back to Spaces</Link>
    </main>;
  }

  if (!settings && isOwner) {
    return <main className="page sme-pos-page">
      <PageHeader
        eyebrow="SME Space · Point of sale"
        title={space.name}
        description="Set up the shop before staff can open the register."
        action={<Link className="button secondary" to={`/spaces/${space.id}`}>Back to Space</Link>}
      />
      {error && <div className="notice error">{error}</div>}
      <EmptyState
        title="POS setup is not finished"
        description="Choose Standard POS or Marketplace Consignment POS, add the shop details, and activate the register."
        action={<Link className="button primary" to={`/spaces/${space.id}/pos/settings`}>Set up POS</Link>}
      />
    </main>;
  }

  if (accessDenied || !settings || !role) {
    return <main className="page">
      <PageHeader eyebrow="SME POS" title={space.name} description="Your Space owner has not added POS access for your account." action={<Link className="button secondary" to={`/spaces/${space.id}`}>Back to Space</Link>} />
      {error && <div className="notice error">{error}</div>}
      <EmptyState title="No POS access yet" description="Ask the Space owner to add you as a manager, cashier, stock staff, seller, or view-only user." />
    </main>;
  }

  const headerActions = <div className="button-row pos-page-actions">
    {isOwner && <Link className="button secondary" to={`/spaces/${space.id}/pos/settings`}>POS Settings</Link>}
    <Link className="button secondary" to={`/spaces/${space.id}`}>Back to Space</Link>
  </div>;

  return <main className="page sme-pos-page">
    <PageHeader
      eyebrow={`SME Space · ${roleLabels[role]}`}
      title={settings.shopName || space.name}
      description={role === 'cashier' ? 'Open the register, add products to the cart, take payment, and issue the receipt.' : role === 'stock_staff' ? 'Manage shop products, available quantities, and low-stock alerts.' : 'Use the shop tools allowed for your POS role.'}
      action={headerActions}
    />

    {space.archivedAt && <div className="notice">This SME Space is archived. Restore it before using the POS.</div>}
    {error && <div className="notice error">{error}</div>}
    <div className="pos-status-strip">
      <span className={`status-badge ${settings.status === 'active' ? 'posted' : settings.status === 'paused' ? 'needs_attention' : 'pending'}`}>{settings.status === 'active' ? 'Active' : settings.status === 'paused' ? 'Paused' : 'Setup'}</span>
      <span>{roleLabels[role]}</span>
      {settings.status !== 'active' && isOwner && <Link to={`/spaces/${space.id}/pos/settings`}>Open settings</Link>}
    </div>

    <StandardPosWorkspace
      space={space}
      settings={settings}
      role={role}
      onChanged={load}
    />
  </main>;
}
