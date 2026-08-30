import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMySmePosAccess,
  getSmePosSettings,
  listMarketplaceListings,
  listMarketplaceSellers,
  listSmePosCustomers,
  listSmePosProducts,
  setMarketplaceListingArchived,
  setMarketplaceSellerArchived,
  setSmePosCustomerArchived,
  setSmePosProductArchived,
} from '../../repositories/smePosRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  SmePosCustomer,
  SmePosListing,
  SmePosMode,
  SmePosProduct,
  SmePosRole,
  SmePosSeller,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

export function SmePosArchivedRecordsPage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [mode, setMode] = useState<SmePosMode>('standard');
  const [products, setProducts] = useState<SmePosProduct[]>([]);
  const [customers, setCustomers] = useState<SmePosCustomer[]>([]);
  const [sellers, setSellers] = useState<SmePosSeller[]>([]);
  const [listings, setListings] = useState<SmePosListing[]>([]);
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
      setMode(settings.mode);
      const owner = nextSpace.ownerId === user.uid;
      const access = owner ? null : await getMySmePosAccess(spaceId, user.uid).catch(() => null);
      const nextRole: SmePosRole | null = owner ? 'owner' : access?.status === 'active' ? access.role : null;
      setRole(nextRole);
      const canReadArchive = nextRole === 'owner' || nextRole === 'manager';
      if (!canReadArchive) {
        setProducts([]); setCustomers([]); setSellers([]); setListings([]);
        return;
      }
      if (settings.mode === 'marketplace_consignment') {
        const [allSellers, allListings, allCustomers] = await Promise.all([
          listMarketplaceSellers(spaceId, true),
          listMarketplaceListings(spaceId, true),
          listSmePosCustomers(spaceId, true),
        ]);
        setSellers(allSellers.filter((item) => Boolean(item.archivedAt)));
        setListings(allListings.filter((item) => Boolean(item.archivedAt)));
        setCustomers(allCustomers.filter((item) => Boolean(item.archivedAt)));
        setProducts([]);
      } else {
        const [allProducts, allCustomers] = await Promise.all([
          listSmePosProducts(spaceId, true),
          listSmePosCustomers(spaceId, true),
        ]);
        setProducts(allProducts.filter((item) => Boolean(item.archivedAt)));
        setCustomers(allCustomers.filter((item) => Boolean(item.archivedAt)));
        setSellers([]); setListings([]);
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => { void load(); }, [load]);

  async function restore(kind: 'product' | 'customer' | 'seller' | 'listing', id: string) {
    if (!navigator.onLine) { setError('Connect to the internet to restore POS records.'); return; }
    setBusy(id); setError(''); setSuccess('');
    try {
      if (kind === 'product') await setSmePosProductArchived(spaceId, id, false);
      else if (kind === 'customer') await setSmePosCustomerArchived(spaceId, id, false);
      else if (kind === 'seller') await setMarketplaceSellerArchived(spaceId, id, false);
      else await setMarketplaceListingArchived(spaceId, id, false);
      setSuccess(`${kind[0].toUpperCase()}${kind.slice(1)} restored.`);
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy('');
    }
  }

  if (loading) return <main className="page"><div className="loading-panel">Loading archived POS records…</div></main>;
  if (!space || space.type !== 'sme') return <main className="page"><PageHeader eyebrow="Business POS" title="Business Space required" description="Archived POS records are available inside an Business Space." /><Link className="button primary" to="/spaces">Back to Spaces</Link></main>;

  const canRestore = role === 'owner' || role === 'manager';
  const marketplace = mode === 'marketplace_consignment';

  return <main className="page">
    <PageHeader eyebrow="Business POS archive" title="Archived POS records" description={`${marketplace ? 'Seller listings, sellers and customers' : 'Products and customers'} archived from ${space.name}.`} action={<Link className="button secondary" to={`/spaces/${space.id}/pos`}>Back to POS</Link>} />
    {error && <div className="notice error">{error}</div>}{success && <div className="notice success">{success}</div>}
    {!canRestore && <div className="notice">Your POS role does not include archived records.</div>}

    {canRestore && marketplace && <>
      <section className="panel"><div className="panel-heading"><div><h2>Archived seller listings</h2><p>{listings.length} record(s)</p></div></div><div className="sme-pos-archive-list">{listings.map((item) => <div key={item.id}><div><strong>{item.name}</strong><small>{item.sellerName} · {item.sku || item.displayId} · {formatMoney(item.sellingPriceMinor, item.currency)} · {item.quantityOnHand} saved stock</small></div><button className="button secondary small" type="button" disabled={busy === item.id} onClick={() => void restore('listing', item.id)}>{busy === item.id ? 'Restoring…' : 'Restore'}</button></div>)}</div>{!listings.length && <div className="empty-inline">No archived seller listings.</div>}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Archived sellers</h2><p>{sellers.length} record(s)</p></div></div><div className="sme-pos-archive-list">{sellers.map((item) => <div key={item.id}><div><strong>{item.name}</strong><small>{item.email || item.phone || item.displayId} · Balance {formatMoney(item.balanceMinor, item.currency)}</small></div><button className="button secondary small" type="button" disabled={busy === item.id} onClick={() => void restore('seller', item.id)}>{busy === item.id ? 'Restoring…' : 'Restore'}</button></div>)}</div>{!sellers.length && <div className="empty-inline">No archived sellers.</div>}</section>
    </>}

    {canRestore && !marketplace && <section className="panel"><div className="panel-heading"><div><h2>Archived products</h2><p>{products.length} record(s)</p></div></div><div className="sme-pos-archive-list">{products.map((item) => <div key={item.id}><div><strong>{item.name}</strong><small>{item.sku || item.displayId} · {formatMoney(item.sellingPriceMinor, item.currency)} · {item.trackStock ? `${item.quantityOnHand} saved stock` : 'Unlimited item'}</small></div><button className="button secondary small" type="button" disabled={busy === item.id} onClick={() => void restore('product', item.id)}>{busy === item.id ? 'Restoring…' : 'Restore'}</button></div>)}</div>{!products.length && <div className="empty-inline">No archived products.</div>}</section>}

    {canRestore && <section className="panel"><div className="panel-heading"><div><h2>Archived customers</h2><p>{customers.length} record(s)</p></div></div><div className="sme-pos-archive-list">{customers.map((item) => <div key={item.id}><div><strong>{item.name}</strong><small>{[item.phone, item.email].filter(Boolean).join(' · ') || item.displayId}</small></div><button className="button secondary small" type="button" disabled={busy === item.id} onClick={() => void restore('customer', item.id)}>{busy === item.id ? 'Restoring…' : 'Restore'}</button></div>)}</div>{!customers.length && <div className="empty-inline">No archived customers.</div>}</section>}
  </main>;
}
