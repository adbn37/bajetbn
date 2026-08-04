import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getMySmePosAccess, getSmePosSettings, listSmePosCustomers, listSmePosProducts, setSmePosCustomerArchived, setSmePosProductArchived } from '../../repositories/smePosRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { SmePosCustomer, SmePosProduct, SmePosRole, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

export function SmePosArchivedRecordsPage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [products, setProducts] = useState<SmePosProduct[]>([]);
  const [customers, setCustomers] = useState<SmePosCustomer[]>([]);
  const [role, setRole] = useState<SmePosRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    setError('');
    try {
      const spaces = await listSpaces(user.uid);
      const nextSpace = spaces.find((item) => item.id === spaceId) || null;
      setSpace(nextSpace);
      if (!nextSpace || nextSpace.type !== 'sme') return;
      const settings = await getSmePosSettings(spaceId);
      if (!settings) return;
      const owner = nextSpace.ownerId === user.uid;
      const access = owner ? null : await getMySmePosAccess(spaceId, user.uid).catch(() => null);
      const nextRole: SmePosRole | null = owner ? 'owner' : access?.status === 'active' ? access.role : null;
      setRole(nextRole);
      const canReadProducts = nextRole === 'owner' || nextRole === 'manager';
      const canReadCustomers = nextRole === 'owner' || nextRole === 'manager';
      if (!canReadProducts && !canReadCustomers) {
        setProducts([]);
        setCustomers([]);
        return;
      }
      const [allProducts, allCustomers] = await Promise.all([
        canReadProducts ? listSmePosProducts(spaceId, true) : Promise.resolve([]),
        canReadCustomers ? listSmePosCustomers(spaceId, true) : Promise.resolve([]),
      ]);
      setProducts(allProducts.filter((item) => Boolean(item.archivedAt)));
      setCustomers(allCustomers.filter((item) => Boolean(item.archivedAt)));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => { void load(); }, [load]);

  async function restore(kind: 'product' | 'customer', id: string) {
    if (!navigator.onLine) { setError('Connect to the internet to restore POS records.'); return; }
    setBusy(id);
    setError('');
    setSuccess('');
    try {
      if (kind === 'product') await setSmePosProductArchived(spaceId, id, false);
      else await setSmePosCustomerArchived(spaceId, id, false);
      setSuccess(kind === 'product' ? 'Product restored.' : 'Customer restored.');
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy('');
    }
  }

  if (loading) return <main className="page"><div className="loading-panel">Loading archived POS records…</div></main>;
  if (!space || space.type !== 'sme') return <main className="page"><PageHeader eyebrow="SME POS" title="SME Space required" description="Archived POS records are available inside an SME Space." /><Link className="button primary" to="/spaces">Back to Spaces</Link></main>;

  const canRestoreProducts = role === 'owner' || role === 'manager';
  const canRestoreCustomers = role === 'owner' || role === 'manager';

  return <main className="page">
    <PageHeader eyebrow="SME POS archive" title="Archived POS records" description={`Products and customers archived from ${space.name}.`} action={<Link className="button secondary" to={`/spaces/${space.id}/pos`}>Back to POS</Link>} />
    {error && <div className="notice error">{error}</div>}{success && <div className="notice success">{success}</div>}
    {!canRestoreProducts && !canRestoreCustomers && <div className="notice">Your POS role does not include archived records.</div>}
    {canRestoreProducts && <section className="panel"><div className="panel-heading"><div><h2>Archived products</h2><p>{products.length} record(s)</p></div></div><div className="sme-pos-archive-list">{products.map((item) => <div key={item.id}><div><strong>{item.name}</strong><small>{item.sku || item.displayId} · {formatMoney(item.sellingPriceMinor, item.currency)} · {item.trackStock ? `${item.quantityOnHand} saved stock` : 'Unlimited item'}</small></div><button className="button secondary small" type="button" disabled={busy === item.id} onClick={() => void restore('product', item.id)}>{busy === item.id ? 'Restoring…' : 'Restore'}</button></div>)}</div>{!products.length && <div className="empty-inline">No archived products.</div>}</section>}
    {canRestoreCustomers && <section className="panel"><div className="panel-heading"><div><h2>Archived customers</h2><p>{customers.length} record(s)</p></div></div><div className="sme-pos-archive-list">{customers.map((item) => <div key={item.id}><div><strong>{item.name}</strong><small>{[item.phone, item.email].filter(Boolean).join(' · ') || item.displayId}</small></div><button className="button secondary small" type="button" disabled={busy === item.id} onClick={() => void restore('customer', item.id)}>{busy === item.id ? 'Restoring…' : 'Restore'}</button></div>)}</div>{!customers.length && <div className="empty-inline">No archived customers.</div>}</section>}
  </main>;
}
