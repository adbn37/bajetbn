import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import {
  checkoutMarketplacePos,
  getMarketplacePosWorkspace,
  listSmePosAccess,
  listSmePosPaymentAccounts,
  saveMarketplaceListing,
  saveMarketplaceSeller,
  saveSmePosCustomer,
  setMarketplaceListingArchived,
  setMarketplaceSellerArchived,
  setSmePosCustomerArchived,
  updateMarketplaceListingStock,
} from '../../repositories/smePosRepository';
import type {
  PaymentMethodCode,
  SmePosAccess,
  SmePosCommissionType,
  SmePosCustomer,
  SmePosListing,
  SmePosListingCondition,
  SmePosPaymentAccount,
  SmePosRole,
  SmePosSale,
  SmePosSeller,
  SmePosSellerLedgerEntry,
  SmePosSettings,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

interface Props {
  space: Space;
  settings: SmePosSettings;
  role: SmePosRole;
  onChanged: () => Promise<void> | void;
}

type MarketplaceTab = 'register' | 'sellers' | 'listings' | 'customers' | 'sales' | 'balance';
type ConfirmPayload =
  | { kind: 'seller'; id: string }
  | { kind: 'listing'; id: string }
  | { kind: 'customer'; id: string };

const paymentMethods: Array<{ code: PaymentMethodCode; label: string }> = [
  { code: 'cash', label: 'Cash' },
  { code: 'bank_transfer', label: 'Bank transfer' },
  { code: 'debit_card', label: 'Debit card' },
  { code: 'credit_card', label: 'Credit card' },
  { code: 'e_wallet', label: 'E-wallet' },
  { code: 'qr_payment', label: 'QR payment' },
  { code: 'other', label: 'Other' },
];

const conditionLabels: Record<SmePosListingCondition, string> = {
  new: 'New',
  sealed: 'Sealed',
  open_box: 'Open box',
  used: 'Used',
  other: 'Other',
};

const tabLabels: Record<MarketplaceTab, string> = {
  register: 'Open Register',
  sellers: 'Sellers',
  listings: 'Listings & stock',
  customers: 'Customers',
  sales: 'Sales & reports',
  balance: 'My balance',
};

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Brunei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function tabsForRole(role: SmePosRole): MarketplaceTab[] {
  if (role === 'owner' || role === 'manager') return ['register', 'sellers', 'listings', 'customers', 'sales'];
  if (role === 'cashier') return ['register', 'customers', 'sales'];
  if (role === 'stock_staff') return ['listings'];
  if (role === 'seller') return ['listings', 'balance', 'sales'];
  if (role === 'viewer') return ['listings', 'customers'];
  return [];
}

function initialTab(role: SmePosRole): MarketplaceTab {
  if (role === 'stock_staff' || role === 'seller' || role === 'viewer') return 'listings';
  return 'register';
}

function commissionCopy(type: SmePosCommissionType, rateBps: number, fixedMinor: number, currency: string) {
  return type === 'percentage'
    ? `${(rateBps / 100).toFixed(2).replace(/\.00$/, '')}% commission`
    : `${formatMoney(fixedMinor, currency)} per item`;
}

export function MarketplaceConsignmentPosWorkspace({ space, settings, role, onChanged }: Props) {
  const availableTabs = useMemo(() => tabsForRole(role), [role]);
  const [tab, setTab] = useState<MarketplaceTab>(() => initialTab(role));
  const [sellers, setSellers] = useState<SmePosSeller[]>([]);
  const [listings, setListings] = useState<SmePosListing[]>([]);
  const [customers, setCustomers] = useState<SmePosCustomer[]>([]);
  const [sales, setSales] = useState<SmePosSale[]>([]);
  const [sellerLedger, setSellerLedger] = useState<SmePosSellerLedgerEntry[]>([]);
  const [sellerAccess, setSellerAccess] = useState<SmePosAccess[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<SmePosPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [sellerForm, setSellerForm] = useState<SmePosSeller | 'new' | null>(null);
  const [sellerCommissionType, setSellerCommissionType] = useState<SmePosCommissionType>('percentage');
  const [listingForm, setListingForm] = useState<SmePosListing | 'new' | null>(null);
  const [listingCommissionType, setListingCommissionType] = useState<SmePosCommissionType>('percentage');
  const [listingCondition, setListingCondition] = useState<SmePosListingCondition>('new');
  const [stockForm, setStockForm] = useState<SmePosListing | null>(null);
  const [customerForm, setCustomerForm] = useState<SmePosCustomer | 'new' | null>(null);
  const [receipt, setReceipt] = useState<SmePosSale | null>(null);
  const [confirm, setConfirm] = useState<ActionConfirmState<ConfirmPayload> | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(settings.defaultPaymentAccountId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cash');
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [saleDate, setSaleDate] = useState(today());
  const [checkoutNote, setCheckoutNote] = useState('');

  const canManageSellers = role === 'owner' || role === 'manager';
  const canManageListings = role === 'owner' || role === 'manager';
  const canManageStock = ['owner', 'manager', 'stock_staff'].includes(role);
  const canManageCustomers = ['owner', 'manager', 'cashier'].includes(role);
  const canArchiveCustomers = role === 'owner' || role === 'manager';
  const canCheckout = ['owner', 'manager', 'cashier'].includes(role);
  const canViewReports = role === 'owner' || role === 'manager';
  const canViewSales = ['owner', 'manager', 'cashier', 'seller'].includes(role);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [workspace, accounts, access] = await Promise.all([
        getMarketplacePosWorkspace(space.id),
        canCheckout ? listSmePosPaymentAccounts(space.id) : Promise.resolve([]),
        canManageSellers ? listSmePosAccess(space.id) : Promise.resolve([]),
      ]);
      setSellers(workspace.sellers);
      setListings(workspace.listings);
      setCustomers(workspace.customers);
      setSales(workspace.sales);
      setSellerLedger(workspace.sellerLedger);
      setPaymentAccounts(accounts);
      setSellerAccess(access.filter((item) => item.role === 'seller' && item.status === 'active'));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [space.id, role]);
  useEffect(() => {
    if (!availableTabs.includes(tab)) setTab(initialTab(role));
  }, [availableTabs, role, tab]);
  useEffect(() => {
    if (!paymentAccountId && settings.defaultPaymentAccountId) setPaymentAccountId(settings.defaultPaymentAccountId);
  }, [paymentAccountId, settings.defaultPaymentAccountId]);

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings.filter((item) => !term || [item.name, item.category, item.sku, item.sellerName, conditionLabels[item.condition]].some((value) => value?.toLowerCase().includes(term)));
  }, [listings, search]);

  const cartLines = useMemo(() => Object.entries(cart).map(([id, quantity]) => {
    const listing = listings.find((item) => item.id === id);
    return listing ? { listing, quantity } : null;
  }).filter((item): item is { listing: SmePosListing; quantity: number } => Boolean(item)), [cart, listings]);

  const subtotalMinor = cartLines.reduce((sum, item) => sum + item.listing.sellingPriceMinor * item.quantity, 0);
  let discountMinor = 0;
  try { discountMinor = Math.max(0, toMinorUnits(discount || '0')); } catch { discountMinor = 0; }
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const monthPrefix = today().slice(0, 7);
  const activeSales = sales.filter((item) => item.status !== 'refunded');
  const todayGross = activeSales.filter((item) => item.saleDate === today()).reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthGross = activeSales.filter((item) => item.saleDate.startsWith(monthPrefix)).reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthCommission = activeSales.filter((item) => item.saleDate.startsWith(monthPrefix)).reduce((sum, item) => sum + (item.marketplaceCommissionMinor || item.profitMinor), 0);
  const sellerMoneyWaiting = sellers.reduce((sum, item) => sum + item.balanceMinor, 0);
  const lowStock = listings.filter((item) => item.quantityOnHand <= item.lowStockLevel).length;
  const mySeller = role === 'seller' ? sellers[0] || null : null;

  function requireOnline() {
    if (navigator.onLine) return true;
    setError('Connect to the internet to change Marketplace records or complete checkout.');
    return false;
  }

  function openSellerForm(value: SmePosSeller | 'new') {
    setSellerCommissionType(value === 'new' ? 'percentage' : value.defaultCommissionType);
    setSellerForm(value);
  }

  function openListingForm(value: SmePosListing | 'new') {
    if (value === 'new') {
      const firstSeller = sellers[0];
      setListingCommissionType(firstSeller?.defaultCommissionType || 'percentage');
      setListingCondition('new');
    } else {
      setListingCommissionType(value.commissionType);
      setListingCondition(value.condition);
    }
    setListingForm(value);
  }

  async function saveSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sellerForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const commissionType = String(form.get('commissionType') || 'percentage') as SmePosCommissionType;
    const rate = Number(form.get('commissionRate') || 0);
    setBusy(true); setError(''); setSuccess('');
    try {
      await saveMarketplaceSeller({
        spaceId: space.id,
        sellerId: sellerForm === 'new' ? undefined : sellerForm.id,
        name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        note: String(form.get('note') || ''),
        linkedUid: String(form.get('linkedUid') || '') || null,
        defaultCommissionType: commissionType,
        defaultCommissionRateBps: commissionType === 'percentage' ? Math.round(rate * 100) : 0,
        defaultCommissionMinor: commissionType === 'fixed_per_item' ? toMinorUnits(String(form.get('commissionFixed') || '0')) : 0,
      });
      setSellerForm(null);
      setSuccess(sellerForm === 'new' ? 'Seller added.' : 'Seller updated.');
      await load(); await onChanged();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listingForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const commissionType = String(form.get('commissionType') || 'percentage') as SmePosCommissionType;
    const rate = Number(form.get('commissionRate') || 0);
    setBusy(true); setError(''); setSuccess('');
    try {
      await saveMarketplaceListing({
        spaceId: space.id,
        listingId: listingForm === 'new' ? undefined : listingForm.id,
        sellerId: String(form.get('sellerId') || ''),
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        sku: String(form.get('sku') || ''),
        note: String(form.get('note') || ''),
        condition: String(form.get('condition') || 'new') as SmePosListingCondition,
        conditionNote: String(form.get('conditionNote') || ''),
        sellingPriceMinor: toMinorUnits(String(form.get('sellingPrice') || '')),
        commissionType,
        commissionRateBps: commissionType === 'percentage' ? Math.round(rate * 100) : 0,
        commissionMinor: commissionType === 'fixed_per_item' ? toMinorUnits(String(form.get('commissionFixed') || '0')) : 0,
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setListingForm(null);
      setSuccess(listingForm === 'new' ? 'Seller listing added.' : 'Seller listing updated.');
      await load(); await onChanged();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function saveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setSuccess('');
    try {
      await updateMarketplaceListingStock({
        spaceId: space.id,
        listingId: stockForm.id,
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setStockForm(null); setSuccess('Listing stock updated.');
      await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setSuccess('');
    try {
      await saveSmePosCustomer({
        spaceId: space.id,
        customerId: customerForm === 'new' ? undefined : customerForm.id,
        name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        note: String(form.get('note') || ''),
      });
      setCustomerForm(null); setSuccess(customerForm === 'new' ? 'Customer added.' : 'Customer updated.');
      await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function archiveConfirmed() {
    if (!confirm || !requireOnline()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (confirm.payload.kind === 'seller') await setMarketplaceSellerArchived(space.id, confirm.payload.id, true);
      else if (confirm.payload.kind === 'listing') await setMarketplaceListingArchived(space.id, confirm.payload.id, true);
      else await setSmePosCustomerArchived(space.id, confirm.payload.id, true);
      setSuccess(confirm.payload.kind === 'seller' ? 'Seller archived.' : confirm.payload.kind === 'listing' ? 'Listing archived.' : 'Customer archived.');
      setConfirm(null); await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  function addToCart(listing: SmePosListing) {
    if (listing.quantityOnHand < 1) return;
    setCart((current) => {
      const next = Math.min((current[listing.id] || 0) + 1, listing.quantityOnHand);
      return { ...current, [listing.id]: next };
    });
  }

  function changeQuantity(listing: SmePosListing, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (!Number.isFinite(quantity) || quantity < 1) delete next[listing.id];
      else next[listing.id] = Math.min(Math.floor(quantity), listing.quantityOnHand);
      return next;
    });
  }

  async function completeCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCheckout || !requireOnline()) return;
    if (!cartLines.length) { setError('Add at least one seller listing to the cart.'); return; }
    if (!paymentAccountId) { setError('Choose where the payment was received.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await checkoutMarketplacePos({
        spaceId: space.id,
        items: cartLines.map((item) => ({ listingId: item.listing.id, quantity: item.quantity })),
        customerId: customerId || null,
        paymentAccountId,
        paymentMethod,
        paymentMethodLabel: paymentMethod === 'other' ? paymentMethodLabel : null,
        discountMinor,
        saleDate,
        note: checkoutNote,
      });
      setCart({}); setDiscount('0.00'); setCheckoutNote(''); setCustomerId('');
      setSuccess(`Sale completed. Receipt ${result.data.receiptNumber}. Seller balances were updated.`);
      await load(); await onChanged();
      const nextWorkspace = await getMarketplacePosWorkspace(space.id);
      const nextReceipt = nextWorkspace.sales.find((item) => item.id === result.data.saleId) || null;
      setReceipt(nextReceipt);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      await load();
    } finally { setBusy(false); }
  }

  return <section className="sme-standard-pos-workspace marketplace-pos-workspace">
    <div className="pos-workspace-heading">
      <div><span className="eyebrow">Marketplace shop tools</span><h2>{role === 'cashier' ? 'Register' : role === 'seller' ? 'Seller workspace' : 'Marketplace Consignment POS'}</h2><p>{role === 'seller' ? 'View your own listings, completed sales, and money waiting for payout.' : 'Sell listings from different sellers through one shared register.'}</p></div>
      {(role === 'owner' || role === 'manager') && <Link className="button secondary" to={`/spaces/${space.id}/pos/archived`}>Archived POS records</Link>}
    </div>

    {settings.status !== 'active' && <div className="notice warning">The POS is {settings.status === 'paused' ? 'paused' : 'still in setup'}. Records can be prepared, but checkout is blocked.</div>}
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    <div className="sme-pos-workspace-tabs" role="tablist" aria-label="Marketplace POS tools">
      {availableTabs.map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setError(''); setSuccess(''); setSearch(''); }}>{item === 'sales' && role === 'cashier' ? 'My recent sales' : item === 'sales' && role === 'seller' ? 'My sales' : tabLabels[item]}</button>)}
    </div>

    {loading ? <div className="loading-panel">Loading Marketplace records…</div> : <>
      {tab === 'sellers' && canManageSellers && <section className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Sellers</h3><p>Each seller keeps a separate balance and commission rule.</p></div><button className="button primary" type="button" onClick={() => openSellerForm('new')}>Add seller</button></div>
        <div className="marketplace-seller-grid">{sellers.map((seller) => <article className="sme-pos-product-card" key={seller.id}>
          <div><span className="type-badge">Seller</span><h3>{seller.name}</h3><small>{seller.email || seller.phone || seller.displayId}</small></div>
          <p>{commissionCopy(seller.defaultCommissionType, seller.defaultCommissionRateBps, seller.defaultCommissionMinor, seller.currency)}</p>
          <div className="marketplace-balance-row"><span>Waiting payout</span><strong>{formatMoney(seller.balanceMinor, seller.currency)}</strong></div>
          <small>{seller.soldQuantity} item(s) sold · Shop earned {formatMoney(seller.commissionEarnedMinor, seller.currency)}</small>
          <div className="button-row"><button className="button secondary small" type="button" onClick={() => openSellerForm(seller)}>Edit</button><button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'seller', id: seller.id }, title: 'Archive this seller?', description: 'The seller will leave the active list. Existing listings, sales, balances and history stay recorded.', note: 'Archive or move active listings first. Sellers with active listings cannot be archived.', confirmLabel: 'Archive seller' })}>Archive</button></div>
        </article>)}</div>
        {!sellers.length && <div className="empty-inline">No sellers yet. Add a seller before creating a listing.</div>}
      </section>}

      {tab === 'listings' && <section className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>{role === 'seller' ? 'My listings' : 'Seller listings and stock'}</h3><p>Every listing or stock batch keeps its own seller, price, condition, quantity and commission.</p></div>{canManageListings && <button className="button primary" type="button" onClick={() => openListingForm('new')} disabled={!sellers.length}>Add listing</button>}</div>
        <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, seller, category, condition or SKU" />
        <div className="sme-pos-product-grid">{filteredListings.map((listing) => {
          const outOfStock = listing.quantityOnHand < 1;
          const low = listing.quantityOnHand > 0 && listing.quantityOnHand <= listing.lowStockLevel;
          return <article className={`sme-pos-product-card ${outOfStock ? 'out-of-stock' : ''}`} key={listing.id}>
            <div><span className="type-badge">{listing.sellerName}</span><h3>{listing.name}</h3><small>{conditionLabels[listing.condition]} · {listing.sku || listing.displayId}</small></div>
            {role !== 'stock_staff' && <strong>{formatMoney(listing.sellingPriceMinor, listing.currency)}</strong>}
            <p className={outOfStock ? 'stock-danger' : low ? 'stock-warning' : ''}>{outOfStock ? 'Out of stock' : `${listing.quantityOnHand} in stock${low ? ' · Low stock' : ''}`}</p>
            {(role === 'owner' || role === 'manager' || role === 'seller') && <small>{commissionCopy(listing.commissionType, listing.commissionRateBps, listing.commissionMinor, listing.currency)}</small>}
            {canManageListings && <div className="button-row"><button className="button secondary small" type="button" onClick={() => openListingForm(listing)}>Edit</button><button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'listing', id: listing.id }, title: 'Archive this listing?', description: 'It will leave the active register while its sales and seller balance history stay unchanged.', note: 'You can restore it from Archived POS records.', confirmLabel: 'Archive listing' })}>Archive</button></div>}
            {!canManageListings && canManageStock && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setStockForm(listing)}>Update stock</button></div>}
          </article>;
        })}</div>
        {!filteredListings.length && <div className="empty-inline">No active seller listings found.</div>}
      </section>}

      {tab === 'customers' && <section className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Customers</h3><p>Optional customer details for receipts and repeat visits.</p></div>{canManageCustomers && <button className="button primary" type="button" onClick={() => setCustomerForm('new')}>Add customer</button>}</div>
        <div className="sme-pos-customer-list">{customers.map((customer) => <div className="sme-pos-customer-row" key={customer.id}><div><strong>{customer.name}</strong><small>{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}</small></div><span>{customer.visitCount || 0} sale{customer.visitCount === 1 ? '' : 's'}</span>{canManageCustomers && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setCustomerForm(customer)}>Edit</button>{canArchiveCustomers && <button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'customer', id: customer.id }, title: 'Archive this customer?', description: 'The customer will leave the active list while old receipts and sales stay unchanged.', note: 'You can restore the customer later.', confirmLabel: 'Archive customer' })}>Archive</button>}</div>}</div>)}</div>
        {!customers.length && <div className="empty-inline">No customers yet. The register can still use Walk-in customer.</div>}
      </section>}

      {tab === 'register' && <form className="sme-pos-checkout-layout" onSubmit={completeCheckout}>
        <section className="panel sme-pos-checkout-products">
          <div className="panel-heading"><div><span className="eyebrow">Shared register</span><h3>Choose seller listings</h3><p>One sale can contain items from several sellers.</p></div></div>
          <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, seller, condition or SKU" autoFocus />
          <div className="sme-pos-checkout-product-grid">{filteredListings.map((listing) => {
            const outOfStock = listing.quantityOnHand < 1;
            return <button type="button" key={listing.id} disabled={outOfStock} className={outOfStock ? 'out-of-stock' : ''} onClick={() => addToCart(listing)}><strong>{listing.name}</strong><span>{formatMoney(listing.sellingPriceMinor, listing.currency)}</span><small>{listing.sellerName} · {conditionLabels[listing.condition]}</small><small>{outOfStock ? 'Out of stock' : `${listing.quantityOnHand} available`}</small></button>;
          })}</div>
          {!filteredListings.length && <div className="empty-inline">No seller listings found.</div>}
        </section>
        <section className="panel sme-pos-cart">
          <div className="panel-heading"><div><span className="eyebrow">Current sale</span><h3>Cart</h3><p>{cartLines.reduce((sum, item) => sum + item.quantity, 0)} item(s) · {new Set(cartLines.map((item) => item.listing.sellerId)).size} seller(s)</p></div>{cartLines.length > 0 && <button className="button ghost small" type="button" onClick={() => setCart({})}>Clear cart</button>}</div>
          <div className="sme-pos-cart-lines">{cartLines.map(({ listing, quantity }) => <div key={listing.id}><div><strong>{listing.name}</strong><small>{listing.sellerName} · {formatMoney(listing.sellingPriceMinor, listing.currency)} each</small></div><input type="number" min="0" max={listing.quantityOnHand} value={quantity} onChange={(event) => changeQuantity(listing, Number(event.target.value))} aria-label={`${listing.name} quantity`} /><strong>{formatMoney(listing.sellingPriceMinor * quantity, listing.currency)}</strong></div>)}</div>
          {!cartLines.length && <div className="empty-inline">Tap a listing to begin the sale.</div>}
          <div className="form-stack compact">
            <label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Walk-in customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Payment received in<select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} required><option value="">Choose account</option>{paymentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label>
            <div className="form-grid"><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodCode)}>{paymentMethods.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label>Sale date<input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label></div>
            {paymentMethod === 'other' && <label>Other payment method<input value={paymentMethodLabel} onChange={(event) => setPaymentMethodLabel(event.target.value)} required /></label>}
            <label>Discount (BND)<input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
            <label>Note<textarea rows={2} value={checkoutNote} onChange={(event) => setCheckoutNote(event.target.value)} placeholder="Optional" /></label>
          </div>
          <div className="sme-pos-totals"><span>Subtotal <strong>{formatMoney(subtotalMinor, settings.currency)}</strong></span><span>Discount <strong>-{formatMoney(discountMinor, settings.currency)}</strong></span><span className="total">Customer pays <strong>{formatMoney(totalMinor, settings.currency)}</strong></span></div>
          <button className="button primary pos-complete-sale" type="submit" disabled={busy || !canCheckout || settings.status !== 'active' || !cartLines.length}>{busy ? 'Completing sale…' : settings.status !== 'active' ? 'POS is not active' : `Complete sale · ${formatMoney(totalMinor, settings.currency)}`}</button>
        </section>
      </form>}

      {tab === 'balance' && role === 'seller' && <div className="sme-pos-sales-section">
        <div className="summary-grid sme-pos-report-grid"><article className="summary-card featured"><span>Money waiting payout</span><strong>{formatMoney(mySeller?.balanceMinor || 0, settings.currency)}</strong><small>Payout recording is added in v0.11.16</small></article><article className="summary-card"><span>My gross sales</span><strong>{formatMoney(mySeller?.grossSalesMinor || 0, settings.currency)}</strong><small>{mySeller?.soldQuantity || 0} item(s) sold</small></article><article className="summary-card"><span>Shop commission</span><strong>{formatMoney(mySeller?.commissionEarnedMinor || 0, settings.currency)}</strong><small>Kept by the shop</small></article></div>
        <section className="panel"><div className="panel-heading"><div><h3>Balance activity</h3><p>Every completed sale adds one entry to your seller balance.</p></div></div><div className="sme-pos-sales-list">{sellerLedger.map((entry) => <div className="marketplace-ledger-row" key={entry.id}><div><strong>{entry.receiptNumber || entry.displayId}</strong><small>{entry.kind === 'sale_earning' ? 'Sale earning' : entry.kind} · {entry.note || entry.sellerName}</small></div><strong>+{formatMoney(entry.amountMinor, entry.currency)}</strong><small>Balance {formatMoney(entry.balanceAfterMinor, entry.currency)}</small></div>)}</div>{!sellerLedger.length && <div className="empty-inline">No seller balance activity yet.</div>}</section>
      </div>}

      {tab === 'sales' && canViewSales && <div className="sme-pos-sales-section">
        {canViewReports && <div className="summary-grid sme-pos-report-grid"><article className="summary-card featured"><span>Gross sales today</span><strong>{formatMoney(todayGross, settings.currency)}</strong><small>{today()}</small></article><article className="summary-card"><span>Gross sales this month</span><strong>{formatMoney(monthGross, settings.currency)}</strong><small>{monthPrefix}</small></article><article className="summary-card"><span>Shop commission</span><strong>{formatMoney(monthCommission, settings.currency)}</strong><small>This month</small></article><article className="summary-card"><span>Seller money waiting</span><strong>{formatMoney(sellerMoneyWaiting, settings.currency)}</strong><small>Across active sellers</small></article><article className="summary-card"><span>Low stock</span><strong>{lowStock}</strong><small>At or below alert level</small></article></div>}
        <section className="panel"><div className="panel-heading"><div><h3>{role === 'cashier' ? 'My recent sales' : role === 'seller' ? 'My sales' : 'Recent Marketplace sales'}</h3><p>{role === 'seller' ? 'Only the part of each sale belonging to you is shown.' : 'Open a sale to view or print its receipt.'}</p></div></div><div className="sme-pos-sales-list">{sales.map((sale) => <button type="button" key={sale.id} onClick={() => setReceipt(sale)}><div><strong>{sale.receiptNumber}</strong><small>{sale.saleDate} · {sale.customerName || 'Walk-in customer'} · {sale.itemCount} item(s)</small></div><span className="status-badge posted">{sale.status}</span><strong>{formatMoney(role === 'seller' ? (sale.sellerEarningsMinor || 0) : sale.totalMinor - sale.returnedMinor, sale.currency)}</strong></button>)}</div>{!sales.length && <div className="empty-inline">No Marketplace sales available.</div>}</section>
      </div>}
    </>}

    {sellerForm && <Modal title={sellerForm === 'new' ? 'Add seller' : 'Edit seller'} onClose={() => !busy && setSellerForm(null)}><form className="form-stack" onSubmit={saveSeller}>
      <label>Seller name<input name="name" defaultValue={sellerForm === 'new' ? '' : sellerForm.name} maxLength={100} required /></label>
      <div className="form-grid"><label>WhatsApp or phone<input name="phone" defaultValue={sellerForm === 'new' ? '' : sellerForm.phone || ''} maxLength={32} /></label><label>Email<input name="email" type="email" defaultValue={sellerForm === 'new' ? '' : sellerForm.email || ''} maxLength={120} /></label></div>
      <label>Link seller login<select name="linkedUid" defaultValue={sellerForm === 'new' ? '' : sellerForm.linkedUid || ''}><option value="">No login linked</option>{sellerAccess.map((item) => <option key={item.uid} value={item.uid}>{item.displayName || item.email || item.uid}</option>)}</select><small>First invite the person to the SME Space and assign the Seller POS role in POS Settings.</small></label>
      <fieldset className="pos-item-type-fieldset"><legend>Default shop commission</legend><label className={`pos-item-type-option ${sellerCommissionType === 'percentage' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="percentage" checked={sellerCommissionType === 'percentage'} onChange={() => setSellerCommissionType('percentage')} /><span><strong>Percentage</strong><small>The shop keeps a percentage of the final selling amount.</small></span></label><label className={`pos-item-type-option ${sellerCommissionType === 'fixed_per_item' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="fixed_per_item" checked={sellerCommissionType === 'fixed_per_item'} onChange={() => setSellerCommissionType('fixed_per_item')} /><span><strong>Fixed amount per item</strong><small>The shop keeps the same amount for every unit sold.</small></span></label></fieldset>
      {sellerCommissionType === 'percentage' ? <label>Commission percentage<input name="commissionRate" type="number" min="0" max="100" step="0.01" defaultValue={sellerForm === 'new' ? '3' : (sellerForm.defaultCommissionRateBps / 100).toFixed(2)} required /></label> : <label>Commission per item (BND)<input name="commissionFixed" inputMode="decimal" defaultValue={sellerForm === 'new' ? '0.00' : (sellerForm.defaultCommissionMinor / 100).toFixed(2)} required /></label>}
      <label>Note<textarea name="note" rows={3} defaultValue={sellerForm === 'new' ? '' : sellerForm.note || ''} maxLength={300} /></label>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setSellerForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save seller'}</button></div>
    </form></Modal>}

    {listingForm && <Modal title={listingForm === 'new' ? 'Add seller listing' : 'Edit seller listing'} onClose={() => !busy && setListingForm(null)}><form className="form-stack" onSubmit={saveListing}>
      <label>Seller<select name="sellerId" defaultValue={listingForm === 'new' ? sellers[0]?.id || '' : listingForm.sellerId} required>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></label>
      <div className="form-grid"><label>Item name<input name="name" defaultValue={listingForm === 'new' ? '' : listingForm.name} maxLength={100} required /></label><label>Category<input name="category" defaultValue={listingForm === 'new' ? '' : listingForm.category || ''} maxLength={60} /></label><label>SKU (optional)<input name="sku" defaultValue={listingForm === 'new' ? '' : listingForm.sku || ''} maxLength={50} /></label><label>Selling price (BND)<input name="sellingPrice" inputMode="decimal" defaultValue={listingForm === 'new' ? '' : (listingForm.sellingPriceMinor / 100).toFixed(2)} required /></label></div>
      <div className="form-grid"><label>Condition<select name="condition" value={listingCondition} onChange={(event) => setListingCondition(event.target.value as SmePosListingCondition)}>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Condition details<input name="conditionNote" defaultValue={listingForm === 'new' ? '' : listingForm.conditionNote || ''} maxLength={120} placeholder="Optional" /></label></div>
      <fieldset className="pos-item-type-fieldset"><legend>Commission for this listing</legend><label className={`pos-item-type-option ${listingCommissionType === 'percentage' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="percentage" checked={listingCommissionType === 'percentage'} onChange={() => setListingCommissionType('percentage')} /><span><strong>Percentage</strong><small>Calculated after any sale discount is shared across the cart.</small></span></label><label className={`pos-item-type-option ${listingCommissionType === 'fixed_per_item' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="fixed_per_item" checked={listingCommissionType === 'fixed_per_item'} onChange={() => setListingCommissionType('fixed_per_item')} /><span><strong>Fixed amount per item</strong><small>Must be lower than the item selling price.</small></span></label></fieldset>
      {listingCommissionType === 'percentage' ? <label>Commission percentage<input name="commissionRate" type="number" min="0" max="100" step="0.01" defaultValue={listingForm === 'new' ? '3' : (listingForm.commissionRateBps / 100).toFixed(2)} required /></label> : <label>Commission per item (BND)<input name="commissionFixed" inputMode="decimal" defaultValue={listingForm === 'new' ? '0.00' : (listingForm.commissionMinor / 100).toFixed(2)} required /></label>}
      <div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={listingForm === 'new' ? 0 : listingForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={listingForm === 'new' ? 1 : listingForm.lowStockLevel} required /></label></div>
      <label>Note<textarea name="note" rows={3} defaultValue={listingForm === 'new' ? '' : listingForm.note || ''} maxLength={300} /></label>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setListingForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save listing'}</button></div>
    </form></Modal>}

    {stockForm && <Modal title={`Update stock · ${stockForm.name}`} onClose={() => !busy && setStockForm(null)}><form className="form-stack" onSubmit={saveStock}><div className="notice">Stock staff can change only the quantity and low-stock alert. Seller, price and commission stay owner or manager controlled.</div><div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={stockForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={stockForm.lowStockLevel} required /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setStockForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save stock'}</button></div></form></Modal>}

    {customerForm && <Modal title={customerForm === 'new' ? 'Add customer' : 'Edit customer'} onClose={() => !busy && setCustomerForm(null)}><form className="form-stack" onSubmit={saveCustomer}><label>Customer name<input name="name" defaultValue={customerForm === 'new' ? '' : customerForm.name} maxLength={100} required /></label><div className="form-grid"><label>Phone<input name="phone" defaultValue={customerForm === 'new' ? '' : customerForm.phone || ''} maxLength={30} /></label><label>Email<input name="email" type="email" defaultValue={customerForm === 'new' ? '' : customerForm.email || ''} maxLength={120} /></label></div><label>Note<textarea name="note" rows={3} defaultValue={customerForm === 'new' ? '' : customerForm.note || ''} maxLength={300} /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setCustomerForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button></div></form></Modal>}

    {receipt && <Modal title={`Receipt ${receipt.receiptNumber}`} onClose={() => setReceipt(null)}><div className="sme-pos-receipt"><header><strong>{receipt.receiptName}</strong><span>{receipt.saleDate}</span><small>{receipt.customerName || 'Walk-in customer'}</small></header>{receipt.items.map((item, index) => <div className="sme-pos-receipt-line" key={`${item.listingId || item.productId}-${index}`}><span>{item.quantity} × {item.productName}</span><strong>{formatMoney(item.netLineMinor ?? item.lineTotalMinor, receipt.currency)}</strong></div>)}<div className="sme-pos-receipt-totals"><span>Subtotal <strong>{formatMoney(receipt.subtotalMinor, receipt.currency)}</strong></span><span>Discount <strong>-{formatMoney(receipt.discountMinor, receipt.currency)}</strong></span><span>Total <strong>{formatMoney(receipt.totalMinor, receipt.currency)}</strong></span></div><p>{receipt.receiptFooter}</p>{receipt.paymentAccountName && <small>Paid into {receipt.paymentAccountName}</small>}</div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => window.print()}>Print</button><button className="button primary" type="button" onClick={() => setReceipt(null)}>Done</button></div></Modal>}

    {confirm && <ActionConfirmModal state={confirm} busy={busy} error={error} onClose={() => { setConfirm(null); setError(''); }} onConfirm={() => void archiveConfirmed()} />}
  </section>;
}
