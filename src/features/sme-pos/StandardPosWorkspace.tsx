import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import {
  checkoutStandardPos,
  getSmePosStaffWorkspace,
  listSmePosCustomers,
  listSmePosPaymentAccounts,
  listSmePosProducts,
  listSmePosSales,
  returnSmePosSale,
  saveSmePosCustomer,
  saveSmePosProduct,
  setSmePosCustomerArchived,
  setSmePosProductArchived,
  updateSmePosProductStock,
} from '../../repositories/smePosRepository';
import type {
  PaymentMethodCode,
  SmePosCustomer,
  SmePosPaymentAccount,
  SmePosProduct,
  SmePosRole,
  SmePosSale,
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

type WorkspaceTab = 'products' | 'customers' | 'register' | 'sales';
type ProductStockMode = 'physical' | 'unlimited';
type ConfirmPayload =
  | { kind: 'product'; id: string }
  | { kind: 'customer'; id: string };

interface ReturnFormState {
  sale: SmePosSale;
  quantities: Record<string, number>;
  returnDate: string;
  reason: string;
}

const paymentMethods: Array<{ code: PaymentMethodCode; label: string }> = [
  { code: 'cash', label: 'Cash' },
  { code: 'bank_transfer', label: 'Bank transfer' },
  { code: 'debit_card', label: 'Debit card' },
  { code: 'credit_card', label: 'Credit card' },
  { code: 'e_wallet', label: 'E-wallet' },
  { code: 'qr_payment', label: 'QR payment' },
  { code: 'other', label: 'Other' },
];

const tabLabels: Record<WorkspaceTab, string> = {
  products: 'Products',
  customers: 'Customers',
  register: 'Open Register',
  sales: 'Sales & reports',
};

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Brunei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function tabsForRole(role: SmePosRole): WorkspaceTab[] {
  if (role === 'owner' || role === 'manager') return ['register', 'products', 'customers', 'sales'];
  if (role === 'cashier') return ['register', 'customers', 'sales'];
  if (role === 'stock_staff') return ['products'];
  if (role === 'viewer') return ['products', 'customers'];
  return [];
}

function initialTab(role: SmePosRole): WorkspaceTab {
  if (role === 'stock_staff' || role === 'viewer') return 'products';
  return 'register';
}

export function StandardPosWorkspace({ space, settings, role, onChanged }: Props) {
  const availableTabs = useMemo(() => tabsForRole(role), [role]);
  const [tab, setTab] = useState<WorkspaceTab>(() => initialTab(role));
  const [products, setProducts] = useState<SmePosProduct[]>([]);
  const [customers, setCustomers] = useState<SmePosCustomer[]>([]);
  const [sales, setSales] = useState<SmePosSale[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<SmePosPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productForm, setProductForm] = useState<SmePosProduct | 'new' | null>(null);
  const [productStockMode, setProductStockMode] = useState<ProductStockMode>('physical');
  const [stockForm, setStockForm] = useState<SmePosProduct | null>(null);
  const [customerForm, setCustomerForm] = useState<SmePosCustomer | 'new' | null>(null);
  const [receipt, setReceipt] = useState<SmePosSale | null>(null);
  const [returnForm, setReturnForm] = useState<ReturnFormState | null>(null);
  const [confirm, setConfirm] = useState<ActionConfirmState<ConfirmPayload> | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(settings.defaultPaymentAccountId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cash');
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [saleDate, setSaleDate] = useState(today());
  const [checkoutNote, setCheckoutNote] = useState('');

  const canManageProducts = ['owner', 'manager'].includes(role);
  const canManageStock = ['owner', 'manager', 'stock_staff'].includes(role);
  const canManageCustomers = ['owner', 'manager', 'cashier'].includes(role);
  const canArchiveCustomers = ['owner', 'manager'].includes(role);
  const canCheckout = ['owner', 'manager', 'cashier'].includes(role);
  const canManageReturns = role === 'owner' || role === 'manager';
  const canViewReports = ['owner', 'manager'].includes(role);
  const canViewSales = ['owner', 'manager', 'cashier'].includes(role);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (role === 'cashier' || role === 'viewer') {
        const [workspace, nextPaymentAccounts] = await Promise.all([
          getSmePosStaffWorkspace(space.id),
          role === 'cashier' ? listSmePosPaymentAccounts(space.id) : Promise.resolve([]),
        ]);
        setProducts(workspace.products);
        setCustomers(workspace.customers);
        setSales(workspace.sales);
        setPaymentAccounts(nextPaymentAccounts);
      } else if (role === 'stock_staff') {
        const workspace = await getSmePosStaffWorkspace(space.id);
        setProducts(workspace.products);
        setCustomers([]);
        setSales([]);
        setPaymentAccounts([]);
      } else {
        const [nextProducts, nextCustomers, nextSales, nextPaymentAccounts] = await Promise.all([
          listSmePosProducts(space.id),
          listSmePosCustomers(space.id),
          listSmePosSales(space.id),
          listSmePosPaymentAccounts(space.id),
        ]);
        setProducts(nextProducts);
        setCustomers(nextCustomers);
        setSales(nextSales);
        setPaymentAccounts(nextPaymentAccounts);
      }
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

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((item) => !term || [item.name, item.category, item.sku].some((value) => value?.toLowerCase().includes(term)));
  }, [products, search]);

  const cartLines = useMemo(() => Object.entries(cart).map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return product ? { product, quantity } : null;
  }).filter((item): item is { product: SmePosProduct; quantity: number } => Boolean(item)), [cart, products]);

  const subtotalMinor = cartLines.reduce((sum, item) => sum + item.product.sellingPriceMinor * item.quantity, 0);
  let discountMinor = 0;
  try { discountMinor = Math.max(0, toMinorUnits(discount || '0')); } catch { discountMinor = 0; }
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const monthPrefix = today().slice(0, 7);
  const todaySales = sales.filter((item) => item.saleDate === today() && item.status !== 'refunded').reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthSales = sales.filter((item) => item.saleDate.startsWith(monthPrefix) && item.status !== 'refunded').reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthProfit = sales.filter((item) => item.saleDate.startsWith(monthPrefix) && item.status !== 'refunded').reduce((sum, item) => sum + item.profitMinor, 0);
  const lowStock = products.filter((item) => item.trackStock && item.quantityOnHand <= item.lowStockLevel).length;

  function requireOnline() {
    if (navigator.onLine) return true;
    setError('Connect to the internet to change shop records or complete checkout.');
    return false;
  }

  function openProductForm(value: SmePosProduct | 'new') {
    setProductStockMode(value === 'new' || value.trackStock ? 'physical' : 'unlimited');
    setProductForm(value);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const trackStock = String(form.get('itemType') || 'physical') === 'physical';
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await saveSmePosProduct({
        spaceId: space.id,
        productId: productForm === 'new' ? undefined : productForm.id,
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        sku: String(form.get('sku') || ''),
        note: String(form.get('note') || ''),
        sellingPriceMinor: toMinorUnits(String(form.get('sellingPrice') || '')),
        costPriceMinor: String(form.get('costPrice') || '').trim() ? toMinorUnits(String(form.get('costPrice'))) : null,
        trackStock,
        quantityOnHand: trackStock ? Number(form.get('quantity') || 0) : 0,
        lowStockLevel: trackStock ? Number(form.get('lowStock') || 0) : 0,
      });
      setProductForm(null);
      setSuccess(productForm === 'new' ? 'Product added.' : 'Product updated.');
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function saveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await updateSmePosProductStock({
        spaceId: space.id,
        productId: stockForm.id,
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setStockForm(null);
      setSuccess('Stock updated.');
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await saveSmePosCustomer({
        spaceId: space.id,
        customerId: customerForm === 'new' ? undefined : customerForm.id,
        name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        note: String(form.get('note') || ''),
      });
      setCustomerForm(null);
      setSuccess(customerForm === 'new' ? 'Customer added.' : 'Customer updated.');
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function archiveConfirmed() {
    if (!confirm || !requireOnline()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (confirm.payload.kind === 'product') await setSmePosProductArchived(space.id, confirm.payload.id, true);
      else await setSmePosCustomerArchived(space.id, confirm.payload.id, true);
      setSuccess(confirm.payload.kind === 'product' ? 'Product moved to archived records.' : 'Customer moved to archived records.');
      setConfirm(null);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function addToCart(product: SmePosProduct) {
    if (product.trackStock && product.quantityOnHand < 1) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    setError('');
    setCart((current) => {
      const next = (current[product.id] || 0) + 1;
      if (product.trackStock && next > product.quantityOnHand) return current;
      return { ...current, [product.id]: next };
    });
  }

  function changeQuantity(product: SmePosProduct, value: number) {
    const next = Math.max(0, Math.floor(value));
    setCart((current) => {
      const result = { ...current };
      if (next === 0) delete result[product.id];
      else result[product.id] = product.trackStock ? Math.min(next, product.quantityOnHand) : next;
      return result;
    });
  }

  async function completeCheckout(event: FormEvent) {
    event.preventDefault();
    if (!requireOnline()) return;
    if (!cartLines.length) { setError('Add at least one product to the sale.'); return; }
    const unavailable = cartLines.find(({ product, quantity }) => product.trackStock && product.quantityOnHand < quantity);
    if (unavailable) { setError(`${unavailable.product.name} is out of stock or no longer has enough quantity.`); return; }
    if (!paymentAccountId) { setError('Choose where the payment was received.'); return; }
    if (discountMinor >= subtotalMinor) { setError('Discount must be less than the subtotal.'); return; }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await checkoutStandardPos({
        spaceId: space.id,
        items: cartLines.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        customerId: customerId || null,
        paymentAccountId,
        paymentMethod,
        paymentMethodLabel: paymentMethod === 'other' ? paymentMethodLabel : null,
        discountMinor,
        saleDate,
        note: checkoutNote,
      });
      await load();
      await onChanged();
      const nextSales = role === 'cashier' ? (await getSmePosStaffWorkspace(space.id)).sales : await listSmePosSales(space.id);
      setSales(nextSales);
      setReceipt(nextSales.find((item) => item.id === result.data.saleId) || nextSales[0] || null);
      setCart({});
      setCustomerId('');
      setDiscount('0.00');
      setCheckoutNote('');
      setSuccess(`Sale completed. Receipt ${result.data.receiptNumber} is ready.`);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      await load();
    } finally {
      setBusy(false);
    }
  }


  function openReturnForm(sale: SmePosSale) {
    const quantities = Object.fromEntries(sale.items.map((item) => [item.productId, 0]));
    setReceipt(null);
    setReturnForm({ sale, quantities, returnDate: today(), reason: '' });
    setError('');
    setSuccess('');
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnForm || !requireOnline()) return;
    const items = returnForm.sale.items
      .map((item) => ({ itemId: item.productId, quantity: Math.floor(returnForm.quantities[item.productId] || 0) }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      setError('Choose at least one item quantity to return.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await returnSmePosSale({
        spaceId: space.id,
        saleId: returnForm.sale.id,
        items,
        returnDate: returnForm.returnDate,
        reason: returnForm.reason,
      });
      setReturnForm(null);
      setSuccess(`Return recorded. ${formatMoney(result.data.refundMinor, returnForm.sale.currency)} was refunded from the original payment account.`);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  if (role === 'seller') {
    return <section className="panel"><span className="eyebrow">Seller access</span><h2>Marketplace seller workspace</h2><p>Seller listings, balances, and payouts are added in the Marketplace Consignment POS phase.</p></section>;
  }

  return <section className="sme-standard-pos-workspace">
    <div className="pos-workspace-heading">
      <div><span className="eyebrow">Shop tools</span><h2>{role === 'cashier' ? 'Register' : 'Point of sale'}</h2><p>{role === 'cashier' ? 'Search products, take payment, and issue the receipt.' : 'Use the tools available for your assigned POS role.'}</p></div>
      {canManageProducts && <Link className="button secondary" to={`/spaces/${space.id}/pos/archived`}>Archived POS records</Link>}
    </div>

    {settings.status !== 'active' && <div className="notice warning">The POS is {settings.status === 'paused' ? 'paused' : 'still in setup'}. Products and customers can be prepared, but checkout is blocked.</div>}
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    <div className="sme-pos-workspace-tabs" role="tablist" aria-label="POS tools">
      {availableTabs.map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setError(''); setSuccess(''); setSearch(''); }}>{item === 'sales' && role === 'cashier' ? 'My recent sales' : tabLabels[item]}</button>)}
    </div>

    {loading ? <div className="loading-panel">Loading shop records…</div> : <>
      {tab === 'products' && <div className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Products and stock</h3><p>{products.length} active product{products.length === 1 ? '' : 's'}</p></div>{canManageProducts && <button className="button primary" type="button" onClick={() => openProductForm('new')}>Add product</button>}</div>
        <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, category or SKU" />
        <div className="sme-pos-product-grid">{filteredProducts.map((product) => {
          const outOfStock = product.trackStock && product.quantityOnHand < 1;
          const low = product.trackStock && product.quantityOnHand > 0 && product.quantityOnHand <= product.lowStockLevel;
          return <article className={`sme-pos-product-card ${outOfStock ? 'out-of-stock' : ''}`} key={product.id}>
            <div><span className="type-badge">{product.category || 'Product'}</span><h3>{product.name}</h3><small>{product.sku || product.displayId}</small></div>
            <strong>{formatMoney(product.sellingPriceMinor, product.currency)}</strong>
            <p className={outOfStock ? 'stock-danger' : low ? 'stock-warning' : ''}>{product.trackStock ? outOfStock ? 'Out of stock' : `${product.quantityOnHand} in stock${low ? ' · Low stock' : ''}` : 'Service or unlimited item'}</p>
            {canManageProducts && <div className="button-row"><button className="button secondary small" type="button" onClick={() => openProductForm(product)}>Edit</button><button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'product', id: product.id }, title: 'Archive this product?', description: 'It will leave the active product list but its sales history will stay.', note: 'You can restore it from Archived POS records.', confirmLabel: 'Archive product' })}>Archive</button></div>}
            {!canManageProducts && canManageStock && product.trackStock && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setStockForm(product)}>Update stock</button></div>}
          </article>;
        })}</div>
        {!filteredProducts.length && <div className="empty-inline">No active products found.</div>}
      </div>}

      {tab === 'customers' && <div className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Customers</h3><p>Optional customer details for receipts and repeat visits.</p></div>{canManageCustomers && <button className="button primary" type="button" onClick={() => setCustomerForm('new')}>Add customer</button>}</div>
        <div className="sme-pos-customer-list">{customers.map((customer) => <div className="sme-pos-customer-row" key={customer.id}><div><strong>{customer.name}</strong><small>{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}</small></div><span>{customer.visitCount || 0} sale{customer.visitCount === 1 ? '' : 's'}</span>{canManageCustomers && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setCustomerForm(customer)}>Edit</button>{canArchiveCustomers && <button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'customer', id: customer.id }, title: 'Archive this customer?', description: 'The customer will leave the active list while old receipts and sales stay unchanged.', note: 'You can restore the customer later.', confirmLabel: 'Archive customer' })}>Archive</button>}</div>}</div>)}</div>
        {!customers.length && <div className="empty-inline">No customers yet. The register can still use Walk-in customer.</div>}
      </div>}

      {tab === 'register' && <form className="sme-pos-checkout-layout" onSubmit={completeCheckout}>
        <section className="panel sme-pos-checkout-products">
          <div className="panel-heading"><div><span className="eyebrow">Register</span><h3>Choose products</h3><p>Out-of-stock physical products cannot be added.</p></div></div>
          <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, category or SKU" autoFocus />
          <div className="sme-pos-checkout-product-grid">{filteredProducts.map((product) => {
            const outOfStock = product.trackStock && product.quantityOnHand < 1;
            return <button type="button" key={product.id} disabled={outOfStock} className={outOfStock ? 'out-of-stock' : ''} onClick={() => addToCart(product)}><strong>{product.name}</strong><span>{formatMoney(product.sellingPriceMinor, product.currency)}</span><small>{product.trackStock ? outOfStock ? 'Out of stock' : `${product.quantityOnHand} available` : 'Service or unlimited item'}</small></button>;
          })}</div>
          {!filteredProducts.length && <div className="empty-inline">No products found.</div>}
        </section>
        <section className="panel sme-pos-cart">
          <div className="panel-heading"><div><span className="eyebrow">Current sale</span><h3>Cart</h3><p>{cartLines.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p></div>{cartLines.length > 0 && <button className="button ghost small" type="button" onClick={() => setCart({})}>Clear cart</button>}</div>
          <div className="sme-pos-cart-lines">{cartLines.map(({ product, quantity }) => <div key={product.id}><div><strong>{product.name}</strong><small>{formatMoney(product.sellingPriceMinor, product.currency)} each</small></div><input type="number" min="0" max={product.trackStock ? product.quantityOnHand : 9999} value={quantity} onChange={(event) => changeQuantity(product, Number(event.target.value))} aria-label={`${product.name} quantity`} /><strong>{formatMoney(product.sellingPriceMinor * quantity, product.currency)}</strong></div>)}</div>
          {!cartLines.length && <div className="empty-inline">Tap a product to begin the sale.</div>}
          <div className="form-stack compact">
            <label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Walk-in customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Payment received in<select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} required><option value="">Choose account</option>{paymentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label>
            <div className="form-grid"><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodCode)}>{paymentMethods.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label>Sale date<input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label></div>
            {paymentMethod === 'other' && <label>Other payment method<input value={paymentMethodLabel} onChange={(event) => setPaymentMethodLabel(event.target.value)} required /></label>}
            <label>Discount (BND)<input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
            <label>Note<textarea rows={2} value={checkoutNote} onChange={(event) => setCheckoutNote(event.target.value)} placeholder="Optional" /></label>
          </div>
          <div className="sme-pos-totals"><span>Subtotal <strong>{formatMoney(subtotalMinor, settings.currency)}</strong></span><span>Discount <strong>-{formatMoney(discountMinor, settings.currency)}</strong></span><span className="total">Total <strong>{formatMoney(totalMinor, settings.currency)}</strong></span></div>
          <button className="button primary pos-complete-sale" type="submit" disabled={busy || !canCheckout || settings.status !== 'active' || !cartLines.length}>{busy ? 'Completing sale…' : settings.status !== 'active' ? 'POS is not active' : canCheckout ? `Complete sale · ${formatMoney(totalMinor, settings.currency)}` : 'Checkout access required'}</button>
        </section>
      </form>}

      {tab === 'sales' && canViewSales && <div className="sme-pos-sales-section">
        {canViewReports && <div className="summary-grid sme-pos-report-grid"><article className="summary-card featured"><span>Sales today</span><strong>{formatMoney(todaySales, settings.currency)}</strong><small>{today()}</small></article><article className="summary-card"><span>Sales this month</span><strong>{formatMoney(monthSales, settings.currency)}</strong><small>{monthPrefix}</small></article><article className="summary-card"><span>Estimated profit</span><strong>{formatMoney(monthProfit, settings.currency)}</strong><small>Owner and manager only</small></article><article className="summary-card"><span>Low stock</span><strong>{lowStock}</strong><small>At or below alert level</small></article></div>}
        <section className="panel"><div className="panel-heading"><div><h3>{role === 'cashier' ? 'My recent sales' : 'Recent sales'}</h3><p>{role === 'cashier' ? 'Only sales completed using your account are shown.' : 'Open a sale to view or print its receipt.'}</p></div></div><div className="sme-pos-sales-list">{sales.map((sale) => <button type="button" key={sale.id} onClick={() => setReceipt(sale)}><div><strong>{sale.receiptNumber}</strong><small>{sale.saleDate} · {sale.customerName || 'Walk-in customer'} · {sale.itemCount} item(s)</small></div><span className="status-badge posted">{sale.status}</span><strong>{formatMoney(sale.totalMinor - sale.returnedMinor, sale.currency)}</strong></button>)}</div>{!sales.length && <div className="empty-inline">No POS sales available.</div>}</section>
      </div>}
    </>}

    {productForm && <Modal title={productForm === 'new' ? 'Add product' : 'Edit product'} onClose={() => !busy && setProductForm(null)}>
      <form className="form-stack" onSubmit={saveProduct}>
        <div className="form-grid">
          <label>Product name<input name="name" defaultValue={productForm === 'new' ? '' : productForm.name} maxLength={100} required /></label>
          <label>Category<input name="category" defaultValue={productForm === 'new' ? '' : productForm.category || ''} maxLength={60} placeholder="Example: Food, electronics" /></label>
          <label>SKU (optional)<input name="sku" defaultValue={productForm === 'new' ? '' : productForm.sku || ''} maxLength={50} /></label>
          <label>Selling price (BND)<input name="sellingPrice" inputMode="decimal" defaultValue={productForm === 'new' ? '' : (productForm.sellingPriceMinor / 100).toFixed(2)} required /></label>
          <label>Cost price (BND)<input name="costPrice" inputMode="decimal" defaultValue={productForm === 'new' || productForm.costPriceMinor == null ? '' : (productForm.costPriceMinor / 100).toFixed(2)} placeholder="Optional · owner/manager only" /></label>
        </div>
        <fieldset className="pos-item-type-fieldset">
          <legend>Item type</legend>
          <label className={`pos-item-type-option ${productStockMode === 'physical' ? 'selected' : ''}`}><input type="radio" name="itemType" value="physical" checked={productStockMode === 'physical'} onChange={() => setProductStockMode('physical')} /><span><strong>Physical product</strong><small>Track available quantity and stop sales when stock reaches zero.</small></span></label>
          <label className={`pos-item-type-option ${productStockMode === 'unlimited' ? 'selected' : ''}`}><input type="radio" name="itemType" value="unlimited" checked={productStockMode === 'unlimited'} onChange={() => setProductStockMode('unlimited')} /><span><strong>Service or unlimited item</strong><small>No stock quantity is reduced. Use this only for services or items that do not run out.</small></span></label>
        </fieldset>
        {productStockMode === 'physical' && <div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={productForm === 'new' ? 0 : productForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={productForm === 'new' ? 2 : productForm.lowStockLevel} required /></label></div>}
        <label>Note<textarea name="note" rows={2} defaultValue={productForm === 'new' ? '' : productForm.note || ''} maxLength={300} /></label>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setProductForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
      </form>
    </Modal>}

    {stockForm && <Modal title={`Update stock · ${stockForm.name}`} onClose={() => !busy && setStockForm(null)}><form className="form-stack" onSubmit={saveStock}><div className="notice">Stock staff can change available quantity and the low-stock alert. Prices and cost remain owner or manager controlled.</div><div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={stockForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={stockForm.lowStockLevel} required /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setStockForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save stock'}</button></div></form></Modal>}

    {customerForm && <Modal title={customerForm === 'new' ? 'Add customer' : 'Edit customer'} onClose={() => !busy && setCustomerForm(null)}><form className="form-stack" onSubmit={saveCustomer}><label>Customer name<input name="name" defaultValue={customerForm === 'new' ? '' : customerForm.name} maxLength={100} required /></label><div className="form-grid"><label>Phone<input name="phone" defaultValue={customerForm === 'new' ? '' : customerForm.phone || ''} maxLength={30} /></label><label>Email<input name="email" type="email" defaultValue={customerForm === 'new' ? '' : customerForm.email || ''} maxLength={120} /></label></div><label>Note<textarea name="note" rows={3} defaultValue={customerForm === 'new' ? '' : customerForm.note || ''} maxLength={300} /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setCustomerForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button></div></form></Modal>}

    {receipt && <Modal title={`Receipt ${receipt.receiptNumber}`} onClose={() => setReceipt(null)}>
      <div className="sme-pos-receipt">
        <header><strong>{receipt.receiptName}</strong><span>{receipt.saleDate}</span><small>{receipt.customerName || 'Walk-in customer'}</small></header>
        {receipt.items.map((item) => <div className="sme-pos-receipt-line" key={item.productId}>
          <span>{item.quantity} × {item.productName}{item.returnedQuantity > 0 ? ` · ${item.returnedQuantity} returned` : ''}</span>
          <strong>{formatMoney(item.lineTotalMinor, receipt.currency)}</strong>
        </div>)}
        <div className="sme-pos-receipt-totals">
          <span>Original total <strong>{formatMoney(receipt.totalMinor, receipt.currency)}</strong></span>
          {receipt.returnedMinor > 0 && <span>Refunded <strong>-{formatMoney(receipt.returnedMinor, receipt.currency)}</strong></span>}
          <span>Net sale <strong>{formatMoney(receipt.totalMinor - receipt.returnedMinor, receipt.currency)}</strong></span>
        </div>
        <p>{receipt.receiptFooter}</p>
        <small>Paid into {receipt.paymentAccountName}</small>
      </div>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={() => window.print()}>Print</button>
        {canManageReturns && receipt.status !== 'refunded' && <button className="button secondary" type="button" onClick={() => openReturnForm(receipt)}>Return items</button>}
        <button className="button primary" type="button" onClick={() => setReceipt(null)}>Done</button>
      </div>
    </Modal>}

    {returnForm && <Modal title={`Return items · ${returnForm.sale.receiptNumber}`} onClose={() => !busy && setReturnForm(null)}>
      <form className="form-stack" onSubmit={submitReturn}>
        <div className="notice">Refunds are posted as Money Out from the original payment account. Returned physical stock is restored automatically.</div>
        <div className="sme-pos-cart-lines">
          {returnForm.sale.items.map((item) => {
            const remaining = Math.max(0, item.quantity - item.returnedQuantity);
            return <div key={item.productId}>
              <div><strong>{item.productName}</strong><small>{remaining} returnable of {item.quantity} sold</small></div>
              <input
                type="number"
                min="0"
                max={remaining}
                value={returnForm.quantities[item.productId] || 0}
                onChange={(event) => setReturnForm((current) => current ? {
                  ...current,
                  quantities: { ...current.quantities, [item.productId]: Math.min(remaining, Math.max(0, Number(event.target.value) || 0)) },
                } : current)}
                aria-label={`${item.productName} return quantity`}
              />
            </div>;
          })}
        </div>
        <label>Return date<input type="date" value={returnForm.returnDate} onChange={(event) => setReturnForm((current) => current ? { ...current, returnDate: event.target.value } : current)} required /></label>
        <label>Reason or note<textarea rows={3} value={returnForm.reason} onChange={(event) => setReturnForm((current) => current ? { ...current, reason: event.target.value } : current)} maxLength={500} placeholder="Optional" /></label>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setReturnForm(null)} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Recording return…' : 'Confirm return and refund'}</button></div>
      </form>
    </Modal>}

    {confirm && <ActionConfirmModal state={confirm} busy={busy} error={error} onClose={() => { setConfirm(null); setError(''); }} onConfirm={() => void archiveConfirmed()} />}
  </section>;
}
